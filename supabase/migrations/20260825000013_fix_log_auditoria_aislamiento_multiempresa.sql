-- =============================================================================
-- Devtopia ERP — Etapa 13 (fix de seguridad, no un "bootstrap" como los
-- anteriores): log_auditoria no tenía NINGÚN aislamiento multiempresa.
--
-- Detectado al construir el visor de Auditoría (Configuración General):
-- `log_auditoria` no tiene columna `empresa_id`, y su única política RLS de
-- SELECT (20260825000008_rls_baseline.sql) es:
--
--   create policy log_auditoria_select_pol on log_auditoria
--     for select using (fn_tiene_permiso('CONFIGURACION', 'leer', 'auditoria'));
--
-- Esa condición SOLO verifica que el usuario tenga el permiso — no filtra
-- filas por empresa en absoluto. Verificado en Postgres local: un
-- Administrador de la empresa "Devtopia S.A.S." puede leer la fila de
-- log_auditoria del INSERT de la empresa "Otra Empresa SAS" (otro tenant),
-- incluidos los valores JSON completos del registro (`valores_anteriores`/
-- `valores_nuevos`), que pueden contener datos de negocio sensibles de
-- CUALQUIER empresa en la plataforma. A diferencia de los incidentes 009-012
-- (que bloqueaban a un usuario leer SUS PROPIOS datos), este es una fuga real
-- de datos entre empresas distintas — mucho más serio.
--
-- CAUSA RAÍZ: `log_auditoria` es una tabla polimórfica (`tabla_afectada` +
-- `registro_id` apuntan a cualquiera de 19 tablas distintas auditadas por
-- `fn_audit_row()`), y esa función nunca calculó ni guardó a qué empresa
-- pertenecía cada fila auditada — un descuido en el diseño original de la
-- Etapa de Configuración General, no algo introducido después.
--
-- SOLUCIÓN:
--   1. Se agrega la columna `empresa_id` (nullable) a `log_auditoria`.
--   2. `fn_audit_row()` ahora calcula `empresa_id` según la tabla auditada:
--        - Si la fila auditada tiene columna `empresa_id` propia (10 de las
--          19 tablas con el trigger hoy: cuentas_clientes, oportunidades,
--          cotizaciones, roles, secuencias_numeracion, catalogo_servicios,
--          proveedores, proyectos, contratos, integraciones_config), se usa
--          directamente `to_jsonb(new/old)->>'empresa_id'`.
--        - Caso especial `empresas`: la propia fila ES la empresa, así que
--          `empresa_id := new.id` (o `old.id` en DELETE).
--        - Caso especial `permisos`: no tiene `empresa_id` propio, se
--          resuelve vía `roles.empresa_id` a partir de `rol_id`.
--        - Para las 7 tablas restantes con el trigger hoy pero SIN forma
--          directa de resolver la empresa desde la fila misma
--          (hitos_entregables, timesheets, change_requests,
--          ordenes_costo_subcontratacion, actas_cierre,
--          facturas_referencia_externa, casos_soporte_referencia_externa —
--          todas de módulos que todavía no tienen UI construida: Contratos y
--          Proyectos, Compras, Cierre y Postventa), `empresa_id` queda NULL
--          por ahora. Es una limitación conocida y documentada, no un
--          descuido: no hay pantalla que hoy dependa de auditar esas tablas
--          correctamente, y dejar la fila sin empresa_id es SEGURO (una fila
--          con empresa_id null nunca hace match con `fn_empresa_actual()`,
--          así que queda invisible para todos en vez de filtrarse a la
--          empresa equivocada). Revisar y completar la resolución cuando se
--          construya cada uno de esos módulos.
--   3. Se reemplaza `log_auditoria_select_pol` para exigir también
--      `empresa_id = fn_empresa_actual()`.
--   4. Se hace un backfill best-effort de las filas ya existentes, usando el
--      propio JSON guardado en cada fila (no hace falta reconsultar las
--      tablas originales): para las 10 tablas con empresa_id directo, se lee
--      `valores_nuevos->>'empresa_id'` (o `valores_anteriores` si es DELETE);
--      para `empresas`, `empresa_id := registro_id`; para `permisos`, se
--      resuelve el `rol_id` guardado contra `roles.empresa_id` actual (mejor
--      esfuerzo — si el rol fue borrado, queda null). El resto queda null,
--      igual que las filas nuevas de esas 7 tablas.
--
-- ROLLBACK:
--   drop policy if exists log_auditoria_select_pol on log_auditoria;
--   create policy log_auditoria_select_pol on log_auditoria
--     for select using (fn_tiene_permiso('CONFIGURACION', 'leer', 'auditoria'));
--   -- (fn_audit_row queda en su versión nueva; revertir el CREATE OR REPLACE
--   -- de más abajo a la definición original de 20260825000002 si hace falta
--   -- deshacer también el cálculo de empresa_id)
--   alter table log_auditoria drop column if exists empresa_id;
-- =============================================================================

alter table log_auditoria add column if not exists empresa_id uuid;

create or replace function fn_audit_row()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_old jsonb;
  v_new jsonb;
  v_campos text[];
  v_empresa_id uuid;
  v_tablas_con_empresa_id constant text[] := array[
    'cuentas_clientes', 'oportunidades', 'cotizaciones', 'roles',
    'secuencias_numeracion', 'catalogo_servicios', 'proveedores',
    'proyectos', 'contratos', 'integraciones_config'
  ];
begin
  if tg_op = 'INSERT' then
    v_new := to_jsonb(new);
  elsif tg_op = 'UPDATE' then
    v_old := to_jsonb(old);
    v_new := to_jsonb(new);
  elsif tg_op = 'DELETE' then
    v_old := to_jsonb(old);
  end if;

  if tg_table_name = 'empresas' then
    v_empresa_id := coalesce((v_new->>'id')::uuid, (v_old->>'id')::uuid);
  elsif tg_table_name = 'permisos' then
    select r.empresa_id into v_empresa_id
      from roles r
     where r.id = coalesce((v_new->>'rol_id')::uuid, (v_old->>'rol_id')::uuid);
  elsif tg_table_name = any (v_tablas_con_empresa_id) then
    v_empresa_id := coalesce((v_new->>'empresa_id')::uuid, (v_old->>'empresa_id')::uuid);
  else
    -- Tabla auditada sin forma directa de resolver la empresa todavía (ver
    -- comentario de cabecera) — se guarda sin empresa_id a propósito.
    v_empresa_id := null;
  end if;

  if tg_op = 'INSERT' then
    insert into log_auditoria (tabla_afectada, registro_id, operacion, usuario_id, empresa_id, valores_nuevos)
    values (tg_table_name, new.id, 'INSERT', auth.uid(), v_empresa_id, v_new);
    return new;
  elsif tg_op = 'UPDATE' then
    select array_agg(key) into v_campos
      from jsonb_each(v_new) e
     where v_old -> e.key is distinct from e.value;
    insert into log_auditoria (tabla_afectada, registro_id, operacion, usuario_id, empresa_id, valores_anteriores, valores_nuevos, campos_modificados)
    values (tg_table_name, new.id, 'UPDATE', auth.uid(), v_empresa_id, v_old, v_new, v_campos);
    return new;
  elsif tg_op = 'DELETE' then
    insert into log_auditoria (tabla_afectada, registro_id, operacion, usuario_id, empresa_id, valores_anteriores)
    values (tg_table_name, old.id, 'DELETE', auth.uid(), v_empresa_id, v_old);
    return old;
  end if;
  return null;
end;
$$;

-- Backfill best-effort de filas existentes (ver punto 4 del comentario de cabecera).
update log_auditoria
   set empresa_id = coalesce((valores_nuevos->>'empresa_id')::uuid, (valores_anteriores->>'empresa_id')::uuid)
 where empresa_id is null
   and tabla_afectada in (
     'cuentas_clientes', 'oportunidades', 'cotizaciones', 'roles',
     'secuencias_numeracion', 'catalogo_servicios', 'proveedores',
     'proyectos', 'contratos', 'integraciones_config'
   );

update log_auditoria
   set empresa_id = registro_id
 where empresa_id is null
   and tabla_afectada = 'empresas';

update log_auditoria la
   set empresa_id = r.empresa_id
  from roles r
 where la.empresa_id is null
   and la.tabla_afectada = 'permisos'
   and r.id = coalesce((la.valores_nuevos->>'rol_id')::uuid, (la.valores_anteriores->>'rol_id')::uuid);

drop policy if exists log_auditoria_select_pol on log_auditoria;

create policy log_auditoria_select_pol on log_auditoria
  for select using (
    empresa_id = fn_empresa_actual()
    and fn_tiene_permiso('CONFIGURACION', 'leer', 'auditoria')
  );
