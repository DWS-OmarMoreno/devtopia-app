import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { getUsuarioActual, usuarioTienePermiso } from "@/lib/auth/getUsuarioActual";
import { AccesoDenegado } from "@/components/shared/acceso-denegado";
import { RolesPanel } from "@/components/configuracion/roles/roles-panel";

const SUBLISTA = "roles";

export default async function RolesPage() {
  const usuario = await getUsuarioActual();

  if (!usuarioTienePermiso(usuario, "CONFIGURACION", "leer", SUBLISTA)) {
    return <AccesoDenegado />;
  }

  const supabase = createClient(cookies());

  const [{ data: roles }, { data: permisos }] = await Promise.all([
    supabase.from("roles").select("*").order("es_rol_sistema", { ascending: false }).order("nombre", { ascending: true }),
    supabase.from("permisos").select("*"),
  ]);

  const puedeCrear = usuarioTienePermiso(usuario, "CONFIGURACION", "crear", SUBLISTA);
  const puedeEditar = usuarioTienePermiso(usuario, "CONFIGURACION", "editar", SUBLISTA);
  const puedeEliminar = usuarioTienePermiso(usuario, "CONFIGURACION", "eliminar", SUBLISTA);

  return (
    <div className="my-10 px-4 lg:px-6 max-w-[95rem] mx-auto w-full flex flex-col gap-4">
      <div>
        <h3 className="text-xl font-semibold">Roles y Permisos</h3>
        <p className="text-default-500 text-sm">
          Roles de la empresa y su matriz de permisos por módulo. Los roles de
          sistema (marcados con la etiqueta correspondiente) no se pueden
          renombrar ni eliminar, pero sí ajustar su matriz de permisos.
          Recuerda: esta pantalla controla qué se MUESTRA en la interfaz — la
          autoridad real de acceso a los datos siempre es Row Level Security
          en la base de datos.
        </p>
      </div>

      <RolesPanel
        roles={roles ?? []}
        permisos={permisos ?? []}
        puedeCrear={puedeCrear}
        puedeEditar={puedeEditar}
        puedeEliminar={puedeEliminar}
      />
    </div>
  );
}
