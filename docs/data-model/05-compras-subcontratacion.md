# Módulo: Compras y Subcontratación

Dependencias verificadas antes de esta etapa: `proyectos`, `contratos` (Etapa 4);
`licencias_suscripciones_catalogo` (Etapa 2, para el FK diferido de proveedor);
`secuencias_numeracion`, `estados_ciclo_vida` (Etapa 1). Al cierre de esta etapa se agrega
el FK físico diferido `licencias_suscripciones_catalogo.proveedor_id → proveedores(id)` y
se completa `vista_rentabilidad_proyecto` con el costo de subcontratación.

## 1. Gestión de Proveedores y Freelancers

### `proveedores`
| Campo | Tipo | Oblig. | Notas |
|---|---|---|---|
| id | uuid | sí | PK |
| empresa_id | uuid | sí | |
| numero_proveedor | text | sí | consecutivo `PROVEEDOR` |
| tipo_proveedor | text | sí | `EMPRESA`/`FREELANCER`/`INFRAESTRUCTURA_CLOUD`/`OTRO` |
| razon_social_o_nombre | text | sí | |
| tipo_identificacion | text | no | |
| numero_identificacion | text | no | |
| email | citext | no | |
| telefono | text | no | |
| direccion | text | no | |
| pais | text | no | |
| categoria_id | uuid | no | FK `catalogos_valores` (catálogo `CATEGORIA_PROVEEDOR`) |
| especialidad | text | no | texto libre complementario a la categoría |
| tarifa_referencia_hora | numeric(18,2) | no | |
| moneda_id | uuid | no | |
| forma_pago_preferida | text | no | |
| plazo_pago_dias | smallint | no | |
| cuenta_bancaria_ref | text | no | alias/referencia, nunca el número de cuenta completo sin cifrar (ver 00-overview §12) |
| calificacion_desempeno_promedio | numeric(3,2) | no | 1.00–5.00, recalculada desde `evaluaciones_proveedor` |
| estado | text | sí | `ACTIVO`/`INACTIVO`/`EN_EVALUACION`/`BLOQUEADO` |
| documentos_legales_url | text | no | contrato marco, NDA, RUT, etc. |
| fecha_vinculacion | date | no | |
| deleted_at | timestamptz | no | |

### `evaluaciones_proveedor`
| Campo | Tipo | Oblig. | Notas |
|---|---|---|---|
| id | uuid | sí | PK |
| proveedor_id | uuid | sí | FK `proveedores` |
| proyecto_id | uuid | no | FK `proyectos`, si la evaluación es puntual a un proyecto |
| fecha_evaluacion | date | sí | |
| calificacion | numeric(3,2) | sí | 1.00–5.00 |
| criterios | jsonb | no | ej. `{"calidad":4,"tiempo":5,"comunicacion":4}` |
| comentarios | text | no | |
| evaluado_por_usuario_id | uuid | sí | FK `perfiles_usuario` |

## 2. Costos Directos por Contratación Externa

### `ordenes_costo_subcontratacion`
Registro de costos directos asignados al proyecto por contratación de personal externo o
infraestructura.

| Campo | Tipo | Oblig. | Notas |
|---|---|---|---|
| id | uuid | sí | PK |
| numero_orden | text | sí | consecutivo `ORDEN_COSTO` |
| proveedor_id | uuid | sí | FK `proveedores` |
| proyecto_id | uuid | sí | FK `proyectos` |
| contrato_id | uuid | no | FK `contratos` |
| concepto | text | sí | |
| tipo_costo | text | sí | `SERVICIO_PROFESIONAL`/`INFRAESTRUCTURA`/`LICENCIA_TERCERO`/`OTRO` |
| fecha_orden | date | sí | |
| fecha_inicio_servicio | date | no | |
| fecha_fin_servicio | date | no | |
| cantidad | numeric(10,2) | sí | |
| unidad_medida | text | sí | |
| valor_unitario | numeric(18,2) | sí | |
| moneda_id | uuid | sí | |
| valor_total | numeric(18,2) | sí | |
| estado_id | uuid | sí | FK `estados_ciclo_vida` (`entidad_aplicable='ORDEN_COSTO'`; sugerido: BORRADOR→APROBADA→EN_EJECUCION→FACTURADA→PAGADA / CANCELADA) |
| aprobador_interno_id | uuid | no | FK `perfiles_usuario` |
| fecha_aprobacion | timestamptz | no | |
| factura_proveedor_numero | text | no | |
| factura_proveedor_fecha | date | no | |
| factura_proveedor_url | text | no | |
| notas | text | no | |

## 3. Resolución de FK diferidos

- `licencias_suscripciones_catalogo.proveedor_id → proveedores(id)`: se agrega por
  `ALTER TABLE` en esta migración, cerrando el pendiente documentado en
  `02-productos-servicios.md §2`.
- `vista_rentabilidad_proyecto`: se reemplaza (`create or replace view`) para sumar
  `ordenes_costo_subcontratacion.valor_total` como `costo_subcontratacion`, cerrando el
  pendiente documentado en `04-contratos-proyectos.md §6`.

## 4. Checklist de cierre de esta etapa (ISO/IEC 25010)

- [x] **Funcionalidad**: cubre proveedores/freelancers y el registro de costos directos
  asignados a proyecto, tal como se solicitó.
- [x] **Seguridad**: `cuenta_bancaria_ref` documentado explícitamente como referencia, no
  como dato bancario completo en claro.
- [x] **Fiabilidad**: `calificacion_desempeno_promedio` se declara como campo derivado
  ("recalculada desde evaluaciones_proveedor"), evitando que quede desincronizada si no se
  actualiza junto con cada evaluación — se recomienda mantenerla vía trigger o vista,
  nunca edición manual directa.
- [x] **Mantenibilidad**: los dos FK diferidos abiertos en etapas anteriores quedan
  resueltos exactamente aquí, en el punto del grafo de dependencias donde corresponde
  (00-overview §2), sin dejar pendientes sueltos.
- [x] **Compatibilidad**: `ordenes_costo_subcontratacion.contrato_id` es opcional porque no
  todo costo subcontratado nace ligado a un contrato específico (puede ser infraestructura
  compartida entre proyectos de un mismo contrato, o un costo pre-contrato).
