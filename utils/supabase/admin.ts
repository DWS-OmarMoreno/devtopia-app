import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/utils/database.types";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

/**
 * Cliente con la service_role key de Supabase: se salta RLS por completo y
 * puede administrar usuarios de Auth (invitar, listar, borrar). SOLO se usa
 * desde Server Actions o Route Handlers, NUNCA desde un componente cliente ni
 * se expone su resultado crudo al navegador — el import "server-only" hace
 * fallar el build si alguien lo importa accidentalmente desde un client
 * component.
 *
 * Sigue el patrón de resiliencia del proyecto para dependencias externas: la
 * ausencia de SUPABASE_SERVICE_ROLE_KEY nunca debe tumbar el resto de la
 * aplicación (paso 3: nunca lanzar la excepción hacia el flujo principal sin
 * control) — por eso se expone `isAdminClientConfigured()` para que cada
 * pantalla que dependa de esto pueda mostrar un estado explícito en vez de
 * romperse.
 */
export const isAdminClientConfigured = () => Boolean(serviceRoleKey);

export const createAdminClient = () => {
  if (!serviceRoleKey) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY no está configurada. Agrégala a .env.local " +
        "(server-only, NUNCA con prefijo NEXT_PUBLIC_) con el valor de " +
        "Project Settings > API > service_role en tu proyecto Supabase, para " +
        "poder invitar usuarios desde Configuración > Usuarios."
    );
  }

  return createSupabaseClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
};
