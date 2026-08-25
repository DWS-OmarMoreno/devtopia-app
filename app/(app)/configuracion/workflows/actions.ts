"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { getUsuarioActual, usuarioTienePermiso } from "@/lib/auth/getUsuarioActual";
import type { Accion } from "@/lib/rbac";
import type { TablesInsert, TablesUpdate } from "@/utils/database.types";

export type ResultadoAccion = { ok: true } | { ok: false; error: string };

const RUTA = "/configuracion/workflows";
const SUBLISTA = "workflows";

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

// =============================================================================
// Estados de ciclo de vida
// =============================================================================

export async function crearEstadoCicloVida(formData: FormData): Promise<ResultadoAccion> {
  const { usuario, error } = await requerirPermiso("crear");
  if (!usuario) return { ok: false, error: error! };

  const entidadAplicable = String(formData.get("entidad_aplicable") ?? "").trim();
  const codigoEstado = String(formData.get("codigo_estado") ?? "").trim();
  const etiqueta = String(formData.get("etiqueta") ?? "").trim();
  const orden = Number(formData.get("orden"));

  if (!entidadAplicable) return { ok: false, error: "Debes indicar la entidad a la que aplica." };
  if (!codigoEstado) return { ok: false, error: "El código del estado es obligatorio." };
  if (!etiqueta) return { ok: false, error: "La etiqueta es obligatoria." };

  const fila: TablesInsert<"estados_ciclo_vida"> = {
    empresa_id: usuario.perfil.empresa_id,
    entidad_aplicable: entidadAplicable,
    codigo_estado: codigoEstado,
    etiqueta,
    orden: Number.isFinite(orden) ? orden : 0,
    es_estado_inicial: formData.get("es_estado_inicial") === "true",
    es_estado_final: formData.get("es_estado_final") === "true",
    color_ui: textoOpcional(formData.get("color_ui")),
  };

  const supabase = createClient(cookies());
  const { error: errorDb } = await supabase.from("estados_ciclo_vida").insert(fila);
  if (errorDb) return { ok: false, error: errorDb.message };

  revalidatePath(RUTA);
  return { ok: true };
}

export async function actualizarEstadoCicloVida(id: string, formData: FormData): Promise<ResultadoAccion> {
  const { usuario, error } = await requerirPermiso("editar");
  if (!usuario) return { ok: false, error: error! };

  const codigoEstado = String(formData.get("codigo_estado") ?? "").trim();
  const etiqueta = String(formData.get("etiqueta") ?? "").trim();
  const orden = Number(formData.get("orden"));

  if (!codigoEstado) return { ok: false, error: "El código del estado es obligatorio." };
  if (!etiqueta) return { ok: false, error: "La etiqueta es obligatoria." };

  const cambios: TablesUpdate<"estados_ciclo_vida"> = {
    codigo_estado: codigoEstado,
    etiqueta,
    orden: Number.isFinite(orden) ? orden : 0,
    es_estado_inicial: formData.get("es_estado_inicial") === "true",
    es_estado_final: formData.get("es_estado_final") === "true",
    color_ui: textoOpcional(formData.get("color_ui")),
  };

  const supabase = createClient(cookies());
  const { error: errorDb } = await supabase.from("estados_ciclo_vida").update(cambios).eq("id", id);
  if (errorDb) return { ok: false, error: errorDb.message };

  revalidatePath(RUTA);
  return { ok: true };
}

export async function cambiarEstadoActivoEstadoCicloVida(id: string, activo: boolean): Promise<ResultadoAccion> {
  const { usuario, error } = await requerirPermiso("editar");
  if (!usuario) return { ok: false, error: error! };

  const supabase = createClient(cookies());
  const { error: errorDb } = await supabase.from("estados_ciclo_vida").update({ activo }).eq("id", id);
  if (errorDb) return { ok: false, error: errorDb.message };

  revalidatePath(RUTA);
  return { ok: true };
}

// =============================================================================
// Transiciones de workflow
// =============================================================================

export async function crearTransicion(entidadAplicable: string, formData: FormData): Promise<ResultadoAccion> {
  const { usuario, error } = await requerirPermiso("crear");
  if (!usuario) return { ok: false, error: error! };

  const estadoOrigenId = String(formData.get("estado_origen_id") ?? "").trim();
  const estadoDestinoId = String(formData.get("estado_destino_id") ?? "").trim();

  if (!estadoOrigenId) return { ok: false, error: "Debes elegir el estado de origen." };
  if (!estadoDestinoId) return { ok: false, error: "Debes elegir el estado de destino." };
  if (estadoOrigenId === estadoDestinoId) {
    return { ok: false, error: "El estado de origen y destino no pueden ser el mismo." };
  }

  const fila: TablesInsert<"workflows_transiciones"> = {
    entidad_aplicable: entidadAplicable,
    estado_origen_id: estadoOrigenId,
    estado_destino_id: estadoDestinoId,
    rol_permitido_id: textoOpcional(formData.get("rol_permitido_id")),
    requiere_comentario: formData.get("requiere_comentario") === "true",
    requiere_aprobacion_doble: formData.get("requiere_aprobacion_doble") === "true",
  };

  const supabase = createClient(cookies());
  const { error: errorDb } = await supabase.from("workflows_transiciones").insert(fila);
  if (errorDb) return { ok: false, error: errorDb.message };

  revalidatePath(RUTA);
  return { ok: true };
}

export async function eliminarTransicion(id: string): Promise<ResultadoAccion> {
  const { usuario, error } = await requerirPermiso("editar");
  if (!usuario) return { ok: false, error: error! };

  const supabase = createClient(cookies());
  const { error: errorDb } = await supabase.from("workflows_transiciones").delete().eq("id", id);
  if (errorDb) return { ok: false, error: errorDb.message };

  revalidatePath(RUTA);
  return { ok: true };
}
