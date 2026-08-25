import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { getUsuarioActual, usuarioTienePermiso } from "@/lib/auth/getUsuarioActual";
import { AccesoDenegado } from "@/components/shared/acceso-denegado";
import { AuditoriaPanel } from "@/components/configuracion/auditoria/auditoria-panel";

const SUBLISTA = "auditoria";

interface Props {
  searchParams: {
    tabla?: string;
    operacion?: string;
    desde?: string;
    hasta?: string;
  };
}

export default async function AuditoriaPage({ searchParams }: Props) {
  const usuario = await getUsuarioActual();

  if (!usuarioTienePermiso(usuario, "CONFIGURACION", "leer", SUBLISTA)) {
    return <AccesoDenegado />;
  }

  const supabase = createClient(cookies());

  let consulta = supabase
    .from("log_auditoria")
    .select("*")
    .order("fecha_hora", { ascending: false })
    .limit(200);

  if (searchParams.tabla) consulta = consulta.eq("tabla_afectada", searchParams.tabla);
  if (searchParams.operacion) consulta = consulta.eq("operacion", searchParams.operacion as "INSERT" | "UPDATE" | "DELETE");
  if (searchParams.desde) consulta = consulta.gte("fecha_hora", searchParams.desde);
  if (searchParams.hasta) consulta = consulta.lte("fecha_hora", `${searchParams.hasta}T23:59:59`);

  const [{ data: registros }, { data: perfiles }, { data: tablasDistintas }] = await Promise.all([
    consulta,
    supabase.from("perfiles_usuario").select("id, nombre_completo"),
    supabase.from("log_auditoria").select("tabla_afectada").limit(1000),
  ]);

  const tablasUnicas = Array.from(new Set((tablasDistintas ?? []).map((r) => r.tabla_afectada))).sort();
  const nombresPorId = new Map((perfiles ?? []).map((p) => [p.id, p.nombre_completo]));

  return (
    <div className="my-10 px-4 lg:px-6 max-w-[95rem] mx-auto w-full flex flex-col gap-4">
      <div>
        <h3 className="text-xl font-semibold">Auditoría</h3>
        <p className="text-default-500 text-sm">
          Historial de cambios (creación, edición, eliminación) sobre los
          registros del ERP. Vista de solo lectura — se llena automáticamente
          por un disparador de base de datos, no hay forma de escribir aquí
          desde la aplicación. Muestra los últimos 200 registros que cumplan
          los filtros.
        </p>
      </div>

      <AuditoriaPanel
        registros={registros ?? []}
        tablas={tablasUnicas}
        nombresPorId={Object.fromEntries(nombresPorId)}
        filtros={{
          tabla: searchParams.tabla ?? "",
          operacion: searchParams.operacion ?? "",
          desde: searchParams.desde ?? "",
          hasta: searchParams.hasta ?? "",
        }}
      />
    </div>
  );
}
