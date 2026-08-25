"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { getUsuarioActual, usuarioTienePermiso } from "@/lib/auth/getUsuarioActual";
import type { Accion } from "@/lib/rbac";
import type { TablesInsert, TablesUpdate } from "@/utils/database.types";

export type ResultadoAccion = { ok: true } | { ok: false; error: string };

const RUTA = "/configuracion/integraciones";
const SUBLISTA = "integraciones";

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

function camposIntegracionDesdeFormData(formData: FormData) {
  return {
    nombre: String(formData.get("nombre") ?? "").trim(),
    tipo: String(formData.get("tipo") ?? "").trim(),
    proveedor: textoOpcional(formData.get("proveedor")),
    url_base: textoOpcional(formData.get("url_base")),
    metodo_autenticacion: String(formData.get("metodo_autenticacion") ?? "NINGUNO").trim(),
    credenciales_ref: textoOpcional(formData.get("credenciales_ref")),
  };
}

export async function crearIntegracion(formData: FormData): Promise<ResultadoAccion> {
  const { usuario, error } = await requerirPermiso("crear");
  if (!usuario) return { ok: false, error: error! };

  const campos = camposIntegracionDesdeFormData(formData);
  if (!campos.nombre) return { ok: false, error: "El nombre es obligatorio." };
  if (!campos.tipo) return { ok: false, error: "Debes elegir un tipo de integración." };

  const fila: TablesInsert<"integraciones_config"> = {
    empresa_id: usuario.perfil.empresa_id,
    ...campos,
  };

  const supabase = createClient(cookies());
  const { error: errorDb } = await supabase.from("integraciones_config").insert(fila);
  if (errorDb) return { ok: false, error: errorDb.message };

  revalidatePath(RUTA);
  return { ok: true };
}

export async function actualizarIntegracion(id: string, formData: FormData): Promise<ResultadoAccion> {
  const { usuario, error } = await requerirPermiso("editar");
  if (!usuario) return { ok: false, error: error! };

  const campos = camposIntegracionDesdeFormData(formData);
  if (!campos.nombre) return { ok: false, error: "El nombre es obligatorio." };

  const cambios: TablesUpdate<"integraciones_config"> = { ...campos };

  const supabase = createClient(cookies());
  const { error: errorDb } = await supabase.from("integraciones_config").update(cambios).eq("id", id);
  if (errorDb) return { ok: false, error: errorDb.message };

  revalidatePath(RUTA);
  return { ok: true };
}

export async function cambiarEstadoIntegracion(id: string, activo: boolean): Promise<ResultadoAccion> {
  const { usuario, error } = await requerirPermiso("editar");
  if (!usuario) return { ok: false, error: error! };

  const supabase = createClient(cookies());
  const { error: errorDb } = await supabase.from("integraciones_config").update({ activo }).eq("id", id);
  if (errorDb) return { ok: false, error: errorDb.message };

  revalidatePath(RUTA);
  return { ok: true };
}

export async function cambiarHabilitadaIntegracion(id: string, habilitada: boolean): Promise<ResultadoAccion> {
  const { usuario, error } = await requerirPermiso("editar");
  if (!usuario) return { ok: false, error: error! };

  const supabase = createClient(cookies());
  const { error: errorDb } = await supabase
    .from("integraciones_config")
    .update({ habilitada })
    .eq("id", id);
  if (errorDb) return { ok: false, error: errorDb.message };

  revalidatePath(RUTA);
  return { ok: true };
}

export async function crearWebhook(integracionId: string, formData: FormData): Promise<ResultadoAccion> {
  const { usuario, error } = await requerirPermiso("editar");
  if (!usuario) return { ok: false, error: error! };

  const evento = String(formData.get("evento") ?? "").trim();
  const urlDestino = String(formData.get("url_destino") ?? "").trim();
  if (!evento) return { ok: false, error: "El evento es obligatorio." };
  if (!urlDestino) return { ok: false, error: "La URL de destino es obligatoria." };

  const fila: TablesInsert<"webhooks_salientes"> = {
    integracion_id: integracionId,
    evento,
    url_destino: urlDestino,
    metodo_http: String(formData.get("metodo_http") ?? "POST").trim(),
    secreto_firma_ref: textoOpcional(formData.get("secreto_firma_ref")),
  };

  const supabase = createClient(cookies());
  const { error: errorDb } = await supabase.from("webhooks_salientes").insert(fila);
  if (errorDb) return { ok: false, error: errorDb.message };

  revalidatePath(RUTA);
  return { ok: true };
}

export async function cambiarEstadoWebhook(id: string, activo: boolean): Promise<ResultadoAccion> {
  const { usuario, error } = await requerirPermiso("editar");
  if (!usuario) return { ok: false, error: error! };

  const supabase = createClient(cookies());
  const { error: errorDb } = await supabase.from("webhooks_salientes").update({ activo }).eq("id", id);
  if (errorDb) return { ok: false, error: errorDb.message };

  revalidatePath(RUTA);
  return { ok: true };
}

export async function eliminarWebhook(id: string): Promise<ResultadoAccion> {
  const { usuario, error } = await requerirPermiso("editar");
  if (!usuario) return { ok: false, error: error! };

  const supabase = createClient(cookies());
  const { error: errorDb } = await supabase.from("webhooks_salientes").delete().eq("id", id);
  if (errorDb) return { ok: false, error: errorDb.message };

  revalidatePath(RUTA);
  return { ok: true };
}
