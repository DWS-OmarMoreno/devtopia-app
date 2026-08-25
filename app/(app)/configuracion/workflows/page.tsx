import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { getUsuarioActual, usuarioTienePermiso } from "@/lib/auth/getUsuarioActual";
import { AccesoDenegado } from "@/components/shared/acceso-denegado";
import { WorkflowsPanel } from "@/components/configuracion/workflows/workflows-panel";

const SUBLISTA = "workflows";

export default async function WorkflowsPage() {
  const usuario = await getUsuarioActual();

  if (!usuarioTienePermiso(usuario, "CONFIGURACION", "leer", SUBLISTA)) {
    return <AccesoDenegado />;
  }

  const supabase = createClient(cookies());

  const [{ data: estados }, { data: transiciones }, { data: roles }] = await Promise.all([
    supabase
      .from("estados_ciclo_vida")
      .select("*")
      .order("entidad_aplicable", { ascending: true })
      .order("orden", { ascending: true }),
    supabase.from("workflows_transiciones").select("*"),
    supabase.from("roles").select("id, nombre").eq("activo", true).order("nombre", { ascending: true }),
  ]);

  const puedeCrear = usuarioTienePermiso(usuario, "CONFIGURACION", "crear", SUBLISTA);
  const puedeEditar = usuarioTienePermiso(usuario, "CONFIGURACION", "editar", SUBLISTA);

  return (
    <div className="my-10 px-4 lg:px-6 max-w-[95rem] mx-auto w-full flex flex-col gap-4">
      <div>
        <h3 className="text-xl font-semibold">Workflows</h3>
        <p className="text-default-500 text-sm">
          Estados de ciclo de vida y transiciones permitidas por tipo de
          documento. Hoy solo Cotizaciones usa este motor desde su propia
          pantalla; Contratos, Proyectos, Change Requests y Órdenes de Costo ya
          tienen estados y transiciones sembrados pero aún no tienen una
          pantalla de negocio que los consuma.
        </p>
      </div>

      <WorkflowsPanel
        estados={estados ?? []}
        transiciones={transiciones ?? []}
        roles={roles ?? []}
        puedeCrear={puedeCrear}
        puedeEditar={puedeEditar}
      />
    </div>
  );
}
