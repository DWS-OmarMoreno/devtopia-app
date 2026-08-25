-- =============================================================================
-- Devtopia ERP — Datos semilla (supabase/seed.sql)
-- Se ejecuta automáticamente con `supabase db reset`. Contiene únicamente datos
-- de arranque razonables (una empresa por defecto, monedas base, roles RBAC
-- pedidos explícitamente en el requerimiento, consecutivos de ejemplo tal como
-- los cita el enunciado, y el vínculo automático auth.users -> perfiles_usuario).
-- Ajustar razon_social/NIT reales antes de usar en producción.
--
-- Convención de IDs fijos en este archivo: uuid con el segmento final
-- "000000000" + 3 dígitos hexadecimales (0-9a-f) que identifican el registro,
-- para que sean legibles y deterministas en este script sin depender de
-- gen_random_uuid(). NUNCA usar caracteres fuera de 0-9a-f en un literal uuid.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Empresa por defecto
-- -----------------------------------------------------------------------------
insert into empresas (id, razon_social, tipo_identificacion, numero_identificacion, pais, predeterminada)
values ('00000000-0000-0000-0000-000000000001', 'Devtopia S.A.S.', 'NIT', '900000000-1', 'CO', true)
on conflict (id) do nothing;

-- -----------------------------------------------------------------------------
-- Monedas base
-- -----------------------------------------------------------------------------
insert into monedas (id, codigo_iso, nombre, simbolo, decimales)
values
  ('00000000-0000-0000-0000-000000000e01', 'COP', 'Peso Colombiano', '$', 2),
  ('00000000-0000-0000-0000-000000000e02', 'USD', 'Dólar Estadounidense', 'US$', 2)
on conflict (codigo_iso) do nothing;

update empresas set moneda_principal_id = '00000000-0000-0000-0000-000000000e01'
 where id = '00000000-0000-0000-0000-000000000001' and moneda_principal_id is null;

-- -----------------------------------------------------------------------------
-- Roles RBAC (los 4 pedidos explícitamente + rol de arranque sin privilegios)
-- -----------------------------------------------------------------------------
insert into roles (id, empresa_id, nombre, descripcion, es_rol_sistema)
values
  ('00000000-0000-0000-0000-000000000a00', '00000000-0000-0000-0000-000000000001', 'Pendiente de Asignación', 'Rol de arranque sin permisos, asignado automáticamente a todo usuario nuevo hasta que un Administrador lo reclasifique', true),
  ('00000000-0000-0000-0000-000000000a01', '00000000-0000-0000-0000-000000000001', 'Administrador', 'Acceso total a todos los módulos', true),
  ('00000000-0000-0000-0000-000000000a02', '00000000-0000-0000-0000-000000000001', 'PM', 'Gestión de proyectos, hitos, timesheets y recursos', true),
  ('00000000-0000-0000-0000-000000000a03', '00000000-0000-0000-0000-000000000001', 'Desarrollador', 'Registro de horas y consulta de sus proyectos asignados', true),
  ('00000000-0000-0000-0000-000000000a04', '00000000-0000-0000-0000-000000000001', 'Comercial', 'CRM, cotizaciones y cuentas de cliente', true)
on conflict (id) do nothing;

-- -----------------------------------------------------------------------------
-- Matriz de permisos por defecto (nivel de módulo, sin desglose de sublista;
-- las filas de sublista específicas se agregan solo donde el negocio pida un
-- comportamiento distinto al del módulo general).
-- -----------------------------------------------------------------------------
insert into permisos (rol_id, modulo, sublista, puede_leer, puede_crear, puede_editar, puede_eliminar, puede_aprobar, alcance)
values
  -- Administrador: control total
  ('00000000-0000-0000-0000-000000000a01', 'CONFIGURACION', null, true, true, true, true, true, 'TODOS'),
  ('00000000-0000-0000-0000-000000000a01', 'CRM_VENTAS', null, true, true, true, true, true, 'TODOS'),
  ('00000000-0000-0000-0000-000000000a01', 'PRODUCTOS_SERVICIOS', null, true, true, true, true, true, 'TODOS'),
  ('00000000-0000-0000-0000-000000000a01', 'CONTRATOS_PROYECTOS', null, true, true, true, true, true, 'TODOS'),
  ('00000000-0000-0000-0000-000000000a01', 'COMPRAS', null, true, true, true, true, true, 'TODOS'),
  ('00000000-0000-0000-0000-000000000a01', 'CIERRE_POSTVENTA', null, true, true, true, true, true, 'TODOS'),

  -- PM: contratos/proyectos completo, lectura de CRM y productos, sin RBAC/config
  ('00000000-0000-0000-0000-000000000a02', 'CONTRATOS_PROYECTOS', null, true, true, true, false, true, 'EQUIPO'),
  ('00000000-0000-0000-0000-000000000a02', 'CRM_VENTAS', null, true, false, false, false, false, 'TODOS'),
  ('00000000-0000-0000-0000-000000000a02', 'PRODUCTOS_SERVICIOS', null, true, false, false, false, false, 'TODOS'),
  ('00000000-0000-0000-0000-000000000a02', 'COMPRAS', null, true, true, true, false, true, 'EQUIPO'),
  ('00000000-0000-0000-0000-000000000a02', 'CIERRE_POSTVENTA', null, true, true, true, false, true, 'EQUIPO'),

  -- Desarrollador: solo timesheets/hitos de sus proyectos asignados
  ('00000000-0000-0000-0000-000000000a03', 'CONTRATOS_PROYECTOS', 'timesheets', true, true, true, false, false, 'PROPIOS'),
  ('00000000-0000-0000-0000-000000000a03', 'CONTRATOS_PROYECTOS', 'hitos_entregables', true, false, false, false, false, 'EQUIPO'),
  ('00000000-0000-0000-0000-000000000a03', 'CONTRATOS_PROYECTOS', 'asignacion_recursos', true, false, false, false, false, 'PROPIOS'),

  -- Comercial: CRM completo, lectura de catálogo
  ('00000000-0000-0000-0000-000000000a04', 'CRM_VENTAS', null, true, true, true, false, false, 'EQUIPO'),
  ('00000000-0000-0000-0000-000000000a04', 'PRODUCTOS_SERVICIOS', null, true, false, false, false, false, 'TODOS')
on conflict (rol_id, modulo, sublista) do nothing;

-- -----------------------------------------------------------------------------
-- Vínculo automático auth.users -> perfiles_usuario (rol de arranque sin privilegios)
-- -----------------------------------------------------------------------------
create or replace function fn_manejar_nuevo_usuario()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into perfiles_usuario (id, empresa_id, rol_id, nombre_completo)
  values (
    new.id,
    (select id from empresas where predeterminada limit 1),
    (select id from roles where nombre = 'Pendiente de Asignación' and empresa_id = (select id from empresas where predeterminada limit 1)),
    coalesce(new.raw_user_meta_data ->> 'nombre_completo', new.email)
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists trg_nuevo_usuario_perfil on auth.users;
create trigger trg_nuevo_usuario_perfil
  after insert on auth.users
  for each row execute function fn_manejar_nuevo_usuario();

comment on function fn_manejar_nuevo_usuario() is
  'Crea automáticamente el perfiles_usuario de todo usuario que se registra vía Supabase Auth (app/(auth)/register), con el rol sin privilegios "Pendiente de Asignación". Un Administrador debe reclasificarlo desde Configuración > Roles y Permisos.';

-- -----------------------------------------------------------------------------
-- Secuencias de numeración de ejemplo (formato tomado literalmente del requerimiento)
-- -----------------------------------------------------------------------------
insert into secuencias_numeracion (empresa_id, codigo_secuencia, tipo_documento, prefijo, longitud_ceros, incluir_anio, formato_anio, reinicio, numero_inicial)
values
  ('00000000-0000-0000-0000-000000000001', 'COTIZACION', 'COTIZACION', 'COT-', 4, true, 'YYYY', 'ANUAL', 1),
  ('00000000-0000-0000-0000-000000000001', 'CONTRATO', 'CONTRATO', 'CTR-', 4, true, 'YYYY', 'ANUAL', 1),
  ('00000000-0000-0000-0000-000000000001', 'PROYECTO_PRODUCTO', 'PROYECTO', 'PRJ-PROD-', 4, false, null, 'NUNCA', 1),
  ('00000000-0000-0000-0000-000000000001', 'PROYECTO_CONSULTORIA', 'PROYECTO', 'PRJ-CONS-', 4, false, null, 'NUNCA', 1),
  ('00000000-0000-0000-0000-000000000001', 'ENTREGABLE', 'ENTREGABLE', 'ENT-', 3, false, null, 'NUNCA', 1),
  ('00000000-0000-0000-0000-000000000001', 'PROVEEDOR', 'PROVEEDOR', 'PROV-', 4, false, null, 'NUNCA', 1),
  ('00000000-0000-0000-0000-000000000001', 'ORDEN_COSTO', 'ORDEN_COSTO', 'OC-', 4, true, 'YYYY', 'ANUAL', 1),
  ('00000000-0000-0000-0000-000000000001', 'CHANGE_REQUEST', 'CHANGE_REQUEST', 'CR-', 3, false, null, 'NUNCA', 1),
  ('00000000-0000-0000-0000-000000000001', 'OPORTUNIDAD', 'OPORTUNIDAD', 'OPP-', 4, true, 'YYYY', 'ANUAL', 1)
on conflict (empresa_id, codigo_secuencia) do nothing;
-- Ejemplo resultante: fn_generar_consecutivo('COTIZACION', empresa_id) -> 'COT-2026-0001'
--                      fn_generar_consecutivo('PROYECTO_PRODUCTO', empresa_id) -> 'PRJ-PROD-0042' (tras 42 llamadas)

-- -----------------------------------------------------------------------------
-- Estados de ciclo de vida por defecto (prefijos: c1x=COTIZACION, c2x=CONTRATO,
-- c3x=PROYECTO, c4x=CHANGE_REQUEST, c5x=ORDEN_COSTO)
-- -----------------------------------------------------------------------------
insert into estados_ciclo_vida (id, empresa_id, entidad_aplicable, codigo_estado, etiqueta, orden, es_estado_inicial, es_estado_final)
values
  ('00000000-0000-0000-0000-000000000c10', '00000000-0000-0000-0000-000000000001', 'COTIZACION', 'BORRADOR', 'Borrador', 1, true, false),
  ('00000000-0000-0000-0000-000000000c11', '00000000-0000-0000-0000-000000000001', 'COTIZACION', 'EN_REVISION', 'En revisión interna', 2, false, false),
  ('00000000-0000-0000-0000-000000000c12', '00000000-0000-0000-0000-000000000001', 'COTIZACION', 'ENVIADA', 'Enviada al cliente', 3, false, false),
  ('00000000-0000-0000-0000-000000000c13', '00000000-0000-0000-0000-000000000001', 'COTIZACION', 'ACEPTADA', 'Aceptada', 4, false, false),
  ('00000000-0000-0000-0000-000000000c14', '00000000-0000-0000-0000-000000000001', 'COTIZACION', 'RECHAZADA', 'Rechazada', 5, false, true),
  ('00000000-0000-0000-0000-000000000c15', '00000000-0000-0000-0000-000000000001', 'COTIZACION', 'VENCIDA', 'Vencida', 6, false, true),
  ('00000000-0000-0000-0000-000000000c16', '00000000-0000-0000-0000-000000000001', 'COTIZACION', 'CONVERTIDA', 'Convertida a proyecto', 7, false, true),

  ('00000000-0000-0000-0000-000000000c20', '00000000-0000-0000-0000-000000000001', 'CONTRATO', 'BORRADOR', 'Borrador', 1, true, false),
  ('00000000-0000-0000-0000-000000000c21', '00000000-0000-0000-0000-000000000001', 'CONTRATO', 'EN_REVISION', 'En revisión legal', 2, false, false),
  ('00000000-0000-0000-0000-000000000c22', '00000000-0000-0000-0000-000000000001', 'CONTRATO', 'ACTIVO', 'Activo', 3, false, false),
  ('00000000-0000-0000-0000-000000000c23', '00000000-0000-0000-0000-000000000001', 'CONTRATO', 'SUSPENDIDO', 'Suspendido', 4, false, false),
  ('00000000-0000-0000-0000-000000000c24', '00000000-0000-0000-0000-000000000001', 'CONTRATO', 'FINALIZADO', 'Finalizado', 5, false, true),
  ('00000000-0000-0000-0000-000000000c25', '00000000-0000-0000-0000-000000000001', 'CONTRATO', 'CANCELADO', 'Cancelado', 6, false, true),

  ('00000000-0000-0000-0000-000000000c30', '00000000-0000-0000-0000-000000000001', 'PROYECTO', 'PLANIFICACION', 'Planificación', 1, true, false),
  ('00000000-0000-0000-0000-000000000c31', '00000000-0000-0000-0000-000000000001', 'PROYECTO', 'EN_EJECUCION', 'En ejecución', 2, false, false),
  ('00000000-0000-0000-0000-000000000c32', '00000000-0000-0000-0000-000000000001', 'PROYECTO', 'EN_PAUSA', 'En pausa', 3, false, false),
  ('00000000-0000-0000-0000-000000000c33', '00000000-0000-0000-0000-000000000001', 'PROYECTO', 'CERRADO', 'Cerrado', 4, false, true),
  ('00000000-0000-0000-0000-000000000c34', '00000000-0000-0000-0000-000000000001', 'PROYECTO', 'CANCELADO', 'Cancelado', 5, false, true),

  ('00000000-0000-0000-0000-000000000c40', '00000000-0000-0000-0000-000000000001', 'CHANGE_REQUEST', 'BORRADOR', 'Borrador', 1, true, false),
  ('00000000-0000-0000-0000-000000000c41', '00000000-0000-0000-0000-000000000001', 'CHANGE_REQUEST', 'EN_EVALUACION', 'En evaluación', 2, false, false),
  ('00000000-0000-0000-0000-000000000c42', '00000000-0000-0000-0000-000000000001', 'CHANGE_REQUEST', 'APROBADO_CLIENTE', 'Aprobado por el cliente', 3, false, false),
  ('00000000-0000-0000-0000-000000000c43', '00000000-0000-0000-0000-000000000001', 'CHANGE_REQUEST', 'RECHAZADO', 'Rechazado', 4, false, true),
  ('00000000-0000-0000-0000-000000000c44', '00000000-0000-0000-0000-000000000001', 'CHANGE_REQUEST', 'IMPLEMENTADO', 'Implementado', 5, false, true),

  ('00000000-0000-0000-0000-000000000c50', '00000000-0000-0000-0000-000000000001', 'ORDEN_COSTO', 'BORRADOR', 'Borrador', 1, true, false),
  ('00000000-0000-0000-0000-000000000c51', '00000000-0000-0000-0000-000000000001', 'ORDEN_COSTO', 'APROBADA', 'Aprobada', 2, false, false),
  ('00000000-0000-0000-0000-000000000c52', '00000000-0000-0000-0000-000000000001', 'ORDEN_COSTO', 'EN_EJECUCION', 'En ejecución', 3, false, false),
  ('00000000-0000-0000-0000-000000000c53', '00000000-0000-0000-0000-000000000001', 'ORDEN_COSTO', 'FACTURADA', 'Facturada', 4, false, false),
  ('00000000-0000-0000-0000-000000000c54', '00000000-0000-0000-0000-000000000001', 'ORDEN_COSTO', 'PAGADA', 'Pagada', 5, false, true),
  ('00000000-0000-0000-0000-000000000c55', '00000000-0000-0000-0000-000000000001', 'ORDEN_COSTO', 'CANCELADA', 'Cancelada', 6, false, true)
on conflict (empresa_id, entidad_aplicable, codigo_estado) do nothing;

insert into workflows_transiciones (entidad_aplicable, estado_origen_id, estado_destino_id, requiere_comentario)
values
  ('COTIZACION', '00000000-0000-0000-0000-000000000c10', '00000000-0000-0000-0000-000000000c11', false),
  ('COTIZACION', '00000000-0000-0000-0000-000000000c11', '00000000-0000-0000-0000-000000000c12', false),
  ('COTIZACION', '00000000-0000-0000-0000-000000000c12', '00000000-0000-0000-0000-000000000c13', false),
  ('COTIZACION', '00000000-0000-0000-0000-000000000c12', '00000000-0000-0000-0000-000000000c14', true),
  ('COTIZACION', '00000000-0000-0000-0000-000000000c12', '00000000-0000-0000-0000-000000000c15', false),
  ('COTIZACION', '00000000-0000-0000-0000-000000000c13', '00000000-0000-0000-0000-000000000c16', false),

  ('CONTRATO', '00000000-0000-0000-0000-000000000c20', '00000000-0000-0000-0000-000000000c21', false),
  ('CONTRATO', '00000000-0000-0000-0000-000000000c21', '00000000-0000-0000-0000-000000000c22', false),
  ('CONTRATO', '00000000-0000-0000-0000-000000000c22', '00000000-0000-0000-0000-000000000c23', true),
  ('CONTRATO', '00000000-0000-0000-0000-000000000c23', '00000000-0000-0000-0000-000000000c22', false),
  ('CONTRATO', '00000000-0000-0000-0000-000000000c22', '00000000-0000-0000-0000-000000000c24', false),
  ('CONTRATO', '00000000-0000-0000-0000-000000000c20', '00000000-0000-0000-0000-000000000c25', true),

  ('PROYECTO', '00000000-0000-0000-0000-000000000c30', '00000000-0000-0000-0000-000000000c31', false),
  ('PROYECTO', '00000000-0000-0000-0000-000000000c31', '00000000-0000-0000-0000-000000000c32', true),
  ('PROYECTO', '00000000-0000-0000-0000-000000000c32', '00000000-0000-0000-0000-000000000c31', false),
  ('PROYECTO', '00000000-0000-0000-0000-000000000c31', '00000000-0000-0000-0000-000000000c33', false),
  ('PROYECTO', '00000000-0000-0000-0000-000000000c30', '00000000-0000-0000-0000-000000000c34', true),

  ('CHANGE_REQUEST', '00000000-0000-0000-0000-000000000c40', '00000000-0000-0000-0000-000000000c41', false),
  ('CHANGE_REQUEST', '00000000-0000-0000-0000-000000000c41', '00000000-0000-0000-0000-000000000c42', false),
  ('CHANGE_REQUEST', '00000000-0000-0000-0000-000000000c41', '00000000-0000-0000-0000-000000000c43', true),
  ('CHANGE_REQUEST', '00000000-0000-0000-0000-000000000c42', '00000000-0000-0000-0000-000000000c44', false),

  ('ORDEN_COSTO', '00000000-0000-0000-0000-000000000c50', '00000000-0000-0000-0000-000000000c51', false),
  ('ORDEN_COSTO', '00000000-0000-0000-0000-000000000c51', '00000000-0000-0000-0000-000000000c52', false),
  ('ORDEN_COSTO', '00000000-0000-0000-0000-000000000c52', '00000000-0000-0000-0000-000000000c53', false),
  ('ORDEN_COSTO', '00000000-0000-0000-0000-000000000c53', '00000000-0000-0000-0000-000000000c54', false),
  ('ORDEN_COSTO', '00000000-0000-0000-0000-000000000c50', '00000000-0000-0000-0000-000000000c55', true)
on conflict (estado_origen_id, estado_destino_id) do nothing;

-- -----------------------------------------------------------------------------
-- Catálogos configurables de ejemplo
-- -----------------------------------------------------------------------------
insert into catalogos_valores (empresa_id, catalogo, codigo, etiqueta, orden)
values
  ('00000000-0000-0000-0000-000000000001', 'MOTIVO_PERDIDA_OPORTUNIDAD', 'PRECIO', 'Precio', 1),
  ('00000000-0000-0000-0000-000000000001', 'MOTIVO_PERDIDA_OPORTUNIDAD', 'COMPETENCIA', 'Ganó la competencia', 2),
  ('00000000-0000-0000-0000-000000000001', 'MOTIVO_PERDIDA_OPORTUNIDAD', 'TIEMPO', 'Tiempo de entrega', 3),
  ('00000000-0000-0000-0000-000000000001', 'MOTIVO_PERDIDA_OPORTUNIDAD', 'PRESUPUESTO', 'Sin presupuesto', 4),
  ('00000000-0000-0000-0000-000000000001', 'MOTIVO_PERDIDA_OPORTUNIDAD', 'SIN_DECISION', 'Cliente no decidió', 5),
  ('00000000-0000-0000-0000-000000000001', 'MOTIVO_PERDIDA_OPORTUNIDAD', 'OTRO', 'Otro', 6),

  ('00000000-0000-0000-0000-000000000001', 'CATEGORIA_PROVEEDOR', 'DESARROLLO', 'Desarrollo de software', 1),
  ('00000000-0000-0000-0000-000000000001', 'CATEGORIA_PROVEEDOR', 'INFRAESTRUCTURA', 'Infraestructura / Cloud', 2),
  ('00000000-0000-0000-0000-000000000001', 'CATEGORIA_PROVEEDOR', 'DISENO', 'Diseño', 3),
  ('00000000-0000-0000-0000-000000000001', 'CATEGORIA_PROVEEDOR', 'CONSULTORIA', 'Consultoría especializada', 4),

  ('00000000-0000-0000-0000-000000000001', 'CATEGORIA_HORA_NO_FACTURABLE', 'INTERNO', 'Trabajo interno', 1),
  ('00000000-0000-0000-0000-000000000001', 'CATEGORIA_HORA_NO_FACTURABLE', 'GARANTIA', 'Garantía', 2),
  ('00000000-0000-0000-0000-000000000001', 'CATEGORIA_HORA_NO_FACTURABLE', 'CAPACITACION', 'Capacitación', 3),
  ('00000000-0000-0000-0000-000000000001', 'CATEGORIA_HORA_NO_FACTURABLE', 'ADMINISTRATIVO', 'Administrativo', 4),
  ('00000000-0000-0000-0000-000000000001', 'CATEGORIA_HORA_NO_FACTURABLE', 'PREVENTA', 'Preventa', 5)
on conflict (empresa_id, catalogo, codigo) do nothing;
