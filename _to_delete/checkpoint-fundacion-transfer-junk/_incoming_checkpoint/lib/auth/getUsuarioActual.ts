import "server-only";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { tienePermiso, type Accion, type Modulo, type PermisoRow } from "@/lib/rbac";
import type { Tables } from "@/utils/database.types";

export type UsuarioActual = {
  id: string;
  email: string | null;
  perfil: Tables<"perfiles_usuario">;
  rol: Tables<"roles">;
  permisos: PermisoRow[];
  empresa: Tables<"empresas">;
};

/**
 * Helper de servidor: resuelve el usuario autenticado + su perfil, rol,
 * permisos y empresa en una sola llamada, para usar en Server Components
 * (layouts, páginas) y Server Actions. Se apoya en las políticas RLS de
 * "lectura básica propia" (20260825000009_rls_lectura_basica_propia.sql) —
 * si esa migración no está aplicada en el proyecto Supabase conectado, esto
 * devolverá `null` para cualquier usuario que no sea Administrador.
 */
export async function getUsuarioActual(): Promise<UsuarioActual | null> {
  const supabase = createClient(cookies());

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: perfil } = await supabase
    .from("perfiles_usuario")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!perfil) return null;

  const [{ data: rol }, { data: permisos }, { data: empresa }] = await Promise.all([
    supabase.from("roles").select("*").eq("id", perfil.rol_id).single(),
    supabase.from("permisos").select("*").eq("rol_id", perfil.rol_id),
    supabase.from("empresas").select("*").eq("id", perfil.empresa_id).single(),
  ]);

  if (!rol || !empresa) return null;

  return {
    id: user.id,
    email: user.email ?? null,
    perfil,
    rol,
    permisos: permisos ?? [],
    empresa,
  };
}

/**
 * Chequeo de permiso para usar al inicio de una página/Server Action antes de
 * hacer cualquier trabajo. No reemplaza RLS (que es quien protege los datos
 * de verdad) — evita ejecutar lógica de negocio y da un mensaje claro cuando
 * el usuario no tiene el permiso, en vez de dejar que la consulta a Supabase
 * simplemente devuelva 0 filas sin explicación.
 */
export function usuarioTienePermiso(
  usuario: UsuarioActual | null,
  modulo: Modulo,
  accion: Accion,
  sublista?: string
): boolean {
  if (!usuario) return false;
  return tienePermiso(usuario.permisos, modulo, accion, sublista);
}
