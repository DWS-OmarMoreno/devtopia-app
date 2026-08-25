"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { getUsuarioActual, usuarioTienePermiso } from "@/lib/auth/getUsuarioActual";
import type { Accion } from "@/lib/rbac";
import type { TablesInsert, TablesUpdate } from "@/utils/database.types";

export type ResultadoAccion = { ok: true } | { ok: false; error: string };

const RUTA = "/configuracion/alertas";
const SUBLISTA = "alertas";

async function requerirPermiso(accion: Accion) {
  const usuario = await getUsuarioActual();
  if (!usuarioTienePermiso(usuario, "CONFIGURACION", accion, SUBLISTA)) {
    return { usuario: null, error: "No tienes permiso para realizar esta acción." } as const;
  }
  return { usuario, error: null } as const;
}

function textoOpcional(valor: FormDataEntryValue | null): string | null {
  if (valor === null) return null;
  const texto = String(valor).trim();
  return texto ? texto : null;
}

function camposDesdeFormData(formData: FormData) {
  const destinatariosTipo = String(formData.get("destinatarios_tipo") ?? "").trim();
  return {
    nombre: String(formData.get("nombre") ?? "").trim(),
    evento_disparador: String(formData.get("evento_disparador") ?? "").trim(),
    canal: String(formData.get("canal") ?? "").trim(),
    destinatarios_tipo: destinatariosTipo,
    destinatarios_rol_id: destinatariosTipo === "ROL_ESPECIFICO" ? textoOpcional(formData.get("destinatarios_rol_id")) : null,
    destinatarios_usuario_id:
      destinatariosTipo === "USUARIO_ESPECIFICO" ? textoOpcional(formData.get("destinatarios_usuario_id")) : null,
    plantilla_asunto: textoOpcional(formData.get("plantilla_asunto")),
    plantilla_cuerpo: textoOpcional(formData.get("plantilla_cuerpo")),
  };
}

export async function crearAlerta(formData: FormData): Promise<ResultadoAccion> {
  const { usuario, error } = await requerirPermiso("crear");
  if (!usuario) return { ok: false, error: error! };

  const campos = camposDesdeFormData(formData);
  if (!campos.nombre) return { ok: false, error: "El nombre de la regla es obligatorio." };
  if (!campos.evento_disparador) return { ok: false, error: "Debes elegir un evento disparador." };

  const fila: TablesInsert<"alertas_notificaciones_reglas"> = {
    empresa_id: usuario.perfil.empresa_id,
    ...campos,
  };

  const supabase = createClient(cookies());
  const { error: errorDb } = await supabase.from("alertas_notificaciones_reglas").insert(fila);
  if (errorDb) return { ok: false, error: errorDb.message };

  revalidatePath(RUTA);
  return { ok: true };
}

export async function actualizarAlerta(id: string, formData: FormData): Promise<ResultadoAccion> {
  const { usuario, error } = await requerirPermiso("editar");
  if (!usuario) return { ok: false, error: error! };

  const campos = camposDesdeFormData(formData);
  if (!campos.nombre) return { ok: false, error: "El nombre de la regla es obligatorio." };

  const cambios: TablesUpdate<"alertas_notificaciones_reglas"> = { ...campos };

  const supabase = createClient(cookies());
  const { error: errorDb } = await supabase
    .from("alertas_notificaciones_reglas")
    .update(cambios)
    .eq("id", id);
  if (errorDb) return { ok: false, error: errorDb.message };

  revalidatePath(RUTA);
  return { ok: true };
}

export async function cambiarEstadoAlerta(id: string, activa: boolean): Promise<ResultadoAccion> {
  const { usuario, error } = await requerirPermiso("editar");
  if (!usuario) return { ok: false, error: error! };

  const supabase = createClient(cookies());
  const { error: errorDb } = await supabase
    .from("alertas_notificaciones_reglas")
    .update({ activa })
    .eq("id", id);
  if (errorDb) return { ok: false, error: errorDb.message };

  revalidatePath(RUTA);
  return { ok: true };
}
