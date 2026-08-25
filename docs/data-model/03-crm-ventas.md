# Módulo: CRM y Ventas

Dependencias verificadas antes de esta etapa: `empresas`, `perfiles_usuario`,
`secuencias_numeracion`/`fn_generar_consecutivo`, `estados_ciclo_vida`/
`workflows_transiciones` (Etapa 1); `catalogo_servicios`, `catalogo_roles_tarifa`,
`paquetes_servicios`, `licencias_suscripciones_catalogo` (Etapa 2). Al cierre de esta
etapa se agrega el FK físico diferido `licencias_asignadas.cliente_id → cuentas_clientes`.

## 1. Cuentas y Contactos

### `cuentas_clientes`
| Campo | Tipo | Oblig. | Notas |
|---|---|---|---|
| id | uuid | sí | PK |
| empresa_id | uuid | sí | nuestra empresa (multi-entidad) |
| razon_social | text | sí | |
| nombre_comercial | text | no | |
| tipo_identificacion | text | sí | |
| numero_identificacion | text | sí | |
| cuenta_padre_id | uuid | no | self-FK, jerarquía holding/subsidiaria |
| sector_industria | text | no | |
| tamano_empresa | text | no | catálogo: `MICRO`/`PEQUENA`/`MEDIANA`/`GRANDE` |
| sitio_web | text | no | |
| direccion_facturacion | text | no | |
| ciudad | text | no | |
| pais | text | no | |
| telefono_principal | text | no | |
| email_principal | citext | no | |
| moneda_preferida_id | uuid | no | FK `monedas` |
| ejecutivo_comercial_id | uuid | no | FK `perfiles_usuario` |
| origen_captacion | text | no | catálogo configurable: `REFERIDO`/`WEB`/`EVENTO`/`OUTBOUND`/`OTRO` |
| estado | text | sí | `PROSPECTO`/`ACTIVO`/`INACTIVO` |
| notas | text | no | |
| deleted_at | timestamptz | no | soft delete |

### `contactos`
| Campo | Tipo | Oblig. | Notas |
|---|---|---|---|
| id | uuid | sí | PK |
| cuenta_id | uuid | sí | FK `cuentas_clientes` |
| nombre | text | sí | |
| apellido | text | no | |
| cargo | text | no | |
| email | citext | no | |
| telefono | text | no | |
| celular | text | no | |
| canal_preferido | text | no | `EMAIL`/`TELEFONO`/`WHATSAPP` |
| es_contacto_principal | boolean | sí | |
| es_firmante_autorizado | boolean | sí | relevante para aceptación de hitos/contratos |
| activo | boolean | sí | |
| notas | text | no | |

## 2. Gestión de Oportunidades

### `oportunidades`
| Campo | Tipo | Oblig. | Notas |
|---|---|---|---|
| id | uuid | sí | PK |
| empresa_id | uuid | sí | |
| codigo | text | sí | consecutivo `OPORTUNIDAD` |
| cuenta_id | uuid | sí | FK `cuentas_clientes` |
| contacto_id | uuid | no | FK `contactos` |
| nombre_oportunidad | text | sí | |
| descripcion | text | no | |
| etapa | text | sí | `PROSPECCION`/`CALIFICACION`/`PROPUESTA_ENVIADA`/`NEGOCIACION`/`GANADA`/`PERDIDA` |
| probabilidad_cierre_pct | numeric(5,2) | no | |
| valor_estimado | numeric(18,2) | no | |
| moneda_id | uuid | no | |
| fecha_estimada_cierre | date | no | |
| fecha_cierre_real | date | no | |
| motivo_perdida_id | uuid | no | FK `catalogos_valores` (catálogo `MOTIVO_PERDIDA_OPORTUNIDAD`) |
| motivo_perdida_detalle | text | no | |
| origen_oportunidad | text | no | |
| ejecutivo_comercial_id | uuid | sí | FK `perfiles_usuario` |
| proxima_accion | text | no | |
| fecha_proxima_accion | date | no | |
| deleted_at | timestamptz | no | |

### `oportunidades_seguimiento`
Bitácora de actividades/interacciones comerciales.

| Campo | Tipo | Oblig. | Notas |
|---|---|---|---|
| id | uuid | sí | PK |
| oportunidad_id | uuid | sí | FK `oportunidades` |
| tipo_actividad | text | sí | `LLAMADA`/`REUNION`/`EMAIL`/`NOTA` |
| fecha | timestamptz | sí | |
| usuario_id | uuid | sí | FK `perfiles_usuario` |
| descripcion | text | sí | |
| resultado | text | no | |

## 3. Cotizaciones

### `cotizaciones`
Ciclo de vida gobernado por `estados_ciclo_vida`/`workflows_transiciones` con
`entidad_aplicable = 'COTIZACION'` (estados sugeridos: BORRADOR → EN_REVISION → ENVIADA →
ACEPTADA/RECHAZADA/VENCIDA → CONVERTIDA).

| Campo | Tipo | Oblig. | Notas |
|---|---|---|---|
| id | uuid | sí | PK |
| empresa_id | uuid | sí | |
| numero_cotizacion | text | sí | generado por `fn_generar_consecutivo('COTIZACION', empresa_id)` |
| oportunidad_id | uuid | no | FK `oportunidades` — puede cotizarse sin oportunidad previa |
| cuenta_id | uuid | sí | FK `cuentas_clientes` |
| contacto_id | uuid | no | FK `contactos` |
| version | smallint | sí | default 1 |
| cotizacion_origen_id | uuid | no | self-FK, si es una nueva versión de otra cotización |
| estado_id | uuid | sí | FK `estados_ciclo_vida` |
| fecha_emision | date | sí | |
| fecha_validez_hasta | date | sí | |
| moneda_id | uuid | sí | |
| subtotal | numeric(18,2) | sí | calculado desde `cotizaciones_detalle`, cacheado |
| descuento_pct | numeric(5,2) | no | |
| descuento_valor | numeric(18,2) | no | |
| impuestos_pct | numeric(5,2) | no | |
| impuestos_valor | numeric(18,2) | no | |
| total | numeric(18,2) | sí | |
| condiciones_pago | text | no | |
| condiciones_comerciales | text | no | |
| tiempo_estimado_entrega | text | no | |
| responsable_comercial_id | uuid | sí | FK `perfiles_usuario` |
| fecha_envio | timestamptz | no | |
| fecha_respuesta_cliente | timestamptz | no | |
| motivo_rechazo | text | no | |
| archivo_pdf_url | text | no | |
| proyecto_generado_id | uuid | no | FK diferido a `proyectos` (04) — se llena en la conversión directa (§4) |
| fecha_conversion | timestamptz | no | |
| convertido_por_usuario_id | uuid | no | FK `perfiles_usuario` |
| deleted_at | timestamptz | no | |

### `cotizaciones_detalle`
| Campo | Tipo | Oblig. | Notas |
|---|---|---|---|
| id | uuid | sí | PK |
| cotizacion_id | uuid | sí | FK `cotizaciones` |
| tipo_item | text | sí | `SERVICIO`/`ROL_TARIFA`/`PAQUETE`/`LICENCIA`/`ITEM_LIBRE` |
| servicio_id | uuid | no | FK `catalogo_servicios` |
| rol_tarifa_id | uuid | no | FK `catalogo_roles_tarifa` |
| paquete_id | uuid | no | FK `paquetes_servicios` |
| licencia_catalogo_id | uuid | no | FK `licencias_suscripciones_catalogo` |
| descripcion | text | sí | libre, precargada desde el ítem elegido pero editable |
| cantidad | numeric(10,2) | sí | |
| unidad_medida | text | sí | |
| precio_unitario | numeric(18,2) | sí | |
| descuento_linea_pct | numeric(5,2) | no | |
| subtotal_linea | numeric(18,2) | sí | |
| orden | smallint | sí | |

Check: a lo sumo uno de (`servicio_id`,`rol_tarifa_id`,`paquete_id`,`licencia_catalogo_id`)
no nulo cuando `tipo_item <> 'ITEM_LIBRE'`.

### `cotizaciones_aprobaciones`
Aprobación interna previa al envío al cliente (para servicios marcados
`requiere_aprobacion_cotizacion` o por política general).

| Campo | Tipo | Oblig. | Notas |
|---|---|---|---|
| id | uuid | sí | PK |
| cotizacion_id | uuid | sí | FK `cotizaciones` |
| nivel_aprobacion | smallint | sí | soporta cadenas de aprobación de varios niveles |
| aprobador_id | uuid | sí | FK `perfiles_usuario` |
| estado | text | sí | `PENDIENTE`/`APROBADO`/`RECHAZADO` |
| fecha_solicitud | timestamptz | sí | |
| fecha_resolucion | timestamptz | no | |
| comentario | text | no | |

## 4. Conversión a Proyecto

No se modela como tabla adicional: es el mecanismo de trazabilidad ya incluido en
`cotizaciones` (`proyecto_generado_id`, `fecha_conversion`, `convertido_por_usuario_id`).
La transformación directa (server action `convertirCotizacionAProyecto`) ejecuta, dentro
de una única transacción:

1. Crear `contrato` (04) copiando cuenta, condiciones comerciales, moneda y valor total.
2. Crear `proyecto` (04) enlazado al contrato recién creado.
3. Copiar cada `cotizaciones_detalle` como base para el presupuesto del proyecto
   (`proyectos.presupuesto_*`), sin duplicar la tabla de líneas — el detalle histórico de
   qué se cotizó sigue viviendo en `cotizaciones_detalle`.
4. Marcar `cotizaciones.estado_id` → `CONVERTIDA` (vía `workflows_transiciones`) y
   completar `proyecto_generado_id`/`fecha_conversion`/`convertido_por_usuario_id`.

El detalle completo de `contratos`/`proyectos` vive en `04-contratos-proyectos.md`; el FK
físico `cotizaciones.proyecto_generado_id → proyectos(id)` se agrega por `ALTER TABLE` en
esa migración.

## 5. Checklist de cierre de esta etapa (ISO/IEC 25010)

- [x] **Funcionalidad**: cubre oportunidades, cotizaciones con líneas y aprobación, y el
  mecanismo de conversión directa a proyecto solicitado explícitamente.
- [x] **Fiabilidad**: `cotizaciones.version` + `cotizacion_origen_id` evita sobrescribir
  el histórico cuando se reenvía una propuesta ajustada.
- [x] **Usabilidad**: `cotizaciones_detalle.descripcion` es editable aunque parta de un
  ítem de catálogo, para poder aclarar condiciones puntuales sin tocar el catálogo global.
- [x] **Seguridad**: `cotizaciones_aprobaciones` deja rastro de quién aprobó qué antes de
  que el documento salga al cliente — necesario para auditoría comercial.
- [x] **Mantenibilidad**: la conversión a proyecto reutiliza datos por referencia
  (`cotizacion_origen`) en vez de duplicar el detalle en dos tablas distintas.
