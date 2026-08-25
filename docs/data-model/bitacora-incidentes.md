# Bitácora de Incidentes — Modelo de Datos

Registro corto de síntoma → causa → solución para cambios estructurales, siguiendo el
protocolo del proyecto (§3, "Cambios estructurales bajo protocolo"). Agregar una entrada
nueva cada vez que se depure algo no obvio relacionado con el esquema, para no repetir el
diagnóstico la próxima vez que se parezca. Entradas más recientes primero.

## Plantilla

```
### AAAA-MM-DD — Título corto del incidente

- **Síntoma**: qué se observó.
- **Causa**: raíz real del problema (no el síntoma).
- **Solución**: qué se cambió y en qué migración/commit.
- **Prevención** (opcional): cómo evitar que se repita.
```

## Incidentes durante la construcción del frontend

### 2026-08-25 — `p_empresa_expr` con subselect directo a otra tabla RLS bloqueaba TODA lectura para roles con permisos parciales

- **Síntoma**: al verificar empíricamente `20260825000018_alcance_por_fila_contratos_compras.sql`
  (refinamiento de alcance PROPIOS/EQUIPO/TODOS), un usuario de prueba con rol Desarrollador
  (permiso de lectura solo sobre `timesheets`/`asignacion_recursos`/`hitos_entregables`, sin
  ningún permiso sobre el módulo `proyectos`) no veía absolutamente ninguna fila de
  `timesheets`, ni siquiera las suyas propias — a pesar de que `fn_tiene_permiso(...)` y el
  nuevo `fn_alcance_permiso(...)` devolvían ambos los valores correctos (`true` / `PROPIOS`).
- **Causa**: el `p_empresa_expr` de `timesheets` (y de `hitos_entregables`, `asignacion_recursos`,
  `rentabilidad_snapshots`, `change_requests`, `facturas_referencia_externa`,
  `casos_soporte_referencia_externa`, `evaluaciones_proveedor`, `ordenes_costo_subcontratacion`)
  resolvía la empresa con un subselect correlacionado directo contra otra tabla protegida por
  RLS (p. ej. `select p.empresa_id from proyectos p where p.id = timesheets.proyecto_id`), sin
  ningún bypass. Ese subselect se ejecuta con los privilegios del rol que consulta
  (`authenticated`), así que si ese rol no tiene permiso de lectura sobre la tabla referenciada
  (`proyectos`), la fila de `proyectos` es invisible para él, el subselect devuelve `NULL`, la
  comparación `NULL = fn_empresa_actual()` es siempre falsa, y la fila del hijo (`timesheets`)
  queda bloqueada sin importar su propio permiso o alcance. Este bug es preexistente a las ~9
  tablas que usan este patrón (no lo introdujo esta migración), pero solo se manifestaba con
  roles de permiso "estrecho" — exactamente el tipo de rol que el refinamiento de alcance por
  fila está diseñado para soportar — por eso no se había detectado antes.
- **Solución**: se agregaron 3 funciones `SECURITY DEFINER` (`fn_empresa_de_proyecto`,
  `fn_empresa_de_contrato`, `fn_empresa_de_proveedor`), mismo patrón que ya usa
  `fn_empresa_actual()` para `perfiles_usuario`, y se reescribió el `p_empresa_expr` de las 9
  tablas afectadas para usarlas en vez del subselect directo. `disponibilidad_recursos` se dejó
  sin cambio porque su subselect apunta a `perfiles_usuario`, que ya tiene una política SELECT
  adicional sin gate de módulo (`perfiles_usuario_misma_empresa_select_pol`) — confirmado que no
  sufre el mismo bug. Verificado en Postgres local: tras el fix, el usuario Desarrollador de
  prueba ve exactamente su propio timesheet (1) y no el de otro recurso en el mismo proyecto (0).
- **Prevención**: ningún `p_empresa_expr` (ni ninguna expresión embebida en una política RLS)
  debe hacer un subselect directo contra otra tabla protegida por RLS-por-permiso-de-módulo;
  siempre envolver esa búsqueda en una función `SECURITY DEFINER` dedicada. Pendiente: revisar
  si el mismo patrón de bug existe en tablas fuera de Contratos y Proyectos / Compras (quedó
  fuera del alcance de esta migración — ver siguiente pasada de CRM y Ventas / Productos y
  Servicios / Configuración General).

### 2026-08-25 — `vista_rentabilidad_proyecto` no respetaba RLS multiempresa (fuga de datos real entre empresas)

- **Síntoma**: al construir Checkpoint 5b (pantalla de Rentabilidad), antes de
  exponer la vista en la app, se verificó empíricamente en Postgres local con
  un contrato+proyecto de prueba para "Devtopia S.A.S." y otro para "Otra
  Empresa SAS": un usuario autenticado de Devtopia S.A.S. haciendo
  `select * from vista_rentabilidad_proyecto` obtenía AMBOS proyectos,
  incluyendo el de la otra empresa. `anon`/`authenticated` además tenían
  grants directos de `SELECT` sobre la vista (herencia de los grants amplios
  por defecto del schema `public`), sin ninguna barrera real de por medio.
- **Causa**: `vista_rentabilidad_proyecto` (creada en 005, redefinida en 006)
  es una `VIEW` normal de Postgres, sin `security_invoker`, creada por el rol
  `postgres` — dueño también de las tablas que consulta
  (`proyectos`/`timesheets`/`licencias_asignadas`/
  `ordenes_costo_subcontratacion`). Una vista sin `security_invoker` resuelve
  el RLS de sus tablas usando los privilegios del DUEÑO de la vista, no del
  rol que la consulta, y un dueño de tabla salta RLS por defecto (a menos que
  se use `FORCE ROW LEVEL SECURITY`, que no se usa aquí). Resultado: RLS
  multiempresa quedaba completamente sin efecto para cualquiera que
  consultara la vista directamente.
- **Solución**: `20260825000017_fix_vista_rentabilidad_rls.sql` revoca el
  acceso directo a la vista (`revoke all ... from authenticated, anon`) y
  agrega `fn_listar_rentabilidad_proyectos()`, una función `SECURITY DEFINER`
  que sí filtra explícitamente por `fn_empresa_actual()` y exige
  `CONTRATOS_PROYECTOS/leer/rentabilidad` antes de devolver cualquier fila.
  Se descartó a propósito el fix más obvio (`alter view ... set
  (security_invoker = true)`): habría vuelto a aplicar el RLS de las tablas
  referenciadas evaluado como el usuario que consulta, pero rentabilidad es
  por diseño un rollup cruzado de varios módulos (timesheets, licencias de
  Productos y Servicios, órdenes de costo de Compras) — un usuario con solo
  `CONTRATOS_PROYECTOS/leer/rentabilidad` no necesariamente tiene permiso de
  lectura sobre esos otros módulos, así que la vista habría dejado de filtrar
  por empresa ajena, pero habría mostrado costos en 0 para cualquiera sin
  esos otros permisos, dando una rentabilidad falsamente inflada en vez de un
  error claro — mismo caso ya resuelto así para `fn_listar_cuentas_basico()`
  y `fn_convertir_cotizacion_a_proyecto()`. Verificado empíricamente: un
  usuario de Devtopia S.A.S. con permiso de rentabilidad obtiene solo su
  propio proyecto vía `fn_listar_rentabilidad_proyectos()`; un usuario sin
  `CONTRATOS_PROYECTOS/leer/rentabilidad` obtiene 0 filas aunque tenga otros
  permisos del módulo; `select * from vista_rentabilidad_proyecto` directo ya
  no es accesible para `authenticated`/`anon` (falla por falta de
  privilegio).
- **Prevención**: cualquier `VIEW` normal de Postgres creada por un rol que
  también sea dueño de las tablas que referencia salta RLS silenciosamente
  para quien la consulte — no basta con que las tablas base tengan RLS
  habilitado. Antes de exponer una vista nueva en la app, verificar
  explícitamente (con un fixture de dos empresas, como aquí) si el dueño de
  la vista coincide con el dueño de sus tablas base; si coincide, no usar
  `security_invoker` a ciegas cuando la vista cruza varios módulos con
  permisos distintos — envolverla en una función `SECURITY DEFINER` con los
  filtros de empresa y permiso explícitos adentro, mismo patrón que
  `fn_listar_cuentas_basico()`.

### 2026-08-25 — Convertir una cotización en proyecto requiere 3 escrituras atómicas que el cliente de Supabase no puede encadenar de forma segura

- **Síntoma**: al construir Checkpoint 5a (Contratos y Proyectos) se necesitaba
  la transición COTIZACION `ACEPTADA` → `CONVERTIDA`, ya bloqueada
  explícitamente en código desde Checkpoint 3 porque el módulo no existía
  (ver `ESTADO_BLOQUEADO_SIN_MODULO` en `cotizaciones-actions.ts`). El
  problema no era solo "crear el proyecto": `proyectos.contrato_id` es
  `not null` y `cotizaciones.proyecto_generado_id` apunta a `proyectos`, no a
  `contratos` — así que "convertir a proyecto" implica crear un contrato Y un
  proyecto Y actualizar la cotización en la misma operación. Encadenar 3
  Server Actions (`crearContrato` → `crearProyecto` → `cambiarEstadoCotizacion`)
  habría dejado datos huérfanos ante cualquier fallo a mitad de camino (un
  contrato sin proyecto, o una cotización marcada CONVERTIDA sin backing
  real) porque el cliente de Supabase desde Next.js no expone transacciones
  multi-statement.
- **Causa**: no es un bug de esquema — es una limitación estructural del
  cliente JS de Supabase (PostgREST por debajo), que no soporta agrupar
  varios `insert`/`update` en una sola transacción atómica desde la
  aplicación.
- **Solución**: `20260825000016_fn_convertir_cotizacion_a_proyecto.sql` agrega
  una función `SECURITY DEFINER` que hace las 3 escrituras (contrato,
  proyecto, actualización de la cotización + fila en `workflows_historial`)
  dentro de una sola transacción de Postgres, con los chequeos de permiso de
  los 3 módulos involucrados (`CRM_VENTAS/editar/cotizaciones`,
  `CONTRATOS_PROYECTOS/crear/contratos`, `CONTRATOS_PROYECTOS/crear/
  proyectos`) verificados explícitamente dentro de la función, ya que abarca
  más de una política RLS. `convertirCotizacionAProyecto()` en
  `contratos-proyectos/actions.ts` la invoca vía `supabase.rpc(...)`, y el
  botón "Convertir a proyecto" en `cotizaciones-panel.tsx` reemplaza el
  bloqueo genérico. Verificado empíricamente en Postgres local: conversión
  exitosa de una cotización ACEPTADA, doble conversión rechazada con mensaje
  claro, y un usuario sin los permisos de Contratos y Proyectos bloqueado
  aunque tenga permiso sobre cotizaciones.
- **Prevención**: cuando una operación de negocio necesita escrituras
  atómicas en más de una tabla/política RLS, no intentar encadenar Server
  Actions — usar una función `SECURITY DEFINER` con los chequeos de permiso
  explícitos adentro, mismo patrón ya usado en `fn_generar_consecutivo()` y
  `fn_listar_cuentas_basico()`.

### 2026-08-25 — `cotizaciones_aprobaciones`: la política RLS de UPDATE no distinguía "aprobar" de "editar"

- **Síntoma**: `resolverAprobacion()` (Cotizaciones, Checkpoint 3) siempre
  exigió el permiso `aprobar` en la capa de aplicación, pero eso no lo
  garantizaba la base de datos. Documentado desde esa etapa como caveat
  conocido, sin cerrar. Verificado en Postgres local en esta etapa: un
  usuario con `CRM_VENTAS/editar/cotizaciones` pero sin
  `CRM_VENTAS/aprobar/cotizaciones` podía hacer `UPDATE` directo sobre
  `cotizaciones_aprobaciones` (vía REST/SDK, sin pasar por el server action)
  y resolver una aprobación igual.
- **Causa**: `fn_crear_politicas_rls()` genera automáticamente una política
  UPDATE estándar ligada al permiso genérico `editar` de la sublista — no
  sabe distinguir una acción de negocio más específica como "aprobar", así
  que `cotizaciones_aprobaciones_update_pol` quedó exigiendo `editar` en vez
  de `aprobar`.
- **Solución**: `20260825000014_fix_rls_aprobar_cotizaciones.sql` reemplaza
  esa política para exigir `CRM_VENTAS/aprobar/cotizaciones`, igual que ya
  exige la aplicación. Verificado empíricamente: un usuario con `editar` pero
  sin `aprobar` ya no puede hacer el `UPDATE` (0 filas afectadas); uno con
  `aprobar` sí puede.
- **Prevención**: cuando una tabla tiene una acción de negocio más específica
  que las 5 genéricas de `fn_tiene_permiso()` (leer/crear/editar/eliminar/
  aprobar), no asumir que la política generada por `fn_crear_politicas_rls()`
  ya la cubre — revisar `pg_policies` explícitamente contra lo que la
  aplicación realmente necesita, como se hizo aquí.

### 2026-08-25 — Licencias (Productos y Servicios) sin forma de leer `cuentas_clientes` para su selector de cliente

- **Síntoma**: el selector de cliente de la pantalla de Licencias necesita
  listar `cuentas_clientes`, pero esa tabla es de `CRM_VENTAS`. Un usuario con
  permisos solo de `PRODUCTOS_SERVICIOS/leer/licencias` obtenía 0 filas (sin
  error visible) y el dropdown quedaba vacío. Detectado y documentado como
  caveat conocido al construir Licencias (Checkpoint 2); no es un bug de RLS
  mal escrita, es un cruce de módulos que el diseño original no contempló.
- **Causa**: `cuentas_clientes_select_pol` exige
  `CRM_VENTAS/leer/cuentas`, sin ninguna excepción para otros módulos que
  necesiten leer una versión mínima de la misma tabla.
- **Solución**: `20260825000015_fn_listar_cuentas_basico.sql` agrega una
  función `SECURITY DEFINER` de solo lectura que expone únicamente `id` y
  `razon_social` (nunca las demás columnas, algunas sensibles), filtrada por
  empresa y por `CRM_VENTAS/leer/cuentas` O `PRODUCTOS_SERVICIOS/leer/
  licencias`. `app/(app)/productos-servicios/page.tsx` ahora llama a
  `supabase.rpc('fn_listar_cuentas_basico')` en vez de un `select` directo.
  Verificado empíricamente: ese mismo usuario obtiene filas de la función
  pero sigue sin poder hacer `select * from cuentas_clientes` directo.
- **Prevención**: cuando dos módulos necesitan leer (parcialmente) la misma
  tabla con reglas de permiso distintas, no ampliar la política RLS de la
  tabla base (expondría todas sus columnas a quien no debería verlas) — usar
  una función `SECURITY DEFINER` acotada a las columnas realmente
  necesarias, mismo patrón que `fn_generar_consecutivo`/`fn_audit_row`.

### 2026-08-25 — `log_auditoria` sin aislamiento multiempresa (fuga de datos entre empresas, no un bug de "bootstrap")

- **Síntoma**: al construir el visor de Auditoría (Configuración General), se
  detectó que `log_auditoria` no tiene columna `empresa_id`. Verificado en
  Postgres local: un Administrador de la empresa "Devtopia S.A.S." podía leer
  la fila de auditoría del `INSERT` de la empresa de prueba "Otra Empresa
  SAS" — otro tenant — incluyendo el JSON completo (`valores_nuevos`) de ese
  registro ajeno.
- **Causa**: a diferencia de los incidentes anteriores (009-012, que
  bloqueaban a un usuario leer SUS PROPIOS datos), esta es una fuga real de
  datos entre empresas: la política `log_auditoria_select_pol`
  (`20260825000008_rls_baseline.sql`) solo verificaba
  `fn_tiene_permiso('CONFIGURACION','leer','auditoria')`, sin ningún filtro
  de empresa. `log_auditoria` es polimórfica (`tabla_afectada` +
  `registro_id` apuntan a cualquiera de 19 tablas auditadas por
  `fn_audit_row()`), y esa función nunca calculó a qué empresa pertenecía
  cada fila — un descuido del diseño original, no algo introducido después.
- **Solución**: `20260825000013_fix_log_auditoria_aislamiento_multiempresa.sql`
  agrega la columna `empresa_id` a `log_auditoria`, reescribe `fn_audit_row()`
  para calcularla según la tabla auditada (columna directa para 10 de las 19
  tablas; caso especial para `empresas` y para `permisos` vía `roles`; queda
  `null` — a propósito, de forma segura — para las 7 tablas restantes que
  hoy no tienen forma directa de resolver la empresa y que pertenecen a
  módulos sin UI todavía), hace un backfill best-effort de las filas
  existentes reutilizando el JSON ya guardado en cada una, y reemplaza la
  política SELECT para exigir también `empresa_id = fn_empresa_actual()`.
  Verificado en Postgres local: el Administrador de Devtopia S.A.S. pasó de
  ver 40 filas (todas) a ver 37 (solo las de su empresa); un `UPDATE` nuevo
  sobre `cuentas_clientes` genera una fila de auditoría con `empresa_id`
  correcto sin intervención manual.
- **Prevención**: cualquier tabla de auditoría/bitácora polimórfica que
  registre cambios sobre múltiples tablas de negocio necesita resolver y
  guardar su propio `empresa_id` en el momento de la escritura — no se puede
  confiar en una política RLS que solo verifique el permiso del módulo, como
  si fuera una tabla de una sola empresa. Revisar el mismo patrón si se
  agrega alguna otra tabla polimórfica de bitácora/historial en el futuro
  (p. ej. si `workflows_historial` alguna vez necesita filtrarse por
  empresa además de por permiso).

### 2026-08-25 — Catálogos y estados de flujo invisibles para roles no Administrador (incluye un bug retroactivo en CRM ya entregado)

- **Síntoma**: al construir Cotizaciones (para cerrar CRM y Ventas), un usuario Comercial
  obtenía 0 filas de `catalogos_valores`, `estados_ciclo_vida` y `workflows_transiciones` —
  lo que habría dejado el selector de estado/transiciones de una cotización completamente
  vacío. Al investigar se confirmó que esto **ya afectaba una pantalla entregada
  anteriormente**: el selector de "motivo de pérdida" en Oportunidades (checkpoint CRM
  previo) también dependía de `catalogos_valores` y estaba silenciosamente roto para
  cualquier rol distinto de Administrador (no lanzaba error — PostgREST simplemente
  devolvía 0 filas).
- **Causa**: mismo patrón de "bootstrap" ya visto dos veces (perfiles de usuario en 009,
  generador de consecutivos en 010): las políticas de `20260825000008_rls_baseline.sql`
  gatean estas tres tablas por `fn_tiene_permiso('CONFIGURACION', 'leer', 'workflows'/
  'catalogos')`, y en la matriz sembrada solo Administrador tiene una fila de permisos
  para CONFIGURACION. Son tablas de referencia/estado que conceptualmente viven bajo
  Configuración, pero que TODA la aplicación necesita poder leer para pintar catálogos y
  flujos de trabajo, no solo para administrarlos.
- **Solución**: `20260825000012_rls_lectura_catalogos_y_workflows_compartidos.sql` agrega
  3 políticas SELECT aditivas de lectura por empresa (`empresa_id = fn_empresa_actual()`,
  sin exigir permiso de módulo) sobre `catalogos_valores`, `estados_ciclo_vida` y
  `workflows_transiciones` (esta última vía un subquery a `estados_ciclo_vida` para
  resolver su `empresa_id`, ya que la tabla no tiene la columna directamente). Se excluyó
  deliberadamente `secuencias_numeracion` del alcance de esta migración porque su único
  punto de acceso ya es `fn_generar_consecutivo()` (`SECURITY DEFINER` desde la migración
  010). Verificado en Postgres local simulando un usuario Comercial: ve los 6 valores de
  `MOTIVO_PERDIDA_OPORTUNIDAD`, los 7 `estados_ciclo_vida` de `entidad_aplicable =
  'COTIZACION'`, y las 6 `workflows_transiciones` correspondientes; el usuario de otra
  empresa simulada sigue viendo 0 filas (aislamiento multiempresa intacto).
- **Prevención**: cualquier tabla de catálogo o de motor de flujo de trabajo
  (`estados_ciclo_vida`, `workflows_transiciones`, `catalogos_valores`) es, por
  definición, de lectura transversal a toda la aplicación — nunca debe quedar gateada
  únicamente por el permiso de módulo de quien la administra (CONFIGURACION). Revisar
  este mismo patrón antes de dar por cerrada cualquier pantalla nueva que dependa de un
  catálogo o de un estado de flujo, no solo al construirla sino también al reusar un
  catálogo ya existente en una pantalla previamente entregada (como ocurrió aquí con el
  motivo de pérdida).

### 2026-08-25 — Nombre de compañeros invisible en pantallas colaborativas (ejecutivo comercial, "quién registró")

- **Síntoma**: en el módulo CRM y Ventas, las columnas "ejecutivo comercial" (Cuentas y
  Oportunidades) y "registró" (bitácora de seguimiento) aparecían vacías ("—") cada vez que
  el dato pertenecía a OTRO usuario distinto del que tenía la sesión abierta — cada usuario
  solo veía su propio nombre en esas columnas. No lanzaba ningún error: PostgREST
  simplemente omite (`null`) un embed (`perfiles_usuario(nombre_completo)`) bloqueado por
  RLS, así que era fácil no notarlo probando con un solo usuario.
- **Causa**: la política `perfiles_usuario_self_select_pol`
  (`20260825000009_rls_lectura_basica_propia.sql`) solo permite a cada usuario leer SU
  PROPIA fila de `perfiles_usuario`. Verificado en Postgres local con dos usuarios reales
  (Comercial y Administrador) simulados: la actividad registrada por Administrador se veía
  con `registrado_por = null` al consultar como Comercial.
- **Solución**: `20260825000011_rls_perfiles_usuario_visibles_en_empresa.sql` agrega una
  política SELECT aditiva: cualquier usuario autenticado puede leer los perfiles de TODOS
  los usuarios de su propia empresa (`empresa_id = fn_empresa_actual()`), no solo el suyo —
  equivalente a un directorio interno. Verificado que un usuario de OTRA empresa simulada
  sigue sin ver estos perfiles (aislamiento multiempresa intacto), y que tras la migración
  el Comercial ve correctamente `registrado_por = 'Admin Prueba'`.
- **Prevención**: cualquier tabla que se vaya a **embeber** desde otra vía PostgREST (join
  implícito) para mostrar "quién hizo esto" en una pantalla colaborativa necesita una
  política de lectura a nivel de organización (no solo autolectura) desde el diseño de la
  etapa correspondiente — la autolectura sirve para "quién soy yo", no para "quién es mi
  compañero". Revisar este mismo patrón al construir Contratos y Proyectos (recursos
  asignados, aprobadores) y Compras (aprobador interno).

### 2026-08-25 — `fn_generar_consecutivo()` fallaba para cualquier rol que no fuera Administrador

- **Síntoma**: al construir el módulo CRM y Ventas (creación de `oportunidades`, cuyo
  `codigo` se genera con `fn_generar_consecutivo('OPORTUNIDAD', empresa_id)`), un usuario
  con rol Comercial/PM/Desarrollador recibía `Secuencia OPORTUNIDAD no configurada para la
  empresa ...` al crear una oportunidad — aunque la secuencia sí estaba sembrada
  correctamente en `seed.sql`.
- **Causa**: la función, tal como quedó definida en
  `20260825000002_configuracion_general.sql`, es `SECURITY INVOKER` (el valor por defecto):
  corre con los privilegios de quien la llama y hace un `select ... for update` + `update`
  directo sobre `secuencias_numeracion`, tabla protegida por RLS bajo
  `CONFIGURACION`/`editar`. En la matriz sembrada solo Administrador tiene una fila de
  permisos para CONFIGURACION — para cualquier otro rol, RLS bloqueaba silenciosamente el
  `select ... for update` dentro de la función, que entonces reportaba "no encontrado"
  aunque la fila sí existiera. Mismo patrón de "bootstrap circular" que el incidente
  anterior, pero sobre una función en vez de una tabla de sesión.
- **Solución**: `20260825000010_fix_generador_consecutivo_security_definer.sql` cambia la
  función a `SECURITY DEFINER` + `set search_path = public` (mismo patrón ya usado en
  `fn_empresa_actual()`/`fn_tiene_permiso()`), y agrega una verificación explícita
  `p_empresa_id = fn_empresa_actual()` al inicio — necesaria porque SECURITY DEFINER
  bypasea RLS, así que sin ese chequeo cualquier usuario autenticado podría avanzar el
  consecutivo de OTRA empresa pasándole un `p_empresa_id` ajeno. Verificado en Postgres
  local simulando un usuario con rol Comercial: genera `OPP-2026-0001`/`OPP-2026-0002`
  correctamente para su propia empresa, y recibe un error explícito (sin tocar el contador)
  al intentar generar un consecutivo para una empresa ajena.
- **Prevención**: cualquier función `SECURITY DEFINER` que toque una tabla filtrada por
  `empresa_id` debe revalidar la empresa explícitamente en su primera línea — SECURITY
  DEFINER es "todo o nada" respecto a RLS, no hay forma de heredar parcialmente las
  políticas del invocador. Y, en general: cualquier función que la capa de aplicación deba
  poder invocar independientemente del rol de negocio del usuario (numeración de
  documentos, resolución de "quién soy") es candidata a necesitar SECURITY DEFINER desde el
  diseño inicial, no como parche posterior.

### 2026-08-25 — RLS baseline bloqueaba a un usuario la lectura de sus propios datos ("bootstrap" circular)

- **Síntoma**: al construir el hook de sesión del frontend, un usuario con rol distinto de
  Administrador (p. ej. Desarrollador, PM, Comercial) no podía leer ni su propia fila de
  `perfiles_usuario`, ni el nombre de su `empresas`, ni su propia fila de `roles`, ni sus
  propias filas de `permisos` — es decir, la aplicación no podía pintar ni el navbar tras
  iniciar sesión para ningún rol que no fuera Administrador.
- **Causa**: las políticas RLS de `20260825000008_rls_baseline.sql` gatean la lectura de
  esas 4 tablas por `fn_tiene_permiso('CONFIGURACION', 'leer', ...)`, y en la matriz
  sembrada (`seed.sql`) solo el rol Administrador tiene permiso de lectura sobre el módulo
  CONFIGURACION. Un usuario necesita leer su propio perfil/rol/permisos precisamente para
  que la aplicación sepa qué puede hacer — pedirle además el permiso de CONFIGURACION para
  poder leer esos datos es circular.
- **Solución**: `20260825000009_rls_lectura_basica_propia.sql` agrega 4 políticas SELECT
  aditivas (Postgres combina políticas del mismo comando con OR, así que solo amplían
  acceso, nunca lo restringen): cada usuario puede leer su propio `perfiles_usuario`, los
  datos básicos de su propia `empresas`, su propio `roles`, y sus propias filas de
  `permisos`. Verificado en Postgres local simulando un usuario con rol Desarrollador: ve
  exactamente 1 perfil (el suyo), 1 empresa, 1 rol, 3 permisos (los de su rol), y sigue
  viendo 0 filas de `cuentas_clientes` (sin acceso a CRM, como debe ser).
- **Prevención**: cualquier tabla que el frontend necesite leer para saber "quién soy y qué
  puedo hacer" debe tener una política de auto-lectura explícita, independiente de la
  matriz de permisos — nunca asumir que "leer mis propios datos de sesión" está cubierto
  por el mismo permiso que administra esos datos para terceros.

## Incidentes durante el diseño inicial (validados antes de entregar)

### 2026-08-25 — `CREATE OR REPLACE VIEW` fallaba al completar `vista_rentabilidad_proyecto`

- **Síntoma**: al aplicar `20260825000006_compras_subcontratacion.sql` contra Postgres 16,
  falló con `cannot change data type of view column "costo_subcontratacion" from
  numeric(18,2) to numeric`.
- **Causa**: la definición inicial de la vista (migración 04) fijaba la columna como
  `0::numeric(18,2)`, pero el `sum()` de un `numeric(18,2)` en la definición reemplazada
  (migración 05) resuelve a `numeric` sin precisión/escala explícitas. Postgres no permite
  que `CREATE OR REPLACE VIEW` cambie el tipo de una columna existente.
- **Solución**: se agregó un cast explícito `::numeric(18,2)` a las cinco columnas
  calculadas en ambas definiciones de la vista, para que el tipo sea idéntico en las dos
  versiones.
- **Prevención**: toda vista que se vaya a reemplazar más adelante (`create or replace
  view`) debe declarar el tipo exacto (incluida precisión/escala) de cada columna
  calculada desde su primera versión, no confiar en la inferencia automática de tipo.

### 2026-08-25 — Literales UUID inválidos en `seed.sql`

- **Síntoma**: (detectado antes de aplicar, por validación programática) varios UUID de
  ejemplo usaban letras fuera del rango hexadecimal (`r`, `k`, `x`, `o`, `p`), lo que
  Postgres habría rechazado como UUID inválido.
- **Causa**: al generar IDs mnemotécnicos legibles a mano (`...-r1`, `...-e0k01`, etc.) no
  se validó que todos los caracteres fueran dígitos hexadecimales (0-9, a-f).
- **Solución**: se rediseñó la convención a `000000000` + 3 dígitos hexadecimales en el
  último segmento, y se corrió un script de validación (`re.match` contra el patrón
  UUID estándar) sobre todos los archivos `.sql` antes de aplicar cualquier migración.
- **Prevención**: cualquier IDs fijo nuevo en scripts de semilla debe pasar por el mismo
  validador antes de considerarse listo para aplicar. No confiar en revisión visual para
  literales UUID.
