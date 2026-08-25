// FORMS

export type LoginFormType = {
  email: string;
  password: string;
};

export type InvitarUsuarioFormType = {
  nombre_completo: string;
  email: string;
  rol_id: string;
};

// --- Configuración General -------------------------------------------------

export type RolFormType = {
  nombre: string;
  descripcion: string;
};

export type ParametrosGlobalesFormType = {
  razon_social: string;
  nombre_comercial: string;
  tipo_identificacion: string;
  numero_identificacion: string;
  digito_verificacion: string;
  direccion: string;
  ciudad: string;
  pais: string;
  telefono: string;
  email_corporativo: string;
  sitio_web: string;
  moneda_principal_id: string;
  zona_horaria: string;
  idioma_por_defecto: string;
  formato_fecha: string;
  formato_hora: string;
  separador_miles: string;
  separador_decimal: string;
  primer_dia_semana: string;
  logo_url_claro: string;
  logo_url_oscuro: string;
  pie_pagina_documentos: string;
};

export type SecuenciaFormType = {
  codigo_secuencia: string;
  tipo_documento: string;
  prefijo: string;
  sufijo: string;
  longitud_ceros: string;
  incluir_anio: boolean;
  formato_anio: string;
  incluir_mes: boolean;
  formato_mes: string;
  separador: string;
  numero_inicial: string;
  numero_actual: string;
  reinicio: string;
};

export type AlertaFormType = {
  nombre: string;
  evento_disparador: string;
  canal: string;
  destinatarios_tipo: string;
  destinatarios_rol_id: string;
  destinatarios_usuario_id: string;
  plantilla_asunto: string;
  plantilla_cuerpo: string;
};

export type IntegracionFormType = {
  nombre: string;
  tipo: string;
  proveedor: string;
  url_base: string;
  metodo_autenticacion: string;
  credenciales_ref: string;
};

export type WebhookFormType = {
  evento: string;
  url_destino: string;
  metodo_http: string;
  secreto_firma_ref: string;
};

export type EstadoCicloVidaFormType = {
  entidad_aplicable: string;
  codigo_estado: string;
  etiqueta: string;
  orden: string;
  es_estado_inicial: boolean;
  es_estado_final: boolean;
  color_ui: string;
};

export type WorkflowTransicionFormType = {
  estado_origen_id: string;
  estado_destino_id: string;
  rol_permitido_id: string;
  requiere_comentario: boolean;
  requiere_aprobacion_doble: boolean;
};

// --- Productos y Servicios ---------------------------------------------

export type CategoriaServicioFormType = {
  nombre: string;
  descripcion: string;
  categoria_padre_id: string;
};

export type RolTarifaFormType = {
  nombre_rol: string;
  nivel_experiencia: string;
  tarifa_hora_estandar: string;
  tarifa_hora_costo_referencia: string;
  moneda_id: string;
  vigente_desde: string;
  vigente_hasta: string;
};

export type PlanSlaFormType = {
  nombre: string;
  descripcion: string;
};

export type NivelSlaFormType = {
  severidad: string;
  tiempo_respuesta_horas: string;
  tiempo_resolucion_horas: string;
  horario_cobertura: string;
  penalizacion_incumplimiento: string;
  penalizacion_pct_credito: string;
};

export type ServicioFormType = {
  codigo: string;
  nombre: string;
  descripcion: string;
  categoria_id: string;
  tipo_servicio: string;
  unidad_medida: string;
  tarifa_estandar: string;
  moneda_id: string;
  sla_plan_id: string;
  requiere_aprobacion_cotizacion: boolean;
  fecha_vigencia_desde: string;
  fecha_vigencia_hasta: string;
};

export type PaqueteFormType = {
  nombre: string;
  descripcion: string;
  precio_total_paquete: string;
  moneda_id: string;
  vigencia_desde: string;
  vigencia_hasta: string;
};

export type PaqueteLineaFormType = {
  tipo_item: string;
  servicio_id: string;
  rol_tarifa_id: string;
  cantidad: string;
  precio_unitario_paquete: string;
};

export type LicenciaCatalogoFormType = {
  nombre_producto: string;
  fabricante: string;
  sku_proveedor: string;
  tipo: string;
  modelo_costo: string;
  costo_unitario: string;
  precio_venta_sugerido: string;
  moneda_id: string;
  periodicidad_facturacion: string;
  notas: string;
};

export type LicenciaAsignadaFormType = {
  cliente_id: string;
  cantidad: string;
  fecha_inicio: string;
  fecha_fin_vigencia: string;
  fecha_renovacion: string;
  auto_renovar: boolean;
  estado: string;
  numero_orden_compra_proveedor: string;
  costo_total_periodo: string;
  precio_venta_periodo: string;
};

// --- CRM y Ventas --------------------------------------------------------

export type CuentaClienteFormType = {
  razon_social: string;
  nombre_comercial: string;
  tipo_identificacion: string;
  numero_identificacion: string;
  cuenta_padre_id: string;
  sector_industria: string;
  tamano_empresa: string;
  sitio_web: string;
  direccion_facturacion: string;
  ciudad: string;
  pais: string;
  telefono_principal: string;
  email_principal: string;
  moneda_preferida_id: string;
  ejecutivo_comercial_id: string;
  origen_captacion: string;
  estado: string;
  notas: string;
};

export type ContactoFormType = {
  nombre: string;
  apellido: string;
  cargo: string;
  email: string;
  telefono: string;
  celular: string;
  canal_preferido: string;
  es_contacto_principal: boolean;
  es_firmante_autorizado: boolean;
  notas: string;
};

export type OportunidadFormType = {
  cuenta_id: string;
  contacto_id: string;
  nombre_oportunidad: string;
  descripcion: string;
  etapa: string;
  probabilidad_cierre_pct: string;
  valor_estimado: string;
  moneda_id: string;
  fecha_estimada_cierre: string;
  motivo_perdida_id: string;
  motivo_perdida_detalle: string;
  origen_oportunidad: string;
  ejecutivo_comercial_id: string;
  proxima_accion: string;
  fecha_proxima_accion: string;
};

export type SeguimientoFormType = {
  tipo_actividad: string;
  descripcion: string;
  resultado: string;
};

// --- CRM y Ventas · Cotizaciones ------------------------------------------

export type CotizacionFormType = {
  cuenta_id: string;
  contacto_id: string;
  oportunidad_id: string;
  fecha_validez_hasta: string;
  moneda_id: string;
  descuento_pct: string;
  impuestos_pct: string;
  condiciones_pago: string;
  condiciones_comerciales: string;
  tiempo_estimado_entrega: string;
  responsable_comercial_id: string;
  archivo_pdf_url: string;
};

export type CotizacionLineaFormType = {
  tipo_item: string;
  servicio_id: string;
  rol_tarifa_id: string;
  descripcion: string;
  cantidad: string;
  unidad_medida: string;
  precio_unitario: string;
  descuento_linea_pct: string;
};

export type CotizacionTransicionFormType = {
  comentario: string;
};

export type CotizacionSolicitarAprobacionFormType = {
  aprobador_id: string;
};

export type CotizacionResolverAprobacionFormType = {
  comentario: string;
};

// --- Contratos y Proyectos -------------------------------------------------

export type ContratoFormType = {
  cuenta_id: string;
  contacto_firmante_id: string;
  tipo_contrato: string;
  fecha_firma: string;
  fecha_inicio: string;
  fecha_fin_estimada: string;
  moneda_id: string;
  valor_total_contratado: string;
  forma_pago: string;
  plazo_pago_dias: string;
  responsable_comercial_id: string;
  responsable_pm_id: string;
  archivo_contrato_url: string;
  clausulas_especiales: string;
};

export type ContratoTransicionFormType = {
  comentario: string;
};

export type ProyectoFormType = {
  contrato_id: string;
  nombre_proyecto: string;
  descripcion: string;
  tipo_proyecto: string;
  pm_id: string;
  prioridad: string;
  codigo_secuencia: string;
  fecha_inicio_planeada: string;
  fecha_fin_planeada: string;
  fecha_inicio_real: string;
  fecha_fin_real: string;
  presupuesto_horas_total: string;
  presupuesto_costo_total: string;
  presupuesto_ingreso_total: string;
  porcentaje_avance: string;
};

export type ProyectoTransicionFormType = {
  comentario: string;
};

export type HitoFormType = {
  nombre: string;
  descripcion: string;
  fase_orden: string;
  fecha_planeada_entrega: string;
  condiciones_aceptacion: string;
  responsable_id: string;
  porcentaje_facturacion_asociado: string;
  valor_hito: string;
  aprobador_cliente_contacto_id: string;
};

export type HitoCriterioFormType = {
  criterio: string;
};

export type CotizacionConvertirProyectoFormType = {
  tipo_contrato: string;
  fecha_inicio_contrato: string;
  contacto_firmante_id: string;
  forma_pago: string;
  plazo_pago_dias: string;
  pm_id: string;
  nombre_proyecto: string;
  tipo_proyecto: string;
  codigo_secuencia_proyecto: string;
  fecha_inicio_planeada: string;
  fecha_fin_planeada: string;
};

// --- Contratos y Proyectos · Checkpoint 5b ----------------------------------

export type TimesheetFormType = {
  proyecto_id: string;
  hito_id: string;
  recurso_id: string;
  fecha: string;
  horas_registradas: string;
  tipo_hora: string;
  categoria_no_facturable_id: string;
  rol_tarifa_id: string;
  descripcion_actividad: string;
  ubicacion_trabajo: string;
};

export type AsignacionRecursoFormType = {
  proyecto_id: string;
  recurso_id: string;
  rol_en_proyecto_id: string;
  fecha_inicio_asignacion: string;
  fecha_fin_asignacion: string;
  porcentaje_dedicacion: string;
  horas_planeadas_totales: string;
  tarifa_costo_hora_aplicable: string;
  tarifa_venta_hora_aplicable: string;
  estado_asignacion: string;
  notas: string;
};

export type DisponibilidadRecursoFormType = {
  recurso_id: string;
  fecha: string;
  horas_disponibles: string;
};

export type RentabilidadSnapshotFormType = {
  otros_costos: string;
};

export type ChangeRequestFormType = {
  proyecto_id: string;
  titulo: string;
  descripcion_cambio: string;
  tipo_cambio: string;
  justificacion: string;
  impacto_horas: string;
  impacto_costo: string;
  impacto_valor_contrato: string;
  impacto_fecha_fin_dias: string;
  solicitado_por_usuario_id: string;
  fecha_solicitud: string;
  aprobador_interno_id: string;
  documento_addenda_url: string;
};

export type ChangeRequestTransicionFormType = {
  comentario: string;
};

export type FacturaReferenciaExternaFormType = {
  proyecto_id: string;
  contrato_id: string;
  numero_factura_externa: string;
  sistema_origen: string;
  fecha_emision: string;
  fecha_vencimiento_pago: string;
  moneda_id: string;
  monto_subtotal: string;
  monto_impuestos: string;
  monto_total: string;
  estado_pago: string;
  monto_pagado_acumulado: string;
  fecha_ultimo_pago: string;
  hito_asociado_id: string;
  adjunto_url: string;
  notas: string;
};

export type CasoSoporteReferenciaExternaFormType = {
  proyecto_id: string;
  contrato_id: string;
  numero_ticket_externo: string;
  sistema_origen: string;
  asunto: string;
  descripcion_breve: string;
  fecha_apertura: string;
  fecha_cierre: string;
  estado: string;
  prioridad: string;
  categoria: string;
  horas_consumidas: string;
  sla_incumplido: boolean;
  es_cubierto_garantia: boolean;
  notas: string;
};

// --- Compras y Subcontratación · Checkpoint 6 -------------------------------

export type ProveedorFormType = {
  tipo_proveedor: string;
  razon_social_o_nombre: string;
  tipo_identificacion: string;
  numero_identificacion: string;
  email: string;
  telefono: string;
  direccion: string;
  pais: string;
  categoria_id: string;
  especialidad: string;
  tarifa_referencia_hora: string;
  moneda_id: string;
  forma_pago_preferida: string;
  plazo_pago_dias: string;
  cuenta_bancaria_ref: string;
  documentos_legales_url: string;
  fecha_vinculacion: string;
};

export type EvaluacionProveedorFormType = {
  proyecto_id: string;
  fecha_evaluacion: string;
  calidad: string;
  tiempo: string;
  comunicacion: string;
  comentarios: string;
};

export type OrdenCostoFormType = {
  proveedor_id: string;
  proyecto_id: string;
  contrato_id: string;
  concepto: string;
  tipo_costo: string;
  fecha_orden: string;
  fecha_inicio_servicio: string;
  fecha_fin_servicio: string;
  cantidad: string;
  unidad_medida: string;
  valor_unitario: string;
  moneda_id: string;
  factura_proveedor_numero: string;
  factura_proveedor_fecha: string;
  factura_proveedor_url: string;
  notas: string;
};

export type OrdenCostoTransicionFormType = {
  comentario: string;
};

// =============================================================================
// Cierre y Postventa
// =============================================================================

export type PlantillaChecklistFormType = {
  nombre: string;
  descripcion: string;
};

export type ItemPlantillaChecklistFormType = {
  orden: string;
  descripcion_item: string;
  tipo_verificacion: string;
  obligatorio: boolean;
};

export type IniciarChecklistFormType = {
  proyecto_id: string;
  plantilla_id: string;
  responsable_id: string;
};

export type ItemChecklistFormType = {
  evidencia_url: string;
  comentario: string;
};

export type ActaCierreFormType = {
  fecha_acta: string;
  firmante_cliente_contacto_id: string;
  firmante_interno_usuario_id: string;
  documento_acta_url: string;
  observaciones_finales: string;
};

export type GarantiaFormType = {
  proyecto_id: string;
  contrato_id: string;
  fecha_inicio_garantia: string;
  duracion_meses: string;
  alcance_garantia: string;
  condiciones_exclusiones: string;
};

export type ExtensionGarantiaFormType = {
  meses_adicionales: string;
  motivo: string;
  valor_adicional: string;
};
