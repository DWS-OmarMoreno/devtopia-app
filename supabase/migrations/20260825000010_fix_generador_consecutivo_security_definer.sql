-- =============================================================================
-- Devtopia ERP — Etapa 10 (fix): fn_generar_consecutivo() como SECURITY DEFINER
-- Corrige un segundo problema de "bootstrap" de RLS, detectado al construir el
-- módulo CRM y Ventas (creación de `oportunidades.codigo`, que llama a esta
-- función): tal como quedó definida en 20260825000002_configuracion_general.sql,
-- la función corre con los privilegios de quien la invoca (SECURITY INVOKER,
-- el valor por defecto) y hace un `select ... for update` + `update` directo
-- sobre `secuencias_numeracion`. Esa tabla está protegida por RLS bajo el
-- permiso CONFIGURACION/editar (ver fn_crear_politicas_rls en
-- 20260825000008_rls_baseline.sql) — y en la matriz sembrada (seed.sql) SOLO
-- Administrador tiene una fila de permisos para CONFIGURACION. Cualquier otro
-- rol (Comercial, PM, Desarrollador) recibía el error "Secuencia % no
-- configurada" al crear una oportunidad/cotización/contrato/etc., no porque
-- la secuencia no existiera, sino porque RLS bloqueaba silenciosamente el
-- `select ... for update` dentro de la función. Ver
-- docs/data-model/bitacora-incidentes.md.
--
-- Mismo patrón ya usado en fn_empresa_actual() y fn_tiene_permiso()
-- (20260825000008_rls_baseline.sql): SECURITY DEFINER + search_path fijo.
-- Como SECURITY DEFINER bypasea RLS, se agrega una verificación explícita de
-- que `p_empresa_id` sea la empresa del usuario autenticado — sin ese chequeo,
-- cualquier usuario autenticado podría avanzar el consecutivo de OTRA empresa
-- pasando un `p_empresa_id` ajeno (fuga/interferencia entre tenants). Esta
-- función nunca se debe volver a SECURITY INVOKER sin restaurar ese chequeo
-- por otra vía.
--
-- Firma sin cambios (mismo `create or replace function`, no requiere DROP):
-- ningún llamador existente necesita cambios.
--
-- ROLLBACK (deja la función funcional solo para Administrador, como antes):
--   -- volver a ejecutar el cuerpo original de fn_generar_consecutivo tal
--   -- como está en 20260825000002_configuracion_general.sql (sin
--   -- `security definer`, sin `set search_path` y sin el chequeo de empresa).
-- =============================================================================

create or replace function fn_generar_consecutivo(p_codigo_secuencia text, p_empresa_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row secuencias_numeracion%rowtype;
  v_periodo_actual text;
  v_texto_anio text := '';
  v_texto_mes text := '';
  v_numero text;
  v_resultado text;
begin
  if p_empresa_id is distinct from fn_empresa_actual() then
    raise exception 'No tienes permiso para generar consecutivos de otra empresa.';
  end if;

  select * into v_row
  from secuencias_numeracion
  where codigo_secuencia = p_codigo_secuencia
    and empresa_id = p_empresa_id
    and activo
  for update;

  if not found then
    raise exception 'Secuencia % no configurada para la empresa %', p_codigo_secuencia, p_empresa_id;
  end if;

  -- Reinicio automático según periodicidad configurada
  v_periodo_actual := case v_row.reinicio
    when 'ANUAL' then to_char(now(), 'YYYY')
    when 'MENSUAL' then to_char(now(), 'YYYY-MM')
    else null
  end;

  if v_row.reinicio <> 'NUNCA' and (
       v_row.fecha_ultimo_reinicio is null
       or (v_row.reinicio = 'ANUAL' and to_char(v_row.fecha_ultimo_reinicio,'YYYY') <> v_periodo_actual)
       or (v_row.reinicio = 'MENSUAL' and to_char(v_row.fecha_ultimo_reinicio,'YYYY-MM') <> v_periodo_actual)
     ) then
    v_row.numero_actual := v_row.numero_inicial - 1;
    v_row.fecha_ultimo_reinicio := now()::date;
  end if;

  v_row.numero_actual := v_row.numero_actual + 1;

  if v_row.incluir_anio then
    v_texto_anio := to_char(now(), coalesce(v_row.formato_anio,'YYYY')) || v_row.separador;
  end if;
  if v_row.incluir_mes then
    v_texto_mes := to_char(now(), coalesce(v_row.formato_mes,'MM')) || v_row.separador;
  end if;

  v_numero := lpad(v_row.numero_actual::text, v_row.longitud_ceros, '0');
  v_resultado := coalesce(v_row.prefijo,'') || v_texto_anio || v_texto_mes || v_numero || coalesce(v_row.sufijo,'');

  update secuencias_numeracion
     set numero_actual = v_row.numero_actual,
         fecha_ultimo_reinicio = v_row.fecha_ultimo_reinicio,
         updated_at = now()
   where id = v_row.id;

  return v_resultado;
end;
$$;

comment on function fn_generar_consecutivo(text, uuid) is
  'Genera de forma atómica (SELECT ... FOR UPDATE) el siguiente consecutivo formateado para un codigo_secuencia dado. Llamar siempre desde la capa de aplicación al crear el registro, nunca precalcular en el cliente. SECURITY DEFINER porque cualquier rol de negocio (no solo Administrador) debe poder generar consecutivos al crear sus documentos, aunque no tenga permiso de editar Configuración; valida internamente que p_empresa_id sea la propia.';
