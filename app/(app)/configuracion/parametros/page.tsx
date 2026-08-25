import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { getUsuarioActual, usuarioTienePermiso } from "@/lib/auth/getUsuarioActual";
import { AccesoDenegado } from "@/components/shared/acceso-denegado";
import { ParametrosGlobalesForm } from "@/components/configuracion/parametros/parametros-globales-form";

export default async function ParametrosGlobalesPage() {
  const usuario = await getUsuarioActual();

  if (!usuarioTienePermiso(usuario, "CONFIGURACION", "leer")) {
    return <AccesoDenegado />;
  }

  const supabase = createClient(cookies());
  const { data: monedas } = await supabase
    .from("monedas")
    .select("*")
    .eq("activa", true)
    .order("codigo_iso", { ascending: true });

  const puedeEditar = usuarioTienePermiso(usuario, "CONFIGURACION", "editar");

  return (
    <div className="my-10 px-4 lg:px-6 max-w-[95rem] mx-auto w-full flex flex-col gap-4">
      <div>
        <h3 className="text-xl font-semibold">Parámetros Globales</h3>
        <p className="text-default-500 text-sm">
          Datos de la empresa, moneda, formato regional y valores por defecto
          usados en todo el ERP. Hay un solo registro por empresa.
        </p>
      </div>

      <ParametrosGlobalesForm
        empresa={usuario!.empresa}
        monedas={monedas ?? []}
        puedeEditar={puedeEditar}
      />
    </div>
  );
}
