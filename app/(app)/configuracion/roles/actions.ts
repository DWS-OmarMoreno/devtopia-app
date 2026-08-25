"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { getUsuarioActual, usuarioTienePermiso } from "@/lib/auth/getUsuarioActual";
import type { Accion, Modulo } from "@/lib/rbac";
import type { TablesInsert, TablesUpdate } from "@/utils/database.types";

export type ResultadoAccion = { ok: true } | { ok: false; error: string };

const RUTA = "/configuracion/roles";
const SUBLISTA = "roles";

async function requerirPermiso(accion: Accion) {
  const usuario = await getUsuarioActual();
  if (!usuarioTienePermiso(usuario, "CONFIGURACION", accion, SUBLISTA)) {
    return { usuario: null, error: "No tienes permiso para realizar esta acción." } as const;
  }
  return { usuario, error: null } as const;
}

// =============================================================================
// Roles
// =============================================================================

export async function crearRol(formData: FormData): Promise<ResultadoAccion> {
  const { usuario, error } = await requerirPermiso("crear");
  if (!usuario) return { ok: false, error: error! };

  const nombre = String(formData.get("nombre") ?? "").trim();
  if (!nombre) return { ok: false, error: "El nombre del rol es obligatorio." };

  const fila: TablesInsert<"roles"> = {
    empresa_id: usuario.perfil.empresa_id,
    nombre,
    descripcion: String(formData.get("descripcion") ?? "").trim() || null,
    es_rol_sistema: false,
  };

  const supabase = createClient(cookies());
  const { error: errorDb } = await supabase.from("roles").insert(fila);
  if (errorDb) return { ok: false, error: errorDb.message };

  revalidatePath(RUTA);
  return { ok: true };
}

/**
 * Los roles de sistema (`es_rol_sistema = true`, sembrados por defecto —
 * Administrador, Pendiente de Asignación, etc.) no se pueden renombrar ni
 * borrar desde la UI para no romper supuestos del resto del ERP; sí se puede
 * ajustar su matriz de permisos y activarlos/desactivarlos.
 */
export async function actualizarRol(id: string, formData: FormData): Promise<ResultadoAccion> {
  const { usuario, error } = await requerirPermiso("editar");
  if (!usuario) return { ok: false, error: error! };

  const { data: rolActual } = await createClient(cookies())
    .from("roles")
    .select("es_rol_sistema")
    .eq("id", id)
    .single();

  if (rolActual?.es_rol_sistema) {
    return { ok: false, error: "Los roles de sistema no se pueden renombrar." };
  }

  const nombre = String(formData.get("nombre") ?? "").trim();
  if (!nombre) return { ok: false, error: "El nombre del rol es obligatorio." };

  const cambios: TablesUpdate<"roles"> = {
    nombre,
    descripcion: String(formData.get("descripcion") ?? "").trim() || null,
  };

  const supabase = createClient(cookies());
  const { error: errorDb } = await supabase.from("roles").update(cambios).eq("id", id);
  if (errorDb) return { ok: false, error: errorDb.message };

  revalidatePath(RUTA);
  return { ok: true };
}

export async function cambiarEstadoRol(id: string, activo: boolean): Promise<ResultadoAccion> {
  const { usuario, error } = await requerirPermiso("editar");
  if (!usuario) return { ok: false, error: error! };

  const supabase = createClient(cookies());
  const { error: errorDb } = await supabase.from("roles").update({ activo }).eq("id", id);
  if (errorDb) return { ok: false, error: errorDb.message };

  revalidatePath(RUTA);
  return { ok: true };
}

export async function eliminarRol(id: string): Promise<ResultadoAccion> {
  const { usuario, error } = await requerirPermiso("eliminar");
  if (!usuario) return { ok: false, error: error! };

  const supabase = createClient(cookies());
  const { data: rolActual } = await supabase.from("roles").select("es_rol_sistema").eq("id", id).single();
  if (rolActual?.es_rol_sistema) {
    return { ok: false, error: "Los roles de sistema no se pueden eliminar." };
  }

  const { error: errorDb } = await supabase.from("roles").delete().eq("id", id);
  if (errorDb) {
    return {
      ok: false,
      error:
        "No se pudo eliminar el rol (probablemente todavía tiene usuarios asignados). Reasigna esos usuarios a otro rol primero.",
    };
  }

  revalidatePath(RUTA);
  return { ok: true };
}

// =============================================================================
// Matriz de permisos
// =============================================================================

export type FilaPermiso = {
  puede_leer: boolean;
  puede_crear: boolean;
  puede_editar: boolean;
  puede_eliminar: boolean;
  puede_aprobar: boolean;
  alcance: string;
};

/**
 * Upsert manual (select + insert/update) de una fila (rol_id, modulo,
 * sublista) de la matriz de permisos. `sublista` en `null` representa la
 * fila general del módulo (fallback de fn_tiene_permiso() cuando no existe
 * una fila específica — ver rbac.ts).
 *
 * IMPORTANTE: no se usa `.upsert(..., { onConflict: "rol_id,modulo,sublista" })`
 * a propósito. Se verificó empíricamente en Postgres 16 (devtopia_test) que
 * un UNIQUE (rol_id, modulo, sublista) NO deduplica cuando sublista es NULL
 * (NULL nunca es igual a NULL para un constraint UNIQUE estándar) — dos
 * upserts seguidos de la fila general de un módulo crean dos filas en vez de
 * actualizar una, y fn_tiene_permiso() quedaría leyendo una fila ambigua/
 * desactualizada según el orden de retorno. Por eso esta función busca la
 * fila existente explícitamente (con `.is("sublista", null)` cuando aplica)
 * y decide insert vs update en código.
 */
export async function guardarPermisoFila(
  rolId: string,
  modulo: Modulo,
  sublista: string | null,
  datos: FilaPermiso
): Promise<ResultadoAccion> {
  const { usuario, error } = await requerirPermiso("editar");
  if (!usuario) return { ok: false, error: error! };

  const supabase = createClient(cookies());

  let busqueda = supabase.from("permisos").select("id").eq("rol_id", rolId).eq("modulo", modulo);
  busqueda = sublista === null ? busqueda.is("sublista", null) : busqueda.eq("sublista", sublista);
  const { data: existente, error: errorBusqueda } = await busqueda.maybeSingle();

  if (errorBusqueda) return { ok: false, error: errorBusqueda.message };

  if (existente) {
    const { error: errorDb } = await supabase.from("permisos").update(datos).eq("id", existente.id);
    if (errorDb) return { ok: false, error: errorDb.message };
  } else {
    const { error: errorDb } = await supabase
      .from("permisos")
      .insert({ rol_id: rolId, modulo, sublista, ...datos });
    if (errorDb) return { ok: false, error: errorDb.message };
  }

  revalidatePath(RUTA);
  return { ok: true };
}
