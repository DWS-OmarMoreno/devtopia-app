"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { getUsuarioActual, usuarioTienePermiso } from "@/lib/auth/getUsuarioActual";
import type { Accion } from "@/lib/rbac";
import type { TablesInsert, TablesUpdate } from "@/utils/database.types";

export type ResultadoAccion = { ok: true } | { ok: false; error: string };
export type ResultadoConId = { ok: true; id: string } | { ok: false; error: string };

const RUTA = "/cierre-postventa";

// El módulo define tres sublistas en la matriz de permisos (ver
// catalogo-permisos.ts): "checklist" (compartida por plantillas, ítems de
// plantilla, instancias por proyecto y sus ítems — mismo patrón de sublista
// compartida que proveedores/evaluaciones_proveedor en Compras),
// "actas_cierre" y "garantias" (compartida con garantia_extensiones).
async function requerirPermiso(accion: Accion, sublista: string) {
  const usuario = await getUsuarioActual();
  if (!usuarioTienePermiso(usuario, "CIERRE_POSTVENTA", accion, sublista)) {
    return { usuario: null, error: "No tienes permiso para realizar esta acción." } as const;
  }
  return { usuario, error: null } as const;
}

function textoOpcional(valor: FormDataEntryValue | null): string | null {
  if (valor === null) return null;
  const texto = String(valor).trim();
  return texto ? texto : null;
}

function numeroOpcional(valor: FormDataEntryValue | null): number | null {
  if (valor === null) return null;
  const texto = String(valor).trim();
  if (!texto) return null;
  const n = Number(texto);
  return Number.isFinite(n) ? n : null;
}

/** Suma meses de calendario a una fecha (YYYY-MM-DD) sin depender de zona horaria. */
function sumarMeses(fechaIso: string, meses: number): string {
  const [anio, mes, dia] = fechaIso.split("-").map(Number);
  const fecha = new Date(Date.UTC(anio, mes - 1, dia));
  fecha.setUTCMonth(fecha.getUTCMonth() + meses);
  return fecha.toISOString().slice(0, 10);
}

// =============================================================================
// Plantillas de checklist de liquidación — catálogo compartido de la empresa,
// reutilizable entre proyectos (ver docs/data-model/06-cierre-postventa.md).
// =============================================================================

export const TIPOS_VERIFICACION_ITEM = [
  "ENTREGABLE_ACEPTADO",
  "FIRMA_CLIENTE",
  "RECURSOS_LIBERADOS",
  "FACTURACION_COMPLETA",
  "ACTIVOS_DEVUELTOS",
  "DOCUMENTACION_ENTREGADA",
  "OTRO",
];

export async function crearPlantillaChecklist(formData: FormData): Promise<ResultadoConId> {
  const { usuario, error } = await requerirPermiso("crear", "checklist");
  if (!usuario) return { ok: false, error: error! };

  const nombre = String(formData.get("nombre") ?? "").trim();
  if (!nombre) return { ok: false, error: "El nombre de la plantilla es obligatorio." };

  const supabase = createClient(cookies());
  const fila: TablesInsert<"checklist_liquidacion_plantillas"> = {
    empresa_id: usuario.perfil.empresa_id,
    nombre,
    descripcion: textoOpcional(formData.get("descripcion")),
    activo: true,
  };

  const { data: creado, error: errorDb } = await supabase
    .from("checklist_liquidacion_plantillas")
    .insert(fila)
    .select("id")
    .single();
  if (errorDb || !creado) return { ok: false, error: errorDb?.message ?? "No se pudo crear la plantilla." };

  revalidatePath(RUTA);
  return { ok: true, id: creado.id };
}

export async function actualizarPlantillaChecklist(id: string, formData: FormData): Promise<ResultadoAccion> {
  const { usuario, error } = await requerirPermiso("editar", "checklist");
  if (!usuario) return { ok: false, error: error! };

  const nombre = String(formData.get("nombre") ?? "").trim();
  if (!nombre) return { ok: false, error: "El nombre de la plantilla es obligatorio." };

  const cambios: TablesUpdate<"checklist_liquidacion_plantillas"> = {
    nombre,
    descripcion: textoOpcional(formData.get("descripcion")),
  };

  const supabase = createClient(cookies());
  const { error: errorDb } = await supabase.from("checklist_liquidacion_plantillas").update(cambios).eq("id", id);
  if (errorDb) return { ok: false, error: errorDb.message };

  revalidatePath(RUTA);
  return { ok: true };
}

export async function cambiarEstadoPlantillaChecklist(id: string, activo: boolean): Promise<ResultadoAccion> {
  const { usuario, error } = await requerirPermiso("editar", "checklist");
  if (!usuario) return { ok: false, error: error! };

  const supabase = createClient(cookies());
  const { error: errorDb } = await supabase.from("checklist_liquidacion_plantillas").update({ activo }).eq("id", id);
  if (errorDb) return { ok: false, error: errorDb.message };

  revalidatePath(RUTA);
  return { ok: true };
}

export async function crearItemPlantilla(plantillaId: string, formData: FormData): Promise<ResultadoConId> {
  const { usuario, error } = await requerirPermiso("crear", "checklist");
  if (!usuario) return { ok: false, error: error! };

  const descripcion_item = String(formData.get("descripcion_item") ?? "").trim();
  const tipo_verificacion = String(formData.get("tipo_verificacion") ?? "").trim();
  if (!descripcion_item) return { ok: false, error: "La descripción del ítem es obligatoria." };
  if (!TIPOS_VERIFICACION_ITEM.includes(tipo_verificacion)) {
    return { ok: false, error: "Debes elegir un tipo de verificación válido." };
  }

  const supabase = createClient(cookies());
  const fila: TablesInsert<"checklist_liquidacion_plantilla_items"> = {
    plantilla_id: plantillaId,
    orden: numeroOpcional(formData.get("orden")) ?? 0,
    descripcion_item,
    tipo_verificacion,
    obligatorio: formData.get("obligatorio") === "true",
  };

  const { data: creado, error: errorDb } = await supabase
    .from("checklist_liquidacion_plantilla_items")
    .insert(fila)
    .select("id")
    .single();
  if (errorDb || !creado) return { ok: false, error: errorDb?.message ?? "No se pudo crear el ítem." };

  revalidatePath(RUTA);
  return { ok: true, id: creado.id };
}

export async function actualizarItemPlantilla(id: string, formData: FormData): Promise<ResultadoAccion> {
  const { usuario, error } = await requerirPermiso("editar", "checklist");
  if (!usuario) return { ok: false, error: error! };

  const descripcion_item = String(formData.get("descripcion_item") ?? "").trim();
  const tipo_verificacion = String(formData.get("tipo_verificacion") ?? "").trim();
  if (!descripcion_item) return { ok: false, error: "La descripción del ítem es obligatoria." };
  if (!TIPOS_VERIFICACION_ITEM.includes(tipo_verificacion)) {
    return { ok: false, error: "Debes elegir un tipo de verificación válido." };
  }

  const cambios: TablesUpdate<"checklist_liquidacion_plantilla_items"> = {
    orden: numeroOpcional(formData.get("orden")) ?? 0,
    descripcion_item,
    tipo_verificacion,
    obligatorio: formData.get("obligatorio") === "true",
  };

  const supabase = createClient(cookies());
  const { error: errorDb } = await supabase.from("checklist_liquidacion_plantilla_items").update(cambios).eq("id", id);
  if (errorDb) return { ok: false, error: errorDb.message };

  revalidatePath(RUTA);
  return { ok: true };
}

export async function eliminarItemPlantilla(id: string): Promise<ResultadoAccion> {
  const { usuario, error } = await requerirPermiso("eliminar", "checklist");
  if (!usuario) return { ok: false, error: error! };

  const supabase = createClient(cookies());
  const { error: errorDb } = await supabase.from("checklist_liquidacion_plantilla_items").delete().eq("id", id);
  if (errorDb) return { ok: false, error: errorDb.message };

  revalidatePath(RUTA);
  return { ok: true };
}

// =============================================================================
// Checklist de liquidación por proyecto — instancia + ítems como snapshot de
// la plantilla en el momento de iniciar (editar la plantilla después no
// altera checklists ya iniciados, igual que cotizaciones_detalle congela
// precios al momento de cotizar).
// =============================================================================

export async function iniciarChecklistProyecto(formData: FormData): Promise<ResultadoConId> {
  const { usuario, error } = await requerirPermiso("crear", "checklist");
  if (!usuario) return { ok: false, error: error! };

  const proyecto_id = String(formData.get("proyecto_id") ?? "").trim();
  const plantilla_id = String(formData.get("plantilla_id") ?? "").trim();
  const responsable_id = String(formData.get("responsable_id") ?? "").trim();
  if (!proyecto_id) return { ok: false, error: "Debes elegir un proyecto." };
  if (!plantilla_id) return { ok: false, error: "Debes elegir una plantilla." };
  if (!responsable_id) return { ok: false, error: "Debes elegir un responsable." };

  const supabase = createClient(cookies());

  const { data: itemsPlantilla, error: errorItems } = await supabase
    .from("checklist_liquidacion_plantilla_items")
    .select("id")
    .eq("plantilla_id", plantilla_id)
    .order("orden", { ascending: true });
  if (errorItems) return { ok: false, error: errorItems.message };
  if (!itemsPlantilla || itemsPlantilla.length === 0) {
    return { ok: false, error: "Esa plantilla no tiene ítems configurados todavía — agrégalos antes de iniciar un checklist." };
  }

  const filaChecklist: TablesInsert<"checklist_liquidacion_proyecto"> = {
    proyecto_id,
    plantilla_id,
    responsable_id,
  };

  const { data: checklist, error: errorChecklist } = await supabase
    .from("checklist_liquidacion_proyecto")
    .insert(filaChecklist)
    .select("id")
    .single();
  if (errorChecklist || !checklist) {
    return {
      ok: false,
      error:
        errorChecklist?.code === "23505"
          ? "Este proyecto ya tiene un checklist de liquidación iniciado."
          : errorChecklist?.message ?? "No se pudo iniciar el checklist.",
    };
  }

  const filasItems: TablesInsert<"checklist_liquidacion_items">[] = itemsPlantilla.map((item) => ({
    checklist_proyecto_id: checklist.id,
    plantilla_item_id: item.id,
  }));

  const { error: errorInsertItems } = await supabase.from("checklist_liquidacion_items").insert(filasItems);
  if (errorInsertItems) {
    // El checklist quedó creado sin ítems — se limpia para no dejar un
    // checklist "vacío" e inconsistente que además bloquea el proyecto por
    // el unique constraint de proyecto_id.
    await supabase.from("checklist_liquidacion_proyecto").delete().eq("id", checklist.id);
    return { ok: false, error: errorInsertItems.message };
  }

  revalidatePath(RUTA);
  return { ok: true, id: checklist.id };
}

export async function marcarItemChecklist(itemId: string, cumplido: boolean, formData: FormData): Promise<ResultadoAccion> {
  const { usuario, error } = await requerirPermiso("editar", "checklist");
  if (!usuario) return { ok: false, error: error! };

  const cambios: TablesUpdate<"checklist_liquidacion_items"> = {
    cumplido,
    fecha_cumplimiento: cumplido ? new Date().toISOString() : null,
    verificado_por_usuario_id: cumplido ? usuario.perfil.id : null,
    evidencia_url: textoOpcional(formData.get("evidencia_url")),
    comentario: textoOpcional(formData.get("comentario")),
  };

  const supabase = createClient(cookies());
  const { error: errorDb } = await supabase.from("checklist_liquidacion_items").update(cambios).eq("id", itemId);
  if (errorDb) return { ok: false, error: errorDb.message };

  // fn_recalcular_porcentaje_checklist (trigger) sincroniza automáticamente
  // checklist_liquidacion_proyecto.porcentaje_completado y estado — no hace
  // falta actualizarlos a mano aquí.
  revalidatePath(RUTA);
  return { ok: true };
}

// =============================================================================
// Actas de cierre
// =============================================================================

function camposActaDesdeFormData(formData: FormData) {
  return {
    fecha_acta: textoOpcional(formData.get("fecha_acta")) ?? new Date().toISOString().slice(0, 10),
    firmante_cliente_contacto_id: textoOpcional(formData.get("firmante_cliente_contacto_id")),
    firmante_interno_usuario_id: String(formData.get("firmante_interno_usuario_id") ?? "").trim(),
    documento_acta_url: textoOpcional(formData.get("documento_acta_url")),
    observaciones_finales: textoOpcional(formData.get("observaciones_finales")),
  };
}

export async function crearActaCierre(proyectoId: string, formData: FormData): Promise<ResultadoConId> {
  const { usuario, error } = await requerirPermiso("crear", "actas_cierre");
  if (!usuario) return { ok: false, error: error! };

  const campos = camposActaDesdeFormData(formData);
  if (!campos.firmante_interno_usuario_id) return { ok: false, error: "Debes elegir quién firma internamente." };

  const supabase = createClient(cookies());
  const fila: TablesInsert<"actas_cierre"> = { proyecto_id: proyectoId, ...campos };

  const { data: creado, error: errorDb } = await supabase.from("actas_cierre").insert(fila).select("id").single();
  if (errorDb || !creado) {
    return {
      ok: false,
      error: errorDb?.code === "23505" ? "Este proyecto ya tiene un acta de cierre." : errorDb?.message ?? "No se pudo crear el acta.",
    };
  }

  revalidatePath(RUTA);
  return { ok: true, id: creado.id };
}

export async function actualizarActaCierre(id: string, formData: FormData): Promise<ResultadoAccion> {
  const { usuario, error } = await requerirPermiso("editar", "actas_cierre");
  if (!usuario) return { ok: false, error: error! };

  const campos = camposActaDesdeFormData(formData);
  if (!campos.firmante_interno_usuario_id) return { ok: false, error: "Debes elegir quién firma internamente." };

  const cambios: TablesUpdate<"actas_cierre"> = { ...campos };

  const supabase = createClient(cookies());
  const { error: errorDb } = await supabase.from("actas_cierre").update(cambios).eq("id", id);
  if (errorDb) return { ok: false, error: errorDb.message };

  revalidatePath(RUTA);
  return { ok: true };
}

/**
 * Libera los recursos del proyecto: marca el acta y cierra en cascada las
 * asignaciones abiertas (PLANEADA/ACTIVA -> FINALIZADA) — comportamiento
 * pedido explícitamente en docs/data-model/06-cierre-postventa.md §1.
 *
 * Nota de permisos: esta cascada escribe en `asignacion_recursos`
 * (CONTRATOS_PROYECTOS), con el cliente del propio usuario (no service_role)
 * — un usuario sin permiso de "editar" sobre Recursos en Contratos y
 * Proyectos puede marcar el acta igual, pero la cascada no cerrará ninguna
 * asignación (RLS la filtra silenciosamente, sin error) y esta función lo
 * informa explícitamente en el resultado.
 */
export async function liberarRecursosActa(actaId: string): Promise<ResultadoAccion> {
  const { usuario, error } = await requerirPermiso("editar", "actas_cierre");
  if (!usuario) return { ok: false, error: error! };

  const supabase = createClient(cookies());

  const { data: acta, error: errorActa } = await supabase
    .from("actas_cierre")
    .select("id, proyecto_id")
    .eq("id", actaId)
    .single();
  if (errorActa || !acta) return { ok: false, error: errorActa?.message ?? "No se encontró el acta." };

  const { error: errorUpdate } = await supabase
    .from("actas_cierre")
    .update({ recursos_liberados: true, fecha_liberacion_recursos: new Date().toISOString() })
    .eq("id", actaId);
  if (errorUpdate) return { ok: false, error: errorUpdate.message };

  const { error: errorCascada } = await supabase
    .from("asignacion_recursos")
    .update({ estado_asignacion: "FINALIZADA" })
    .eq("proyecto_id", acta.proyecto_id)
    .in("estado_asignacion", ["PLANEADA", "ACTIVA"]);
  if (errorCascada) {
    return {
      ok: false,
      error: `El acta quedó marcada, pero no se pudieron cerrar las asignaciones del proyecto: ${errorCascada.message}`,
    };
  }

  revalidatePath(RUTA);
  revalidatePath("/contratos-proyectos");
  return { ok: true };
}

// =============================================================================
// Garantías contractuales
// =============================================================================

export async function crearGarantia(formData: FormData): Promise<ResultadoConId> {
  const { usuario, error } = await requerirPermiso("crear", "garantias");
  if (!usuario) return { ok: false, error: error! };

  const proyecto_id = textoOpcional(formData.get("proyecto_id"));
  const contrato_id = textoOpcional(formData.get("contrato_id"));
  const fecha_inicio_garantia = textoOpcional(formData.get("fecha_inicio_garantia"));
  const duracion_meses = numeroOpcional(formData.get("duracion_meses"));

  if (!proyecto_id && !contrato_id) return { ok: false, error: "Debes elegir al menos un proyecto o un contrato." };
  if (!fecha_inicio_garantia) return { ok: false, error: "La fecha de inicio de garantía es obligatoria." };
  if (!duracion_meses || duracion_meses <= 0) return { ok: false, error: "La duración en meses debe ser mayor a 0." };

  const supabase = createClient(cookies());
  const fila: TablesInsert<"garantias_contractuales"> = {
    proyecto_id,
    contrato_id,
    fecha_inicio_garantia,
    duracion_meses,
    // El servidor siempre recalcula fecha_fin_garantia — nunca se confía en
    // un valor enviado por el cliente, mismo patrón que valor_total en
    // Órdenes de Costo.
    fecha_fin_garantia: sumarMeses(fecha_inicio_garantia, duracion_meses),
    alcance_garantia: textoOpcional(formData.get("alcance_garantia")),
    condiciones_exclusiones: textoOpcional(formData.get("condiciones_exclusiones")),
    estado: "VIGENTE",
  };

  const { data: creado, error: errorDb } = await supabase.from("garantias_contractuales").insert(fila).select("id").single();
  if (errorDb || !creado) return { ok: false, error: errorDb?.message ?? "No se pudo crear la garantía." };

  revalidatePath(RUTA);
  return { ok: true, id: creado.id };
}

/**
 * Solo edita los campos descriptivos (alcance, exclusiones) — a propósito NO
 * permite cambiar fecha_inicio_garantia/duracion_meses después de creada,
 * para no perder de vista el efecto acumulado de extensiones ya aprobadas
 * (ver agregarExtensionGarantia). Si la fecha base estuvo mal, lo correcto es
 * registrar una extensión (o, en un caso extremo, recrear la garantía).
 */
export async function actualizarGarantia(id: string, formData: FormData): Promise<ResultadoAccion> {
  const { usuario, error } = await requerirPermiso("editar", "garantias");
  if (!usuario) return { ok: false, error: error! };

  const cambios: TablesUpdate<"garantias_contractuales"> = {
    alcance_garantia: textoOpcional(formData.get("alcance_garantia")),
    condiciones_exclusiones: textoOpcional(formData.get("condiciones_exclusiones")),
  };

  const supabase = createClient(cookies());
  const { error: errorDb } = await supabase.from("garantias_contractuales").update(cambios).eq("id", id);
  if (errorDb) return { ok: false, error: errorDb.message };

  revalidatePath(RUTA);
  return { ok: true };
}

export async function agregarExtensionGarantia(garantiaId: string, formData: FormData): Promise<ResultadoConId> {
  const { usuario, error } = await requerirPermiso("editar", "garantias");
  if (!usuario) return { ok: false, error: error! };

  const meses_adicionales = numeroOpcional(formData.get("meses_adicionales"));
  if (!meses_adicionales || meses_adicionales <= 0) {
    return { ok: false, error: "Los meses adicionales deben ser mayores a 0." };
  }

  const supabase = createClient(cookies());

  const { data: garantia, error: errorGarantia } = await supabase
    .from("garantias_contractuales")
    .select("id, fecha_fin_garantia")
    .eq("id", garantiaId)
    .single();
  if (errorGarantia || !garantia) return { ok: false, error: errorGarantia?.message ?? "No se encontró la garantía." };

  const fila: TablesInsert<"garantia_extensiones"> = {
    garantia_id: garantiaId,
    meses_adicionales,
    motivo: textoOpcional(formData.get("motivo")),
    valor_adicional: numeroOpcional(formData.get("valor_adicional")),
    aprobado_por_usuario_id: usuario.perfil.id,
  };

  const { data: creada, error: errorDb } = await supabase.from("garantia_extensiones").insert(fila).select("id").single();
  if (errorDb || !creada) return { ok: false, error: errorDb?.message ?? "No se pudo registrar la extensión." };

  // El servidor recalcula la nueva fecha de fin y marca la garantía como
  // EXTENDIDA — nunca se confía en una fecha_fin enviada por el cliente.
  const { error: errorUpdate } = await supabase
    .from("garantias_contractuales")
    .update({
      fecha_fin_garantia: sumarMeses(garantia.fecha_fin_garantia, meses_adicionales),
      estado: "EXTENDIDA",
    })
    .eq("id", garantiaId);
  if (errorUpdate) {
    return {
      ok: false,
      error: `La extensión quedó registrada, pero no se pudo actualizar la fecha de fin de la garantía: ${errorUpdate.message}`,
    };
  }

  revalidatePath(RUTA);
  return { ok: true, id: creada.id };
}
