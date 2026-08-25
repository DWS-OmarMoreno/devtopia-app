# Módulo: Contratos y Proyectos

Dependencias verificadas antes de esta etapa: `cotizaciones`, `cuentas_clientes`,
`contactos` (Etapa 3); `catalogo_roles_tarifa` (Etapa 2); `perfiles_usuario`,
`secuencias_numeracion`, `estados_ciclo_vida` (Etapa 1). Al cierre de esta etapa se
agregan los FK físicos diferidos `cotizaciones.proyecto_generado_id → proyectos(id)` y
`licencias_asignadas.proyecto_id → proyectos(id)`.

## 1. Contratos

### `contratos`
| Campo | Tipo | Oblig. | Notas |
|---|---|---|---|
| id | uuid | sí | PK |
| empresa_id | uuid | sí | |
| numero_contrato | text | sí | consecutivo `CONTRATO` |
| cotizacion_origen_id | uuid | no | FK `cotizaciones` |
| cuenta_id | uuid | sí | FK `cuentas_clientes` |
| contacto_firmante_id | uuid | no | FK `contactos` (debe tener `es_firmante_autorizado=true`) |
| tipo_contrato | text | sí | `TIEMPO_Y_MATERIALES`/`PRECIO_FIJO`/`RETAINER`/`BOLSA_HORAS` |
| estado_id | uuid | sí | FK `estados_ciclo_vida` (`entidad_aplicable='CONTRATO'`) |
| fecha_firma | date | no | |
| fecha_inicio | date | sí | |
| fecha_fin_estimada | date | no | |
| fecha_fin_real | date | no | |
| moneda_id | uuid | sí | |
| valor_total_contratado | numeric(18,2) | sí | |
| forma_pago | text | no | |
| plazo_pago_dias | smallint | no | |
| responsable_comercial_id | uuid | sí | FK `perfiles_usuario` |
| responsable_pm_id | uuid | no | FK `perfiles_usuario` |
| archivo_contrato_url | text | no | |
| clausulas_especiales | text | no | |
| deleted_at | timestamptz | no | |

## 2. Proyectos

### `proyectos`
| Campo | Tipo | Oblig. | Notas |
|---|---|---|---|
| id | uuid | sí | PK |
| empresa_id | uuid | sí | |
| numero_proyecto | text | sí | consecutivo `PROYECTO` (admite múltiples reglas, ej. `PRJ-PROD-`/`PRJ-CONS-`) |
| contrato_id | uuid | sí | FK `contratos` |
| nombre_proyecto | text | sí | |
| descripcion | text | no | |
| tipo_proyecto | text | no | catálogo configurable |
| pm_id | uuid | sí | FK `perfiles_usuario` |
| estado_id | uuid | sí | FK `estados_ciclo_vida` (`entidad_aplicable='PROYECTO'`) |
| prioridad | text | no | `ALTA`/`MEDIA`/`BAJA` |
| fecha_inicio_planeada | date | sí | |
| fecha_fin_planeada | date | sí | |
| fecha_inicio_real | date | no | |
| fecha_fin_real | date | no | |
| presupuesto_horas_total | numeric(10,2) | no | |
| presupuesto_costo_total | numeric(18,2) | no | |
| presupuesto_ingreso_total | numeric(18,2) | no | normalmente = `contratos.valor_total_contratado`, puede prorratearse si un contrato genera varios proyectos |
| porcentaje_avance | numeric(5,2) | no | |
| deleted_at | timestamptz | no | |

Tras crear esta tabla se agregan los FK diferidos: `cotizaciones.proyecto_generado_id`,
`licencias_asignadas.proyecto_id`.

## 3. Gestión de Hitos y Entregables

### `hitos_entregables`
| Campo | Tipo | Oblig. | Notas |
|---|---|---|---|
| id | uuid | sí | PK |
| proyecto_id | uuid | sí | FK `proyectos` |
| numero_entregable | text | sí | consecutivo `ENTREGABLE` |
| nombre | text | sí | |
| descripcion | text | no | |
| fase_orden | smallint | sí | orden dentro del plan de fases |
| fecha_planeada_entrega | date | sí | |
| fecha_real_entrega | date | no | |
| condiciones_aceptacion | text | no | texto libre de condiciones contractuales |
| estado | text | sí | `PENDIENTE`/`EN_PROGRESO`/`ENTREGADO`/`EN_REVISION_CLIENTE`/`ACEPTADO`/`RECHAZADO` |
| responsable_id | uuid | sí | FK `perfiles_usuario` |
| porcentaje_facturacion_asociado | numeric(5,2) | no | % del contrato que este hito habilita facturar |
| valor_hito | numeric(18,2) | no | si el proyecto es precio fijo por hito |
| aprobador_cliente_contacto_id | uuid | no | FK `contactos` |
| fecha_aprobacion_cliente | timestamptz | no | |
| firma_aceptacion_url | text | no | documento firmado adjunto |
| notas_rechazo | text | no | |

### `hitos_criterios_aceptacion`
Checklist granular opcional por hito.

| Campo | Tipo | Oblig. | Notas |
|---|---|---|---|
| id | uuid | sí | PK |
| hito_id | uuid | sí | FK `hitos_entregables` |
| criterio | text | sí | |
| cumplido | boolean | sí | |
| verificado_por | uuid | no | FK `perfiles_usuario` |
| fecha_verificacion | timestamptz | no | |

## 4. Control de Horas (Timesheets)

### `timesheets`
| Campo | Tipo | Oblig. | Notas |
|---|---|---|---|
| id | uuid | sí | PK |
| proyecto_id | uuid | sí | FK `proyectos` |
| hito_id | uuid | no | FK `hitos_entregables` |
| recurso_id | uuid | sí | FK `perfiles_usuario` |
| fecha | date | sí | |
| horas_registradas | numeric(6,2) | sí | |
| tipo_hora | text | sí | `FACTURABLE`/`NO_FACTURABLE` |
| categoria_no_facturable_id | uuid | no | FK `catalogos_valores` (catálogo `CATEGORIA_HORA_NO_FACTURABLE`: interno, garantía, capacitación, administrativo, preventa) |
| rol_tarifa_id | uuid | no | FK `catalogo_roles_tarifa`, tarifa aplicable a ese registro |
| descripcion_actividad | text | sí | |
| ubicacion_trabajo | text | no | `REMOTO`/`CLIENTE`/`OFICINA` |
| estado_aprobacion | text | sí | `BORRADOR`/`ENVIADO`/`APROBADO`/`RECHAZADO` |
| aprobador_id | uuid | no | FK `perfiles_usuario` |
| fecha_aprobacion | timestamptz | no | |
| comentario_rechazo | text | no | |
| facturado | boolean | sí | default false |
| factura_referencia_id | uuid | no | FK `facturas_referencia_externa` (§7) |

Check: `horas_registradas > 0` y `horas_registradas <= 24` por fila (una fila = un
recurso/proyecto/día; múltiples filas permiten repartir el día entre proyectos).

## 5. Asignación de Recursos

### `asignacion_recursos`
| Campo | Tipo | Oblig. | Notas |
|---|---|---|---|
| id | uuid | sí | PK |
| proyecto_id | uuid | sí | FK `proyectos` |
| recurso_id | uuid | sí | FK `perfiles_usuario` |
| rol_en_proyecto_id | uuid | no | FK `catalogo_roles_tarifa` |
| fecha_inicio_asignacion | date | sí | |
| fecha_fin_asignacion | date | no | |
| porcentaje_dedicacion | numeric(5,2) | sí | 0–100 |
| horas_planeadas_totales | numeric(10,2) | no | |
| tarifa_costo_hora_aplicable | numeric(18,2) | no | snapshot histórico, puede diferir del catálogo vigente |
| tarifa_venta_hora_aplicable | numeric(18,2) | no | snapshot histórico |
| estado_asignacion | text | sí | `PLANEADA`/`ACTIVA`/`FINALIZADA`/`CANCELADA` |
| notas | text | no | |

### `disponibilidad_recursos` (opcional, control de carga)
| Campo | Tipo | Oblig. | Notas |
|---|---|---|---|
| id | uuid | sí | PK |
| recurso_id | uuid | sí | FK `perfiles_usuario` |
| fecha | date | sí | |
| horas_disponibles | numeric(5,2) | sí | capacidad diaria (permite modelar medio tiempo, vacaciones=0, etc.) |

Único: (`recurso_id`, `fecha`).

## 6. Rentabilidad y Márgenes

Decisión de diseño: **no** se mantiene una tabla editable de rentabilidad (se derivaría e
inconsistentaría fácilmente). Se define una vista SQL calculada en tiempo real y, para
reportes de cierre periódico, una tabla de snapshots congelados.

### `vista_rentabilidad_proyecto` (VIEW)
Agrega por proyecto: costo de mano de obra (`timesheets.horas_registradas × tarifa costo`
vigente en `asignacion_recursos` o `catalogo_roles_tarifa`), costo de subcontratación
(`ordenes_costo_subcontratacion`, módulo 05) y costo de licencias (`licencias_asignadas`,
módulo 02), comparado contra `proyectos.presupuesto_ingreso_total`. Ver definición SQL
completa en la migración; se crea al final de esta etapa porque necesita conocer
`ordenes_costo_subcontratacion` — en la práctica se materializa como vista simple sin esa
fuente en esta migración y se reemplaza (`create or replace view`) en la migración de
Compras (05) para incorporarla, evitando así una dependencia circular de archivos.

### `rentabilidad_snapshots`
| Campo | Tipo | Oblig. | Notas |
|---|---|---|---|
| id | uuid | sí | PK |
| proyecto_id | uuid | sí | FK `proyectos` |
| fecha_corte | date | sí | |
| ingreso_reconocido | numeric(18,2) | sí | |
| costo_mano_obra | numeric(18,2) | sí | |
| costo_subcontratacion | numeric(18,2) | sí | |
| costo_licencias | numeric(18,2) | sí | |
| otros_costos | numeric(18,2) | no | |
| margen_bruto | numeric(18,2) | sí | calculado |
| margen_pct | numeric(5,2) | sí | calculado |
| tipo_snapshot | text | sí | `AUTOMATICO`/`MANUAL` |
| generado_por | uuid | no | FK `perfiles_usuario`, null si fue job automático |

## 7. Control de Cambios (Change Requests)

### `change_requests`
| Campo | Tipo | Oblig. | Notas |
|---|---|---|---|
| id | uuid | sí | PK |
| numero_cr | text | sí | consecutivo `CHANGE_REQUEST` |
| proyecto_id | uuid | sí | FK `proyectos` |
| contrato_id | uuid | sí | FK `contratos` |
| titulo | text | sí | |
| descripcion_cambio | text | sí | |
| tipo_cambio | text | sí | `ALCANCE`/`CRONOGRAMA`/`COSTO`/`RECURSOS`/`MIXTO` |
| justificacion | text | no | |
| impacto_horas | numeric(10,2) | no | |
| impacto_costo | numeric(18,2) | no | |
| impacto_valor_contrato | numeric(18,2) | no | delta +/- sobre `contratos.valor_total_contratado` |
| impacto_fecha_fin_dias | integer | no | |
| estado_id | uuid | sí | FK `estados_ciclo_vida` (`entidad_aplicable='CHANGE_REQUEST'`) |
| solicitado_por_contacto_id | uuid | no | FK `contactos`, si lo pide el cliente |
| solicitado_por_usuario_id | uuid | no | FK `perfiles_usuario`, si lo origina el equipo interno |
| fecha_solicitud | date | sí | |
| aprobador_interno_id | uuid | no | FK `perfiles_usuario` |
| fecha_aprobacion_interna | timestamptz | no | |
| aprobador_cliente_contacto_id | uuid | no | FK `contactos` |
| fecha_aprobacion_cliente | timestamptz | no | |
| documento_addenda_url | text | no | |
| fecha_efectiva | date | no | |

Check: al menos uno de (`solicitado_por_contacto_id`, `solicitado_por_usuario_id`) no nulo.

## 8. Sublista: Referenciación de Facturación Externa

### `facturas_referencia_externa`
| Campo | Tipo | Oblig. | Notas |
|---|---|---|---|
| id | uuid | sí | PK |
| proyecto_id | uuid | no | FK `proyectos` |
| contrato_id | uuid | no | FK `contratos` |
| numero_factura_externa | text | sí | |
| sistema_origen | text | sí | nombre del ERP/facturación externo |
| fecha_emision | date | sí | |
| fecha_vencimiento_pago | date | no | |
| moneda_id | uuid | sí | |
| monto_subtotal | numeric(18,2) | no | |
| monto_impuestos | numeric(18,2) | no | |
| monto_total | numeric(18,2) | sí | |
| estado_pago | text | sí | `PENDIENTE`/`PAGADA_PARCIAL`/`PAGADA_TOTAL`/`VENCIDA`/`ANULADA` |
| monto_pagado_acumulado | numeric(18,2) | no | |
| fecha_ultimo_pago | date | no | |
| hito_asociado_id | uuid | no | FK `hitos_entregables` |
| metodo_registro | text | sí | `MANUAL`/`API` — trazabilidad del patrón de resiliencia |
| registrado_por_usuario_id | uuid | no | FK `perfiles_usuario`, si fue manual |
| adjunto_url | text | no | |
| notas | text | no | |

Check: al menos uno de (`proyecto_id`, `contrato_id`) no nulo.

## 9. Sublista: Referenciación de Casos de Soporte / Helpdesk

### `casos_soporte_referencia_externa`
Se reutiliza también desde el módulo Cierre y Postventa para consultar el historial de
garantía (`es_cubierto_garantia`), evitando duplicar la tabla.

| Campo | Tipo | Oblig. | Notas |
|---|---|---|---|
| id | uuid | sí | PK |
| proyecto_id | uuid | no | FK `proyectos` |
| contrato_id | uuid | no | FK `contratos` |
| numero_ticket_externo | text | sí | |
| sistema_origen | text | sí | |
| asunto | text | sí | |
| descripcion_breve | text | no | |
| fecha_apertura | date | sí | |
| fecha_cierre | date | no | |
| estado | text | sí | `ABIERTO`/`EN_PROGRESO`/`ESPERANDO_CLIENTE`/`RESUELTO`/`CERRADO` |
| prioridad | text | no | |
| categoria | text | no | `INCIDENTE`/`SOLICITUD`/`GARANTIA`/`CONSULTA` |
| horas_consumidas | numeric(6,2) | no | |
| sla_incumplido | boolean | no | |
| es_cubierto_garantia | boolean | sí | default false — usado por 06-cierre-postventa |
| metodo_registro | text | sí | `MANUAL`/`API` |
| registrado_por_usuario_id | uuid | no | FK `perfiles_usuario` |
| notas | text | no | |

Check: al menos uno de (`proyecto_id`, `contrato_id`) no nulo.

## 10. Checklist de cierre de esta etapa (ISO/IEC 25010)

- [x] **Funcionalidad**: los 7 puntos del módulo (hitos, timesheets, recursos,
  rentabilidad, change requests, y las 2 sublistas) están cubiertos con campos
  obligatorios/opcionales explícitos.
- [x] **Fiabilidad**: `asignacion_recursos` guarda snapshot de tarifa histórica —
  cambiar la tarifa del catálogo a futuro no altera retroactivamente el costo ya
  reconocido de asignaciones pasadas.
- [x] **Eficiencia de desempeño**: rentabilidad se resuelve con VIEW calculada más
  snapshots periódicos, evitando mantener un total manual desincronizado; el snapshot
  evita recalcular sobre todo el histórico en cada reporte de cierre.
- [x] **Mantenibilidad**: `casos_soporte_referencia_externa` se diseñó una sola vez y se
  reutiliza desde Cierre y Postventa por filtro (`es_cubierto_garantia`), en vez de crear
  una tabla de garantía duplicada.
- [x] **Trazabilidad/Seguridad**: ambas sublistas llevan `metodo_registro` (`MANUAL`/`API`)
  cumpliendo el paso 5 del patrón de resiliencia de integraciones definido en el proyecto.
- [x] **Compatibilidad**: `hitos_entregables.porcentaje_facturacion_asociado` permite
  enlazar hitos con facturación externa (sublista §8) sin forzar un modelo de facturación
  propio dentro del ERP, que explícitamente no se pidió construir.
