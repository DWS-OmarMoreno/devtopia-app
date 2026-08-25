"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient, isAdminClientConfigured } from "@/utils/supabase/admin";
import { getUsuarioActual, usuarioTienePermiso } from "@/lib/auth/getUsuarioActual";

export type ResultadoAccion = { ok: true } | { ok: false; error: string };

const SUBLISTA = "perfiles_usuario";

/**
 * Invita un usuario nuevo por correo (Supabase Auth) y le asigna de una vez
 * el rol elegido por el Administrador. El registro público está deshabilitado
 * a propósito (docs/data-model + memoria de proyecto): esta es la única forma
 * de dar de alta un usuario en el ERP.
 *
 * El trigger `fn_manejar_nuevo_usuario` (seed.sql) ya crea automáticamente el
 * `perfiles_usuario` del usuario invitado con el rol sin privilegios
 * "Pendiente de Asignación" en cuanto Supabase Auth crea la fila en
 * auth.users; aquí solo lo actualizamos al rol real elegido.
 */
export async function invitarUsuario(formData: FormData): Promise<ResultadoAccion> {
  const usuarioActual = await getUsuarioActual();
  if (!usuarioTienePermiso(usuarioActual, "CONFIGURACION", "crear", SUBLISTA)) {
    return { ok: false, error: "No tienes permiso para invitar usuarios." };
  }

  if (!isAdminClientConfigured()) {
    return {
      ok: false,
      error:
        "Falta configurar SUPABASE_SERVICE_ROLE_KEY en el servidor (.env.local, sin prefijo NEXT_PUBLIC_). Pide al equipo técnico que la agregue.",
    };
  }

  const email = String(formData.get("email") ?? "").trim();
  const nombreCompleto = String(formData.get("nombre_completo") ?? "").trim();
  const rolId = String(formData.get("rol_id") ?? "").trim();

  if (!email || !nombreCompleto || !rolId) {
    return { ok: false, error: "Completa correo, nombre y rol." };
  }

  const admin = createAdminClient();

  const { data: invitado, error: errorInvitar } = await admin.auth.admin.inviteUserByEmail(email, {
    data: { nombre_completo: nombreCompleto },
  });

  if (errorInvitar || !invitado?.user) {
    return {
      ok: false,
      error: errorInvitar?.message ?? "No se pudo invitar al usuario.",
    };
  }

  const supabase = createClient(cookies());
  const { error: errorRol } = await supabase
    .from("perfiles_usuario")
    .update({ rol_id: rolId, nombre_completo: nombreCompleto })
    .eq("id", invitado.user.id);

  if (errorRol) {
    return {
      ok: false,
      error: `Se invitó a ${email}, pero no se pudo asignar el rol: ${errorRol.message}. Puedes asignarlo manualmente desde esta misma pantalla.`,
    };
  }

  revalidatePath("/configuracion/usuarios");
  return { ok: true };
}

export async function cambiarRolUsuario(usuarioId: string, rolId: string): Promise<ResultadoAccion> {
  const usuarioActual = await getUsuarioActual();
  if (!usuarioTienePermiso(usuarioActual, "CONFIGURACION", "editar", SUBLISTA)) {
    return { ok: false, error: "No tienes permiso para cambiar roles." };
  }

  const supabase = createClient(cookies());
  const { error } = await supabase
    .from("perfiles_usuario")
    .update({ rol_id: rolId })
    .eq("id", usuarioId);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/configuracion/usuarios");
  return { ok: true };
}

export async function cambiarEstadoUsuario(usuarioId: string, activo: boolean): Promise<ResultadoAccion> {
  const usuarioActual = await getUsuarioActual();
  if (!usuarioTienePermiso(usuarioActual, "CONFIGURACION", "editar", SUBLISTA)) {
    return { ok: false, error: "No tienes permiso para cambiar el estado de usuarios." };
  }

  const supabase = createClient(cookies());
  const { error } = await supabase
    .from("perfiles_usuario")
    .update({ activo })
    .eq("id", usuarioId);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/configuracion/usuarios");
  return { ok: true };
}
