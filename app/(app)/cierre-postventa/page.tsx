import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { getUsuarioActual, usuarioTienePermiso } from "@/lib/auth/getUsuarioActual";
import { AccesoDenegado } from "@/components/shared/acceso-denegado";
import { CierrePostventaTabs } from "@/components/cierre-postventa/cierre-postventa-tabs";
import type { Tables } from "@/utils/database.types";

export default async function CierrePostventaPage() {
  const usuario = await getUsuarioActual();

  if (!usuarioTienePermiso(usuario, "CIERRE_POSTVENTA", "leer")) {
    return <AccesoDenegado />;
  }

  const supabase = createClient(cookies());

  const [
    { data: proyectos },
    { data: contratos },
    { data: usuarios },
    { data: contactos },
    { data: cuentas },
    { data: plantillas },
    { data: plantillaItems },
    { data: checklistsProyecto },
    { data: checklistItems },
    { data: actas },
    { data: garantias },
    { data: garantiaExtensiones },
    { data: casosSoporteGarantia },
  ] = await Promise.all([
    supabase
      .from("proyectos")
      .select("id, numero_proyecto, nombre_proyecto, contrato_id")
      .is("deleted_at", null)
      .order("numero_proyecto", { ascending: false }),
    supabase.from("contratos").select("id, numero_contrato").is("deleted_at", null).order("numero_contrato", { ascending: false }),
    supabase.from("perfiles_usuario").select("id, nombre_completo").order("nombre_completo", { ascending: true }),
    supabase.from("contactos").select("*").eq("es_firmante_autorizado", true),
    supabase.from("cuentas_clientes").select("id, razon_social"),
    supabase.from("checklist_liquidacion_plantillas").select("*").order("nombre", { ascending: true }),
    supabase.from("checklist_liquidacion_plantilla_items").select("*").order("orden", { ascending: true }),
    supabase.from("checklist_liquidacion_proyecto").select("*").order("fecha_inicio_liquidacion", { ascending: false }),
    supabase.from("checklist_liquidacion_items").select("*"),
    supabase.from("actas_cierre").select("*").order("fecha_acta", { ascending: false }),
    supabase.from("garantias_contractuales").select("*").order("fecha_inicio_garantia", { ascending: false }),
    supabase.from("garantia_extensiones").select("*").order("fecha_extension", { ascending: false }),
    supabase
      .from("casos_soporte_referencia_externa")
      .select("*")
      .eq("es_cubierto_garantia", true)
      .order("fecha_apertura", { ascending: false }),
  ]);

  const puedeCrearChecklist = usuarioTienePermiso(usuario, "CIERRE_POSTVENTA", "crear", "checklist");
  const puedeEditarChecklist = usuarioTienePermiso(usuario, "CIERRE_POSTVENTA", "editar", "checklist");
  const puedeEliminarChecklist = usuarioTienePermiso(usuario, "CIERRE_POSTVENTA", "eliminar", "checklist");
  const puedeCrearActa = usuarioTienePermiso(usuario, "CIERRE_POSTVENTA", "crear", "actas_cierre");
  const puedeEditarActa = usuarioTienePermiso(usuario, "CIERRE_POSTVENTA", "editar", "actas_cierre");
  const puedeCrearGarantia = usuarioTienePermiso(usuario, "CIERRE_POSTVENTA", "crear", "garantias");
  const puedeEditarGarantia = usuarioTienePermiso(usuario, "CIERRE_POSTVENTA", "editar", "garantias");

  return (
    <div className="my-10 px-4 lg:px-6 max-w-[95rem] mx-auto w-full flex flex-col gap-4">
      <div>
        <h3 className="text-xl font-semibold">Cierre y Postventa</h3>
        <p className="text-default-500 text-sm">
          Checklist de liquidación de proyectos, actas de cierre con liberación de recursos, y control de
          garantías contractuales.
        </p>
      </div>

      <CierrePostventaTabs
        proyectos={proyectos ?? []}
        contratos={contratos ?? []}
        usuarios={usuarios ?? []}
        contactos={(contactos ?? []) as Tables<"contactos">[]}
        cuentas={cuentas ?? []}
        plantillas={(plantillas ?? []) as Tables<"checklist_liquidacion_plantillas">[]}
        plantillaItems={(plantillaItems ?? []) as Tables<"checklist_liquidacion_plantilla_items">[]}
        checklistsProyecto={(checklistsProyecto ?? []) as Tables<"checklist_liquidacion_proyecto">[]}
        checklistItems={(checklistItems ?? []) as Tables<"checklist_liquidacion_items">[]}
        actas={(actas ?? []) as Tables<"actas_cierre">[]}
        garantias={(garantias ?? []) as Tables<"garantias_contractuales">[]}
        garantiaExtensiones={(garantiaExtensiones ?? []) as Tables<"garantia_extensiones">[]}
        casosSoporteGarantia={(casosSoporteGarantia ?? []) as Tables<"casos_soporte_referencia_externa">[]}
        puedeCrearChecklist={puedeCrearChecklist}
        puedeEditarChecklist={puedeEditarChecklist}
        puedeEliminarChecklist={puedeEliminarChecklist}
        puedeCrearActa={puedeCrearActa}
        puedeEditarActa={puedeEditarActa}
        puedeCrearGarantia={puedeCrearGarantia}
        puedeEditarGarantia={puedeEditarGarantia}
      />
    </div>
  );
}
