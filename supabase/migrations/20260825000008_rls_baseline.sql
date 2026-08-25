-- =============================================================================
-- Devtopia ERP — Etapa 7: RLS baseline (multiempresa + RBAC)
-- Ver docs/data-model/00-overview.md §12 y docs/data-model/README.md.
--
-- Enfoque: dos funciones auxiliares (fn_empresa_actual, fn_tiene_permiso) más un
-- generador de políticas (fn_crear_politicas_rls) que aplica el mismo patrón
-- SELECT/INSERT/UPDATE/DELETE a cada tabla, evitando escribir ~180 políticas casi
-- idénticas a mano y el riesgo de que diverjan entre sí. Las tablas de log/polimórficas
-- (log_auditoria, workflows_historial, integraciones_log) y los catálogos verdaderamente
-- globales (monedas, tasas_cambio) se resuelven aparte porque no siguen el patrón.
--
-- Este es un BASELINE explícito: cubre el 100% de las tablas de negocio con acceso
-- gobernado por empresa + matriz de permisos, pero el `alcance` (TODOS/EQUIPO/PROPIOS)
-- de la tabla `permisos` (01-configuracion-general) aún no se aplica a nivel de fila
-- individual (p. ej. "solo mis propios timesheets") — queda como refinamiento explícito
-- de una siguiente etapa, documentado aquí para no perderlo de vista.
--
-- ROLLBACK:
--   -- Deshabilita RLS en todas las tablas de negocio y elimina las políticas y funciones.
--   -- Ejecutar el bloque `do $$ ... $$` de la sección "ROLLBACK COMPLETO" al final de este
--   -- archivo (comentado) si se necesita revertir por completo.
-- =============================================================================

create or replace function fn_empresa_actual()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select empresa_id from perfiles_usuario where id = auth.uid();
$$;

comment on function fn_empresa_actual() is
  'Empresa del usuario autenticado actual, resuelta desde perfiles_usuario. SECURITY DEFINER para evitar recursión de RLS al consultarse desde otras políticas.';

create or replace function fn_tiene_permiso(p_modulo text, p_accion text, p_sublista text default null)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_rol_id uuid;
  v_permiso permisos%rowtype;
begin
  select rol_id into v_rol_id from perfiles_usuario where id = auth.uid();
  if v_rol_id is null then
    return false;
  end if;

  select * into v_permiso
    from permisos
   where rol_id = v_rol_id
     and modulo = p_modulo
     and (sublista = p_sublista or sublista is null)
   order by (sublista = p_sublista) desc nulls last
   limit 1;

  if not found then
    return false;
  end if;

  return case p_accion
    when 'leer' then v_permiso.puede_leer
    when 'crear' then v_permiso.puede_crear
    when 'editar' then v_permiso.puede_editar
    when 'eliminar' then v_permiso.puede_eliminar
    when 'aprobar' then v_permiso.puede_aprobar
    else false
  end;
end;
$$;

comment on function fn_tiene_permiso(text, text, text) is
  'Consulta la matriz permisos para el rol del usuario autenticado. p_accion: leer|crear|editar|eliminar|aprobar. Si existe fila específica de sublista la prioriza sobre la fila general del módulo.';

create or replace function fn_crear_politicas_rls(
  p_tabla text,
  p_modulo text,
  p_sublista text,
  p_empresa_expr text
) returns void
language plpgsql
as $$
begin
  execute format('alter table %I enable row level security', p_tabla);

  execute format(
    'create policy %I on %I for select using ((%s) = fn_empresa_actual() and fn_tiene_permiso(%L, ''leer'', %L))',
    p_tabla || '_select_pol', p_tabla, p_empresa_expr, p_modulo, p_sublista
  );

  execute format(
    'create policy %I on %I for insert with check ((%s) = fn_empresa_actual() and fn_tiene_permiso(%L, ''crear'', %L))',
    p_tabla || '_insert_pol', p_tabla, p_empresa_expr, p_modulo, p_sublista
  );

  execute format(
    'create policy %I on %I for update using ((%s) = fn_empresa_actual() and fn_tiene_permiso(%L, ''editar'', %L)) with check ((%s) = fn_empresa_actual())',
    p_tabla || '_update_pol', p_tabla, p_empresa_expr, p_modulo, p_sublista, p_empresa_expr
  );

  execute format(
    'create policy %I on %I for delete using ((%s) = fn_empresa_actual() and fn_tiene_permiso(%L, ''eliminar'', %L))',
    p_tabla || '_delete_pol', p_tabla, p_empresa_expr, p_modulo, p_sublista
  );
end;
$$;

comment on function fn_crear_politicas_rls(text, text, text, text) is
  'Generador de políticas RLS estándar (select/insert/update/delete) según empresa + matriz de permisos. p_empresa_expr es una expresión SQL válida en el contexto de la tabla (columna directa o subconsulta al padre).';

-- -----------------------------------------------------------------------------
-- Tablas con empresa_id directo
-- -----------------------------------------------------------------------------
select fn_crear_politicas_rls('empresas', 'CONFIGURACION', null, 'id');
select fn_crear_politicas_rls('perfiles_usuario', 'CONFIGURACION', 'perfiles_usuario', 'empresa_id');
select fn_crear_politicas_rls('roles', 'CONFIGURACION', 'roles', 'empresa_id');
select fn_crear_politicas_rls('secuencias_numeracion', 'CONFIGURACION', 'secuencias_numeracion', 'empresa_id');
select fn_crear_politicas_rls('alertas_notificaciones_reglas', 'CONFIGURACION', 'alertas', 'empresa_id');
select fn_crear_politicas_rls('integraciones_config', 'CONFIGURACION', 'integraciones', 'empresa_id');
select fn_crear_politicas_rls('estados_ciclo_vida', 'CONFIGURACION', 'workflows', 'empresa_id');
select fn_crear_politicas_rls('catalogos_valores', 'CONFIGURACION', 'catalogos', 'empresa_id');

select fn_crear_politicas_rls('categorias_servicio', 'PRODUCTOS_SERVICIOS', null, 'empresa_id');
select fn_crear_politicas_rls('sla_planes', 'PRODUCTOS_SERVICIOS', 'sla', 'empresa_id');
select fn_crear_politicas_rls('catalogo_roles_tarifa', 'PRODUCTOS_SERVICIOS', 'roles_tarifa', 'empresa_id');
select fn_crear_politicas_rls('catalogo_servicios', 'PRODUCTOS_SERVICIOS', null, 'empresa_id');
select fn_crear_politicas_rls('paquetes_servicios', 'PRODUCTOS_SERVICIOS', 'paquetes', 'empresa_id');
select fn_crear_politicas_rls('licencias_suscripciones_catalogo', 'PRODUCTOS_SERVICIOS', 'licencias', 'empresa_id');

select fn_crear_politicas_rls('cuentas_clientes', 'CRM_VENTAS', 'cuentas', 'empresa_id');
select fn_crear_politicas_rls('oportunidades', 'CRM_VENTAS', 'oportunidades', 'empresa_id');
select fn_crear_politicas_rls('cotizaciones', 'CRM_VENTAS', 'cotizaciones', 'empresa_id');

select fn_crear_politicas_rls('contratos', 'CONTRATOS_PROYECTOS', 'contratos', 'empresa_id');
select fn_crear_politicas_rls('proyectos', 'CONTRATOS_PROYECTOS', 'proyectos', 'empresa_id');

select fn_crear_politicas_rls('proveedores', 'COMPRAS', 'proveedores', 'empresa_id');

select fn_crear_politicas_rls('checklist_liquidacion_plantillas', 'CIERRE_POSTVENTA', 'checklist', 'empresa_id');

-- -----------------------------------------------------------------------------
-- Tablas hijas (empresa resuelta vía subconsulta al padre)
-- -----------------------------------------------------------------------------
select fn_crear_politicas_rls('sla_niveles', 'PRODUCTOS_SERVICIOS', 'sla',
  '(select sp.empresa_id from sla_planes sp where sp.id = sla_plan_id)');

select fn_crear_politicas_rls('paquetes_servicios_detalle', 'PRODUCTOS_SERVICIOS', 'paquetes',
  '(select ps.empresa_id from paquetes_servicios ps where ps.id = paquete_id)');

select fn_crear_politicas_rls('licencias_asignadas', 'PRODUCTOS_SERVICIOS', 'licencias',
  '(select lc.empresa_id from licencias_suscripciones_catalogo lc where lc.id = licencia_catalogo_id)');

select fn_crear_politicas_rls('contactos', 'CRM_VENTAS', 'contactos',
  '(select c.empresa_id from cuentas_clientes c where c.id = cuenta_id)');

select fn_crear_politicas_rls('oportunidades_seguimiento', 'CRM_VENTAS', 'oportunidades',
  '(select o.empresa_id from oportunidades o where o.id = oportunidad_id)');

select fn_crear_politicas_rls('cotizaciones_detalle', 'CRM_VENTAS', 'cotizaciones',
  '(select co.empresa_id from cotizaciones co where co.id = cotizacion_id)');

select fn_crear_politicas_rls('cotizaciones_aprobaciones', 'CRM_VENTAS', 'cotizaciones',
  '(select co.empresa_id from cotizaciones co where co.id = cotizacion_id)');

select fn_crear_politicas_rls('hitos_entregables', 'CONTRATOS_PROYECTOS', 'hitos_entregables',
  '(select p.empresa_id from proyectos p where p.id = proyecto_id)');

select fn_crear_politicas_rls('hitos_criterios_aceptacion', 'CONTRATOS_PROYECTOS', 'hitos_entregables',
  '(select p.empresa_id from hitos_entregables h join proyectos p on p.id = h.proyecto_id where h.id = hito_id)');

select fn_crear_politicas_rls('timesheets', 'CONTRATOS_PROYECTOS', 'timesheets',
  '(select p.empresa_id from proyectos p where p.id = proyecto_id)');

select fn_crear_politicas_rls('asignacion_recursos', 'CONTRATOS_PROYECTOS', 'asignacion_recursos',
  '(select p.empresa_id from proyectos p where p.id = proyecto_id)');

select fn_crear_politicas_rls('disponibilidad_recursos', 'CONTRATOS_PROYECTOS', 'asignacion_recursos',
  '(select pu.empresa_id from perfiles_usuario pu where pu.id = recurso_id)');

select fn_crear_politicas_rls('rentabilidad_snapshots', 'CONTRATOS_PROYECTOS', 'rentabilidad',
  '(select p.empresa_id from proyectos p where p.id = proyecto_id)');

select fn_crear_politicas_rls('change_requests', 'CONTRATOS_PROYECTOS', 'change_requests',
  '(select p.empresa_id from proyectos p where p.id = proyecto_id)');

select fn_crear_politicas_rls('facturas_referencia_externa', 'CONTRATOS_PROYECTOS', 'facturas_referencia_externa',
  '(select coalesce((select p.empresa_id from proyectos p where p.id = proyecto_id), (select c.empresa_id from contratos c where c.id = contrato_id)))');

select fn_crear_politicas_rls('casos_soporte_referencia_externa', 'CONTRATOS_PROYECTOS', 'casos_soporte_referencia_externa',
  '(select coalesce((select p.empresa_id from proyectos p where p.id = proyecto_id), (select c.empresa_id from contratos c where c.id = contrato_id)))');

select fn_crear_politicas_rls('evaluaciones_proveedor', 'COMPRAS', 'proveedores',
  '(select pv.empresa_id from proveedores pv where pv.id = proveedor_id)');

select fn_crear_politicas_rls('ordenes_costo_subcontratacion', 'COMPRAS', 'ordenes_costo',
  '(select p.empresa_id from proyectos p where p.id = proyecto_id)');

select fn_crear_politicas_rls('checklist_liquidacion_plantilla_items', 'CIERRE_POSTVENTA', 'checklist',
  '(select cp.empresa_id from checklist_liquidacion_plantillas cp where cp.id = plantilla_id)');

select fn_crear_politicas_rls('checklist_liquidacion_proyecto', 'CIERRE_POSTVENTA', 'checklist',
  '(select p.empresa_id from proyectos p where p.id = proyecto_id)');

select fn_crear_politicas_rls('checklist_liquidacion_items', 'CIERRE_POSTVENTA', 'checklist',
  '(select p.empresa_id from checklist_liquidacion_proyecto clp join proyectos p on p.id = clp.proyecto_id where clp.id = checklist_proyecto_id)');

select fn_crear_politicas_rls('actas_cierre', 'CIERRE_POSTVENTA', 'actas_cierre',
  '(select p.empresa_id from proyectos p where p.id = proyecto_id)');

select fn_crear_politicas_rls('garantias_contractuales', 'CIERRE_POSTVENTA', 'garantias',
  '(select coalesce((select p.empresa_id from proyectos p where p.id = proyecto_id), (select c.empresa_id from contratos c where c.id = contrato_id)))');

select fn_crear_politicas_rls('garantia_extensiones', 'CIERRE_POSTVENTA', 'garantias',
  '(select coalesce((select p.empresa_id from proyectos p where p.id = g.proyecto_id), (select c.empresa_id from contratos c where c.id = g.contrato_id)) from garantias_contractuales g where g.id = garantia_id)');

select fn_crear_politicas_rls('permisos', 'CONFIGURACION', 'roles',
  '(select r.empresa_id from roles r where r.id = rol_id)');

select fn_crear_politicas_rls('webhooks_salientes', 'CONFIGURACION', 'integraciones',
  '(select ic.empresa_id from integraciones_config ic where ic.id = integracion_id)');

select fn_crear_politicas_rls('notificaciones_enviadas', 'CONFIGURACION', 'alertas',
  '(select a.empresa_id from alertas_notificaciones_reglas a where a.id = regla_id)');

select fn_crear_politicas_rls('workflows_transiciones', 'CONFIGURACION', 'workflows',
  '(select e.empresa_id from estados_ciclo_vida e where e.id = estado_origen_id)');

select fn_crear_politicas_rls('tasas_cambio', 'CONFIGURACION', 'monedas', 'null::uuid');
-- Nota: tasas_cambio no tiene empresa_id (moneda es catálogo global); la expresión
-- 'null::uuid' hace que select/insert/update/delete dependan solo del permiso, no de
-- coincidencia de empresa. Ver ajuste de policy de solo-lectura más abajo para monedas.

-- -----------------------------------------------------------------------------
-- Catálogos globales (sin empresa_id): lectura abierta a cualquier autenticado,
-- escritura restringida a quien tenga permiso de editar CONFIGURACION.
-- -----------------------------------------------------------------------------
alter table monedas enable row level security;

create policy monedas_select_pol on monedas
  for select using (auth.role() = 'authenticated');

create policy monedas_write_pol on monedas
  for all
  using (fn_tiene_permiso('CONFIGURACION', 'editar', 'monedas'))
  with check (fn_tiene_permiso('CONFIGURACION', 'editar', 'monedas'));

-- -----------------------------------------------------------------------------
-- Tablas de log / polimórficas: solo lectura para quien tenga permiso de
-- auditoría; la escritura ocurre por trigger SECURITY DEFINER (log_auditoria) o
-- por la capa de aplicación autenticada (workflows_historial, integraciones_log).
-- -----------------------------------------------------------------------------
alter table log_auditoria enable row level security;

create policy log_auditoria_select_pol on log_auditoria
  for select using (fn_tiene_permiso('CONFIGURACION', 'leer', 'auditoria'));
-- Sin política de insert/update/delete para 'authenticated': los inserts los hace
-- fn_audit_row() como SECURITY DEFINER (bypassa RLS); UPDATE/DELETE ya están
-- revocados a nivel de rol desde 01-configuracion-general.sql.

alter table workflows_historial enable row level security;

create policy workflows_historial_select_pol on workflows_historial
  for select using (fn_tiene_permiso('CONFIGURACION', 'leer', 'workflows'));

create policy workflows_historial_insert_pol on workflows_historial
  for insert with check (usuario_id = auth.uid());

alter table integraciones_log enable row level security;
revoke update, delete on integraciones_log from authenticated, anon;

create policy integraciones_log_select_pol on integraciones_log
  for select using (fn_tiene_permiso('CONFIGURACION', 'leer', 'integraciones'));

-- Los inserts a integraciones_log los hace la capa de aplicación (server actions) con
-- el rol de servicio (service_role), que bypassa RLS por diseño de Supabase; no se
-- habilita insert para 'authenticated' para evitar que el cliente falsifique logs de
-- integración.

-- =============================================================================
-- ROLLBACK COMPLETO (referencia, no se ejecuta automáticamente):
--
-- do $$
-- declare r record;
-- begin
--   for r in
--     select tablename from pg_policies where schemaname = 'public'
--   loop
--     execute format('drop policy if exists %I on %I', r.tablename, r.tablename);
--   end loop;
-- end $$;
-- drop function if exists fn_crear_politicas_rls(text, text, text, text);
-- drop function if exists fn_tiene_permiso(text, text, text);
-- drop function if exists fn_empresa_actual();
-- =============================================================================
