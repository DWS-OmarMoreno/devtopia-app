import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient, isAdminClientConfigured } from "@/utils/supabase/admin";
import { dispararAlerta } from "@/lib/alertas/despacho";

export const dynamic = "force-dynamic";

/**
 * Evalúa los eventos disparadores basados en TIEMPO (ver lib/alertas/eventos.ts,
 * categoría "TIEMPO": hoy HITO_PROXIMO_VENCER y CONTRATO_PROXIMO_VENCER) y
 * dispara las alertas correspondientes. Nada en el proyecto llama esto solo
 * — necesita que algo externo lo invoque periódicamente (Vercel Cron,
 * GitHub Actions con `schedule`, un cron-job.org apuntando a esta URL,
 * `pg_cron` + extensión `http` de Supabase, etc.). Cuál de esas opciones usar
 * depende de dónde se despliegue la app — ver nota en frontend-devtopia-app.md.
 *
 * Protegida con un secreto compartido en el header Authorization (nunca con
 * un query param, para que no quede en logs de acceso) — variable de entorno
 * ALERTAS_CRON_SECRET, server-only, generada por el usuario (cualquier
 * cadena larga aleatoria sirve, no es una credencial de ningún proveedor).
 * El servicio externo que dispare el cron debe enviar:
 *   Authorization: Bearer <valor de ALERTAS_CRON_SECRET>
 *
 * Deduplicación: antes de disparar una alerta para una fila concreta, se
 * comprueba si ya existe un envío registrado para esa (regla_id, entidad_id)
 * en las últimas 20 horas — evita reenviar el mismo aviso si el cron corre
 * más de una vez por día, sin depender de conocer la frecuencia exacta del
 * cron externo.
 */

const VENTANA_DEDUP_HORAS = 20;
const DIAS_ANTES_POR_DEFECTO_HITO = 7;
const DIAS_ANTES_POR_DEFECTO_CONTRATO = 15;
const DIAS_ANTES_POR_DEFECTO_GARANTIA = 30;

function autorizado(request: NextRequest): boolean {
  const secreto = process.env.ALERTAS_CRON_SECRET;
  if (!secreto) return false;
  return request.headers.get("authorization") === `Bearer ${secreto}`;
}

type AdminClient = ReturnType<typeof createAdminClient>;

async function fueNotificadoRecientemente(admin: AdminClient, reglaId: string, entidadId: string): Promise<boolean> {
  const desde = new Date(Date.now() - VENTANA_DEDUP_HORAS * 60 * 60 * 1000).toISOString();
  const { count } = await admin
    .from("notificaciones_enviadas")
    .select("id", { count: "exact", head: true })
    .eq("regla_id", reglaId)
    .eq("entidad_id", entidadId)
    .gte("created_at", desde);
  return (count ?? 0) > 0;
}

function fechaISO(offsetDias: number): string {
  return new Date(Date.now() + offsetDias * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

async function evaluarHitosProximosAVencer(admin: AdminClient) {
  const resultado = { evaluados: 0, disparados: 0 };

  const { data: reglas } = await admin
    .from("alertas_notificaciones_reglas")
    .select("*")
    .eq("evento_disparador", "HITO_PROXIMO_VENCER")
    .eq("activa", true);

  for (const regla of reglas ?? []) {
    const diasAntes = Number((regla.parametros as Record<string, unknown> | null)?.dias_antes) || DIAS_ANTES_POR_DEFECTO_HITO;
    const hoy = fechaISO(0);
    const limite = fechaISO(diasAntes);

    const { data: proyectos } = await admin
      .from("proyectos")
      .select("id, numero_proyecto, contratos(cuenta_id)")
      .eq("empresa_id", regla.empresa_id);

    const proyectoIds = (proyectos ?? []).map((p) => p.id);
    if (proyectoIds.length === 0) continue;

    const proyectosPorId = new Map(
      (proyectos ?? []).map((p) => [p.id, { numeroProyecto: p.numero_proyecto, cuentaId: (p as any).contratos?.cuenta_id ?? null }])
    );

    const { data: hitos } = await admin
      .from("hitos_entregables")
      .select("id, numero_entregable, nombre, proyecto_id, fecha_planeada_entrega, estado")
      .in("proyecto_id", proyectoIds)
      .not("estado", "in", "(ENTREGADO,EN_REVISION_CLIENTE,ACEPTADO,RECHAZADO)")
      .gte("fecha_planeada_entrega", hoy)
      .lte("fecha_planeada_entrega", limite);

    for (const hito of hitos ?? []) {
      resultado.evaluados += 1;
      if (await fueNotificadoRecientemente(admin, regla.id, hito.id)) continue;

      const proyectoInfo = proyectosPorId.get(hito.proyecto_id);
      await dispararAlerta({
        empresaId: regla.empresa_id,
        eventoDisparador: "HITO_PROXIMO_VENCER",
        entidadTipo: "HITO",
        entidadId: hito.id,
        proyectoId: hito.proyecto_id,
        cuentaId: proyectoInfo?.cuentaId ?? null,
        variables: {
          numero_entregable: hito.numero_entregable,
          nombre_hito: hito.nombre,
          numero_proyecto: proyectoInfo?.numeroProyecto ?? "",
          fecha_planeada_entrega: hito.fecha_planeada_entrega,
        },
      });
      resultado.disparados += 1;
    }
  }

  return resultado;
}

async function evaluarContratosProximosAVencer(admin: AdminClient) {
  const resultado = { evaluados: 0, disparados: 0 };

  const { data: reglas } = await admin
    .from("alertas_notificaciones_reglas")
    .select("*")
    .eq("evento_disparador", "CONTRATO_PROXIMO_VENCER")
    .eq("activa", true);

  for (const regla of reglas ?? []) {
    const diasAntes =
      Number((regla.parametros as Record<string, unknown> | null)?.dias_antes) || DIAS_ANTES_POR_DEFECTO_CONTRATO;
    const hoy = fechaISO(0);
    const limite = fechaISO(diasAntes);

    const { data: estadosBloqueados } = await admin
      .from("estados_ciclo_vida")
      .select("id")
      .eq("entidad_aplicable", "CONTRATO")
      .in("codigo_estado", ["FINALIZADO", "CANCELADO"]);
    const idsBloqueados = (estadosBloqueados ?? []).map((e) => e.id);

    let consulta = admin
      .from("contratos")
      .select("id, numero_contrato, cuenta_id, fecha_fin_estimada, cuentas_clientes(razon_social)")
      .eq("empresa_id", regla.empresa_id)
      .not("fecha_fin_estimada", "is", null)
      .gte("fecha_fin_estimada", hoy)
      .lte("fecha_fin_estimada", limite);

    if (idsBloqueados.length > 0) {
      consulta = consulta.not("estado_id", "in", `(${idsBloqueados.join(",")})`);
    }

    const { data: contratos } = await consulta;

    for (const contrato of contratos ?? []) {
      resultado.evaluados += 1;
      if (await fueNotificadoRecientemente(admin, regla.id, contrato.id)) continue;

      await dispararAlerta({
        empresaId: regla.empresa_id,
        eventoDisparador: "CONTRATO_PROXIMO_VENCER",
        entidadTipo: "CONTRATO",
        entidadId: contrato.id,
        cuentaId: contrato.cuenta_id,
        variables: {
          numero_contrato: contrato.numero_contrato,
          cuenta: (contrato as any).cuentas_clientes?.razon_social ?? "",
          fecha_fin_estimada: contrato.fecha_fin_estimada ?? "",
        },
      });
      resultado.disparados += 1;
    }
  }

  return resultado;
}

/**
 * Cierra el círculo documentado en lib/alertas/eventos.ts: GARANTIA_PROXIMA_VENCER
 * estaba deliberadamente excluido hasta que existiera la tabla `garantias_contractuales`
 * (construida en la etapa de Cierre y Postventa) — ya existe, así que se conecta aquí
 * siguiendo el mismo patrón que evaluarHitosProximosAVencer/evaluarContratosProximosAVencer.
 *
 * `garantias_contractuales` no tiene `empresa_id` propia (a diferencia de hitos/contratos)
 * — la empresa se deriva del proyecto asociado o, si no tiene proyecto, del contrato
 * asociado (mismo criterio coalesce(fn_empresa_de_proyecto, fn_empresa_de_contrato) que
 * usa la migración 021 para el RLS de esta tabla). Por eso la consulta no puede filtrar
 * por empresa_id directamente en SQL: se trae una sola vez el conjunto de garantías cuya
 * fecha_fin_garantia cae dentro de la ventana más amplia entre todas las reglas activas,
 * y se filtra por empresa/dias_antes en memoria por cada regla.
 *
 * cuenta_id para el destinatario CLIENTE: se toma únicamente del contrato asociado
 * directamente (contrato_id). Una garantía vinculada solo a un proyecto (sin contrato_id
 * propio) queda sin cuenta_id aquí — encadenar el embed proyectos->contratos generaba un
 * tipo ambiguo en database.types.ts (dos rutas de relación distintas hacia `contratos`
 * desde la misma tabla) que TypeScript no podía resolver; es la misma limitación conocida
 * y documentada que la migración 021 acepta para el alcance EQUIPO/PROPIOS de esta tabla.
 */
async function evaluarGarantiasProximasAVencer(admin: AdminClient) {
  const resultado = { evaluados: 0, disparados: 0 };

  const { data: reglas } = await admin
    .from("alertas_notificaciones_reglas")
    .select("*")
    .eq("evento_disparador", "GARANTIA_PROXIMA_VENCER")
    .eq("activa", true);

  if (!reglas || reglas.length === 0) return resultado;

  const hoy = fechaISO(0);
  const diasAntesPorRegla = reglas.map(
    (regla) => Number((regla.parametros as Record<string, unknown> | null)?.dias_antes) || DIAS_ANTES_POR_DEFECTO_GARANTIA
  );
  const limiteMasAmplio = fechaISO(Math.max(...diasAntesPorRegla));

  const { data: garantias } = await admin
    .from("garantias_contractuales")
    .select("id, proyecto_id, fecha_fin_garantia, proyectos(empresa_id, numero_proyecto), contratos(empresa_id, numero_contrato, cuenta_id)")
    .gte("fecha_fin_garantia", hoy)
    .lte("fecha_fin_garantia", limiteMasAmplio);

  for (const regla of reglas) {
    const diasAntes = Number((regla.parametros as Record<string, unknown> | null)?.dias_antes) || DIAS_ANTES_POR_DEFECTO_GARANTIA;
    const limite = fechaISO(diasAntes);

    for (const garantia of garantias ?? []) {
      if (garantia.fecha_fin_garantia > limite) continue;

      const proyecto = (garantia as any).proyectos as { empresa_id: string; numero_proyecto: string } | null;
      const contratoDirecto = (garantia as any).contratos as { empresa_id: string; numero_contrato: string; cuenta_id: string } | null;

      const empresaId = proyecto?.empresa_id ?? contratoDirecto?.empresa_id;
      if (empresaId !== regla.empresa_id) continue;

      resultado.evaluados += 1;
      if (await fueNotificadoRecientemente(admin, regla.id, garantia.id)) continue;

      await dispararAlerta({
        empresaId: regla.empresa_id,
        eventoDisparador: "GARANTIA_PROXIMA_VENCER",
        entidadTipo: "GARANTIA",
        entidadId: garantia.id,
        proyectoId: garantia.proyecto_id,
        cuentaId: contratoDirecto?.cuenta_id ?? null,
        variables: {
          numero_proyecto: proyecto?.numero_proyecto ?? "",
          numero_contrato: contratoDirecto?.numero_contrato ?? "",
          fecha_fin_garantia: garantia.fecha_fin_garantia,
        },
      });
      resultado.disparados += 1;
    }
  }

  return resultado;
}

export async function GET(request: NextRequest) {
  if (!autorizado(request)) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }
  if (!isAdminClientConfigured()) {
    return NextResponse.json({ error: "SUPABASE_SERVICE_ROLE_KEY no está configurada." }, { status: 500 });
  }

  const admin = createAdminClient();

  try {
    const [hitos, contratos, garantias] = await Promise.all([
      evaluarHitosProximosAVencer(admin),
      evaluarContratosProximosAVencer(admin),
      evaluarGarantiasProximasAVencer(admin),
    ]);

    return NextResponse.json({ ok: true, hitos, contratos, garantias });
  } catch (error) {
    console.error("[cron evaluar-alertas] Error inesperado:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Error desconocido." },
      { status: 500 }
    );
  }
}

// Algunos proveedores de cron (ej. GitHub Actions con curl -X POST) prefieren
// POST — se acepta igual, mismo comportamiento que GET.
export const POST = GET;
