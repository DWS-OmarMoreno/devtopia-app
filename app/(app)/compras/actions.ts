"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { getUsuarioActual, usuarioTienePermiso } from "@/lib/auth/getUsuarioActual";
import type { Accion } from "@/lib/rbac";
import type { TablesInsert, TablesUpdate } from "@/utils/database.types";
import { dispararAlerta } from "@/lib/alertas/despacho";

export type ResultadoAccion = { ok: true } | { ok: false; error: string };
export type ResultadoConId = { ok: true; id: string } | { ok: false; error: string };

const RUTA = "/compras";

// El módulo define dos sublistas en la matriz de permisos (ver
// catalogo-permisos.ts): "proveedores" (compartida con evaluaciones_proveedor,
// igual que hitos_entregables comparte sublista con hitos_criterios_aceptacion
// en Contratos y Proyectos) y "ordenes_costo".
async function requerirPermiso(accion: Accion, sublista: string) {
  const usuario = await getUsuarioActual();
  if (!usuarioTienePermiso(usuario, "COMPRAS", accion, sublista)) {
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

function redondear2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

// =============================================================================
// Proveedores
// =============================================================================

export const ESTADOS_PROVEEDOR = ["ACTIVO", "INACTIVO", "EN_EVALUACION", "BLOQUEADO"];

function camposProveedorDesdeFormData(formData: FormData) {
  return {
    tipo_proveedor: String(formData.get("tipo_proveedor") ?? "").trim(),
    razon_social_o_nombre: String(formData.get("razon_social_o_nombre") ?? "").trim(),
    tipo_identificacion: textoOpcional(formData.get("tipo_identificacion")),
    numero_identificacion: textoOpcional(formData.get("numero_identificacion")),
    email: textoOpcional(formData.get("email")),
    telefono: textoOpcional(formData.get("telefono")),
    direccion: textoOpcional(formData.get("direccion")),
    pais: textoOpcional(formData.get("pais")),
    categoria_id: textoOpcional(formData.get("categoria_id")),
    especialidad: textoOpcional(formData.get("especialidad")),
    tarifa_referencia_hora: numeroOpcional(formData.get("tarifa_referencia_hora")),
    moneda_id: textoOpcional(formData.get("moneda_id")),
    forma_pago_preferida: textoOpcional(formData.get("forma_pago_preferida")),
    plazo_pago_dias: numeroOpcional(formData.get("plazo_pago_dias")),
    // Alias/referencia únicamente — nunca el número de cuenta real (ver
    // 00-overview.md §12). No validamos formato a propósito, para no dar la
    // impresión de que aquí se guarda el dato bancario completo.
    cuenta_bancaria_ref: textoOpcional(formData.get("cuenta_bancaria_ref")),
    documentos_legales_url: textoOpcional(formData.get("documentos_legales_url")),
    fecha_vinculacion: textoOpcional(formData.get("fecha_vinculacion")),
  };
}

function validarCamposProveedor(campos: ReturnType<typeof camposProveedorDesdeFormData>): string | null {
  if (!campos.tipo_proveedor) return "Debes elegir un tipo de proveedor.";
  if (!campos.razon_social_o_nombre) return "El nombre o razón social es obligatorio.";
  return null;
}

export async function crearProveedor(formData: FormData): Promise<ResultadoConId> {
  const { usuario, error } = await requerirPermiso("crear", "proveedores");
  if (!usuario) return { ok: false, error: error! };

  const campos = camposProveedorDesdeFormData(formData);
  const errorValidacion = validarCamposProveedor(campos);
  if (errorValidacion) return { ok: false, error: errorValidacion };

  const supabase = createClient(cookies());

  const { data: numero, error: errorConsecutivo } = await supabase.rpc("fn_generar_consecutivo", {
    p_codigo_secuencia: "PROVEEDOR",
    p_empresa_id: usuario.perfil.empresa_id,
  });
  if (errorConsecutivo || !numero) {
    return {
      ok: false,
      error: `No se pudo generar el número del proveedor: ${errorConsecutivo?.message ?? "error desconocido"}.`,
    };
  }

  const fila: TablesInsert<"proveedores"> = {
    ...campos,
    empresa_id: usuario.perfil.empresa_id,
    numero_proveedor: numero,
    estado: "ACTIVO",
  };

  const { data: creado, error: errorDb } = await supabase.from("proveedores").insert(fila).select("id").single();
  if (errorDb || !creado) return { ok: false, error: errorDb?.message ?? "No se pudo crear el proveedor." };

  revalidatePath(RUTA);
  return { ok: true, id: creado.id };
}

export async function actualizarProveedor(id: string, formData: FormData): Promise<ResultadoAccion> {
  const { usuario, error } = await requerirPermiso("editar", "proveedores");
  if (!usuario) return { ok: false, error: error! };

  const campos = camposProveedorDesdeFormData(formData);
  const errorValidacion = validarCamposProveedor(campos);
  if (errorValidacion) return { ok: false, error: errorValidacion };

  const cambios: TablesUpdate<"proveedores"> = { ...campos };

  const supabase = createClient(cookies());
  const { error: errorDb } = await supabase.from("proveedores").update(cambios).eq("id", id);
  if (errorDb) return { ok: false, error: errorDb.message };

  revalidatePath(RUTA);
  return { ok: true };
}

export async function cambiarEstadoProveedor(id: string, estado: string): Promise<ResultadoAccion> {
  const { usuario, error } = await requerirPermiso("editar", "proveedores");
  if (!usuario) return { ok: false, error: error! };

  if (!ESTADOS_PROVEEDOR.includes(estado)) return { ok: false, error: "Estado de proveedor inválido." };

  const supabase = createClient(cookies());
  const { error: errorDb } = await supabase.from("proveedores").update({ estado }).eq("id", id);
  if (errorDb) return { ok: false, error: errorDb.message };

  revalidatePath(RUTA);
  return { ok: true };
}

// =============================================================================
// Evaluaciones de proveedor
// =============================================================================

// calificacion se calcula siempre en el servidor como el promedio de los 3
// criterios (calidad/tiempo/comunicación) del formulario — nunca se confía en
// un valor de "calificación general" separado que el cliente pudiera mandar
// desalineado de los criterios. calificacion_desempeno_promedio en
// `proveedores` no se toca aquí: la recalcula automáticamente el trigger
// `fn_recalcular_calificacion_proveedor()` ya existente en la base (ver
// migración 007), no hace falta actualizarla desde la aplicación.
export async function crearEvaluacionProveedor(proveedorId: string, formData: FormData): Promise<ResultadoAccion> {
  const { usuario, error } = await requerirPermiso("crear", "proveedores");
  if (!usuario) return { ok: false, error: error! };

  const proyectoId = textoOpcional(formData.get("proyecto_id"));
  const fechaEvaluacion = String(formData.get("fecha_evaluacion") ?? "").trim();
  const calidad = numeroOpcional(formData.get("calidad"));
  const tiempo = numeroOpcional(formData.get("tiempo"));
  const comunicacion = numeroOpcional(formData.get("comunicacion"));
  const comentarios = textoOpcional(formData.get("comentarios"));

  if (!fechaEvaluacion) return { ok: false, error: "La fecha de evaluación es obligatoria." };
  if (calidad == null || tiempo == null || comunicacion == null) {
    return { ok: false, error: "Debes calificar calidad, tiempo y comunicación." };
  }
  for (const [etiqueta, valor] of [
    ["calidad", calidad],
    ["tiempo", tiempo],
    ["comunicación", comunicacion],
  ] as const) {
    if (valor < 1 || valor > 5) return { ok: false, error: `La calificación de ${etiqueta} debe estar entre 1 y 5.` };
  }

  const calificacion = redondear2((calidad + tiempo + comunicacion) / 3);

  const fila: TablesInsert<"evaluaciones_proveedor"> = {
    proveedor_id: proveedorId,
    proyecto_id: proyectoId,
    fecha_evaluacion: fechaEvaluacion,
    calificacion,
    criterios: { calidad, tiempo, comunicacion },
    comentarios,
    evaluado_por_usuario_id: usuario.id,
  };

  const supabase = createClient(cookies());
  const { error: errorDb } = await supabase.from("evaluaciones_proveedor").insert(fila);
  if (errorDb) return { ok: false, error: errorDb.message };

  revalidatePath(RUTA);
  return { ok: true };
}

// =============================================================================
// Órdenes de costo / subcontratación
// =============================================================================

const ESTADOS_ORDEN_COSTO_NO_EDITABLES = ["PAGADA", "CANCELADA"];

function camposOrdenCostoDesdeFormData(formData: FormData) {
  return {
    proveedor_id: String(formData.get("proveedor_id") ?? "").trim(),
    proyecto_id: String(formData.get("proyecto_id") ?? "").trim(),
    contrato_id: textoOpcional(formData.get("contrato_id")),
    concepto: String(formData.get("concepto") ?? "").trim(),
    tipo_costo: String(formData.get("tipo_costo") ?? "").trim(),
    fecha_orden: String(formData.get("fecha_orden") || new Date().toISOString().slice(0, 10)),
    fecha_inicio_servicio: textoOpcional(formData.get("fecha_inicio_servicio")),
    fecha_fin_servicio: textoOpcional(formData.get("fecha_fin_servicio")),
    cantidad: numeroOpcional(formData.get("cantidad")) ?? 1,
    unidad_medida: String(formData.get("unidad_medida") ?? "").trim(),
    valor_unitario: numeroOpcional(formData.get("valor_unitario")) ?? 0,
    moneda_id: String(formData.get("moneda_id") ?? "").trim(),
    factura_proveedor_numero: textoOpcional(formData.get("factura_proveedor_numero")),
    factura_proveedor_fecha: textoOpcional(formData.get("factura_proveedor_fecha")),
    factura_proveedor_url: textoOpcional(formData.get("factura_proveedor_url")),
    notas: textoOpcional(formData.get("notas")),
  };
}

function validarCamposOrdenCosto(campos: ReturnType<typeof camposOrdenCostoDesdeFormData>): string | null {
  if (!campos.proveedor_id) return "Debes elegir un proveedor.";
  if (!campos.proyecto_id) return "Debes elegir un proyecto.";
  if (!campos.concepto) return "El concepto es obligatorio.";
  if (!campos.tipo_costo) return "Debes elegir un tipo de costo.";
  if (!campos.fecha_orden) return "La fecha de la orden es obligatoria.";
  if (campos.cantidad <= 0) return "La cantidad debe ser mayor a 0.";
  if (!campos.unidad_medida) return "La unidad de medida es obligatoria.";
  if (campos.valor_unitario <= 0) return "El valor unitario debe ser mayor a 0.";
  if (!campos.moneda_id) return "Debes elegir una moneda.";
  return null;
}

async function obtenerOrdenCostoConEstado(
  supabase: ReturnType<typeof createClient>,
  id: string
): Promise<{ estado_id: string; codigo_estado: string } | null> {
  const { data } = await supabase
    .from("ordenes_costo_subcontratacion")
    .select("estado_id, estados_ciclo_vida(codigo_estado)")
    .eq("id", id)
    .maybeSingle();
  if (!data) return null;
  const estado = data.estados_ciclo_vida as unknown as { codigo_estado: string } | null;
  return { estado_id: data.estado_id, codigo_estado: estado?.codigo_estado ?? "" };
}

export async function crearOrdenCosto(formData: FormData): Promise<ResultadoConId> {
  const { usuario, error } = await requerirPermiso("crear", "ordenes_costo");
  if (!usuario) return { ok: false, error: error! };

  const campos = camposOrdenCostoDesdeFormData(formData);
  const errorValidacion = validarCamposOrdenCosto(campos);
  if (errorValidacion) return { ok: false, error: errorValidacion };

  const supabase = createClient(cookies());

  const { data: estadoInicial, error: errorEstado } = await supabase
    .from("estados_ciclo_vida")
    .select("id")
    .eq("empresa_id", usuario.perfil.empresa_id)
    .eq("entidad_aplicable", "ORDEN_COSTO")
    .eq("es_estado_inicial", true)
    .maybeSingle();
  if (errorEstado || !estadoInicial) {
    return { ok: false, error: "No se encontró el estado inicial del flujo de órdenes de costo para tu empresa." };
  }

  const { data: numero, error: errorConsecutivo } = await supabase.rpc("fn_generar_consecutivo", {
    p_codigo_secuencia: "ORDEN_COSTO",
    p_empresa_id: usuario.perfil.empresa_id,
  });
  if (errorConsecutivo || !numero) {
    return {
      ok: false,
      error: `No se pudo generar el número de la orden de costo: ${errorConsecutivo?.message ?? "error desconocido"}.`,
    };
  }

  // valor_total siempre se recalcula en el servidor — nunca se confía en lo
  // que mande el formulario, mismo patrón que subtotal/total de Cotizaciones.
  const { cantidad, valor_unitario, ...resto } = campos;
  const fila: TablesInsert<"ordenes_costo_subcontratacion"> = {
    ...resto,
    cantidad,
    valor_unitario,
    valor_total: redondear2(cantidad * valor_unitario),
    numero_orden: numero,
    estado_id: estadoInicial.id,
  };

  const { data: creado, error: errorDb } = await supabase
    .from("ordenes_costo_subcontratacion")
    .insert(fila)
    .select("id")
    .single();
  if (errorDb || !creado) return { ok: false, error: errorDb?.message ?? "No se pudo crear la orden de costo." };

  revalidatePath(RUTA);
  return { ok: true, id: creado.id };
}

export async function actualizarOrdenCosto(id: string, formData: FormData): Promise<ResultadoAccion> {
  const { usuario, error } = await requerirPermiso("editar", "ordenes_costo");
  if (!usuario) return { ok: false, error: error! };

  const supabase = createClient(cookies());

  const ordenActual = await obtenerOrdenCostoConEstado(supabase, id);
  if (!ordenActual) return { ok: false, error: "La orden de costo no existe." };
  if (ESTADOS_ORDEN_COSTO_NO_EDITABLES.includes(ordenActual.codigo_estado)) {
    return { ok: false, error: "No se puede editar una orden de costo Pagada o Cancelada." };
  }

  const campos = camposOrdenCostoDesdeFormData(formData);
  const errorValidacion = validarCamposOrdenCosto(campos);
  if (errorValidacion) return { ok: false, error: errorValidacion };

  const { cantidad, valor_unitario, ...resto } = campos;
  const cambios: TablesUpdate<"ordenes_costo_subcontratacion"> = {
    ...resto,
    cantidad,
    valor_unitario,
    valor_total: redondear2(cantidad * valor_unitario),
  };

  const { error: errorDb } = await supabase.from("ordenes_costo_subcontratacion").update(cambios).eq("id", id);
  if (errorDb) return { ok: false, error: errorDb.message };

  revalidatePath(RUTA);
  return { ok: true };
}

export async function cambiarEstadoOrdenCosto(
  id: string,
  estadoDestinoId: string,
  comentario: string | null
): Promise<ResultadoAccion> {
  const { usuario, error } = await requerirPermiso("editar", "ordenes_costo");
  if (!usuario) return { ok: false, error: error! };

  const supabase = createClient(cookies());

  const orden = await obtenerOrdenCostoConEstado(supabase, id);
  if (!orden) return { ok: false, error: "La orden de costo no existe." };

  const { data: transicion } = await supabase
    .from("workflows_transiciones")
    .select(
      "id, requiere_comentario, estados_destino:estados_ciclo_vida!workflows_transiciones_estado_destino_id_fkey(codigo_estado)"
    )
    .eq("entidad_aplicable", "ORDEN_COSTO")
    .eq("estado_origen_id", orden.estado_id)
    .eq("estado_destino_id", estadoDestinoId)
    .maybeSingle();

  if (!transicion) {
    return { ok: false, error: "Esta transición no está permitida desde el estado actual de la orden de costo." };
  }

  const destino = transicion.estados_destino as unknown as { codigo_estado: string } | null;
  const codigoDestino = destino?.codigo_estado ?? "";

  const comentarioLimpio = comentario?.trim() || null;
  if (transicion.requiere_comentario && !comentarioLimpio) {
    return { ok: false, error: "Este cambio de estado requiere que expliques el motivo en un comentario." };
  }

  const cambios: TablesUpdate<"ordenes_costo_subcontratacion"> = { estado_id: estadoDestinoId };
  if (codigoDestino === "APROBADA") {
    cambios.aprobador_interno_id = usuario.id;
    cambios.fecha_aprobacion = new Date().toISOString();
  }

  const { error: errorDb } = await supabase.from("ordenes_costo_subcontratacion").update(cambios).eq("id", id);
  if (errorDb) return { ok: false, error: errorDb.message };

  await supabase.from("workflows_historial").insert({
    entidad_tipo: "ORDEN_COSTO",
    entidad_id: id,
    estado_anterior: orden.codigo_estado || null,
    estado_nuevo: codigoDestino,
    usuario_id: usuario.id,
    comentario: comentarioLimpio,
  });

  // Alerta: no bloquea la respuesta si falla — ver contrato de dispararAlerta().
  if (codigoDestino === "APROBADA") {
    const { data: detalle } = await supabase
      .from("ordenes_costo_subcontratacion")
      .select("numero_orden, valor_total, proyecto_id, proveedores(razon_social_o_nombre)")
      .eq("id", id)
      .maybeSingle();
    if (detalle) {
      await dispararAlerta({
        empresaId: usuario.perfil.empresa_id,
        eventoDisparador: "ORDEN_COSTO_APROBADA",
        entidadTipo: "ORDEN_COSTO",
        entidadId: id,
        proyectoId: detalle.proyecto_id,
        variables: {
          numero_orden: detalle.numero_orden,
          proveedor: (detalle as any).proveedores?.razon_social_o_nombre ?? "",
          valor_total: String(detalle.valor_total ?? ""),
        },
      });
    }
  }

  revalidatePath(RUTA);
  return { ok: true };
}
