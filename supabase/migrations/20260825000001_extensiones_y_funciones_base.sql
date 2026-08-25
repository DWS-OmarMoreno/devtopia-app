-- =============================================================================
-- Devtopia ERP — Etapa 0: Extensiones y funciones genéricas
-- Ver docs/data-model/00-overview.md para el detalle de convenciones.
--
-- ROLLBACK:
--   drop function if exists fn_set_updated_at() cascade;
--   drop function if exists fn_audit_row() cascade;
--   -- No se desactivan extensiones: pueden ser usadas por otras apps del mismo proyecto
--   -- Supabase. Desactivarlas es responsabilidad manual y explícita del DBA si aplica.
-- =============================================================================

-- Extensiones estándar de Supabase/Postgres (idempotentes)
create extension if not exists "pgcrypto";   -- gen_random_uuid()
create extension if not exists "citext";     -- comparaciones case-insensitive (emails, códigos)

-- -----------------------------------------------------------------------------
-- fn_set_updated_at: mantiene updated_at en cada UPDATE. Se adjunta como trigger
-- BEFORE UPDATE a cada tabla de negocio.
-- -----------------------------------------------------------------------------
create or replace function fn_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  if to_jsonb(new) ? 'updated_by' then
    new.updated_by := coalesce(auth.uid(), new.updated_by);
  end if;
  return new;
end;
$$;

comment on function fn_set_updated_at() is
  'Trigger genérico BEFORE UPDATE: refresca updated_at/updated_by en cualquier tabla que tenga esas columnas.';

-- -----------------------------------------------------------------------------
-- fn_audit_row: registra en log_auditoria (creada en 01-configuracion-general)
-- el estado anterior/nuevo de cualquier fila insertada, actualizada o borrada.
-- Se declara aquí porque es transversal; se referencia desde cada migración de
-- módulo vía `create trigger ... execute function fn_audit_row()`.
-- La tabla log_auditoria se crea en la migración 01; esta función se vuelve a
-- crear (or replace) al final de esa migración una vez la tabla existe, para
-- que el cuerpo pueda referenciarla directamente. Aquí dejamos el placeholder
-- documentado para que el orden de dependencia quede explícito.
-- -----------------------------------------------------------------------------
comment on schema public is
  'fn_audit_row() se define en 20260825000002_configuracion_general.sql, una vez existe la tabla log_auditoria que consume.';
