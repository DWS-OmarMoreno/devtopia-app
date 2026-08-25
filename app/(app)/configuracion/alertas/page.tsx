import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { getUsuarioActual, usuarioTienePermiso } from "@/lib/auth/getUsuarioActual";
import { AccesoDenegado } from "@/components/shared/acceso-denegado";
import { AlertasPanel } from "@/components/configuracion/alertas/alertas-panel";

const SUBLISTA = "alertas";

export default async function AlertasPage() {
  const usuario = await getUsuarioActual();

  if (!usuarioTienePermiso(usuario, "CONFIGURACION", "leer", SUBLISTA)) {
    return <AccesoDenegado />;
  }

  const supabase = createClient(cookies());

  const [{ data: reglas }, { data: roles }, { data: usuarios }, { data: envios }] = await Promise.all([
    supabase
      .from("alertas_notificaciones_reglas")
      .select("*")
      .order("nombre", { ascending: true }),
    supabase.from("roles").select("id, nombre").eq("activo", true).order("nombre", { ascending: true }),
    supabase
      .from("perfiles_usuario")
      .select("id, nombre_completo")
      .eq("activo", true)
      .order("nombre_completo", { ascending: true }),
    supabase
      .from("notificaciones_enviadas")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100),
  ]);

  const puedeCrear = usuarioTienePermiso(usuario, "CONFIGURACION", "crear", SUBLISTA);
  const puedeEditar = usuarioTienePermiso(usuario, "CONFIGURACION", "editar", SUBLISTA);

  return (
    <div className="my-10 px-4 lg:px-6 max-w-[95rem] mx-auto w-full flex flex-col gap-4">
      <div>
        <h3 className="text-xl font-semibold">Alertas</h3>
        <p className="text-default-500 text-sm">
          Reglas de notificación por evento y destinatario. Esta pantalla solo
          administra las reglas — el envío real de correos y webhooks todavía
          no está implementado, así que las reglas activas no generan
          notificaciones automáticas por ahora.
        </p>
      </div>

      <AlertasPanel
        reglas={reglas ?? []}
        roles={roles ?? []}
        usuarios={usuarios ?? []}
        envios={envios ?? []}
        puedeCrear={puedeCrear}
        puedeEditar={puedeEditar}
      />
    </div>
  );
}
