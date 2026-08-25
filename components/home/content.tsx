"use client";
import React from "react";
import NextLink from "next/link";
import { Card, CardBody, CardHeader, Chip } from "@nextui-org/react";
import { useUser } from "@/hooks/useUser";
import { MODULOS_ERP } from "@/lib/modulos";

export const Content = () => {
  const { perfil, rol, empresa, tienePermiso, loading } = useUser();

  const modulosVisibles = MODULOS_ERP.filter((m) => tienePermiso(m.modulo, "leer"));

  return (
    <div className="h-full lg:px-6 py-6">
      <div className="max-w-[90rem] mx-auto w-full flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-semibold">
            {loading
              ? "Cargando…"
              : `Hola, ${perfil?.nombre_completo?.split(" ")[0] ?? ""}`}
          </h1>
          <p className="text-default-500">
            {empresa?.razon_social ?? "Devtopia ERP"}
            {rol && (
              <>
                {" · "}
                <Chip size="sm" variant="flat" color="primary">
                  {rol.nombre}
                </Chip>
              </>
            )}
          </p>
        </div>

        {!loading && rol?.nombre === "Pendiente de Asignación" && (
          <Card className="border border-warning-200 bg-warning-50">
            <CardBody>
              <p className="font-medium text-warning-700">
                Tu cuenta todavía no tiene un rol asignado.
              </p>
              <p className="text-warning-600 text-sm">
                Pide a un Administrador que te asigne un rol en Configuración
                → Usuarios para poder ver los módulos del ERP.
              </p>
            </CardBody>
          </Card>
        )}

        {!loading && modulosVisibles.length > 0 && (
          <div>
            <h3 className="text-xl font-semibold mb-3">Módulos</h3>
            <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-5">
              {modulosVisibles.map((m) => (
                <NextLink key={m.modulo} href={m.href}>
                  <Card className="hover:shadow-lg transition-shadow h-full">
                    <CardHeader className="font-semibold">{m.titulo}</CardHeader>
                    <CardBody className="text-default-500 text-sm pt-0">
                      {m.descripcion}
                    </CardBody>
                  </Card>
                </NextLink>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
