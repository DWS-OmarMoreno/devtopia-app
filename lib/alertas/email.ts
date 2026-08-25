import "server-only";
import nodemailer from "nodemailer";

/**
 * Envío de correo vía SMTP genérico (decisión del usuario: cualquier
 * proveedor que funcione por credenciales SMTP estándar, sin atarse a un
 * proveedor específico). Sigue el mismo patrón de resiliencia que
 * `utils/supabase/admin.ts`: la ausencia de configuración NUNCA debe tumbar
 * la acción que originó la alerta — solo impide el envío de ese correo en
 * particular, que queda registrado como FALLIDO en `notificaciones_enviadas`
 * con un mensaje explícito.
 *
 * Variables de entorno esperadas en `.env.local` (server-only, nunca con
 * prefijo NEXT_PUBLIC_ — nunca se escribe aquí ni se le pide al usuario su
 * valor real, solo los nombres):
 *   SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, SMTP_FROM_EMAIL,
 *   SMTP_FROM_NOMBRE (opcional, por defecto "Devtopia ERP"),
 *   SMTP_SECURE (opcional, "true" para el puerto 465 con TLS implícito).
 */

const REQUERIDAS = ["SMTP_HOST", "SMTP_PORT", "SMTP_USER", "SMTP_PASSWORD", "SMTP_FROM_EMAIL"] as const;

export function isEmailConfigured(): boolean {
  return REQUERIDAS.every((clave) => Boolean(process.env[clave]));
}

let transportadorCache: ReturnType<typeof nodemailer.createTransport> | null = null;

function obtenerTransportador() {
  if (transportadorCache) return transportadorCache;

  transportadorCache = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: process.env.SMTP_SECURE === "true",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD,
    },
  });

  return transportadorCache;
}

export interface ResultadoEnvioCorreo {
  ok: boolean;
  error?: string;
}

export async function enviarCorreo(params: {
  destinatario: string;
  asunto: string;
  cuerpo: string;
}): Promise<ResultadoEnvioCorreo> {
  if (!isEmailConfigured()) {
    return {
      ok: false,
      error:
        "SMTP no está configurado (faltan una o más de SMTP_HOST/SMTP_PORT/" +
        "SMTP_USER/SMTP_PASSWORD/SMTP_FROM_EMAIL en .env.local).",
    };
  }

  const nombreRemitente = process.env.SMTP_FROM_NOMBRE || "Devtopia ERP";

  try {
    await obtenerTransportador().sendMail({
      from: `"${nombreRemitente}" <${process.env.SMTP_FROM_EMAIL}>`,
      to: params.destinatario,
      subject: params.asunto,
      text: params.cuerpo,
    });
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Error desconocido enviando el correo.",
    };
  }
}
