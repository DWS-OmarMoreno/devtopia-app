import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { getUsuarioActual, usuarioTienePermiso } from "@/lib/auth/getUsuarioActual";
import { AccesoDenegado } from "@/components/shared/acceso-denegado";
import { ComprasTabs } from "@/components/compras/compras-tabs";
import type { ProveedorConRelaciones } from "@/components/compras/proveedores-panel";
import type { OrdenCostoConRelaciones } from "@/components/compras/ordenes-costo-panel";
import type { Tables } from "@/utils/database.types";

export default async function ComprasPage() {
  const usuario = await getUsuarioActual();

  if (!usuarioTienePermiso(usuario, "COMPRAS", "leer")) {
    return <AccesoDenegado />;
  }

  const supabase = createClient(cookies());

  const [
    { data: proveedores },
    { data: evaluaciones },
    { data: ordenesCosto },
    { data: proyectos },
    { data: contratos },
    { data: monedas },
    { data: categoriasProveedor },
    { data: estadosOrdenCosto },
    { data: transicionesOrdenCosto },
  ] = await Promise.all([
    supabase.from("proveedores").select("*").is("deleted_at", null).order("razon_social_o_nombre", { ascending: true }),
    supabase.from("evaluaciones_proveedor").select("*").order("fecha_evaluacion", { ascending: false }),
    supabase
      .from("ordenes_costo_subcontratacion")
      .select(
        "*, proveedores(razon_social_o_nombre, numero_proveedor), proyectos(numero_proyecto, nombre_proyecto), contratos(numero_contrato), monedas(codigo_iso), estados_ciclo_vida(codigo_estado, etiqueta, color_ui)"
      )
      .order("fecha_orden", { ascending: false }),
    supabase
      .from("proyectos")
      .select("id, numero_proyecto, nombre_proyecto")
      .is("deleted_at", null)
      .order("numero_proyecto", { ascending: false }),
    supabase
      .from("contratos")
      .select("id, numero_contrato")
      .is("deleted_at", null)
      .order("numero_contrato", { ascending: false }),
    supabase.from("monedas").select("*").eq("activa", true).order("codigo_iso", { ascending: true }),
    supabase
      .from("catalogos_valores")
      .select("*")
      .eq("catalogo", "CATEGORIA_PROVEEDOR")
      .eq("activo", true)
      .order("orden", { ascending: true }),
    supabase
      .from("estados_ciclo_vida")
      .select("*")
      .eq("entidad_aplicable", "ORDEN_COSTO")
      .order("orden", { ascending: true }),
    supabase.from("workflows_transiciones").select("*").eq("entidad_aplicable", "ORDEN_COSTO"),
  ]);

  const puedeCrearProveedor = usuarioTienePermiso(usuario, "COMPRAS", "crear", "proveedores");
  const puedeEditarProveedor = usuarioTienePermiso(usuario, "COMPRAS", "editar", "proveedores");
  const puedeCrearOrdenCosto = usuarioTienePermiso(usuario, "COMPRAS", "crear", "ordenes_costo");
  const puedeEditarOrdenCosto = usuarioTienePermiso(usuario, "COMPRAS", "editar", "ordenes_costo");

  return (
    <div className="my-10 px-4 lg:px-6 max-w-[95rem] mx-auto w-full flex flex-col gap-4">
      <div>
        <h3 className="text-xl font-semibold">Compras y Subcontratación</h3>
        <p className="text-default-500 text-sm">
          Proveedores y freelancers, sus evaluaciones de desempeño, y las órdenes de costo por
          contratación externa asignadas a cada proyecto.
        </p>
      </div>

      <ComprasTabs
        proveedores={(proveedores ?? []) as ProveedorConRelaciones[]}
        evaluaciones={(evaluaciones ?? []) as Tables<"evaluaciones_proveedor">[]}
        ordenesCosto={(ordenesCosto ?? []) as unknown as OrdenCostoConRelaciones[]}
        proyectos={proyectos ?? []}
        contratos={contratos ?? []}
        monedas={monedas ?? []}
        categoriasProveedor={(categoriasProveedor ?? []) as Tables<"catalogos_valores">[]}
        estadosOrdenCosto={(estadosOrdenCosto ?? []) as Tables<"estados_ciclo_vida">[]}
        transicionesOrdenCosto={(transicionesOrdenCosto ?? []) as Tables<"workflows_transiciones">[]}
        puedeCrearProveedor={puedeCrearProveedor}
        puedeEditarProveedor={puedeEditarProveedor}
        puedeCrearOrdenCosto={puedeCrearOrdenCosto}
        puedeEditarOrdenCosto={puedeEditarOrdenCosto}
      />
    </div>
  );
}
