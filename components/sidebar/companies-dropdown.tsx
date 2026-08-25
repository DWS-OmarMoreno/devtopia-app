"use client";
import React from "react";
import { AcmeIcon } from "../icons/acme-icon";
import { useUser } from "@/hooks/useUser";

/**
 * Antes era un selector de empresas ficticias (Facebook/Instagram/Twitter) de
 * la plantilla. El ERP hoy opera sobre una sola empresa por sesión (la de
 * `perfiles_usuario.empresa_id`); esto muestra su nombre real. El modelo de
 * datos sí soporta múltiples empresas (docs/data-model/00-overview.md §3), así
 * que si en el futuro un usuario pertenece a más de una, este es el lugar
 * donde se agregaría el selector real.
 */
export const CompaniesDropdown = () => {
  const { empresa } = useUser();

  return (
    <div className="flex items-center gap-2">
      <AcmeIcon />
      <div className="flex flex-col gap-1">
        <h3 className="text-lg font-medium m-0 text-default-900 -mb-1 whitespace-nowrap truncate max-w-[170px]">
          {empresa?.razon_social ?? "Devtopia ERP"}
        </h3>
        <span className="text-xs font-medium text-default-500">
          {empresa?.nombre_comercial ?? "Panel administrador"}
        </span>
      </div>
    </div>
  );
};
