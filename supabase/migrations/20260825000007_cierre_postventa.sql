-- =============================================================================
-- Devtopia ERP — Etapa 6: Cierre y Postventa
-- Ver docs/data-model/06-cierre-postventa.md
--
-- ROLLBACK:
--   drop table if exists garantia_extensiones cascade;
--   drop table if exists garantias_contractuales cascade;
--   drop table if exists actas_cierre cascade;
--   drop table if exists checklist_liquidacion_items cascade;
--   drop table if exists checklist_liquidacion_proyecto cascade;
--   drop table if exists checklist_liquidacion_plantilla_items cascade;
--   drop table if exists checklist_liquidacion_plantillas cascade;
-- =============================================================================

create table checklist_liquidacion_plantillas (
  id           uuid primary key default gen_random_uuid(),
  empresa_id   uuid not null references empresas(id),
  nombre       text not null,
  descripcion  text,
  activo       boolean not null default true
);

create table checklist_liquidacion_plantilla_items (
  id                  uuid primary key default gen_random_uuid(),
  plantilla_id        uuid not null references checklist_liquidacion_plantillas(id) on delete cascade,
  orden               smallint not null default 0,
  descripcion_item    text not null,
  tipo_verificacion   text not null check (tipo_verificacion in ('ENTREGABLE_ACEPTADO','FIRMA_CLIENTE','RECURSOS_LIBERADOS','FACTURACION_COMPLETA','ACTIVOS_DEVUELTOS','DOCUMENTACION_ENTREGADA','OTRO')),
  obligatorio         boolean not null default true
);

create index ix_checklist_plantilla_items_plantilla on checklist_liquidacion_plantilla_items (plantilla_id);

create table checklist_liquidacion_proyecto (
  id                          uuid primary key default gen_random_uuid(),
  proyecto_id                 uuid not null unique references proyectos(id),
  plantilla_id                uuid not null references checklist_liquidacion_plantillas(id),
  responsable_id               uuid not null references perfiles_usuario(id),
  fecha_inicio_liquidacion     date not null default current_date,
  fecha_completado             date,
  estado                       text not null default 'EN_PROCESO' check (estado in ('EN_PROCESO','COMPLETADO')),
  porcentaje_completado        numeric(5,2) default 0
);

create table checklist_liquidacion_items (
  id                          uuid primary key default gen_random_uuid(),
  checklist_proyecto_id       uuid not null references checklist_liquidacion_proyecto(id) on delete cascade,
  plantilla_item_id           uuid not null references checklist_liquidacion_plantilla_items(id),
  cumplido                    boolean not null default false,
  fecha_cumplimiento          timestamptz,
  verificado_por_usuario_id   uuid references perfiles_usuario(id),
  evidencia_url               text,
  comentario                  text
);

create index ix_checklist_items_checklist on checklist_liquidacion_items (checklist_proyecto_id);

-- Mantiene checklist_liquidacion_proyecto.porcentaje_completado sincronizado.
create or replace function fn_recalcular_porcentaje_checklist()
returns trigger
language plpgsql
as $$
declare
  v_checklist_id uuid := coalesce(new.checklist_proyecto_id, old.checklist_proyecto_id);
  v_total int;
  v_cumplidos int;
begin
  select count(*), count(*) filter (where cumplido)
    into v_total, v_cumplidos
    from checklist_liquidacion_items
   where checklist_proyecto_id = v_checklist_id;

  update checklist_liquidacion_proyecto
     set porcentaje_completado = case when v_total = 0 then 0 else round((v_cumplidos::numeric / v_total) * 100, 2) end,
         estado = case when v_total > 0 and v_cumplidos = v_total then 'COMPLETADO' else 'EN_PROCESO' end,
         fecha_completado = case when v_total > 0 and v_cumplidos = v_total then coalesce(fecha_completado, current_date) else null end
   where id = v_checklist_id;

  return coalesce(new, old);
end;
$$;

create trigger trg_recalcular_porcentaje_checklist
  after insert or update or delete on checklist_liquidacion_items
  for each row execute function fn_recalcular_porcentaje_checklist();

create table actas_cierre (
  id                              uuid primary key default gen_random_uuid(),
  proyecto_id                     uuid not null unique references proyectos(id),
  fecha_acta                      date not null default current_date,
  firmante_cliente_contacto_id    uuid references contactos(id),
  firmante_interno_usuario_id     uuid not null references perfiles_usuario(id),
  documento_acta_url              text,
  observaciones_finales           text,
  recursos_liberados              boolean not null default false,
  fecha_liberacion_recursos       timestamptz,
  created_at                      timestamptz not null default now(),
  updated_at                      timestamptz not null default now()
);

create trigger trg_actas_cierre_updated_at before update on actas_cierre
  for each row execute function fn_set_updated_at();
create trigger trg_audit_actas_cierre after insert or update or delete on actas_cierre
  for each row execute function fn_audit_row();

create table garantias_contractuales (
  id                        uuid primary key default gen_random_uuid(),
  proyecto_id               uuid references proyectos(id),
  contrato_id               uuid references contratos(id),
  fecha_inicio_garantia     date not null,
  duracion_meses            smallint not null,
  fecha_fin_garantia        date not null,
  alcance_garantia          text,
  condiciones_exclusiones   text,
  estado                    text not null default 'VIGENTE' check (estado in ('VIGENTE','VENCIDA','EXTENDIDA')),
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now(),
  constraint ck_garantia_entidad check (proyecto_id is not null or contrato_id is not null)
);

create index ix_garantias_proyecto on garantias_contractuales (proyecto_id);
create trigger trg_garantias_updated_at before update on garantias_contractuales
  for each row execute function fn_set_updated_at();

create table garantia_extensiones (
  id                          uuid primary key default gen_random_uuid(),
  garantia_id                 uuid not null references garantias_contractuales(id) on delete cascade,
  fecha_extension              date not null default current_date,
  meses_adicionales            smallint not null,
  motivo                       text,
  valor_adicional               numeric(18,2),
  aprobado_por_usuario_id       uuid references perfiles_usuario(id)
);

create index ix_garantia_extensiones_garantia on garantia_extensiones (garantia_id);
