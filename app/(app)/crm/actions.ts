"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { getUsuarioActual, usuarioTienePermiso } from "@/lib/auth/getUsuarioActual";
import type { Accion } from "@/lib/rbac";
import type { TablesInsert, TablesUpdate } from "@/utils/database.types";

export type ResultadoAccion = { ok: true } | { ok: false; error: string };

const RUTA = "/crm";

async function requerirPermiso(accion: Accion, sublista: string) {
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

// =============================================================================
// Cuentas de cliente
// =============================================================================

function filaCuentaDesdeFormData(formData: FormData): Omit<TablesInsert<"cuentas_clientes">, "empresa_id"> {
  return {
    razon_social: String(formData.get("razon_social") ?? "").trim(),
    nombre_comercial: textoOpcional(formData.get("nombre_comercial")),
    tipo_identificacion: String(formData.get("tipo_identificacion") ?? "").trim(),
    numero_identificacion: String(formData.get("numero_identificacion") ?? "").trim(),
    cuenta_padre_id: textoOpcional(formData.get("cuenta_padre_id")),
    sector_industria: textoOpcional(formData.get("sector_industria")),
    tamano_empresa: textoOpcional(formData.get("tamano_empresa")),
    sitio_web: textoOpcional(formData.get("sitio_web")),
    direccion_facturacion: textoOpcional(formData.get("direccion_facturacion")),
    ciudad: textoOpcional(formData.get("ciudad")),
    pais: textoOpcional(formData.get("pais")),
    telefono_principal: textoOpcional(formData.get("telefono_principal")),
    email_principal: textoOpcional(formData.get("email_principal")),
    moneda_preferida_id: textoOpcional(formData.get("moneda_preferida_id")),
    ejecutivo_comercial_id: textoOpcional(formData.get("ejecutivo_comercial_id")),
    origen_captacion: textoOpcional(formData.get("origen_captacion")),
    estado: String(formData.get("estado") || "PROSPECTO"),
    notas: textoOpcional(formData.get("notas")),
  };
}

export async function crearCuenta(formData: FormData): Promise<ResultadoAccion> {
  const { usuario, error } = await requerirPermiso("crear", "cuentas");
  if (!usuario) return { ok: false, error: error! };

  const fila = filaCuentaDesdeFormData(formData);
  if (!fila.razon_social) return { ok: false, error: "La razón social es obligatoria." };
  if (!fila.tipo_identificacion || !fila.numero_identificacion) {
    return { ok: false, error: "El tipo y número de identificación son obligatorios." };
  }

  const supabase = createClient(cookies());
  const { error: errorDb } = await supabase
    .from("cuentas_clientes")
    .insert({ ...fila, empresa_id: usuario.perfil.empresa_id, created_by: usuario.id, updated_by: usuario.id });
  if (errorDb) return { ok: false, error: errorDb.message };

  revalidatePath(RUTA);
  return { ok: true };
}

export async function actualizarCuenta(id: string, formData: FormData): Promise<ResultadoAccion> {
  const { usuario, error } = await requerirPermiso("editar", "cuentas");
  if (!usuario) return { ok: false, error: error! };

  const fila = filaCuentaDesdeFormData(formData);
  if (!fila.razon_social) return { ok: false, error: "La razón social es obligatoria." };

  const cambios: TablesUpdate<"cuentas_clientes"> = { ...fila, updated_by: usuario.id };

  const supabase = createClient(cookies());
  const { error: errorDb } = await supabase.from("cuentas_clientes").update(cambios).eq("id", id);
  if (errorDb) return { ok: false, error: errorDb.message };

  revalidatePath(RUTA);
  return { ok: true };
}

export async function cambiarEstadoCuenta(id: string, estado: string): Promise<ResultadoAccion> {
  const { usuario, error } = await requerirPermiso("editar", "cuentas");
  if (!usuario) return { ok: false, error: error! };

  const supabase = createClient(cookies());
  const { error: errorDb } = await supabase
    .from("cuentas_clientes")
    .update({ estado, updated_by: usuario.id })
    .eq("id", id);
  if (errorDb) return { ok: false, error: errorDb.message };

  revalidatePath(RUTA);
  return { ok: true };
}

// =============================================================================
// Contactos (anidados bajo una cuenta)
// =============================================================================

export async function crearContacto(cuentaId: string, formData: FormData): Promise<ResultadoAccion> {
  const { usuario, error } = await requerirPermiso("crear", "contactos");
  if (!usuario) return { ok: false, error: error! };

  const nombre = String(formData.get("nombre") ?? "").trim();
  if (!nombre) return { ok: false, error: "El nombre es obligatorio." };

  const fila: TablesInsert<"contactos"> = {
    cuenta_id: cuentaId,
    nombre,
    apellido: textoOpcional(formData.get("apellido")),
    cargo: textoOpcional(formData.get("cargo")),
    email: textoOpcional(formData.get("email")),
    telefono: textoOpcional(formData.get("telefono")),
    celular: textoOpcional(formData.get("celular")),
    canal_preferido: textoOpcional(formData.get("canal_preferido")),
    es_contacto_principal: formData.get("es_contacto_principal") === "true",
    es_firmante_autorizado: formData.get("es_firmante_autorizado") === "true",
    notas: textoOpcional(formData.get("notas")),
  };

  const supabase = createClient(cookies());
  const { error: errorDb } = await supabase.from("contactos").insert(fila);
  if (errorDb) return { ok: false, error: errorDb.message };

  revalidatePath(RUTA);
  return { ok: true };
}

export async function actualizarContacto(id: string, formData: FormData): Promise<ResultadoAccion> {
  const { usuario, error } = await requerirPermiso("editar", "contactos");
  if (!usuario) return { ok: false, error: error! };

  const nombre = String(formData.get("nombre") ?? "").trim();
  if (!nombre) return { ok: false, error: "El nombre es obligatorio." };

  const cambios: TablesUpdate<"contactos"> = {
    nombre,
    apellido: textoOpcional(formData.get("apellido")),
    cargo: textoOpcional(formData.get("cargo")),
    email: textoOpcional(formData.get("email")),
    telefono: textoOpcional(formData.get("telefono")),
    celular: textoOpcional(formData.get("celular")),
    canal_preferido: textoOpcional(formData.get("canal_preferido")),
    es_contacto_principal: formData.get("es_contacto_principal") === "true",
    es_firmante_autorizado: formData.get("es_firmante_autorizado") === "true",
    notas: textoOpcional(formData.get("notas")),
  };

  const supabase = createClient(cookies());
  const { error: errorDb } = await supabase.from("contactos").update(cambios).eq("id", id);
  if (errorDb) return { ok: false, error: errorDb.message };

  revalidatePath(RUTA);
  return { ok: true };
}

export async function cambiarEstadoContacto(id: string, activo: boolean): Promise<ResultadoAccion> {
  const { usuario, error } = await requerirPermiso("editar", "contactos");
  if (!usuario) return { ok: false, error: error! };

  const supabase = createClient(cookies());
  const { error: errorDb } = await supabase.from("contactos").update({ activo }).eq("id", id);
  if (errorDb) return { ok: false, error: errorDb.message };

  revalidatePath(RUTA);
  return { ok: true };
}

// =============================================================================
// Oportunidades
// =============================================================================

function camposOportunidadDesdeFormData(formData: FormData) {
  return {
    cuenta_id: String(formData.get("cuenta_id") ?? "").trim(),
    contacto_id: textoOpcional(formData.get("contacto_id")),
    nombre_oportunidad: String(formData.get("nombre_oportunidad") ?? "").trim(),
    descripcion: textoOpcional(formData.get("descripcion")),
    etapa: String(formData.get("etapa") || "PROSPECCION"),
    probabilidad_cierre_pct: numeroOpcional(formData.get("probabilidad_cierre_pct")),
    valor_estimado: numeroOpcional(formData.get("valor_estimado")),
    moneda_id: textoOpcional(formData.get("moneda_id")),
    fecha_estimada_cierre: textoOpcional(formData.get("fecha_estimada_cierre")),
    motivo_perdida_id: textoOpcional(formData.get("motivo_perdida_id")),
    motivo_perdida_detalle: textoOpcional(formData.get("motivo_perdida_detalle")),
    origen_oportunidad: textoOpcional(formData.get("origen_oportunidad")),
    ejecutivo_comercial_id: String(formData.get("ejecutivo_comercial_id") ?? "").trim(),
    proxima_accion: textoOpcional(formData.get("proxima_accion")),
    fecha_proxima_accion: textoOpcional(formData.get("fecha_proxima_accion")),
  };
}

export async function crearOportunidad(formData: FormData): Promise<ResultadoAccion> {
  const { usuario, error } = await requerirPermiso("crear", "oportunidades");
  if (!usuario) return { ok: false, error: error! };

  const campos = camposOportunidadDesdeFormData(formData);
  if (!campos.cuenta_id) return { ok: false, error: "Debes elegir una cuenta." };
  if (!campos.nombre_oportunidad) return { ok: false, error: "El nombre de la oportunidad es obligatorio." };
  if (!campos.ejecutivo_comercial_id) return { ok: false, error: "Debes elegir un ejecutivo comercial." };

  const supabase = createClient(cookies());

  const { data: codigo, error: errorConsecutivo } = await supabase.rpc("fn_generar_consecutivo", {
    p_codigo_secuencia: "OPORTUNIDAD",
    p_empresa_id: usuario.perfil.empresa_id,
  });
  if (errorConsecutivo || !codigo) {
    return {
      ok: false,
      error: `No se pudo generar el consecutivo de la oportunidad: ${errorConsecutivo?.message ?? "error desconocido"}.`,
    };
  }

  const fila: TablesInsert<"oportunidades"> = {
    ...campos,
    empresa_id: usuario.perfil.empresa_id,
    codigo,
  };

  const { error: errorDb } = await supabase.from("oportunidades").insert(fila);
  if (errorDb) return { ok: false, error: errorDb.message };

  revalidatePath(RUTA);
  return { ok: true };
}

export async function actualizarOportunidad(id: string, formData: FormData): Promise<ResultadoAccion> {
  const { usuario, error } = await requerirPermiso("editar", "oportunidades");
  if (!usuario) return { ok: false, error: error! };

  const campos = camposOportunidadDesdeFormData(formData);
  if (!campos.nombre_oportunidad) return { ok: false, error: "El nombre de la oportunidad es obligatorio." };

  const cambios: TablesUpdate<"oportunidades"> = { ...campos };
  if (campos.etapa === "GANADA" || campos.etapa === "PERDIDA") {
    cambios.fecha_cierre_real = cambios.fecha_cierre_real ?? new Date().toISOString().slice(0, 10);
  }

  const supabase = createClient(cookies());
  const { error: errorDb } = await supabase.from("oportunidades").update(cambios).eq("id", id);
  if (errorDb) return { ok: false, error: errorDb.message };

  revalidatePath(RUTA);
  return { ok: true };
}

export async function cambiarEtapaOportunidad(id: string, etapa: string): Promise<ResultadoAccion> {
  const { usuario, error } = await requerirPermiso("editar", "oportunidades");
  if (!usuario) return { ok: false, error: error! };

  const cambios: TablesUpdate<"oportunidades"> = { etapa };
  if (etapa === "GANADA" || etapa === "PERDIDA") {
    cambios.fecha_cierre_real = new Date().toISOString().slice(0, 10);
  }

  const supabase = createClient(cookies());
  const { error: errorDb } = await supabase.from("oportunidades").update(cambios).eq("id", id);
  if (errorDb) return { ok: false, error: errorDb.message };

  revalidatePath(RUTA);
  return { ok: true };
}

// =============================================================================
// Seguimiento de oportunidades (bitácora de actividad, append-only)
// =============================================================================

export async function crearSeguimiento(oportunidadId: string, formData: FormData): Promise<ResultadoAccion> {
  const { usuario, error } = await requerirPermiso("crear", "oportunidades");
  if (!usuario) return { ok: false, error: error! };

  const tipoActividad = String(formData.get("tipo_actividad") ?? "").trim();
  const descripcion = String(formData.get("descripcion") ?? "").trim();

  if (!tipoActividad) return { ok: false, error: "Debes elegir un tipo de actividad." };
  if (!descripcion) return { ok: false, error: "La descripción es obligatoria." };

  const fila: TablesInsert<"oportunidades_seguimiento"> = {
    oportunidad_id: oportunidadId,
    tipo_actividad: tipoActividad,
    usuario_id: usuario.id,
    descripcion,
    resultado: textoOpcional(formData.get("resultado")),
  };

  const supabase = createClient(cookies());
  const { error: errorDb } = await supabase.from("oportunidades_seguimiento").insert(fila);
  if (errorDb) return { ok: false, error: errorDb.message };

  revalidatePath(RUTA);
  return { ok: true };
}
