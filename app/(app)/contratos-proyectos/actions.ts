"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { getUsuarioActual, usuarioTienePermiso } from "@/lib/auth/getUsuarioActual";
import type { Accion } from "@/lib/rbac";
import type { TablesInsert, TablesUpdate } from "@/utils/database.types";
import { dispararAlerta } from "@/lib/alertas/despacho";

const EVENTO_POR_ESTADO_HITO: Record<string, string> = {
  ENTREGADO: "HITO_ENTREGADO",
  ACEPTADO: "HITO_ACEPTADO_CLIENTE",
  RECHAZADO: "HITO_RECHAZADO",
};

export type ResultadoAccion = { ok: true } | { ok: false; error: string };
export type ResultadoConId = { ok: true; id: string } | { ok: false; error: string };

const RUTA = "/contratos-proyectos";
const RUTA_CRM = "/crm";

// El módulo sí define sublistas específicas en la matriz de permisos (ver
// catalogo-permisos.ts): "contratos", "proyectos" y "hitos_entregables" (esta
// última compartida por hitos_entregables e hitos_criterios_aceptacion, igual
// que en fn_crear_politicas_rls() — ver migración 20260825000008_rls_baseline.sql).
async function requerirPermiso(accion: Accion, sublista: string) {
  const usuario = await getUsuarioActual();
  if (!usuarioTienePermiso(usuario, "CONTRATOS_PROYECTOS", accion, sublista)) {
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

// =============================================================================
// Contratos
// =============================================================================

function camposContratoDesdeFormData(formData: FormData) {
  return {
    cuenta_id: String(formData.get("cuenta_id") ?? "").trim(),
    // contacto_firmante_id se deja fuera de la UI a propósito en este checkpoint:
    // exponerlo requeriría leer `contactos`, que está gateado por CRM_VENTAS. Se
    // acepta igual si viene en el formData (por ejemplo, desde la conversión de
    // una cotización) para no perder el dato cuando sí está disponible.
    contacto_firmante_id: textoOpcional(formData.get("contacto_firmante_id")),
    tipo_contrato: String(formData.get("tipo_contrato") ?? "").trim(),
    fecha_firma: textoOpcional(formData.get("fecha_firma")),
    fecha_inicio: String(formData.get("fecha_inicio") ?? "").trim(),
    fecha_fin_estimada: textoOpcional(formData.get("fecha_fin_estimada")),
    moneda_id: String(formData.get("moneda_id") ?? "").trim(),
    valor_total_contratado: numeroOpcional(formData.get("valor_total_contratado")) ?? 0,
    forma_pago: textoOpcional(formData.get("forma_pago")),
    plazo_pago_dias: numeroOpcional(formData.get("plazo_pago_dias")),
    responsable_comercial_id: String(formData.get("responsable_comercial_id") ?? "").trim(),
    responsable_pm_id: textoOpcional(formData.get("responsable_pm_id")),
    archivo_contrato_url: textoOpcional(formData.get("archivo_contrato_url")),
    clausulas_especiales: textoOpcional(formData.get("clausulas_especiales")),
  };
}

function validarCamposContrato(campos: ReturnType<typeof camposContratoDesdeFormData>): string | null {
  if (!campos.cuenta_id) return "Debes elegir una cuenta.";
  if (!campos.tipo_contrato) return "Debes elegir un tipo de contrato.";
  if (!campos.fecha_inicio) return "La fecha de inicio es obligatoria.";
  if (!campos.moneda_id) return "Debes elegir una moneda.";
  if (campos.valor_total_contratado <= 0) return "El valor total contratado debe ser mayor a 0.";
  if (!campos.responsable_comercial_id) return "Debes elegir un responsable comercial.";
  return null;
}

async function obtenerContratoConEstado(
  supabase: ReturnType<typeof createClient>,
  id: string
): Promise<{ estado_id: string; codigo_estado: string } | null> {
  const { data } = await supabase
    .from("contratos")
    .select("estado_id, estados_ciclo_vida(codigo_estado)")
    .eq("id", id)
    .maybeSingle();
  if (!data) return null;
  const estado = data.estados_ciclo_vida as unknown as { codigo_estado: string } | null;
  return { estado_id: data.estado_id, codigo_estado: estado?.codigo_estado ?? "" };
}

export async function crearContrato(formData: FormData): Promise<ResultadoConId> {
  const { usuario, error } = await requerirPermiso("crear", "contratos");
  if (!usuario) return { ok: false, error: error! };

  const campos = camposContratoDesdeFormData(formData);
  const errorValidacion = validarCamposContrato(campos);
  if (errorValidacion) return { ok: false, error: errorValidacion };

  const supabase = createClient(cookies());

  const { data: estadoInicial, error: errorEstado } = await supabase
    .from("estados_ciclo_vida")
    .select("id")
    .eq("empresa_id", usuario.perfil.empresa_id)
    .eq("entidad_aplicable", "CONTRATO")
    .eq("es_estado_inicial", true)
    .maybeSingle();
  if (errorEstado || !estadoInicial) {
    return { ok: false, error: "No se encontró el estado inicial del flujo de contratos para tu empresa." };
  }

  const { data: numero, error: errorConsecutivo } = await supabase.rpc("fn_generar_consecutivo", {
    p_codigo_secuencia: "CONTRATO",
    p_empresa_id: usuario.perfil.empresa_id,
  });
  if (errorConsecutivo || !numero) {
    return {
      ok: false,
      error: `No se pudo generar el número del contrato: ${errorConsecutivo?.message ?? "error desconocido"}.`,
    };
  }

  const fila: TablesInsert<"contratos"> = {
    ...campos,
    empresa_id: usuario.perfil.empresa_id,
    numero_contrato: numero,
    estado_id: estadoInicial.id,
  };

  const { data: creado, error: errorDb } = await supabase.from("contratos").insert(fila).select("id").single();
  if (errorDb || !creado) return { ok: false, error: errorDb?.message ?? "No se pudo crear el contrato." };

  revalidatePath(RUTA);
  return { ok: true, id: creado.id };
}

export async function actualizarContrato(id: string, formData: FormData): Promise<ResultadoAccion> {
  const { usuario, error } = await requerirPermiso("editar", "contratos");
  if (!usuario) return { ok: false, error: error! };

  const campos = camposContratoDesdeFormData(formData);
  const errorValidacion = validarCamposContrato(campos);
  if (errorValidacion) return { ok: false, error: errorValidacion };

  const cambios: TablesUpdate<"contratos"> = { ...campos };

  const supabase = createClient(cookies());
  const { error: errorDb } = await supabase.from("contratos").update(cambios).eq("id", id);
  if (errorDb) return { ok: false, error: errorDb.message };

  revalidatePath(RUTA);
  return { ok: true };
}

export async function cambiarEstadoContrato(
  id: string,
  estadoDestinoId: string,
  comentario: string | null
): Promise<ResultadoAccion> {
  const { usuario, error } = await requerirPermiso("editar", "contratos");
  if (!usuario) return { ok: false, error: error! };

  const supabase = createClient(cookies());

  const contrato = await obtenerContratoConEstado(supabase, id);
  if (!contrato) return { ok: false, error: "El contrato no existe." };

  const { data: transicion } = await supabase
    .from("workflows_transiciones")
    .select(
      "id, requiere_comentario, estados_destino:estados_ciclo_vida!workflows_transiciones_estado_destino_id_fkey(codigo_estado)"
    )
    .eq("entidad_aplicable", "CONTRATO")
    .eq("estado_origen_id", contrato.estado_id)
    .eq("estado_destino_id", estadoDestinoId)
    .maybeSingle();

  if (!transicion) {
    return { ok: false, error: "Esta transición no está permitida desde el estado actual del contrato." };
  }

  const destino = transicion.estados_destino as unknown as { codigo_estado: string } | null;
  const codigoDestino = destino?.codigo_estado ?? "";

  const comentarioLimpio = comentario?.trim() || null;
  if (transicion.requiere_comentario && !comentarioLimpio) {
    return { ok: false, error: "Este cambio de estado requiere que expliques el motivo en un comentario." };
  }

  const cambios: TablesUpdate<"contratos"> = { estado_id: estadoDestinoId };

  const { error: errorDb } = await supabase.from("contratos").update(cambios).eq("id", id);
  if (errorDb) return { ok: false, error: errorDb.message };

  await supabase.from("workflows_historial").insert({
    entidad_tipo: "CONTRATO",
    entidad_id: id,
    estado_anterior: contrato.codigo_estado || null,
    estado_nuevo: codigoDestino,
    usuario_id: usuario.id,
    comentario: comentarioLimpio,
  });

  // Alerta: no bloquea la respuesta si falla — ver contrato de dispararAlerta().
  if (codigoDestino === "ACTIVO") {
    const { data: detalle } = await supabase
      .from("contratos")
      .select("numero_contrato, cuenta_id, valor_total_contratado, cuentas_clientes(razon_social)")
      .eq("id", id)
      .maybeSingle();
    if (detalle) {
      await dispararAlerta({
        empresaId: usuario.perfil.empresa_id,
        eventoDisparador: "CONTRATO_ACTIVADO",
        entidadTipo: "CONTRATO",
        entidadId: id,
        cuentaId: detalle.cuenta_id,
        variables: {
          numero_contrato: detalle.numero_contrato,
          cuenta: (detalle as any).cuentas_clientes?.razon_social ?? "",
          valor_total: String(detalle.valor_total_contratado ?? ""),
        },
      });
    }
  }

  revalidatePath(RUTA);
  return { ok: true };
}

// =============================================================================
// Proyectos
// =============================================================================

function camposProyectoDesdeFormData(formData: FormData) {
  return {
    contrato_id: String(formData.get("contrato_id") ?? "").trim(),
    nombre_proyecto: String(formData.get("nombre_proyecto") ?? "").trim(),
    descripcion: textoOpcional(formData.get("descripcion")),
    tipo_proyecto: textoOpcional(formData.get("tipo_proyecto")),
    pm_id: String(formData.get("pm_id") ?? "").trim(),
    prioridad: textoOpcional(formData.get("prioridad")),
    fecha_inicio_planeada: String(formData.get("fecha_inicio_planeada") ?? "").trim(),
    fecha_fin_planeada: String(formData.get("fecha_fin_planeada") ?? "").trim(),
    fecha_inicio_real: textoOpcional(formData.get("fecha_inicio_real")),
    fecha_fin_real: textoOpcional(formData.get("fecha_fin_real")),
    presupuesto_horas_total: numeroOpcional(formData.get("presupuesto_horas_total")),
    presupuesto_costo_total: numeroOpcional(formData.get("presupuesto_costo_total")),
    presupuesto_ingreso_total: numeroOpcional(formData.get("presupuesto_ingreso_total")),
    porcentaje_avance: numeroOpcional(formData.get("porcentaje_avance")),
  };
}

function validarCamposProyecto(campos: ReturnType<typeof camposProyectoDesdeFormData>): string | null {
  if (!campos.contrato_id) return "Debes elegir un contrato.";
  if (!campos.nombre_proyecto) return "El nombre del proyecto es obligatorio.";
  if (!campos.pm_id) return "Debes elegir un PM.";
  if (!campos.fecha_inicio_planeada) return "La fecha de inicio planeada es obligatoria.";
  if (!campos.fecha_fin_planeada) return "La fecha de fin planeada es obligatoria.";
  return null;
}

async function obtenerProyectoConEstado(
  supabase: ReturnType<typeof createClient>,
  id: string
): Promise<{ estado_id: string; codigo_estado: string } | null> {
  const { data } = await supabase
    .from("proyectos")
    .select("estado_id, estados_ciclo_vida(codigo_estado)")
    .eq("id", id)
    .maybeSingle();
  if (!data) return null;
  const estado = data.estados_ciclo_vida as unknown as { codigo_estado: string } | null;
  return { estado_id: data.estado_id, codigo_estado: estado?.codigo_estado ?? "" };
}

export async function crearProyecto(formData: FormData): Promise<ResultadoConId> {
  const { usuario, error } = await requerirPermiso("crear", "proyectos");
  if (!usuario) return { ok: false, error: error! };

  const campos = camposProyectoDesdeFormData(formData);
  const errorValidacion = validarCamposProyecto(campos);
  if (errorValidacion) return { ok: false, error: errorValidacion };

  const codigoSecuencia = String(formData.get("codigo_secuencia") ?? "").trim();
  if (!codigoSecuencia) return { ok: false, error: "Debes elegir la secuencia de numeración del proyecto." };

  const supabase = createClient(cookies());

  const { data: estadoInicial, error: errorEstado } = await supabase
    .from("estados_ciclo_vida")
    .select("id")
    .eq("empresa_id", usuario.perfil.empresa_id)
    .eq("entidad_aplicable", "PROYECTO")
    .eq("es_estado_inicial", true)
    .maybeSingle();
  if (errorEstado || !estadoInicial) {
    return { ok: false, error: "No se encontró el estado inicial del flujo de proyectos para tu empresa." };
  }

  const { data: numero, error: errorConsecutivo } = await supabase.rpc("fn_generar_consecutivo", {
    p_codigo_secuencia: codigoSecuencia,
    p_empresa_id: usuario.perfil.empresa_id,
  });
  if (errorConsecutivo || !numero) {
    return {
      ok: false,
      error: `No se pudo generar el número del proyecto: ${errorConsecutivo?.message ?? "error desconocido"}.`,
    };
  }

  const fila: TablesInsert<"proyectos"> = {
    ...campos,
    empresa_id: usuario.perfil.empresa_id,
    numero_proyecto: numero,
    estado_id: estadoInicial.id,
  };

  const { data: creado, error: errorDb } = await supabase.from("proyectos").insert(fila).select("id").single();
  if (errorDb || !creado) return { ok: false, error: errorDb?.message ?? "No se pudo crear el proyecto." };

  revalidatePath(RUTA);
  return { ok: true, id: creado.id };
}

export async function actualizarProyecto(id: string, formData: FormData): Promise<ResultadoAccion> {
  const { usuario, error } = await requerirPermiso("editar", "proyectos");
  if (!usuario) return { ok: false, error: error! };

  const campos = camposProyectoDesdeFormData(formData);
  const errorValidacion = validarCamposProyecto(campos);
  if (errorValidacion) return { ok: false, error: errorValidacion };

  const cambios: TablesUpdate<"proyectos"> = { ...campos };

  const supabase = createClient(cookies());
  const { error: errorDb } = await supabase.from("proyectos").update(cambios).eq("id", id);
  if (errorDb) return { ok: false, error: errorDb.message };

  revalidatePath(RUTA);
  return { ok: true };
}

export async function cambiarEstadoProyecto(
  id: string,
  estadoDestinoId: string,
  comentario: string | null
): Promise<ResultadoAccion> {
  const { usuario, error } = await requerirPermiso("editar", "proyectos");
  if (!usuario) return { ok: false, error: error! };

  const supabase = createClient(cookies());

  const proyecto = await obtenerProyectoConEstado(supabase, id);
  if (!proyecto) return { ok: false, error: "El proyecto no existe." };

  const { data: transicion } = await supabase
    .from("workflows_transiciones")
    .select(
      "id, requiere_comentario, estados_destino:estados_ciclo_vida!workflows_transiciones_estado_destino_id_fkey(codigo_estado)"
    )
    .eq("entidad_aplicable", "PROYECTO")
    .eq("estado_origen_id", proyecto.estado_id)
    .eq("estado_destino_id", estadoDestinoId)
    .maybeSingle();

  if (!transicion) {
    return { ok: false, error: "Esta transición no está permitida desde el estado actual del proyecto." };
  }

  const destino = transicion.estados_destino as unknown as { codigo_estado: string } | null;
  const codigoDestino = destino?.codigo_estado ?? "";

  const comentarioLimpio = comentario?.trim() || null;
  if (transicion.requiere_comentario && !comentarioLimpio) {
    return { ok: false, error: "Este cambio de estado requiere que expliques el motivo en un comentario." };
  }

  const { error: errorDb } = await supabase.from("proyectos").update({ estado_id: estadoDestinoId }).eq("id", id);
  if (errorDb) return { ok: false, error: errorDb.message };

  await supabase.from("workflows_historial").insert({
    entidad_tipo: "PROYECTO",
    entidad_id: id,
    estado_anterior: proyecto.codigo_estado || null,
    estado_nuevo: codigoDestino,
    usuario_id: usuario.id,
    comentario: comentarioLimpio,
  });

  // Alerta: no bloquea la respuesta si falla — ver contrato de dispararAlerta().
  if (codigoDestino === "EN_EJECUCION") {
    const { data: detalle } = await supabase
      .from("proyectos")
      .select("numero_proyecto, nombre_proyecto, contratos(cuenta_id)")
      .eq("id", id)
      .maybeSingle();
    if (detalle) {
      await dispararAlerta({
        empresaId: usuario.perfil.empresa_id,
        eventoDisparador: "PROYECTO_INICIADO",
        entidadTipo: "PROYECTO",
        entidadId: id,
        proyectoId: id,
        cuentaId: (detalle as any).contratos?.cuenta_id ?? null,
        variables: {
          numero_proyecto: detalle.numero_proyecto,
          nombre_proyecto: detalle.nombre_proyecto,
        },
      });
    }
  }

  revalidatePath(RUTA);
  return { ok: true };
}

// =============================================================================
// Hitos y entregables
// =============================================================================

// hitos_entregables.estado es una columna de texto con check constraint propio
// (PENDIENTE/EN_PROGRESO/ENTREGADO/EN_REVISION_CLIENTE/ACEPTADO/RECHAZADO), no
// está ligada al motor de workflows_transiciones/estados_ciclo_vida como
// contratos y proyectos — así que su cambio de estado es un simple update.
const ESTADOS_HITO = ["PENDIENTE", "EN_PROGRESO", "ENTREGADO", "EN_REVISION_CLIENTE", "ACEPTADO", "RECHAZADO"];

function camposHitoDesdeFormData(formData: FormData) {
  return {
    nombre: String(formData.get("nombre") ?? "").trim(),
    descripcion: textoOpcional(formData.get("descripcion")),
    fase_orden: numeroOpcional(formData.get("fase_orden")) ?? 0,
    fecha_planeada_entrega: String(formData.get("fecha_planeada_entrega") ?? "").trim(),
    condiciones_aceptacion: textoOpcional(formData.get("condiciones_aceptacion")),
    responsable_id: String(formData.get("responsable_id") ?? "").trim(),
    porcentaje_facturacion_asociado: numeroOpcional(formData.get("porcentaje_facturacion_asociado")),
    valor_hito: numeroOpcional(formData.get("valor_hito")),
    // aprobador_cliente_contacto_id se deja fuera de la UI a propósito en este
    // checkpoint, por el mismo motivo que contacto_firmante_id en Contratos.
    aprobador_cliente_contacto_id: textoOpcional(formData.get("aprobador_cliente_contacto_id")),
  };
}

function validarCamposHito(campos: ReturnType<typeof camposHitoDesdeFormData>): string | null {
  if (!campos.nombre) return "El nombre del hito es obligatorio.";
  if (!campos.fecha_planeada_entrega) return "La fecha planeada de entrega es obligatoria.";
  if (!campos.responsable_id) return "Debes elegir un responsable.";
  return null;
}

export async function crearHito(proyectoId: string, formData: FormData): Promise<ResultadoAccion> {
  const { usuario, error } = await requerirPermiso("crear", "hitos_entregables");
  if (!usuario) return { ok: false, error: error! };

  const campos = camposHitoDesdeFormData(formData);
  const errorValidacion = validarCamposHito(campos);
  if (errorValidacion) return { ok: false, error: errorValidacion };

  const supabase = createClient(cookies());

  const { data: numero, error: errorConsecutivo } = await supabase.rpc("fn_generar_consecutivo", {
    p_codigo_secuencia: "ENTREGABLE",
    p_empresa_id: usuario.perfil.empresa_id,
  });
  if (errorConsecutivo || !numero) {
    return {
      ok: false,
      error: `No se pudo generar el número del entregable: ${errorConsecutivo?.message ?? "error desconocido"}.`,
    };
  }

  const fila: TablesInsert<"hitos_entregables"> = {
    ...campos,
    proyecto_id: proyectoId,
    numero_entregable: numero,
  };

  const { error: errorDb } = await supabase.from("hitos_entregables").insert(fila);
  if (errorDb) return { ok: false, error: errorDb.message };

  revalidatePath(RUTA);
  return { ok: true };
}

export async function actualizarHito(id: string, formData: FormData): Promise<ResultadoAccion> {
  const { usuario, error } = await requerirPermiso("editar", "hitos_entregables");
  if (!usuario) return { ok: false, error: error! };

  const campos = camposHitoDesdeFormData(formData);
  const errorValidacion = validarCamposHito(campos);
  if (errorValidacion) return { ok: false, error: errorValidacion };

  const cambios: TablesUpdate<"hitos_entregables"> = { ...campos };

  const supabase = createClient(cookies());
  const { error: errorDb } = await supabase.from("hitos_entregables").update(cambios).eq("id", id);
  if (errorDb) return { ok: false, error: errorDb.message };

  revalidatePath(RUTA);
  return { ok: true };
}

export async function cambiarEstadoHito(
  id: string,
  estado: string,
  notasRechazo: string | null
): Promise<ResultadoAccion> {
  const { usuario, error } = await requerirPermiso("editar", "hitos_entregables");
  if (!usuario) return { ok: false, error: error! };

  if (!ESTADOS_HITO.includes(estado)) return { ok: false, error: "Estado de hito inválido." };

  const cambios: TablesUpdate<"hitos_entregables"> = { estado };
  if (estado === "ENTREGADO") cambios.fecha_real_entrega = new Date().toISOString().slice(0, 10);
  if (estado === "ACEPTADO") cambios.fecha_aprobacion_cliente = new Date().toISOString();
  if (estado === "RECHAZADO") cambios.notas_rechazo = notasRechazo?.trim() || null;

  const supabase = createClient(cookies());
  const { error: errorDb } = await supabase.from("hitos_entregables").update(cambios).eq("id", id);
  if (errorDb) return { ok: false, error: errorDb.message };

  // Alerta: no bloquea la respuesta si falla — ver contrato de dispararAlerta().
  const eventoAlerta = EVENTO_POR_ESTADO_HITO[estado];
  if (eventoAlerta) {
    const { data: detalle } = await supabase
      .from("hitos_entregables")
      .select("numero_entregable, nombre, proyecto_id, proyectos(numero_proyecto, contratos(cuenta_id))")
      .eq("id", id)
      .maybeSingle();
    if (detalle) {
      const proyectoAnidado = (detalle as any).proyectos as
        | { numero_proyecto: string; contratos: { cuenta_id: string } | null }
        | null;
      await dispararAlerta({
        empresaId: usuario.perfil.empresa_id,
        eventoDisparador: eventoAlerta,
        entidadTipo: "HITO",
        entidadId: id,
        proyectoId: detalle.proyecto_id,
        cuentaId: proyectoAnidado?.contratos?.cuenta_id ?? null,
        variables: {
          numero_entregable: detalle.numero_entregable,
          nombre_hito: detalle.nombre,
          numero_proyecto: proyectoAnidado?.numero_proyecto ?? "",
          notas_rechazo: estado === "RECHAZADO" ? notasRechazo?.trim() || "" : "",
        },
      });
    }
  }

  revalidatePath(RUTA);
  return { ok: true };
}

// =============================================================================
// Criterios de aceptación de un hito
// =============================================================================

export async function crearCriterio(hitoId: string, formData: FormData): Promise<ResultadoAccion> {
  const { usuario, error } = await requerirPermiso("editar", "hitos_entregables");
  if (!usuario) return { ok: false, error: error! };

  const criterio = String(formData.get("criterio") ?? "").trim();
  if (!criterio) return { ok: false, error: "El criterio es obligatorio." };

  const fila: TablesInsert<"hitos_criterios_aceptacion"> = { hito_id: hitoId, criterio };

  const supabase = createClient(cookies());
  const { error: errorDb } = await supabase.from("hitos_criterios_aceptacion").insert(fila);
  if (errorDb) return { ok: false, error: errorDb.message };

  revalidatePath(RUTA);
  return { ok: true };
}

export async function marcarCriterioCumplido(id: string, cumplido: boolean): Promise<ResultadoAccion> {
  const { usuario, error } = await requerirPermiso("editar", "hitos_entregables");
  if (!usuario) return { ok: false, error: error! };

  const cambios: TablesUpdate<"hitos_criterios_aceptacion"> = {
    cumplido,
    verificado_por: cumplido ? usuario.id : null,
    fecha_verificacion: cumplido ? new Date().toISOString() : null,
  };

  const supabase = createClient(cookies());
  const { error: errorDb } = await supabase.from("hitos_criterios_aceptacion").update(cambios).eq("id", id);
  if (errorDb) return { ok: false, error: errorDb.message };

  revalidatePath(RUTA);
  return { ok: true };
}

export async function eliminarCriterio(id: string): Promise<ResultadoAccion> {
  const { usuario, error } = await requerirPermiso("editar", "hitos_entregables");
  if (!usuario) return { ok: false, error: error! };

  const supabase = createClient(cookies());
  const { error: errorDb } = await supabase.from("hitos_criterios_aceptacion").delete().eq("id", id);
  if (errorDb) return { ok: false, error: errorDb.message };

  revalidatePath(RUTA);
  return { ok: true };
}

// =============================================================================
// Conversión de cotización a contrato + proyecto (fn_convertir_cotizacion_a_proyecto)
// =============================================================================

// Los permisos reales de esta operación (CRM_VENTAS/editar/cotizaciones +
// CONTRATOS_PROYECTOS/crear/contratos + CONTRATOS_PROYECTOS/crear/proyectos) se
// verifican DENTRO de la función SECURITY DEFINER, porque abarca 3 tablas/RLS
// distintas — ver migración 20260825000016_fn_convertir_cotizacion_a_proyecto.sql.
// Aquí solo se exige una sesión válida antes de llamar al RPC.
export async function convertirCotizacionAProyecto(
  cotizacionId: string,
  formData: FormData
): Promise<ResultadoConId> {
  const usuario = await getUsuarioActual();
  if (!usuario) return { ok: false, error: "Debes iniciar sesión." };

  const tipoContrato = String(formData.get("tipo_contrato") ?? "").trim();
  const fechaInicioContrato = String(formData.get("fecha_inicio_contrato") ?? "").trim();
  const contactoFirmanteId = textoOpcional(formData.get("contacto_firmante_id"));
  const formaPago = textoOpcional(formData.get("forma_pago"));
  const plazoPagoDias = numeroOpcional(formData.get("plazo_pago_dias"));
  const pmId = String(formData.get("pm_id") ?? "").trim();
  const nombreProyecto = String(formData.get("nombre_proyecto") ?? "").trim();
  const tipoProyecto = textoOpcional(formData.get("tipo_proyecto"));
  const codigoSecuenciaProyecto = String(formData.get("codigo_secuencia_proyecto") ?? "").trim();
  const fechaInicioPlaneada = String(formData.get("fecha_inicio_planeada") ?? "").trim();
  const fechaFinPlaneada = String(formData.get("fecha_fin_planeada") ?? "").trim();

  if (!tipoContrato) return { ok: false, error: "Debes elegir un tipo de contrato." };
  if (!fechaInicioContrato) return { ok: false, error: "La fecha de inicio del contrato es obligatoria." };
  if (!pmId) return { ok: false, error: "Debes elegir un PM." };
  if (!nombreProyecto) return { ok: false, error: "El nombre del proyecto es obligatorio." };
  if (!codigoSecuenciaProyecto) return { ok: false, error: "Debes elegir la secuencia de numeración del proyecto." };
  if (!fechaInicioPlaneada) return { ok: false, error: "La fecha de inicio planeada es obligatoria." };
  if (!fechaFinPlaneada) return { ok: false, error: "La fecha de fin planeada es obligatoria." };

  const supabase = createClient(cookies());
  const { data: proyectoId, error: errorRpc } = await supabase.rpc("fn_convertir_cotizacion_a_proyecto", {
    p_cotizacion_id: cotizacionId,
    p_tipo_contrato: tipoContrato,
    p_fecha_inicio_contrato: fechaInicioContrato,
    p_contacto_firmante_id: contactoFirmanteId,
    p_forma_pago: formaPago,
    p_plazo_pago_dias: plazoPagoDias,
    p_pm_id: pmId,
    p_nombre_proyecto: nombreProyecto,
    p_tipo_proyecto: tipoProyecto,
    p_codigo_secuencia_proyecto: codigoSecuenciaProyecto,
    p_fecha_inicio_planeada: fechaInicioPlaneada,
    p_fecha_fin_planeada: fechaFinPlaneada,
  });

  if (errorRpc || !proyectoId) {
    return { ok: false, error: errorRpc?.message ?? "No se pudo convertir la cotización a proyecto." };
  }

  revalidatePath(RUTA_CRM);
  revalidatePath(RUTA);
  return { ok: true, id: proyectoId as string };
}

function redondear2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

// =============================================================================
// Timesheets
// =============================================================================

const ESTADOS_TIMESHEET_EDITABLES = ["BORRADOR", "RECHAZADO"];

function camposTimesheetDesdeFormData(formData: FormData) {
  return {
    proyecto_id: String(formData.get("proyecto_id") ?? "").trim(),
    hito_id: textoOpcional(formData.get("hito_id")),
    recurso_id: String(formData.get("recurso_id") ?? "").trim(),
    fecha: String(formData.get("fecha") ?? "").trim(),
    horas_registradas: numeroOpcional(formData.get("horas_registradas")) ?? 0,
    tipo_hora: String(formData.get("tipo_hora") ?? "").trim(),
    categoria_no_facturable_id: textoOpcional(formData.get("categoria_no_facturable_id")),
    rol_tarifa_id: textoOpcional(formData.get("rol_tarifa_id")),
    descripcion_actividad: String(formData.get("descripcion_actividad") ?? "").trim(),
    ubicacion_trabajo: textoOpcional(formData.get("ubicacion_trabajo")),
  };
}

function validarCamposTimesheet(campos: ReturnType<typeof camposTimesheetDesdeFormData>): string | null {
  if (!campos.proyecto_id) return "Debes elegir un proyecto.";
  if (!campos.recurso_id) return "Debes elegir un recurso.";
  if (!campos.fecha) return "La fecha es obligatoria.";
  if (campos.horas_registradas <= 0 || campos.horas_registradas > 24) {
    return "Las horas registradas deben ser mayores a 0 y no superar 24.";
  }
  if (!["FACTURABLE", "NO_FACTURABLE"].includes(campos.tipo_hora)) return "Debes elegir un tipo de hora.";
  if (campos.tipo_hora === "NO_FACTURABLE" && !campos.categoria_no_facturable_id) {
    return "Debes elegir una categoría para horas no facturables.";
  }
  if (!campos.descripcion_actividad) return "La descripción de la actividad es obligatoria.";
  return null;
}

async function obtenerEstadoAprobacionTimesheet(
  supabase: ReturnType<typeof createClient>,
  id: string
): Promise<string | null> {
  const { data } = await supabase.from("timesheets").select("estado_aprobacion").eq("id", id).maybeSingle();
  return data?.estado_aprobacion ?? null;
}

export async function crearTimesheet(formData: FormData): Promise<ResultadoAccion> {
  const { usuario, error } = await requerirPermiso("crear", "timesheets");
  if (!usuario) return { ok: false, error: error! };

  const campos = camposTimesheetDesdeFormData(formData);
  const errorValidacion = validarCamposTimesheet(campos);
  if (errorValidacion) return { ok: false, error: errorValidacion };

  const fila: TablesInsert<"timesheets"> = { ...campos };

  const supabase = createClient(cookies());
  const { error: errorDb } = await supabase.from("timesheets").insert(fila);
  if (errorDb) return { ok: false, error: errorDb.message };

  revalidatePath(RUTA);
  return { ok: true };
}

export async function actualizarTimesheet(id: string, formData: FormData): Promise<ResultadoAccion> {
  const { usuario, error } = await requerirPermiso("editar", "timesheets");
  if (!usuario) return { ok: false, error: error! };

  const supabase = createClient(cookies());

  const estadoActual = await obtenerEstadoAprobacionTimesheet(supabase, id);
  if (estadoActual === null) return { ok: false, error: "El registro de horas no existe." };
  if (!ESTADOS_TIMESHEET_EDITABLES.includes(estadoActual)) {
    return { ok: false, error: "Solo se puede editar un registro de horas en Borrador o Rechazado." };
  }

  const campos = camposTimesheetDesdeFormData(formData);
  const errorValidacion = validarCamposTimesheet(campos);
  if (errorValidacion) return { ok: false, error: errorValidacion };

  const cambios: TablesUpdate<"timesheets"> = { ...campos };

  const { error: errorDb } = await supabase.from("timesheets").update(cambios).eq("id", id);
  if (errorDb) return { ok: false, error: errorDb.message };

  revalidatePath(RUTA);
  return { ok: true };
}

export async function enviarTimesheet(id: string): Promise<ResultadoAccion> {
  const { usuario, error } = await requerirPermiso("editar", "timesheets");
  if (!usuario) return { ok: false, error: error! };

  const supabase = createClient(cookies());

  const estadoActual = await obtenerEstadoAprobacionTimesheet(supabase, id);
  if (estadoActual === null) return { ok: false, error: "El registro de horas no existe." };
  if (!ESTADOS_TIMESHEET_EDITABLES.includes(estadoActual)) {
    return { ok: false, error: "Solo se puede enviar un registro de horas en Borrador o Rechazado." };
  }

  const cambios: TablesUpdate<"timesheets"> = { estado_aprobacion: "ENVIADO", comentario_rechazo: null };
  const { error: errorDb } = await supabase.from("timesheets").update(cambios).eq("id", id);
  if (errorDb) return { ok: false, error: errorDb.message };

  revalidatePath(RUTA);
  return { ok: true };
}

// Gateado por 'aprobar', igual que resolverAprobacion() de cotizaciones — mismo
// patrón, la sublista de este módulo es 'timesheets'.
export async function resolverTimesheet(
  id: string,
  decision: "APROBADO" | "RECHAZADO",
  comentario: string | null
): Promise<ResultadoAccion> {
  const { usuario, error } = await requerirPermiso("aprobar", "timesheets");
  if (!usuario) return { ok: false, error: error! };

  const supabase = createClient(cookies());

  const estadoActual = await obtenerEstadoAprobacionTimesheet(supabase, id);
  if (estadoActual === null) return { ok: false, error: "El registro de horas no existe." };
  if (estadoActual !== "ENVIADO") {
    return { ok: false, error: "Solo se puede resolver un registro de horas que esté Enviado." };
  }

  const cambios: TablesUpdate<"timesheets"> = {
    estado_aprobacion: decision,
    aprobador_id: usuario.id,
    fecha_aprobacion: new Date().toISOString(),
    comentario_rechazo: decision === "RECHAZADO" ? comentario?.trim() || null : null,
  };

  const { error: errorDb } = await supabase.from("timesheets").update(cambios).eq("id", id);
  if (errorDb) return { ok: false, error: errorDb.message };

  revalidatePath(RUTA);
  return { ok: true };
}

// =============================================================================
// Asignación de recursos
// =============================================================================

function camposAsignacionRecursoDesdeFormData(formData: FormData) {
  return {
    proyecto_id: String(formData.get("proyecto_id") ?? "").trim(),
    recurso_id: String(formData.get("recurso_id") ?? "").trim(),
    rol_en_proyecto_id: textoOpcional(formData.get("rol_en_proyecto_id")),
    fecha_inicio_asignacion: String(formData.get("fecha_inicio_asignacion") ?? "").trim(),
    fecha_fin_asignacion: textoOpcional(formData.get("fecha_fin_asignacion")),
    porcentaje_dedicacion: numeroOpcional(formData.get("porcentaje_dedicacion")) ?? 0,
    horas_planeadas_totales: numeroOpcional(formData.get("horas_planeadas_totales")),
    tarifa_costo_hora_aplicable: numeroOpcional(formData.get("tarifa_costo_hora_aplicable")),
    tarifa_venta_hora_aplicable: numeroOpcional(formData.get("tarifa_venta_hora_aplicable")),
    estado_asignacion: String(formData.get("estado_asignacion") || "PLANEADA"),
    notas: textoOpcional(formData.get("notas")),
  };
}

function validarCamposAsignacionRecurso(campos: ReturnType<typeof camposAsignacionRecursoDesdeFormData>): string | null {
  if (!campos.proyecto_id) return "Debes elegir un proyecto.";
  if (!campos.recurso_id) return "Debes elegir un recurso.";
  if (!campos.fecha_inicio_asignacion) return "La fecha de inicio es obligatoria.";
  if (campos.porcentaje_dedicacion < 0 || campos.porcentaje_dedicacion > 100) {
    return "El porcentaje de dedicación debe estar entre 0 y 100.";
  }
  return null;
}

export async function crearAsignacionRecurso(formData: FormData): Promise<ResultadoAccion> {
  const { usuario, error } = await requerirPermiso("crear", "asignacion_recursos");
  if (!usuario) return { ok: false, error: error! };

  const campos = camposAsignacionRecursoDesdeFormData(formData);
  const errorValidacion = validarCamposAsignacionRecurso(campos);
  if (errorValidacion) return { ok: false, error: errorValidacion };

  const fila: TablesInsert<"asignacion_recursos"> = { ...campos };

  const supabase = createClient(cookies());
  const { error: errorDb } = await supabase.from("asignacion_recursos").insert(fila);
  if (errorDb) return { ok: false, error: errorDb.message };

  revalidatePath(RUTA);
  return { ok: true };
}

export async function actualizarAsignacionRecurso(id: string, formData: FormData): Promise<ResultadoAccion> {
  const { usuario, error } = await requerirPermiso("editar", "asignacion_recursos");
  if (!usuario) return { ok: false, error: error! };

  const campos = camposAsignacionRecursoDesdeFormData(formData);
  const errorValidacion = validarCamposAsignacionRecurso(campos);
  if (errorValidacion) return { ok: false, error: errorValidacion };

  const cambios: TablesUpdate<"asignacion_recursos"> = { ...campos };

  const supabase = createClient(cookies());
  const { error: errorDb } = await supabase.from("asignacion_recursos").update(cambios).eq("id", id);
  if (errorDb) return { ok: false, error: errorDb.message };

  revalidatePath(RUTA);
  return { ok: true };
}

// =============================================================================
// Disponibilidad de recursos
// =============================================================================

export async function crearDisponibilidad(formData: FormData): Promise<ResultadoAccion> {
  const { usuario, error } = await requerirPermiso("crear", "asignacion_recursos");
  if (!usuario) return { ok: false, error: error! };

  const recursoId = String(formData.get("recurso_id") ?? "").trim();
  const fecha = String(formData.get("fecha") ?? "").trim();
  const horasDisponibles = numeroOpcional(formData.get("horas_disponibles")) ?? 8;

  if (!recursoId) return { ok: false, error: "Debes elegir un recurso." };
  if (!fecha) return { ok: false, error: "La fecha es obligatoria." };
  if (horasDisponibles < 0 || horasDisponibles > 24) return { ok: false, error: "Las horas disponibles deben estar entre 0 y 24." };

  const fila: TablesInsert<"disponibilidad_recursos"> = { recurso_id: recursoId, fecha, horas_disponibles: horasDisponibles };

  const supabase = createClient(cookies());
  const { error: errorDb } = await supabase.from("disponibilidad_recursos").insert(fila);
  if (errorDb) {
    const mensaje = errorDb.message.includes("duplicate key")
      ? "Ese recurso ya tiene disponibilidad registrada para esa fecha."
      : errorDb.message;
    return { ok: false, error: mensaje };
  }

  revalidatePath(RUTA);
  return { ok: true };
}

export async function actualizarDisponibilidad(id: string, horasDisponibles: number): Promise<ResultadoAccion> {
  const { usuario, error } = await requerirPermiso("editar", "asignacion_recursos");
  if (!usuario) return { ok: false, error: error! };

  if (horasDisponibles < 0 || horasDisponibles > 24) return { ok: false, error: "Las horas disponibles deben estar entre 0 y 24." };

  const supabase = createClient(cookies());
  const { error: errorDb } = await supabase
    .from("disponibilidad_recursos")
    .update({ horas_disponibles: horasDisponibles })
    .eq("id", id);
  if (errorDb) return { ok: false, error: errorDb.message };

  revalidatePath(RUTA);
  return { ok: true };
}

export async function eliminarDisponibilidad(id: string): Promise<ResultadoAccion> {
  const { usuario, error } = await requerirPermiso("eliminar", "asignacion_recursos");
  if (!usuario) return { ok: false, error: error! };

  const supabase = createClient(cookies());
  const { error: errorDb } = await supabase.from("disponibilidad_recursos").delete().eq("id", id);
  if (errorDb) return { ok: false, error: errorDb.message };

  revalidatePath(RUTA);
  return { ok: true };
}

// =============================================================================
// Rentabilidad
// =============================================================================

// Los montos de este snapshot NO vienen del formulario (excepto "otros_costos",
// un ajuste manual que la vista no puede calcular): se leen de
// fn_listar_rentabilidad_proyectos(), la función SECURITY DEFINER que expone
// vista_rentabilidad_proyecto ya filtrada por empresa y permiso (migración
// 20260825000017_fix_vista_rentabilidad_rls.sql — la vista por sí sola no
// respeta RLS multiempresa, ver bitácora de incidentes). Confiar en el
// formulario para estos números permitiría a cualquiera con permiso de
// "crear" en rentabilidad registrar una cifra de rentabilidad falsa.
export async function generarSnapshotRentabilidad(proyectoId: string, formData: FormData): Promise<ResultadoAccion> {
  const { usuario, error } = await requerirPermiso("crear", "rentabilidad");
  if (!usuario) return { ok: false, error: error! };

  const otrosCostos = numeroOpcional(formData.get("otros_costos")) ?? 0;
  if (otrosCostos < 0) return { ok: false, error: "Otros costos no puede ser negativo." };

  const supabase = createClient(cookies());

  const { data: filas, error: errorRpc } = await supabase.rpc("fn_listar_rentabilidad_proyectos");
  if (errorRpc) return { ok: false, error: errorRpc.message };

  const fila = (filas ?? []).find((f) => f.proyecto_id === proyectoId);
  if (!fila) return { ok: false, error: "No se encontró información de rentabilidad para este proyecto." };

  const ingresoReconocido = fila.presupuesto_ingreso_total ?? 0;
  const costoManoObra = fila.costo_mano_obra ?? 0;
  const costoSubcontratacion = fila.costo_subcontratacion ?? 0;
  const costoLicencias = fila.costo_licencias ?? 0;
  const costoTotal = costoManoObra + costoSubcontratacion + costoLicencias + otrosCostos;
  const margenBruto = redondear2(ingresoReconocido - costoTotal);
  const margenPct = ingresoReconocido > 0 ? redondear2((margenBruto / ingresoReconocido) * 100) : 0;

  const fila2: TablesInsert<"rentabilidad_snapshots"> = {
    proyecto_id: proyectoId,
    fecha_corte: new Date().toISOString().slice(0, 10),
    ingreso_reconocido: ingresoReconocido,
    costo_mano_obra: costoManoObra,
    costo_subcontratacion: costoSubcontratacion,
    costo_licencias: costoLicencias,
    otros_costos: otrosCostos,
    margen_bruto: margenBruto,
    margen_pct: margenPct,
    tipo_snapshot: "MANUAL",
    generado_por: usuario.id,
  };

  const { error: errorDb } = await supabase.from("rentabilidad_snapshots").insert(fila2);
  if (errorDb) return { ok: false, error: errorDb.message };

  revalidatePath(RUTA);
  return { ok: true };
}

// =============================================================================
// Change Requests
// =============================================================================

function camposChangeRequestDesdeFormData(formData: FormData) {
  return {
    proyecto_id: String(formData.get("proyecto_id") ?? "").trim(),
    titulo: String(formData.get("titulo") ?? "").trim(),
    descripcion_cambio: String(formData.get("descripcion_cambio") ?? "").trim(),
    tipo_cambio: String(formData.get("tipo_cambio") ?? "").trim(),
    justificacion: textoOpcional(formData.get("justificacion")),
    impacto_horas: numeroOpcional(formData.get("impacto_horas")),
    impacto_costo: numeroOpcional(formData.get("impacto_costo")),
    impacto_valor_contrato: numeroOpcional(formData.get("impacto_valor_contrato")),
    impacto_fecha_fin_dias: numeroOpcional(formData.get("impacto_fecha_fin_dias")),
    solicitado_por_usuario_id: String(formData.get("solicitado_por_usuario_id") ?? "").trim(),
    fecha_solicitud: String(formData.get("fecha_solicitud") || new Date().toISOString().slice(0, 10)),
    aprobador_interno_id: textoOpcional(formData.get("aprobador_interno_id")),
    documento_addenda_url: textoOpcional(formData.get("documento_addenda_url")),
  };
}

function validarCamposChangeRequest(campos: ReturnType<typeof camposChangeRequestDesdeFormData>): string | null {
  if (!campos.proyecto_id) return "Debes elegir un proyecto.";
  if (!campos.titulo) return "El título es obligatorio.";
  if (!campos.descripcion_cambio) return "La descripción del cambio es obligatoria.";
  if (!campos.tipo_cambio) return "Debes elegir un tipo de cambio.";
  if (!campos.solicitado_por_usuario_id) return "Debes elegir quién solicita el cambio.";
  if (!campos.fecha_solicitud) return "La fecha de solicitud es obligatoria.";
  return null;
}

async function obtenerChangeRequestConEstado(
  supabase: ReturnType<typeof createClient>,
  id: string
): Promise<{ estado_id: string; codigo_estado: string } | null> {
  const { data } = await supabase
    .from("change_requests")
    .select("estado_id, estados_ciclo_vida(codigo_estado)")
    .eq("id", id)
    .maybeSingle();
  if (!data) return null;
  const estado = data.estados_ciclo_vida as unknown as { codigo_estado: string } | null;
  return { estado_id: data.estado_id, codigo_estado: estado?.codigo_estado ?? "" };
}

export async function crearChangeRequest(formData: FormData): Promise<ResultadoConId> {
  const { usuario, error } = await requerirPermiso("crear", "change_requests");
  if (!usuario) return { ok: false, error: error! };

  const campos = camposChangeRequestDesdeFormData(formData);
  const errorValidacion = validarCamposChangeRequest(campos);
  if (errorValidacion) return { ok: false, error: errorValidacion };

  const supabase = createClient(cookies());

  const { data: proyecto, error: errorProyecto } = await supabase
    .from("proyectos")
    .select("contrato_id")
    .eq("id", campos.proyecto_id)
    .maybeSingle();
  if (errorProyecto || !proyecto) return { ok: false, error: "No se pudo encontrar el contrato asociado al proyecto." };

  const { data: estadoInicial, error: errorEstado } = await supabase
    .from("estados_ciclo_vida")
    .select("id")
    .eq("empresa_id", usuario.perfil.empresa_id)
    .eq("entidad_aplicable", "CHANGE_REQUEST")
    .eq("es_estado_inicial", true)
    .maybeSingle();
  if (errorEstado || !estadoInicial) {
    return { ok: false, error: "No se encontró el estado inicial del flujo de change requests para tu empresa." };
  }

  const { data: numero, error: errorConsecutivo } = await supabase.rpc("fn_generar_consecutivo", {
    p_codigo_secuencia: "CHANGE_REQUEST",
    p_empresa_id: usuario.perfil.empresa_id,
  });
  if (errorConsecutivo || !numero) {
    return {
      ok: false,
      error: `No se pudo generar el número del change request: ${errorConsecutivo?.message ?? "error desconocido"}.`,
    };
  }

  const fila: TablesInsert<"change_requests"> = {
    ...campos,
    contrato_id: proyecto.contrato_id,
    numero_cr: numero,
    estado_id: estadoInicial.id,
  };

  const { data: creado, error: errorDb } = await supabase.from("change_requests").insert(fila).select("id").single();
  if (errorDb || !creado) return { ok: false, error: errorDb?.message ?? "No se pudo crear el change request." };

  revalidatePath(RUTA);
  return { ok: true, id: creado.id };
}

export async function actualizarChangeRequest(id: string, formData: FormData): Promise<ResultadoAccion> {
  const { usuario, error } = await requerirPermiso("editar", "change_requests");
  if (!usuario) return { ok: false, error: error! };

  const campos = camposChangeRequestDesdeFormData(formData);
  const errorValidacion = validarCamposChangeRequest(campos);
  if (errorValidacion) return { ok: false, error: errorValidacion };

  // proyecto_id (y por lo tanto contrato_id) no se puede reasignar después de
  // creado: cambiar de proyecto un change request ya numerado no tiene sentido
  // de negocio, así que se excluye del update aunque venga en el formulario.
  const { proyecto_id: _proyectoId, ...cambios } = campos;
  void _proyectoId;

  const supabase = createClient(cookies());
  const { error: errorDb } = await supabase
    .from("change_requests")
    .update(cambios as TablesUpdate<"change_requests">)
    .eq("id", id);
  if (errorDb) return { ok: false, error: errorDb.message };

  revalidatePath(RUTA);
  return { ok: true };
}

export async function cambiarEstadoChangeRequest(
  id: string,
  estadoDestinoId: string,
  comentario: string | null
): Promise<ResultadoAccion> {
  const { usuario, error } = await requerirPermiso("editar", "change_requests");
  if (!usuario) return { ok: false, error: error! };

  const supabase = createClient(cookies());

  const cr = await obtenerChangeRequestConEstado(supabase, id);
  if (!cr) return { ok: false, error: "El change request no existe." };

  const { data: transicion } = await supabase
    .from("workflows_transiciones")
    .select(
      "id, requiere_comentario, estados_destino:estados_ciclo_vida!workflows_transiciones_estado_destino_id_fkey(codigo_estado)"
    )
    .eq("entidad_aplicable", "CHANGE_REQUEST")
    .eq("estado_origen_id", cr.estado_id)
    .eq("estado_destino_id", estadoDestinoId)
    .maybeSingle();

  if (!transicion) {
    return { ok: false, error: "Esta transición no está permitida desde el estado actual del change request." };
  }

  const destino = transicion.estados_destino as unknown as { codigo_estado: string } | null;
  const codigoDestino = destino?.codigo_estado ?? "";

  const comentarioLimpio = comentario?.trim() || null;
  if (transicion.requiere_comentario && !comentarioLimpio) {
    return { ok: false, error: "Este cambio de estado requiere que expliques el motivo en un comentario." };
  }

  const cambios: TablesUpdate<"change_requests"> = { estado_id: estadoDestinoId };
  if (codigoDestino === "APROBADO_CLIENTE") cambios.fecha_aprobacion_cliente = new Date().toISOString();
  if (codigoDestino === "IMPLEMENTADO") cambios.fecha_efectiva = new Date().toISOString().slice(0, 10);

  const { error: errorDb } = await supabase.from("change_requests").update(cambios).eq("id", id);
  if (errorDb) return { ok: false, error: errorDb.message };

  await supabase.from("workflows_historial").insert({
    entidad_tipo: "CHANGE_REQUEST",
    entidad_id: id,
    estado_anterior: cr.codigo_estado || null,
    estado_nuevo: codigoDestino,
    usuario_id: usuario.id,
    comentario: comentarioLimpio,
  });

  // Alerta: no bloquea la respuesta si falla — ver contrato de dispararAlerta().
  if (codigoDestino === "APROBADO_CLIENTE") {
    const { data: detalle } = await supabase
      .from("change_requests")
      .select("numero_cr, titulo, proyecto_id, contrato_id, proyectos(numero_proyecto), contratos(cuenta_id)")
      .eq("id", id)
      .maybeSingle();
    if (detalle) {
      await dispararAlerta({
        empresaId: usuario.perfil.empresa_id,
        eventoDisparador: "CHANGE_REQUEST_APROBADO_CLIENTE",
        entidadTipo: "CHANGE_REQUEST",
        entidadId: id,
        proyectoId: detalle.proyecto_id,
        cuentaId: (detalle as any).contratos?.cuenta_id ?? null,
        variables: {
          numero_cr: detalle.numero_cr,
          titulo: detalle.titulo,
          numero_proyecto: (detalle as any).proyectos?.numero_proyecto ?? "",
        },
      });
    }
  }

  revalidatePath(RUTA);
  return { ok: true };
}

// =============================================================================
// Facturas (referencia externa)
// =============================================================================

function camposFacturaReferenciaExternaDesdeFormData(formData: FormData) {
  return {
    proyecto_id: textoOpcional(formData.get("proyecto_id")),
    contrato_id: textoOpcional(formData.get("contrato_id")),
    numero_factura_externa: String(formData.get("numero_factura_externa") ?? "").trim(),
    sistema_origen: String(formData.get("sistema_origen") ?? "").trim(),
    fecha_emision: String(formData.get("fecha_emision") ?? "").trim(),
    fecha_vencimiento_pago: textoOpcional(formData.get("fecha_vencimiento_pago")),
    moneda_id: String(formData.get("moneda_id") ?? "").trim(),
    monto_subtotal: numeroOpcional(formData.get("monto_subtotal")),
    monto_impuestos: numeroOpcional(formData.get("monto_impuestos")),
    monto_total: numeroOpcional(formData.get("monto_total")) ?? 0,
    estado_pago: String(formData.get("estado_pago") || "PENDIENTE"),
    monto_pagado_acumulado: numeroOpcional(formData.get("monto_pagado_acumulado")),
    fecha_ultimo_pago: textoOpcional(formData.get("fecha_ultimo_pago")),
    hito_asociado_id: textoOpcional(formData.get("hito_asociado_id")),
    adjunto_url: textoOpcional(formData.get("adjunto_url")),
    notas: textoOpcional(formData.get("notas")),
  };
}

function validarCamposFacturaReferenciaExterna(
  campos: ReturnType<typeof camposFacturaReferenciaExternaDesdeFormData>
): string | null {
  if (!campos.proyecto_id && !campos.contrato_id) return "Debes elegir un proyecto o un contrato.";
  if (!campos.numero_factura_externa) return "El número de factura externa es obligatorio.";
  if (!campos.sistema_origen) return "El sistema de origen es obligatorio.";
  if (!campos.fecha_emision) return "La fecha de emisión es obligatoria.";
  if (!campos.moneda_id) return "Debes elegir una moneda.";
  if (campos.monto_total <= 0) return "El monto total debe ser mayor a 0.";
  return null;
}

// metodo_registro queda fijo en 'MANUAL' desde esta pantalla a propósito: no
// existe ninguna integración real todavía que registre facturas por API (ver
// Configuración → Integraciones, Checkpoint 4), así que 'API' no es una opción
// del formulario, solo un valor que el esquema deja reservado para el futuro.
export async function crearFacturaReferenciaExterna(formData: FormData): Promise<ResultadoAccion> {
  const { usuario, error } = await requerirPermiso("crear", "facturas_referencia_externa");
  if (!usuario) return { ok: false, error: error! };

  const campos = camposFacturaReferenciaExternaDesdeFormData(formData);
  const errorValidacion = validarCamposFacturaReferenciaExterna(campos);
  if (errorValidacion) return { ok: false, error: errorValidacion };

  const fila: TablesInsert<"facturas_referencia_externa"> = {
    ...campos,
    metodo_registro: "MANUAL",
    registrado_por_usuario_id: usuario.id,
  };

  const supabase = createClient(cookies());
  const { error: errorDb } = await supabase.from("facturas_referencia_externa").insert(fila);
  if (errorDb) return { ok: false, error: errorDb.message };

  revalidatePath(RUTA);
  return { ok: true };
}

export async function actualizarFacturaReferenciaExterna(id: string, formData: FormData): Promise<ResultadoAccion> {
  const { usuario, error } = await requerirPermiso("editar", "facturas_referencia_externa");
  if (!usuario) return { ok: false, error: error! };

  const campos = camposFacturaReferenciaExternaDesdeFormData(formData);
  const errorValidacion = validarCamposFacturaReferenciaExterna(campos);
  if (errorValidacion) return { ok: false, error: errorValidacion };

  const cambios: TablesUpdate<"facturas_referencia_externa"> = { ...campos };

  const supabase = createClient(cookies());
  const { error: errorDb } = await supabase.from("facturas_referencia_externa").update(cambios).eq("id", id);
  if (errorDb) return { ok: false, error: errorDb.message };

  revalidatePath(RUTA);
  return { ok: true };
}

// =============================================================================
// Casos de soporte (referencia externa)
// =============================================================================

function camposCasoSoporteReferenciaExternaDesdeFormData(formData: FormData) {
  return {
    proyecto_id: textoOpcional(formData.get("proyecto_id")),
    contrato_id: textoOpcional(formData.get("contrato_id")),
    numero_ticket_externo: String(formData.get("numero_ticket_externo") ?? "").trim(),
    sistema_origen: String(formData.get("sistema_origen") ?? "").trim(),
    asunto: String(formData.get("asunto") ?? "").trim(),
    descripcion_breve: textoOpcional(formData.get("descripcion_breve")),
    fecha_apertura: String(formData.get("fecha_apertura") ?? "").trim(),
    fecha_cierre: textoOpcional(formData.get("fecha_cierre")),
    estado: String(formData.get("estado") || "ABIERTO"),
    prioridad: textoOpcional(formData.get("prioridad")),
    categoria: textoOpcional(formData.get("categoria")),
    horas_consumidas: numeroOpcional(formData.get("horas_consumidas")),
    sla_incumplido: formData.get("sla_incumplido") === "true",
    es_cubierto_garantia: formData.get("es_cubierto_garantia") === "true",
    notas: textoOpcional(formData.get("notas")),
  };
}

function validarCamposCasoSoporteReferenciaExterna(
  campos: ReturnType<typeof camposCasoSoporteReferenciaExternaDesdeFormData>
): string | null {
  if (!campos.proyecto_id && !campos.contrato_id) return "Debes elegir un proyecto o un contrato.";
  if (!campos.numero_ticket_externo) return "El número de ticket externo es obligatorio.";
  if (!campos.sistema_origen) return "El sistema de origen es obligatorio.";
  if (!campos.asunto) return "El asunto es obligatorio.";
  if (!campos.fecha_apertura) return "La fecha de apertura es obligatoria.";
  return null;
}

export async function crearCasoSoporteReferenciaExterna(formData: FormData): Promise<ResultadoAccion> {
  const { usuario, error } = await requerirPermiso("crear", "casos_soporte_referencia_externa");
  if (!usuario) return { ok: false, error: error! };

  const campos = camposCasoSoporteReferenciaExternaDesdeFormData(formData);
  const errorValidacion = validarCamposCasoSoporteReferenciaExterna(campos);
  if (errorValidacion) return { ok: false, error: errorValidacion };

  const fila: TablesInsert<"casos_soporte_referencia_externa"> = {
    ...campos,
    metodo_registro: "MANUAL",
    registrado_por_usuario_id: usuario.id,
  };

  const supabase = createClient(cookies());
  const { error: errorDb } = await supabase.from("casos_soporte_referencia_externa").insert(fila);
  if (errorDb) return { ok: false, error: errorDb.message };

  revalidatePath(RUTA);
  return { ok: true };
}

export async function actualizarCasoSoporteReferenciaExterna(id: string, formData: FormData): Promise<ResultadoAccion> {
  const { usuario, error } = await requerirPermiso("editar", "casos_soporte_referencia_externa");
  if (!usuario) return { ok: false, error: error! };

  const campos = camposCasoSoporteReferenciaExternaDesdeFormData(formData);
  const errorValidacion = validarCamposCasoSoporteReferenciaExterna(campos);
  if (errorValidacion) return { ok: false, error: errorValidacion };

  const cambios: TablesUpdate<"casos_soporte_referencia_externa"> = { ...campos };

  const supabase = createClient(cookies());
  const { error: errorDb } = await supabase.from("casos_soporte_referencia_externa").update(cambios).eq("id", id);
  if (errorDb) return { ok: false, error: errorDb.message };

  revalidatePath(RUTA);
  return { ok: true };
}
