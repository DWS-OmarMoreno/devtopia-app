"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { getUsuarioActual, usuarioTienePermiso } from "@/lib/auth/getUsuarioActual";
import type { Accion } from "@/lib/rbac";
import type { TablesInsert, TablesUpdate } from "@/utils/database.types";
import { dispararAlerta } from "@/lib/alertas/despacho";

const EVENTO_POR_ESTADO_COTIZACION: Record<string, string> = {
  ENVIADA: "COTIZACION_ENVIADA",
  ACEPTADA: "COTIZACION_ACEPTADA",
  RECHAZADA: "COTIZACION_RECHAZADA",
};

export type ResultadoAccion = { ok: true } | { ok: false; error: string };
export type ResultadoConId = { ok: true; id: string } | { ok: false; error: string };

const RUTA = "/crm";
const SUBLISTA = "cotizaciones";

// La política RLS de UPDATE de `cotizaciones_aprobaciones` ya exige el permiso 'aprobar'
// (migración 20260825000014_fix_rls_aprobar_cotizaciones.sql, no la genérica de
// fn_crear_politicas_rls, que solo sabe distinguir 'editar'). El chequeo de `requerirPermiso
// ("aprobar")` en `resolverAprobacion` de abajo es defensa en profundidad — RLS ya es la
// autoridad real — pero se deja igual para dar un mensaje de error claro en vez de que la
// UI reciba un error genérico de la base de datos. Ver docs/data-model/bitacora-incidentes.md.

async function requerirPermiso(accion: Accion, sublista: string = SUBLISTA) {
  const usuario = await getUsuarioActual();
  if (!usuarioTienePermiso(usuario, "CRM_VENTAS", accion, sublista)) {
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

const ESTADOS_EDITABLES = ["BORRADOR", "EN_REVISION"];

// =============================================================================
// Encabezado de cotización
// =============================================================================

function camposCotizacionDesdeFormData(formData: FormData) {
  return {
    cuenta_id: String(formData.get("cuenta_id") ?? "").trim(),
    contacto_id: textoOpcional(formData.get("contacto_id")),
    oportunidad_id: textoOpcional(formData.get("oportunidad_id")),
    fecha_validez_hasta: String(formData.get("fecha_validez_hasta") ?? "").trim(),
    moneda_id: String(formData.get("moneda_id") ?? "").trim(),
    descuento_pct: numeroOpcional(formData.get("descuento_pct")),
    impuestos_pct: numeroOpcional(formData.get("impuestos_pct")),
    condiciones_pago: textoOpcional(formData.get("condiciones_pago")),
    condiciones_comerciales: textoOpcional(formData.get("condiciones_comerciales")),
    tiempo_estimado_entrega: textoOpcional(formData.get("tiempo_estimado_entrega")),
    responsable_comercial_id: String(formData.get("responsable_comercial_id") ?? "").trim(),
    archivo_pdf_url: textoOpcional(formData.get("archivo_pdf_url")),
  };
}

async function obtenerCotizacionConEstado(
  supabase: ReturnType<typeof createClient>,
  id: string
): Promise<{ estado_id: string; codigo_estado: string; empresa_id: string } | null> {
  const { data } = await supabase
    .from("cotizaciones")
    .select("estado_id, empresa_id, estados_ciclo_vida(codigo_estado)")
    .eq("id", id)
    .maybeSingle();
  if (!data) return null;
  const estado = data.estados_ciclo_vida as unknown as { codigo_estado: string } | null;
  return { estado_id: data.estado_id, codigo_estado: estado?.codigo_estado ?? "", empresa_id: data.empresa_id };
}

export async function crearCotizacion(formData: FormData): Promise<ResultadoConId> {
  const { usuario, error } = await requerirPermiso("crear");
  if (!usuario) return { ok: false, error: error! };

  const campos = camposCotizacionDesdeFormData(formData);
  if (!campos.cuenta_id) return { ok: false, error: "Debes elegir una cuenta." };
  if (!campos.fecha_validez_hasta) return { ok: false, error: "La fecha de validez es obligatoria." };
  if (!campos.moneda_id) return { ok: false, error: "Debes elegir una moneda." };
  if (!campos.responsable_comercial_id) return { ok: false, error: "Debes elegir un responsable comercial." };

  const supabase = createClient(cookies());

  const { data: estadoInicial, error: errorEstado } = await supabase
    .from("estados_ciclo_vida")
    .select("id")
    .eq("empresa_id", usuario.perfil.empresa_id)
    .eq("entidad_aplicable", "COTIZACION")
    .eq("es_estado_inicial", true)
    .maybeSingle();
  if (errorEstado || !estadoInicial) {
    return {
      ok: false,
      error: "No se encontró el estado inicial del flujo de cotizaciones para tu empresa.",
    };
  }

  const { data: numero, error: errorConsecutivo } = await supabase.rpc("fn_generar_consecutivo", {
    p_codigo_secuencia: "COTIZACION",
    p_empresa_id: usuario.perfil.empresa_id,
  });
  if (errorConsecutivo || !numero) {
    return {
      ok: false,
      error: `No se pudo generar el número de la cotización: ${errorConsecutivo?.message ?? "error desconocido"}.`,
    };
  }

  const fila: TablesInsert<"cotizaciones"> = {
    ...campos,
    empresa_id: usuario.perfil.empresa_id,
    numero_cotizacion: numero,
    estado_id: estadoInicial.id,
    subtotal: 0,
    total: 0,
  };

  const { data: creada, error: errorDb } = await supabase
    .from("cotizaciones")
    .insert(fila)
    .select("id")
    .single();
  if (errorDb || !creada) return { ok: false, error: errorDb?.message ?? "No se pudo crear la cotización." };

  revalidatePath(RUTA);
  return { ok: true, id: creada.id };
}

export async function actualizarCotizacion(id: string, formData: FormData): Promise<ResultadoAccion> {
  const { usuario, error } = await requerirPermiso("editar");
  if (!usuario) return { ok: false, error: error! };

  const supabase = createClient(cookies());

  const actual = await obtenerCotizacionConEstado(supabase, id);
  if (!actual) return { ok: false, error: "La cotización no existe." };
  if (!ESTADOS_EDITABLES.includes(actual.codigo_estado)) {
    return {
      ok: false,
      error: "Solo se puede editar una cotización en estado Borrador o En revisión interna.",
    };
  }

  const campos = camposCotizacionDesdeFormData(formData);
  if (!campos.cuenta_id) return { ok: false, error: "Debes elegir una cuenta." };
  if (!campos.fecha_validez_hasta) return { ok: false, error: "La fecha de validez es obligatoria." };
  if (!campos.moneda_id) return { ok: false, error: "Debes elegir una moneda." };
  if (!campos.responsable_comercial_id) return { ok: false, error: "Debes elegir un responsable comercial." };

  const cambios: TablesUpdate<"cotizaciones"> = { ...campos };

  const { error: errorDb } = await supabase.from("cotizaciones").update(cambios).eq("id", id);
  if (errorDb) return { ok: false, error: errorDb.message };

  await recalcularTotalesCotizacion(supabase, id);

  revalidatePath(RUTA);
  return { ok: true };
}

// =============================================================================
// Líneas de detalle
// =============================================================================

const TIPOS_ITEM_SOPORTADOS = ["SERVICIO", "ROL_TARIFA", "ITEM_LIBRE"];

function camposLineaDesdeFormData(formData: FormData) {
  const cantidad = numeroOpcional(formData.get("cantidad")) ?? 0;
  const precioUnitario = numeroOpcional(formData.get("precio_unitario")) ?? 0;
  const descuentoPct = numeroOpcional(formData.get("descuento_linea_pct"));
  const subtotalLinea = redondear2(cantidad * precioUnitario * (1 - (descuentoPct ?? 0) / 100));

  return {
    tipo_item: String(formData.get("tipo_item") ?? "").trim(),
    servicio_id: textoOpcional(formData.get("servicio_id")),
    rol_tarifa_id: textoOpcional(formData.get("rol_tarifa_id")),
    descripcion: String(formData.get("descripcion") ?? "").trim(),
    cantidad,
    unidad_medida: String(formData.get("unidad_medida") ?? "").trim(),
    precio_unitario: precioUnitario,
    descuento_linea_pct: descuentoPct,
    subtotal_linea: subtotalLinea,
  };
}

async function recalcularTotalesCotizacion(
  supabase: ReturnType<typeof createClient>,
  cotizacionId: string
): Promise<void> {
  const [{ data: cotizacion }, { data: lineas }] = await Promise.all([
    supabase.from("cotizaciones").select("descuento_pct, impuestos_pct").eq("id", cotizacionId).maybeSingle(),
    supabase.from("cotizaciones_detalle").select("subtotal_linea").eq("cotizacion_id", cotizacionId),
  ]);

  const subtotal = redondear2((lineas ?? []).reduce((acumulado, linea) => acumulado + (linea.subtotal_linea ?? 0), 0));
  const descuentoPct = cotizacion?.descuento_pct ?? 0;
  const impuestosPct = cotizacion?.impuestos_pct ?? 0;
  const descuentoValor = redondear2(subtotal * (descuentoPct / 100));
  const baseImponible = subtotal - descuentoValor;
  const impuestosValor = redondear2(baseImponible * (impuestosPct / 100));
  const total = redondear2(baseImponible + impuestosValor);

  await supabase
    .from("cotizaciones")
    .update({ subtotal, descuento_valor: descuentoValor, impuestos_valor: impuestosValor, total })
    .eq("id", cotizacionId);
}

export async function agregarLineaCotizacion(cotizacionId: string, formData: FormData): Promise<ResultadoAccion> {
  const { usuario, error } = await requerirPermiso("editar");
  if (!usuario) return { ok: false, error: error! };

  const supabase = createClient(cookies());

  const cotizacion = await obtenerCotizacionConEstado(supabase, cotizacionId);
  if (!cotizacion) return { ok: false, error: "La cotización no existe." };
  if (!ESTADOS_EDITABLES.includes(cotizacion.codigo_estado)) {
    return { ok: false, error: "Solo se pueden agregar ítems mientras la cotización está en Borrador o En revisión interna." };
  }

  const campos = camposLineaDesdeFormData(formData);
  if (!TIPOS_ITEM_SOPORTADOS.includes(campos.tipo_item)) {
    return { ok: false, error: "Tipo de ítem no soportado en esta etapa (solo Servicio, Rol/tarifa o Ítem libre)." };
  }
  if (!campos.descripcion) return { ok: false, error: "La descripción del ítem es obligatoria." };
  if (!campos.unidad_medida) return { ok: false, error: "La unidad de medida es obligatoria." };
  if (campos.cantidad <= 0) return { ok: false, error: "La cantidad debe ser mayor a 0." };

  const { data: ultimaLinea } = await supabase
    .from("cotizaciones_detalle")
    .select("orden")
    .eq("cotizacion_id", cotizacionId)
    .order("orden", { ascending: false })
    .limit(1)
    .maybeSingle();

  const fila: TablesInsert<"cotizaciones_detalle"> = {
    ...campos,
    cotizacion_id: cotizacionId,
    orden: (ultimaLinea?.orden ?? 0) + 1,
  };

  const { error: errorDb } = await supabase.from("cotizaciones_detalle").insert(fila);
  if (errorDb) return { ok: false, error: errorDb.message };

  await recalcularTotalesCotizacion(supabase, cotizacionId);

  revalidatePath(RUTA);
  return { ok: true };
}

export async function actualizarLineaCotizacion(
  lineaId: string,
  cotizacionId: string,
  formData: FormData
): Promise<ResultadoAccion> {
  const { usuario, error } = await requerirPermiso("editar");
  if (!usuario) return { ok: false, error: error! };

  const supabase = createClient(cookies());

  const cotizacion = await obtenerCotizacionConEstado(supabase, cotizacionId);
  if (!cotizacion) return { ok: false, error: "La cotización no existe." };
  if (!ESTADOS_EDITABLES.includes(cotizacion.codigo_estado)) {
    return { ok: false, error: "Solo se pueden editar ítems mientras la cotización está en Borrador o En revisión interna." };
  }

  const campos = camposLineaDesdeFormData(formData);
  if (!TIPOS_ITEM_SOPORTADOS.includes(campos.tipo_item)) {
    return { ok: false, error: "Tipo de ítem no soportado en esta etapa (solo Servicio, Rol/tarifa o Ítem libre)." };
  }
  if (!campos.descripcion) return { ok: false, error: "La descripción del ítem es obligatoria." };
  if (campos.cantidad <= 0) return { ok: false, error: "La cantidad debe ser mayor a 0." };

  const cambios: TablesUpdate<"cotizaciones_detalle"> = { ...campos };

  const { error: errorDb } = await supabase.from("cotizaciones_detalle").update(cambios).eq("id", lineaId);
  if (errorDb) return { ok: false, error: errorDb.message };

  await recalcularTotalesCotizacion(supabase, cotizacionId);

  revalidatePath(RUTA);
  return { ok: true };
}

export async function eliminarLineaCotizacion(lineaId: string, cotizacionId: string): Promise<ResultadoAccion> {
  const { usuario, error } = await requerirPermiso("editar");
  if (!usuario) return { ok: false, error: error! };

  const supabase = createClient(cookies());

  const cotizacion = await obtenerCotizacionConEstado(supabase, cotizacionId);
  if (!cotizacion) return { ok: false, error: "La cotización no existe." };
  if (!ESTADOS_EDITABLES.includes(cotizacion.codigo_estado)) {
    return { ok: false, error: "Solo se pueden quitar ítems mientras la cotización está en Borrador o En revisión interna." };
  }

  const { error: errorDb } = await supabase.from("cotizaciones_detalle").delete().eq("id", lineaId);
  if (errorDb) return { ok: false, error: errorDb.message };

  await recalcularTotalesCotizacion(supabase, cotizacionId);

  revalidatePath(RUTA);
  return { ok: true };
}

// =============================================================================
// Flujo de estados (workflows_transiciones / workflows_historial)
// =============================================================================

// La transición a CONVERTIDA nunca pasa por este cambio de estado genérico: la
// conversión real crea un contrato + proyecto de forma atómica y necesita datos
// adicionales (tipo de contrato, PM, fechas planeadas, etc.) que este flujo de
// "cambiar estado con comentario opcional" no captura. Esa transición se hace a
// través de `convertirCotizacionAProyecto()` (contratos-proyectos/actions.ts),
// que llama a `fn_convertir_cotizacion_a_proyecto()` y deja la cotización en
// CONVERTIDA como parte de la misma operación — ver el botón "Convertir a
// proyecto" en cotizaciones-panel.tsx.
const ESTADO_BLOQUEADO_SIN_MODULO: Record<string, string> = {
  CONVERTIDA: "Usa el botón \"Convertir a proyecto\" para esta transición: crea el contrato y el proyecto en el mismo paso.",
};

export async function cambiarEstadoCotizacion(
  id: string,
  estadoDestinoId: string,
  comentario: string | null
): Promise<ResultadoAccion> {
  const { usuario, error } = await requerirPermiso("editar");
  if (!usuario) return { ok: false, error: error! };

  const supabase = createClient(cookies());

  const cotizacion = await obtenerCotizacionConEstado(supabase, id);
  if (!cotizacion) return { ok: false, error: "La cotización no existe." };

  const { data: transicion } = await supabase
    .from("workflows_transiciones")
    .select("id, requiere_comentario, estados_destino:estados_ciclo_vida!workflows_transiciones_estado_destino_id_fkey(codigo_estado)")
    .eq("entidad_aplicable", "COTIZACION")
    .eq("estado_origen_id", cotizacion.estado_id)
    .eq("estado_destino_id", estadoDestinoId)
    .maybeSingle();

  if (!transicion) {
    return { ok: false, error: "Esta transición no está permitida desde el estado actual de la cotización." };
  }

  const destino = transicion.estados_destino as unknown as { codigo_estado: string } | null;
  const codigoDestino = destino?.codigo_estado ?? "";

  if (ESTADO_BLOQUEADO_SIN_MODULO[codigoDestino]) {
    return { ok: false, error: ESTADO_BLOQUEADO_SIN_MODULO[codigoDestino] };
  }

  const comentarioLimpio = comentario?.trim() || null;
  if (transicion.requiere_comentario && !comentarioLimpio) {
    return { ok: false, error: "Este cambio de estado requiere que expliques el motivo en un comentario." };
  }

  const ahora = new Date().toISOString();
  const cambios: TablesUpdate<"cotizaciones"> = { estado_id: estadoDestinoId };
  if (codigoDestino === "ENVIADA") cambios.fecha_envio = ahora;
  if (["ACEPTADA", "RECHAZADA", "VENCIDA"].includes(codigoDestino)) cambios.fecha_respuesta_cliente = ahora;
  if (codigoDestino === "RECHAZADA") cambios.motivo_rechazo = comentarioLimpio;

  const { error: errorDb } = await supabase.from("cotizaciones").update(cambios).eq("id", id);
  if (errorDb) return { ok: false, error: errorDb.message };

  await supabase.from("workflows_historial").insert({
    entidad_tipo: "COTIZACION",
    entidad_id: id,
    estado_anterior: cotizacion.codigo_estado || null,
    estado_nuevo: codigoDestino,
    usuario_id: usuario.id,
    comentario: comentarioLimpio,
  });

  // Alerta: no bloquea la respuesta si falla — ver contrato de dispararAlerta().
  const eventoAlerta = EVENTO_POR_ESTADO_COTIZACION[codigoDestino];
  if (eventoAlerta) {
    const { data: detalle } = await supabase
      .from("cotizaciones")
      .select("numero_cotizacion, cuenta_id, total, motivo_rechazo, monedas(codigo_iso), cuentas_clientes(razon_social)")
      .eq("id", id)
      .maybeSingle();
    if (detalle) {
      await dispararAlerta({
        empresaId: usuario.perfil.empresa_id,
        eventoDisparador: eventoAlerta,
        entidadTipo: "COTIZACION",
        entidadId: id,
        cuentaId: detalle.cuenta_id,
        variables: {
          numero_cotizacion: detalle.numero_cotizacion,
          cuenta: (detalle as any).cuentas_clientes?.razon_social ?? "",
          total: String(detalle.total ?? ""),
          moneda: (detalle as any).monedas?.codigo_iso ?? "",
          motivo_rechazo: detalle.motivo_rechazo ?? "",
        },
      });
    }
  }

  revalidatePath(RUTA);
  return { ok: true };
}

// =============================================================================
// Aprobaciones (cotizaciones_aprobaciones)
// =============================================================================

export async function solicitarAprobacion(cotizacionId: string, formData: FormData): Promise<ResultadoAccion> {
  const { usuario, error } = await requerirPermiso("editar");
  if (!usuario) return { ok: false, error: error! };

  const aprobadorId = String(formData.get("aprobador_id") ?? "").trim();
  if (!aprobadorId) return { ok: false, error: "Debes elegir un aprobador." };

  const supabase = createClient(cookies());

  const { data: ultimaAprobacion } = await supabase
    .from("cotizaciones_aprobaciones")
    .select("nivel_aprobacion")
    .eq("cotizacion_id", cotizacionId)
    .order("nivel_aprobacion", { ascending: false })
    .limit(1)
    .maybeSingle();

  const fila: TablesInsert<"cotizaciones_aprobaciones"> = {
    cotizacion_id: cotizacionId,
    aprobador_id: aprobadorId,
    nivel_aprobacion: (ultimaAprobacion?.nivel_aprobacion ?? 0) + 1,
    estado: "PENDIENTE",
  };

  const { error: errorDb } = await supabase.from("cotizaciones_aprobaciones").insert(fila);
  if (errorDb) return { ok: false, error: errorDb.message };

  revalidatePath(RUTA);
  return { ok: true };
}

// Gateado por 'aprobar', no por 'editar': ver el comentario al inicio del archivo sobre
// el hueco de la política RLS de cotizaciones_aprobaciones. Este chequeo de aplicación es
// hoy el único control real de quién puede resolver una aprobación.
export async function resolverAprobacion(
  aprobacionId: string,
  cotizacionId: string,
  estado: "APROBADO" | "RECHAZADO",
  comentario: string | null
): Promise<ResultadoAccion> {
  const { usuario, error } = await requerirPermiso("aprobar");
  if (!usuario) return { ok: false, error: error! };

  if (estado !== "APROBADO" && estado !== "RECHAZADO") {
    return { ok: false, error: "Estado de resolución inválido." };
  }

  const supabase = createClient(cookies());

  const { data: aprobacion } = await supabase
    .from("cotizaciones_aprobaciones")
    .select("estado")
    .eq("id", aprobacionId)
    .maybeSingle();
  if (!aprobacion) return { ok: false, error: "La solicitud de aprobación no existe." };
  if (aprobacion.estado !== "PENDIENTE") {
    return { ok: false, error: "Esta aprobación ya fue resuelta." };
  }

  const cambios: TablesUpdate<"cotizaciones_aprobaciones"> = {
    estado,
    fecha_resolucion: new Date().toISOString(),
    comentario: comentario?.trim() || null,
  };

  const { error: errorDb } = await supabase.from("cotizaciones_aprobaciones").update(cambios).eq("id", aprobacionId);
  if (errorDb) return { ok: false, error: errorDb.message };

  revalidatePath(RUTA);
  return { ok: true };
}
