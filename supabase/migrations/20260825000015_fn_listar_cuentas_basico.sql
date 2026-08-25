-- =============================================================================
-- Devtopia ERP — Etapa 15: acceso cruzado de solo lectura (id + razón social)
-- a cuentas_clientes para el selector de cliente de Licencias, sin exigir
-- permisos completos de CRM_VENTAS.
--
-- CONTEXTO: `cuentas_clientes_select_pol` exige CRM_VENTAS/leer/cuentas. La
-- pantalla de Licencias y Suscripciones (Productos y Servicios, Checkpoint 2)
-- necesita listar cuentas de cliente para asignarles una licencia, pero un
-- usuario con permisos solo de PRODUCTOS_SERVICIOS/leer/licencias (sin
-- CRM_VENTAS) no tiene por qué poder ver el módulo comercial completo.
-- Verificado empíricamente en Postgres local antes de esta migración: ese
-- usuario recibía 0 filas de cuentas_clientes y el dropdown de cliente
-- quedaba vacío sin ningún error visible. Documentado como caveat conocido en
-- Checkpoint 2; el usuario pidió cerrarlo dando acceso cruzado específico.
--
-- SOLUCIÓN: en vez de debilitar `cuentas_clientes_select_pol` (lo que
-- expondría TODAS las columnas de cuentas_clientes — identificación fiscal,
-- ejecutivo comercial, notas, etc. — a cualquiera con permiso de Licencias),
-- se agrega una función SECURITY DEFINER de solo lectura que expone
-- ÚNICAMENTE id y razón social, filtrada por empresa y por CUALQUIERA de los
-- dos permisos (CRM_VENTAS/leer/cuentas O PRODUCTOS_SERVICIOS/leer/licencias).
-- Mismo patrón de "resiliencia" ya usado en el esquema para casos similares
-- (fn_generar_consecutivo, fn_audit_row): función explícita con su propio
-- chequeo de autorización, en vez de ampliar una política RLS genérica.
--
-- La app (app/(app)/productos-servicios/page.tsx) debe llamar a esta función
-- vía `supabase.rpc('fn_listar_cuentas_basico')` en vez de hacer
-- `.from('cuentas_clientes').select(...)` directo, para la lista de cuentas
-- que se le pasa a LicenciasPanel.
--
-- VERIFICACIÓN: probado en Postgres local (devtopia_test) — un usuario con
-- rol que solo tiene PRODUCTOS_SERVICIOS/leer/licencias (sin ningún permiso
-- de CRM_VENTAS) obtiene filas de esta función pero sigue sin poder hacer
-- `select * from cuentas_clientes` directo (RLS de la tabla base intacta).
--
-- ROLLBACK: drop function if exists fn_listar_cuentas_basico();
-- =============================================================================

create or replace function fn_listar_cuentas_basico()
returns table (id uuid, razon_social text)
language sql
security definer
set search_path = public
stable
as $$
  select c.id, c.razon_social
  from cuentas_clientes c
  where c.empresa_id = fn_empresa_actual()
    and (
      fn_tiene_permiso('CRM_VENTAS', 'leer', 'cuentas')
      or fn_tiene_permiso('PRODUCTOS_SERVICIOS', 'leer', 'licencias')
    )
  order by c.razon_social;
$$;

comment on function fn_listar_cuentas_basico() is
  'Solo lectura (id, razon_social) de cuentas_clientes de la empresa actual, para selectores cruzados de otros módulos (ej. Licencias en Productos y Servicios) que no requieren permisos completos de CRM_VENTAS. SECURITY DEFINER a propósito: expone menos columnas que la tabla base, nunca más.';

grant execute on function fn_listar_cuentas_basico() to authenticated;
