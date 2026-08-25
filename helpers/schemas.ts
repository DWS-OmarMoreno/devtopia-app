import { object, string, number, boolean } from "yup";

export const LoginSchema = object().shape({
  email: string()
    .email("This field must be an email")
    .required("Email is required"),
  password: string().required("Password is required"),
});

export const InvitarUsuarioSchema = object().shape({
  nombre_completo: string().required("El nombre es obligatorio"),
  email: string()
    .email("Debe ser un correo válido")
    .required("El correo es obligatorio"),
  rol_id: string().required("Debes elegir un rol"),
});

// --- Configuración General -------------------------------------------------

export const RolSchema = object().shape({
  nombre: string().required("El nombre del rol es obligatorio"),
  descripcion: string().nullable(),
});

export const ParametrosGlobalesSchema = object().shape({
  razon_social: string().required("La razón social es obligatoria"),
  nombre_comercial: string().nullable(),
  tipo_identificacion: string().required("Debes elegir un tipo de identificación"),
  numero_identificacion: string().required("El número de identificación es obligatorio"),
  digito_verificacion: string().nullable(),
  direccion: string().nullable(),
  ciudad: string().nullable(),
  pais: string().required("El país es obligatorio"),
  telefono: string().nullable(),
  email_corporativo: string().email("Debe ser un correo válido").nullable(),
  sitio_web: string().nullable(),
  moneda_principal_id: string().nullable(),
  zona_horaria: string().required("La zona horaria es obligatoria"),
  idioma_por_defecto: string().required(),
  formato_fecha: string().required("El formato de fecha es obligatorio"),
  formato_hora: string().required("El formato de hora es obligatorio"),
  separador_miles: string().required(),
  separador_decimal: string().required(),
  primer_dia_semana: number().typeError("Debe ser un número").min(0).max(6).required(),
  logo_url_claro: string().nullable(),
  logo_url_oscuro: string().nullable(),
  pie_pagina_documentos: string().nullable(),
});

export const SecuenciaSchema = object().shape({
  codigo_secuencia: string().required("El código de secuencia es obligatorio"),
  tipo_documento: string().required("El tipo de documento es obligatorio"),
  prefijo: string().nullable(),
  sufijo: string().nullable(),
  longitud_ceros: number()
    .typeError("Debe ser un número")
    .min(1)
    .max(10)
    .required("La longitud en ceros es obligatoria"),
  incluir_anio: boolean().default(false),
  formato_anio: string().nullable(),
  incluir_mes: boolean().default(false),
  formato_mes: string().nullable(),
  separador: string().nullable(),
  numero_inicial: number().typeError("Debe ser un número").min(1).required(),
  numero_actual: number().typeError("Debe ser un número").min(0).required(),
  reinicio: string().required(),
});

export const AlertaSchema = object().shape({
  nombre: string().required("El nombre de la regla es obligatorio"),
  evento_disparador: string().required("Debes elegir un evento disparador"),
  canal: string().required("Debes elegir un canal"),
  destinatarios_tipo: string().required("Debes elegir el tipo de destinatario"),
  destinatarios_rol_id: string().nullable(),
  destinatarios_usuario_id: string().nullable(),
  plantilla_asunto: string().nullable(),
  plantilla_cuerpo: string().nullable(),
});

export const IntegracionSchema = object().shape({
  nombre: string().required("El nombre es obligatorio"),
  tipo: string().required("Debes elegir un tipo de integración"),
  proveedor: string().nullable(),
  url_base: string().nullable(),
  metodo_autenticacion: string().required(),
  credenciales_ref: string().nullable(),
});

export const WebhookSchema = object().shape({
  evento: string().required("El evento es obligatorio"),
  url_destino: string().url("Debe ser una URL válida").required("La URL de destino es obligatoria"),
  metodo_http: string().required(),
  secreto_firma_ref: string().nullable(),
});

export const EstadoCicloVidaSchema = object().shape({
  entidad_aplicable: string().required("Debes elegir o escribir una entidad"),
  codigo_estado: string().required("El código del estado es obligatorio"),
  etiqueta: string().required("La etiqueta es obligatoria"),
  orden: number().typeError("Debe ser un número").min(0).required("El orden es obligatorio"),
  es_estado_inicial: boolean().default(false),
  es_estado_final: boolean().default(false),
  color_ui: string().nullable(),
});

export const WorkflowTransicionSchema = object().shape({
  estado_origen_id: string().required("Debes elegir el estado de origen"),
  estado_destino_id: string().required("Debes elegir el estado de destino"),
  rol_permitido_id: string().nullable(),
  requiere_comentario: boolean().default(false),
  requiere_aprobacion_doble: boolean().default(false),
});

// --- Productos y Servicios ---------------------------------------------

export const CategoriaServicioSchema = object().shape({
  nombre: string().required("El nombre es obligatorio"),
  descripcion: string().nullable(),
  categoria_padre_id: string().nullable(),
});

export const RolTarifaSchema = object().shape({
  nombre_rol: string().required("El nombre del rol es obligatorio"),
  nivel_experiencia: string().nullable(),
  tarifa_hora_estandar: number()
    .typeError("Debe ser un número")
    .positive("Debe ser mayor a 0")
    .required("La tarifa estándar es obligatoria"),
  tarifa_hora_costo_referencia: number()
    .typeError("Debe ser un número")
    .min(0, "No puede ser negativo")
    .nullable(),
  moneda_id: string().required("Debes elegir una moneda"),
  vigente_desde: string().required("La fecha de vigencia es obligatoria"),
  vigente_hasta: string().nullable(),
});

export const PlanSlaSchema = object().shape({
  nombre: string().required("El nombre del plan es obligatorio"),
  descripcion: string().nullable(),
});

export const NivelSlaSchema = object().shape({
  severidad: string().required("Debes elegir una severidad"),
  tiempo_respuesta_horas: number()
    .typeError("Debe ser un número")
    .positive("Debe ser mayor a 0")
    .required("El tiempo de respuesta es obligatorio"),
  tiempo_resolucion_horas: number()
    .typeError("Debe ser un número")
    .positive("Debe ser mayor a 0")
    .required("El tiempo de resolución es obligatorio"),
  horario_cobertura: string().required("El horario de cobertura es obligatorio"),
  penalizacion_incumplimiento: string().nullable(),
  penalizacion_pct_credito: number()
    .typeError("Debe ser un número")
    .min(0)
    .max(100, "Debe ser un porcentaje entre 0 y 100")
    .nullable(),
});

export const ServicioSchema = object().shape({
  codigo: string().required("El código es obligatorio"),
  nombre: string().required("El nombre es obligatorio"),
  descripcion: string().nullable(),
  categoria_id: string().nullable(),
  tipo_servicio: string().required("Debes elegir un tipo de servicio"),
  unidad_medida: string().required("Debes elegir una unidad de medida"),
  tarifa_estandar: number()
    .typeError("Debe ser un número")
    .positive("Debe ser mayor a 0")
    .required("La tarifa estándar es obligatoria"),
  moneda_id: string().required("Debes elegir una moneda"),
  sla_plan_id: string().nullable(),
  requiere_aprobacion_cotizacion: boolean().default(false),
  fecha_vigencia_desde: string().nullable(),
  fecha_vigencia_hasta: string().nullable(),
});

export const PaqueteSchema = object().shape({
  nombre: string().required("El nombre es obligatorio"),
  descripcion: string().nullable(),
  precio_total_paquete: number()
    .typeError("Debe ser un número")
    .positive("Debe ser mayor a 0")
    .required("El precio total del paquete es obligatorio"),
  moneda_id: string().required("Debes elegir una moneda"),
  vigencia_desde: string().nullable(),
  vigencia_hasta: string().nullable(),
});

export const PaqueteLineaSchema = object().shape({
  tipo_item: string().required("Debes elegir un tipo de ítem"),
  servicio_id: string().nullable(),
  rol_tarifa_id: string().nullable(),
  cantidad: number()
    .typeError("Debe ser un número")
    .positive("Debe ser mayor a 0")
    .required("La cantidad es obligatoria"),
  precio_unitario_paquete: number()
    .typeError("Debe ser un número")
    .min(0, "No puede ser negativo")
    .required("El precio unitario dentro del paquete es obligatorio"),
});

export const LicenciaCatalogoSchema = object().shape({
  nombre_producto: string().required("El nombre del producto es obligatorio"),
  fabricante: string().nullable(),
  sku_proveedor: string().nullable(),
  tipo: string().required("Debes elegir un tipo de licencia"),
  modelo_costo: string().required("Debes elegir un modelo de costo"),
  costo_unitario: number()
    .typeError("Debe ser un número")
    .positive("Debe ser mayor a 0")
    .required("El costo unitario es obligatorio"),
  precio_venta_sugerido: number().typeError("Debe ser un número").min(0).nullable(),
  moneda_id: string().required("Debes elegir una moneda"),
  periodicidad_facturacion: string().required("Debes elegir una periodicidad"),
  notas: string().nullable(),
});

export const LicenciaAsignadaSchema = object().shape({
  cliente_id: string().nullable(),
  cantidad: number()
    .typeError("Debe ser un número")
    .positive("Debe ser mayor a 0")
    .integer("Debe ser un número entero")
    .required("La cantidad es obligatoria"),
  fecha_inicio: string().required("La fecha de inicio es obligatoria"),
  fecha_fin_vigencia: string().required("La fecha de fin de vigencia es obligatoria"),
  fecha_renovacion: string().nullable(),
  auto_renovar: boolean().default(false),
  estado: string().required(),
  numero_orden_compra_proveedor: string().nullable(),
  costo_total_periodo: number().typeError("Debe ser un número").min(0).nullable(),
  precio_venta_periodo: number().typeError("Debe ser un número").min(0).nullable(),
});

// --- CRM y Ventas --------------------------------------------------------

export const CuentaClienteSchema = object().shape({
  razon_social: string().required("La razón social es obligatoria"),
  nombre_comercial: string().nullable(),
  tipo_identificacion: string().required("Debes elegir un tipo de identificación"),
  numero_identificacion: string().required("El número de identificación es obligatorio"),
  cuenta_padre_id: string().nullable(),
  sector_industria: string().nullable(),
  tamano_empresa: string().nullable(),
  sitio_web: string().nullable(),
  direccion_facturacion: string().nullable(),
  ciudad: string().nullable(),
  pais: string().nullable(),
  telefono_principal: string().nullable(),
  email_principal: string().email("Debe ser un correo válido").nullable(),
  moneda_preferida_id: string().nullable(),
  ejecutivo_comercial_id: string().nullable(),
  origen_captacion: string().nullable(),
  estado: string().required(),
  notas: string().nullable(),
});

export const ContactoSchema = object().shape({
  nombre: string().required("El nombre es obligatorio"),
  apellido: string().nullable(),
  cargo: string().nullable(),
  email: string().email("Debe ser un correo válido").nullable(),
  telefono: string().nullable(),
  celular: string().nullable(),
  canal_preferido: string().nullable(),
  es_contacto_principal: boolean().default(false),
  es_firmante_autorizado: boolean().default(false),
  notas: string().nullable(),
});

export const OportunidadSchema = object().shape({
  cuenta_id: string().required("Debes elegir una cuenta"),
  contacto_id: string().nullable(),
  nombre_oportunidad: string().required("El nombre de la oportunidad es obligatorio"),
  descripcion: string().nullable(),
  etapa: string().required(),
  probabilidad_cierre_pct: number()
    .typeError("Debe ser un número")
    .min(0)
    .max(100, "Debe ser un porcentaje entre 0 y 100")
    .nullable(),
  valor_estimado: number().typeError("Debe ser un número").min(0).nullable(),
  moneda_id: string().nullable(),
  fecha_estimada_cierre: string().nullable(),
  motivo_perdida_id: string().nullable(),
  motivo_perdida_detalle: string().nullable(),
  origen_oportunidad: string().nullable(),
  ejecutivo_comercial_id: string().required("Debes elegir un ejecutivo comercial"),
  proxima_accion: string().nullable(),
  fecha_proxima_accion: string().nullable(),
});

export const SeguimientoSchema = object().shape({
  tipo_actividad: string().required("Debes elegir un tipo de actividad"),
  descripcion: string().required("La descripción es obligatoria"),
  resultado: string().nullable(),
});

// --- CRM y Ventas · Cotizaciones ------------------------------------------

export const CotizacionSchema = object().shape({
  cuenta_id: string().required("Debes elegir una cuenta"),
  contacto_id: string().nullable(),
  oportunidad_id: string().nullable(),
  fecha_validez_hasta: string().required("La fecha de validez es obligatoria"),
  moneda_id: string().required("Debes elegir una moneda"),
  descuento_pct: number()
    .typeError("Debe ser un número")
    .min(0)
    .max(100, "Debe ser un porcentaje entre 0 y 100")
    .nullable(),
  impuestos_pct: number()
    .typeError("Debe ser un número")
    .min(0)
    .max(100, "Debe ser un porcentaje entre 0 y 100")
    .nullable(),
  condiciones_pago: string().nullable(),
  condiciones_comerciales: string().nullable(),
  tiempo_estimado_entrega: string().nullable(),
  responsable_comercial_id: string().required("Debes elegir un responsable comercial"),
  archivo_pdf_url: string().nullable(),
});

export const CotizacionLineaSchema = object().shape({
  tipo_item: string().required("Debes elegir un tipo de ítem"),
  servicio_id: string().nullable(),
  rol_tarifa_id: string().nullable(),
  descripcion: string().required("La descripción es obligatoria"),
  cantidad: number()
    .typeError("Debe ser un número")
    .positive("Debe ser mayor a 0")
    .required("La cantidad es obligatoria"),
  unidad_medida: string().required("La unidad de medida es obligatoria"),
  precio_unitario: number()
    .typeError("Debe ser un número")
    .min(0, "No puede ser negativo")
    .required("El precio unitario es obligatorio"),
  descuento_linea_pct: number()
    .typeError("Debe ser un número")
    .min(0)
    .max(100, "Debe ser un porcentaje entre 0 y 100")
    .nullable(),
});

export const CotizacionTransicionSchema = object().shape({
  comentario: string().nullable(),
});

export const CotizacionSolicitarAprobacionSchema = object().shape({
  aprobador_id: string().required("Debes elegir un aprobador"),
});

export const CotizacionResolverAprobacionSchema = object().shape({
  comentario: string().nullable(),
});

// --- Contratos y Proyectos -------------------------------------------------

export const ContratoSchema = object().shape({
  cuenta_id: string().required("Debes elegir una cuenta"),
  contacto_firmante_id: string().nullable(),
  tipo_contrato: string().required("Debes elegir un tipo de contrato"),
  fecha_firma: string().nullable(),
  fecha_inicio: string().required("La fecha de inicio es obligatoria"),
  fecha_fin_estimada: string().nullable(),
  moneda_id: string().required("Debes elegir una moneda"),
  valor_total_contratado: number()
    .typeError("Debe ser un número")
    .positive("Debe ser mayor a 0")
    .required("El valor total contratado es obligatorio"),
  forma_pago: string().nullable(),
  plazo_pago_dias: number().typeError("Debe ser un número").min(0).nullable(),
  responsable_comercial_id: string().required("Debes elegir un responsable comercial"),
  responsable_pm_id: string().nullable(),
  archivo_contrato_url: string().nullable(),
  clausulas_especiales: string().nullable(),
});

export const ContratoTransicionSchema = object().shape({
  comentario: string().nullable(),
});

export const ProyectoSchema = object().shape({
  contrato_id: string().required("Debes elegir un contrato"),
  nombre_proyecto: string().required("El nombre del proyecto es obligatorio"),
  descripcion: string().nullable(),
  tipo_proyecto: string().nullable(),
  pm_id: string().required("Debes elegir un PM"),
  prioridad: string().nullable(),
  codigo_secuencia: string().required("Debes elegir la secuencia de numeración"),
  fecha_inicio_planeada: string().required("La fecha de inicio planeada es obligatoria"),
  fecha_fin_planeada: string().required("La fecha de fin planeada es obligatoria"),
  fecha_inicio_real: string().nullable(),
  fecha_fin_real: string().nullable(),
  presupuesto_horas_total: number().typeError("Debe ser un número").min(0).nullable(),
  presupuesto_costo_total: number().typeError("Debe ser un número").min(0).nullable(),
  presupuesto_ingreso_total: number().typeError("Debe ser un número").min(0).nullable(),
  porcentaje_avance: number().typeError("Debe ser un número").min(0).max(100).nullable(),
});

export const ProyectoTransicionSchema = object().shape({
  comentario: string().nullable(),
});

export const HitoSchema = object().shape({
  nombre: string().required("El nombre del hito es obligatorio"),
  descripcion: string().nullable(),
  fase_orden: number().typeError("Debe ser un número").min(0).required("El orden es obligatorio"),
  fecha_planeada_entrega: string().required("La fecha planeada de entrega es obligatoria"),
  condiciones_aceptacion: string().nullable(),
  responsable_id: string().required("Debes elegir un responsable"),
  porcentaje_facturacion_asociado: number().typeError("Debe ser un número").min(0).max(100).nullable(),
  valor_hito: number().typeError("Debe ser un número").min(0).nullable(),
  aprobador_cliente_contacto_id: string().nullable(),
});

export const HitoCriterioSchema = object().shape({
  criterio: string().required("El criterio es obligatorio"),
});

export const CotizacionConvertirProyectoSchema = object().shape({
  tipo_contrato: string().required("Debes elegir un tipo de contrato"),
  fecha_inicio_contrato: string().required("La fecha de inicio del contrato es obligatoria"),
  contacto_firmante_id: string().nullable(),
  forma_pago: string().nullable(),
  plazo_pago_dias: number().typeError("Debe ser un número").min(0).nullable(),
  pm_id: string().required("Debes elegir un PM"),
  nombre_proyecto: string().required("El nombre del proyecto es obligatorio"),
  tipo_proyecto: string().nullable(),
  codigo_secuencia_proyecto: string().required("Debes elegir la secuencia de numeración"),
  fecha_inicio_planeada: string().required("La fecha de inicio planeada es obligatoria"),
  fecha_fin_planeada: string().required("La fecha de fin planeada es obligatoria"),
});

// --- Contratos y Proyectos · Checkpoint 5b -----------------------------------

export const TimesheetSchema = object().shape({
  proyecto_id: string().required("Debes elegir un proyecto"),
  hito_id: string().nullable(),
  recurso_id: string().required("Debes elegir un recurso"),
  fecha: string().required("La fecha es obligatoria"),
  horas_registradas: number()
    .typeError("Debe ser un número")
    .moreThan(0, "Debe ser mayor a 0")
    .max(24, "No puede superar 24 horas")
    .required("Las horas registradas son obligatorias"),
  tipo_hora: string().required("Debes elegir un tipo de hora"),
  categoria_no_facturable_id: string().nullable(),
  rol_tarifa_id: string().nullable(),
  descripcion_actividad: string().required("La descripción de la actividad es obligatoria"),
  ubicacion_trabajo: string().nullable(),
});

export const AsignacionRecursoSchema = object().shape({
  proyecto_id: string().required("Debes elegir un proyecto"),
  recurso_id: string().required("Debes elegir un recurso"),
  rol_en_proyecto_id: string().nullable(),
  fecha_inicio_asignacion: string().required("La fecha de inicio es obligatoria"),
  fecha_fin_asignacion: string().nullable(),
  porcentaje_dedicacion: number()
    .typeError("Debe ser un número")
    .min(0)
    .max(100, "Debe ser un porcentaje entre 0 y 100")
    .required("El porcentaje de dedicación es obligatorio"),
  horas_planeadas_totales: number().typeError("Debe ser un número").min(0).nullable(),
  tarifa_costo_hora_aplicable: number().typeError("Debe ser un número").min(0).nullable(),
  tarifa_venta_hora_aplicable: number().typeError("Debe ser un número").min(0).nullable(),
  estado_asignacion: string().required(),
  notas: string().nullable(),
});

export const DisponibilidadRecursoSchema = object().shape({
  recurso_id: string().required("Debes elegir un recurso"),
  fecha: string().required("La fecha es obligatoria"),
  horas_disponibles: number()
    .typeError("Debe ser un número")
    .min(0)
    .max(24, "No puede superar 24 horas")
    .required("Las horas disponibles son obligatorias"),
});

export const RentabilidadSnapshotSchema = object().shape({
  otros_costos: number().typeError("Debe ser un número").min(0).nullable(),
});

export const ChangeRequestSchema = object().shape({
  proyecto_id: string().required("Debes elegir un proyecto"),
  titulo: string().required("El título es obligatorio"),
  descripcion_cambio: string().required("La descripción del cambio es obligatoria"),
  tipo_cambio: string().required("Debes elegir un tipo de cambio"),
  justificacion: string().nullable(),
  impacto_horas: number().typeError("Debe ser un número").nullable(),
  impacto_costo: number().typeError("Debe ser un número").nullable(),
  impacto_valor_contrato: number().typeError("Debe ser un número").nullable(),
  impacto_fecha_fin_dias: number().typeError("Debe ser un número entero").integer().nullable(),
  solicitado_por_usuario_id: string().required("Debes elegir quién solicita el cambio"),
  fecha_solicitud: string().required("La fecha de solicitud es obligatoria"),
  aprobador_interno_id: string().nullable(),
  documento_addenda_url: string().nullable(),
});

export const ChangeRequestTransicionSchema = object().shape({
  comentario: string().nullable(),
});

export const FacturaReferenciaExternaSchema = object().shape({
  proyecto_id: string().nullable(),
  contrato_id: string().nullable(),
  numero_factura_externa: string().required("El número de factura externa es obligatorio"),
  sistema_origen: string().required("El sistema de origen es obligatorio"),
  fecha_emision: string().required("La fecha de emisión es obligatoria"),
  fecha_vencimiento_pago: string().nullable(),
  moneda_id: string().required("Debes elegir una moneda"),
  monto_subtotal: number().typeError("Debe ser un número").min(0).nullable(),
  monto_impuestos: number().typeError("Debe ser un número").min(0).nullable(),
  monto_total: number()
    .typeError("Debe ser un número")
    .positive("Debe ser mayor a 0")
    .required("El monto total es obligatorio"),
  estado_pago: string().required(),
  monto_pagado_acumulado: number().typeError("Debe ser un número").min(0).nullable(),
  fecha_ultimo_pago: string().nullable(),
  hito_asociado_id: string().nullable(),
  adjunto_url: string().nullable(),
  notas: string().nullable(),
});

export const CasoSoporteReferenciaExternaSchema = object().shape({
  proyecto_id: string().nullable(),
  contrato_id: string().nullable(),
  numero_ticket_externo: string().required("El número de ticket externo es obligatorio"),
  sistema_origen: string().required("El sistema de origen es obligatorio"),
  asunto: string().required("El asunto es obligatorio"),
  descripcion_breve: string().nullable(),
  fecha_apertura: string().required("La fecha de apertura es obligatoria"),
  fecha_cierre: string().nullable(),
  estado: string().required(),
  prioridad: string().nullable(),
  categoria: string().nullable(),
  horas_consumidas: number().typeError("Debe ser un número").min(0).nullable(),
  sla_incumplido: boolean().default(false),
  es_cubierto_garantia: boolean().default(false),
  notas: string().nullable(),
});

// --- Compras y Subcontratación · Checkpoint 6 -------------------------------

export const ProveedorSchema = object().shape({
  tipo_proveedor: string().required("Debes elegir un tipo de proveedor"),
  razon_social_o_nombre: string().required("El nombre o razón social es obligatorio"),
  tipo_identificacion: string().nullable(),
  numero_identificacion: string().nullable(),
  email: string().email("Debe ser un correo válido").nullable(),
  telefono: string().nullable(),
  direccion: string().nullable(),
  pais: string().nullable(),
  categoria_id: string().nullable(),
  especialidad: string().nullable(),
  tarifa_referencia_hora: number().typeError("Debe ser un número").min(0).nullable(),
  moneda_id: string().nullable(),
  forma_pago_preferida: string().nullable(),
  plazo_pago_dias: number().typeError("Debe ser un número entero").integer().min(0).nullable(),
  cuenta_bancaria_ref: string().nullable(),
  documentos_legales_url: string().nullable(),
  fecha_vinculacion: string().nullable(),
});

export const EvaluacionProveedorSchema = object().shape({
  proyecto_id: string().nullable(),
  fecha_evaluacion: string().required("La fecha de evaluación es obligatoria"),
  calidad: number()
    .typeError("Debe ser un número")
    .min(1, "Debe estar entre 1 y 5")
    .max(5, "Debe estar entre 1 y 5")
    .required("Calificación de calidad obligatoria"),
  tiempo: number()
    .typeError("Debe ser un número")
    .min(1, "Debe estar entre 1 y 5")
    .max(5, "Debe estar entre 1 y 5")
    .required("Calificación de tiempo obligatoria"),
  comunicacion: number()
    .typeError("Debe ser un número")
    .min(1, "Debe estar entre 1 y 5")
    .max(5, "Debe estar entre 1 y 5")
    .required("Calificación de comunicación obligatoria"),
  comentarios: string().nullable(),
});

export const OrdenCostoSchema = object().shape({
  proveedor_id: string().required("Debes elegir un proveedor"),
  proyecto_id: string().required("Debes elegir un proyecto"),
  contrato_id: string().nullable(),
  concepto: string().required("El concepto es obligatorio"),
  tipo_costo: string().required("Debes elegir un tipo de costo"),
  fecha_orden: string().required("La fecha de la orden es obligatoria"),
  fecha_inicio_servicio: string().nullable(),
  fecha_fin_servicio: string().nullable(),
  cantidad: number().typeError("Debe ser un número").moreThan(0, "Debe ser mayor a 0").required("La cantidad es obligatoria"),
  unidad_medida: string().required("La unidad de medida es obligatoria"),
  valor_unitario: number().typeError("Debe ser un número").moreThan(0, "Debe ser mayor a 0").required("El valor unitario es obligatorio"),
  moneda_id: string().required("Debes elegir una moneda"),
  factura_proveedor_numero: string().nullable(),
  factura_proveedor_fecha: string().nullable(),
  factura_proveedor_url: string().nullable(),
  notas: string().nullable(),
});

export const OrdenCostoTransicionSchema = object().shape({
  comentario: string().nullable(),
});

// =============================================================================
// Cierre y Postventa
// =============================================================================

export const PlantillaChecklistSchema = object().shape({
  nombre: string().required("El nombre de la plantilla es obligatorio"),
  descripcion: string().nullable(),
});

export const ItemPlantillaChecklistSchema = object().shape({
  orden: number().typeError("Debe ser un número entero").integer().min(0).required("El orden es obligatorio"),
  descripcion_item: string().required("La descripción del ítem es obligatoria"),
  tipo_verificacion: string().required("Debes elegir un tipo de verificación"),
  obligatorio: boolean(),
});

export const IniciarChecklistSchema = object().shape({
  proyecto_id: string().required("Debes elegir un proyecto"),
  plantilla_id: string().required("Debes elegir una plantilla"),
  responsable_id: string().required("Debes elegir un responsable"),
});

export const ItemChecklistSchema = object().shape({
  evidencia_url: string().nullable(),
  comentario: string().nullable(),
});

export const ActaCierreSchema = object().shape({
  fecha_acta: string().required("La fecha del acta es obligatoria"),
  firmante_cliente_contacto_id: string().nullable(),
  firmante_interno_usuario_id: string().required("Debes elegir quién firma internamente"),
  documento_acta_url: string().nullable(),
  observaciones_finales: string().nullable(),
});

export const GarantiaSchema = object().shape({
  proyecto_id: string().nullable(),
  contrato_id: string().nullable(),
  fecha_inicio_garantia: string().required("La fecha de inicio de garantía es obligatoria"),
  duracion_meses: number()
    .typeError("Debe ser un número entero")
    .integer()
    .moreThan(0, "Debe ser mayor a 0")
    .required("La duración en meses es obligatoria"),
  alcance_garantia: string().nullable(),
  condiciones_exclusiones: string().nullable(),
});

export const ExtensionGarantiaSchema = object().shape({
  meses_adicionales: number()
    .typeError("Debe ser un número entero")
    .integer()
    .moreThan(0, "Debe ser mayor a 0")
    .required("Los meses adicionales son obligatorios"),
  motivo: string().nullable(),
  valor_adicional: number().typeError("Debe ser un número").min(0).nullable(),
});
