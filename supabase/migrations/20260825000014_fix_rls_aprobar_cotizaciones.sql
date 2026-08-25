-- =============================================================================
-- Devtopia ERP — Etapa 14: cierra el hueco de RLS en la resolución de
-- aprobaciones de cotizaciones (aprobar vs. editar).
--
-- CONTEXTO: `fn_crear_politicas_rls()` genera automáticamente una política
-- UPDATE estándar por tabla, ligada al permiso genérico 'editar' de la
-- sublista correspondiente. El generador no distingue una acción de negocio
-- más específica como "aprobar" — así que `cotizaciones_aprobaciones_update_pol`
-- (20260825000005_crm_ventas.sql, vía el generador) quedó exigiendo
-- CRM_VENTAS/editar/cotizaciones, aunque la ÚNICA operación de UPDATE real
-- sobre esta tabla (`resolverAprobacion()` en
-- app/(app)/crm/cotizaciones-actions.ts) siempre exige el permiso 'aprobar'
-- en la capa de aplicación desde que se construyó Cotizaciones (Checkpoint 3).
--
-- Esto significa que, hasta esta migración, un usuario con CRM_VENTAS/editar
-- pero SIN CRM_VENTAS/aprobar sobre cotizaciones podía resolver una
-- aprobación (aprobar o rechazar) llamando directamente al cliente de
-- Supabase (REST/JS SDK) sin pasar por el server action — la UI y el server
-- action ya se lo impedían, pero la base de datos, que es la autoridad real,
-- no. Documentado como "caveat de seguridad conocido, no resuelto" en la
-- memoria de proyecto desde Checkpoint 3; el usuario pidió cerrarlo ahora.
--
-- SOLUCIÓN: se reemplaza la política UPDATE generada para exigir
-- CRM_VENTAS/aprobar/cotizaciones en vez de CRM_VENTAS/editar/cotizaciones —
-- exactamente el mismo permiso que ya exige `resolverAprobacion()`. El
-- `with_check` (que solo valida que la cotización siga siendo de la empresa
-- actual) no cambia.
--
-- No se toca la política INSERT (sigue exigiendo 'crear', usada por
-- `solicitarAprobacion()`, que en la app chequea 'editar' — un usuario con
-- 'editar' pero sin 'crear' vería la solicitud bloqueada por RLS con un
-- error genérico en vez de un mensaje claro de la UI; es una inconsistencia
-- menor de UX, no un hueco de seguridad, y no fue parte de lo pedido en esta
-- etapa — queda anotado por si se quiere alinear más adelante).
--
-- VERIFICACIÓN: aplicado y probado en Postgres local (devtopia_test) — un
-- usuario con rol que tiene CRM_VENTAS/editar/cotizaciones pero NO
-- CRM_VENTAS/aprobar/cotizaciones ya no puede hacer UPDATE directo sobre
-- cotizaciones_aprobaciones (0 filas afectadas, RLS lo bloquea); un usuario
-- con CRM_VENTAS/aprobar/cotizaciones sí puede.
--
-- ROLLBACK:
--   drop policy if exists cotizaciones_aprobaciones_update_pol on cotizaciones_aprobaciones;
--   create policy cotizaciones_aprobaciones_update_pol on cotizaciones_aprobaciones
--     for update
--     using (
--       (select co.empresa_id from cotizaciones co where co.id = cotizaciones_aprobaciones.cotizacion_id) = fn_empresa_actual()
--       and fn_tiene_permiso('CRM_VENTAS', 'editar', 'cotizaciones')
--     )
--     with check (
--       (select co.empresa_id from cotizaciones co where co.id = cotizaciones_aprobaciones.cotizacion_id) = fn_empresa_actual()
--     );
-- =============================================================================

drop policy if exists cotizaciones_aprobaciones_update_pol on cotizaciones_aprobaciones;

create policy cotizaciones_aprobaciones_update_pol on cotizaciones_aprobaciones
  for update
  using (
    (select co.empresa_id from cotizaciones co where co.id = cotizaciones_aprobaciones.cotizacion_id) = fn_empresa_actual()
    and fn_tiene_permiso('CRM_VENTAS', 'aprobar', 'cotizaciones')
  )
  with check (
    (select co.empresa_id from cotizaciones co where co.id = cotizaciones_aprobaciones.cotizacion_id) = fn_empresa_actual()
  );
