-- =============================================================================
-- Devtopia ERP — Etapa 1: Configuración General
-- Ver docs/data-model/01-configuracion-general.md para el diccionario de datos.
--
-- ROLLBACK:
--   drop table if exists catalogos_valores cascade;
--   drop table if exists log_auditoria cascade;
--   drop table if exists workflows_historial cascade;
--   drop table if exists workflows_transiciones cascade;
--   drop table if exists estados_ciclo_vida cascade;
--   drop table if exists integraciones_log cascade;
--   drop table if exists webhooks_salientes cascade;
--   drop table if exists integraciones_config cascade;
--   drop table if exists notificaciones_enviadas cascade;
--   drop table if exists alertas_notificaciones_reglas cascade;
--   drop table if exists permisos cascade;
--   drop table if exists perfiles_usuario cascade;
--   drop table if exists roles cascade;
--   drop table if exists secuencias_numeracion cascade;
--   drop table if exists tasas_cambio cascade;
--   drop table if exists monedas cascade;
--   drop table if exists empresas cascade;
--   drop function if exists fn_generar_consecutivo(text, uuid);
--   drop function if exists fn_audit_row();
--   drop type if exists operacion_auditoria;
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. empresas / monedas / tasas_cambio
-- -----------------------------------------------------------------------------
create table empresas (
  id                     uuid primary key default gen_random_uuid(),
  razon_social           text not null,
  nombre_comercial       text,
  tipo_identificacion    text not null,
  numero_identificacion  text not null,
  digito_verificacion    text,
  direccion              text,
  ciudad                 text,
  pais                   text not null,
  telefono               text,
  email_corporativo      citext,
  sitio_web              text,
  moneda_principal_id    uuid,               -- FK agregada tras crear `monedas`
  zona_horaria           text not null default 'America/Bogota',
  idioma_por_defecto     text not null default 'es',
  formato_fecha          text not null default 'DD/MM/YYYY',
  formato_hora           text not null default '24H',
  separador_miles        text not null default '.',
  separador_decimal      text not null default ',',
  primer_dia_semana      smallint not null default 1,
  logo_url_claro         text,
  logo_url_oscuro        text,
  pie_pagina_documentos  text,
  activa                 boolean not null default true,
  predeterminada         boolean not null default false,
  created_at             timestamptz not null default now(),
  created_by             uuid,
  updated_at             timestamptz not null default now(),
  updated_by             uuid
);

create unique index ux_empresas_predeterminada on empresas (predeterminada) where predeterminada;

create table monedas (
  id           uuid primary key default gen_random_uuid(),
  codigo_iso   text not null unique,
  nombre       text not null,
  simbolo      text not null,
  decimales    smallint not null default 2,
  activa       boolean not null default true
);

alter table empresas
  add constraint fk_empresas_moneda_principal
  foreign key (moneda_principal_id) references monedas(id);

create table tasas_cambio (
  id                 uuid primary key default gen_random_uuid(),
  moneda_origen_id   uuid not null references monedas(id),
  moneda_destino_id  uuid not null references monedas(id),
  tasa               numeric(18,6) not null check (tasa > 0),
  fecha_vigencia     date not null,
  fuente             text not null default 'MANUAL',
  created_at         timestamptz not null default now(),
  created_by         uuid,
  unique (moneda_origen_id, moneda_destino_id, fecha_vigencia)
);

create index ix_tasas_cambio_vigencia on tasas_cambio (fecha_vigencia desc);

-- -----------------------------------------------------------------------------
-- 2. secuencias_numeracion + fn_generar_consecutivo
-- -----------------------------------------------------------------------------
create table secuencias_numeracion (
  id                     uuid primary key default gen_random_uuid(),
  empresa_id             uuid not null references empresas(id),
  codigo_secuencia       text not null,
  tipo_documento         text not null,
  prefijo                text default '',
  sufijo                 text default '',
  longitud_ceros         smallint not null default 4,
  incluir_anio           boolean not null default false,
  formato_anio           text default 'YYYY',
  incluir_mes            boolean not null default false,
  formato_mes            text default 'MM',
  separador              text not null default '-',
  numero_inicial         bigint not null default 1,
  numero_actual          bigint not null default 0,
  reinicio               text not null default 'NUNCA' check (reinicio in ('NUNCA','ANUAL','MENSUAL')),
  fecha_ultimo_reinicio  date,
  activo                 boolean not null default true,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now(),
  unique (empresa_id, codigo_secuencia)
);

create trigger trg_secuencias_numeracion_updated_at
  before update on secuencias_numeracion
  for each row execute function fn_set_updated_at();

create or replace function fn_generar_consecutivo(p_codigo_secuencia text, p_empresa_id uuid)
returns text
language plpgsql
as $$
declare
  v_row secuencias_numeracion%rowtype;
  v_periodo_actual text;
  v_texto_anio text := '';
  v_texto_mes text := '';
  v_numero text;
  v_resultado text;
begin
  select * into v_row
  from secuencias_numeracion
  where codigo_secuencia = p_codigo_secuencia
    and empresa_id = p_empresa_id
    and activo
  for update;

  if not found then
    raise exception 'Secuencia % no configurada para la empresa %', p_codigo_secuencia, p_empresa_id;
  end if;

  -- Reinicio automático según periodicidad configurada
  v_periodo_actual := case v_row.reinicio
    when 'ANUAL' then to_char(now(), 'YYYY')
    when 'MENSUAL' then to_char(now(), 'YYYY-MM')
    else null
  end;

  if v_row.reinicio <> 'NUNCA' and (
       v_row.fecha_ultimo_reinicio is null
       or (v_row.reinicio = 'ANUAL' and to_char(v_row.fecha_ultimo_reinicio,'YYYY') <> v_periodo_actual)
       or (v_row.reinicio = 'MENSUAL' and to_char(v_row.fecha_ultimo_reinicio,'YYYY-MM') <> v_periodo_actual)
     ) then
    v_row.numero_actual := v_row.numero_inicial - 1;
    v_row.fecha_ultimo_reinicio := now()::date;
  end if;

  v_row.numero_actual := v_row.numero_actual + 1;

  if v_row.incluir_anio then
    v_texto_anio := to_char(now(), coalesce(v_row.formato_anio,'YYYY')) || v_row.separador;
  end if;
  if v_row.incluir_mes then
    v_texto_mes := to_char(now(), coalesce(v_row.formato_mes,'MM')) || v_row.separador;
  end if;

  v_numero := lpad(v_row.numero_actual::text, v_row.longitud_ceros, '0');
  v_resultado := coalesce(v_row.prefijo,'') || v_texto_anio || v_texto_mes || v_numero || coalesce(v_row.sufijo,'');

  update secuencias_numeracion
     set numero_actual = v_row.numero_actual,
         fecha_ultimo_reinicio = v_row.fecha_ultimo_reinicio,
         updated_at = now()
   where id = v_row.id;

  return v_resultado;
end;
$$;

comment on function fn_generar_consecutivo(text, uuid) is
  'Genera de forma atómica (SELECT ... FOR UPDATE) el siguiente consecutivo formateado para un codigo_secuencia dado. Llamar siempre desde la capa de aplicación al crear el registro, nunca precalcular en el cliente.';

-- -----------------------------------------------------------------------------
-- 3. RBAC: roles, perfiles_usuario, permisos
-- -----------------------------------------------------------------------------
create table roles (
  id              uuid primary key default gen_random_uuid(),
  empresa_id      uuid not null references empresas(id),
  nombre          text not null,
  descripcion     text,
  es_rol_sistema  boolean not null default false,
  activo          boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (empresa_id, nombre)
);

create trigger trg_roles_updated_at before update on roles
  for each row execute function fn_set_updated_at();

create table perfiles_usuario (
  id                uuid primary key references auth.users(id) on delete cascade,
  empresa_id        uuid not null references empresas(id),
  rol_id            uuid not null references roles(id),
  nombre_completo   text not null,
  cargo             text,
  telefono          text,
  avatar_url        text,
  tipo_vinculacion  text not null default 'EMPLEADO' check (tipo_vinculacion in ('EMPLEADO','FREELANCER_INTERNO','CONTRATISTA')),
  fecha_ingreso     date,
  activo            boolean not null default true,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index ix_perfiles_usuario_empresa on perfiles_usuario (empresa_id);
create trigger trg_perfiles_usuario_updated_at before update on perfiles_usuario
  for each row execute function fn_set_updated_at();

create table permisos (
  id             uuid primary key default gen_random_uuid(),
  rol_id         uuid not null references roles(id) on delete cascade,
  modulo         text not null,
  sublista       text,
  puede_leer     boolean not null default false,
  puede_crear    boolean not null default false,
  puede_editar   boolean not null default false,
  puede_eliminar boolean not null default false,
  puede_aprobar  boolean not null default false,
  alcance        text not null default 'PROPIOS' check (alcance in ('TODOS','EQUIPO','PROPIOS')),
  unique (rol_id, modulo, sublista)
);

-- -----------------------------------------------------------------------------
-- 4. Alertas y notificaciones
-- -----------------------------------------------------------------------------
create table alertas_notificaciones_reglas (
  id                        uuid primary key default gen_random_uuid(),
  empresa_id                uuid not null references empresas(id),
  nombre                    text not null,
  evento_disparador         text not null,
  parametros                jsonb,
  canal                     text not null check (canal in ('EMAIL','IN_APP','WEBHOOK')),
  destinatarios_tipo        text not null check (destinatarios_tipo in ('PM_PROYECTO','EQUIPO_PROYECTO','ROL_ESPECIFICO','USUARIO_ESPECIFICO','CLIENTE')),
  destinatarios_rol_id      uuid references roles(id),
  destinatarios_usuario_id  uuid references perfiles_usuario(id),
  plantilla_asunto          text,
  plantilla_cuerpo          text,
  activa                    boolean not null default true,
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now()
);

create trigger trg_alertas_reglas_updated_at before update on alertas_notificaciones_reglas
  for each row execute function fn_set_updated_at();

create table notificaciones_enviadas (
  id             uuid primary key default gen_random_uuid(),
  regla_id       uuid not null references alertas_notificaciones_reglas(id),
  entidad_tipo   text not null,
  entidad_id     uuid not null,
  destinatario   text not null,
  canal          text not null,
  estado_envio   text not null default 'PENDIENTE' check (estado_envio in ('PENDIENTE','ENVIADO','FALLIDO')),
  detalle_error  text,
  intentos       smallint not null default 0,
  fecha_envio    timestamptz,
  created_at     timestamptz not null default now()
);

create index ix_notificaciones_entidad on notificaciones_enviadas (entidad_tipo, entidad_id);

-- -----------------------------------------------------------------------------
-- 5. Integraciones y webhooks (patrón de resiliencia de 5 pasos)
-- -----------------------------------------------------------------------------
create table integraciones_config (
  id                       uuid primary key default gen_random_uuid(),
  empresa_id               uuid not null references empresas(id),
  nombre                   text not null,
  tipo                     text not null check (tipo in ('FACTURACION_EXTERNA','HELPDESK','EMAIL','MENSAJERIA','TRANSPORTADORA','OTRO')),
  proveedor                text,
  habilitada               boolean not null default false,
  url_base                 text,
  metodo_autenticacion     text not null default 'NINGUNO' check (metodo_autenticacion in ('API_KEY','OAUTH2','BASIC','NINGUNO')),
  credenciales_ref         text,
  configuracion_adicional  jsonb,
  estado_ultima_conexion   text not null default 'NO_PROBADO' check (estado_ultima_conexion in ('OK','ERROR','NO_PROBADO','DESHABILITADA')),
  fecha_ultima_conexion_ok timestamptz,
  activo                   boolean not null default true,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now()
);

comment on column integraciones_config.credenciales_ref is
  'Alias/identificador hacia el gestor de secretos (env var, Supabase Vault). NUNCA almacenar el secreto en claro aquí.';

create trigger trg_integraciones_config_updated_at before update on integraciones_config
  for each row execute function fn_set_updated_at();

create table webhooks_salientes (
  id                     uuid primary key default gen_random_uuid(),
  integracion_id         uuid not null references integraciones_config(id) on delete cascade,
  evento                 text not null,
  url_destino            text not null,
  metodo_http            text not null default 'POST',
  headers_adicionales    jsonb,
  secreto_firma_ref      text,
  activo                 boolean not null default true,
  created_at             timestamptz not null default now()
);

create type direccion_integracion as enum ('ENTRANTE','SALIENTE');
create type origen_resolucion as enum ('AUTOMATICO','MANUAL');

create table integraciones_log (
  id                 uuid primary key default gen_random_uuid(),
  integracion_id     uuid references integraciones_config(id),
  direccion          direccion_integracion not null,
  evento             text not null,
  entidad_tipo       text,
  entidad_id         uuid,
  origen_resolucion  origen_resolucion not null,
  estado             text not null check (estado in ('EXITOSO','FALLIDO','REINTENTO')),
  codigo_respuesta   text,
  mensaje_error      text,
  payload_resumen    jsonb,
  intentos           smallint not null default 1,
  created_at         timestamptz not null default now()
);

create index ix_integraciones_log_entidad on integraciones_log (entidad_tipo, entidad_id);

-- -----------------------------------------------------------------------------
-- 6. Workflows y estados personalizados
-- -----------------------------------------------------------------------------
create table estados_ciclo_vida (
  id                  uuid primary key default gen_random_uuid(),
  empresa_id          uuid not null references empresas(id),
  entidad_aplicable   text not null,
  codigo_estado       text not null,
  etiqueta            text not null,
  orden               smallint not null default 0,
  es_estado_inicial   boolean not null default false,
  es_estado_final     boolean not null default false,
  color_ui            text,
  activo              boolean not null default true,
  unique (empresa_id, entidad_aplicable, codigo_estado)
);

create table workflows_transiciones (
  id                          uuid primary key default gen_random_uuid(),
  entidad_aplicable           text not null,
  estado_origen_id            uuid not null references estados_ciclo_vida(id),
  estado_destino_id           uuid not null references estados_ciclo_vida(id),
  rol_permitido_id            uuid references roles(id),
  requiere_comentario         boolean not null default false,
  requiere_aprobacion_doble   boolean not null default false,
  unique (estado_origen_id, estado_destino_id)
);

create table workflows_historial (
  id                uuid primary key default gen_random_uuid(),
  entidad_tipo      text not null,
  entidad_id        uuid not null,
  estado_anterior   text,
  estado_nuevo      text not null,
  usuario_id        uuid not null references perfiles_usuario(id),
  comentario        text,
  fecha_transicion  timestamptz not null default now()
);

create index ix_workflows_historial_entidad on workflows_historial (entidad_tipo, entidad_id);

-- -----------------------------------------------------------------------------
-- 7. Log de auditoría (append-only) + trigger genérico
-- -----------------------------------------------------------------------------
create type operacion_auditoria as enum ('INSERT','UPDATE','DELETE');

create table log_auditoria (
  id                   uuid primary key default gen_random_uuid(),
  tabla_afectada       text not null,
  registro_id          uuid not null,
  operacion            operacion_auditoria not null,
  usuario_id           uuid,
  valores_anteriores   jsonb,
  valores_nuevos       jsonb,
  campos_modificados   text[],
  ip_origen            text,
  user_agent           text,
  fecha_hora           timestamptz not null default now()
);

create index ix_log_auditoria_tabla_registro on log_auditoria (tabla_afectada, registro_id);
create index ix_log_auditoria_fecha on log_auditoria (fecha_hora desc);

-- Append-only: se revoca UPDATE/DELETE a los roles de aplicación estándar de Supabase.
revoke update, delete on log_auditoria from authenticated, anon;

create or replace function fn_audit_row()
returns trigger
language plpgsql
security definer
as $$
declare
  v_old jsonb;
  v_new jsonb;
  v_campos text[];
begin
  if tg_op = 'INSERT' then
    v_new := to_jsonb(new);
    insert into log_auditoria (tabla_afectada, registro_id, operacion, usuario_id, valores_nuevos)
    values (tg_table_name, new.id, 'INSERT', auth.uid(), v_new);
    return new;
  elsif tg_op = 'UPDATE' then
    v_old := to_jsonb(old);
    v_new := to_jsonb(new);
    select array_agg(key) into v_campos
      from jsonb_each(v_new) e
      where v_old -> e.key is distinct from e.value;
    insert into log_auditoria (tabla_afectada, registro_id, operacion, usuario_id, valores_anteriores, valores_nuevos, campos_modificados)
    values (tg_table_name, new.id, 'UPDATE', auth.uid(), v_old, v_new, v_campos);
    return new;
  elsif tg_op = 'DELETE' then
    v_old := to_jsonb(old);
    insert into log_auditoria (tabla_afectada, registro_id, operacion, usuario_id, valores_anteriores)
    values (tg_table_name, old.id, 'DELETE', auth.uid(), v_old);
    return old;
  end if;
  return null;
end;
$$;

comment on function fn_audit_row() is
  'Trigger genérico AFTER INSERT/UPDATE/DELETE: escribe en log_auditoria (append-only). Adjuntar a cada tabla de negocio en su propia migración.';

-- -----------------------------------------------------------------------------
-- 8. Catálogo genérico configurable
-- -----------------------------------------------------------------------------
create table catalogos_valores (
  id          uuid primary key default gen_random_uuid(),
  empresa_id  uuid not null references empresas(id),
  catalogo    text not null,
  codigo      text not null,
  etiqueta    text not null,
  orden       smallint not null default 0,
  activo      boolean not null default true,
  unique (empresa_id, catalogo, codigo)
);

-- -----------------------------------------------------------------------------
-- Auditoría sobre las tablas de configuración que representan decisiones de negocio
-- (no se audita catálogos puramente técnicos como monedas/tasas_cambio para no generar
-- ruido; sí se audita todo lo que afecta permisos, numeración y parámetros globales).
-- -----------------------------------------------------------------------------
create trigger trg_audit_empresas after insert or update or delete on empresas
  for each row execute function fn_audit_row();
create trigger trg_audit_secuencias_numeracion after insert or update or delete on secuencias_numeracion
  for each row execute function fn_audit_row();
create trigger trg_audit_roles after insert or update or delete on roles
  for each row execute function fn_audit_row();
create trigger trg_audit_permisos after insert or update or delete on permisos
  for each row execute function fn_audit_row();
create trigger trg_audit_integraciones_config after insert or update or delete on integraciones_config
  for each row execute function fn_audit_row();
