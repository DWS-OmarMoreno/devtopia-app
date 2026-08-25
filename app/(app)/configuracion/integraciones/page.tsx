import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { getUsuarioActual, usuarioTienePermiso } from "@/lib/auth/getUsuarioActual";
import { AccesoDenegado } from "@/components/shared/acceso-denegado";
import { IntegracionesPanel } from "@/components/configuracion/integraciones/integraciones-panel";

const SUBLISTA = "integraciones";

export default async function IntegracionesPage() {
  const usuario = await getUsuarioActual();

  if (!usuarioTienePermiso(usuario, "CONFIGURACION", "leer", SUBLISTA)) {
    return <AccesoDenegado />;
  }

  const supabase = createClient(cookies());

  const [{ data: integraciones }, { data: webhooks }] = await Promise.all([
    supabase.from("integraciones_config").select("*").order("nombre", { ascending: true }),
    supabase.from("webhooks_salientes").select("*"),
  ]);

  const puedeCrear = usuarioTienePermiso(usuario, "CONFIGURACION", "crear", SUBLISTA);
  const puedeEditar = usuarioTienePermiso(usuario, "CONFIGURACION", "editar", SUBLISTA);

  return (
    <div className="my-10 px-4 lg:px-6 max-w-[95rem] mx-auto w-full flex flex-col gap-4">
      <div>
        <h3 className="text-xl font-semibold">Integraciones</h3>
        <p className="text-default-500 text-sm">
          Conexiones externas (facturación, mensajería, transportadoras) y sus
          webhooks salientes. El campo de credenciales solo guarda una
          referencia/alias hacia el gestor de secretos — nunca el secreto real.
        </p>
      </div>

      <IntegracionesPanel
        integraciones={integraciones ?? []}
        webhooks={webhooks ?? []}
        puedeCrear={puedeCrear}
        puedeEditar={puedeEditar}
      />
    </div>
  );
}
