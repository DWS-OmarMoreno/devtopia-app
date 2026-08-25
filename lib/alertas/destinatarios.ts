import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Tables } from "@/utils/database.types";

type Regla = Tables<"alertas_notificaciones_reglas">;

export interface Destinatario {
  /** null para destinatarios externos (CLIENTE) — no tienen fila en perfiles_usuario. */
  usuarioId: string | null;
  email: string | null;
  nombre: string;
}

export interface ContextoDestinatarios {
  empresaId: string;
  proyectoId?: string | null;
  cuentaId?: string | null;
}

async function emailDeUsuario(admin: SupabaseClient<Database>, usuarioId: string): Promise<string | null> {
  try {
    const { data, error } = await admin.auth.admin.getUserById(usuarioId);
    if (error || !data?.user?.email) return null;
    return data.user.email;
  } catch {
    return null;
  }
}

async function perfilesAEmailDestinatario(
  admin: SupabaseClient<Database>,
  perfiles: { id: string; nombre_completo: string }[]
): Promise<Destinatario[]> {
  const resultados = await Promise.all(
    perfiles.map(async (perfil) => ({
      usuarioId: perfil.id,
      nombre: perfil.nombre_completo,
      email: await emailDeUsuario(admin, perfil.id),
    }))
  );
  return resultados;
}

/**
 * Resuelve `destinatarios_tipo` de una regla a la lista real de personas a
 * notificar. Nunca lanza — un contexto insuficiente (ej. PM_PROYECTO sin
 * `proyectoId`) devuelve lista vacía, y el llamador (`despacho.ts`) registra
 * eso como un envío FALLIDO con el motivo, en vez de reventar la acción que
 * disparó la alerta.
 */
export async function resolverDestinatarios(
  admin: SupabaseClient<Database>,
  regla: Regla,
  contexto: ContextoDestinatarios
): Promise<Destinatario[]> {
  switch (regla.destinatarios_tipo) {
    case "PM_PROYECTO": {
      if (!contexto.proyectoId) return [];
      const { data: proyecto } = await admin
        .from("proyectos")
        .select("pm_id, perfiles_usuario!proyectos_pm_id_fkey(id, nombre_completo)")
        .eq("id", contexto.proyectoId)
        .maybeSingle();
      const pm = (proyecto as any)?.perfiles_usuario as { id: string; nombre_completo: string } | null;
      if (!pm) return [];
      return perfilesAEmailDestinatario(admin, [pm]);
    }

    case "EQUIPO_PROYECTO": {
      if (!contexto.proyectoId) return [];
      const [{ data: proyecto }, { data: asignaciones }] = await Promise.all([
        admin
          .from("proyectos")
          .select("pm_id, perfiles_usuario!proyectos_pm_id_fkey(id, nombre_completo)")
          .eq("id", contexto.proyectoId)
          .maybeSingle(),
        admin
          .from("asignacion_recursos")
          .select("perfiles_usuario!asignacion_recursos_recurso_id_fkey(id, nombre_completo)")
          .eq("proyecto_id", contexto.proyectoId),
      ]);

      const perfilesPorId = new Map<string, { id: string; nombre_completo: string }>();
      const pm = (proyecto as any)?.perfiles_usuario as { id: string; nombre_completo: string } | null;
      if (pm) perfilesPorId.set(pm.id, pm);
      (asignaciones ?? []).forEach((fila: any) => {
        const p = fila.perfiles_usuario as { id: string; nombre_completo: string } | null;
        if (p) perfilesPorId.set(p.id, p);
      });

      return perfilesAEmailDestinatario(admin, Array.from(perfilesPorId.values()));
    }

    case "ROL_ESPECIFICO": {
      if (!regla.destinatarios_rol_id) return [];
      const { data: perfiles } = await admin
        .from("perfiles_usuario")
        .select("id, nombre_completo")
        .eq("rol_id", regla.destinatarios_rol_id)
        .eq("empresa_id", contexto.empresaId)
        .eq("activo", true);
      return perfilesAEmailDestinatario(admin, perfiles ?? []);
    }

    case "USUARIO_ESPECIFICO": {
      if (!regla.destinatarios_usuario_id) return [];
      const { data: perfil } = await admin
        .from("perfiles_usuario")
        .select("id, nombre_completo")
        .eq("id", regla.destinatarios_usuario_id)
        .maybeSingle();
      if (!perfil) return [];
      return perfilesAEmailDestinatario(admin, [perfil]);
    }

    case "CLIENTE": {
      if (!contexto.cuentaId) return [];
      const { data: contactos } = await admin
        .from("contactos")
        .select("nombre, apellido, email, es_contacto_principal")
        .eq("cuenta_id", contexto.cuentaId)
        .eq("activo", true)
        .not("email", "is", null);
      if (!contactos || contactos.length === 0) return [];
      const principal = contactos.find((c) => c.es_contacto_principal) ?? contactos[0];
      return [
        {
          usuarioId: null,
          email: principal.email,
          nombre: [principal.nombre, principal.apellido].filter(Boolean).join(" "),
        },
      ];
    }

    default:
      return [];
  }
}
