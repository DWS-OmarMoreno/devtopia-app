# Módulo: Configuración General

Dependencias verificadas antes de esta etapa: extensiones `pgcrypto`/`citext` y
`fn_set_updated_at()` (Etapa 0). Esta es la primera etapa que crea tablas: no asume
ninguna otra tabla de negocio previa.

## 1. Parámetros Globales de la Aplicación

### `empresas`
Datos maestros corporativos. Soporta más de una fila para escenarios de holding, aunque
el uso típico es una sola empresa activa.

| Campo | Tipo | Oblig. | Notas |
|---|---|---|---|
| id | uuid | sí | PK |
| razon_social | text | sí | |
| nombre_comercial | text | no | |
| tipo_identificacion | text | sí | NIT, RUT, RFC, EIN, etc. — catálogo libre por país |
| numero_identificacion | text | sí | NIT/RUT |
| digito_verificacion | text | no | aplica a esquemas tipo NIT colombiano |
| direccion | text | no | |
| ciudad | text | no | |
| pais | text | sí | ISO 3166-1 alpha-2 |
| telefono | text | no | |
| email_corporativo | citext | no | |
| sitio_web | text | no | |
| moneda_principal_id | uuid | sí | FK `monedas` |
| zona_horaria | text | sí | IANA tz, ej. `America/Bogota` |
| idioma_por_defecto | text | sí | ISO 639-1, ej. `es` |
| formato_fecha | text | sí | ej. `DD/MM/YYYY` |
| formato_hora | text | sí | `12H`/`24H` |
| separador_miles | text(1) | sí | ej. `.` |
| separador_decimal | text(1) | sí | ej. `,` |
| primer_dia_semana | smallint | sí | 0=domingo..6=sábado |
| logo_url_claro | text | no | logo para fondo claro en PDFs |
| logo_url_oscuro | text | no | logo para fondo oscuro |
| pie_pagina_documentos | text | no | texto legal en PDFs |
| activa | boolean | sí | default true |
| predeterminada | boolean | sí | solo una fila puede ser `true` (constraint parcial) |
| created_at/created_by/updated_at/updated_by | — | sí | estándar (00-overview §4) |

Regla: índice único parcial que garantiza `predeterminada = true` en a lo sumo una fila.

### `monedas`
| Campo | Tipo | Oblig. | Notas |
|---|---|---|---|
| id | uuid | sí | PK |
| codigo_iso | text(3) | sí | ISO 4217, único |
| nombre | text | sí | |
| simbolo | text | sí | |
| decimales | smallint | sí | default 2 |
| activa | boolean | sí | |

### `tasas_cambio`
Histórico de conversión entre monedas, para cotizaciones/contratos multi-moneda.

| Campo | Tipo | Oblig. | Notas |
|---|---|---|---|
| id | uuid | sí | PK |
| moneda_origen_id | uuid | sí | FK `monedas` |
| moneda_destino_id | uuid | sí | FK `monedas` |
| tasa | numeric(18,6) | sí | |
| fecha_vigencia | date | sí | |
| fuente | text | sí | `MANUAL` / nombre de API externa |
| created_by | uuid | sí | |

Único: (`moneda_origen_id`, `moneda_destino_id`, `fecha_vigencia`).

## 2. Gestión de Consecutivos y Nomenclaturas Personalizables

### `secuencias_numeracion`
Una fila por regla de numeración (puede haber varias para el mismo `tipo_documento`, p.
ej. `PROYECTO` con reglas distintas para producto vs. consultoría → `PRJ-PROD-0042` /
`PRJ-CONS-0007`).

| Campo | Tipo | Oblig. | Notas |
|---|---|---|---|
| id | uuid | sí | PK |
| empresa_id | uuid | sí | FK `empresas` |
| codigo_secuencia | text | sí | identificador único interno, ej. `PROYECTO_PRODUCTO` |
| tipo_documento | text | sí | catálogo: `COTIZACION`, `CONTRATO`, `PROYECTO`, `ENTREGABLE`, `PROVEEDOR`, `ORDEN_COSTO`, `CHANGE_REQUEST`, `CASO_GARANTIA`, etc. |
| prefijo | text | no | ej. `COT-`, `PRJ-PROD-` |
| sufijo | text | no | |
| longitud_ceros | smallint | sí | default 4 → `0001` |
| incluir_anio | boolean | sí | |
| formato_anio | text | no | `YYYY` / `YY` |
| incluir_mes | boolean | sí | |
| formato_mes | text | no | `MM` |
| separador | text | no | default `-` |
| numero_inicial | bigint | sí | default 1 |
| numero_actual | bigint | sí | se incrementa vía `fn_generar_consecutivo` |
| reinicio | text | sí | `NUNCA` / `ANUAL` / `MENSUAL` |
| fecha_ultimo_reinicio | date | no | |
| activo | boolean | sí | |

Único: (`empresa_id`, `codigo_secuencia`).

**Ejemplo de configuración** (sembrado en `seed.sql`): `codigo_secuencia='COTIZACION'`,
`prefijo='COT-'`, `incluir_anio=true`, `formato_anio='YYYY'`, `longitud_ceros=4` →
`COT-2026-0001`.

### Función `fn_generar_consecutivo(codigo_secuencia text, empresa_id uuid)`
Bloquea la fila (`select ... for update`), incrementa `numero_actual`, aplica el reinicio
si corresponde según la fecha actual, arma el texto final y lo devuelve. Se llama desde
las server actions de Next.js al crear cotización/contrato/proyecto/etc., nunca se genera
el número en el cliente.

## 3. Formatos Regionales y Moneda

Cubierto por columnas de `empresas` (§1): `formato_fecha`, `formato_hora`,
`separador_miles`, `separador_decimal`, `primer_dia_semana`, `moneda_principal_id`. La
conversión entre monedas para clientes internacionales usa `tasas_cambio`.

## 4. Gestión de Roles y Permisos (RBAC)

### `roles`
| Campo | Tipo | Oblig. | Notas |
|---|---|---|---|
| id | uuid | sí | PK |
| empresa_id | uuid | sí | |
| nombre | text | sí | ej. `Administrador`, `PM`, `Desarrollador`, `Comercial` |
| descripcion | text | no | |
| es_rol_sistema | boolean | sí | true = no editable/eliminable desde UI |
| activo | boolean | sí | |

### `perfiles_usuario`
Extiende `auth.users` de Supabase (que maneja autenticación) con datos de negocio.

| Campo | Tipo | Oblig. | Notas |
|---|---|---|---|
| id | uuid | sí | PK, **igual a** `auth.users.id` (FK 1:1) |
| empresa_id | uuid | sí | |
| rol_id | uuid | sí | FK `roles` |
| nombre_completo | text | sí | |
| cargo | text | no | |
| telefono | text | no | |
| avatar_url | text | no | |
| tipo_vinculacion | text | sí | catálogo: `EMPLEADO`/`FREELANCER_INTERNO`/`CONTRATISTA` |
| fecha_ingreso | date | no | |
| activo | boolean | sí | inactivar en vez de borrar (afecta timesheets/asignaciones históricas) |

### `permisos`
Matriz de permisos por rol, módulo y, opcionalmente, sublista.

| Campo | Tipo | Oblig. | Notas |
|---|---|---|---|
| id | uuid | sí | PK |
| rol_id | uuid | sí | FK `roles` |
| modulo | text | sí | catálogo: `CRM_VENTAS`, `CONTRATOS_PROYECTOS`, `PRODUCTOS_SERVICIOS`, `COMPRAS`, `CIERRE_POSTVENTA`, `CONFIGURACION` |
| sublista | text | no | ej. `facturas_referencia_externa`, `casos_soporte_referencia_externa`; null = aplica al módulo completo |
| puede_leer | boolean | sí | |
| puede_crear | boolean | sí | |
| puede_editar | boolean | sí | |
| puede_eliminar | boolean | sí | |
| puede_aprobar | boolean | sí | relevante para workflows (aprobar cotización/CR) |
| alcance | text | sí | `TODOS` / `EQUIPO` / `PROPIOS` — scoping por fila |

Único: (`rol_id`, `modulo`, `sublista`).

## 5. Alertas y Notificaciones

### `alertas_notificaciones_reglas`
| Campo | Tipo | Oblig. | Notas |
|---|---|---|---|
| id | uuid | sí | PK |
| empresa_id | uuid | sí | |
| nombre | text | sí | |
| evento_disparador | text | sí | catálogo: `PROYECTO_PRESUPUESTO_HORAS_80`, `HITO_PROXIMO_VENCER`, `COTIZACION_PENDIENTE_APROBACION`, `CONTRATO_PROXIMO_VENCER`, `GARANTIA_PROXIMA_VENCER`, etc. |
| parametros | jsonb | no | ej. `{"umbral_pct":80,"dias_anticipacion":3}` |
| canal | text | sí | `EMAIL`/`IN_APP`/`WEBHOOK` |
| destinatarios_tipo | text | sí | `PM_PROYECTO`/`EQUIPO_PROYECTO`/`ROL_ESPECIFICO`/`USUARIO_ESPECIFICO`/`CLIENTE` |
| destinatarios_rol_id | uuid | no | FK `roles`, si aplica |
| destinatarios_usuario_id | uuid | no | FK `perfiles_usuario`, si aplica |
| plantilla_asunto | text | no | |
| plantilla_cuerpo | text | no | soporta placeholders `{{proyecto.nombre}}` etc. |
| activa | boolean | sí | |

### `notificaciones_enviadas`
Trazabilidad de cada envío (para no repetir alertas y para depurar fallos).

| Campo | Tipo | Oblig. | Notas |
|---|---|---|---|
| id | uuid | sí | PK |
| regla_id | uuid | sí | FK `alertas_notificaciones_reglas` |
| entidad_tipo | text | sí | ej. `PROYECTO`, `HITO` |
| entidad_id | uuid | sí | |
| destinatario | text | sí | email o identificador del canal |
| canal | text | sí | |
| estado_envio | text | sí | `PENDIENTE`/`ENVIADO`/`FALLIDO` |
| detalle_error | text | no | |
| intentos | smallint | sí | default 0 |
| fecha_envio | timestamptz | no | |
| created_at | timestamptz | sí | |

## 6. Integraciones y Webhooks (API)

Implementa el patrón de resiliencia de 5 pasos (00-overview §10).

### `integraciones_config`
| Campo | Tipo | Oblig. | Notas |
|---|---|---|---|
| id | uuid | sí | PK |
| empresa_id | uuid | sí | |
| nombre | text | sí | |
| tipo | text | sí | `FACTURACION_EXTERNA`/`HELPDESK`/`EMAIL`/`MENSAJERIA`/`OTRO` |
| proveedor | text | no | ej. `Siigo`, `Zendesk` |
| habilitada | boolean | sí | **paso 1**: indicador informativo, nunca bloquea la operación manual |
| url_base | text | no | |
| metodo_autenticacion | text | sí | `API_KEY`/`OAUTH2`/`BASIC`/`NINGUNO` |
| credenciales_ref | text | no | **paso 2**: alias al gestor de secretos, nunca el secreto en claro |
| configuracion_adicional | jsonb | no | mapeos de campos, etc. |
| estado_ultima_conexion | text | sí | `OK`/`ERROR`/`NO_PROBADO`/`DESHABILITADA` |
| fecha_ultima_conexion_ok | timestamptz | no | |
| activo | boolean | sí | |

### `webhooks_salientes`
| Campo | Tipo | Oblig. | Notas |
|---|---|---|---|
| id | uuid | sí | PK |
| integracion_id | uuid | sí | FK `integraciones_config` |
| evento | text | sí | catálogo de eventos del sistema, ej. `COTIZACION_APROBADA`, `HITO_ENTREGADO` |
| url_destino | text | sí | |
| metodo_http | text | sí | default `POST` |
| headers_adicionales | jsonb | no | sin secretos en claro |
| secreto_firma_ref | text | no | alias para firmar el payload (HMAC), no el secreto en sí |
| activo | boolean | sí | |

### `integraciones_log`
**Paso 5**: trazabilidad de origen (automático vs. manual) y de cada intento.

| Campo | Tipo | Oblig. | Notas |
|---|---|---|---|
| id | uuid | sí | PK |
| integracion_id | uuid | no | FK, null si el registro fue 100% manual |
| direccion | text | sí | ENUM: `ENTRANTE`/`SALIENTE` |
| evento | text | sí | |
| entidad_tipo | text | no | |
| entidad_id | uuid | no | |
| origen_resolucion | text | sí | `AUTOMATICO`/`MANUAL` |
| estado | text | sí | `EXITOSO`/`FALLIDO`/`REINTENTO` |
| codigo_respuesta | text | no | |
| mensaje_error | text | no | |
| payload_resumen | jsonb | no | evitar PII/secretos |
| intentos | smallint | sí | default 1 |
| created_at | timestamptz | sí | |

## 7. Workflows y Estados Personalizados

### `estados_ciclo_vida`
| Campo | Tipo | Oblig. | Notas |
|---|---|---|---|
| id | uuid | sí | PK |
| empresa_id | uuid | sí | |
| entidad_aplicable | text | sí | `COTIZACION`/`CONTRATO`/`PROYECTO`/`CHANGE_REQUEST`/`ORDEN_COSTO` |
| codigo_estado | text | sí | ej. `BORRADOR`, `EN_REVISION`, `APROBADO` |
| etiqueta | text | sí | texto visible en UI |
| orden | smallint | sí | orden visual en el pipeline |
| es_estado_inicial | boolean | sí | |
| es_estado_final | boolean | sí | |
| color_ui | text | no | |
| activo | boolean | sí | |

Único: (`empresa_id`, `entidad_aplicable`, `codigo_estado`).

### `workflows_transiciones`
| Campo | Tipo | Oblig. | Notas |
|---|---|---|---|
| id | uuid | sí | PK |
| entidad_aplicable | text | sí | debe coincidir con el de ambos estados |
| estado_origen_id | uuid | sí | FK `estados_ciclo_vida` |
| estado_destino_id | uuid | sí | FK `estados_ciclo_vida` |
| rol_permitido_id | uuid | no | FK `roles`; null = cualquier rol con `puede_editar` |
| requiere_comentario | boolean | sí | |
| requiere_aprobacion_doble | boolean | sí | |

### `workflows_historial`
Bitácora de cada transición realmente ejecutada sobre un registro (independiente de
`log_auditoria`, que es genérico a nivel de fila; este es específico del ciclo de vida).

| Campo | Tipo | Oblig. | Notas |
|---|---|---|---|
| id | uuid | sí | PK |
| entidad_tipo | text | sí | |
| entidad_id | uuid | sí | |
| estado_anterior | text | no | |
| estado_nuevo | text | sí | |
| usuario_id | uuid | sí | FK `perfiles_usuario` |
| comentario | text | no | |
| fecha_transicion | timestamptz | sí | default now() |

## 8. Log de Auditoría y Trazabilidad

### `log_auditoria`
Append-only (sin `UPDATE`/`DELETE` permitidos vía `REVOKE`, ver migración SQL).

| Campo | Tipo | Oblig. | Notas |
|---|---|---|---|
| id | uuid | sí | PK |
| tabla_afectada | text | sí | |
| registro_id | uuid | sí | |
| operacion | operacion_auditoria (enum) | sí | `INSERT`/`UPDATE`/`DELETE` |
| usuario_id | uuid | no | `auth.uid()`, null si lo ejecutó un job de sistema |
| valores_anteriores | jsonb | no | null en INSERT |
| valores_nuevos | jsonb | no | null en DELETE |
| campos_modificados | text[] | no | solo en UPDATE |
| ip_origen | text | no | capturado desde la capa de aplicación (no siempre visible a Postgres) |
| user_agent | text | no | idem |
| fecha_hora | timestamptz | sí | default now() |

## 9. Catálogo genérico configurable

### `catalogos_valores`
Soporta las listas que el negocio debe poder editar sin desplegar código (ver 00-overview
§7): motivos de pérdida de oportunidad, tipos de costo no facturable, categorías de
proveedor, tipos de servicio, etc.

| Campo | Tipo | Oblig. | Notas |
|---|---|---|---|
| id | uuid | sí | PK |
| empresa_id | uuid | sí | |
| catalogo | text | sí | ej. `MOTIVO_PERDIDA_OPORTUNIDAD`, `CATEGORIA_PROVEEDOR` |
| codigo | text | sí | valor estable usado en código |
| etiqueta | text | sí | texto visible |
| orden | smallint | sí | |
| activo | boolean | sí | |

Único: (`empresa_id`, `catalogo`, `codigo`).

## 10. Checklist de cierre de esta etapa (ISO/IEC 25010)

- [x] **Funcionalidad**: cubre los 5 puntos pedidos (parámetros globales, consecutivos,
  formatos regionales, RBAC, alertas, integraciones, workflows, auditoría).
- [x] **Fiabilidad**: consecutivos con bloqueo de fila; auditoría inalterable por permisos
  de base de datos, no solo por convención de aplicación.
- [x] **Seguridad**: RBAC con alcance por fila (`TODOS`/`EQUIPO`/`PROPIOS`); ningún secreto
  en claro en `integraciones_config`.
- [x] **Usabilidad**: `estados_ciclo_vida.etiqueta`/`color_ui` separan el texto técnico del
  texto mostrado, permitiendo traducir/personalizar sin tocar lógica.
- [x] **Mantenibilidad**: catálogos configurables evitan `ALTER TYPE` para cada ajuste
  menor de listas de negocio.
- [x] **Compatibilidad**: `perfiles_usuario.id = auth.users.id` aprovecha el sistema de
  autenticación ya presente en el stack (Supabase Auth) en vez de duplicarlo.
