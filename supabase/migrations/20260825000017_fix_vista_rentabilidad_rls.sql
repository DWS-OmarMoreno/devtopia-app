-- =============================================================================
-- Devtopia ERP — Etapa 17: `vista_rentabilidad_proyecto` no respeta RLS
-- multiempresa (fuga de datos real entre empresas, detectada al construir
-- Checkpoint 5b de Contratos y Proyectos, antes de exponerla en la app).
--
-- CONTEXTO: `vista_rentabilidad_proyecto` (creada en 005, redefinida en 006
-- para incorporar subcontratación) es una VIEW normal de Postgres, creada por
-- el rol `postgres` (dueño de todas las tablas). Una vista normal (sin
-- `security_invoker`) resuelve los permisos/RLS de las tablas que consulta
-- usando el dueño de la vista, no el rol que la consulta — y como `postgres`
-- es dueño de `proyectos`/`timesheets`/`licencias_asignadas`/
-- `ordenes_costo_subcontratacion`, los dueños de tabla saltan RLS por
-- defecto (a menos que se use FORCE ROW LEVEL SECURITY, que no se usa aquí).
-- Resultado: cualquier usuario autenticado que consulte la vista ve los
-- proyectos de TODAS las empresas, no solo la propia.
--
-- VERIFICACIÓN empírica en Postgres local (devtopia_test), antes de construir
-- la pantalla de Rentabilidad: se crearon un contrato+proyecto de prueba para
-- "Devtopia S.A.S." y otro para "Otra Empresa SAS" (empresa distinta), y un
-- usuario de Devtopia S.A.S. (`set role authenticated; set
-- request.jwt.claim.sub = '<uuid del PM de Devtopia>'`) obtuvo AMBOS
-- proyectos al hacer `select * from vista_rentabilidad_proyecto` — incluyendo
-- el de la otra empresa. Confirmado también que `anon`/`authenticated` tenían
-- grants directos de SELECT sobre la vista (parte de los grants amplios por
-- defecto sobre `schema public`), sin ninguna barrera real.
--
-- SOLUCIÓN: no se puede arreglar con `alter view ... set (security_invoker =
-- true)` sin más, porque eso volvería a aplicar las políticas RLS de las
-- tablas referenciadas evaluadas COMO el usuario que consulta — y esas
-- políticas exigen permisos de sublista distintos por tabla (`timesheets`,
-- `licencias` de PRODUCTOS_SERVICIOS, `ordenes_costo` de COMPRAS), que un
-- usuario con solo `CONTRATOS_PROYECTOS/leer/rentabilidad` no necesariamente
-- tiene — la vista dejaría de filtrar por empresa ajena, pero mostraría
-- costos en 0 para cualquiera sin esos otros permisos, dando una rentabilidad
-- falsa en vez de un error claro. Rentabilidad es, por diseño, un rollup
-- cruzado de varios módulos — mismo caso que `fn_listar_cuentas_basico()` y
-- `fn_convertir_cotizacion_a_proyecto()`: se revoca el acceso directo a la
-- vista desde `authenticated`/`anon` y se agrega `fn_listar_rentabilidad_
-- proyectos()`, una función `SECURITY DEFINER` que sí filtra explícitamente
-- por `fn_empresa_actual()` y exige `CONTRATOS_PROYECTOS/leer/rentabilidad`
-- antes de devolver cualquier fila.
--
-- VERIFICACIÓN del fix: repetido el mismo escenario de dos empresas — el
-- mismo usuario de Devtopia S.A.S. llamando a
-- `select * from fn_listar_rentabilidad_proyectos()` obtiene solo su propio
-- proyecto; un usuario sin `CONTRATOS_PROYECTOS/leer/rentabilidad` obtiene 0
-- filas aunque tenga otros permisos del módulo; `select * from
-- vista_rentabilidad_proyecto` directo ya no es accesible para
-- `authenticated`/`anon` (falla por falta de privilegio).
--
-- ROLLBACK:
--   drop function if exists fn_listar_rentabilidad_proyectos();
--   grant select on vista_rentabilidad_proyecto to authenticated, anon;
-- =============================================================================

revoke all on vista_rentabilidad_proyecto from authenticated, anon;

create or replace function fn_listar_rentabilidad_proyectos()
returns table (
  proyecto_id uuid,
  numero_proyecto text,
  presupuesto_ingreso_total numeric,
  costo_mano_obra numeric,
  costo_subcontratacion numeric,
  costo_licencias numeric,
  costo_total_actual numeric,
  margen_bruto_actual numeric
)
language sql
security definer
set search_path = public
stable
as $$
  select v.proyecto_id, v.numero_proyecto, v.presupuesto_ingreso_total,
         v.costo_mano_obra, v.costo_subcontratacion, v.costo_licencias,
         v.costo_total_actual, v.margen_bruto_actual
  from vista_rentabilidad_proyecto v
  join proyectos p on p.id = v.proyecto_id
  where p.empresa_id = fn_empresa_actual()
    and fn_tiene_permiso('CONTRATOS_PROYECTOS', 'leer', 'rentabilidad');
$$;

comment on function fn_listar_rentabilidad_proyectos() is
  'Rentabilidad en tiempo real por proyecto, filtrada por empresa y permiso CONTRATOS_PROYECTOS/leer/rentabilidad. SECURITY DEFINER porque vista_rentabilidad_proyecto (dueño postgres, que salta RLS al ser dueño de las tablas referenciadas) no aplica RLS multiempresa por sí sola — ver docs/data-model/bitacora-incidentes.md.';

grant execute on function fn_listar_rentabilidad_proyectos() to authenticated;
