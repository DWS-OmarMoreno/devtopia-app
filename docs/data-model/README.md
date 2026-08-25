# Modelo de Datos — Devtopia ERP

Diseño completo de la estructura de datos para los 6 módulos solicitados (CRM y Ventas;
Contratos y Proyectos; Productos y Servicios; Compras y Subcontratación; Cierre y
Postventa; Configuración General), sobre el stack ya presente en el repo (Next.js 14 +
Supabase/Postgres). Ver `00-overview.md` para las convenciones que aplican a todo el
modelo antes de leer cualquier módulo individual.

## Índice

1. [`00-overview.md`](./00-overview.md) — convenciones globales y orden de dependencia
2. [`01-configuracion-general.md`](./01-configuracion-general.md) — parámetros globales, consecutivos, RBAC, alertas, integraciones, workflows, auditoría
3. [`02-productos-servicios.md`](./02-productos-servicios.md) — catálogo de servicios/tarifas, licencias/SaaS, SLA
4. [`03-crm-ventas.md`](./03-crm-ventas.md) — cuentas, contactos, oportunidades, cotizaciones, conversión a proyecto
5. [`04-contratos-proyectos.md`](./04-contratos-proyectos.md) — contratos, proyectos, hitos, timesheets, recursos, rentabilidad, change requests, sublistas
6. [`05-compras-subcontratacion.md`](./05-compras-subcontratacion.md) — proveedores/freelancers, órdenes de costo
7. [`06-cierre-postventa.md`](./06-cierre-postventa.md) — checklist de liquidación, actas de cierre, garantías
8. [`bitacora-incidentes.md`](./bitacora-incidentes.md) — síntoma → causa → solución, para no repetir diagnósticos

## SQL ejecutable

`supabase/migrations/` contiene una migración por etapa, en el mismo orden de dependencia
que los documentos de diseño:

| Migración | Contenido |
|---|---|
| `20260825000001_extensiones_y_funciones_base.sql` | `pgcrypto`, `citext`, `fn_set_updated_at()` |
| `20260825000002_configuracion_general.sql` | empresas, monedas, consecutivos, RBAC, alertas, integraciones, workflows, auditoría, catálogos |
| `20260825000003_productos_servicios.sql` | catálogo, tarifas, licencias, SLA |
| `20260825000004_crm_ventas.sql` | cuentas, contactos, oportunidades, cotizaciones |
| `20260825000005_contratos_proyectos.sql` | contratos, proyectos, hitos, timesheets, recursos, CRs, sublistas, vista de rentabilidad |
| `20260825000006_compras_subcontratacion.sql` | proveedores, órdenes de costo, cierre de FK diferidos |
| `20260825000007_cierre_postventa.sql` | checklist de liquidación, actas, garantías |
| `20260825000008_rls_baseline.sql` | Row Level Security multiempresa + RBAC para toda tabla de negocio |

`supabase/seed.sql` — datos de arranque: 1 empresa, 2 monedas, los 4 roles pedidos en el
requerimiento (+ un rol de arranque sin privilegios), matriz de permisos por defecto,
consecutivos de ejemplo (reproduce literalmente `COT-2026-0001` y `PRJ-PROD-0042`),
estados de ciclo de vida + transiciones para cotización/contrato/proyecto/CR/orden de
costo, y varios catálogos configurables de ejemplo.

## Validación ya realizada sobre este diseño

Antes de esta entrega se levantó un Postgres 16 local, se aplicaron las 8 migraciones y
el seed en orden contra una base vacía (con un esquema `auth` mínimo simulando
Supabase Auth), y se verificó en vivo:

- `fn_generar_consecutivo('COTIZACION', ...)` produce `COT-2026-0001`, `COT-2026-0002`; 42
  llamadas a `PROYECTO_PRODUCTO` producen `PRJ-PROD-0042` — coincide exactamente con los
  ejemplos del requerimiento.
- El trigger `trg_nuevo_usuario_perfil` crea automáticamente el `perfiles_usuario` de un
  usuario nuevo de `auth.users`, con el rol sin privilegios.
- `fn_audit_row()` deja rastro correcto en `log_auditoria` al insertar una cuenta cliente.
- `vista_rentabilidad_proyecto` no falla con datos vacíos.
- Las 206 políticas RLS generadas (54 tablas con RLS habilitado) efectivamente **bloquean**
  el acceso a un usuario con el rol sin privilegios (0 filas visibles) y lo **permiten**
  tras promoverlo a Administrador (1 fila visible) — se corrigió en el proceso un error
  real de `CREATE OR REPLACE VIEW` (ver `bitacora-incidentes.md`).

Esta validación cubre correctitud sintáctica y mecánica del esquema; no reemplaza pruebas
de integración con el código Next.js real una vez se construyan las server actions.

## Cómo aplicar esto contra un proyecto Supabase real

1. `supabase link --project-ref <ref>` (una sola vez).
2. `supabase db push` para aplicar `supabase/migrations/` en orden — o `supabase db reset`
   en un entorno de desarrollo para aplicar migraciones + `seed.sql` de una vez.
3. `supabase gen types typescript --linked > utils/database.types.ts` para regenerar los
   tipos que consumirá el frontend Next.js.
4. Crear el primer usuario real desde `app/(auth)/register`, y desde la base de datos (o
   una pantalla de administración futura) promoverlo de `Pendiente de Asignación` a
   `Administrador` actualizando `perfiles_usuario.rol_id`.

Ver el procedimiento completo de aplicación/rollback en `00-overview.md §8`.

## Checklist global de cierre (ISO/IEC 25010) — antes de aplicar a un entorno real

- [ ] **Funcionalidad**: confirmar con el usuario de negocio que los 6 módulos cubren el
  100% de lo pedido antes de generar las server actions/UI sobre este esquema (revisión
  humana pendiente — este documento es la etapa de diseño, no la de implementación).
- [x] **Fiabilidad**: consecutivos atómicos, auditoría append-only, triggers de
  sincronización (calificación de proveedor, % de checklist) verificados en vivo.
- [x] **Seguridad**: RLS habilitado en el 100% de las tablas de negocio y verificado
  funcionalmente (bloquea/permite según rol); ningún secreto en texto plano en el modelo.
- [x] **Mantenibilidad**: convenciones centralizadas en `00-overview.md`; generador de
  políticas RLS en vez de 180+ políticas escritas a mano; catálogos configurables en vez
  de ENUMs para listas de negocio.
- [x] **Compatibilidad**: aprovecha Supabase Auth ya presente en el stack; tipos estándar
  SQL, sin extensiones propietarias fuera de `pgcrypto`/`citext`.
- [ ] **Usabilidad/Eficiencia de desempeño en producción**: pendiente de medir con datos
  reales una vez haya volumen (índices ya definidos por FK y por los filtros más
  frecuentes, pero el ajuste fino de índices compuestos requiere patrones de consulta
  reales del frontend).

## Pendiente explícito para la siguiente etapa (no incluido en esta entrega)

- Refinar el `alcance` (`TODOS`/`EQUIPO`/`PROPIOS`) de la matriz `permisos` a nivel de fila
  individual en las políticas RLS (hoy el baseline aplica el permiso a nivel de
  módulo/empresa; "ver solo mis timesheets" aún no está impuesto por la base de datos,
  solo por la matriz declarada).
- Server actions y UI de Next.js que consuman este esquema.
- Definir el mapeo real de eventos a `alertas_notificaciones_reglas` y el envío efectivo
  (proveedor de correo) — el modelo de datos ya soporta el patrón de resiliencia, falta la
  integración concreta.
