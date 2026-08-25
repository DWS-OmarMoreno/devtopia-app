"use client";

import { Dropdown, DropdownTrigger, DropdownMenu, DropdownItem, Button } from "@nextui-org/react";

/**
 * Este starter viene con NextUI 2.0.22 (sin @nextui-org/select disponible en
 * esa versión — ver components/configuracion/usuarios/usuarios-tabla.tsx).
 * Este selector genérico reutiliza el mismo patrón con Dropdown para
 * cualquier lista de opciones id/etiqueta, en vez de repetirlo por módulo.
 */
export interface OpcionSelector {
  id: string;
  etiqueta: string;
}

interface Props {
  opciones: OpcionSelector[];
  valor: string | null;
  onCambiar: (id: string | null) => void;
  etiquetaAria: string;
  placeholder?: string;
  isDisabled?: boolean;
  permitirVacio?: boolean;
  etiquetaVacio?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function DropdownSelector({
  opciones,
  valor,
  onCambiar,
  etiquetaAria,
  placeholder = "Elegir…",
  isDisabled,
  permitirVacio,
  etiquetaVacio = "— Ninguno —",
  size = "sm",
  className,
}: Props) {
  const nombreActual = valor
    ? opciones.find((o) => o.id === valor)?.etiqueta ?? placeholder
    : permitirVacio
      ? etiquetaVacio
      : placeholder;

  return (
    <Dropdown>
      <DropdownTrigger>
        <Button
          size={size}
          variant="bordered"
          isDisabled={isDisabled}
          className={className ?? "min-w-[160px] justify-between"}
        >
          {nombreActual}
        </Button>
      </DropdownTrigger>
      <DropdownMenu
        aria-label={etiquetaAria}
        selectionMode="single"
        disallowEmptySelection={!permitirVacio}
        selectedKeys={valor ? new Set([valor]) : new Set()}
        onSelectionChange={(seleccion) => {
          if (seleccion === "all") return;
          const id = Array.from(seleccion)[0] as string | undefined;
          onCambiar(!id || id === "__vacio__" ? null : id);
        }}
      >
        {[
          ...(permitirVacio
            ? [<DropdownItem key="__vacio__">{etiquetaVacio}</DropdownItem>]
            : []),
          ...opciones.map((o) => <DropdownItem key={o.id}>{o.etiqueta}</DropdownItem>),
        ]}
      </DropdownMenu>
    </Dropdown>
  );
}
