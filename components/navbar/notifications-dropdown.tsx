"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Badge,
  Dropdown,
  DropdownItem,
  DropdownMenu,
  DropdownSection,
  DropdownTrigger,
  NavbarItem,
} from "@nextui-org/react";
import { createClient } from "@/utils/supabase/client";
import { useUser } from "@/hooks/useUser";
import type { Tables } from "@/utils/database.types";
import { NotificationIcon } from "../icons/navbar/notificationicon";

type Notificacion = Tables<"notificaciones_enviadas">;

const supabase = createClient();

// No hay un canal en tiempo real conectado aquí (no vale la pena una
// suscripción Realtime solo para el contador del campanita) — se refresca
// por sondeo periódico, igual de razonable para algo que no es chat.
const INTERVALO_SONDEO_MS = 60_000;
const LIMITE_LISTA = 15;

function formatearFecha(fecha: string | null): string {
  if (!fecha) return "";
  return new Date(fecha).toLocaleString("es", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Centro de notificaciones in-app real, sobre `notificaciones_enviadas`
 * (canal IN_APP, destinatario_usuario_id = auth.uid()). Antes de esto el
 * componente existía pero nunca se montaba en el navbar y mostraba contenido
 * de ejemplo (lorem ipsum) — ver migración 020 (columnas
 * destinatario_usuario_id/leida/leida_at/asunto/cuerpo + políticas RLS
 * "propias") y lib/alertas/despacho.ts (quien escribe estas filas).
 */
export const NotificationsDropdown = () => {
  const { user } = useUser();
  const [notificaciones, setNotificaciones] = useState<Notificacion[]>([]);
  const [noLeidas, setNoLeidas] = useState(0);
  const [cargando, setCargando] = useState(false);
  const [yaCargoAlgunaVez, setYaCargoAlgunaVez] = useState(false);

  const refrescarConteo = useCallback(async () => {
    if (!user) return;
    const { count } = await supabase
      .from("notificaciones_enviadas")
      .select("id", { count: "exact", head: true })
      .eq("destinatario_usuario_id", user.id)
      .eq("canal", "IN_APP")
      .eq("leida", false);
    setNoLeidas(count ?? 0);
  }, [user]);

  const cargarLista = useCallback(async () => {
    if (!user) return;
    setCargando(true);
    const { data } = await supabase
      .from("notificaciones_enviadas")
      .select("*")
      .eq("destinatario_usuario_id", user.id)
      .eq("canal", "IN_APP")
      .order("created_at", { ascending: false })
      .limit(LIMITE_LISTA);
    setNotificaciones(data ?? []);
    setCargando(false);
    setYaCargoAlgunaVez(true);
  }, [user]);

  useEffect(() => {
    if (!user) {
      setNotificaciones([]);
      setNoLeidas(0);
      return;
    }
    refrescarConteo();
    const intervalo = setInterval(refrescarConteo, INTERVALO_SONDEO_MS);
    return () => clearInterval(intervalo);
  }, [user, refrescarConteo]);

  const marcarComoLeida = async (id: string) => {
    setNotificaciones((prev) => prev.map((n) => (n.id === id ? { ...n, leida: true } : n)));
    setNoLeidas((prev) => Math.max(0, prev - 1));
    await supabase
      .from("notificaciones_enviadas")
      .update({ leida: true, leida_at: new Date().toISOString() })
      .eq("id", id);
  };

  const marcarTodasComoLeidas = async () => {
    if (!user || noLeidas === 0) return;
    setNotificaciones((prev) => prev.map((n) => ({ ...n, leida: true })));
    setNoLeidas(0);
    await supabase
      .from("notificaciones_enviadas")
      .update({ leida: true, leida_at: new Date().toISOString() })
      .eq("destinatario_usuario_id", user.id)
      .eq("canal", "IN_APP")
      .eq("leida", false);
  };

  if (!user) return null;

  return (
    <Dropdown placement="bottom-end" onOpenChange={(abierto) => abierto && cargarLista()}>
      <DropdownTrigger>
        <NavbarItem className="cursor-pointer">
          <Badge
            content={noLeidas > 9 ? "9+" : noLeidas}
            color="danger"
            shape="circle"
            size="sm"
            isInvisible={noLeidas === 0}
          >
            <NotificationIcon />
          </Badge>
        </NavbarItem>
      </DropdownTrigger>
      <DropdownMenu className="w-96 max-h-[70vh] overflow-y-auto" aria-label="Notificaciones">
        <DropdownSection title="Notificaciones">
          {[
            ...(noLeidas > 0
              ? [
                  <DropdownItem
                    key="__marcar-todas"
                    className="text-primary text-tiny"
                    onPress={marcarTodasComoLeidas}
                  >
                    Marcar todas como leídas ({noLeidas})
                  </DropdownItem>,
                ]
              : []),
            ...(cargando && !yaCargoAlgunaVez
              ? [
                  <DropdownItem key="__cargando" isReadOnly className="text-tiny text-default-400">
                    Cargando…
                  </DropdownItem>,
                ]
              : []),
            ...(!cargando && yaCargoAlgunaVez && notificaciones.length === 0
              ? [
                  <DropdownItem key="__vacio" isReadOnly className="text-tiny text-default-400">
                    No tienes notificaciones.
                  </DropdownItem>,
                ]
              : []),
            ...notificaciones.map((n) => (
              <DropdownItem
                key={n.id}
                onPress={() => !n.leida && marcarComoLeida(n.id)}
                classNames={{
                  base: n.leida ? "py-2 opacity-60" : "py-2",
                  title: "text-sm font-semibold",
                }}
                description={
                  <div className="flex flex-col gap-0.5">
                    {n.cuerpo && <span className="text-tiny line-clamp-2">{n.cuerpo}</span>}
                    <span className="text-tiny text-default-400">
                      {formatearFecha(n.fecha_envio ?? n.created_at)}
                    </span>
                  </div>
                }
              >
                {!n.leida && <span className="mr-1 inline-block h-2 w-2 rounded-full bg-primary align-middle" />}
                {n.asunto?.trim() || `Notificación — ${n.entidad_tipo}`}
              </DropdownItem>
            )),
          ]}
        </DropdownSection>
      </DropdownMenu>
    </Dropdown>
  );
};
