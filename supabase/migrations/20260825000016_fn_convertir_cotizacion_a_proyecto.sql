-- =============================================================================
-- Devtopia ERP — Etapa 16: conversión atómica de una cotización ACEPTADA en
-- un contrato + proyecto (checkpoint 5a de Contratos y Proyectos).
--
-- CONTEXTO: `cotizaciones.estado_id` puede transicionar de ACEPTADA a
-- CONVERTIDA (workflows_transiciones ya lo permite desde seed.sql), pero
-- hasta ahora `cambiarEstadoCotizacion()` bloqueaba esa transición
-- explícitamente en código porque el módulo Contratos y Proyectos no existía
-- — marcar una cotización CONVERTIDA sin crear el proyecto real habría sido
-- un dato falso. `cotizaciones.proyecto_generado_id` apunta a `proyectos`
-- (no a `contratos`), y `proyectos.contrato_id` es obligatorio — así que
-- "convertir a proyecto" en este esquema requiere crear un contrato Y un
-- proyecto en la misma operación, no solo el proyecto.
--
-- Por qué una función `SECURITY DEFINER` y no dos Server Actions
-- encadenadas: crear el contrato, crear el proyecto y actualizar la
-- cotización son 3 escrituras relacionadas que deben ser atómicas (si algo
-- falla a mitad de camino, no debe quedar un contrato huérfano sin proyecto,
-- ni una cotización marcada CONVERTIDA sin backing real). El cliente de
-- Supabase desde Next.js no expone transacciones multi-statement, así que
-- se envuelve todo en una función de Postgres — mismo patrón ya usado para
-- `fn_generar_consecutivo()`. Los chequeos de permiso (tres módulos/acciones
-- distintos) se hacen explícitamente dentro de la función porque abarca más
-- de una tabla/política RLS.
--
-- VERIFICACIÓN: probado en Postgres local (devtopia_test) — conversión
-- exitosa de una cotización ACEPTADA de prueba: crea el contrato con
-- numero_contrato correlativo, el proyecto con numero_proyecto correlativo
-- según la secuencia elegida, dejando cotizaciones.estado_id en CONVERTIDA,
-- proyecto_generado_id apuntando al proyecto nuevo, fecha_conversion y
-- convertido_por_usuario_id poblados, y una fila en workflows_historial.
-- También se probó que falla con un mensaje claro si la cotización no está
-- en ACEPTADA, y que un usuario sin fn_tiene_permiso('CONTRATOS_PROYECTOS',
-- 'crear', 'proyectos') no puede ejecutarla aunque tenga permiso sobre
-- cotizaciones.
--
-- ROLLBACK: drop function if exists fn_convertir_cotizacion_a_proyecto(
--   uuid, text, date, uuid, text, smallint, uuid, text, text, text, date, date);
-- =============================================================================

create or replace function fn_convertir_cotizacion_a_proyecto(
  p_cotizacion_id uuid,
  p_tipo_contrato text,
  p_fecha_inicio_contrato date,
  p_contacto_firmante_id uuid,
  p_forma_pago text,
  p_plazo_pago_dias smallint,
  p_pm_id uuid,
  p_nombre_proyecto text,
  p_tipo_proyecto text,
  p_codigo_secuencia_proyecto text,
  p_fecha_inicio_planeada date,
  p_fecha_fin_planeada date
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cotizacion cotizaciones%rowtype;
  v_empresa_id uuid;
  v_estado_contrato_inicial uuid;
  v_estado_proyecto_inicial uuid;
  v_estado_convertida uuid;
  v_contrato_id uuid;
  v_proyecto_id uuid;
  v_numero_contrato text;
  v_numero_proyecto text;
begin
  select * into v_cotizacion from cotizaciones where id = p_cotizacion_id;
  if not found then
    raise exception 'La cotización no existe.';
  end if;

  v_empresa_id := v_cotizacion.empresa_id;

  if v_empresa_id <> fn_empresa_actual() then
    raise exception 'No tienes acceso a esta cotización.';
  end if;

  if not fn_tiene_permiso('CRM_VENTAS', 'editar', 'cotizaciones') then
    raise exception 'No tienes permiso para convertir esta cotización.';
  end if;
  if not fn_tiene_permiso('CONTRATOS_PROYECTOS', 'crear', 'contratos') then
    raise exception 'No tienes permiso para crear contratos.';
  end if;
  if not fn_tiene_permiso('CONTRATOS_PROYECTOS', 'crear', 'proyectos') then
    raise exception 'No tienes permiso para crear proyectos.';
  end if;

  if not exists (
    select 1 from estados_ciclo_vida e
    where e.id = v_cotizacion.estado_id
      and e.codigo_estado = 'ACEPTADA'
      and e.entidad_aplicable = 'COTIZACION'
  ) then
    raise exception 'Solo se puede convertir una cotización que esté en estado Aceptada.';
  end if;

  select id into v_estado_contrato_inicial from estados_ciclo_vida
    where empresa_id = v_empresa_id and entidad_aplicable = 'CONTRATO' and es_estado_inicial
    limit 1;
  if v_estado_contrato_inicial is null then
    raise exception 'No hay un estado inicial configurado para Contratos (estados_ciclo_vida).';
  end if;

  select id into v_estado_proyecto_inicial from estados_ciclo_vida
    where empresa_id = v_empresa_id and entidad_aplicable = 'PROYECTO' and es_estado_inicial
    limit 1;
  if v_estado_proyecto_inicial is null then
    raise exception 'No hay un estado inicial configurado para Proyectos (estados_ciclo_vida).';
  end if;

  select id into v_estado_convertida from estados_ciclo_vida
    where empresa_id = v_empresa_id and entidad_aplicable = 'COTIZACION' and codigo_estado = 'CONVERTIDA'
    limit 1;
  if v_estado_convertida is null then
    raise exception 'No existe el estado CONVERTIDA para Cotizaciones (estados_ciclo_vida).';
  end if;

  v_numero_contrato := fn_generar_consecutivo('CONTRATO', v_empresa_id);

  insert into contratos (
    empresa_id, numero_contrato, cotizacion_origen_id, cuenta_id, contacto_firmante_id,
    tipo_contrato, estado_id, fecha_inicio, moneda_id, valor_total_contratado,
    forma_pago, plazo_pago_dias, responsable_comercial_id
  ) values (
    v_empresa_id, v_numero_contrato, p_cotizacion_id, v_cotizacion.cuenta_id, p_contacto_firmante_id,
    p_tipo_contrato, v_estado_contrato_inicial, p_fecha_inicio_contrato, v_cotizacion.moneda_id, v_cotizacion.total,
    p_forma_pago, p_plazo_pago_dias, v_cotizacion.responsable_comercial_id
  )
  returning id into v_contrato_id;

  v_numero_proyecto := fn_generar_consecutivo(p_codigo_secuencia_proyecto, v_empresa_id);

  insert into proyectos (
    empresa_id, numero_proyecto, contrato_id, nombre_proyecto, tipo_proyecto, pm_id, estado_id,
    fecha_inicio_planeada, fecha_fin_planeada, presupuesto_ingreso_total
  ) values (
    v_empresa_id, v_numero_proyecto, v_contrato_id, p_nombre_proyecto, p_tipo_proyecto, p_pm_id, v_estado_proyecto_inicial,
    p_fecha_inicio_planeada, p_fecha_fin_planeada, v_cotizacion.total
  )
  returning id into v_proyecto_id;

  update cotizaciones set
    estado_id = v_estado_convertida,
    proyecto_generado_id = v_proyecto_id,
    fecha_conversion = now(),
    convertido_por_usuario_id = auth.uid()
  where id = p_cotizacion_id;

  insert into workflows_historial (entidad_tipo, entidad_id, estado_anterior, estado_nuevo, usuario_id, comentario)
  values (
    'COTIZACION', p_cotizacion_id, 'ACEPTADA', 'CONVERTIDA', auth.uid(),
    'Conversión automática a contrato ' || v_numero_contrato || ' y proyecto ' || v_numero_proyecto || '.'
  );

  return v_proyecto_id;
end;
$$;

comment on function fn_convertir_cotizacion_a_proyecto(uuid, text, date, uuid, text, smallint, uuid, text, text, text, date, date) is
  'Crea atómicamente un contrato + proyecto a partir de una cotización ACEPTADA, y marca la cotización como CONVERTIDA. SECURITY DEFINER porque abarca 3 tablas/políticas RLS distintas en una sola operación transaccional.';

grant execute on function fn_convertir_cotizacion_a_proyecto(uuid, text, date, uuid, text, smallint, uuid, text, text, text, date, date) to authenticated;
