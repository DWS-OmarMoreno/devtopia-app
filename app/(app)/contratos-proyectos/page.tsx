import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { getUsuarioActual, usuarioTienePermiso } from "@/lib/auth/getUsuarioActual";
import { AccesoDenegado } from "@/components/shared/acceso-denegado";
import { ContratosProyectosTabs } from "@/components/contratos-proyectos/contratos-proyectos-tabs";
import type { ContratoConRelaciones } from "@/components/contratos-proyectos/contratos-panel";
import type { ProyectoConRelaciones } from "@/components/contratos-proyectos/proyectos-panel";
import type { TimesheetConRelaciones } from "@/components/contratos-proyectos/timesheets-panel";
import type {
  AsignacionRecursoConRelaciones,
  DisponibilidadRecursoConRelaciones,
} from "@/components/contratos-proyectos/recursos-panel";
import type { RentabilidadLiveRow } from "@/components/contratos-proyectos/rentabilidad-panel";
import type { ChangeRequestConRelaciones } from "@/components/contratos-proyectos/change-requests-panel";
import type {
  FacturaReferenciaExternaConRelaciones,
  CasoSoporteReferenciaExternaConRelaciones,
} from "@/components/contratos-proyectos/referencia-externa-panel";
import type { Tables } from "@/utils/database.types";

export default async function ContratosProyectosPage() {
  const usuario = await getUsuarioActual();

  if (!usuarioTienePermiso(usuario, "CONTRATOS_PROYECTOS", "leer")) {
    return <AccesoDenegado />;
  }

  const supabase = createClient(cookies());

  const [
    { data: contratos },
    { data: proyectos },
    { data: hitos },
    { data: criterios },
    { data: estadosContrato },
    { data: transicionesContrato },
    { data: estadosProyecto },
    { data: transicionesProyecto },
    { data: cuentas },
    { data: monedas },
    { data: usuariosEmpresa },
    { data: secuenciasProyecto },
    { data: timesheets },
    { data: asignaciones },
    { data: disponibilidad },
    { data: rentabilidadSnapshots },
    { data: rentabilidadLive },
    { data: changeRequests },
    { data: estadosChangeRequest },
    { data: transicionesChangeRequest },
    { data: facturas },
    { data: casosSoporte },
    { data: catalogoRolesTarifa },
    { data: categoriasNoFacturables },
  ] = await Promise.all([
    supabase
      .from("contratos")
      .select(
        "*, cuentas_clientes(razon_social), monedas(codigo_iso), responsable:perfiles_usuario!contratos_responsable_comercial_id_fkey(nombre_completo), estados_ciclo_vida(codigo_estado, etiqueta, color_ui)"
      )
      .is("deleted_at", null)
      .order("created_at", { ascending: false }),
    supabase
      .from("proyectos")
      .select(
        "*, contratos(numero_contrato), pm:perfiles_usuario!proyectos_pm_id_fkey(nombre_completo), estados_ciclo_vida(codigo_estado, etiqueta, color_ui)"
      )
      .is("deleted_at", null)
      .order("created_at", { ascending: false }),
    supabase
      .from("hitos_entregables")
      .select("*, responsable:perfiles_usuario!hitos_entregables_responsable_id_fkey(nombre_completo)")
      .order("fase_orden", { ascending: true }),
    supabase.from("hitos_criterios_aceptacion").select("*"),
    supabase
      .from("estados_ciclo_vida")
      .select("*")
      .eq("entidad_aplicable", "CONTRATO")
      .order("orden", { ascending: true }),
    supabase.from("workflows_transiciones").select("*").eq("entidad_aplicable", "CONTRATO"),
    supabase
      .from("estados_ciclo_vida")
      .select("*")
      .eq("entidad_aplicable", "PROYECTO")
      .order("orden", { ascending: true }),
    supabase.from("workflows_transiciones").select("*").eq("entidad_aplicable", "PROYECTO"),
    // Reutiliza fn_listar_cuentas_basico() en vez de leer cuentas_clientes directo:
    // así este módulo no depende de tener permisos de CRM_VENTAS para elegir la
    // cuenta al crear un contrato manualmente (mismo patrón que Licencias).
    supabase.rpc("fn_listar_cuentas_basico"),
    supabase.from("monedas").select("*").eq("activa", true).order("codigo_iso", { ascending: true }),
    supabase
      .from("perfiles_usuario")
      .select("id, nombre_completo")
      .eq("activo", true)
      .order("nombre_completo", { ascending: true }),
    supabase
      .from("secuencias_numeracion")
      .select("*")
      .eq("tipo_documento", "PROYECTO")
      .eq("activo", true)
      .order("codigo_secuencia", { ascending: true }),
    supabase
      .from("timesheets")
      .select(
        "*, proyectos(numero_proyecto, nombre_proyecto), recurso:perfiles_usuario!timesheets_recurso_id_fkey(nombre_completo), rol_tarifa:catalogo_roles_tarifa(nombre_rol)"
      )
      .order("fecha", { ascending: false }),
    supabase
      .from("asignacion_recursos")
      .select(
        "*, proyectos(numero_proyecto, nombre_proyecto), recurso:perfiles_usuario!asignacion_recursos_recurso_id_fkey(nombre_completo), rol_en_proyecto:catalogo_roles_tarifa(nombre_rol)"
      )
      .order("fecha_inicio_asignacion", { ascending: false }),
    supabase
      .from("disponibilidad_recursos")
      .select("*, recurso:perfiles_usuario!disponibilidad_recursos_recurso_id_fkey(nombre_completo)")
      .order("fecha", { ascending: false }),
    supabase
      .from("rentabilidad_snapshots")
      .select("*, proyectos(numero_proyecto, nombre_proyecto)")
      .order("fecha_corte", { ascending: false }),
    // fn_listar_rentabilidad_proyectos() ya filtra por empresa y por permiso
    // CONTRATOS_PROYECTOS/leer/rentabilidad — ver migración 017 y la bitácora
    // de incidentes. Si el usuario no tiene ese permiso, devuelve 0 filas.
    supabase.rpc("fn_listar_rentabilidad_proyectos"),
    supabase
      .from("change_requests")
      .select(
        "*, proyectos(numero_proyecto, nombre_proyecto), contratos(numero_contrato), solicitante:perfiles_usuario!change_requests_solicitado_por_usuario_id_fkey(nombre_completo), aprobador:perfiles_usuario!change_requests_aprobador_interno_id_fkey(nombre_completo), estados_ciclo_vida(codigo_estado, etiqueta, color_ui)"
      )
      .order("created_at", { ascending: false }),
    supabase
      .from("estados_ciclo_vida")
      .select("*")
      .eq("entidad_aplicable", "CHANGE_REQUEST")
      .order("orden", { ascending: true }),
    supabase.from("workflows_transiciones").select("*").eq("entidad_aplicable", "CHANGE_REQUEST"),
    supabase
      .from("facturas_referencia_externa")
      .select(
        "*, proyectos(numero_proyecto, nombre_proyecto), contratos(numero_contrato), monedas(codigo_iso), hito_asociado:hitos_entregables(nombre)"
      )
      .order("fecha_emision", { ascending: false }),
    supabase
      .from("casos_soporte_referencia_externa")
      .select("*, proyectos(numero_proyecto, nombre_proyecto), contratos(numero_contrato)")
      .order("fecha_apertura", { ascending: false }),
    supabase
      .from("catalogo_roles_tarifa")
      .select("*")
      .eq("activo", true)
      .order("nombre_rol", { ascending: true }),
    supabase
      .from("catalogos_valores")
      .select("*")
      .eq("catalogo", "CATEGORIA_HORA_NO_FACTURABLE")
      .eq("activo", true)
      .order("orden", { ascending: true }),
  ]);

  const puedeCrearContrato = usuarioTienePermiso(usuario, "CONTRATOS_PROYECTOS", "crear", "contratos");
  const puedeEditarContrato = usuarioTienePermiso(usuario, "CONTRATOS_PROYECTOS", "editar", "contratos");
  const puedeCrearProyecto = usuarioTienePermiso(usuario, "CONTRATOS_PROYECTOS", "crear", "proyectos");
  const puedeEditarProyecto = usuarioTienePermiso(usuario, "CONTRATOS_PROYECTOS", "editar", "proyectos");
  const puedeCrearHito = usuarioTienePermiso(usuario, "CONTRATOS_PROYECTOS", "crear", "hitos_entregables");
  const puedeEditarHito = usuarioTienePermiso(usuario, "CONTRATOS_PROYECTOS", "editar", "hitos_entregables");

  const puedeCrearTimesheet = usuarioTienePermiso(usuario, "CONTRATOS_PROYECTOS", "crear", "timesheets");
  const puedeEditarTimesheet = usuarioTienePermiso(usuario, "CONTRATOS_PROYECTOS", "editar", "timesheets");
  const puedeAprobarTimesheet = usuarioTienePermiso(usuario, "CONTRATOS_PROYECTOS", "aprobar", "timesheets");

  const puedeCrearAsignacion = usuarioTienePermiso(usuario, "CONTRATOS_PROYECTOS", "crear", "asignacion_recursos");
  const puedeEditarAsignacion = usuarioTienePermiso(usuario, "CONTRATOS_PROYECTOS", "editar", "asignacion_recursos");
  const puedeEliminarAsignacion = usuarioTienePermiso(usuario, "CONTRATOS_PROYECTOS", "eliminar", "asignacion_recursos");

  const puedeCrearRentabilidad = usuarioTienePermiso(usuario, "CONTRATOS_PROYECTOS", "crear", "rentabilidad");

  const puedeCrearChangeRequest = usuarioTienePermiso(usuario, "CONTRATOS_PROYECTOS", "crear", "change_requests");
  const puedeEditarChangeRequest = usuarioTienePermiso(usuario, "CONTRATOS_PROYECTOS", "editar", "change_requests");

  const puedeCrearFactura = usuarioTienePermiso(usuario, "CONTRATOS_PROYECTOS", "crear", "facturas_referencia_externa");
  const puedeEditarFactura = usuarioTienePermiso(usuario, "CONTRATOS_PROYECTOS", "editar", "facturas_referencia_externa");

  const puedeCrearCaso = usuarioTienePermiso(usuario, "CONTRATOS_PROYECTOS", "crear", "casos_soporte_referencia_externa");
  const puedeEditarCaso = usuarioTienePermiso(usuario, "CONTRATOS_PROYECTOS", "editar", "casos_soporte_referencia_externa");

  return (
    <div className="my-10 px-4 lg:px-6 max-w-[95rem] mx-auto w-full flex flex-col gap-4">
      <div>
        <h3 className="text-xl font-semibold">Contratos y Proyectos</h3>
        <p className="text-default-500 text-sm">
          Contratos con su flujo de estados, proyectos derivados con hitos y entregables, y sus
          criterios de aceptación. Timesheets, asignación y disponibilidad de recursos,
          rentabilidad, change requests y las sublistas de referencia externa (facturas y casos de
          soporte).
        </p>
      </div>

      <ContratosProyectosTabs
        contratos={(contratos ?? []) as unknown as ContratoConRelaciones[]}
        proyectos={(proyectos ?? []) as unknown as ProyectoConRelaciones[]}
        hitos={(hitos ?? []) as unknown as (Tables<"hitos_entregables"> & { responsable: { nombre_completo: string } | null })[]}
        criterios={(criterios ?? []) as Tables<"hitos_criterios_aceptacion">[]}
        estadosContrato={(estadosContrato ?? []) as Tables<"estados_ciclo_vida">[]}
        transicionesContrato={(transicionesContrato ?? []) as Tables<"workflows_transiciones">[]}
        estadosProyecto={(estadosProyecto ?? []) as Tables<"estados_ciclo_vida">[]}
        transicionesProyecto={(transicionesProyecto ?? []) as Tables<"workflows_transiciones">[]}
        cuentas={cuentas ?? []}
        monedas={monedas ?? []}
        usuariosEmpresa={usuariosEmpresa ?? []}
        secuenciasProyecto={(secuenciasProyecto ?? []) as Tables<"secuencias_numeracion">[]}
        puedeCrearContrato={puedeCrearContrato}
        puedeEditarContrato={puedeEditarContrato}
        puedeCrearProyecto={puedeCrearProyecto}
        puedeEditarProyecto={puedeEditarProyecto}
        puedeCrearHito={puedeCrearHito}
        puedeEditarHito={puedeEditarHito}
        timesheets={(timesheets ?? []) as unknown as TimesheetConRelaciones[]}
        catalogoRolesTarifa={(catalogoRolesTarifa ?? []) as Tables<"catalogo_roles_tarifa">[]}
        categoriasNoFacturables={(categoriasNoFacturables ?? []) as Tables<"catalogos_valores">[]}
        puedeCrearTimesheet={puedeCrearTimesheet}
        puedeEditarTimesheet={puedeEditarTimesheet}
        puedeAprobarTimesheet={puedeAprobarTimesheet}
        asignaciones={(asignaciones ?? []) as unknown as AsignacionRecursoConRelaciones[]}
        disponibilidad={(disponibilidad ?? []) as unknown as DisponibilidadRecursoConRelaciones[]}
        puedeCrearAsignacion={puedeCrearAsignacion}
        puedeEditarAsignacion={puedeEditarAsignacion}
        puedeEliminarAsignacion={puedeEliminarAsignacion}
        rentabilidadLive={(rentabilidadLive ?? []) as RentabilidadLiveRow[]}
        rentabilidadSnapshots={(rentabilidadSnapshots ?? []) as unknown as (Tables<"rentabilidad_snapshots"> & { proyectos: { numero_proyecto: string; nombre_proyecto: string } | null })[]}
        puedeCrearRentabilidad={puedeCrearRentabilidad}
        changeRequests={(changeRequests ?? []) as unknown as ChangeRequestConRelaciones[]}
        estadosChangeRequest={(estadosChangeRequest ?? []) as Tables<"estados_ciclo_vida">[]}
        transicionesChangeRequest={(transicionesChangeRequest ?? []) as Tables<"workflows_transiciones">[]}
        puedeCrearChangeRequest={puedeCrearChangeRequest}
        puedeEditarChangeRequest={puedeEditarChangeRequest}
        facturas={(facturas ?? []) as unknown as FacturaReferenciaExternaConRelaciones[]}
        casosSoporte={(casosSoporte ?? []) as unknown as CasoSoporteReferenciaExternaConRelaciones[]}
        puedeCrearFactura={puedeCrearFactura}
        puedeEditarFactura={puedeEditarFactura}
        puedeCrearCaso={puedeCrearCaso}
        puedeEditarCaso={puedeEditarCaso}
      />
    </div>
  );
}
