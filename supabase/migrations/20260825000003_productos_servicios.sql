-- =============================================================================
-- Devtopia ERP — Etapa 2: Productos y Servicios
-- Ver docs/data-model/02-productos-servicios.md
--
-- ROLLBACK:
--   drop table if exists licencias_asignadas cascade;
--   drop table if exists licencias_suscripciones_catalogo cascade;
--   drop table if exists paquetes_servicios_detalle cascade;
--   drop table if exists paquetes_servicios cascade;
--   drop table if exists catalogo_servicios cascade;
--   drop table if exists catalogo_roles_tarifa cascade;
--   drop table if exists sla_niveles cascade;
--   drop table if exists sla_planes cascade;
--   drop table if exists categorias_servicio cascade;
-- =============================================================================

create table categorias_servicio (
  id                  uuid primary key default gen_random_uuid(),
  empresa_id          uuid not null references empresas(id),
  nombre              text not null,
  descripcion         text,
  categoria_padre_id  uuid references categorias_servicio(id),
  activo              boolean not null default true
);

create table sla_planes (
  id           uuid primary key default gen_random_uuid(),
  empresa_id   uuid not null references empresas(id),
  nombre       text not null,
  descripcion  text,
  activo       boolean not null default true
);

create table sla_niveles (
  id                            uuid primary key default gen_random_uuid(),
  sla_plan_id                   uuid not null references sla_planes(id) on delete cascade,
  severidad                     text not null check (severidad in ('CRITICA','ALTA','MEDIA','BAJA')),
  tiempo_respuesta_horas        numeric(6,2) not null,
  tiempo_resolucion_horas       numeric(6,2) not null,
  horario_cobertura             text not null,
  penalizacion_incumplimiento   text,
  penalizacion_pct_credito      numeric(5,2),
  unique (sla_plan_id, severidad)
);

create table catalogo_roles_tarifa (
  id                             uuid primary key default gen_random_uuid(),
  empresa_id                     uuid not null references empresas(id),
  nombre_rol                     text not null,
  nivel_experiencia              text check (nivel_experiencia in ('JUNIOR','MID','SENIOR','LEAD')),
  tarifa_hora_estandar           numeric(18,2) not null,
  tarifa_hora_costo_referencia   numeric(18,2),
  moneda_id                      uuid not null references monedas(id),
  vigente_desde                  date not null default current_date,
  vigente_hasta                  date,
  activo                         boolean not null default true,
  created_at                     timestamptz not null default now(),
  updated_at                     timestamptz not null default now()
);

create index ix_catalogo_roles_tarifa_empresa on catalogo_roles_tarifa (empresa_id);
create trigger trg_catalogo_roles_tarifa_updated_at before update on catalogo_roles_tarifa
  for each row execute function fn_set_updated_at();

create table catalogo_servicios (
  id                               uuid primary key default gen_random_uuid(),
  empresa_id                       uuid not null references empresas(id),
  codigo                           text not null,
  nombre                           text not null,
  descripcion                      text,
  categoria_id                     uuid references categorias_servicio(id),
  tipo_servicio                    text not null,
  unidad_medida                    text not null check (unidad_medida in ('HORA','DIA','PROYECTO','MES','UNIDAD')),
  tarifa_estandar                  numeric(18,2) not null,
  moneda_id                        uuid not null references monedas(id),
  sla_plan_id                      uuid references sla_planes(id),
  requiere_aprobacion_cotizacion   boolean not null default false,
  fecha_vigencia_desde             date,
  fecha_vigencia_hasta             date,
  activo                           boolean not null default true,
  created_at                       timestamptz not null default now(),
  updated_at                       timestamptz not null default now(),
  unique (empresa_id, codigo)
);

create index ix_catalogo_servicios_categoria on catalogo_servicios (categoria_id);
create index ix_catalogo_servicios_empresa on catalogo_servicios (empresa_id);
create trigger trg_catalogo_servicios_updated_at before update on catalogo_servicios
  for each row execute function fn_set_updated_at();
create trigger trg_audit_catalogo_servicios after insert or update or delete on catalogo_servicios
  for each row execute function fn_audit_row();

create table paquetes_servicios (
  id                     uuid primary key default gen_random_uuid(),
  empresa_id             uuid not null references empresas(id),
  nombre                 text not null,
  descripcion            text,
  precio_total_paquete   numeric(18,2) not null,
  moneda_id              uuid not null references monedas(id),
  vigencia_desde         date,
  vigencia_hasta         date,
  activo                 boolean not null default true
);

create table paquetes_servicios_detalle (
  id                       uuid primary key default gen_random_uuid(),
  paquete_id               uuid not null references paquetes_servicios(id) on delete cascade,
  servicio_id              uuid references catalogo_servicios(id),
  rol_tarifa_id            uuid references catalogo_roles_tarifa(id),
  cantidad                 numeric(10,2) not null,
  precio_unitario_paquete  numeric(18,2) not null,
  orden                    smallint not null default 0,
  constraint ck_paquete_detalle_item check (
    (servicio_id is not null and rol_tarifa_id is null) or
    (servicio_id is null and rol_tarifa_id is not null)
  )
);

create index ix_paquetes_detalle_paquete on paquetes_servicios_detalle (paquete_id);

create table licencias_suscripciones_catalogo (
  id                          uuid primary key default gen_random_uuid(),
  empresa_id                  uuid not null references empresas(id),
  nombre_producto              text not null,
  fabricante                  text,
  proveedor_id                uuid, -- FK diferida: se agrega a proveedores(id) en 05-compras-subcontratacion
  sku_proveedor                text,
  tipo                         text not null check (tipo in ('LICENCIA_PERPETUA','SUSCRIPCION_SAAS','SOPORTE_ANUAL')),
  modelo_costo                 text not null check (modelo_costo in ('POR_USUARIO','POR_INSTANCIA','FIJO','ESCALONADO')),
  costo_unitario                numeric(18,2) not null,
  precio_venta_sugerido        numeric(18,2),
  moneda_id                    uuid not null references monedas(id),
  periodicidad_facturacion     text not null check (periodicidad_facturacion in ('MENSUAL','ANUAL','UNICA')),
  activo                       boolean not null default true,
  notas                        text,
  created_at                   timestamptz not null default now(),
  updated_at                   timestamptz not null default now()
);

create trigger trg_licencias_catalogo_updated_at before update on licencias_suscripciones_catalogo
  for each row execute function fn_set_updated_at();

create table licencias_asignadas (
  id                              uuid primary key default gen_random_uuid(),
  licencia_catalogo_id            uuid not null references licencias_suscripciones_catalogo(id),
  cliente_id                      uuid, -- FK diferida a cuentas_clientes (03-crm-ventas)
  proyecto_id                     uuid, -- FK diferida a proyectos (04-contratos-proyectos)
  cantidad                        integer not null check (cantidad > 0),
  fecha_inicio                    date not null,
  fecha_fin_vigencia              date not null,
  fecha_renovacion                date,
  auto_renovar                    boolean not null default false,
  estado                          text not null default 'ACTIVA' check (estado in ('ACTIVA','VENCIDA','CANCELADA','EN_RENOVACION')),
  numero_orden_compra_proveedor   text,
  costo_total_periodo             numeric(18,2),
  precio_venta_periodo            numeric(18,2),
  created_at                      timestamptz not null default now(),
  updated_at                      timestamptz not null default now()
);

create index ix_licencias_asignadas_catalogo on licencias_asignadas (licencia_catalogo_id);
create index ix_licencias_asignadas_vencimiento on licencias_asignadas (fecha_fin_vigencia);
create trigger trg_licencias_asignadas_updated_at before update on licencias_asignadas
  for each row execute function fn_set_updated_at();
