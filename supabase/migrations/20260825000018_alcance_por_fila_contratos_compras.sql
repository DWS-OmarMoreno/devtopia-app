-- =============================================================================
-- Checkpoint 6 (refinamiento transversal) — Alcance por fila (PROPIOS/EQUIPO/TODOS)
-- Fase 1: Contratos y Proyectos + Compras y Subcontratación (12 tablas).
--
-- Contexto y decisiones de alcance (confirmadas con el usuario):
--   - "Mi equipo" = usuarios asignados al mismo proyecto (vía asignacion_recursos)
--     o que son PM/responsable de él.
--   - El usuario pidió aplicar esto a "todos los módulos existentes". Se entrega
--     en fases: esta migración cubre Contratos y Proyectos + Compras (los módulos
--     donde "equipo de proyecto" tiene un significado natural en el esquema
--     actual). CRM y Ventas, Productos y Servicios y Configuración General no
--     tienen jerarquía de responsable/equipo en el esquema hoy, así que quedan
--     para una siguiente pasada (requieren su propio análisis de semántica de
--     "dueño" por tabla).
--
-- Mecánica: se extiende fn_crear_politicas_rls con un 5to parámetro opcional
-- p_alcance_expr (default 'true', 100% retrocompatible con las ~30 tablas que
-- ya la usan sin este argumento). El alcance real se evalúa vía la nueva
-- fn_alcance_permiso(modulo, sublista), que replica la lógica de búsqueda de
-- fn_tiene_permiso pero devuelve permisos.alcance en vez de un booleano.
--
-- Simplificaciones explícitas de esta fase (documentadas, no accidentales):
--   - contratos: no tiene columna de "equipo de proyecto" directa (es el padre
--     de proyectos, no al revés). PROPIOS y EQUIPO se tratan igual: usuario es
--     responsable_pm_id o responsable_comercial_id del contrato.
--   - disponibilidad_recursos: es un calendario de disponibilidad de un recurso,
--     sin proyecto asociado en la fila. PROPIOS y EQUIPO se tratan igual: el
--     usuario es el propio recurso (recurso_id = auth.uid()). Se podría refinar
--     más adelante para que un PM vea la disponibilidad de su equipo.
--   - ordenes_costo_subcontratacion: no tiene columna de creador (solo
--     aprobador_interno_id, que se llena al aprobar, no al crear). PROPIOS y
--     EQUIPO se tratan igual: usuario es equipo del proyecto de la orden.
--   - facturas_referencia_externa / casos_soporte_referencia_externa: pueden
--     colgar de un proyecto o de un contrato (proyecto_id nullable). EQUIPO
--     considera ambos caminos (equipo del proyecto, o responsable del contrato).
--
-- Riesgo: cambio estructural en RLS. Verificado empíricamente en Postgres local
-- (transacción BEGIN/ROLLBACK) antes de aplicarse aquí — ver bitácora.
--
-- Bug preexistente descubierto y corregido en esta misma migración: el
-- p_empresa_expr de varias de estas tablas resuelve la empresa consultando
-- OTRA tabla protegida por RLS mediante un subselect correlacionado directo
-- (ej. "select p.empresa_id from proyectos p where p.id = timesheets.proyecto_id"),
-- sin bypass de RLS. Si el rol que consulta no tiene permiso de lectura sobre
-- esa tabla referenciada (ej. un Desarrollador que puede leer timesheets pero
-- no proyectos), el subselect devuelve NULL, la comparación de empresa falla
-- siempre, y la fila queda invisible pase lo que pase con el permiso o el
-- alcance de la propia tabla. Esto se descubrió al verificar empíricamente el
-- caso "Desarrollador Prueba" (alcance PROPIOS en timesheets/asignacion_recursos,
-- sin permiso alguno sobre el módulo proyectos): no veía ni sus propias filas.
-- Se corrige envolviendo esas búsquedas en funciones SECURITY DEFINER
-- (fn_empresa_de_proyecto/fn_empresa_de_contrato/fn_empresa_de_proveedor),
-- exactamente el mismo patrón que ya usa fn_empresa_actual() para
-- perfiles_usuario. Este mismo patrón de bug puede existir en otras tablas
-- fuera de las 12 de esta fase (cualquier p_empresa_expr con subselect directo
-- a otra tabla con RLS por permiso de módulo) — queda pendiente de revisión en
-- la siguiente pasada (CRM y Ventas, Productos y Servicios, Configuración
-- General).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Extensión retrocompatible del generador de políticas RLS.
-- -----------------------------------------------------------------------------
create or replace function fn_crear_politicas_rls(
  p_tabla text,
  p_modulo text,
  p_sublista text,
  p_empresa_expr text,
  p_alcance_expr text default 'true'
)
returns void
language plpgsql
as $function$
begin
  execute format('alter table %I enable row level security', p_tabla);

  execute format(
    'create policy %I on %I for select using ((%s) = fn_empresa_actual() and fn_tiene_permiso(%L, ''leer'', %L) and (%s))',
    p_tabla || '_select_pol', p_tabla, p_empresa_expr, p_modulo, p_sublista, p_alcance_expr
  );

  execute format(
    'create policy %I on %I for insert with check ((%s) = fn_empresa_actual() and fn_tiene_permiso(%L, ''crear'', %L) and (%s))',
    p_tabla || '_insert_pol', p_tabla, p_empresa_expr, p_modulo, p_sublista, p_alcance_expr
  );

  execute format(
    'create policy %I on %I for update using ((%s) = fn_empresa_actual() and fn_tiene_permiso(%L, ''editar'', %L) and (%s)) with check ((%s) = fn_empresa_actual() and (%s))',
    p_tabla || '_update_pol', p_tabla, p_empresa_expr, p_modulo, p_sublista, p_alcance_expr, p_empresa_expr, p_alcance_expr
  );

  execute format(
    'create policy %I on %I for delete using ((%s) = fn_empresa_actual() and fn_tiene_permiso(%L, ''eliminar'', %L) and (%s))',
    p_tabla || '_delete_pol', p_tabla, p_empresa_expr, p_modulo, p_sublista, p_alcance_expr
  );
end;
$function$;

-- -----------------------------------------------------------------------------
-- 2. fn_alcance_permiso — espejo de fn_tiene_permiso, devuelve permisos.alcance.
--    alcance no varía por acción (es un solo valor por fila rol+modulo+sublista),
--    así que a diferencia de fn_tiene_permiso no necesita un parámetro p_accion.
--    Si no hay fila de permiso aplicable, devuelve 'PROPIOS' (el más restrictivo)
--    por defensa en profundidad — en la práctica esto no se alcanza nunca porque
--    fn_tiene_permiso ya habría devuelto false y bloqueado la fila antes.
-- -----------------------------------------------------------------------------
create or replace function fn_alcance_permiso(p_modulo text, p_sublista text default null)
returns text
language plpgsql
stable
security definer
set search_path = public
as $function$
declare
  v_rol_id uuid;
  v_alcance text;
begin
  select rol_id into v_rol_id from perfiles_usuario where id = auth.uid();
  if v_rol_id is null then
    return 'PROPIOS';
  end if;

  select alcance into v_alcance
    from permisos
   where rol_id = v_rol_id
     and modulo = p_modulo
     and (sublista = p_sublista or sublista is null)
   order by (sublista = p_sublista) desc nulls last
   limit 1;

  if not found or v_alcance is null then
    return 'PROPIOS';
  end if;

  return v_alcance;
end;
$function$;

-- -----------------------------------------------------------------------------
-- 3a. Helpers SECURITY DEFINER para resolver empresa_id de una fila padre sin
--     quedar sujetos a la RLS de esa tabla padre (ver nota de bug arriba).
-- -----------------------------------------------------------------------------
create or replace function fn_empresa_de_proyecto(p_proyecto_id uuid)
returns uuid
language sql
stable
security definer
set search_path = public
as $function$
  select empresa_id from proyectos where id = p_proyecto_id;
$function$;

create or replace function fn_empresa_de_contrato(p_contrato_id uuid)
returns uuid
language sql
stable
security definer
set search_path = public
as $function$
  select empresa_id from contratos where id = p_contrato_id;
$function$;

create or replace function fn_empresa_de_proveedor(p_proveedor_id uuid)
returns uuid
language sql
stable
security definer
set search_path = public
as $function$
  select empresa_id from proveedores where id = p_proveedor_id;
$function$;

-- -----------------------------------------------------------------------------
-- 3. fn_es_equipo_de_proyecto — true si el usuario actual es PM del proyecto o
--    está asignado a él vía asignacion_recursos.
-- -----------------------------------------------------------------------------
create or replace function fn_es_equipo_de_proyecto(p_proyecto_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $function$
  select p_proyecto_id is not null and (
    exists (select 1 from proyectos pr where pr.id = p_proyecto_id and pr.pm_id = auth.uid())
    or exists (
      select 1 from asignacion_recursos ar
      where ar.proyecto_id = p_proyecto_id and ar.recurso_id = auth.uid()
    )
  );
$function$;

-- -----------------------------------------------------------------------------
-- 4. Re-creación de políticas por tabla, con el mismo p_empresa_expr que ya
--    tenían (sin cambios) más el nuevo p_alcance_expr.
-- -----------------------------------------------------------------------------

-- contratos ------------------------------------------------------------------
drop policy if exists contratos_select_pol on contratos;
drop policy if exists contratos_insert_pol on contratos;
drop policy if exists contratos_update_pol on contratos;
drop policy if exists contratos_delete_pol on contratos;
select fn_crear_politicas_rls(
  'contratos', 'CONTRATOS_PROYECTOS', 'contratos',
  'empresa_id',
  $alcance$
    (fn_alcance_permiso('CONTRATOS_PROYECTOS', 'contratos') = 'TODOS')
    or (
      fn_alcance_permiso('CONTRATOS_PROYECTOS', 'contratos') in ('EQUIPO', 'PROPIOS')
      and (contratos.responsable_pm_id = auth.uid() or contratos.responsable_comercial_id = auth.uid())
    )
  $alcance$
);

-- proyectos --------------------------------------------------------------------
drop policy if exists proyectos_select_pol on proyectos;
drop policy if exists proyectos_insert_pol on proyectos;
drop policy if exists proyectos_update_pol on proyectos;
drop policy if exists proyectos_delete_pol on proyectos;
select fn_crear_politicas_rls(
  'proyectos', 'CONTRATOS_PROYECTOS', 'proyectos',
  'empresa_id',
  $alcance$
    (fn_alcance_permiso('CONTRATOS_PROYECTOS', 'proyectos') = 'TODOS')
    or (
      fn_alcance_permiso('CONTRATOS_PROYECTOS', 'proyectos') = 'EQUIPO'
      and fn_es_equipo_de_proyecto(proyectos.id)
    )
    or (
      fn_alcance_permiso('CONTRATOS_PROYECTOS', 'proyectos') = 'PROPIOS'
      and proyectos.pm_id = auth.uid()
    )
  $alcance$
);

-- hitos_entregables --------------------------------------------------------------
drop policy if exists hitos_entregables_select_pol on hitos_entregables;
drop policy if exists hitos_entregables_insert_pol on hitos_entregables;
drop policy if exists hitos_entregables_update_pol on hitos_entregables;
drop policy if exists hitos_entregables_delete_pol on hitos_entregables;
select fn_crear_politicas_rls(
  'hitos_entregables', 'CONTRATOS_PROYECTOS', 'hitos_entregables',
  'fn_empresa_de_proyecto(hitos_entregables.proyecto_id)',
  $alcance$
    (fn_alcance_permiso('CONTRATOS_PROYECTOS', 'hitos_entregables') = 'TODOS')
    or (
      fn_alcance_permiso('CONTRATOS_PROYECTOS', 'hitos_entregables') = 'EQUIPO'
      and fn_es_equipo_de_proyecto(hitos_entregables.proyecto_id)
    )
    or (
      fn_alcance_permiso('CONTRATOS_PROYECTOS', 'hitos_entregables') = 'PROPIOS'
      and hitos_entregables.responsable_id = auth.uid()
    )
  $alcance$
);

-- timesheets -----------------------------------------------------------------
drop policy if exists timesheets_select_pol on timesheets;
drop policy if exists timesheets_insert_pol on timesheets;
drop policy if exists timesheets_update_pol on timesheets;
drop policy if exists timesheets_delete_pol on timesheets;
select fn_crear_politicas_rls(
  'timesheets', 'CONTRATOS_PROYECTOS', 'timesheets',
  'fn_empresa_de_proyecto(timesheets.proyecto_id)',
  $alcance$
    (fn_alcance_permiso('CONTRATOS_PROYECTOS', 'timesheets') = 'TODOS')
    or (
      fn_alcance_permiso('CONTRATOS_PROYECTOS', 'timesheets') = 'EQUIPO'
      and fn_es_equipo_de_proyecto(timesheets.proyecto_id)
    )
    or (
      fn_alcance_permiso('CONTRATOS_PROYECTOS', 'timesheets') = 'PROPIOS'
      and timesheets.recurso_id = auth.uid()
    )
  $alcance$
);

-- asignacion_recursos ----------------------------------------------------------
drop policy if exists asignacion_recursos_select_pol on asignacion_recursos;
drop policy if exists asignacion_recursos_insert_pol on asignacion_recursos;
drop policy if exists asignacion_recursos_update_pol on asignacion_recursos;
drop policy if exists asignacion_recursos_delete_pol on asignacion_recursos;
select fn_crear_politicas_rls(
  'asignacion_recursos', 'CONTRATOS_PROYECTOS', 'asignacion_recursos',
  'fn_empresa_de_proyecto(asignacion_recursos.proyecto_id)',
  $alcance$
    (fn_alcance_permiso('CONTRATOS_PROYECTOS', 'asignacion_recursos') = 'TODOS')
    or (
      fn_alcance_permiso('CONTRATOS_PROYECTOS', 'asignacion_recursos') = 'EQUIPO'
      and fn_es_equipo_de_proyecto(asignacion_recursos.proyecto_id)
    )
    or (
      fn_alcance_permiso('CONTRATOS_PROYECTOS', 'asignacion_recursos') = 'PROPIOS'
      and asignacion_recursos.recurso_id = auth.uid()
    )
  $alcance$
);

-- disponibilidad_recursos (comparte sublista con asignacion_recursos) ---------
-- Nota: aquí SÍ se deja el subselect directo a perfiles_usuario (sin wrapper
-- SECURITY DEFINER) porque esa tabla ya tiene una política adicional
-- perfiles_usuario_misma_empresa_select_pol que permite ver cualquier perfil
-- de la propia empresa sin exigir permiso de módulo — confirmado en Postgres
-- local que no sufre el mismo bug que proyectos/contratos/proveedores.
drop policy if exists disponibilidad_recursos_select_pol on disponibilidad_recursos;
drop policy if exists disponibilidad_recursos_insert_pol on disponibilidad_recursos;
drop policy if exists disponibilidad_recursos_update_pol on disponibilidad_recursos;
drop policy if exists disponibilidad_recursos_delete_pol on disponibilidad_recursos;
select fn_crear_politicas_rls(
  'disponibilidad_recursos', 'CONTRATOS_PROYECTOS', 'asignacion_recursos',
  '(select pu.empresa_id from perfiles_usuario pu where pu.id = disponibilidad_recursos.recurso_id)',
  $alcance$
    (fn_alcance_permiso('CONTRATOS_PROYECTOS', 'asignacion_recursos') = 'TODOS')
    or (
      fn_alcance_permiso('CONTRATOS_PROYECTOS', 'asignacion_recursos') in ('EQUIPO', 'PROPIOS')
      and disponibilidad_recursos.recurso_id = auth.uid()
    )
  $alcance$
);

-- rentabilidad_snapshots -------------------------------------------------------
drop policy if exists rentabilidad_snapshots_select_pol on rentabilidad_snapshots;
drop policy if exists rentabilidad_snapshots_insert_pol on rentabilidad_snapshots;
drop policy if exists rentabilidad_snapshots_update_pol on rentabilidad_snapshots;
drop policy if exists rentabilidad_snapshots_delete_pol on rentabilidad_snapshots;
select fn_crear_politicas_rls(
  'rentabilidad_snapshots', 'CONTRATOS_PROYECTOS', 'rentabilidad',
  'fn_empresa_de_proyecto(rentabilidad_snapshots.proyecto_id)',
  $alcance$
    (fn_alcance_permiso('CONTRATOS_PROYECTOS', 'rentabilidad') = 'TODOS')
    or (
      fn_alcance_permiso('CONTRATOS_PROYECTOS', 'rentabilidad') = 'EQUIPO'
      and fn_es_equipo_de_proyecto(rentabilidad_snapshots.proyecto_id)
    )
    or (
      fn_alcance_permiso('CONTRATOS_PROYECTOS', 'rentabilidad') = 'PROPIOS'
      and rentabilidad_snapshots.generado_por = auth.uid()
    )
  $alcance$
);

-- change_requests --------------------------------------------------------------
drop policy if exists change_requests_select_pol on change_requests;
drop policy if exists change_requests_insert_pol on change_requests;
drop policy if exists change_requests_update_pol on change_requests;
drop policy if exists change_requests_delete_pol on change_requests;
select fn_crear_politicas_rls(
  'change_requests', 'CONTRATOS_PROYECTOS', 'change_requests',
  'fn_empresa_de_proyecto(change_requests.proyecto_id)',
  $alcance$
    (fn_alcance_permiso('CONTRATOS_PROYECTOS', 'change_requests') = 'TODOS')
    or (
      fn_alcance_permiso('CONTRATOS_PROYECTOS', 'change_requests') = 'EQUIPO'
      and fn_es_equipo_de_proyecto(change_requests.proyecto_id)
    )
    or (
      fn_alcance_permiso('CONTRATOS_PROYECTOS', 'change_requests') = 'PROPIOS'
      and change_requests.solicitado_por_usuario_id = auth.uid()
    )
  $alcance$
);

-- facturas_referencia_externa ---------------------------------------------------
drop policy if exists facturas_referencia_externa_select_pol on facturas_referencia_externa;
drop policy if exists facturas_referencia_externa_insert_pol on facturas_referencia_externa;
drop policy if exists facturas_referencia_externa_update_pol on facturas_referencia_externa;
drop policy if exists facturas_referencia_externa_delete_pol on facturas_referencia_externa;
select fn_crear_politicas_rls(
  'facturas_referencia_externa', 'CONTRATOS_PROYECTOS', 'facturas_referencia_externa',
  'coalesce(fn_empresa_de_proyecto(facturas_referencia_externa.proyecto_id), fn_empresa_de_contrato(facturas_referencia_externa.contrato_id))',
  $alcance$
    (fn_alcance_permiso('CONTRATOS_PROYECTOS', 'facturas_referencia_externa') = 'TODOS')
    or (
      fn_alcance_permiso('CONTRATOS_PROYECTOS', 'facturas_referencia_externa') = 'EQUIPO'
      and (
        fn_es_equipo_de_proyecto(facturas_referencia_externa.proyecto_id)
        or exists (
          select 1 from contratos c
          where c.id = facturas_referencia_externa.contrato_id
            and (c.responsable_pm_id = auth.uid() or c.responsable_comercial_id = auth.uid())
        )
      )
    )
    or (
      fn_alcance_permiso('CONTRATOS_PROYECTOS', 'facturas_referencia_externa') = 'PROPIOS'
      and facturas_referencia_externa.registrado_por_usuario_id = auth.uid()
    )
  $alcance$
);

-- casos_soporte_referencia_externa -----------------------------------------------
drop policy if exists casos_soporte_referencia_externa_select_pol on casos_soporte_referencia_externa;
drop policy if exists casos_soporte_referencia_externa_insert_pol on casos_soporte_referencia_externa;
drop policy if exists casos_soporte_referencia_externa_update_pol on casos_soporte_referencia_externa;
drop policy if exists casos_soporte_referencia_externa_delete_pol on casos_soporte_referencia_externa;
select fn_crear_politicas_rls(
  'casos_soporte_referencia_externa', 'CONTRATOS_PROYECTOS', 'casos_soporte_referencia_externa',
  'coalesce(fn_empresa_de_proyecto(casos_soporte_referencia_externa.proyecto_id), fn_empresa_de_contrato(casos_soporte_referencia_externa.contrato_id))',
  $alcance$
    (fn_alcance_permiso('CONTRATOS_PROYECTOS', 'casos_soporte_referencia_externa') = 'TODOS')
    or (
      fn_alcance_permiso('CONTRATOS_PROYECTOS', 'casos_soporte_referencia_externa') = 'EQUIPO'
      and (
        fn_es_equipo_de_proyecto(casos_soporte_referencia_externa.proyecto_id)
        or exists (
          select 1 from contratos c
          where c.id = casos_soporte_referencia_externa.contrato_id
            and (c.responsable_pm_id = auth.uid() or c.responsable_comercial_id = auth.uid())
        )
      )
    )
    or (
      fn_alcance_permiso('CONTRATOS_PROYECTOS', 'casos_soporte_referencia_externa') = 'PROPIOS'
      and casos_soporte_referencia_externa.registrado_por_usuario_id = auth.uid()
    )
  $alcance$
);

-- evaluaciones_proveedor (módulo COMPRAS, sublista proveedores) -----------------
drop policy if exists evaluaciones_proveedor_select_pol on evaluaciones_proveedor;
drop policy if exists evaluaciones_proveedor_insert_pol on evaluaciones_proveedor;
drop policy if exists evaluaciones_proveedor_update_pol on evaluaciones_proveedor;
drop policy if exists evaluaciones_proveedor_delete_pol on evaluaciones_proveedor;
select fn_crear_politicas_rls(
  'evaluaciones_proveedor', 'COMPRAS', 'proveedores',
  'fn_empresa_de_proveedor(evaluaciones_proveedor.proveedor_id)',
  $alcance$
    (fn_alcance_permiso('COMPRAS', 'proveedores') = 'TODOS')
    or (
      fn_alcance_permiso('COMPRAS', 'proveedores') = 'EQUIPO'
      and fn_es_equipo_de_proyecto(evaluaciones_proveedor.proyecto_id)
    )
    or (
      fn_alcance_permiso('COMPRAS', 'proveedores') = 'PROPIOS'
      and evaluaciones_proveedor.evaluado_por_usuario_id = auth.uid()
    )
  $alcance$
);

-- ordenes_costo_subcontratacion (módulo COMPRAS, sublista ordenes_costo) --------
drop policy if exists ordenes_costo_subcontratacion_select_pol on ordenes_costo_subcontratacion;
drop policy if exists ordenes_costo_subcontratacion_insert_pol on ordenes_costo_subcontratacion;
drop policy if exists ordenes_costo_subcontratacion_update_pol on ordenes_costo_subcontratacion;
drop policy if exists ordenes_costo_subcontratacion_delete_pol on ordenes_costo_subcontratacion;
select fn_crear_politicas_rls(
  'ordenes_costo_subcontratacion', 'COMPRAS', 'ordenes_costo',
  'fn_empresa_de_proyecto(ordenes_costo_subcontratacion.proyecto_id)',
  $alcance$
    (fn_alcance_permiso('COMPRAS', 'ordenes_costo') = 'TODOS')
    or (
      fn_alcance_permiso('COMPRAS', 'ordenes_costo') in ('EQUIPO', 'PROPIOS')
      and fn_es_equipo_de_proyecto(ordenes_costo_subcontratacion.proyecto_id)
    )
  $alcance$
);
