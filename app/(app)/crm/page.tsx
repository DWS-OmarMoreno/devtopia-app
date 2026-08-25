import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { getUsuarioActual, usuarioTienePermiso } from "@/lib/auth/getUsuarioActual";
import { AccesoDenegado } from "@/components/shared/acceso-denegado";
import { CrmTabs } from "@/components/crm/crm-tabs";
import type { CuentaConRelaciones } from "@/components/crm/cuentas-panel";
import type { OportunidadConRelaciones, SeguimientoConRelaciones } from "@/components/crm/oportunidades-panel";
import type {
  CotizacionConRelaciones,
  CotizacionAprobacionConRelaciones,
} from "@/components/crm/cotizaciones-panel";
import type { Tables } from "@/utils/database.types";

export default async function CrmPage() {
  const usuario = await getUsuarioActual();

  if (!usuarioTienePermiso(usuario, "CRM_VENTAS", "leer")) {
    return <AccesoDenegado />;
  }

  const supabase = createClient(cookies());

  const [
    { data: cuentas },
    { data: contactos },
    { data: oportunidades },
    { data: seguimientos },
    { data: monedas },
    { data: motivosPerdida },
    { data: usuariosEmpresa },
    { data: cotizaciones },
    { data: cotizacionesDetalle },
    { data: cotizacionesAprobaciones },
    { data: estadosCotizacion },
    { data: transicionesCotizacion },
    { data: servicios },
    { data: rolesTarifa },
    { data: secuenciasProyecto },
  ] = await Promise.all([
    supabase
      .from("cuentas_clientes")
      .select("*, ejecutivo:perfiles_usuario(nombre_completo)")
      .is("deleted_at", null)
      .order("razon_social", { ascending: true }),
    supabase.from("contactos").select("*").order("nombre", { ascending: true }),
    supabase
      .from("oportunidades")
      .select(
        "*, cuentas_clientes(razon_social), contactos(nombre, apellido), ejecutivo:perfiles_usuario(nombre_completo)"
      )
      .is("deleted_at", null)
      .order("created_at", { ascending: false }),
    supabase
      .from("oportunidades_seguimiento")
      .select("*, perfiles_usuario(nombre_completo)")
      .order("fecha", { ascending: false }),
    supabase.from("monedas").select("*").eq("activa", true).order("codigo_iso", { ascending: true }),
    supabase
      .from("catalogos_valores")
      .select("*")
      .eq("catalogo", "MOTIVO_PERDIDA_OPORTUNIDAD")
      .eq("activo", true)
      .order("orden", { ascending: true }),
    supabase
      .from("perfiles_usuario")
      .select("id, nombre_completo")
      .eq("activo", true)
      .order("nombre_completo", { ascending: true }),
    supabase
      .from("cotizaciones")
      .select(
        "*, cuentas_clientes(razon_social), contactos(nombre, apellido), oportunidades(codigo, nombre_oportunidad), monedas(codigo_iso), responsable:perfiles_usuario!cotizaciones_responsable_comercial_id_fkey(nombre_completo), estados_ciclo_vida(codigo_estado, etiqueta, color_ui)"
      )
      .is("deleted_at", null)
      .order("created_at", { ascending: false }),
    supabase.from("cotizaciones_detalle").select("*").order("orden", { ascending: true }),
    supabase
      .from("cotizaciones_aprobaciones")
      .select("*, aprobador:perfiles_usuario(nombre_completo)")
      .order("fecha_solicitud", { ascending: false }),
    supabase
      .from("estados_ciclo_vida")
      .select("*")
      .eq("entidad_aplicable", "COTIZACION")
      .order("orden", { ascending: true }),
    supabase.from("workflows_transiciones").select("*").eq("entidad_aplicable", "COTIZACION"),
    supabase.from("catalogo_servicios").select("*").eq("activo", true).order("nombre", { ascending: true }),
    supabase.from("catalogo_roles_tarifa").select("*").eq("activo", true).order("nombre_rol", { ascending: true }),
    // Necesaria para el formulario "Convertir a proyecto" (elegir la secuencia de
    // numeración PROYECTO_PRODUCTO / PROYECTO_CONSULTORIA). No requiere el permiso
    // de lectura de CONTRATOS_PROYECTOS: es un catálogo de numeración, no un dato
    // sensible del módulo.
    supabase
      .from("secuencias_numeracion")
      .select("*")
      .eq("tipo_documento", "PROYECTO")
      .eq("activo", true)
      .order("codigo_secuencia", { ascending: true }),
  ]);

  const puedeCrear = usuarioTienePermiso(usuario, "CRM_VENTAS", "crear", "cuentas");
  const puedeEditar = usuarioTienePermiso(usuario, "CRM_VENTAS", "editar", "cuentas");
  const puedeCrearOportunidad = usuarioTienePermiso(usuario, "CRM_VENTAS", "crear", "oportunidades");
  const puedeEditarOportunidad = usuarioTienePermiso(usuario, "CRM_VENTAS", "editar", "oportunidades");
  const puedeCrearCotizacion = usuarioTienePermiso(usuario, "CRM_VENTAS", "crear", "cotizaciones");
  const puedeEditarCotizacion = usuarioTienePermiso(usuario, "CRM_VENTAS", "editar", "cotizaciones");
  const puedeAprobarCotizacion = usuarioTienePermiso(usuario, "CRM_VENTAS", "aprobar", "cotizaciones");
  // La conversión a proyecto es una operación cross-módulo: además de poder editar
  // la cotización, se necesitan los dos permisos de creación de Contratos y
  // Proyectos que exige fn_convertir_cotizacion_a_proyecto() internamente. Este
  // chequeo aquí es solo para decidir si mostrar el botón — el RPC vuelve a
  // validar los tres permisos del lado del servidor.
  const puedeConvertirAProyecto =
    puedeEditarCotizacion &&
    usuarioTienePermiso(usuario, "CONTRATOS_PROYECTOS", "crear", "contratos") &&
    usuarioTienePermiso(usuario, "CONTRATOS_PROYECTOS", "crear", "proyectos");

  return (
    <div className="my-10 px-4 lg:px-6 max-w-[95rem] mx-auto w-full flex flex-col gap-4">
      <div>
        <h3 className="text-xl font-semibold">CRM y Ventas</h3>
        <p className="text-default-500 text-sm">
          Cuentas y contactos, el embudo de oportunidades con su bitácora de seguimiento, y
          cotizaciones con líneas de detalle, flujo de aprobación y estados.
        </p>
      </div>

      <CrmTabs
        cuentas={(cuentas ?? []) as unknown as CuentaConRelaciones[]}
        contactos={contactos ?? []}
        oportunidades={(oportunidades ?? []) as unknown as OportunidadConRelaciones[]}
        seguimientos={(seguimientos ?? []) as unknown as SeguimientoConRelaciones[]}
        monedas={monedas ?? []}
        motivosPerdida={motivosPerdida ?? []}
        usuariosEmpresa={usuariosEmpresa ?? []}
        usuarioActualId={usuario?.id ?? null}
        puedeCrearCuenta={puedeCrear}
        puedeEditarCuenta={puedeEditar}
        puedeCrearOportunidad={puedeCrearOportunidad}
        puedeEditarOportunidad={puedeEditarOportunidad}
        cotizaciones={(cotizaciones ?? []) as unknown as CotizacionConRelaciones[]}
        cotizacionesDetalle={(cotizacionesDetalle ?? []) as Tables<"cotizaciones_detalle">[]}
        cotizacionesAprobaciones={(cotizacionesAprobaciones ?? []) as unknown as CotizacionAprobacionConRelaciones[]}
        estadosCotizacion={(estadosCotizacion ?? []) as Tables<"estados_ciclo_vida">[]}
        transicionesCotizacion={(transicionesCotizacion ?? []) as Tables<"workflows_transiciones">[]}
        servicios={(servicios ?? []) as Tables<"catalogo_servicios">[]}
        rolesTarifa={(rolesTarifa ?? []) as Tables<"catalogo_roles_tarifa">[]}
        puedeCrearCotizacion={puedeCrearCotizacion}
        puedeEditarCotizacion={puedeEditarCotizacion}
        puedeAprobarCotizacion={puedeAprobarCotizacion}
        secuenciasProyecto={secuenciasProyecto ?? []}
        puedeConvertirAProyecto={puedeConvertirAProyecto}
      />
    </div>
  );
}
