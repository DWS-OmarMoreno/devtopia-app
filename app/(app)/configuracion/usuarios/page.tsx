import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient, isAdminClientConfigured } from "@/utils/supabase/admin";
import { getUsuarioActual, usuarioTienePermiso } from "@/lib/auth/getUsuarioActual";
import { AccesoDenegado } from "@/components/shared/acceso-denegado";
import { UsuariosTabla, type UsuarioFila } from "@/components/configuracion/usuarios/usuarios-tabla";

const SUBLISTA = "perfiles_usuario";

export default async function UsuariosPage() {
  const usuarioActual = await getUsuarioActual();

  if (!usuarioTienePermiso(usuarioActual, "CONFIGURACION", "leer", SUBLISTA)) {
    return <AccesoDenegado />;
  }

  const supabase = createClient(cookies());

  const [{ data: perfiles }, { data: roles }] = await Promise.all([
    supabase
      .from("perfiles_usuario")
      .select("*, roles(id, nombre)")
      .order("nombre_completo", { ascending: true }),
    supabase
      .from("roles")
      .select("*")
      .eq("activo", true)
      .order("nombre", { ascending: true }),
  ]);

  // El correo vive en auth.users, no en perfiles_usuario (a propósito: RLS de
  // perfiles_usuario nunca debe exponer un correo ajeno por accidente). Solo
  // podemos cruzarlo aquí si el service_role está configurado; si no, la
  // pantalla sigue siendo útil (rol, estado) pero sin columna de correo.
  const correosPorId = new Map<string, string>();
  let correoDisponible = false;

  if (isAdminClientConfigured()) {
    try {
      const admin = createAdminClient();
      // listUsers() pagina de a 50 por defecto; para una empresa con más
      // usuarios que eso habría que iterar páginas — suficiente para esta
      // etapa inicial, se deja anotado para cuando se necesite.
      const { data: listado, error } = await admin.auth.admin.listUsers({ perPage: 200 });
      if (!error && listado) {
        listado.users.forEach((u) => {
          if (u.email) correosPorId.set(u.id, u.email);
        });
        correoDisponible = true;
      }
    } catch {
      // isAdminClientConfigured() ya lo garantiza, pero por si la llamada a
      // Supabase Auth falla en tiempo de ejecución no debe tumbar la página.
      correoDisponible = false;
    }
  }

  const usuarios: UsuarioFila[] = (perfiles ?? []).map((perfil) => ({
    id: perfil.id,
    nombreCompleto: perfil.nombre_completo,
    cargo: perfil.cargo,
    activo: perfil.activo,
    rolId: perfil.rol_id,
    rolNombre: (perfil as any).roles?.nombre ?? "—",
    email: correosPorId.get(perfil.id) ?? null,
  }));

  const puedeCrear = usuarioTienePermiso(usuarioActual, "CONFIGURACION", "crear", SUBLISTA);
  const puedeEditar = usuarioTienePermiso(usuarioActual, "CONFIGURACION", "editar", SUBLISTA);

  return (
    <div className="my-10 px-4 lg:px-6 max-w-[95rem] mx-auto w-full flex flex-col gap-4">
      <div>
        <h3 className="text-xl font-semibold">Usuarios</h3>
        <p className="text-default-500 text-sm">
          El alta de usuarios es solo por invitación. Aquí se invita, se asigna
          rol y se activa o desactiva el acceso — no existe registro público.
        </p>
      </div>

      <UsuariosTabla
        usuarios={usuarios}
        roles={(roles ?? []).map((r) => ({ id: r.id, nombre: r.nombre }))}
        puedeCrear={puedeCrear}
        puedeEditar={puedeEditar}
        correoDisponible={correoDisponible}
        usuarioActualId={usuarioActual?.id ?? null}
      />
    </div>
  );
}
