-- =============================================================================
-- Checkpoint 6 (refinamiento transversal) — Alcance por fila (PROPIOS/EQUIPO/TODOS)
-- Fase 2: CRM y Ventas + Productos y Servicios + Configuración General.
--
-- Contexto: el usuario pidió aplicar el alcance por fila (ya diseñado en la
-- migración 018 para Contratos y Proyectos + Compras) a "todos los módulos
-- existentes". Este es el análisis y la implementación para los 3 módulos
-- restantes. A diferencia de la Fase 1 (donde "mi equipo" = equipo de
-- proyecto tenía un significado claro y uniforme), estos 3 módulos NO tienen
-- ese mismo concepto — el análisis tabla por tabla arrojó tres categorías
-- distintas, no un patrón único:
--
-- 1) CRM y Ventas SÍ tiene una noción real de "dueño" por fila: el ejecutivo
--    comercial (`ejecutivo_comercial_id` en cuentas_clientes/oportunidades,
--    `responsable_comercial_id` en cotizaciones). Se aplica alcance real aquí
--    (7 tablas). No existe en el esquema ningún concepto de "equipo/gerente
--    comercial" (no hay jerarquía de supervisor), así que — igual que se hizo
--    con `contratos` en la migración 018 — EQUIPO se trata igual que PROPIOS:
--    ambos valores exigen ser el ejecutivo/responsable de la fila.
--
-- 2) Productos y Servicios es, en su mayoría, un CATÁLOGO compartido de toda
--    la empresa (servicios, categorías, roles y tarifa, planes SLA, paquetes,
--    catálogo de licencias): ninguna de esas 7 tablas tiene columna de
--    creador/responsable — un "servicio" o un "plan SLA" no le pertenece a
--    una persona, le pertenece al catálogo de la empresa. Aplicar PROPIOS/
--    EQUIPO ahí no tiene ningún concepto de negocio al que amarrarse, así que
--    quedan sin alcance por fila (siguen efectivamente como TODOS, igual que
--    hoy). La única excepción es `licencias_asignadas` (la asignación de una
--    licencia del catálogo a un proyecto/cliente concreto, no el catálogo en
--    sí) — si tiene proyecto asociado, se reutiliza el mismo
--    `fn_es_equipo_de_proyecto()` de la migración 018 (mismo caso que
--    `ordenes_costo_subcontratacion`: sin columna de creador, EQUIPO y
--    PROPIOS se tratan igual).
--
-- 3) Configuración General queda COMPLETAMENTE fuera de este refinamiento:
--    las 16 tablas del módulo (usuarios/roles/permisos, secuencias de
--    numeración, reglas de alertas, integraciones, el motor de workflows,
--    catálogos genéricos, monedas, auditoría, notificaciones enviadas) son
--    configuración global de la empresa, administrada por roles con permiso
--    de Administrador — ninguna tiene una columna de creador/responsable
--    utilizable, y conceptualmente ninguna representa "trabajo de alguien" en
--    el sentido en que sí lo son un timesheet o una cotización. Forzar una
--    columna "propia" ahí (agregando `created_by` a 16 tablas) sería un
--    cambio estructural mucho mayor, no pedido explícitamente, y sin un caso
--    de uso de negocio claro detrás — se deja fuera y se documenta.
--
-- Riesgo: cambio estructural en RLS. Verificado empíricamente en Postgres
-- local (transacción BEGIN/ROLLBACK) antes de aplicarse aquí — ver bitácora.
--
-- Lección aplicada de la migración 018 (ver bitácora): cualquier
-- p_empresa_expr que se reescriba aquí y dependa de otra tabla protegida por
-- RLS se envuelve en una función SECURITY DEFINER nueva
-- (fn_empresa_de_cuenta/fn_empresa_de_oportunidad/fn_empresa_de_cotizacion/
-- fn_empresa_de_licencia_catalogo), para no repetir el mismo bug de NULL bajo
-- RLS anidada que bloqueaba filas propias a roles de permiso estrecho.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Helpers SECURITY DEFINER para resolver empresa_id sin quedar sujetos a
--    la RLS de la tabla padre.
-- -----------------------------------------------------------------------------
create or replace function fn_empresa_de_cuenta(p_cuenta_id uuid)
returns uuid
language sql
stable
security definer
set search_path = public
as $function$
  select empresa_id from cuentas_clientes where id = p_cuenta_id;
$function$;

create or replace function fn_empresa_de_oportunidad(p_oportunidad_id uuid)
returns uuid
language sql
stable
security definer
set search_path = public
as $function$
  select empresa_id from oportunidades where id = p_oportunidad_id;
$function$;

create or replace function fn_empresa_de_cotizacion(p_cotizacion_id uuid)
returns uuid
language sql
stable
security definer
set search_path = public
as $function$
  select empresa_id from cotizaciones where id = p_cotizacion_id;
$function$;

create or replace function fn_empresa_de_licencia_catalogo(p_licencia_catalogo_id uuid)
returns uuid
language sql
stable
security definer
set search_path = public
as $function$
  select empresa_id from licencias_suscripciones_catalogo where id = p_licencia_catalogo_id;
$function$;

-- -----------------------------------------------------------------------------
-- 2. Helpers SECURITY DEFINER de "soy el ejecutivo/responsable de esta fila
--    padre" — usados por las tablas hijas (contactos, seguimiento,
--    detalle/aprobaciones de cotización) para heredar el alcance del dueño de
--    la fila padre, en vez de exigir que cada fila hija tenga su propia
--    columna de dueño (que no tienen).
-- -----------------------------------------------------------------------------
create or replace function fn_es_ejecutivo_de_cuenta(p_cuenta_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $function$
  select exists (
    select 1 from cuentas_clientes c
    where c.id = p_cuenta_id and c.ejecutivo_comercial_id = auth.uid()
  );
$function$;

create or replace function fn_es_ejecutivo_de_oportunidad(p_oportunidad_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $function$
  select exists (
    select 1 from oportunidades o
    where o.id = p_oportunidad_id and o.ejecutivo_comercial_id = auth.uid()
  );
$function$;

create or replace function fn_es_responsable_de_cotizacion(p_cotizacion_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $function$
  select exists (
    select 1 from cotizaciones co
    where co.id = p_cotizacion_id and co.responsable_comercial_id = auth.uid()
  );
$function$;

-- -----------------------------------------------------------------------------
-- 3. CRM y Ventas — alcance real (EQUIPO se trata igual que PROPIOS: no hay
--    jerarquía de supervisor comercial en el esquema).
-- -----------------------------------------------------------------------------

-- cuentas_clientes --------------------------------------------------------------
drop policy if exists cuentas_clientes_select_pol on cuentas_clientes;
drop policy if exists cuentas_clientes_insert_pol on cuentas_clientes;
drop policy if exists cuentas_clientes_update_pol on cuentas_clientes;
drop policy if exists cuentas_clientes_delete_pol on cuentas_clientes;
select fn_crear_politicas_rls(
  'cuentas_clientes', 'CRM_VENTAS', 'cuentas',
  'empresa_id',
  $alcance$
    (fn_alcance_permiso('CRM_VENTAS', 'cuentas') = 'TODOS')
    or (
      fn_alcance_permiso('CRM_VENTAS', 'cuentas') in ('EQUIPO', 'PROPIOS')
      and cuentas_clientes.ejecutivo_comercial_id = auth.uid()
    )
  $alcance$
);

-- contactos (hereda el alcance de la cuenta padre) -------------------------------
drop policy if exists contactos_select_pol on contactos;
drop policy if exists contactos_insert_pol on contactos;
drop policy if exists contactos_update_pol on contactos;
drop policy if exists contactos_delete_pol on contactos;
select fn_crear_politicas_rls(
  'contactos', 'CRM_VENTAS', 'contactos',
  'fn_empresa_de_cuenta(contactos.cuenta_id)',
  $alcance$
    (fn_alcance_permiso('CRM_VENTAS', 'contactos') = 'TODOS')
    or (
      fn_alcance_permiso('CRM_VENTAS', 'contactos') in ('EQUIPO', 'PROPIOS')
      and fn_es_ejecutivo_de_cuenta(contactos.cuenta_id)
    )
  $alcance$
);

-- oportunidades ------------------------------------------------------------------
drop policy if exists oportunidades_select_pol on oportunidades;
drop policy if exists oportunidades_insert_pol on oportunidades;
drop policy if exists oportunidades_update_pol on oportunidades;
drop policy if exists oportunidades_delete_pol on oportunidades;
select fn_crear_politicas_rls(
  'oportunidades', 'CRM_VENTAS', 'oportunidades',
  'empresa_id',
  $alcance$
    (fn_alcance_permiso('CRM_VENTAS', 'oportunidades') = 'TODOS')
    or (
      fn_alcance_permiso('CRM_VENTAS', 'oportunidades') in ('EQUIPO', 'PROPIOS')
      and oportunidades.ejecutivo_comercial_id = auth.uid()
    )
  $alcance$
);

-- oportunidades_seguimiento (hereda el alcance de la oportunidad padre) ---------
drop policy if exists oportunidades_seguimiento_select_pol on oportunidades_seguimiento;
drop policy if exists oportunidades_seguimiento_insert_pol on oportunidades_seguimiento;
drop policy if exists oportunidades_seguimiento_update_pol on oportunidades_seguimiento;
drop policy if exists oportunidades_seguimiento_delete_pol on oportunidades_seguimiento;
select fn_crear_politicas_rls(
  'oportunidades_seguimiento', 'CRM_VENTAS', 'oportunidades',
  'fn_empresa_de_oportunidad(oportunidades_seguimiento.oportunidad_id)',
  $alcance$
    (fn_alcance_permiso('CRM_VENTAS', 'oportunidades') = 'TODOS')
    or (
      fn_alcance_permiso('CRM_VENTAS', 'oportunidades') in ('EQUIPO', 'PROPIOS')
      and fn_es_ejecutivo_de_oportunidad(oportunidades_seguimiento.oportunidad_id)
    )
  $alcance$
);

-- cotizaciones ---------------------------------------------------------------------
drop policy if exists cotizaciones_select_pol on cotizaciones;
drop policy if exists cotizaciones_insert_pol on cotizaciones;
drop policy if exists cotizaciones_update_pol on cotizaciones;
drop policy if exists cotizaciones_delete_pol on cotizaciones;
select fn_crear_politicas_rls(
  'cotizaciones', 'CRM_VENTAS', 'cotizaciones',
  'empresa_id',
  $alcance$
    (fn_alcance_permiso('CRM_VENTAS', 'cotizaciones') = 'TODOS')
    or (
      fn_alcance_permiso('CRM_VENTAS', 'cotizaciones') in ('EQUIPO', 'PROPIOS')
      and cotizaciones.responsable_comercial_id = auth.uid()
    )
  $alcance$
);

-- cotizaciones_detalle (hereda el alcance de la cotización padre) ---------------
drop policy if exists cotizaciones_detalle_select_pol on cotizaciones_detalle;
drop policy if exists cotizaciones_detalle_insert_pol on cotizaciones_detalle;
drop policy if exists cotizaciones_detalle_update_pol on cotizaciones_detalle;
drop policy if exists cotizaciones_detalle_delete_pol on cotizaciones_detalle;
select fn_crear_politicas_rls(
  'cotizaciones_detalle', 'CRM_VENTAS', 'cotizaciones',
  'fn_empresa_de_cotizacion(cotizaciones_detalle.cotizacion_id)',
  $alcance$
    (fn_alcance_permiso('CRM_VENTAS', 'cotizaciones') = 'TODOS')
    or (
      fn_alcance_permiso('CRM_VENTAS', 'cotizaciones') in ('EQUIPO', 'PROPIOS')
      and fn_es_responsable_de_cotizacion(cotizaciones_detalle.cotizacion_id)
    )
  $alcance$
);

-- cotizaciones_aprobaciones (hereda el alcance de la cotización padre) ----------
drop policy if exists cotizaciones_aprobaciones_select_pol on cotizaciones_aprobaciones;
drop policy if exists cotizaciones_aprobaciones_insert_pol on cotizaciones_aprobaciones;
drop policy if exists cotizaciones_aprobaciones_update_pol on cotizaciones_aprobaciones;
drop policy if exists cotizaciones_aprobaciones_delete_pol on cotizaciones_aprobaciones;
select fn_crear_politicas_rls(
  'cotizaciones_aprobaciones', 'CRM_VENTAS', 'cotizaciones',
  'fn_empresa_de_cotizacion(cotizaciones_aprobaciones.cotizacion_id)',
  $alcance$
    (fn_alcance_permiso('CRM_VENTAS', 'cotizaciones') = 'TODOS')
    or (
      fn_alcance_permiso('CRM_VENTAS', 'cotizaciones') in ('EQUIPO', 'PROPIOS')
      and fn_es_responsable_de_cotizacion(cotizaciones_aprobaciones.cotizacion_id)
    )
  $alcance$
);

-- -----------------------------------------------------------------------------
-- 4. Productos y Servicios — solo licencias_asignadas (las otras 7 tablas del
--    módulo son catálogo compartido sin dueño por fila, ver nota arriba).
-- -----------------------------------------------------------------------------
drop policy if exists licencias_asignadas_select_pol on licencias_asignadas;
drop policy if exists licencias_asignadas_insert_pol on licencias_asignadas;
drop policy if exists licencias_asignadas_update_pol on licencias_asignadas;
drop policy if exists licencias_asignadas_delete_pol on licencias_asignadas;
select fn_crear_politicas_rls(
  'licencias_asignadas', 'PRODUCTOS_SERVICIOS', 'licencias',
  'fn_empresa_de_licencia_catalogo(licencias_asignadas.licencia_catalogo_id)',
  $alcance$
    (fn_alcance_permiso('PRODUCTOS_SERVICIOS', 'licencias') = 'TODOS')
    or (
      fn_alcance_permiso('PRODUCTOS_SERVICIOS', 'licencias') in ('EQUIPO', 'PROPIOS')
      and fn_es_equipo_de_proyecto(licencias_asignadas.proyecto_id)
    )
  $alcance$
);

-- -----------------------------------------------------------------------------
-- 5. Configuración General: sin cambios, a propósito (ver nota al inicio del
--    archivo). Ninguna tabla de este módulo se toca en esta migración.
-- -----------------------------------------------------------------------------
