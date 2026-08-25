"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { getUsuarioActual, usuarioTienePermiso } from "@/lib/auth/getUsuarioActual";
import type { Accion } from "@/lib/rbac";
import type { TablesInsert, TablesUpdate } from "@/utils/database.types";

export type ResultadoAccion = { ok: true } | { ok: false; error: string };

const RUTA = "/configuracion/consecutivos";
const SUBLISTA = "secuencias_numeracion";

async function requerirPermiso(accion: Accion) {
  const usuario = await getUsuarioActual();
  if (!usuarioTienePermiso(usuario, "CONFIGURACION", accion, SUBLISTA)) {
    return { usuario: null, error: "No tienes permiso para realizar esta acción." } as const;
  }
  return { usuario, error: null } as const;
}

function numeroOpcional(valor: FormDataEntryValue | null): number | null {
  if (valor === null) return null;
  const texto = String(valor).trim();
  if (!texto) return null;
  const n = Number(texto);
  return Number.isFinite(n) ? n : null;
}

function textoOpcional(valor: FormDataEntryValue | null): string | null {
  if (valor === null) return null;
  const texto = String(valor).trim();
  return texto ? texto : null;
}

function camposDesdeFormData(formData: FormData) {
  return {
    codigo_secuencia: String(formData.get("codigo_secuencia") ?? "").trim(),
    tipo_documento: String(formData.get("tipo_documento") ?? "").trim(),
    prefijo: textoOpcional(formData.get("prefijo")),
    sufijo: textoOpcional(formData.get("sufijo")),
    longitud_ceros: numeroOpcional(formData.get("longitud_ceros")) ?? 4,
    incluir_anio: formData.get("incluir_anio") === "true",
    formato_anio: textoOpcional(formData.get("formato_anio")),
    incluir_mes: formData.get("incluir_mes") === "true",
    formato_mes: textoOpcional(formData.get("formato_mes")),
    separador: textoOpcional(formData.get("separador")) ?? "-",
    numero_inicial: numeroOpcional(formData.get("numero_inicial")) ?? 1,
    numero_actual: numeroOpcional(formData.get("numero_actual")) ?? 0,
    reinicio: String(formData.get("reinicio") ?? "NUNCA").trim(),
  };
}

export async function crearSecuencia(formData: FormData): Promise<ResultadoAccion> {
  const { usuario, error } = await requerirPermiso("crear");
  if (!usuario) return { ok: false, error: error! };

  const campos = camposDesdeFormData(formData);
  if (!campos.codigo_secuencia) return { ok: false, error: "El código de secuencia es obligatorio." };
  if (!campos.tipo_documento) return { ok: false, error: "El tipo de documento es obligatorio." };

  const fila: TablesInsert<"secuencias_numeracion"> = {
    empresa_id: usuario.perfil.empresa_id,
    ...campos,
  };

  const supabase = createClient(cookies());
  const { error: errorDb } = await supabase.from("secuencias_numeracion").insert(fila);
  if (errorDb) return { ok: false, error: errorDb.message };

  revalidatePath(RUTA);
  return { ok: true };
}

export async function actualizarSecuencia(id: string, formData: FormData): Promise<ResultadoAccion> {
  const { usuario, error } = await requerirPermiso("editar");
  if (!usuario) return { ok: false, error: error! };

  const campos = camposDesdeFormData(formData);
  if (!campos.codigo_secuencia) return { ok: false, error: "El código de secuencia es obligatorio." };
  if (!campos.tipo_documento) return { ok: false, error: "El tipo de documento es obligatorio." };

  const cambios: TablesUpdate<"secuencias_numeracion"> = { ...campos };

  const supabase = createClient(cookies());
  const { error: errorDb } = await supabase.from("secuencias_numeracion").update(cambios).eq("id", id);
  if (errorDb) return { ok: false, error: errorDb.message };

  revalidatePath(RUTA);
  return { ok: true };
}

export async function cambiarEstadoSecuencia(id: string, activo: boolean): Promise<ResultadoAccion> {
  const { usuario, error } = await requerirPermiso("editar");
  if (!usuario) return { ok: false, error: error! };

  const supabase = createClient(cookies());
  const { error: errorDb } = await supabase
    .from("secuencias_numeracion")
    .update({ activo })
    .eq("id", id);
  if (errorDb) return { ok: false, error: errorDb.message };

  revalidatePath(RUTA);
  return { ok: true };
}
