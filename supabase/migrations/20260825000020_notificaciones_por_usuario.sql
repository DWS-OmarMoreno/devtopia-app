-- =============================================================================
-- Alertas y Notificaciones — envío real, parte 1: soporte de base de datos
-- para un centro de notificaciones in-app de verdad.
--
-- Contexto: `notificaciones_enviadas` ya existía desde las migraciones 1-8
-- como bitácora de envíos (columna `destinatario` de tipo texto — pensada
-- para un correo electrónico, no para identificar un usuario de la app), y
-- su única política de lectura exige `CONFIGURACION/leer/alertas` (correcto
-- para el panel de administración, pero no sirve para que un usuario
-- cualquiera vea "mis propias notificaciones" sin tener ese permiso — mismo
-- tipo de problema de bootstrap que resolvió la migración 009 para
-- perfiles_usuario/roles/permisos/empresas).
--
-- Esta migración agrega lo mínimo necesario para que el canal IN_APP sea un
-- centro de notificaciones real por usuario, sin tocar el resto del
-- comportamiento existente (canal EMAIL sigue usando `destinatario` como
-- texto libre, igual que hoy):
--   - `destinatario_usuario_id`: a qué perfil de usuario pertenece este envío
--     (NULL para destinatarios externos, ej. CLIENTE por correo).
--   - `leida` / `leida_at`: estado de lectura, solo relevante para IN_APP.
--   - `asunto` / `cuerpo`: el texto YA renderizado (plantilla + variables del
--     evento, ver lib/alertas/plantilla.ts) en el momento del envío. Antes de
--     esto, `notificaciones_enviadas` solo guardaba metadatos (regla, canal,
--     entidad, estado) — nunca el mensaje en sí, así que no había nada
--     legible que mostrarle a un usuario en un centro de notificaciones
--     in-app. Se guarda el texto ya renderizado (no la plantilla + variables
--     por separado) para que el historial quede estable aunque la regla se
--     edite o borre después.
--   - Dos políticas RLS ADITIVAS (Postgres combina políticas del mismo
--     comando con OR, así que solo amplían acceso, nunca lo restringen):
--     cualquier usuario puede leer y marcar como leídas sus propias
--     notificaciones, sin necesitar el permiso de administración de Alertas.
--
-- Riesgo: cambio estructural (ALTER TABLE + RLS). Verificado empíricamente en
-- Postgres local (transacción BEGIN/ROLLBACK) antes de aplicarse aquí.
-- =============================================================================

alter table notificaciones_enviadas
  add column if not exists destinatario_usuario_id uuid references perfiles_usuario(id),
  add column if not exists leida boolean not null default false,
  add column if not exists leida_at timestamptz,
  add column if not exists asunto text,
  add column if not exists cuerpo text;

create index if not exists idx_notificaciones_enviadas_destinatario_usuario
  on notificaciones_enviadas (destinatario_usuario_id, leida);

drop policy if exists notificaciones_enviadas_propias_select_pol on notificaciones_enviadas;
create policy notificaciones_enviadas_propias_select_pol on notificaciones_enviadas
  for select using (destinatario_usuario_id = auth.uid());

drop policy if exists notificaciones_enviadas_propias_update_pol on notificaciones_enviadas;
create policy notificaciones_enviadas_propias_update_pol on notificaciones_enviadas
  for update
  using (destinatario_usuario_id = auth.uid())
  with check (destinatario_usuario_id = auth.uid());
