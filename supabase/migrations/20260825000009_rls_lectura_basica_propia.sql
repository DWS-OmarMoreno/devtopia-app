-- =============================================================================
-- Devtopia ERP — Etapa 9 (fix): lectura básica propia, independiente de la
-- matriz de permisos (corrige un problema de "bootstrap" circular detectado
-- al construir el frontend: con la matriz sembrada en 20260825, solo el rol
-- Administrador tiene permiso de lectura sobre CONFIGURACION, lo que impedía
-- que CUALQUIER OTRO usuario autenticado pudiera leer su propio perfil, el
-- nombre de su empresa, su propio rol o su propia fila de permisos — es decir,
-- la aplicación no podía ni siquiera pintar el navbar para un PM/Desarrollador/
-- Comercial). Ver docs/data-model/bitacora-incidentes.md.
--
-- Estas 4 políticas son ADITIVAS (Postgres combina políticas del mismo comando
-- con OR): solo AMPLÍAN acceso de lectura a "mis propios datos básicos", nunca
-- restringen lo que ya permitían las políticas de 20260825000008_rls_baseline.sql.
-- No se toca ninguna política de INSERT/UPDATE/DELETE.
--
-- ROLLBACK:
--   drop policy if exists perfiles_usuario_self_select_pol on perfiles_usuario;
--   drop policy if exists empresas_member_select_pol on empresas;
--   drop policy if exists roles_self_select_pol on roles;
--   drop policy if exists permisos_self_select_pol on permisos;
-- =============================================================================

-- Cualquier usuario autenticado puede leer su propia fila de perfiles_usuario
-- (sin esto, la app no puede resolver "quién soy" tras iniciar sesión).
create policy perfiles_usuario_self_select_pol on perfiles_usuario
  for select using (id = auth.uid());

-- Cualquier miembro de la empresa puede leer los datos básicos de su empresa
-- (nombre, logo, moneda, formatos) — es información de la organización, no un
-- dato administrativo sensible; administrar esos campos sigue exigiendo el
-- permiso de EDITAR sobre CONFIGURACION (política de UPDATE sin cambios).
create policy empresas_member_select_pol on empresas
  for select using (id = fn_empresa_actual());

-- Cualquier usuario puede leer el nombre/etiqueta de su propio rol.
create policy roles_self_select_pol on roles
  for select using (id = (select rol_id from perfiles_usuario where id = auth.uid()));

-- Cualquier usuario puede leer las filas de permisos de SU PROPIO rol (para que
-- el frontend sepa qué mostrar/ocultar). Leer la matriz de OTROS roles sigue
-- exigiendo el permiso de lectura sobre CONFIGURACION (política ya existente).
create policy permisos_self_select_pol on permisos
  for select using (rol_id = (select rol_id from perfiles_usuario where id = auth.uid()));
