-- =============================================================================
-- Devtopia ERP — Etapa 5: Compras y Subcontratación
-- Ver docs/data-model/05-compras-subcontratacion.md
--
-- ROLLBACK:
--   alter table licencias_suscripciones_catalogo drop constraint if exists fk_licencias_catalogo_proveedor;
--   drop table if exists ordenes_costo_subcontratacion cascade;
--   drop table if exists evaluaciones_proveedor cascade;
--   drop table if exists proveedores cascade;
--   -- La vista vista_rentabilidad_proyecto queda con costo_subcontratacion en 0
--   -- (revertida a su forma de la migración 04) si se ejecuta el rollback completo de esta etapa.
-- =============================================================================

create table proveedores (
  id                                uuid primary key default gen_random_uuid(),
  empresa_id                        uuid not null references empresas(id),
  numero_proveedor                  text not null,
  tipo_proveedor                    text not null check (tipo_proveedor in ('EMPRESA','FREELANCER','INFRAESTRUCTURA_CLOUD','OTRO')),
  razon_social_o_nombre             text not null,
  tipo_identificacion               text,
  numero_identificacion             text,
  email                             citext,
  telefono                          text,
  direccion                         text,
  pais                              text,
  categoria_id                      uuid references catalogos_valores(id),
  especialidad                      text,
  tarifa_referencia_hora            numeric(18,2),
  moneda_id                         uuid references monedas(id),
  forma_pago_preferida              text,
  plazo_pago_dias                   smallint,
  cuenta_bancaria_ref               text,
  calificacion_desempeno_promedio   numeric(3,2),
  estado                            text not null default 'ACTIVO' check (estado in ('ACTIVO','INACTIVO','EN_EVALUACION','BLOQUEADO')),
  documentos_legales_url            text,
  fecha_vinculacion                 date,
  deleted_at                        timestamptz,
  created_at                        timestamptz not null default now(),
  updated_at                        timestamptz not null default now(),
  unique (empresa_id, numero_proveedor)
);

comment on column proveedores.cuenta_bancaria_ref is
  'Referencia/alias, nunca el número de cuenta bancaria completo sin cifrar.';

create index ix_proveedores_empresa on proveedores (empresa_id) where deleted_at is null;
create trigger trg_proveedores_updated_at before update on proveedores
  for each row execute function fn_set_updated_at();
create trigger trg_audit_proveedores after insert or update or delete on proveedores
  for each row execute function fn_audit_row();

create table evaluaciones_proveedor (
  id                        uuid primary key default gen_random_uuid(),
  proveedor_id              uuid not null references proveedores(id) on delete cascade,
  proyecto_id               uuid references proyectos(id),
  fecha_evaluacion          date not null default current_date,
  calificacion              numeric(3,2) not null check (calificacion between 1 and 5),
  criterios                 jsonb,
  comentarios               text,
  evaluado_por_usuario_id   uuid not null references perfiles_usuario(id)
);

create index ix_evaluaciones_proveedor_proveedor on evaluaciones_proveedor (proveedor_id);

-- Mantiene proveedores.calificacion_desempeno_promedio sincronizada automáticamente
-- (evita que quede como campo editable manual y se desincronice).
create or replace function fn_recalcular_calificacion_proveedor()
returns trigger
language plpgsql
as $$
begin
  update proveedores
     set calificacion_desempeno_promedio = (
           select round(avg(calificacion)::numeric, 2)
           from evaluaciones_proveedor
           where proveedor_id = coalesce(new.proveedor_id, old.proveedor_id)
         )
   where id = coalesce(new.proveedor_id, old.proveedor_id);
  return coalesce(new, old);
end;
$$;

create trigger trg_recalcular_calificacion_proveedor
  after insert or update or delete on evaluaciones_proveedor
  for each row execute function fn_recalcular_calificacion_proveedor();

create table ordenes_costo_subcontratacion (
  id                          uuid primary key default gen_random_uuid(),
  numero_orden                text not null,
  proveedor_id                uuid not null references proveedores(id),
  proyecto_id                 uuid not null references proyectos(id),
  contrato_id                 uuid references contratos(id),
  concepto                    text not null,
  tipo_costo                  text not null check (tipo_costo in ('SERVICIO_PROFESIONAL','INFRAESTRUCTURA','LICENCIA_TERCERO','OTRO')),
  fecha_orden                 date not null default current_date,
  fecha_inicio_servicio       date,
  fecha_fin_servicio          date,
  cantidad                    numeric(10,2) not null default 1,
  unidad_medida                text not null,
  valor_unitario                numeric(18,2) not null,
  moneda_id                     uuid not null references monedas(id),
  valor_total                   numeric(18,2) not null,
  estado_id                     uuid not null references estados_ciclo_vida(id),
  aprobador_interno_id          uuid references perfiles_usuario(id),
  fecha_aprobacion              timestamptz,
  factura_proveedor_numero      text,
  factura_proveedor_fecha       date,
  factura_proveedor_url         text,
  notas                         text,
  created_at                    timestamptz not null default now(),
  updated_at                    timestamptz not null default now(),
  unique (proveedor_id, numero_orden)
);

create index ix_ordenes_costo_proyecto on ordenes_costo_subcontratacion (proyecto_id);
create index ix_ordenes_costo_proveedor on ordenes_costo_subcontratacion (proveedor_id);
create trigger trg_ordenes_costo_updated_at before update on ordenes_costo_subcontratacion
  for each row execute function fn_set_updated_at();
create trigger trg_audit_ordenes_costo after insert or update or delete on ordenes_costo_subcontratacion
  for each row execute function fn_audit_row();

-- FK diferido resuelto: catálogo de licencias -> proveedores
alter table licencias_suscripciones_catalogo
  add constraint fk_licencias_catalogo_proveedor
  foreign key (proveedor_id) references proveedores(id);

-- Se completa la vista de rentabilidad con el costo real de subcontratación.
create or replace view vista_rentabilidad_proyecto as
select
  p.id as proyecto_id,
  p.numero_proyecto,
  p.presupuesto_ingreso_total,
  coalesce(mo.costo_mano_obra, 0)::numeric(18,2) as costo_mano_obra,
  coalesce(sub.costo_subcontratacion, 0)::numeric(18,2) as costo_subcontratacion,
  coalesce(lic.costo_licencias, 0)::numeric(18,2) as costo_licencias,
  (coalesce(mo.costo_mano_obra, 0) + coalesce(sub.costo_subcontratacion, 0) + coalesce(lic.costo_licencias, 0))::numeric(18,2) as costo_total_actual,
  (coalesce(p.presupuesto_ingreso_total, 0)
    - (coalesce(mo.costo_mano_obra, 0) + coalesce(sub.costo_subcontratacion, 0) + coalesce(lic.costo_licencias, 0)))::numeric(18,2) as margen_bruto_actual
from proyectos p
left join lateral (
  select sum(t.horas_registradas * crt.tarifa_hora_costo_referencia) as costo_mano_obra
  from timesheets t
  join catalogo_roles_tarifa crt on crt.id = t.rol_tarifa_id
  where t.proyecto_id = p.id and t.tipo_hora = 'FACTURABLE'
) mo on true
left join lateral (
  select sum(oc.valor_total) as costo_subcontratacion
  from ordenes_costo_subcontratacion oc
  where oc.proyecto_id = p.id
) sub on true
left join lateral (
  select sum(coalesce(la.costo_total_periodo, 0)) as costo_licencias
  from licencias_asignadas la
  where la.proyecto_id = p.id
) lic on true
where p.deleted_at is null;
