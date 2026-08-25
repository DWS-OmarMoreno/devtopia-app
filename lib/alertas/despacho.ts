import "server-only";
import { createAdminClient, isAdminClientConfigured } from "@/utils/supabase/admin";
import { renderizarPlantilla } from "./plantilla";
import { enviarCorreo, isEmailConfigured } from "./email";
import { resolverDestinatarios } from "./destinatarios";

export interface ContextoAlerta {
  empresaId: string;
  eventoDisparador: string;
  entidadTipo: string;
  entidadId: string;
  /** Necesario para destinatarios PM_PROYECTO / EQUIPO_PROYECTO. */
  proyectoId?: string | null;
  /** Necesario para destinatarios CLIENTE. */
  cuentaId?: string | null;
  /** Variables disponibles para {{variable}} en la plantilla — ver lib/alertas/eventos.ts. */
  variables?: Record<string, string>;
}

/**
 * Punto de entrada único del motor de alertas. Se llama desde las server
 * actions justo después de que la operación principal (cambiar de estado
 * una cotización, aprobar una orden de costo, etc.) se confirmó exitosa —
 * NUNCA antes, para no notificar algo que en realidad falló.
 *
 * Contrato deliberado: esta función NUNCA lanza. Un fallo de despacho
 * (SMTP no configurado, destinatario sin correo, regla mal configurada,
 * service_role ausente) queda registrado en `notificaciones_enviadas` como
 * FALLIDO con el motivo, pero jamás debe tumbar la acción de negocio que la
 * originó — igual que el resto de dependencias externas opcionales del
 * proyecto (`SUPABASE_SERVICE_ROLE_KEY`, envío de invitaciones).
 *
 * También es deliberadamente "fire and forget" respecto al llamador: no se
 * espera que el usuario final vea ningún error de esta función en la UI de
 * la acción que disparó el evento — los fallos se consultan en Configuración
 * → Alertas → Historial de envíos, no en la pantalla de negocio.
 */
export async function dispararAlerta(contexto: ContextoAlerta): Promise<void> {
  if (!isAdminClientConfigured()) {
    // Sin service_role no hay forma de escribir notificaciones_enviadas para
    // otros usuarios (RLS lo impediría) ni de resolver correos de auth.users
    // — no hay nada auditable que registrar, así que solo se registra en
    // logs de servidor.
    console.error(
      `[alertas] SUPABASE_SERVICE_ROLE_KEY no configurada — no se pudo evaluar el evento ${contexto.eventoDisparador}.`
    );
    return;
  }

  const admin = createAdminClient();

  try {
    const { data: reglas, error } = await admin
      .from("alertas_notificaciones_reglas")
      .select("*")
      .eq("empresa_id", contexto.empresaId)
      .eq("evento_disparador", contexto.eventoDisparador)
      .eq("activa", true);

    if (error || !reglas || reglas.length === 0) return;

    for (const regla of reglas) {
      const destinatarios = await resolverDestinatarios(admin, regla, {
        empresaId: contexto.empresaId,
        proyectoId: contexto.proyectoId,
        cuentaId: contexto.cuentaId,
      });

      const variables = contexto.variables ?? {};
      const asunto = renderizarPlantilla(regla.plantilla_asunto ?? "", variables);
      const cuerpo = renderizarPlantilla(regla.plantilla_cuerpo ?? "", variables);

      if (destinatarios.length === 0) {
        await admin.from("notificaciones_enviadas").insert({
          regla_id: regla.id,
          entidad_tipo: contexto.entidadTipo,
          entidad_id: contexto.entidadId,
          destinatario: "(sin destinatario resuelto)",
          canal: regla.canal,
          estado_envio: "FALLIDO",
          detalle_error: `No se pudo resolver ningún destinatario para destinatarios_tipo=${regla.destinatarios_tipo} (revisa que la regla tenga el rol/usuario configurado y que el evento traiga proyecto/cuenta de contexto).`,
          intentos: 1,
          fecha_envio: new Date().toISOString(),
          asunto,
          cuerpo,
        });
        continue;
      }

      for (const destinatario of destinatarios) {
        await despacharUnDestinatario(admin, regla, contexto, destinatario, asunto, cuerpo);
      }
    }
  } catch (error) {
    console.error(`[alertas] Error inesperado despachando ${contexto.eventoDisparador}:`, error);
  }
}

async function despacharUnDestinatario(
  admin: ReturnType<typeof createAdminClient>,
  regla: { id: string; canal: string },
  contexto: ContextoAlerta,
  destinatario: { usuarioId: string | null; email: string | null; nombre: string },
  asunto: string,
  cuerpo: string
) {
  const base = {
    regla_id: regla.id,
    entidad_tipo: contexto.entidadTipo,
    entidad_id: contexto.entidadId,
    destinatario_usuario_id: destinatario.usuarioId,
    asunto,
    cuerpo,
  };

  if (regla.canal === "IN_APP") {
    if (!destinatario.usuarioId) {
      // Un destinatario externo (CLIENTE) no tiene sesión en la app — no hay
      // dónde mostrarle una notificación in-app.
      await admin.from("notificaciones_enviadas").insert({
        ...base,
        destinatario: destinatario.nombre || destinatario.email || "(externo)",
        canal: "IN_APP",
        estado_envio: "FALLIDO",
        detalle_error: "El destinatario es externo (CLIENTE) — el canal IN_APP no aplica, usa EMAIL.",
        intentos: 1,
        fecha_envio: new Date().toISOString(),
      });
      return;
    }
    await admin.from("notificaciones_enviadas").insert({
      ...base,
      destinatario: destinatario.nombre,
      canal: "IN_APP",
      estado_envio: "ENVIADO",
      intentos: 1,
      fecha_envio: new Date().toISOString(),
    });
    return;
  }

  if (regla.canal === "EMAIL") {
    if (!destinatario.email) {
      await admin.from("notificaciones_enviadas").insert({
        ...base,
        destinatario: destinatario.nombre || "(sin correo)",
        canal: "EMAIL",
        estado_envio: "FALLIDO",
        detalle_error: `No se encontró un correo para ${destinatario.nombre || "el destinatario"}.`,
        intentos: 1,
        fecha_envio: new Date().toISOString(),
      });
      return;
    }

    if (!isEmailConfigured()) {
      await admin.from("notificaciones_enviadas").insert({
        ...base,
        destinatario: destinatario.email,
        canal: "EMAIL",
        estado_envio: "FALLIDO",
        detalle_error: "SMTP no está configurado en el servidor (ver lib/alertas/email.ts).",
        intentos: 1,
        fecha_envio: new Date().toISOString(),
      });
      return;
    }

    const resultado = await enviarCorreo({ destinatario: destinatario.email, asunto, cuerpo });
    await admin.from("notificaciones_enviadas").insert({
      ...base,
      destinatario: destinatario.email,
      canal: "EMAIL",
      estado_envio: resultado.ok ? "ENVIADO" : "FALLIDO",
      detalle_error: resultado.ok ? null : resultado.error,
      intentos: 1,
      fecha_envio: new Date().toISOString(),
    });
    return;
  }

  // WEBHOOK: el catálogo de canales lo contempla desde Checkpoint 4, pero no
  // hay ninguna URL de destino configurable todavía por regla (solo existe
  // webhooks_salientes, ligado a integraciones, no a alertas) — se registra
  // como FALLIDO explícito en vez de fingir que se envió algo.
  await admin.from("notificaciones_enviadas").insert({
    ...base,
    destinatario: destinatario.nombre || destinatario.email || "(desconocido)",
    canal: "WEBHOOK",
    estado_envio: "FALLIDO",
    detalle_error: "El canal WEBHOOK todavía no está implementado para reglas de alertas.",
    intentos: 1,
    fecha_envio: new Date().toISOString(),
  });
}
