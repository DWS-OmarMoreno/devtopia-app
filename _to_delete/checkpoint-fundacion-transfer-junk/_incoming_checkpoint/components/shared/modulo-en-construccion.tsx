import React from "react";
import { Card, CardBody } from "@nextui-org/react";

interface Props {
  titulo: string;
  descripcion: string;
}

/**
 * Placeholder para un módulo cuya navegación, permisos y ruta ya están
 * conectados de punta a punta, pero cuyas pantallas de negocio (listados,
 * formularios, server actions) se construyen en la siguiente etapa —
 * ver docs/data-model/README.md para el orden de dependencia entre módulos.
 */
export const ModuloEnConstruccion = ({ titulo, descripcion }: Props) => (
  <div className="my-10 px-4 lg:px-6 max-w-[95rem] mx-auto w-full flex flex-col gap-4">
    <h3 className="text-xl font-semibold">{titulo}</h3>
    <Card>
      <CardBody className="gap-2 py-10 items-center text-center">
        <p className="font-medium">Este módulo está en construcción.</p>
        <p className="text-default-500 text-sm max-w-md">{descripcion}</p>
      </CardBody>
    </Card>
  </div>
);
