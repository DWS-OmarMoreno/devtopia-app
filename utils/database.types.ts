// =============================================================================
// Devtopia ERP — Tipos generados a partir de supabase/migrations/*.sql
// Generado a mano siguiendo el formato de `supabase gen types typescript`,
// para no depender de credenciales de CLI en este entorno. Si el esquema se
// edita directamente en Supabase Studio sin pasar por una migración, este
// archivo queda desactualizado — regenerar con:
//   npx supabase gen types typescript --project-id <ref> > utils/database.types.ts
// =============================================================================

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      actas_cierre: {
        Row: {
          id: string
          proyecto_id: string
          fecha_acta: string
          firmante_cliente_contacto_id: string | null
          firmante_interno_usuario_id: string
          documento_acta_url: string | null
          observaciones_finales: string | null
          recursos_liberados: boolean
          fecha_liberacion_recursos: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          proyecto_id: string
          fecha_acta?: string
          firmante_cliente_contacto_id?: string | null
          firmante_interno_usuario_id: string
          documento_acta_url?: string | null
          observaciones_finales?: string | null
          recursos_liberados?: boolean
          fecha_liberacion_recursos?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          proyecto_id?: string
          fecha_acta?: string
          firmante_cliente_contacto_id?: string | null
          firmante_interno_usuario_id?: string
          documento_acta_url?: string | null
          observaciones_finales?: string | null
          recursos_liberados?: boolean
          fecha_liberacion_recursos?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      alertas_notificaciones_reglas: {
        Row: {
          id: string
          empresa_id: string
          nombre: string
          evento_disparador: string
          parametros: Json | null
          canal: string
          destinatarios_tipo: string
          destinatarios_rol_id: string | null
          destinatarios_usuario_id: string | null
          plantilla_asunto: string | null
          plantilla_cuerpo: string | null
          activa: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          empresa_id: string
          nombre: string
          evento_disparador: string
          parametros?: Json | null
          canal: string
          destinatarios_tipo: string
          destinatarios_rol_id?: string | null
          destinatarios_usuario_id?: string | null
          plantilla_asunto?: string | null
          plantilla_cuerpo?: string | null
          activa?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          empresa_id?: string
          nombre?: string
          evento_disparador?: string
          parametros?: Json | null
          canal?: string
          destinatarios_tipo?: string
          destinatarios_rol_id?: string | null
          destinatarios_usuario_id?: string | null
          plantilla_asunto?: string | null
          plantilla_cuerpo?: string | null
          activa?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      asignacion_recursos: {
        Row: {
          id: string
          proyecto_id: string
          recurso_id: string
          rol_en_proyecto_id: string | null
          fecha_inicio_asignacion: string
          fecha_fin_asignacion: string | null
          porcentaje_dedicacion: number
          horas_planeadas_totales: number | null
          tarifa_costo_hora_aplicable: number | null
          tarifa_venta_hora_aplicable: number | null
          estado_asignacion: string
          notas: string | null
        }
        Insert: {
          id?: string
          proyecto_id: string
          recurso_id: string
          rol_en_proyecto_id?: string | null
          fecha_inicio_asignacion: string
          fecha_fin_asignacion?: string | null
          porcentaje_dedicacion: number
          horas_planeadas_totales?: number | null
          tarifa_costo_hora_aplicable?: number | null
          tarifa_venta_hora_aplicable?: number | null
          estado_asignacion?: string
          notas?: string | null
        }
        Update: {
          id?: string
          proyecto_id?: string
          recurso_id?: string
          rol_en_proyecto_id?: string | null
          fecha_inicio_asignacion?: string
          fecha_fin_asignacion?: string | null
          porcentaje_dedicacion?: number
          horas_planeadas_totales?: number | null
          tarifa_costo_hora_aplicable?: number | null
          tarifa_venta_hora_aplicable?: number | null
          estado_asignacion?: string
          notas?: string | null
        }
      }
      casos_soporte_referencia_externa: {
        Row: {
          id: string
          proyecto_id: string | null
          contrato_id: string | null
          numero_ticket_externo: string
          sistema_origen: string
          asunto: string
          descripcion_breve: string | null
          fecha_apertura: string
          fecha_cierre: string | null
          estado: string
          prioridad: string | null
          categoria: string | null
          horas_consumidas: number | null
          sla_incumplido: boolean | null
          es_cubierto_garantia: boolean
          metodo_registro: string
          registrado_por_usuario_id: string | null
          notas: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          proyecto_id?: string | null
          contrato_id?: string | null
          numero_ticket_externo: string
          sistema_origen: string
          asunto: string
          descripcion_breve?: string | null
          fecha_apertura: string
          fecha_cierre?: string | null
          estado?: string
          prioridad?: string | null
          categoria?: string | null
          horas_consumidas?: number | null
          sla_incumplido?: boolean | null
          es_cubierto_garantia?: boolean
          metodo_registro?: string
          registrado_por_usuario_id?: string | null
          notas?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          proyecto_id?: string | null
          contrato_id?: string | null
          numero_ticket_externo?: string
          sistema_origen?: string
          asunto?: string
          descripcion_breve?: string | null
          fecha_apertura?: string
          fecha_cierre?: string | null
          estado?: string
          prioridad?: string | null
          categoria?: string | null
          horas_consumidas?: number | null
          sla_incumplido?: boolean | null
          es_cubierto_garantia?: boolean
          metodo_registro?: string
          registrado_por_usuario_id?: string | null
          notas?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      catalogo_roles_tarifa: {
        Row: {
          id: string
          empresa_id: string
          nombre_rol: string
          nivel_experiencia: string | null
          tarifa_hora_estandar: number
          tarifa_hora_costo_referencia: number | null
          moneda_id: string
          vigente_desde: string
          vigente_hasta: string | null
          activo: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          empresa_id: string
          nombre_rol: string
          nivel_experiencia?: string | null
          tarifa_hora_estandar: number
          tarifa_hora_costo_referencia?: number | null
          moneda_id: string
          vigente_desde?: string
          vigente_hasta?: string | null
          activo?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          empresa_id?: string
          nombre_rol?: string
          nivel_experiencia?: string | null
          tarifa_hora_estandar?: number
          tarifa_hora_costo_referencia?: number | null
          moneda_id?: string
          vigente_desde?: string
          vigente_hasta?: string | null
          activo?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      catalogo_servicios: {
        Row: {
          id: string
          empresa_id: string
          codigo: string
          nombre: string
          descripcion: string | null
          categoria_id: string | null
          tipo_servicio: string
          unidad_medida: string
          tarifa_estandar: number
          moneda_id: string
          sla_plan_id: string | null
          requiere_aprobacion_cotizacion: boolean
          fecha_vigencia_desde: string | null
          fecha_vigencia_hasta: string | null
          activo: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          empresa_id: string
          codigo: string
          nombre: string
          descripcion?: string | null
          categoria_id?: string | null
          tipo_servicio: string
          unidad_medida: string
          tarifa_estandar: number
          moneda_id: string
          sla_plan_id?: string | null
          requiere_aprobacion_cotizacion?: boolean
          fecha_vigencia_desde?: string | null
          fecha_vigencia_hasta?: string | null
          activo?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          empresa_id?: string
          codigo?: string
          nombre?: string
          descripcion?: string | null
          categoria_id?: string | null
          tipo_servicio?: string
          unidad_medida?: string
          tarifa_estandar?: number
          moneda_id?: string
          sla_plan_id?: string | null
          requiere_aprobacion_cotizacion?: boolean
          fecha_vigencia_desde?: string | null
          fecha_vigencia_hasta?: string | null
          activo?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      catalogos_valores: {
        Row: {
          id: string
          empresa_id: string
          catalogo: string
          codigo: string
          etiqueta: string
          orden: number
          activo: boolean
        }
        Insert: {
          id?: string
          empresa_id: string
          catalogo: string
          codigo: string
          etiqueta: string
          orden?: number
          activo?: boolean
        }
        Update: {
          id?: string
          empresa_id?: string
          catalogo?: string
          codigo?: string
          etiqueta?: string
          orden?: number
          activo?: boolean
        }
      }
      categorias_servicio: {
        Row: {
          id: string
          empresa_id: string
          nombre: string
          descripcion: string | null
          categoria_padre_id: string | null
          activo: boolean
        }
        Insert: {
          id?: string
          empresa_id: string
          nombre: string
          descripcion?: string | null
          categoria_padre_id?: string | null
          activo?: boolean
        }
        Update: {
          id?: string
          empresa_id?: string
          nombre?: string
          descripcion?: string | null
          categoria_padre_id?: string | null
          activo?: boolean
        }
      }
      change_requests: {
        Row: {
          id: string
          numero_cr: string
          proyecto_id: string
          contrato_id: string
          titulo: string
          descripcion_cambio: string
          tipo_cambio: string
          justificacion: string | null
          impacto_horas: number | null
          impacto_costo: number | null
          impacto_valor_contrato: number | null
          impacto_fecha_fin_dias: number | null
          estado_id: string
          solicitado_por_contacto_id: string | null
          solicitado_por_usuario_id: string | null
          fecha_solicitud: string
          aprobador_interno_id: string | null
          fecha_aprobacion_interna: string | null
          aprobador_cliente_contacto_id: string | null
          fecha_aprobacion_cliente: string | null
          documento_addenda_url: string | null
          fecha_efectiva: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          numero_cr: string
          proyecto_id: string
          contrato_id: string
          titulo: string
          descripcion_cambio: string
          tipo_cambio: string
          justificacion?: string | null
          impacto_horas?: number | null
          impacto_costo?: number | null
          impacto_valor_contrato?: number | null
          impacto_fecha_fin_dias?: number | null
          estado_id: string
          solicitado_por_contacto_id?: string | null
          solicitado_por_usuario_id?: string | null
          fecha_solicitud?: string
          aprobador_interno_id?: string | null
          fecha_aprobacion_interna?: string | null
          aprobador_cliente_contacto_id?: string | null
          fecha_aprobacion_cliente?: string | null
          documento_addenda_url?: string | null
          fecha_efectiva?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          numero_cr?: string
          proyecto_id?: string
          contrato_id?: string
          titulo?: string
          descripcion_cambio?: string
          tipo_cambio?: string
          justificacion?: string | null
          impacto_horas?: number | null
          impacto_costo?: number | null
          impacto_valor_contrato?: number | null
          impacto_fecha_fin_dias?: number | null
          estado_id?: string
          solicitado_por_contacto_id?: string | null
          solicitado_por_usuario_id?: string | null
          fecha_solicitud?: string
          aprobador_interno_id?: string | null
          fecha_aprobacion_interna?: string | null
          aprobador_cliente_contacto_id?: string | null
          fecha_aprobacion_cliente?: string | null
          documento_addenda_url?: string | null
          fecha_efectiva?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      checklist_liquidacion_items: {
        Row: {
          id: string
          checklist_proyecto_id: string
          plantilla_item_id: string
          cumplido: boolean
          fecha_cumplimiento: string | null
          verificado_por_usuario_id: string | null
          evidencia_url: string | null
          comentario: string | null
        }
        Insert: {
          id?: string
          checklist_proyecto_id: string
          plantilla_item_id: string
          cumplido?: boolean
          fecha_cumplimiento?: string | null
          verificado_por_usuario_id?: string | null
          evidencia_url?: string | null
          comentario?: string | null
        }
        Update: {
          id?: string
          checklist_proyecto_id?: string
          plantilla_item_id?: string
          cumplido?: boolean
          fecha_cumplimiento?: string | null
          verificado_por_usuario_id?: string | null
          evidencia_url?: string | null
          comentario?: string | null
        }
      }
      checklist_liquidacion_plantilla_items: {
        Row: {
          id: string
          plantilla_id: string
          orden: number
          descripcion_item: string
          tipo_verificacion: string
          obligatorio: boolean
        }
        Insert: {
          id?: string
          plantilla_id: string
          orden?: number
          descripcion_item: string
          tipo_verificacion: string
          obligatorio?: boolean
        }
        Update: {
          id?: string
          plantilla_id?: string
          orden?: number
          descripcion_item?: string
          tipo_verificacion?: string
          obligatorio?: boolean
        }
      }
      checklist_liquidacion_plantillas: {
        Row: {
          id: string
          empresa_id: string
          nombre: string
          descripcion: string | null
          activo: boolean
        }
        Insert: {
          id?: string
          empresa_id: string
          nombre: string
          descripcion?: string | null
          activo?: boolean
        }
        Update: {
          id?: string
          empresa_id?: string
          nombre?: string
          descripcion?: string | null
          activo?: boolean
        }
      }
      checklist_liquidacion_proyecto: {
        Row: {
          id: string
          proyecto_id: string
          plantilla_id: string
          responsable_id: string
          fecha_inicio_liquidacion: string
          fecha_completado: string | null
          estado: string
          porcentaje_completado: number | null
        }
        Insert: {
          id?: string
          proyecto_id: string
          plantilla_id: string
          responsable_id: string
          fecha_inicio_liquidacion?: string
          fecha_completado?: string | null
          estado?: string
          porcentaje_completado?: number | null
        }
        Update: {
          id?: string
          proyecto_id?: string
          plantilla_id?: string
          responsable_id?: string
          fecha_inicio_liquidacion?: string
          fecha_completado?: string | null
          estado?: string
          porcentaje_completado?: number | null
        }
      }
      contactos: {
        Row: {
          id: string
          cuenta_id: string
          nombre: string
          apellido: string | null
          cargo: string | null
          email: string | null
          telefono: string | null
          celular: string | null
          canal_preferido: string | null
          es_contacto_principal: boolean
          es_firmante_autorizado: boolean
          activo: boolean
          notas: string | null
        }
        Insert: {
          id?: string
          cuenta_id: string
          nombre: string
          apellido?: string | null
          cargo?: string | null
          email?: string | null
          telefono?: string | null
          celular?: string | null
          canal_preferido?: string | null
          es_contacto_principal?: boolean
          es_firmante_autorizado?: boolean
          activo?: boolean
          notas?: string | null
        }
        Update: {
          id?: string
          cuenta_id?: string
          nombre?: string
          apellido?: string | null
          cargo?: string | null
          email?: string | null
          telefono?: string | null
          celular?: string | null
          canal_preferido?: string | null
          es_contacto_principal?: boolean
          es_firmante_autorizado?: boolean
          activo?: boolean
          notas?: string | null
        }
      }
      contratos: {
        Row: {
          id: string
          empresa_id: string
          numero_contrato: string
          cotizacion_origen_id: string | null
          cuenta_id: string
          contacto_firmante_id: string | null
          tipo_contrato: string
          estado_id: string
          fecha_firma: string | null
          fecha_inicio: string
          fecha_fin_estimada: string | null
          fecha_fin_real: string | null
          moneda_id: string
          valor_total_contratado: number
          forma_pago: string | null
          plazo_pago_dias: number | null
          responsable_comercial_id: string
          responsable_pm_id: string | null
          archivo_contrato_url: string | null
          clausulas_especiales: string | null
          deleted_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          empresa_id: string
          numero_contrato: string
          cotizacion_origen_id?: string | null
          cuenta_id: string
          contacto_firmante_id?: string | null
          tipo_contrato: string
          estado_id: string
          fecha_firma?: string | null
          fecha_inicio: string
          fecha_fin_estimada?: string | null
          fecha_fin_real?: string | null
          moneda_id: string
          valor_total_contratado: number
          forma_pago?: string | null
          plazo_pago_dias?: number | null
          responsable_comercial_id: string
          responsable_pm_id?: string | null
          archivo_contrato_url?: string | null
          clausulas_especiales?: string | null
          deleted_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          empresa_id?: string
          numero_contrato?: string
          cotizacion_origen_id?: string | null
          cuenta_id?: string
          contacto_firmante_id?: string | null
          tipo_contrato?: string
          estado_id?: string
          fecha_firma?: string | null
          fecha_inicio?: string
          fecha_fin_estimada?: string | null
          fecha_fin_real?: string | null
          moneda_id?: string
          valor_total_contratado?: number
          forma_pago?: string | null
          plazo_pago_dias?: number | null
          responsable_comercial_id?: string
          responsable_pm_id?: string | null
          archivo_contrato_url?: string | null
          clausulas_especiales?: string | null
          deleted_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      cotizaciones: {
        Row: {
          id: string
          empresa_id: string
          numero_cotizacion: string
          oportunidad_id: string | null
          cuenta_id: string
          contacto_id: string | null
          version: number
          cotizacion_origen_id: string | null
          estado_id: string
          fecha_emision: string
          fecha_validez_hasta: string
          moneda_id: string
          subtotal: number
          descuento_pct: number | null
          descuento_valor: number | null
          impuestos_pct: number | null
          impuestos_valor: number | null
          total: number
          condiciones_pago: string | null
          condiciones_comerciales: string | null
          tiempo_estimado_entrega: string | null
          responsable_comercial_id: string
          fecha_envio: string | null
          fecha_respuesta_cliente: string | null
          motivo_rechazo: string | null
          archivo_pdf_url: string | null
          proyecto_generado_id: string | null
          fecha_conversion: string | null
          convertido_por_usuario_id: string | null
          deleted_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          empresa_id: string
          numero_cotizacion: string
          oportunidad_id?: string | null
          cuenta_id: string
          contacto_id?: string | null
          version?: number
          cotizacion_origen_id?: string | null
          estado_id: string
          fecha_emision?: string
          fecha_validez_hasta: string
          moneda_id: string
          subtotal?: number
          descuento_pct?: number | null
          descuento_valor?: number | null
          impuestos_pct?: number | null
          impuestos_valor?: number | null
          total?: number
          condiciones_pago?: string | null
          condiciones_comerciales?: string | null
          tiempo_estimado_entrega?: string | null
          responsable_comercial_id: string
          fecha_envio?: string | null
          fecha_respuesta_cliente?: string | null
          motivo_rechazo?: string | null
          archivo_pdf_url?: string | null
          proyecto_generado_id?: string | null
          fecha_conversion?: string | null
          convertido_por_usuario_id?: string | null
          deleted_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          empresa_id?: string
          numero_cotizacion?: string
          oportunidad_id?: string | null
          cuenta_id?: string
          contacto_id?: string | null
          version?: number
          cotizacion_origen_id?: string | null
          estado_id?: string
          fecha_emision?: string
          fecha_validez_hasta?: string
          moneda_id?: string
          subtotal?: number
          descuento_pct?: number | null
          descuento_valor?: number | null
          impuestos_pct?: number | null
          impuestos_valor?: number | null
          total?: number
          condiciones_pago?: string | null
          condiciones_comerciales?: string | null
          tiempo_estimado_entrega?: string | null
          responsable_comercial_id?: string
          fecha_envio?: string | null
          fecha_respuesta_cliente?: string | null
          motivo_rechazo?: string | null
          archivo_pdf_url?: string | null
          proyecto_generado_id?: string | null
          fecha_conversion?: string | null
          convertido_por_usuario_id?: string | null
          deleted_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      cotizaciones_aprobaciones: {
        Row: {
          id: string
          cotizacion_id: string
          nivel_aprobacion: number
          aprobador_id: string
          estado: string
          fecha_solicitud: string
          fecha_resolucion: string | null
          comentario: string | null
        }
        Insert: {
          id?: string
          cotizacion_id: string
          nivel_aprobacion?: number
          aprobador_id: string
          estado?: string
          fecha_solicitud?: string
          fecha_resolucion?: string | null
          comentario?: string | null
        }
        Update: {
          id?: string
          cotizacion_id?: string
          nivel_aprobacion?: number
          aprobador_id?: string
          estado?: string
          fecha_solicitud?: string
          fecha_resolucion?: string | null
          comentario?: string | null
        }
      }
      cotizaciones_detalle: {
        Row: {
          id: string
          cotizacion_id: string
          tipo_item: string
          servicio_id: string | null
          rol_tarifa_id: string | null
          paquete_id: string | null
          licencia_catalogo_id: string | null
          descripcion: string
          cantidad: number
          unidad_medida: string
          precio_unitario: number
          descuento_linea_pct: number | null
          subtotal_linea: number
          orden: number
        }
        Insert: {
          id?: string
          cotizacion_id: string
          tipo_item: string
          servicio_id?: string | null
          rol_tarifa_id?: string | null
          paquete_id?: string | null
          licencia_catalogo_id?: string | null
          descripcion: string
          cantidad?: number
          unidad_medida: string
          precio_unitario: number
          descuento_linea_pct?: number | null
          subtotal_linea: number
          orden?: number
        }
        Update: {
          id?: string
          cotizacion_id?: string
          tipo_item?: string
          servicio_id?: string | null
          rol_tarifa_id?: string | null
          paquete_id?: string | null
          licencia_catalogo_id?: string | null
          descripcion?: string
          cantidad?: number
          unidad_medida?: string
          precio_unitario?: number
          descuento_linea_pct?: number | null
          subtotal_linea?: number
          orden?: number
        }
      }
      cuentas_clientes: {
        Row: {
          id: string
          empresa_id: string
          razon_social: string
          nombre_comercial: string | null
          tipo_identificacion: string
          numero_identificacion: string
          cuenta_padre_id: string | null
          sector_industria: string | null
          tamano_empresa: string | null
          sitio_web: string | null
          direccion_facturacion: string | null
          ciudad: string | null
          pais: string | null
          telefono_principal: string | null
          email_principal: string | null
          moneda_preferida_id: string | null
          ejecutivo_comercial_id: string | null
          origen_captacion: string | null
          estado: string
          notas: string | null
          deleted_at: string | null
          created_at: string
          created_by: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          id?: string
          empresa_id: string
          razon_social: string
          nombre_comercial?: string | null
          tipo_identificacion: string
          numero_identificacion: string
          cuenta_padre_id?: string | null
          sector_industria?: string | null
          tamano_empresa?: string | null
          sitio_web?: string | null
          direccion_facturacion?: string | null
          ciudad?: string | null
          pais?: string | null
          telefono_principal?: string | null
          email_principal?: string | null
          moneda_preferida_id?: string | null
          ejecutivo_comercial_id?: string | null
          origen_captacion?: string | null
          estado?: string
          notas?: string | null
          deleted_at?: string | null
          created_at?: string
          created_by?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          id?: string
          empresa_id?: string
          razon_social?: string
          nombre_comercial?: string | null
          tipo_identificacion?: string
          numero_identificacion?: string
          cuenta_padre_id?: string | null
          sector_industria?: string | null
          tamano_empresa?: string | null
          sitio_web?: string | null
          direccion_facturacion?: string | null
          ciudad?: string | null
          pais?: string | null
          telefono_principal?: string | null
          email_principal?: string | null
          moneda_preferida_id?: string | null
          ejecutivo_comercial_id?: string | null
          origen_captacion?: string | null
          estado?: string
          notas?: string | null
          deleted_at?: string | null
          created_at?: string
          created_by?: string | null
          updated_at?: string
          updated_by?: string | null
        }
      }
      disponibilidad_recursos: {
        Row: {
          id: string
          recurso_id: string
          fecha: string
          horas_disponibles: number
        }
        Insert: {
          id?: string
          recurso_id: string
          fecha: string
          horas_disponibles?: number
        }
        Update: {
          id?: string
          recurso_id?: string
          fecha?: string
          horas_disponibles?: number
        }
      }
      empresas: {
        Row: {
          id: string
          razon_social: string
          nombre_comercial: string | null
          tipo_identificacion: string
          numero_identificacion: string
          digito_verificacion: string | null
          direccion: string | null
          ciudad: string | null
          pais: string
          telefono: string | null
          email_corporativo: string | null
          sitio_web: string | null
          moneda_principal_id: string | null
          zona_horaria: string
          idioma_por_defecto: string
          formato_fecha: string
          formato_hora: string
          separador_miles: string
          separador_decimal: string
          primer_dia_semana: number
          logo_url_claro: string | null
          logo_url_oscuro: string | null
          pie_pagina_documentos: string | null
          activa: boolean
          predeterminada: boolean
          created_at: string
          created_by: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          id?: string
          razon_social: string
          nombre_comercial?: string | null
          tipo_identificacion: string
          numero_identificacion: string
          digito_verificacion?: string | null
          direccion?: string | null
          ciudad?: string | null
          pais: string
          telefono?: string | null
          email_corporativo?: string | null
          sitio_web?: string | null
          moneda_principal_id?: string | null
          zona_horaria?: string
          idioma_por_defecto?: string
          formato_fecha?: string
          formato_hora?: string
          separador_miles?: string
          separador_decimal?: string
          primer_dia_semana?: number
          logo_url_claro?: string | null
          logo_url_oscuro?: string | null
          pie_pagina_documentos?: string | null
          activa?: boolean
          predeterminada?: boolean
          created_at?: string
          created_by?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          id?: string
          razon_social?: string
          nombre_comercial?: string | null
          tipo_identificacion?: string
          numero_identificacion?: string
          digito_verificacion?: string | null
          direccion?: string | null
          ciudad?: string | null
          pais?: string
          telefono?: string | null
          email_corporativo?: string | null
          sitio_web?: string | null
          moneda_principal_id?: string | null
          zona_horaria?: string
          idioma_por_defecto?: string
          formato_fecha?: string
          formato_hora?: string
          separador_miles?: string
          separador_decimal?: string
          primer_dia_semana?: number
          logo_url_claro?: string | null
          logo_url_oscuro?: string | null
          pie_pagina_documentos?: string | null
          activa?: boolean
          predeterminada?: boolean
          created_at?: string
          created_by?: string | null
          updated_at?: string
          updated_by?: string | null
        }
      }
      estados_ciclo_vida: {
        Row: {
          id: string
          empresa_id: string
          entidad_aplicable: string
          codigo_estado: string
          etiqueta: string
          orden: number
          es_estado_inicial: boolean
          es_estado_final: boolean
          color_ui: string | null
          activo: boolean
        }
        Insert: {
          id?: string
          empresa_id: string
          entidad_aplicable: string
          codigo_estado: string
          etiqueta: string
          orden?: number
          es_estado_inicial?: boolean
          es_estado_final?: boolean
          color_ui?: string | null
          activo?: boolean
        }
        Update: {
          id?: string
          empresa_id?: string
          entidad_aplicable?: string
          codigo_estado?: string
          etiqueta?: string
          orden?: number
          es_estado_inicial?: boolean
          es_estado_final?: boolean
          color_ui?: string | null
          activo?: boolean
        }
      }
      evaluaciones_proveedor: {
        Row: {
          id: string
          proveedor_id: string
          proyecto_id: string | null
          fecha_evaluacion: string
          calificacion: number
          criterios: Json | null
          comentarios: string | null
          evaluado_por_usuario_id: string
        }
        Insert: {
          id?: string
          proveedor_id: string
          proyecto_id?: string | null
          fecha_evaluacion?: string
          calificacion: number
          criterios?: Json | null
          comentarios?: string | null
          evaluado_por_usuario_id: string
        }
        Update: {
          id?: string
          proveedor_id?: string
          proyecto_id?: string | null
          fecha_evaluacion?: string
          calificacion?: number
          criterios?: Json | null
          comentarios?: string | null
          evaluado_por_usuario_id?: string
        }
      }
      facturas_referencia_externa: {
        Row: {
          id: string
          proyecto_id: string | null
          contrato_id: string | null
          numero_factura_externa: string
          sistema_origen: string
          fecha_emision: string
          fecha_vencimiento_pago: string | null
          moneda_id: string
          monto_subtotal: number | null
          monto_impuestos: number | null
          monto_total: number
          estado_pago: string
          monto_pagado_acumulado: number | null
          fecha_ultimo_pago: string | null
          hito_asociado_id: string | null
          metodo_registro: string
          registrado_por_usuario_id: string | null
          adjunto_url: string | null
          notas: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          proyecto_id?: string | null
          contrato_id?: string | null
          numero_factura_externa: string
          sistema_origen: string
          fecha_emision: string
          fecha_vencimiento_pago?: string | null
          moneda_id: string
          monto_subtotal?: number | null
          monto_impuestos?: number | null
          monto_total: number
          estado_pago?: string
          monto_pagado_acumulado?: number | null
          fecha_ultimo_pago?: string | null
          hito_asociado_id?: string | null
          metodo_registro?: string
          registrado_por_usuario_id?: string | null
          adjunto_url?: string | null
          notas?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          proyecto_id?: string | null
          contrato_id?: string | null
          numero_factura_externa?: string
          sistema_origen?: string
          fecha_emision?: string
          fecha_vencimiento_pago?: string | null
          moneda_id?: string
          monto_subtotal?: number | null
          monto_impuestos?: number | null
          monto_total?: number
          estado_pago?: string
          monto_pagado_acumulado?: number | null
          fecha_ultimo_pago?: string | null
          hito_asociado_id?: string | null
          metodo_registro?: string
          registrado_por_usuario_id?: string | null
          adjunto_url?: string | null
          notas?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      garantia_extensiones: {
        Row: {
          id: string
          garantia_id: string
          fecha_extension: string
          meses_adicionales: number
          motivo: string | null
          valor_adicional: number | null
          aprobado_por_usuario_id: string | null
        }
        Insert: {
          id?: string
          garantia_id: string
          fecha_extension?: string
          meses_adicionales: number
          motivo?: string | null
          valor_adicional?: number | null
          aprobado_por_usuario_id?: string | null
        }
        Update: {
          id?: string
          garantia_id?: string
          fecha_extension?: string
          meses_adicionales?: number
          motivo?: string | null
          valor_adicional?: number | null
          aprobado_por_usuario_id?: string | null
        }
      }
      garantias_contractuales: {
        Row: {
          id: string
          proyecto_id: string | null
          contrato_id: string | null
          fecha_inicio_garantia: string
          duracion_meses: number
          fecha_fin_garantia: string
          alcance_garantia: string | null
          condiciones_exclusiones: string | null
          estado: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          proyecto_id?: string | null
          contrato_id?: string | null
          fecha_inicio_garantia: string
          duracion_meses: number
          fecha_fin_garantia: string
          alcance_garantia?: string | null
          condiciones_exclusiones?: string | null
          estado?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          proyecto_id?: string | null
          contrato_id?: string | null
          fecha_inicio_garantia?: string
          duracion_meses?: number
          fecha_fin_garantia?: string
          alcance_garantia?: string | null
          condiciones_exclusiones?: string | null
          estado?: string
          created_at?: string
          updated_at?: string
        }
      }
      hitos_criterios_aceptacion: {
        Row: {
          id: string
          hito_id: string
          criterio: string
          cumplido: boolean
          verificado_por: string | null
          fecha_verificacion: string | null
        }
        Insert: {
          id?: string
          hito_id: string
          criterio: string
          cumplido?: boolean
          verificado_por?: string | null
          fecha_verificacion?: string | null
        }
        Update: {
          id?: string
          hito_id?: string
          criterio?: string
          cumplido?: boolean
          verificado_por?: string | null
          fecha_verificacion?: string | null
        }
      }
      hitos_entregables: {
        Row: {
          id: string
          proyecto_id: string
          numero_entregable: string
          nombre: string
          descripcion: string | null
          fase_orden: number
          fecha_planeada_entrega: string
          fecha_real_entrega: string | null
          condiciones_aceptacion: string | null
          estado: string
          responsable_id: string
          porcentaje_facturacion_asociado: number | null
          valor_hito: number | null
          aprobador_cliente_contacto_id: string | null
          fecha_aprobacion_cliente: string | null
          firma_aceptacion_url: string | null
          notas_rechazo: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          proyecto_id: string
          numero_entregable: string
          nombre: string
          descripcion?: string | null
          fase_orden?: number
          fecha_planeada_entrega: string
          fecha_real_entrega?: string | null
          condiciones_aceptacion?: string | null
          estado?: string
          responsable_id: string
          porcentaje_facturacion_asociado?: number | null
          valor_hito?: number | null
          aprobador_cliente_contacto_id?: string | null
          fecha_aprobacion_cliente?: string | null
          firma_aceptacion_url?: string | null
          notas_rechazo?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          proyecto_id?: string
          numero_entregable?: string
          nombre?: string
          descripcion?: string | null
          fase_orden?: number
          fecha_planeada_entrega?: string
          fecha_real_entrega?: string | null
          condiciones_aceptacion?: string | null
          estado?: string
          responsable_id?: string
          porcentaje_facturacion_asociado?: number | null
          valor_hito?: number | null
          aprobador_cliente_contacto_id?: string | null
          fecha_aprobacion_cliente?: string | null
          firma_aceptacion_url?: string | null
          notas_rechazo?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      integraciones_config: {
        Row: {
          id: string
          empresa_id: string
          nombre: string
          tipo: string
          proveedor: string | null
          habilitada: boolean
          url_base: string | null
          metodo_autenticacion: string
          credenciales_ref: string | null
          configuracion_adicional: Json | null
          estado_ultima_conexion: string
          fecha_ultima_conexion_ok: string | null
          activo: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          empresa_id: string
          nombre: string
          tipo: string
          proveedor?: string | null
          habilitada?: boolean
          url_base?: string | null
          metodo_autenticacion?: string
          credenciales_ref?: string | null
          configuracion_adicional?: Json | null
          estado_ultima_conexion?: string
          fecha_ultima_conexion_ok?: string | null
          activo?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          empresa_id?: string
          nombre?: string
          tipo?: string
          proveedor?: string | null
          habilitada?: boolean
          url_base?: string | null
          metodo_autenticacion?: string
          credenciales_ref?: string | null
          configuracion_adicional?: Json | null
          estado_ultima_conexion?: string
          fecha_ultima_conexion_ok?: string | null
          activo?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      integraciones_log: {
        Row: {
          id: string
          integracion_id: string | null
          direccion: Database["public"]["Enums"]["direccion_integracion"]
          evento: string
          entidad_tipo: string | null
          entidad_id: string | null
          origen_resolucion: Database["public"]["Enums"]["origen_resolucion"]
          estado: string
          codigo_respuesta: string | null
          mensaje_error: string | null
          payload_resumen: Json | null
          intentos: number
          created_at: string
        }
        Insert: {
          id?: string
          integracion_id?: string | null
          direccion: Database["public"]["Enums"]["direccion_integracion"]
          evento: string
          entidad_tipo?: string | null
          entidad_id?: string | null
          origen_resolucion: Database["public"]["Enums"]["origen_resolucion"]
          estado: string
          codigo_respuesta?: string | null
          mensaje_error?: string | null
          payload_resumen?: Json | null
          intentos?: number
          created_at?: string
        }
        Update: {
          id?: string
          integracion_id?: string | null
          direccion?: Database["public"]["Enums"]["direccion_integracion"]
          evento?: string
          entidad_tipo?: string | null
          entidad_id?: string | null
          origen_resolucion?: Database["public"]["Enums"]["origen_resolucion"]
          estado?: string
          codigo_respuesta?: string | null
          mensaje_error?: string | null
          payload_resumen?: Json | null
          intentos?: number
          created_at?: string
        }
      }
      licencias_asignadas: {
        Row: {
          id: string
          licencia_catalogo_id: string
          cliente_id: string | null
          proyecto_id: string | null
          cantidad: number
          fecha_inicio: string
          fecha_fin_vigencia: string
          fecha_renovacion: string | null
          auto_renovar: boolean
          estado: string
          numero_orden_compra_proveedor: string | null
          costo_total_periodo: number | null
          precio_venta_periodo: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          licencia_catalogo_id: string
          cliente_id?: string | null
          proyecto_id?: string | null
          cantidad: number
          fecha_inicio: string
          fecha_fin_vigencia: string
          fecha_renovacion?: string | null
          auto_renovar?: boolean
          estado?: string
          numero_orden_compra_proveedor?: string | null
          costo_total_periodo?: number | null
          precio_venta_periodo?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          licencia_catalogo_id?: string
          cliente_id?: string | null
          proyecto_id?: string | null
          cantidad?: number
          fecha_inicio?: string
          fecha_fin_vigencia?: string
          fecha_renovacion?: string | null
          auto_renovar?: boolean
          estado?: string
          numero_orden_compra_proveedor?: string | null
          costo_total_periodo?: number | null
          precio_venta_periodo?: number | null
          created_at?: string
          updated_at?: string
        }
      }
      licencias_suscripciones_catalogo: {
        Row: {
          id: string
          empresa_id: string
          nombre_producto: string
          fabricante: string | null
          proveedor_id: string | null
          sku_proveedor: string | null
          tipo: string
          modelo_costo: string
          costo_unitario: number
          precio_venta_sugerido: number | null
          moneda_id: string
          periodicidad_facturacion: string
          activo: boolean
          notas: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          empresa_id: string
          nombre_producto: string
          fabricante?: string | null
          proveedor_id?: string | null
          sku_proveedor?: string | null
          tipo: string
          modelo_costo: string
          costo_unitario: number
          precio_venta_sugerido?: number | null
          moneda_id: string
          periodicidad_facturacion: string
          activo?: boolean
          notas?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          empresa_id?: string
          nombre_producto?: string
          fabricante?: string | null
          proveedor_id?: string | null
          sku_proveedor?: string | null
          tipo?: string
          modelo_costo?: string
          costo_unitario?: number
          precio_venta_sugerido?: number | null
          moneda_id?: string
          periodicidad_facturacion?: string
          activo?: boolean
          notas?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      log_auditoria: {
        Row: {
          id: string
          tabla_afectada: string
          registro_id: string
          operacion: Database["public"]["Enums"]["operacion_auditoria"]
          usuario_id: string | null
          empresa_id: string | null
          valores_anteriores: Json | null
          valores_nuevos: Json | null
          campos_modificados: string[] | null
          ip_origen: string | null
          user_agent: string | null
          fecha_hora: string
        }
        Insert: {
          id?: string
          tabla_afectada: string
          registro_id: string
          operacion: Database["public"]["Enums"]["operacion_auditoria"]
          usuario_id?: string | null
          empresa_id?: string | null
          valores_anteriores?: Json | null
          valores_nuevos?: Json | null
          campos_modificados?: string[] | null
          ip_origen?: string | null
          user_agent?: string | null
          fecha_hora?: string
        }
        Update: {
          id?: string
          tabla_afectada?: string
          registro_id?: string
          operacion?: Database["public"]["Enums"]["operacion_auditoria"]
          usuario_id?: string | null
          empresa_id?: string | null
          valores_anteriores?: Json | null
          valores_nuevos?: Json | null
          campos_modificados?: string[] | null
          ip_origen?: string | null
          user_agent?: string | null
          fecha_hora?: string
        }
      }
      monedas: {
        Row: {
          id: string
          codigo_iso: string
          nombre: string
          simbolo: string
          decimales: number
          activa: boolean
        }
        Insert: {
          id?: string
          codigo_iso: string
          nombre: string
          simbolo: string
          decimales?: number
          activa?: boolean
        }
        Update: {
          id?: string
          codigo_iso?: string
          nombre?: string
          simbolo?: string
          decimales?: number
          activa?: boolean
        }
      }
      notificaciones_enviadas: {
        Row: {
          id: string
          regla_id: string
          entidad_tipo: string
          entidad_id: string
          destinatario: string
          destinatario_usuario_id: string | null
          canal: string
          estado_envio: string
          detalle_error: string | null
          intentos: number
          fecha_envio: string | null
          leida: boolean
          leida_at: string | null
          asunto: string | null
          cuerpo: string | null
          created_at: string
        }
        Insert: {
          id?: string
          regla_id: string
          entidad_tipo: string
          entidad_id: string
          destinatario: string
          destinatario_usuario_id?: string | null
          canal: string
          estado_envio?: string
          detalle_error?: string | null
          intentos?: number
          fecha_envio?: string | null
          leida?: boolean
          leida_at?: string | null
          asunto?: string | null
          cuerpo?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          regla_id?: string
          entidad_tipo?: string
          entidad_id?: string
          destinatario?: string
          destinatario_usuario_id?: string | null
          canal?: string
          estado_envio?: string
          detalle_error?: string | null
          intentos?: number
          fecha_envio?: string | null
          leida?: boolean
          leida_at?: string | null
          asunto?: string | null
          cuerpo?: string | null
          created_at?: string
        }
      }
      oportunidades: {
        Row: {
          id: string
          empresa_id: string
          codigo: string
          cuenta_id: string
          contacto_id: string | null
          nombre_oportunidad: string
          descripcion: string | null
          etapa: string
          probabilidad_cierre_pct: number | null
          valor_estimado: number | null
          moneda_id: string | null
          fecha_estimada_cierre: string | null
          fecha_cierre_real: string | null
          motivo_perdida_id: string | null
          motivo_perdida_detalle: string | null
          origen_oportunidad: string | null
          ejecutivo_comercial_id: string
          proxima_accion: string | null
          fecha_proxima_accion: string | null
          deleted_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          empresa_id: string
          codigo: string
          cuenta_id: string
          contacto_id?: string | null
          nombre_oportunidad: string
          descripcion?: string | null
          etapa?: string
          probabilidad_cierre_pct?: number | null
          valor_estimado?: number | null
          moneda_id?: string | null
          fecha_estimada_cierre?: string | null
          fecha_cierre_real?: string | null
          motivo_perdida_id?: string | null
          motivo_perdida_detalle?: string | null
          origen_oportunidad?: string | null
          ejecutivo_comercial_id: string
          proxima_accion?: string | null
          fecha_proxima_accion?: string | null
          deleted_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          empresa_id?: string
          codigo?: string
          cuenta_id?: string
          contacto_id?: string | null
          nombre_oportunidad?: string
          descripcion?: string | null
          etapa?: string
          probabilidad_cierre_pct?: number | null
          valor_estimado?: number | null
          moneda_id?: string | null
          fecha_estimada_cierre?: string | null
          fecha_cierre_real?: string | null
          motivo_perdida_id?: string | null
          motivo_perdida_detalle?: string | null
          origen_oportunidad?: string | null
          ejecutivo_comercial_id?: string
          proxima_accion?: string | null
          fecha_proxima_accion?: string | null
          deleted_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      oportunidades_seguimiento: {
        Row: {
          id: string
          oportunidad_id: string
          tipo_actividad: string
          fecha: string
          usuario_id: string
          descripcion: string
          resultado: string | null
        }
        Insert: {
          id?: string
          oportunidad_id: string
          tipo_actividad: string
          fecha?: string
          usuario_id: string
          descripcion: string
          resultado?: string | null
        }
        Update: {
          id?: string
          oportunidad_id?: string
          tipo_actividad?: string
          fecha?: string
          usuario_id?: string
          descripcion?: string
          resultado?: string | null
        }
      }
      ordenes_costo_subcontratacion: {
        Row: {
          id: string
          numero_orden: string
          proveedor_id: string
          proyecto_id: string
          contrato_id: string | null
          concepto: string
          tipo_costo: string
          fecha_orden: string
          fecha_inicio_servicio: string | null
          fecha_fin_servicio: string | null
          cantidad: number
          unidad_medida: string
          valor_unitario: number
          moneda_id: string
          valor_total: number
          estado_id: string
          aprobador_interno_id: string | null
          fecha_aprobacion: string | null
          factura_proveedor_numero: string | null
          factura_proveedor_fecha: string | null
          factura_proveedor_url: string | null
          notas: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          numero_orden: string
          proveedor_id: string
          proyecto_id: string
          contrato_id?: string | null
          concepto: string
          tipo_costo: string
          fecha_orden?: string
          fecha_inicio_servicio?: string | null
          fecha_fin_servicio?: string | null
          cantidad?: number
          unidad_medida: string
          valor_unitario: number
          moneda_id: string
          valor_total: number
          estado_id: string
          aprobador_interno_id?: string | null
          fecha_aprobacion?: string | null
          factura_proveedor_numero?: string | null
          factura_proveedor_fecha?: string | null
          factura_proveedor_url?: string | null
          notas?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          numero_orden?: string
          proveedor_id?: string
          proyecto_id?: string
          contrato_id?: string | null
          concepto?: string
          tipo_costo?: string
          fecha_orden?: string
          fecha_inicio_servicio?: string | null
          fecha_fin_servicio?: string | null
          cantidad?: number
          unidad_medida?: string
          valor_unitario?: number
          moneda_id?: string
          valor_total?: number
          estado_id?: string
          aprobador_interno_id?: string | null
          fecha_aprobacion?: string | null
          factura_proveedor_numero?: string | null
          factura_proveedor_fecha?: string | null
          factura_proveedor_url?: string | null
          notas?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      paquetes_servicios: {
        Row: {
          id: string
          empresa_id: string
          nombre: string
          descripcion: string | null
          precio_total_paquete: number
          moneda_id: string
          vigencia_desde: string | null
          vigencia_hasta: string | null
          activo: boolean
        }
        Insert: {
          id?: string
          empresa_id: string
          nombre: string
          descripcion?: string | null
          precio_total_paquete: number
          moneda_id: string
          vigencia_desde?: string | null
          vigencia_hasta?: string | null
          activo?: boolean
        }
        Update: {
          id?: string
          empresa_id?: string
          nombre?: string
          descripcion?: string | null
          precio_total_paquete?: number
          moneda_id?: string
          vigencia_desde?: string | null
          vigencia_hasta?: string | null
          activo?: boolean
        }
      }
      paquetes_servicios_detalle: {
        Row: {
          id: string
          paquete_id: string
          servicio_id: string | null
          rol_tarifa_id: string | null
          cantidad: number
          precio_unitario_paquete: number
          orden: number
        }
        Insert: {
          id?: string
          paquete_id: string
          servicio_id?: string | null
          rol_tarifa_id?: string | null
          cantidad: number
          precio_unitario_paquete: number
          orden?: number
        }
        Update: {
          id?: string
          paquete_id?: string
          servicio_id?: string | null
          rol_tarifa_id?: string | null
          cantidad?: number
          precio_unitario_paquete?: number
          orden?: number
        }
      }
      perfiles_usuario: {
        Row: {
          id: string
          empresa_id: string
          rol_id: string
          nombre_completo: string
          cargo: string | null
          telefono: string | null
          avatar_url: string | null
          tipo_vinculacion: string
          fecha_ingreso: string | null
          activo: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          empresa_id: string
          rol_id: string
          nombre_completo: string
          cargo?: string | null
          telefono?: string | null
          avatar_url?: string | null
          tipo_vinculacion?: string
          fecha_ingreso?: string | null
          activo?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          empresa_id?: string
          rol_id?: string
          nombre_completo?: string
          cargo?: string | null
          telefono?: string | null
          avatar_url?: string | null
          tipo_vinculacion?: string
          fecha_ingreso?: string | null
          activo?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      permisos: {
        Row: {
          id: string
          rol_id: string
          modulo: string
          sublista: string | null
          puede_leer: boolean
          puede_crear: boolean
          puede_editar: boolean
          puede_eliminar: boolean
          puede_aprobar: boolean
          alcance: string
        }
        Insert: {
          id?: string
          rol_id: string
          modulo: string
          sublista?: string | null
          puede_leer?: boolean
          puede_crear?: boolean
          puede_editar?: boolean
          puede_eliminar?: boolean
          puede_aprobar?: boolean
          alcance?: string
        }
        Update: {
          id?: string
          rol_id?: string
          modulo?: string
          sublista?: string | null
          puede_leer?: boolean
          puede_crear?: boolean
          puede_editar?: boolean
          puede_eliminar?: boolean
          puede_aprobar?: boolean
          alcance?: string
        }
      }
      proveedores: {
        Row: {
          id: string
          empresa_id: string
          numero_proveedor: string
          tipo_proveedor: string
          razon_social_o_nombre: string
          tipo_identificacion: string | null
          numero_identificacion: string | null
          email: string | null
          telefono: string | null
          direccion: string | null
          pais: string | null
          categoria_id: string | null
          especialidad: string | null
          tarifa_referencia_hora: number | null
          moneda_id: string | null
          forma_pago_preferida: string | null
          plazo_pago_dias: number | null
          cuenta_bancaria_ref: string | null
          calificacion_desempeno_promedio: number | null
          estado: string
          documentos_legales_url: string | null
          fecha_vinculacion: string | null
          deleted_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          empresa_id: string
          numero_proveedor: string
          tipo_proveedor: string
          razon_social_o_nombre: string
          tipo_identificacion?: string | null
          numero_identificacion?: string | null
          email?: string | null
          telefono?: string | null
          direccion?: string | null
          pais?: string | null
          categoria_id?: string | null
          especialidad?: string | null
          tarifa_referencia_hora?: number | null
          moneda_id?: string | null
          forma_pago_preferida?: string | null
          plazo_pago_dias?: number | null
          cuenta_bancaria_ref?: string | null
          calificacion_desempeno_promedio?: number | null
          estado?: string
          documentos_legales_url?: string | null
          fecha_vinculacion?: string | null
          deleted_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          empresa_id?: string
          numero_proveedor?: string
          tipo_proveedor?: string
          razon_social_o_nombre?: string
          tipo_identificacion?: string | null
          numero_identificacion?: string | null
          email?: string | null
          telefono?: string | null
          direccion?: string | null
          pais?: string | null
          categoria_id?: string | null
          especialidad?: string | null
          tarifa_referencia_hora?: number | null
          moneda_id?: string | null
          forma_pago_preferida?: string | null
          plazo_pago_dias?: number | null
          cuenta_bancaria_ref?: string | null
          calificacion_desempeno_promedio?: number | null
          estado?: string
          documentos_legales_url?: string | null
          fecha_vinculacion?: string | null
          deleted_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      proyectos: {
        Row: {
          id: string
          empresa_id: string
          numero_proyecto: string
          contrato_id: string
          nombre_proyecto: string
          descripcion: string | null
          tipo_proyecto: string | null
          pm_id: string
          estado_id: string
          prioridad: string | null
          fecha_inicio_planeada: string
          fecha_fin_planeada: string
          fecha_inicio_real: string | null
          fecha_fin_real: string | null
          presupuesto_horas_total: number | null
          presupuesto_costo_total: number | null
          presupuesto_ingreso_total: number | null
          porcentaje_avance: number | null
          deleted_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          empresa_id: string
          numero_proyecto: string
          contrato_id: string
          nombre_proyecto: string
          descripcion?: string | null
          tipo_proyecto?: string | null
          pm_id: string
          estado_id: string
          prioridad?: string | null
          fecha_inicio_planeada: string
          fecha_fin_planeada: string
          fecha_inicio_real?: string | null
          fecha_fin_real?: string | null
          presupuesto_horas_total?: number | null
          presupuesto_costo_total?: number | null
          presupuesto_ingreso_total?: number | null
          porcentaje_avance?: number | null
          deleted_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          empresa_id?: string
          numero_proyecto?: string
          contrato_id?: string
          nombre_proyecto?: string
          descripcion?: string | null
          tipo_proyecto?: string | null
          pm_id?: string
          estado_id?: string
          prioridad?: string | null
          fecha_inicio_planeada?: string
          fecha_fin_planeada?: string
          fecha_inicio_real?: string | null
          fecha_fin_real?: string | null
          presupuesto_horas_total?: number | null
          presupuesto_costo_total?: number | null
          presupuesto_ingreso_total?: number | null
          porcentaje_avance?: number | null
          deleted_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      rentabilidad_snapshots: {
        Row: {
          id: string
          proyecto_id: string
          fecha_corte: string
          ingreso_reconocido: number
          costo_mano_obra: number
          costo_subcontratacion: number
          costo_licencias: number
          otros_costos: number | null
          margen_bruto: number
          margen_pct: number
          tipo_snapshot: string
          generado_por: string | null
          created_at: string
        }
        Insert: {
          id?: string
          proyecto_id: string
          fecha_corte: string
          ingreso_reconocido: number
          costo_mano_obra: number
          costo_subcontratacion?: number
          costo_licencias?: number
          otros_costos?: number | null
          margen_bruto: number
          margen_pct: number
          tipo_snapshot: string
          generado_por?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          proyecto_id?: string
          fecha_corte?: string
          ingreso_reconocido?: number
          costo_mano_obra?: number
          costo_subcontratacion?: number
          costo_licencias?: number
          otros_costos?: number | null
          margen_bruto?: number
          margen_pct?: number
          tipo_snapshot?: string
          generado_por?: string | null
          created_at?: string
        }
      }
      roles: {
        Row: {
          id: string
          empresa_id: string
          nombre: string
          descripcion: string | null
          es_rol_sistema: boolean
          activo: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          empresa_id: string
          nombre: string
          descripcion?: string | null
          es_rol_sistema?: boolean
          activo?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          empresa_id?: string
          nombre?: string
          descripcion?: string | null
          es_rol_sistema?: boolean
          activo?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      secuencias_numeracion: {
        Row: {
          id: string
          empresa_id: string
          codigo_secuencia: string
          tipo_documento: string
          prefijo: string | null
          sufijo: string | null
          longitud_ceros: number
          incluir_anio: boolean
          formato_anio: string | null
          incluir_mes: boolean
          formato_mes: string | null
          separador: string
          numero_inicial: number
          numero_actual: number
          reinicio: string
          fecha_ultimo_reinicio: string | null
          activo: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          empresa_id: string
          codigo_secuencia: string
          tipo_documento: string
          prefijo?: string | null
          sufijo?: string | null
          longitud_ceros?: number
          incluir_anio?: boolean
          formato_anio?: string | null
          incluir_mes?: boolean
          formato_mes?: string | null
          separador?: string
          numero_inicial?: number
          numero_actual?: number
          reinicio?: string
          fecha_ultimo_reinicio?: string | null
          activo?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          empresa_id?: string
          codigo_secuencia?: string
          tipo_documento?: string
          prefijo?: string | null
          sufijo?: string | null
          longitud_ceros?: number
          incluir_anio?: boolean
          formato_anio?: string | null
          incluir_mes?: boolean
          formato_mes?: string | null
          separador?: string
          numero_inicial?: number
          numero_actual?: number
          reinicio?: string
          fecha_ultimo_reinicio?: string | null
          activo?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      sla_niveles: {
        Row: {
          id: string
          sla_plan_id: string
          severidad: string
          tiempo_respuesta_horas: number
          tiempo_resolucion_horas: number
          horario_cobertura: string
          penalizacion_incumplimiento: string | null
          penalizacion_pct_credito: number | null
        }
        Insert: {
          id?: string
          sla_plan_id: string
          severidad: string
          tiempo_respuesta_horas: number
          tiempo_resolucion_horas: number
          horario_cobertura: string
          penalizacion_incumplimiento?: string | null
          penalizacion_pct_credito?: number | null
        }
        Update: {
          id?: string
          sla_plan_id?: string
          severidad?: string
          tiempo_respuesta_horas?: number
          tiempo_resolucion_horas?: number
          horario_cobertura?: string
          penalizacion_incumplimiento?: string | null
          penalizacion_pct_credito?: number | null
        }
      }
      sla_planes: {
        Row: {
          id: string
          empresa_id: string
          nombre: string
          descripcion: string | null
          activo: boolean
        }
        Insert: {
          id?: string
          empresa_id: string
          nombre: string
          descripcion?: string | null
          activo?: boolean
        }
        Update: {
          id?: string
          empresa_id?: string
          nombre?: string
          descripcion?: string | null
          activo?: boolean
        }
      }
      tasas_cambio: {
        Row: {
          id: string
          moneda_origen_id: string
          moneda_destino_id: string
          tasa: number
          fecha_vigencia: string
          fuente: string
          created_at: string
          created_by: string | null
        }
        Insert: {
          id?: string
          moneda_origen_id: string
          moneda_destino_id: string
          tasa: number
          fecha_vigencia: string
          fuente?: string
          created_at?: string
          created_by?: string | null
        }
        Update: {
          id?: string
          moneda_origen_id?: string
          moneda_destino_id?: string
          tasa?: number
          fecha_vigencia?: string
          fuente?: string
          created_at?: string
          created_by?: string | null
        }
      }
      timesheets: {
        Row: {
          id: string
          proyecto_id: string
          hito_id: string | null
          recurso_id: string
          fecha: string
          horas_registradas: number
          tipo_hora: string
          categoria_no_facturable_id: string | null
          rol_tarifa_id: string | null
          descripcion_actividad: string
          ubicacion_trabajo: string | null
          estado_aprobacion: string
          aprobador_id: string | null
          fecha_aprobacion: string | null
          comentario_rechazo: string | null
          facturado: boolean
          factura_referencia_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          proyecto_id: string
          hito_id?: string | null
          recurso_id: string
          fecha: string
          horas_registradas: number
          tipo_hora: string
          categoria_no_facturable_id?: string | null
          rol_tarifa_id?: string | null
          descripcion_actividad: string
          ubicacion_trabajo?: string | null
          estado_aprobacion?: string
          aprobador_id?: string | null
          fecha_aprobacion?: string | null
          comentario_rechazo?: string | null
          facturado?: boolean
          factura_referencia_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          proyecto_id?: string
          hito_id?: string | null
          recurso_id?: string
          fecha?: string
          horas_registradas?: number
          tipo_hora?: string
          categoria_no_facturable_id?: string | null
          rol_tarifa_id?: string | null
          descripcion_actividad?: string
          ubicacion_trabajo?: string | null
          estado_aprobacion?: string
          aprobador_id?: string | null
          fecha_aprobacion?: string | null
          comentario_rechazo?: string | null
          facturado?: boolean
          factura_referencia_id?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      webhooks_salientes: {
        Row: {
          id: string
          integracion_id: string
          evento: string
          url_destino: string
          metodo_http: string
          headers_adicionales: Json | null
          secreto_firma_ref: string | null
          activo: boolean
          created_at: string
        }
        Insert: {
          id?: string
          integracion_id: string
          evento: string
          url_destino: string
          metodo_http?: string
          headers_adicionales?: Json | null
          secreto_firma_ref?: string | null
          activo?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          integracion_id?: string
          evento?: string
          url_destino?: string
          metodo_http?: string
          headers_adicionales?: Json | null
          secreto_firma_ref?: string | null
          activo?: boolean
          created_at?: string
        }
      }
      workflows_historial: {
        Row: {
          id: string
          entidad_tipo: string
          entidad_id: string
          estado_anterior: string | null
          estado_nuevo: string
          usuario_id: string
          comentario: string | null
          fecha_transicion: string
        }
        Insert: {
          id?: string
          entidad_tipo: string
          entidad_id: string
          estado_anterior?: string | null
          estado_nuevo: string
          usuario_id: string
          comentario?: string | null
          fecha_transicion?: string
        }
        Update: {
          id?: string
          entidad_tipo?: string
          entidad_id?: string
          estado_anterior?: string | null
          estado_nuevo?: string
          usuario_id?: string
          comentario?: string | null
          fecha_transicion?: string
        }
      }
      workflows_transiciones: {
        Row: {
          id: string
          entidad_aplicable: string
          estado_origen_id: string
          estado_destino_id: string
          rol_permitido_id: string | null
          requiere_comentario: boolean
          requiere_aprobacion_doble: boolean
        }
        Insert: {
          id?: string
          entidad_aplicable: string
          estado_origen_id: string
          estado_destino_id: string
          rol_permitido_id?: string | null
          requiere_comentario?: boolean
          requiere_aprobacion_doble?: boolean
        }
        Update: {
          id?: string
          entidad_aplicable?: string
          estado_origen_id?: string
          estado_destino_id?: string
          rol_permitido_id?: string | null
          requiere_comentario?: boolean
          requiere_aprobacion_doble?: boolean
        }
      }
    }
    Views: {
      vista_rentabilidad_proyecto: {
        Row: {
          proyecto_id: string
          numero_proyecto: string
          presupuesto_ingreso_total: number | null
          costo_mano_obra: number
          costo_subcontratacion: number
          costo_licencias: number
          costo_total_actual: number
          margen_bruto_actual: number
        }
      }
    }
    Functions: {
      fn_generar_consecutivo: {
        Args: { p_codigo_secuencia: string; p_empresa_id: string }
        Returns: string
      }
      fn_empresa_actual: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      fn_tiene_permiso: {
        Args: { p_modulo: string; p_accion: string; p_sublista?: string | null }
        Returns: boolean
      }
      fn_listar_cuentas_basico: {
        Args: Record<PropertyKey, never>
        Returns: { id: string; razon_social: string }[]
      }
      fn_convertir_cotizacion_a_proyecto: {
        Args: {
          p_cotizacion_id: string
          p_tipo_contrato: string
          p_fecha_inicio_contrato: string
          p_contacto_firmante_id: string | null
          p_forma_pago: string | null
          p_plazo_pago_dias: number | null
          p_pm_id: string
          p_nombre_proyecto: string
          p_tipo_proyecto: string | null
          p_codigo_secuencia_proyecto: string
          p_fecha_inicio_planeada: string
          p_fecha_fin_planeada: string
        }
        Returns: string
      }
      fn_listar_rentabilidad_proyectos: {
        Args: Record<PropertyKey, never>
        Returns: {
          proyecto_id: string
          numero_proyecto: string
          presupuesto_ingreso_total: number | null
          costo_mano_obra: number
          costo_subcontratacion: number
          costo_licencias: number
          costo_total_actual: number
          margen_bruto_actual: number
        }[]
      }
    }
    Enums: {
      direccion_integracion: "ENTRANTE" | "SALIENTE"
      origen_resolucion: "AUTOMATICO" | "MANUAL"
      operacion_auditoria: "INSERT" | "UPDATE" | "DELETE"
    }
  }
}

export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"]

export type TablesInsert<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Insert"]

export type TablesUpdate<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Update"]

export type Enums<T extends keyof Database["public"]["Enums"]> =
  Database["public"]["Enums"][T]

export type ViewRow<T extends keyof Database["public"]["Views"]> =
  Database["public"]["Views"][T]["Row"]
