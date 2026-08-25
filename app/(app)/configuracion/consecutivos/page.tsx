import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { getUsuarioActual, usuarioTienePermiso } from "@/lib/auth/getUsuarioActual";
import { AccesoDenegado } from "@/components/shared/acceso-denegado";
import { ConsecutivosPanel } from "@/components/configuracion/consecutivos/consecutivos-panel";

const SUBLISTA = "secuencias_numeracion";

export default async function ConsecutivosPage() {
  const usuario = await getUsuarioActual();

  if (!usuarioTienePermiso(usuario, "CONFIGURACION", "leer", SUBLISTA)) {
    return <AccesoDenegado />;
  }

  const supabase = createClient(cookies());
  const { data: secuencias } = await supabase
    .from("secuencias_numeracion")
    .select("*")
    .order("tipo_documento", { ascending: true });

  const puedeCrear = usuarioTienePermiso(usuario, "CONFIGURACION", "crear", SUBLISTA);
  const puedeEditar = usuarioTienePermiso(usuario, "CONFIGURACION", "editar", SUBLISTA);

  return (
    <div className="my-10 px-4 lg:px-6 max-w-[95rem] mx-auto w-full flex flex-col gap-4">
      <div>
        <h3 className="text-xl font-semibold">Consecutivos</h3>
        <p className="text-default-500 text-sm">
          Numeración automática de cotizaciones, contratos, órdenes de costo y
          demás documentos del ERP.
        </p>
      </div>

      <ConsecutivosPanel
        secuencias={secuencias ?? []}
        puedeCrear={puedeCrear}
        puedeEditar={puedeEditar}
      />
    </div>
  );
}
