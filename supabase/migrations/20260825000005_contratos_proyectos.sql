-- =============================================================================
-- Devtopia ERP — Etapa 4: Contratos y Proyectos
-- Ver docs/data-model/04-contratos-proyectos.md
--
-- ROLLBACK:
--   alter table cotizaciones drop constraint if exists fk_cotizaciones_proyecto_generado;
--   alter table licencias_asignadas drop constraint if exists fk_licencias_asignadas_proyecto;
--   drop view if exists vista_rentabilidad_proyecto;
--   drop table if exists casos_soporte_referencia_externa cascade;
--   drop table if exists facturas_referencia_externa cascade;
--   drop table if exists change_requests cascade;
--   drop table if exists rentabilidad_snapshots cascade;
--   drop table if exists disponibilidad_recursos cascade;
--   drop table if exists asignacion_recursos cascade;
--   drop table if exists timesheets cascade;
--   drop table if exists hitos_criterios_aceptacion cascade;
--   drop table if exists hitos_entregables cascade;
--   drop table if exists proyectos cascade;
--   drop table if exists contratos cascade;
-- =============================================================================

create table contratos (
  id                       uuid primary key default gen_random_uuid(),
  empresa_id               uuid not null references empresas(id),
  numero_contrato          text not null,
  cotizacion_origen_id     uuid references cotizaciones(id),
  cuenta_id                uuid not null references cuentas_clientes(id),
  contacto_firmante_id     uuid references contactos(id),
  tipo_contrato            text not null check (tipo_contrato in ('TIEMPO_Y_MATERIALES','PRECIO_FIJO','RETAINER','BOLSA_HORAS')),
  estado_id                uuid not null references estados_ciclo_vida(id),
  fecha_firma              date,
  fecha_inicio             date not null,
  fecha_fin_estimada       date,
  fecha_fin_real           date,
  moneda_id                uuid not null references monedas(id),
  valor_total_contratado   numeric(18,2) not null,
  forma_pago               text,
  plazo_pago_dias          smallint,
  responsable_comercial_id uuid not null references perfiles_usuario(id),
  responsable_pm_id        uuid references perfiles_usuario(id),
  archivo_contrato_url     text,
  clausulas_especiales     text,
  deleted_at               timestamptz,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now(),
  unique (empresa_id, numero_contrato)
);

create index ix_contratos_cuenta on contratos (cuenta_id) where deleted_at is null;
create trigger trg_contratos_updated_at before update on contratos
  for each row execute function fn_set_updated_at();
create trigger trg_audit_contratos after insert or update or delete on contratos
  for each row execute function fn_audit_row();

create table proyectos (
  id                          uuid primary key default gen_random_uuid(),
  empresa_id                  uuid not null references empresas(id),
  numero_proyecto              text not null,
  contrato_id                 uuid not null references contratos(id),
  nombre_proyecto              text not null,
  descripcion                  text,
  tipo_proyecto                 text,
  pm_id                        uuid not null references perfiles_usuario(id),
  estado_id                    uuid not null references estados_ciclo_vida(id),
  prioridad                    text check (prioridad in ('ALTA','MEDIA','BAJA')),
  fecha_inicio_planeada         date not null,
  fecha_fin_planeada            date not null,
  fecha_inicio_real             date,
  fecha_fin_real                date,
  presupuesto_horas_total       numeric(10,2),
  presupuesto_costo_total       numeric(18,2),
  presupuesto_ingreso_total     numeric(18,2),
  porcentaje_avance             numeric(5,2),
  deleted_at                    timestamptz,
  created_at                    timestamptz not null default now(),
  updated_at                    timestamptz not null default now(),
  unique (empresa_id, numero_proyecto)
);

create index ix_proyectos_contrato on proyectos (contrato_id) where deleted_at is null;
create index ix_proyectos_pm on proyectos (pm_id) where deleted_at is null;
create trigger trg_proyectos_updated_at before update on proyectos
  for each row execute function fn_set_updated_at();
create trigger trg_audit_proyectos after insert or update or delete on proyectos
  for each row execute function fn_audit_row();

-- FKs diferidos resueltos ahora que proyectos existe
alter table cotizaciones
  add constraint fk_cotizaciones_proyecto_generado
  foreign key (proyecto_generado_id) references proyectos(id);

alter table licencias_asignadas
  add constraint fk_licencias_asignadas_proyecto
  foreign key (proyecto_id) references proyectos(id);

create table hitos_entregables (
  id                                uuid primary key default gen_random_uuid(),
  proyecto_id                       uuid not null references proyectos(id) on delete cascade,
  numero_entregable                 text not null,
  nombre                            text not null,
  descripcion                       text,
  fase_orden                        smallint not null default 0,
  fecha_planeada_entrega            date not null,
  fecha_real_entrega                date,
  condiciones_aceptacion            text,
  estado                            text not null default 'PENDIENTE' check (estado in ('PENDIENTE','EN_PROGRESO','ENTREGADO','EN_REVISION_CLIENTE','ACEPTADO','RECHAZADO')),
  responsable_id                    uuid not null references perfiles_usuario(id),
  porcentaje_facturacion_asociado   numeric(5,2),
  valor_hito                        numeric(18,2),
  aprobador_cliente_contacto_id     uuid references contactos(id),
  fecha_aprobacion_cliente          timestamptz,
  firma_aceptacion_url              text,
  notas_rechazo                     text,
  created_at                        timestamptz not null default now(),
  updated_at                        timestamptz not null default now()
);

create index ix_hitos_proyecto on hitos_entregables (proyecto_id);
create trigger trg_hitos_updated_at before update on hitos_entregables
  for each row execute function fn_set_updated_at();
create trigger trg_audit_hitos after insert or update or delete on hitos_entregables
  for each row execute function fn_audit_row();

create table hitos_criterios_aceptacion (
  id                    uuid primary key default gen_random_uuid(),
  hito_id               uuid not null references hitos_entregables(id) on delete cascade,
  criterio              text not null,
  cumplido              boolean not null default false,
  verificado_por        uuid references perfiles_usuario(id),
  fecha_verificacion    timestamptz
);

create index ix_hitos_criterios_hito on hitos_criterios_aceptacion (hito_id);

create table timesheets (
  id                            uuid primary key default gen_random_uuid(),
  proyecto_id                   uuid not null references proyectos(id),
  hito_id                       uuid references hitos_entregables(id),
  recurso_id                    uuid not null references perfiles_usuario(id),
  fecha                         date not null,
  horas_registradas             numeric(6,2) not null check (horas_registradas > 0 and horas_registradas <= 24),
  tipo_hora                     text not null check (tipo_hora in ('FACTURABLE','NO_FACTURABLE')),
  categoria_no_facturable_id    uuid references catalogos_valores(id),
  rol_tarifa_id                 uuid references catalogo_roles_tarifa(id),
  descripcion_actividad         text not null,
  ubicacion_trabajo             text check (ubicacion_trabajo in ('REMOTO','CLIENTE','OFICINA')),
  estado_aprobacion             text not null default 'BORRADOR' check (estado_aprobacion in ('BORRADOR','ENVIADO','APROBADO','RECHAZADO')),
  aprobador_id                  uuid references perfiles_usuario(id),
  fecha_aprobacion              timestamptz,
  comentario_rechazo            text,
  facturado                     boolean not null default false,
  factura_referencia_id         uuid, -- FK agregada más abajo tras crear facturas_referencia_externa
  created_at                    timestamptz not null default now(),
  updated_at                    timestamptz not null default now()
);

create index ix_timesheets_proyecto_fecha on timesheets (proyecto_id, fecha);
create index ix_timesheets_recurso_fecha on timesheets (recurso_id, fecha);
create trigger trg_timesheets_updated_at before update on timesheets
  for each row execute function fn_set_updated_at();
create trigger trg_audit_timesheets after insert or update or delete on timesheets
  for each row execute function fn_audit_row();

create table asignacion_recursos (
  id                            uuid primary key default gen_random_uuid(),
  proyecto_id                   uuid not null references proyectos(id),
  recurso_id                    uuid not null references perfiles_usuario(id),
  rol_en_proyecto_id            uuid references catalogo_roles_tarifa(id),
  fecha_inicio_asignacion       date not null,
  fecha_fin_asignacion          date,
  porcentaje_dedicacion         numeric(5,2) not null check (porcentaje_dedicacion between 0 and 100),
  horas_planeadas_totales       numeric(10,2),
  tarifa_costo_hora_aplicable   numeric(18,2),
  tarifa_venta_hora_aplicable   numeric(18,2),
  estado_asignacion             text not null default 'PLANEADA' check (estado_asignacion in ('PLANEADA','ACTIVA','FINALIZADA','CANCELADA')),
  notas                         text
);

create index ix_asignacion_recursos_proyecto on asignacion_recursos (proyecto_id);
create index ix_asignacion_recursos_recurso on asignacion_recursos (recurso_id);

create table disponibilidad_recursos (
  id                 uuid primary key default gen_random_uuid(),
  recurso_id         uuid not null references perfiles_usuario(id),
  fecha              date not null,
  horas_disponibles  numeric(5,2) not null default 8,
  unique (recurso_id, fecha)
);

create table rentabilidad_snapshots (
  id                       uuid primary key default gen_random_uuid(),
  proyecto_id              uuid not null references proyectos(id),
  fecha_corte              date not null,
  ingreso_reconocido       numeric(18,2) not null,
  costo_mano_obra          numeric(18,2) not null,
  costo_subcontratacion    numeric(18,2) not null default 0,
  costo_licencias          numeric(18,2) not null default 0,
  otros_costos             numeric(18,2) default 0,
  margen_bruto             numeric(18,2) not null,
  margen_pct               numeric(5,2) not null,
  tipo_snapshot            text not null check (tipo_snapshot in ('AUTOMATICO','MANUAL')),
  generado_por             uuid references perfiles_usuario(id),
  created_at               timestamptz not null default now()
);

create index ix_rentabilidad_snapshots_proyecto on rentabilidad_snapshots (proyecto_id, fecha_corte desc);

-- Vista de rentabilidad en tiempo real. Se define aquí sin el costo de subcontratación
-- (la tabla ordenes_costo_subcontratacion aún no existe) y se reemplaza con
-- `create or replace view` en 05-compras-subcontratacion.sql para incorporarlo.
create or replace view vista_rentabilidad_proyecto as
select
  p.id as proyecto_id,
  p.numero_proyecto,
  p.presupuesto_ingreso_total,
  coalesce(mo.costo_mano_obra, 0)::numeric(18,2) as costo_mano_obra,
  0::numeric(18,2) as costo_subcontratacion, -- se completa en la migración de Compras
  coalesce(lic.costo_licencias, 0)::numeric(18,2) as costo_licencias,
  (coalesce(mo.costo_mano_obra, 0) + coalesce(lic.costo_licencias, 0))::numeric(18,2) as costo_total_actual,
  (coalesce(p.presupuesto_ingreso_total, 0) - (coalesce(mo.costo_mano_obra, 0) + coalesce(lic.costo_licencias, 0)))::numeric(18,2) as margen_bruto_actual
from proyectos p
left join lateral (
  select sum(t.horas_registradas * crt.tarifa_hora_costo_referencia) as costo_mano_obra
  from timesheets t
  join catalogo_roles_tarifa crt on crt.id = t.rol_tarifa_id
  where t.proyecto_id = p.id and t.tipo_hora = 'FACTURABLE'
) mo on true
left join lateral (
  select sum(coalesce(la.costo_total_periodo, 0)) as costo_licencias
  from licencias_asignadas la
  where la.proyecto_id = p.id
) lic on true
where p.deleted_at is null;

comment on view vista_rentabilidad_proyecto is
  'Rentabilidad calculada en tiempo real. costo_subcontratacion se completa (create or replace) en 05-compras-subcontratacion.sql una vez existe ordenes_costo_subcontratacion.';

create table change_requests (
  id                              uuid primary key default gen_random_uuid(),
  numero_cr                       text not null,
  proyecto_id                     uuid not null references proyectos(id),
  contrato_id                     uuid not null references contratos(id),
  titulo                          text not null,
  descripcion_cambio              text not null,
  tipo_cambio                     text not null check (tipo_cambio in ('ALCANCE','CRONOGRAMA','COSTO','RECURSOS','MIXTO')),
  justificacion                   text,
  impacto_horas                   numeric(10,2),
  impacto_costo                   numeric(18,2),
  impacto_valor_contrato          numeric(18,2),
  impacto_fecha_fin_dias          integer,
  estado_id                       uuid not null references estados_ciclo_vida(id),
  solicitado_por_contacto_id      uuid references contactos(id),
  solicitado_por_usuario_id       uuid references perfiles_usuario(id),
  fecha_solicitud                 date not null default current_date,
  aprobador_interno_id            uuid references perfiles_usuario(id),
  fecha_aprobacion_interna        timestamptz,
  aprobador_cliente_contacto_id   uuid references contactos(id),
  fecha_aprobacion_cliente        timestamptz,
  documento_addenda_url           text,
  fecha_efectiva                  date,
  created_at                      timestamptz not null default now(),
  updated_at                      timestamptz not null default now(),
  constraint ck_change_request_solicitante check (
    solicitado_por_contacto_id is not null or solicitado_por_usuario_id is not null
  )
);

create index ix_change_requests_proyecto on change_requests (proyecto_id);
create trigger trg_change_requests_updated_at before update on change_requests
  for each row execute function fn_set_updated_at();
create trigger trg_audit_change_requests after insert or update or delete on change_requests
  for each row execute function fn_audit_row();

create table facturas_referencia_externa (
  id                          uuid primary key default gen_random_uuid(),
  proyecto_id                 uuid references proyectos(id),
  contrato_id                 uuid references contratos(id),
  numero_factura_externa      text not null,
  sistema_origen              text not null,
  fecha_emision               date not null,
  fecha_vencimiento_pago      date,
  moneda_id                   uuid not null references monedas(id),
  monto_subtotal               numeric(18,2),
  monto_impuestos               numeric(18,2),
  monto_total                   numeric(18,2) not null,
  estado_pago                   text not null default 'PENDIENTE' check (estado_pago in ('PENDIENTE','PAGADA_PARCIAL','PAGADA_TOTAL','VENCIDA','ANULADA')),
  monto_pagado_acumulado        numeric(18,2) default 0,
  fecha_ultimo_pago             date,
  hito_asociado_id              uuid references hitos_entregables(id),
  metodo_registro               text not null default 'MANUAL' check (metodo_registro in ('MANUAL','API')),
  registrado_por_usuario_id     uuid references perfiles_usuario(id),
  adjunto_url                   text,
  notas                         text,
  created_at                    timestamptz not null default now(),
  updated_at                    timestamptz not null default now(),
  constraint ck_factura_ref_entidad check (proyecto_id is not null or contrato_id is not null)
);

create index ix_facturas_ref_proyecto on facturas_referencia_externa (proyecto_id);
create index ix_facturas_ref_contrato on facturas_referencia_externa (contrato_id);
create trigger trg_facturas_ref_updated_at before update on facturas_referencia_externa
  for each row execute function fn_set_updated_at();
create trigger trg_audit_facturas_ref after insert or update or delete on facturas_referencia_externa
  for each row execute function fn_audit_row();

alter table timesheets
  add constraint fk_timesheets_factura_referencia
  foreign key (factura_referencia_id) references facturas_referencia_externa(id);

create table casos_soporte_referencia_externa (
  id                          uuid primary key default gen_random_uuid(),
  proyecto_id                 uuid references proyectos(id),
  contrato_id                 uuid references contratos(id),
  numero_ticket_externo       text not null,
  sistema_origen              text not null,
  asunto                      text not null,
  descripcion_breve           text,
  fecha_apertura              date not null,
  fecha_cierre                date,
  estado                      text not null default 'ABIERTO' check (estado in ('ABIERTO','EN_PROGRESO','ESPERANDO_CLIENTE','RESUELTO','CERRADO')),
  prioridad                   text,
  categoria                   text check (categoria in ('INCIDENTE','SOLICITUD','GARANTIA','CONSULTA')),
  horas_consumidas            numeric(6,2),
  sla_incumplido              boolean default false,
  es_cubierto_garantia        boolean not null default false,
  metodo_registro             text not null default 'MANUAL' check (metodo_registro in ('MANUAL','API')),
  registrado_por_usuario_id   uuid references perfiles_usuario(id),
  notas                       text,
  created_at                  timestamptz not null default now(),
  updated_at                  timestamptz not null default now(),
  constraint ck_caso_soporte_ref_entidad check (proyecto_id is not null or contrato_id is not null)
);

create index ix_casos_soporte_ref_proyecto on casos_soporte_referencia_externa (proyecto_id);
create index ix_casos_soporte_ref_garantia on casos_soporte_referencia_externa (proyecto_id) where es_cubierto_garantia;
create trigger trg_casos_soporte_ref_updated_at before update on casos_soporte_referencia_externa
  for each row execute function fn_set_updated_at();
create trigger trg_audit_casos_soporte_ref after insert or update or delete on casos_soporte_referencia_externa
  for each row execute function fn_audit_row();
