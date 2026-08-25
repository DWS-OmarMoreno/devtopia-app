"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { getUsuarioActual, usuarioTienePermiso } from "@/lib/auth/getUsuarioActual";
import type { TablesUpdate } from "@/utils/database.types";

export type ResultadoAccion = { ok: true } | { ok: false; error: string };

const RUTA = "/configuracion/parametros";

/**
 * Parámetros Globales no tiene una sublista específica en la matriz `permisos`
 * (ver seed.sql) — se controla a nivel de módulo, igual que la política RLS
 * `empresas_update_pol` (fn_tiene_permiso('CONFIGURACION','editar',NULL)).
 */
export async function actualizarParametrosGlobales(
  empresaId: string,
  formData: FormData
): Promise<ResultadoAccion> {
  const usuario = await getUsuarioActual();
  if (!usuarioTienePermiso(usuario, "CONFIGURACION", "editar")) {
    return { ok: false, error: "No tienes permiso para editar los parámetros de la empresa." };
  }

  const texto = (campo: string) => {
    const valor = String(formData.get(campo) ?? "").trim();
    return valor ? valor : null;
  };

  const primerDiaSemana = Number(formData.get("primer_dia_semana"));

  const cambios: TablesUpdate<"empresas"> = {
    razon_social: String(formData.get("razon_social") ?? "").trim(),
    nombre_comercial: texto("nombre_comercial"),
    tipo_identificacion: String(formData.get("tipo_identificacion") ?? "").trim(),
    numero_identificacion: String(formData.get("numero_identificacion") ?? "").trim(),
    digito_verificacion: texto("digito_verificacion"),
    direccion: texto("direccion"),
    ciudad: texto("ciudad"),
    pais: String(formData.get("pais") ?? "").trim(),
    telefono: texto("telefono"),
    email_corporativo: texto("email_corporativo"),
    sitio_web: texto("sitio_web"),
    moneda_principal_id: texto("moneda_principal_id"),
    zona_horaria: String(formData.get("zona_horaria") ?? "").trim(),
    idioma_por_defecto: String(formData.get("idioma_por_defecto") ?? "").trim(),
    formato_fecha: String(formData.get("formato_fecha") ?? "").trim(),
    formato_hora: String(formData.get("formato_hora") ?? "").trim(),
    separador_miles: String(formData.get("separador_miles") ?? "").trim(),
    separador_decimal: String(formData.get("separador_decimal") ?? "").trim(),
    primer_dia_semana: Number.isFinite(primerDiaSemana) ? primerDiaSemana : 0,
    logo_url_claro: texto("logo_url_claro"),
    logo_url_oscuro: texto("logo_url_oscuro"),
    pie_pagina_documentos: texto("pie_pagina_documentos"),
  };

  if (!cambios.razon_social) return { ok: false, error: "La razón social es obligatoria." };
  if (!cambios.pais) return { ok: false, error: "El país es obligatorio." };

  const supabase = createClient(cookies());
  const { error } = await supabase.from("empresas").update(cambios).eq("id", empresaId);
  if (error) return { ok: false, error: error.message };

  revalidatePath(RUTA);
  revalidatePath("/configuracion");
  return { ok: true };
}
