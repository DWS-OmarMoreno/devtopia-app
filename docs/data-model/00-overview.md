# Devtopia ERP — Modelo de Datos: Visión General y Convenciones

> Estado del repo al momento de este diseño: Next.js 14 (App Router) + NextUI + Supabase
> (`@supabase/ssr`, `@supabase/supabase-js`). No existía esquema de base de datos previo
> (proyecto en etapa "greenfield" de datos). Este documento y sus anexos por módulo son
> la **Etapa de diseño**, previa a aplicar cualquier migración real, en cumplimiento del
> protocolo de cambios estructurales del proyecto (ver §8).

## 1. Cómo leer este set de documentos

| Archivo | Contenido |
|---|---|
| `00-overview.md` | Este documento: convenciones globales, orden de dependencia, patrones reutilizables |
| `01-configuracion-general.md` | Parámetros globales, consecutivos, RBAC, alertas, integraciones, workflows, auditoría |
| `02-productos-servicios.md` | Catálogo de servicios/tarifas, licencias/SaaS, SLA |
| `03-crm-ventas.md` | Cuentas, contactos, oportunidades, cotizaciones, conversión a proyecto |
| `04-contratos-proyectos.md` | Contratos, proyectos, hitos, timesheets, recursos, rentabilidad, change requests, sublistas |
| `05-compras-subcontratacion.md` | Proveedores/freelancers, órdenes de costo/subcontratación |
| `06-cierre-postventa.md` | Checklist de liquidación, actas de cierre, garantías |
| `README.md` | Índice, orden de aplicación de migraciones, checklist ISO 25010 consolidado |
| `bitacora-incidentes.md` | Plantilla viva de síntoma → causa → solución (protocolo §3) |

Cada documento de módulo trae, en este orden: (a) verificación de dependencias que asume,
(b) diccionario de datos tabla por tabla, (c) reglas de negocio relevantes, (d) checklist
de cierre basado en ISO/IEC 25010. El SQL ejecutable vive en `supabase/migrations/`, un
archivo por etapa, en el mismo orden de dependencia.

## 2. Orden de dependencia real entre módulos

```
00 Extensiones y funciones base
 └─ 01 Configuración General (empresas, monedas, roles, consecutivos, workflows, auditoría)
     └─ 02 Productos y Servicios (catálogo, tarifas, licencias, SLA)
         └─ 03 CRM y Ventas (cuentas, oportunidades, cotizaciones)
             └─ 04 Contratos y Proyectos (contratos, proyectos, hitos, timesheets, CRs)
                 ├─ 05 Compras y Subcontratación (proveedores, órdenes de costo)
                 │     └─ ALTER: FK diferido licencias_suscripciones_catalogo.proveedor_id
                 └─ 06 Cierre y Postventa (checklist liquidación, garantías)
                     └─ 07 RLS baseline + seed
```

Razón de este orden: Configuración General provee `empresas`, `monedas`, `roles`,
`secuencias_numeracion` y `estados_ciclo_vida`, que **todas** las demás tablas referencian.
Productos y Servicios debe existir antes que CRM porque las cotizaciones citan el catálogo.
Contratos y Proyectos nace de una cotización aceptada. Compras y Cierre dependen de que ya
exista un proyecto activo. Este orden se refleja 1:1 en el nombre de los archivos de
migración (`supabase/migrations/2026...`).

## 3. Convenciones de identificadores y claves

- **PK**: `uuid` con `default gen_random_uuid()` en todas las tablas (evita IDs
  adivinables, facilita sincronización futura entre entornos/réplicas).
- **FK**: nombre `<entidad_singular>_id`, siempre con índice explícito (`create index`),
  porque Postgres no indexa automáticamente las FK.
- **Multiempresa**: toda tabla de negocio lleva `empresa_id uuid not null references
  empresas(id)`. Hoy el ERP puede operar con una sola fila en `empresas`, pero el modelo
  no bloquea una futura operación multi-entidad (holding con varias razones sociales).

## 4. Convenciones de columnas estándar

Toda tabla de negocio (no aplica a tablas de log puro) incluye:

| Columna | Tipo | Notas |
|---|---|---|
| `id` | uuid | PK |
| `empresa_id` | uuid | FK a `empresas` |
| `created_at` | timestamptz | `default now()` |
| `created_by` | uuid | FK a `auth.users`, nullable solo para datos sembrados por sistema |
| `updated_at` | timestamptz | mantenido por trigger `fn_set_updated_at()` |
| `updated_by` | uuid | FK a `auth.users` |
| `deleted_at` | timestamptz null | soft delete (ver §6) — solo en tablas maestras/transaccionales relevantes para el negocio, no en tablas de log |

Todas las marcas de tiempo son `timestamptz` (UTC en almacenamiento); la conversión a la
zona horaria de despliegue (`empresas.zona_horaria`) es responsabilidad de la capa de
presentación (Next.js), nunca de la base de datos.

## 5. Dinero, monedas y cifras

- Montos monetarios: `numeric(18,2)`. Nunca `float`/`double precision`.
- Todo monto va acompañado de `moneda_id uuid references monedas(id)` — nunca se asume
  una moneda implícita.
- Porcentajes: `numeric(5,2)` (0.00–100.00).
- Horas: `numeric(6,2)` (permite fracciones de 15 minutos = 0.25).

## 6. Soft delete vs. borrado físico

Las tablas maestras y transaccionales de negocio (cuentas, contratos, proyectos,
cotizaciones, proveedores, etc.) usan **soft delete** (`deleted_at`): un registro
"eliminado" deja de listarse por defecto (`where deleted_at is null`) pero no se pierde,
porque suele estar referenciado desde auditoría, facturación externa o casos de soporte.
Las tablas de log (`log_auditoria`, `notificaciones_enviadas`, `integraciones_log`,
`workflows_historial`) son de solo-inserción: no se actualizan ni se borran (ver §9).

## 7. Catálogos de estado: ENUM técnico vs. catálogo configurable

Dos mecanismos, según quién debe poder cambiarlos:

1. **ENUM de Postgres** — para estados técnicos fijos que jamás deberían editarse desde la
   UI (p. ej. `operacion` en `log_auditoria`: `INSERT/UPDATE/DELETE`, o `direccion` en
   `integraciones_log`: `ENTRANTE/SALIENTE`). Cambiarlos siempre es una migración.
2. **Catálogo configurable** (`catalogos_valores`, ver `01-configuracion-general.md`) —
   para listas que el negocio necesita ajustar sin desplegar código: motivos de pérdida de
   oportunidad, categorías de proveedor, tipos de costo no facturable, etc. Se modelan como
   fila en `catalogos_valores` referenciada por FK, no como `text` libre ni como ENUM.

Los **estados de ciclo de vida con flujo de aprobación** (cotización, contrato, proyecto,
change request) NO usan ninguno de los dos: usan `estados_ciclo_vida` +
`workflows_transiciones` (módulo Configuración General, §"Workflows y Estados
Personalizados"), porque además de la etiqueta necesitan reglas de transición y rol
autorizado.

## 8. Cambios estructurales: aplicación y rollback (protocolo del proyecto)

**Procedimiento de aplicación:**
1. Revisar el diccionario de datos del módulo correspondiente y confirmar que las
   dependencias (§2) ya están aplicadas (`supabase migration list`).
2. Aplicar con `supabase db push` (o `supabase migration up` en entornos con CLI enlazada)
   contra un entorno de *staging* primero, nunca directo a producción.
3. Regenerar tipos TypeScript consumidos por el frontend:
   `supabase gen types typescript --linked > utils/database.types.ts` (o la ruta que se
   defina) y correr `npm run build` para detectar romper contratos de tipos.
4. Reiniciar/redeployar el servicio Next.js si depende de tipos generados en build time.
5. Confirmar en `log_auditoria`/logs de Supabase que no hubo errores de aplicación parcial.

**Rollback:** cada archivo de migración incluye, en un comentario al inicio, el bloque
`-- ROLLBACK:` con las sentencias `drop`/`alter` necesarias para revertirlo de forma
aislada. Ante una migración que falla a mitad de camino, Supabase/Postgres ya envuelve
cada archivo de migración en una transacción implícita (falla completa = no aplica nada
de ese archivo), así que el riesgo real está en migraciones **posteriores** ya aplicadas
que dependan de la fallida: la regla es no continuar la cadena hasta confirmar éxito del
archivo anterior en *staging*.

## 9. Auditoría genérica

`fn_audit_row()` (trigger `AFTER INSERT OR UPDATE OR DELETE`) se adjunta a cada tabla de
negocio y escribe en `log_auditoria` (`01-configuracion-general.md`) el valor anterior,
el nuevo, y el usuario (`auth.uid()`). La tabla `log_auditoria` es append-only: se revoca
`UPDATE`/`DELETE` a nivel de rol de base de datos para garantizar que el historial sea
inalterable, tal como exige el protocolo del proyecto.

## 10. Patrón de resiliencia para integraciones externas

Todo módulo que dependa de un tercero (facturación externa, helpdesk, pasarela de pago,
mensajería) implementa el patrón de 5 pasos definido en las instrucciones del proyecto.
Su forma concreta en este modelo:

| Paso | Dónde vive |
|---|---|
| 1. Indicador informativo, nunca candado | `integraciones_config.habilitada` — el flujo manual sigue disponible aunque esté en `false` |
| 2. Adaptador que puede estar vacío | `integraciones_config` puede existir sin `credenciales_ref` cargada; el resto del ERP no falla |
| 3. Integración que nunca lanza excepción al flujo principal | Se resuelve en la capa de aplicación (Next.js server actions): toda llamada a un adaptador externo se envuelve en try/catch y escribe su resultado en `integraciones_log`, nunca interrumpe la transacción de negocio |
| 4. Camino manual siempre disponible | `facturas_referencia_externa` y `casos_soporte_referencia_externa` (04) son sublistas de **carga manual** por diseño — no dependen de que la integración funcione |
| 5. Trazabilidad de origen | Columna `metodo_registro` (`MANUAL`/`API`) presente en toda entidad alimentable por integración |

## 11. Numeración de consecutivos

Ver detalle en `01-configuracion-general.md`. Resumen: `secuencias_numeracion` guarda la
regla (prefijo, sufijo, ceros a la izquierda, año/mes dinámico, número actual) y la
función `fn_generar_consecutivo(codigo_secuencia, empresa_id)` incrementa de forma atómica
(`select ... for update`) y devuelve el texto formateado (`COT-2026-0001`,
`PRJ-PROD-0042`, etc.), evitando condiciones de carrera con dos usuarios creando registros
simultáneamente.

## 12. Seguridad y datos sensibles

- Ningún secreto (API key, token, credencial) se almacena en texto plano en estas tablas.
  Donde se necesita referenciar una credencial (`integraciones_config.credenciales_ref`,
  `proveedores.cuenta_bancaria_ref`) el campo guarda un **alias/identificador** hacia el
  gestor de secretos (variables de entorno de despliegue, Supabase Vault, etc.), nunca el
  valor.
- RLS (Row Level Security) se activa en el 100% de las tablas de negocio desde la primera
  migración (`07-rls-baseline`), no se deja para después.

## 13. Checklist de cierre de esta etapa (ISO/IEC 25010)

- [x] **Funcionalidad**: el diagrama de dependencia (§2) cubre los 6 módulos solicitados y
  la página de Configuración General completa.
- [x] **Mantenibilidad**: convenciones de nombres, columnas estándar y patrón enum vs.
  catálogo configurable documentados una sola vez aquí, referenciados desde cada módulo
  (evita duplicar criterio y que diverjan entre módulos).
- [x] **Fiabilidad**: consecutivos con función atómica (`for update`) evita duplicados por
  condición de carrera; auditoría append-only con permisos revocados.
- [x] **Seguridad**: convención de no almacenar secretos en claro definida antes de crear
  ninguna tabla que los referencie.
- [x] **Portabilidad**: tipos estándar SQL (`uuid`, `numeric`, `timestamptz`), sin
  extensiones propietarias fuera de `pgcrypto`/`uuid-ossp` (disponibles en Supabase por
  defecto).
- [x] **Compatibilidad**: `empresa_id` en todo el modelo no rompe el caso de uso actual
  (una sola empresa) y habilita multi-entidad sin migración destructiva futura.
