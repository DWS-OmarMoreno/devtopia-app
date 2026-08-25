"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { getUsuarioActual, usuarioTienePermiso } from "@/lib/auth/getUsuarioActual";
import type { Accion } from "@/lib/rbac";
import type { TablesInsert, TablesUpdate } from "@/utils/database.types";

export type ResultadoAccion = { ok: true } | { ok: false; error: string };

const RUTA = "/productos-servicios";

/**
 * Todas las acciones de este módulo comparten el mismo patrón: permiso a
 * nivel de módulo (la matriz `permisos` seed no define sublistas específicas
 * para PRODUCTOS_SERVICIOS todavía — ver seed.sql — así que el chequeo aquí
 * y las políticas RLS generadas por fn_crear_politicas_rls() coinciden). Se
 * pasa `sublista` de todas formas (mismo valor que usa la política RLS de
 * cada tabla) para que si en el futuro se agrega una fila específica en la
 * matriz, este chequeo del lado UI la respete sin cambios de código.
 */
async function requerirPermiso(accion: Accion, sublista: string | null) {
  const usuario = await getUsuarioActual();
  if (!usuarioTienePermiso(usuario, "PRODUCTOS_SERVICIOS", accion, sublista ?? undefined)) {
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

// =============================================================================
// Categorías de servicio
// =============================================================================

export async function crearCategoria(formData: FormData): Promise<ResultadoAccion> {
  const { usuario, error } = await requerirPermiso("crear", null);
  if (!usuario) return { ok: false, error: error! };

  const fila: TablesInsert<"categorias_servicio"> = {
    empresa_id: usuario.perfil.empresa_id,
    nombre: String(formData.get("nombre") ?? "").trim(),
    descripcion: textoOpcional(formData.get("descripcion")),
    categoria_padre_id: textoOpcional(formData.get("categoria_padre_id")),
  };

  if (!fila.nombre) return { ok: false, error: "El nombre es obligatorio." };

  const supabase = createClient(cookies());
  const { error: errorDb } = await supabase.from("categorias_servicio").insert(fila);
  if (errorDb) return { ok: false, error: errorDb.message };

  revalidatePath(RUTA);
  return { ok: true };
}

export async function actualizarCategoria(id: string, formData: FormData): Promise<ResultadoAccion> {
  const { usuario, error } = await requerirPermiso("editar", null);
  if (!usuario) return { ok: false, error: error! };

  const cambios: TablesUpdate<"categorias_servicio"> = {
    nombre: String(formData.get("nombre") ?? "").trim(),
    descripcion: textoOpcional(formData.get("descripcion")),
    categoria_padre_id: textoOpcional(formData.get("categoria_padre_id")),
  };

  if (cambios.categoria_padre_id === id) {
    return { ok: false, error: "Una categoría no puede ser su propia categoría padre." };
  }
  if (!cambios.nombre) return { ok: false, error: "El nombre es obligatorio." };

  const supabase = createClient(cookies());
  const { error: errorDb } = await supabase.from("categorias_servicio").update(cambios).eq("id", id);
  if (errorDb) return { ok: false, error: errorDb.message };

  revalidatePath(RUTA);
  return { ok: true };
}

export async function cambiarEstadoCategoria(id: string, activo: boolean): Promise<ResultadoAccion> {
  const { usuario, error } = await requerirPermiso("editar", null);
  if (!usuario) return { ok: false, error: error! };

  const supabase = createClient(cookies());
  const { error: errorDb } = await supabase.from("categorias_servicio").update({ activo }).eq("id", id);
  if (errorDb) return { ok: false, error: errorDb.message };

  revalidatePath(RUTA);
  return { ok: true };
}

// =============================================================================
// Roles y tarifa
// =============================================================================

export async function crearRolTarifa(formData: FormData): Promise<ResultadoAccion> {
  const { usuario, error } = await requerirPermiso("crear", "roles_tarifa");
  if (!usuario) return { ok: false, error: error! };

  const tarifaEstandar = numeroOpcional(formData.get("tarifa_hora_estandar"));
  const monedaId = String(formData.get("moneda_id") ?? "").trim();
  const nombreRol = String(formData.get("nombre_rol") ?? "").trim();

  if (!nombreRol) return { ok: false, error: "El nombre del rol es obligatorio." };
  if (tarifaEstandar === null || tarifaEstandar <= 0) {
    return { ok: false, error: "La tarifa estándar debe ser un número mayor a 0." };
  }
  if (!monedaId) return { ok: false, error: "Debes elegir una moneda." };

  const fila: TablesInsert<"catalogo_roles_tarifa"> = {
    empresa_id: usuario.perfil.empresa_id,
    nombre_rol: nombreRol,
    nivel_experiencia: textoOpcional(formData.get("nivel_experiencia")),
    tarifa_hora_estandar: tarifaEstandar,
    tarifa_hora_costo_referencia: numeroOpcional(formData.get("tarifa_hora_costo_referencia")),
    moneda_id: monedaId,
    vigente_desde: String(formData.get("vigente_desde") || new Date().toISOString().slice(0, 10)),
    vigente_hasta: textoOpcional(formData.get("vigente_hasta")),
  };

  const supabase = createClient(cookies());
  const { error: errorDb } = await supabase.from("catalogo_roles_tarifa").insert(fila);
  if (errorDb) return { ok: false, error: errorDb.message };

  revalidatePath(RUTA);
  return { ok: true };
}

export async function actualizarRolTarifa(id: string, formData: FormData): Promise<ResultadoAccion> {
  const { usuario, error } = await requerirPermiso("editar", "roles_tarifa");
  if (!usuario) return { ok: false, error: error! };

  const tarifaEstandar = numeroOpcional(formData.get("tarifa_hora_estandar"));
  if (tarifaEstandar === null || tarifaEstandar <= 0) {
    return { ok: false, error: "La tarifa estándar debe ser un número mayor a 0." };
  }

  const cambios: TablesUpdate<"catalogo_roles_tarifa"> = {
    nombre_rol: String(formData.get("nombre_rol") ?? "").trim(),
    nivel_experiencia: textoOpcional(formData.get("nivel_experiencia")),
    tarifa_hora_estandar: tarifaEstandar,
    tarifa_hora_costo_referencia: numeroOpcional(formData.get("tarifa_hora_costo_referencia")),
    moneda_id: String(formData.get("moneda_id") ?? "").trim(),
    vigente_desde: String(formData.get("vigente_desde") || ""),
    vigente_hasta: textoOpcional(formData.get("vigente_hasta")),
  };

  const supabase = createClient(cookies());
  const { error: errorDb } = await supabase.from("catalogo_roles_tarifa").update(cambios).eq("id", id);
  if (errorDb) return { ok: false, error: errorDb.message };

  revalidatePath(RUTA);
  return { ok: true };
}

export async function cambiarEstadoRolTarifa(id: string, activo: boolean): Promise<ResultadoAccion> {
  const { usuario, error } = await requerirPermiso("editar", "roles_tarifa");
  if (!usuario) return { ok: false, error: error! };

  const supabase = createClient(cookies());
  const { error: errorDb } = await supabase.from("catalogo_roles_tarifa").update({ activo }).eq("id", id);
  if (errorDb) return { ok: false, error: errorDb.message };

  revalidatePath(RUTA);
  return { ok: true };
}

// =============================================================================
// SLA: planes y niveles
// =============================================================================

export async function crearPlanSla(formData: FormData): Promise<ResultadoAccion> {
  const { usuario, error } = await requerirPermiso("crear", "sla");
  if (!usuario) return { ok: false, error: error! };

  const nombre = String(formData.get("nombre") ?? "").trim();
  if (!nombre) return { ok: false, error: "El nombre del plan es obligatorio." };

  const fila: TablesInsert<"sla_planes"> = {
    empresa_id: usuario.perfil.empresa_id,
    nombre,
    descripcion: textoOpcional(formData.get("descripcion")),
  };

  const supabase = createClient(cookies());
  const { error: errorDb } = await supabase.from("sla_planes").insert(fila);
  if (errorDb) return { ok: false, error: errorDb.message };

  revalidatePath(RUTA);
  return { ok: true };
}

export async function actualizarPlanSla(id: string, formData: FormData): Promise<ResultadoAccion> {
  const { usuario, error } = await requerirPermiso("editar", "sla");
  if (!usuario) return { ok: false, error: error! };

  const cambios: TablesUpdate<"sla_planes"> = {
    nombre: String(formData.get("nombre") ?? "").trim(),
    descripcion: textoOpcional(formData.get("descripcion")),
  };
  if (!cambios.nombre) return { ok: false, error: "El nombre del plan es obligatorio." };

  const supabase = createClient(cookies());
  const { error: errorDb } = await supabase.from("sla_planes").update(cambios).eq("id", id);
  if (errorDb) return { ok: false, error: errorDb.message };

  revalidatePath(RUTA);
  return { ok: true };
}

export async function cambiarEstadoPlanSla(id: string, activo: boolean): Promise<ResultadoAccion> {
  const { usuario, error } = await requerirPermiso("editar", "sla");
  if (!usuario) return { ok: false, error: error! };

  const supabase = createClient(cookies());
  const { error: errorDb } = await supabase.from("sla_planes").update({ activo }).eq("id", id);
  if (errorDb) return { ok: false, error: errorDb.message };

  revalidatePath(RUTA);
  return { ok: true };
}

export async function crearNivelSla(slaPlanId: string, formData: FormData): Promise<ResultadoAccion> {
  const { usuario, error } = await requerirPermiso("crear", "sla");
  if (!usuario) return { ok: false, error: error! };

  const tiempoRespuesta = numeroOpcional(formData.get("tiempo_respuesta_horas"));
  const tiempoResolucion = numeroOpcional(formData.get("tiempo_resolucion_horas"));
  const horarioCobertura = String(formData.get("horario_cobertura") ?? "").trim();
  const severidad = String(formData.get("severidad") ?? "").trim();

  if (!severidad) return { ok: false, error: "Debes elegir una severidad." };
  if (tiempoRespuesta === null || tiempoResolucion === null) {
    return { ok: false, error: "Los tiempos de respuesta y resolución son obligatorios." };
  }
  if (!horarioCobertura) return { ok: false, error: "El horario de cobertura es obligatorio." };

  const fila: TablesInsert<"sla_niveles"> = {
    sla_plan_id: slaPlanId,
    severidad,
    tiempo_respuesta_horas: tiempoRespuesta,
    tiempo_resolucion_horas: tiempoResolucion,
    horario_cobertura: horarioCobertura,
    penalizacion_incumplimiento: textoOpcional(formData.get("penalizacion_incumplimiento")),
    penalizacion_pct_credito: numeroOpcional(formData.get("penalizacion_pct_credito")),
  };

  const supabase = createClient(cookies());
  const { error: errorDb } = await supabase.from("sla_niveles").insert(fila);
  if (errorDb) {
    const mensaje = errorDb.message.includes("duplicate key")
      ? `Ese plan ya tiene un nivel definido para la severidad ${severidad}.`
      : errorDb.message;
    return { ok: false, error: mensaje };
  }

  revalidatePath(RUTA);
  return { ok: true };
}

export async function eliminarNivelSla(id: string): Promise<ResultadoAccion> {
  const { usuario, error } = await requerirPermiso("eliminar", "sla");
  if (!usuario) return { ok: false, error: error! };

  const supabase = createClient(cookies());
  const { error: errorDb } = await supabase.from("sla_niveles").delete().eq("id", id);
  if (errorDb) return { ok: false, error: errorDb.message };

  revalidatePath(RUTA);
  return { ok: true };
}

// =============================================================================
// Catálogo de servicios
// =============================================================================

export async function crearServicio(formData: FormData): Promise<ResultadoAccion> {
  const { usuario, error } = await requerirPermiso("crear", null);
  if (!usuario) return { ok: false, error: error! };

  const codigo = String(formData.get("codigo") ?? "").trim();
  const nombre = String(formData.get("nombre") ?? "").trim();
  const tipoServicio = String(formData.get("tipo_servicio") ?? "").trim();
  const unidadMedida = String(formData.get("unidad_medida") ?? "").trim();
  const tarifaEstandar = numeroOpcional(formData.get("tarifa_estandar"));
  const monedaId = String(formData.get("moneda_id") ?? "").trim();

  if (!codigo) return { ok: false, error: "El código es obligatorio." };
  if (!nombre) return { ok: false, error: "El nombre es obligatorio." };
  if (!tipoServicio) return { ok: false, error: "Debes elegir un tipo de servicio." };
  if (!unidadMedida) return { ok: false, error: "Debes elegir una unidad de medida." };
  if (tarifaEstandar === null || tarifaEstandar <= 0) {
    return { ok: false, error: "La tarifa estándar debe ser un número mayor a 0." };
  }
  if (!monedaId) return { ok: false, error: "Debes elegir una moneda." };

  const fila: TablesInsert<"catalogo_servicios"> = {
    empresa_id: usuario.perfil.empresa_id,
    codigo,
    nombre,
    descripcion: textoOpcional(formData.get("descripcion")),
    categoria_id: textoOpcional(formData.get("categoria_id")),
    tipo_servicio: tipoServicio,
    unidad_medida: unidadMedida,
    tarifa_estandar: tarifaEstandar,
    moneda_id: monedaId,
    sla_plan_id: textoOpcional(formData.get("sla_plan_id")),
    requiere_aprobacion_cotizacion: formData.get("requiere_aprobacion_cotizacion") === "true",
    fecha_vigencia_desde: textoOpcional(formData.get("fecha_vigencia_desde")),
    fecha_vigencia_hasta: textoOpcional(formData.get("fecha_vigencia_hasta")),
  };

  const supabase = createClient(cookies());
  const { error: errorDb } = await supabase.from("catalogo_servicios").insert(fila);
  if (errorDb) {
    const mensaje = errorDb.message.includes("duplicate key")
      ? `Ya existe un servicio con el código "${codigo}".`
      : errorDb.message;
    return { ok: false, error: mensaje };
  }

  revalidatePath(RUTA);
  return { ok: true };
}

export async function actualizarServicio(id: string, formData: FormData): Promise<ResultadoAccion> {
  const { usuario, error } = await requerirPermiso("editar", null);
  if (!usuario) return { ok: false, error: error! };

  const tarifaEstandar = numeroOpcional(formData.get("tarifa_estandar"));
  if (tarifaEstandar === null || tarifaEstandar <= 0) {
    return { ok: false, error: "La tarifa estándar debe ser un número mayor a 0." };
  }

  const cambios: TablesUpdate<"catalogo_servicios"> = {
    codigo: String(formData.get("codigo") ?? "").trim(),
    nombre: String(formData.get("nombre") ?? "").trim(),
    descripcion: textoOpcional(formData.get("descripcion")),
    categoria_id: textoOpcional(formData.get("categoria_id")),
    tipo_servicio: String(formData.get("tipo_servicio") ?? "").trim(),
    unidad_medida: String(formData.get("unidad_medida") ?? "").trim(),
    tarifa_estandar: tarifaEstandar,
    moneda_id: String(formData.get("moneda_id") ?? "").trim(),
    sla_plan_id: textoOpcional(formData.get("sla_plan_id")),
    requiere_aprobacion_cotizacion: formData.get("requiere_aprobacion_cotizacion") === "true",
    fecha_vigencia_desde: textoOpcional(formData.get("fecha_vigencia_desde")),
    fecha_vigencia_hasta: textoOpcional(formData.get("fecha_vigencia_hasta")),
  };

  const supabase = createClient(cookies());
  const { error: errorDb } = await supabase.from("catalogo_servicios").update(cambios).eq("id", id);
  if (errorDb) {
    const mensaje = errorDb.message.includes("duplicate key")
      ? `Ya existe un servicio con ese código.`
      : errorDb.message;
    return { ok: false, error: mensaje };
  }

  revalidatePath(RUTA);
  return { ok: true };
}

export async function cambiarEstadoServicio(id: string, activo: boolean): Promise<ResultadoAccion> {
  const { usuario, error } = await requerirPermiso("editar", null);
  if (!usuario) return { ok: false, error: error! };

  const supabase = createClient(cookies());
  const { error: errorDb } = await supabase.from("catalogo_servicios").update({ activo }).eq("id", id);
  if (errorDb) return { ok: false, error: errorDb.message };

  revalidatePath(RUTA);
  return { ok: true };
}

// =============================================================================
// Paquetes de servicios
// =============================================================================

function camposPaqueteDesdeFormData(formData: FormData) {
  return {
    nombre: String(formData.get("nombre") ?? "").trim(),
    descripcion: textoOpcional(formData.get("descripcion")),
    precio_total_paquete: numeroOpcional(formData.get("precio_total_paquete")) ?? 0,
    moneda_id: String(formData.get("moneda_id") ?? "").trim(),
    vigencia_desde: textoOpcional(formData.get("vigencia_desde")),
    vigencia_hasta: textoOpcional(formData.get("vigencia_hasta")),
  };
}

export async function crearPaquete(formData: FormData): Promise<ResultadoAccion> {
  const { usuario, error } = await requerirPermiso("crear", "paquetes");
  if (!usuario) return { ok: false, error: error! };

  const campos = camposPaqueteDesdeFormData(formData);
  if (!campos.nombre) return { ok: false, error: "El nombre es obligatorio." };
  if (campos.precio_total_paquete <= 0) {
    return { ok: false, error: "El precio total del paquete debe ser mayor a 0." };
  }
  if (!campos.moneda_id) return { ok: false, error: "Debes elegir una moneda." };

  const fila: TablesInsert<"paquetes_servicios"> = { ...campos, empresa_id: usuario.perfil.empresa_id };

  const supabase = createClient(cookies());
  const { error: errorDb } = await supabase.from("paquetes_servicios").insert(fila);
  if (errorDb) return { ok: false, error: errorDb.message };

  revalidatePath(RUTA);
  return { ok: true };
}

export async function actualizarPaquete(id: string, formData: FormData): Promise<ResultadoAccion> {
  const { usuario, error } = await requerirPermiso("editar", "paquetes");
  if (!usuario) return { ok: false, error: error! };

  const campos = camposPaqueteDesdeFormData(formData);
  if (!campos.nombre) return { ok: false, error: "El nombre es obligatorio." };
  if (campos.precio_total_paquete <= 0) {
    return { ok: false, error: "El precio total del paquete debe ser mayor a 0." };
  }

  const cambios: TablesUpdate<"paquetes_servicios"> = { ...campos };

  const supabase = createClient(cookies());
  const { error: errorDb } = await supabase.from("paquetes_servicios").update(cambios).eq("id", id);
  if (errorDb) return { ok: false, error: errorDb.message };

  revalidatePath(RUTA);
  return { ok: true };
}

export async function cambiarEstadoPaquete(id: string, activo: boolean): Promise<ResultadoAccion> {
  const { usuario, error } = await requerirPermiso("editar", "paquetes");
  if (!usuario) return { ok: false, error: error! };

  const supabase = createClient(cookies());
  const { error: errorDb } = await supabase.from("paquetes_servicios").update({ activo }).eq("id", id);
  if (errorDb) return { ok: false, error: errorDb.message };

  revalidatePath(RUTA);
  return { ok: true };
}

export async function crearLineaPaquete(paqueteId: string, formData: FormData): Promise<ResultadoAccion> {
  const { usuario, error } = await requerirPermiso("editar", "paquetes");
  if (!usuario) return { ok: false, error: error! };

  const tipoItem = String(formData.get("tipo_item") ?? "").trim();
  const servicioId = textoOpcional(formData.get("servicio_id"));
  const rolTarifaId = textoOpcional(formData.get("rol_tarifa_id"));
  const cantidad = numeroOpcional(formData.get("cantidad"));
  const precioUnitario = numeroOpcional(formData.get("precio_unitario_paquete"));

  if (tipoItem === "SERVICIO" && !servicioId) return { ok: false, error: "Debes elegir un servicio." };
  if (tipoItem === "ROL_TARIFA" && !rolTarifaId) return { ok: false, error: "Debes elegir un rol/tarifa." };
  if (tipoItem !== "SERVICIO" && tipoItem !== "ROL_TARIFA") {
    return { ok: false, error: "Tipo de ítem inválido." };
  }
  if (cantidad === null || cantidad <= 0) return { ok: false, error: "La cantidad debe ser mayor a 0." };
  if (precioUnitario === null || precioUnitario < 0) {
    return { ok: false, error: "El precio unitario dentro del paquete es obligatorio." };
  }

  const { data: ultimaLinea } = await createClient(cookies())
    .from("paquetes_servicios_detalle")
    .select("orden")
    .eq("paquete_id", paqueteId)
    .order("orden", { ascending: false })
    .limit(1)
    .maybeSingle();

  const fila: TablesInsert<"paquetes_servicios_detalle"> = {
    paquete_id: paqueteId,
    servicio_id: tipoItem === "SERVICIO" ? servicioId : null,
    rol_tarifa_id: tipoItem === "ROL_TARIFA" ? rolTarifaId : null,
    cantidad,
    precio_unitario_paquete: precioUnitario,
    orden: (ultimaLinea?.orden ?? 0) + 1,
  };

  const supabase = createClient(cookies());
  const { error: errorDb } = await supabase.from("paquetes_servicios_detalle").insert(fila);
  if (errorDb) return { ok: false, error: errorDb.message };

  revalidatePath(RUTA);
  return { ok: true };
}

export async function eliminarLineaPaquete(id: string): Promise<ResultadoAccion> {
  const { usuario, error } = await requerirPermiso("editar", "paquetes");
  if (!usuario) return { ok: false, error: error! };

  const supabase = createClient(cookies());
  const { error: errorDb } = await supabase.from("paquetes_servicios_detalle").delete().eq("id", id);
  if (errorDb) return { ok: false, error: errorDb.message };

  revalidatePath(RUTA);
  return { ok: true };
}

// =============================================================================
// Licencias y suscripciones
// =============================================================================

function camposLicenciaCatalogoDesdeFormData(formData: FormData) {
  return {
    nombre_producto: String(formData.get("nombre_producto") ?? "").trim(),
    fabricante: textoOpcional(formData.get("fabricante")),
    sku_proveedor: textoOpcional(formData.get("sku_proveedor")),
    tipo: String(formData.get("tipo") ?? "").trim(),
    modelo_costo: String(formData.get("modelo_costo") ?? "").trim(),
    costo_unitario: numeroOpcional(formData.get("costo_unitario")) ?? 0,
    precio_venta_sugerido: numeroOpcional(formData.get("precio_venta_sugerido")),
    moneda_id: String(formData.get("moneda_id") ?? "").trim(),
    periodicidad_facturacion: String(formData.get("periodicidad_facturacion") ?? "").trim(),
    notas: textoOpcional(formData.get("notas")),
  };
}

export async function crearLicenciaCatalogo(formData: FormData): Promise<ResultadoAccion> {
  const { usuario, error } = await requerirPermiso("crear", "licencias");
  if (!usuario) return { ok: false, error: error! };

  const campos = camposLicenciaCatalogoDesdeFormData(formData);
  if (!campos.nombre_producto) return { ok: false, error: "El nombre del producto es obligatorio." };
  if (!campos.tipo) return { ok: false, error: "Debes elegir un tipo de licencia." };
  if (!campos.modelo_costo) return { ok: false, error: "Debes elegir un modelo de costo." };
  if (campos.costo_unitario <= 0) return { ok: false, error: "El costo unitario debe ser mayor a 0." };
  if (!campos.moneda_id) return { ok: false, error: "Debes elegir una moneda." };
  if (!campos.periodicidad_facturacion) return { ok: false, error: "Debes elegir una periodicidad." };

  const fila: TablesInsert<"licencias_suscripciones_catalogo"> = {
    ...campos,
    empresa_id: usuario.perfil.empresa_id,
  };

  const supabase = createClient(cookies());
  const { error: errorDb } = await supabase.from("licencias_suscripciones_catalogo").insert(fila);
  if (errorDb) return { ok: false, error: errorDb.message };

  revalidatePath(RUTA);
  return { ok: true };
}

export async function actualizarLicenciaCatalogo(id: string, formData: FormData): Promise<ResultadoAccion> {
  const { usuario, error } = await requerirPermiso("editar", "licencias");
  if (!usuario) return { ok: false, error: error! };

  const campos = camposLicenciaCatalogoDesdeFormData(formData);
  if (!campos.nombre_producto) return { ok: false, error: "El nombre del producto es obligatorio." };
  if (campos.costo_unitario <= 0) return { ok: false, error: "El costo unitario debe ser mayor a 0." };

  const cambios: TablesUpdate<"licencias_suscripciones_catalogo"> = { ...campos };

  const supabase = createClient(cookies());
  const { error: errorDb } = await supabase.from("licencias_suscripciones_catalogo").update(cambios).eq("id", id);
  if (errorDb) return { ok: false, error: errorDb.message };

  revalidatePath(RUTA);
  return { ok: true };
}

export async function cambiarEstadoLicenciaCatalogo(id: string, activo: boolean): Promise<ResultadoAccion> {
  const { usuario, error } = await requerirPermiso("editar", "licencias");
  if (!usuario) return { ok: false, error: error! };

  const supabase = createClient(cookies());
  const { error: errorDb } = await supabase
    .from("licencias_suscripciones_catalogo")
    .update({ activo })
    .eq("id", id);
  if (errorDb) return { ok: false, error: errorDb.message };

  revalidatePath(RUTA);
  return { ok: true };
}

function camposLicenciaAsignadaDesdeFormData(formData: FormData) {
  return {
    cliente_id: textoOpcional(formData.get("cliente_id")),
    cantidad: Math.trunc(numeroOpcional(formData.get("cantidad")) ?? 0),
    fecha_inicio: String(formData.get("fecha_inicio") ?? "").trim(),
    fecha_fin_vigencia: String(formData.get("fecha_fin_vigencia") ?? "").trim(),
    fecha_renovacion: textoOpcional(formData.get("fecha_renovacion")),
    auto_renovar: formData.get("auto_renovar") === "true",
    estado: String(formData.get("estado") || "ACTIVA"),
    numero_orden_compra_proveedor: textoOpcional(formData.get("numero_orden_compra_proveedor")),
    costo_total_periodo: numeroOpcional(formData.get("costo_total_periodo")),
    precio_venta_periodo: numeroOpcional(formData.get("precio_venta_periodo")),
  };
}

export async function crearLicenciaAsignada(licenciaCatalogoId: string, formData: FormData): Promise<ResultadoAccion> {
  const { usuario, error } = await requerirPermiso("crear", "licencias");
  if (!usuario) return { ok: false, error: error! };

  const campos = camposLicenciaAsignadaDesdeFormData(formData);
  if (campos.cantidad <= 0) return { ok: false, error: "La cantidad debe ser un entero mayor a 0." };
  if (!campos.fecha_inicio) return { ok: false, error: "La fecha de inicio es obligatoria." };
  if (!campos.fecha_fin_vigencia) return { ok: false, error: "La fecha de fin de vigencia es obligatoria." };

  // proyecto_id se deja fuera del formulario a propósito: Contratos y Proyectos
  // todavía no tiene UI que permita elegir un proyecto existente.
  const fila: TablesInsert<"licencias_asignadas"> = {
    ...campos,
    licencia_catalogo_id: licenciaCatalogoId,
  };

  const supabase = createClient(cookies());
  const { error: errorDb } = await supabase.from("licencias_asignadas").insert(fila);
  if (errorDb) return { ok: false, error: errorDb.message };

  revalidatePath(RUTA);
  return { ok: true };
}

export async function actualizarLicenciaAsignada(id: string, formData: FormData): Promise<ResultadoAccion> {
  const { usuario, error } = await requerirPermiso("editar", "licencias");
  if (!usuario) return { ok: false, error: error! };

  const campos = camposLicenciaAsignadaDesdeFormData(formData);
  if (campos.cantidad <= 0) return { ok: false, error: "La cantidad debe ser un entero mayor a 0." };
  if (!campos.fecha_inicio) return { ok: false, error: "La fecha de inicio es obligatoria." };
  if (!campos.fecha_fin_vigencia) return { ok: false, error: "La fecha de fin de vigencia es obligatoria." };

  const cambios: TablesUpdate<"licencias_asignadas"> = { ...campos };

  const supabase = createClient(cookies());
  const { error: errorDb } = await supabase.from("licencias_asignadas").update(cambios).eq("id", id);
  if (errorDb) return { ok: false, error: errorDb.message };

  revalidatePath(RUTA);
  return { ok: true };
}

export async function eliminarLicenciaAsignada(id: string): Promise<ResultadoAccion> {
  const { usuario, error } = await requerirPermiso("eliminar", "licencias");
  if (!usuario) return { ok: false, error: error! };

  const supabase = createClient(cookies());
  const { error: errorDb } = await supabase.from("licencias_asignadas").delete().eq("id", id);
  if (errorDb) return { ok: false, error: errorDb.message };

  revalidatePath(RUTA);
  return { ok: true };
}
