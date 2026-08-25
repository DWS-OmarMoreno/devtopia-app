import React from "react";
import { Card, CardBody } from "@nextui-org/react";

/**
 * Se muestra cuando un usuario navega directamente a la URL de un módulo para
 * el que su rol no tiene permiso de lectura. Es una guarda de UX — la
 * protección real de los datos la hace RLS en Postgres, esto solo evita que
 * la persona vea una pantalla vacía sin explicación.
 */
export const AccesoDenegado = () => (
  <div className="my-10 px-4 lg:px-6 max-w-[95rem] mx-auto w-full">
    <Card>
      <CardBody className="gap-2 py-10 items-center text-center">
        <p className="font-medium">No tienes acceso a este módulo.</p>
        <p className="text-default-500 text-sm max-w-md">
          Si crees que deberías tenerlo, pide a un Administrador que revise tu
          rol en Configuración → Usuarios.
        </p>
      </CardBody>
    </Card>
  </div>
);
