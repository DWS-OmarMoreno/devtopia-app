import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { getUsuarioActual, usuarioTienePermiso } from "@/lib/auth/getUsuarioActual";
import { AccesoDenegado } from "@/components/shared/acceso-denegado";
import { ProductosServiciosTabs } from "@/components/productos-servicios/productos-servicios-tabs";
import type { ServicioConRelaciones } from "@/components/productos-servicios/servicios-panel";

export default async function ProductosServiciosPage() {
  const usuario = await getUsuarioActual();

  if (!usuarioTienePermiso(usuario, "PRODUCTOS_SERVICIOS", "leer")) {
    return <AccesoDenegado />;
  }

  const supabase = createClient(cookies());

  const [
    { data: categorias },
    { data: rolesTarifa },
    { data: planesSla },
    { data: nivelesSla },
    { data: servicios },
    { data: monedas },
    { data: paquetes },
    { data: lineasPaquete },
    { data: licenciasCatalogo },
    { data: licenciasAsignadas },
    { data: cuentas },
  ] = await Promise.all([
    supabase.from("categorias_servicio").select("*").order("nombre", { ascending: true }),
    supabase.from("catalogo_roles_tarifa").select("*").order("nombre_rol", { ascending: true }),
    supabase.from("sla_planes").select("*").order("nombre", { ascending: true }),
    supabase.from("sla_niveles").select("*"),
    supabase
      .from("catalogo_servicios")
      .select("*, categorias_servicio(nombre), sla_planes(nombre)")
      .order("nombre", { ascending: true }),
    supabase.from("monedas").select("*").eq("activa", true).order("codigo_iso", { ascending: true }),
    supabase.from("paquetes_servicios").select("*").order("nombre", { ascending: true }),
    supabase.from("paquetes_servicios_detalle").select("*").order("orden", { ascending: true }),
    supabase
      .from("licencias_suscripciones_catalogo")
      .select("*")
      .order("nombre_producto", { ascending: true }),
    supabase.from("licencias_asignadas").select("*"),
    // fn_listar_cuentas_basico() (migración 015), no un select directo a cuentas_clientes:
    // el selector de cliente de Licencias no debe exigir permisos completos de CRM_VENTAS,
    // así que se usa esta función SECURITY DEFINER que solo expone id + razón social y
    // acepta CRM_VENTAS/leer/cuentas O PRODUCTOS_SERVICIOS/leer/licencias. Ver el comentario
    // en la migración para el detalle completo.
    supabase.rpc("fn_listar_cuentas_basico"),
  ]);

  const puedeCrear = usuarioTienePermiso(usuario, "PRODUCTOS_SERVICIOS", "crear");
  const puedeEditar = usuarioTienePermiso(usuario, "PRODUCTOS_SERVICIOS", "editar");

  return (
    <div className="my-10 px-4 lg:px-6 max-w-[95rem] mx-auto w-full flex flex-col gap-4">
      <div>
        <h3 className="text-xl font-semibold">Productos y Servicios</h3>
        <p className="text-default-500 text-sm">
          Catálogo de servicios y tarifas, roles facturables y SLA — insumo de
          las cotizaciones y proyectos. Incluye también paquetes de servicios
          y licencias/suscripciones de terceros.
        </p>
      </div>

      <ProductosServiciosTabs
        categorias={categorias ?? []}
        rolesTarifa={rolesTarifa ?? []}
        planesSla={planesSla ?? []}
        nivelesSla={nivelesSla ?? []}
        servicios={(servicios ?? []) as unknown as ServicioConRelaciones[]}
        monedas={monedas ?? []}
        paquetes={paquetes ?? []}
        lineasPaquete={lineasPaquete ?? []}
        licenciasCatalogo={licenciasCatalogo ?? []}
        licenciasAsignadas={licenciasAsignadas ?? []}
        cuentas={cuentas ?? []}
        puedeCrear={puedeCrear}
        puedeEditar={puedeEditar}
      />
    </div>
  );
}
