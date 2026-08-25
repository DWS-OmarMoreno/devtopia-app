-- =============================================================================
-- Etapa Cierre y Postventa — activación real del módulo (RLS completa +
-- alcance por fila desde el diseño).
--
-- Contexto: las tablas de este módulo existen desde la migración 007 y su RLS
-- baseline desde la 008 (Etapa 7), pero el módulo en sí nunca tuvo UI ni
-- server actions — era un placeholder ("en construcción"). Al construir la
-- funcionalidad real se revisó su RLS con el mismo criterio aplicado en el
-- refinamiento transversal de alcance por fila (migraciones 018/019/020) y se
-- encontraron los mismos dos problemas ya vistos ahí:
--
--   1. BUG (mismo patrón que 018): varios p_empresa_expr de este módulo
--      resuelven la empresa con un subselect/join RAW y directo contra
--      `proyectos` y/o `contratos` — tablas protegidas por RLS bajo el módulo
--      CONTRATOS_PROYECTOS, con su propio permiso y su propio alcance. Un rol
--      con permiso sobre CIERRE_POSTVENTA pero sin permiso de lectura sobre
--      CONTRATOS_PROYECTOS/proyectos (perfectamente razonable — ej. un
--      Administrador de postventa sin acceso al módulo de proyectos) vería el
--      subselect devolver NULL y CIERRE_POSTVENTA quedaría invisible entero.
--      Se corrige reutilizando los helpers SECURITY DEFINER que ya existen
--      desde la 018 (fn_empresa_de_proyecto, fn_empresa_de_contrato) — no
--      hace falta crear ninguno nuevo.
--
--   2. El mismo bug (2) existía TAMBIÉN, sin corregir, en una tabla que quedó
--      fuera de las 12 de la Fase 1: `hitos_criterios_aceptacion`
--      (CONTRATOS_PROYECTOS/hitos_entregables). Su p_empresa_expr original
--      (migración 008) hace `from hitos_entregables h join proyectos p on
--      p.id = h.proyecto_id` — la referencia directa a `proyectos p` tiene el
--      mismo problema. La migración 018 ya advertía en su propio encabezado
--      que este patrón "puede existir en otras tablas fuera de las 12 de esta
--      fase" — esta es esa tabla. Se corrige aquí de una vez, aprovechando
--      que se está revisando RLS de nuevo con la misma lupa.
--
-- Regla aplicada de forma consistente en toda esta migración (y que debería
-- guiar cualquier p_empresa_expr/p_alcance_expr nuevo de aquí en adelante):
--   - Un subselect hacia una tabla de la MISMA sublista (mismo módulo +
--     sublista, ej. checklist_liquidacion_items -> checklist_liquidacion_proyecto,
--     ambas CIERRE_POSTVENTA/checklist) puede dejarse como referencia directa
--     sin wrapper: ambas requieren exactamente el mismo permiso, así que no
--     hay escenario donde una pase y la otra no — y de paso la fila hija
--     hereda gratis el alcance ya evaluado en la fila padre vía la RLS de esa
--     tabla padre (no hace falta duplicar la lógica de alcance en la hija).
--   - Un subselect hacia una tabla de OTRO módulo/sublista (proyectos,
--     contratos, proveedores, o cualquier tabla ajena) SIEMPRE debe pasar por
--     un helper SECURITY DEFINER — nunca una referencia cruda.
--
-- Alcance por fila (PROPIOS/EQUIPO/TODOS) en este módulo, decisiones:
--   - checklist_liquidacion_plantillas / checklist_liquidacion_plantilla_items:
--     catálogo compartido de la empresa (protocolos de cierre reutilizables,
--     igual que catalogo_servicios en Fase 2) — sin alcance por fila a
--     propósito, no se tocan en esta migración (su p_empresa_expr ya era
--     correcto: 'empresa_id' es una columna directa en plantillas, sin
--     subselect; y plantilla_items subselecciona a plantillas, misma
--     sublista, seguro por la regla de arriba).
--   - checklist_liquidacion_proyecto: sí tiene dueño real (responsable_id,
--     típicamente el PM) y proyecto_id -> EQUIPO = fn_es_equipo_de_proyecto,
--     PROPIOS = responsable_id = auth.uid().
--   - checklist_liquidacion_items: hereda el alcance de su checklist padre de
--     forma automática (ver regla de subselect same-sublista arriba) — no
--     necesita su propio p_alcance_expr, igual que hitos_criterios_aceptacion
--     no lo tiene por separado de hitos_entregables.
--   - actas_cierre: EQUIPO = fn_es_equipo_de_proyecto(proyecto_id), PROPIOS =
--     firmante_interno_usuario_id = auth.uid().
--   - garantias_contractuales: sin columna de creador/responsable (mismo caso
--     que `contratos` en Fase 1). Solo puede anclarse a "equipo de proyecto"
--     cuando tiene proyecto_id; cuando solo tiene contrato_id (sin proyecto
--     directo) no hay forma limpia de resolver equipo — un rol EQUIPO/PROPIOS
--     ve 0 filas para esas garantías (más restrictivo por defecto, mismo
--     criterio que licencias_asignadas sin proyecto en Fase 2). Documentado,
--     no accidental.
--   - garantia_extensiones: hereda el alcance de garantias_contractuales
--     (misma sublista, mismo mecanismo de herencia automática).
--
-- Riesgo: cambio estructural en RLS. Verificado empíricamente en Postgres
-- local (aplicado a devtopia_test, no en transacción de rollback para las
-- pruebas de datos base, con escenarios en BEGIN/ROLLBACK encima) antes de
-- entregarse aquí.
--
-- Bug adicional encontrado durante esta misma verificación empírica (no
-- relacionado con RLS de por sí, sino con la mecánica de la migración 018):
-- la 018 agregó una nueva sobrecarga fn_crear_politicas_rls(text, text, text,
-- text, text default 'true') vía `create or replace`, pero como el número de
-- parámetros cambió, Postgres NO reemplazó la función original de 4
-- parámetros (migración 008) — quedaron las DOS sobrecargas coexistiendo. Eso
-- nunca se notó porque toda llamada posterior a la 018 (en 018, 019 y 020)
-- pasó los 5 argumentos explícitamente. Esta migración es la primera en
-- volver a llamarla con solo 4 argumentos (para las tablas que no necesitan
-- alcance propio) y Postgres no pudo decidir entre las dos sobrecargas
-- ("function ... is not unique"). Se corrige eliminando la sobrecarga vieja
-- de 4 parámetros, ya completamente subsumida por la de 5 con default — la
-- propia migración 008 dejó preparado el comentario de rollback para esto
-- exacto (`-- drop function if exists fn_crear_politicas_rls(text, text,
-- text, text);`, línea 295).
-- =============================================================================

drop function if exists fn_crear_politicas_rls(text, text, text, text);

-- -----------------------------------------------------------------------------
-- 1. hitos_criterios_aceptacion — bug remanente de Fase 1, corregido aquí.
-- -----------------------------------------------------------------------------
drop policy if exists hitos_criterios_aceptacion_select_pol on hitos_criterios_aceptacion;
drop policy if exists hitos_criterios_aceptacion_insert_pol on hitos_criterios_aceptacion;
drop policy if exists hitos_criterios_aceptacion_update_pol on hitos_criterios_aceptacion;
drop policy if exists hitos_criterios_aceptacion_delete_pol on hitos_criterios_aceptacion;
select fn_crear_politicas_rls(
  'hitos_criterios_aceptacion', 'CONTRATOS_PROYECTOS', 'hitos_entregables',
  '(select fn_empresa_de_proyecto(h.proyecto_id) from hitos_entregables h where h.id = hitos_criterios_aceptacion.hito_id)'
);

-- -----------------------------------------------------------------------------
-- 2. checklist_liquidacion_proyecto
-- -----------------------------------------------------------------------------
drop policy if exists checklist_liquidacion_proyecto_select_pol on checklist_liquidacion_proyecto;
drop policy if exists checklist_liquidacion_proyecto_insert_pol on checklist_liquidacion_proyecto;
drop policy if exists checklist_liquidacion_proyecto_update_pol on checklist_liquidacion_proyecto;
drop policy if exists checklist_liquidacion_proyecto_delete_pol on checklist_liquidacion_proyecto;
select fn_crear_politicas_rls(
  'checklist_liquidacion_proyecto', 'CIERRE_POSTVENTA', 'checklist',
  'fn_empresa_de_proyecto(checklist_liquidacion_proyecto.proyecto_id)',
  $alcance$
    (fn_alcance_permiso('CIERRE_POSTVENTA', 'checklist') = 'TODOS')
    or (
      fn_alcance_permiso('CIERRE_POSTVENTA', 'checklist') = 'EQUIPO'
      and fn_es_equipo_de_proyecto(checklist_liquidacion_proyecto.proyecto_id)
    )
    or (
      fn_alcance_permiso('CIERRE_POSTVENTA', 'checklist') = 'PROPIOS'
      and checklist_liquidacion_proyecto.responsable_id = auth.uid()
    )
  $alcance$
);

-- -----------------------------------------------------------------------------
-- 3. checklist_liquidacion_items — hereda alcance del checklist padre (mismo
--    mecanismo de herencia gratuita: el subselect toca checklist_liquidacion_
--    proyecto, misma sublista, así que su propia RLS -con el alcance recién
--    aplicado arriba- ya filtra las filas visibles antes de llegar aquí).
-- -----------------------------------------------------------------------------
drop policy if exists checklist_liquidacion_items_select_pol on checklist_liquidacion_items;
drop policy if exists checklist_liquidacion_items_insert_pol on checklist_liquidacion_items;
drop policy if exists checklist_liquidacion_items_update_pol on checklist_liquidacion_items;
drop policy if exists checklist_liquidacion_items_delete_pol on checklist_liquidacion_items;
select fn_crear_politicas_rls(
  'checklist_liquidacion_items', 'CIERRE_POSTVENTA', 'checklist',
  '(select fn_empresa_de_proyecto(clp.proyecto_id) from checklist_liquidacion_proyecto clp where clp.id = checklist_liquidacion_items.checklist_proyecto_id)'
);

-- -----------------------------------------------------------------------------
-- 4. actas_cierre
-- -----------------------------------------------------------------------------
drop policy if exists actas_cierre_select_pol on actas_cierre;
drop policy if exists actas_cierre_insert_pol on actas_cierre;
drop policy if exists actas_cierre_update_pol on actas_cierre;
drop policy if exists actas_cierre_delete_pol on actas_cierre;
select fn_crear_politicas_rls(
  'actas_cierre', 'CIERRE_POSTVENTA', 'actas_cierre',
  'fn_empresa_de_proyecto(actas_cierre.proyecto_id)',
  $alcance$
    (fn_alcance_permiso('CIERRE_POSTVENTA', 'actas_cierre') = 'TODOS')
    or (
      fn_alcance_permiso('CIERRE_POSTVENTA', 'actas_cierre') = 'EQUIPO'
      and fn_es_equipo_de_proyecto(actas_cierre.proyecto_id)
    )
    or (
      fn_alcance_permiso('CIERRE_POSTVENTA', 'actas_cierre') = 'PROPIOS'
      and actas_cierre.firmante_interno_usuario_id = auth.uid()
    )
  $alcance$
);

-- -----------------------------------------------------------------------------
-- 5. garantias_contractuales — sin columna de creador; EQUIPO y PROPIOS se
--    tratan igual (mismo criterio que `contratos`/`ordenes_costo_
--    subcontratacion` en Fase 1): solo resoluble cuando hay proyecto_id.
-- -----------------------------------------------------------------------------
drop policy if exists garantias_contractuales_select_pol on garantias_contractuales;
drop policy if exists garantias_contractuales_insert_pol on garantias_contractuales;
drop policy if exists garantias_contractuales_update_pol on garantias_contractuales;
drop policy if exists garantias_contractuales_delete_pol on garantias_contractuales;
select fn_crear_politicas_rls(
  'garantias_contractuales', 'CIERRE_POSTVENTA', 'garantias',
  'coalesce(fn_empresa_de_proyecto(garantias_contractuales.proyecto_id), fn_empresa_de_contrato(garantias_contractuales.contrato_id))',
  $alcance$
    (fn_alcance_permiso('CIERRE_POSTVENTA', 'garantias') = 'TODOS')
    or (
      fn_alcance_permiso('CIERRE_POSTVENTA', 'garantias') in ('EQUIPO', 'PROPIOS')
      and fn_es_equipo_de_proyecto(garantias_contractuales.proyecto_id)
    )
  $alcance$
);

-- -----------------------------------------------------------------------------
-- 6. garantia_extensiones — hereda alcance de garantias_contractuales (misma
--    sublista, mismo mecanismo de herencia gratuita que checklist_items).
-- -----------------------------------------------------------------------------
drop policy if exists garantia_extensiones_select_pol on garantia_extensiones;
drop policy if exists garantia_extensiones_insert_pol on garantia_extensiones;
drop policy if exists garantia_extensiones_update_pol on garantia_extensiones;
drop policy if exists garantia_extensiones_delete_pol on garantia_extensiones;
select fn_crear_politicas_rls(
  'garantia_extensiones', 'CIERRE_POSTVENTA', 'garantias',
  '(select coalesce(fn_empresa_de_proyecto(g.proyecto_id), fn_empresa_de_contrato(g.contrato_id)) from garantias_contractuales g where g.id = garantia_extensiones.garantia_id)'
);
