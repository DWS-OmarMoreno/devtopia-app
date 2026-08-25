-- =============================================================================
-- Devtopia ERP — Etapa 12 (fix): lectura de catálogos y estados de flujo
-- compartidos, para cualquier usuario de la empresa (no solo Administrador).
--
-- Detectado al construir Cotizaciones (CRM y Ventas): esta pantalla necesita
-- que CUALQUIER rol de negocio pueda leer `estados_ciclo_vida` (para mostrar
-- el estado actual y las transiciones válidas de una cotización) y
-- `catalogos_valores` (usada, por ejemplo, para el motivo de pérdida de una
-- oportunidad — módulo anterior). Verificado en Postgres local: con las
-- políticas de `20260825000008_rls_baseline.sql` (gatean estas tablas por
-- `CONFIGURACION`/`workflows` o `CONFIGURACION`/`catalogos`, y en la matriz
-- sembrada SOLO Administrador tiene permiso sobre CONFIGURACION), un usuario
-- Comercial obtenía 0 filas de `catalogos_valores` y de `estados_ciclo_vida`
-- — el mismo patrón de "bootstrap" ya corregido dos veces antes (perfiles de
-- usuario en 009, generador de consecutivos en 010): tablas de referencia
-- que viven conceptualmente bajo Configuración pero que TODA la aplicación
-- necesita poder leer, no solo administrar.
--
-- Mismo alcance que 20260825000011 (perfiles de compañeros): lectura por
-- empresa, sin exigir ningún permiso de módulo — son catálogos/estados de
-- configuración, no datos sensibles, y ya son visibles indirectamente en
-- cualquier pantalla que los use (nombre de un estado, etiqueta de un motivo
-- de pérdida). ADMINISTRAR estas tablas (crear/editar/eliminar un estado o
-- valor de catálogo) sigue exigiendo el permiso de editar sobre
-- CONFIGURACION — las políticas de INSERT/UPDATE/DELETE no se tocan.
--
-- No se incluye `secuencias_numeracion` aquí a propósito: su único punto de
-- acceso es `fn_generar_consecutivo()` (ya `SECURITY DEFINER` desde la
-- migración 010), así que no hay necesidad de ampliar su SELECT directo.
--
-- ROLLBACK:
--   drop policy if exists catalogos_valores_lectura_empresa_pol on catalogos_valores;
--   drop policy if exists estados_ciclo_vida_lectura_empresa_pol on estados_ciclo_vida;
--   drop policy if exists workflows_transiciones_lectura_empresa_pol on workflows_transiciones;
-- =============================================================================

create policy catalogos_valores_lectura_empresa_pol on catalogos_valores
  for select using (empresa_id = fn_empresa_actual());

create policy estados_ciclo_vida_lectura_empresa_pol on estados_ciclo_vida
  for select using (empresa_id = fn_empresa_actual());

create policy workflows_transiciones_lectura_empresa_pol on workflows_transiciones
  for select using (
    (select e.empresa_id from estados_ciclo_vida e where e.id = estado_origen_id) = fn_empresa_actual()
  );
