# Módulo: Productos y Servicios

Dependencias verificadas antes de esta etapa: `empresas`, `monedas`, `catalogos_valores`,
`log_auditoria`/`fn_audit_row()` (Etapa 1). Esta etapa no depende de CRM ni de Contratos,
pero **es dependencia de ambos** (el catálogo debe existir antes de poder cotizar).

## 1. Catálogo de Servicios y Tarifas

### `categorias_servicio`
Clasificación jerárquica opcional del catálogo (ej. "Desarrollo" → "Backend").

| Campo | Tipo | Oblig. | Notas |
|---|---|---|---|
| id | uuid | sí | PK |
| empresa_id | uuid | sí | |
| nombre | text | sí | |
| descripcion | text | no | |
| categoria_padre_id | uuid | no | self-FK, jerarquía |
| activo | boolean | sí | |

### `sla_planes` / `sla_niveles`
Definición de SLA (§3), creados antes de `catalogo_servicios` porque un servicio puede
referenciar un plan de SLA.

`sla_planes`:

| Campo | Tipo | Oblig. | Notas |
|---|---|---|---|
| id | uuid | sí | PK |
| empresa_id | uuid | sí | |
| nombre | text | sí | |
| descripcion | text | no | |
| activo | boolean | sí | |

`sla_niveles` (un plan puede tener varios niveles por severidad):

| Campo | Tipo | Oblig. | Notas |
|---|---|---|---|
| id | uuid | sí | PK |
| sla_plan_id | uuid | sí | FK `sla_planes` |
| severidad | text | sí | `CRITICA`/`ALTA`/`MEDIA`/`BAJA` |
| tiempo_respuesta_horas | numeric(6,2) | sí | |
| tiempo_resolucion_horas | numeric(6,2) | sí | |
| horario_cobertura | text | sí | ej. `24x7`, `8x5` |
| penalizacion_incumplimiento | text | no | descripción de la penalización |
| penalizacion_pct_credito | numeric(5,2) | no | % de crédito al cliente si se incumple |

Único: (`sla_plan_id`, `severidad`).

### `catalogo_roles_tarifa`
Roles facturables y su tarifa por hora (insumo para cotizaciones, timesheets y
asignación de recursos).

| Campo | Tipo | Oblig. | Notas |
|---|---|---|---|
| id | uuid | sí | PK |
| empresa_id | uuid | sí | |
| nombre_rol | text | sí | ej. "Desarrollador Senior" |
| nivel_experiencia | text | no | `JUNIOR`/`MID`/`SENIOR`/`LEAD` |
| tarifa_hora_estandar | numeric(18,2) | sí | precio de venta |
| tarifa_hora_costo_referencia | numeric(18,2) | no | costo interno referencial (insumo de márgenes) |
| moneda_id | uuid | sí | FK `monedas` |
| vigente_desde | date | sí | |
| vigente_hasta | date | no | null = vigente indefinidamente |
| activo | boolean | sí | |

### `catalogo_servicios`
| Campo | Tipo | Oblig. | Notas |
|---|---|---|---|
| id | uuid | sí | PK |
| empresa_id | uuid | sí | |
| codigo | text | sí | único por empresa |
| nombre | text | sí | |
| descripcion | text | no | |
| categoria_id | uuid | no | FK `categorias_servicio` |
| tipo_servicio | text | sí | catálogo configurable: `CONSULTORIA`/`DESARROLLO`/`SOPORTE`/`IMPLEMENTACION`/`CAPACITACION`/`LICENCIAMIENTO` |
| unidad_medida | text | sí | `HORA`/`DIA`/`PROYECTO`/`MES`/`UNIDAD` |
| tarifa_estandar | numeric(18,2) | sí | |
| moneda_id | uuid | sí | FK `monedas` |
| sla_plan_id | uuid | no | FK `sla_planes` |
| requiere_aprobacion_cotizacion | boolean | sí | fuerza paso por `cotizaciones_aprobaciones` (módulo CRM) |
| fecha_vigencia_desde | date | no | |
| fecha_vigencia_hasta | date | no | |
| activo | boolean | sí | |

### `paquetes_servicios` / `paquetes_servicios_detalle`
Bundles predefinidos con precio propio (puede diferir de la suma de tarifas individuales).

`paquetes_servicios`:

| Campo | Tipo | Oblig. | Notas |
|---|---|---|---|
| id | uuid | sí | PK |
| empresa_id | uuid | sí | |
| nombre | text | sí | |
| descripcion | text | no | |
| precio_total_paquete | numeric(18,2) | sí | |
| moneda_id | uuid | sí | |
| vigencia_desde | date | no | |
| vigencia_hasta | date | no | |
| activo | boolean | sí | |

`paquetes_servicios_detalle`:

| Campo | Tipo | Oblig. | Notas |
|---|---|---|---|
| id | uuid | sí | PK |
| paquete_id | uuid | sí | FK `paquetes_servicios` |
| servicio_id | uuid | no | FK `catalogo_servicios` (uno de los dos) |
| rol_tarifa_id | uuid | no | FK `catalogo_roles_tarifa` |
| cantidad | numeric(10,2) | sí | |
| precio_unitario_paquete | numeric(18,2) | sí | puede llevar descuento de bundle |
| orden | smallint | sí | |

Check: exactamente uno de (`servicio_id`, `rol_tarifa_id`) no nulo.

## 2. Gestión de Licencias y Suscripciones

### `licencias_suscripciones_catalogo`
Software de terceros / soluciones SaaS que la empresa revende o gestiona para clientes.
`proveedor_id` queda **sin FK física** en esta migración (el módulo Compras, que crea
`proveedores`, aún no existe) — se agrega vía `ALTER TABLE` en la migración de Compras
(ver `05-compras-subcontratacion.md §3`). Mientras tanto la columna existe como `uuid`
simple para no perder el dato.

| Campo | Tipo | Oblig. | Notas |
|---|---|---|---|
| id | uuid | sí | PK |
| empresa_id | uuid | sí | |
| nombre_producto | text | sí | |
| fabricante | text | no | |
| proveedor_id | uuid | no | FK diferido a `proveedores` (Compras) |
| sku_proveedor | text | no | |
| tipo | text | sí | `LICENCIA_PERPETUA`/`SUSCRIPCION_SAAS`/`SOPORTE_ANUAL` |
| modelo_costo | text | sí | `POR_USUARIO`/`POR_INSTANCIA`/`FIJO`/`ESCALONADO` |
| costo_unitario | numeric(18,2) | sí | |
| precio_venta_sugerido | numeric(18,2) | no | |
| moneda_id | uuid | sí | |
| periodicidad_facturacion | text | sí | `MENSUAL`/`ANUAL`/`UNICA` |
| activo | boolean | sí | |
| notas | text | no | |

### `licencias_asignadas`
Instancias de licencia efectivamente asignadas a un cliente/proyecto (permite control de
vencimientos y renovación).

| Campo | Tipo | Oblig. | Notas |
|---|---|---|---|
| id | uuid | sí | PK |
| licencia_catalogo_id | uuid | sí | FK `licencias_suscripciones_catalogo` |
| cliente_id | uuid | no | FK `cuentas_clientes` (CRM) — nullable porque este módulo se crea antes que CRM; se referencia lógicamente y se resuelve el FK físico en `03-crm-ventas` |
| proyecto_id | uuid | no | FK diferido a `proyectos` (Contratos y Proyectos) |
| cantidad | integer | sí | |
| fecha_inicio | date | sí | |
| fecha_fin_vigencia | date | sí | |
| fecha_renovacion | date | no | |
| auto_renovar | boolean | sí | default false |
| estado | text | sí | `ACTIVA`/`VENCIDA`/`CANCELADA`/`EN_RENOVACION` |
| numero_orden_compra_proveedor | text | no | |
| costo_total_periodo | numeric(18,2) | no | |
| precio_venta_periodo | numeric(18,2) | no | |

> Nota de diseño: los FK de `cliente_id` y `proyecto_id` se agregan por `ALTER TABLE` en
> las migraciones 03 y 04 respectivamente, una vez existen esas tablas — mismo patrón que
> `proveedor_id`. Se documenta explícitamente para que quede trazado y no se interprete
> como un olvido.

## 3. Definición de SLA

Ver `sla_planes`/`sla_niveles` en §1 — se definieron primero por ser dependencia de
`catalogo_servicios`.

## 4. Checklist de cierre de esta etapa (ISO/IEC 25010)

- [x] **Funcionalidad**: catálogo de servicios/tarifas, licencias/SaaS y SLA cubiertos con
  soporte de vigencia temporal (`vigente_desde/hasta`, `fecha_vigencia_*`).
- [x] **Mantenibilidad**: FKs diferidos hacia módulos posteriores documentados
  explícitamente (no son deuda técnica oculta, son una decisión de orden de dependencia).
- [x] **Fiabilidad**: `licencias_asignadas.estado` + `fecha_fin_vigencia` permiten detectar
  vencimientos sin depender de un job externo obligatorio (consulta directa).
- [x] **Eficiencia de desempeño**: índices sobre FKs se agregan en la migración SQL
  (`catalogo_servicios.categoria_id`, `sla_niveles.sla_plan_id`, etc.) para evitar scans
  completos en listados de catálogo, que se consultan con alta frecuencia desde
  cotizaciones.
- [x] **Compatibilidad**: `paquetes_servicios_detalle` admite referenciar tanto un
  servicio como un rol-tarifa sin duplicar la tabla de paquetes.
