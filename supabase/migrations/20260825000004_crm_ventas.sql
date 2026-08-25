-- =============================================================================
-- Devtopia ERP — Etapa 3: CRM y Ventas
-- Ver docs/data-model/03-crm-ventas.md
--
-- ROLLBACK:
--   alter table licencias_asignadas drop constraint if exists fk_licencias_asignadas_cliente;
--   drop table if exists cotizaciones_aprobaciones cascade;
--   drop table if exists cotizaciones_detalle cascade;
--   drop table if exists cotizaciones cascade;
--   drop table if exists oportunidades_seguimiento cascade;
--   drop table if exists oportunidades cascade;
--   drop table if exists contactos cascade;
--   drop table if exists cuentas_clientes cascade;
-- =============================================================================

create table cuentas_clientes (
  id                      uuid primary key default gen_random_uuid(),
  empresa_id              uuid not null references empresas(id),
  razon_social            text not null,
  nombre_comercial        text,
  tipo_identificacion     text not null,
  numero_identificacion   text not null,
  cuenta_padre_id         uuid references cuentas_clientes(id),
  sector_industria        text,
  tamano_empresa          text check (tamano_empresa in ('MICRO','PEQUENA','MEDIANA','GRANDE')),
  sitio_web               text,
  direccion_facturacion   text,
  ciudad                  text,
  pais                    text,
  telefono_principal      text,
  email_principal         citext,
  moneda_preferida_id     uuid references monedas(id),
  ejecutivo_comercial_id  uuid references perfiles_usuario(id),
  origen_captacion        text,
  estado                  text not null default 'PROSPECTO' check (estado in ('PROSPECTO','ACTIVO','INACTIVO')),
  notas                   text,
  deleted_at              timestamptz,
  created_at              timestamptz not null default now(),
  created_by              uuid,
  updated_at              timestamptz not null default now(),
  updated_by              uuid
);

create index ix_cuentas_clientes_empresa on cuentas_clientes (empresa_id) where deleted_at is null;
create trigger trg_cuentas_clientes_updated_at before update on cuentas_clientes
  for each row execute function fn_set_updated_at();
create trigger trg_audit_cuentas_clientes after insert or update or delete on cuentas_clientes
  for each row execute function fn_audit_row();

create table contactos (
  id                       uuid primary key default gen_random_uuid(),
  cuenta_id                uuid not null references cuentas_clientes(id) on delete cascade,
  nombre                   text not null,
  apellido                 text,
  cargo                    text,
  email                    citext,
  telefono                 text,
  celular                  text,
  canal_preferido          text,
  es_contacto_principal    boolean not null default false,
  es_firmante_autorizado   boolean not null default false,
  activo                   boolean not null default true,
  notas                    text
);

create index ix_contactos_cuenta on contactos (cuenta_id);

create table oportunidades (
  id                        uuid primary key default gen_random_uuid(),
  empresa_id                uuid not null references empresas(id),
  codigo                    text not null,
  cuenta_id                 uuid not null references cuentas_clientes(id),
  contacto_id               uuid references contactos(id),
  nombre_oportunidad        text not null,
  descripcion               text,
  etapa                     text not null default 'PROSPECCION' check (etapa in ('PROSPECCION','CALIFICACION','PROPUESTA_ENVIADA','NEGOCIACION','GANADA','PERDIDA')),
  probabilidad_cierre_pct   numeric(5,2),
  valor_estimado            numeric(18,2),
  moneda_id                 uuid references monedas(id),
  fecha_estimada_cierre     date,
  fecha_cierre_real         date,
  motivo_perdida_id         uuid references catalogos_valores(id),
  motivo_perdida_detalle    text,
  origen_oportunidad        text,
  ejecutivo_comercial_id    uuid not null references perfiles_usuario(id),
  proxima_accion            text,
  fecha_proxima_accion      date,
  deleted_at                timestamptz,
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now(),
  unique (empresa_id, codigo)
);

create index ix_oportunidades_cuenta on oportunidades (cuenta_id) where deleted_at is null;
create index ix_oportunidades_etapa on oportunidades (etapa) where deleted_at is null;
create trigger trg_oportunidades_updated_at before update on oportunidades
  for each row execute function fn_set_updated_at();
create trigger trg_audit_oportunidades after insert or update or delete on oportunidades
  for each row execute function fn_audit_row();

create table oportunidades_seguimiento (
  id               uuid primary key default gen_random_uuid(),
  oportunidad_id   uuid not null references oportunidades(id) on delete cascade,
  tipo_actividad   text not null check (tipo_actividad in ('LLAMADA','REUNION','EMAIL','NOTA')),
  fecha            timestamptz not null default now(),
  usuario_id       uuid not null references perfiles_usuario(id),
  descripcion      text not null,
  resultado        text
);

create index ix_oportunidades_seguimiento_oportunidad on oportunidades_seguimiento (oportunidad_id);

create table cotizaciones (
  id                       uuid primary key default gen_random_uuid(),
  empresa_id               uuid not null references empresas(id),
  numero_cotizacion        text not null,
  oportunidad_id           uuid references oportunidades(id),
  cuenta_id                uuid not null references cuentas_clientes(id),
  contacto_id              uuid references contactos(id),
  version                  smallint not null default 1,
  cotizacion_origen_id     uuid references cotizaciones(id),
  estado_id                uuid not null references estados_ciclo_vida(id),
  fecha_emision            date not null default current_date,
  fecha_validez_hasta      date not null,
  moneda_id                uuid not null references monedas(id),
  subtotal                 numeric(18,2) not null default 0,
  descuento_pct            numeric(5,2),
  descuento_valor          numeric(18,2),
  impuestos_pct            numeric(5,2),
  impuestos_valor          numeric(18,2),
  total                    numeric(18,2) not null default 0,
  condiciones_pago         text,
  condiciones_comerciales  text,
  tiempo_estimado_entrega  text,
  responsable_comercial_id uuid not null references perfiles_usuario(id),
  fecha_envio              timestamptz,
  fecha_respuesta_cliente  timestamptz,
  motivo_rechazo           text,
  archivo_pdf_url          text,
  proyecto_generado_id     uuid, -- FK diferido a proyectos(id), agregado en 04-contratos-proyectos
  fecha_conversion         timestamptz,
  convertido_por_usuario_id uuid references perfiles_usuario(id),
  deleted_at               timestamptz,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now(),
  unique (empresa_id, numero_cotizacion)
);

create index ix_cotizaciones_cuenta on cotizaciones (cuenta_id) where deleted_at is null;
create index ix_cotizaciones_estado on cotizaciones (estado_id) where deleted_at is null;
create trigger trg_cotizaciones_updated_at before update on cotizaciones
  for each row execute function fn_set_updated_at();
create trigger trg_audit_cotizaciones after insert or update or delete on cotizaciones
  for each row execute function fn_audit_row();

create table cotizaciones_detalle (
  id                    uuid primary key default gen_random_uuid(),
  cotizacion_id         uuid not null references cotizaciones(id) on delete cascade,
  tipo_item             text not null check (tipo_item in ('SERVICIO','ROL_TARIFA','PAQUETE','LICENCIA','ITEM_LIBRE')),
  servicio_id           uuid references catalogo_servicios(id),
  rol_tarifa_id         uuid references catalogo_roles_tarifa(id),
  paquete_id            uuid references paquetes_servicios(id),
  licencia_catalogo_id  uuid references licencias_suscripciones_catalogo(id),
  descripcion           text not null,
  cantidad              numeric(10,2) not null default 1,
  unidad_medida         text not null,
  precio_unitario       numeric(18,2) not null,
  descuento_linea_pct   numeric(5,2),
  subtotal_linea        numeric(18,2) not null,
  orden                 smallint not null default 0
);

create index ix_cotizaciones_detalle_cotizacion on cotizaciones_detalle (cotizacion_id);

create table cotizaciones_aprobaciones (
  id                uuid primary key default gen_random_uuid(),
  cotizacion_id     uuid not null references cotizaciones(id) on delete cascade,
  nivel_aprobacion  smallint not null default 1,
  aprobador_id      uuid not null references perfiles_usuario(id),
  estado            text not null default 'PENDIENTE' check (estado in ('PENDIENTE','APROBADO','RECHAZADO')),
  fecha_solicitud   timestamptz not null default now(),
  fecha_resolucion  timestamptz,
  comentario        text
);

create index ix_cotizaciones_aprobaciones_cotizacion on cotizaciones_aprobaciones (cotizacion_id);

-- FK diferido resuelto de la Etapa 2: licencias_asignadas.cliente_id -> cuentas_clientes
alter table licencias_asignadas
  add constraint fk_licencias_asignadas_cliente
  foreign key (cliente_id) references cuentas_clientes(id);
