import NextLink from "next/link";
import { Card, CardBody, CardHeader, Chip } from "@nextui-org/react";
import { getUsuarioActual, usuarioTienePermiso } from "@/lib/auth/getUsuarioActual";
import { AccesoDenegado } from "@/components/shared/acceso-denegado";

interface TarjetaConfiguracion {
  titulo: string;
  descripcion: string;
  href?: string;
  sublista?: string;
}

const TARJETAS: TarjetaConfiguracion[] = [
  {
    titulo: "Usuarios",
    descripcion: "Invitar usuarios, asignar rol y activar o desactivar el acceso.",
    href: "/configuracion/usuarios",
    sublista: "perfiles_usuario",
  },
  { titulo: "Roles y Permisos", descripcion: "Matriz de permisos por rol y módulo." },
  { titulo: "Parámetros Globales", descripcion: "Moneda, impuestos y datos de la empresa." },
  { titulo: "Consecutivos", descripcion: "Numeración de cotizaciones, contratos y órdenes." },
  { titulo: "Alertas", descripcion: "Reglas de notificación por evento y destinatario." },
  { titulo: "Integraciones", descripcion: "Conexiones externas (correo, facturación, etc.)." },
  { titulo: "Workflows", descripcion: "Transiciones de estado permitidas por documento." },
  { titulo: "Auditoría", descripcion: "Historial de cambios sobre los registros del ERP." },
];

export default async function ConfiguracionPage() {
  const usuario = await getUsuarioActual();

  if (!usuarioTienePermiso(usuario, "CONFIGURACION", "leer")) {
    return <AccesoDenegado />;
  }

  return (
    <div className="my-10 px-4 lg:px-6 max-w-[95rem] mx-auto w-full flex flex-col gap-4">
      <div>
        <h3 className="text-xl font-semibold">Configuración General</h3>
        <p className="text-default-500 text-sm">
          Parámetros compartidos por los 5 módulos de negocio del ERP.
        </p>
      </div>

      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-5">
        {TARJETAS.map((tarjeta) => {
          const habilitada =
            Boolean(tarjeta.href) &&
            usuarioTienePermiso(usuario, "CONFIGURACION", "leer", tarjeta.sublista);

          const contenido = (
            <Card
              className={
                habilitada
                  ? "hover:shadow-lg transition-shadow h-full"
                  : "h-full opacity-60"
              }
            >
              <CardHeader className="font-semibold justify-between">
                {tarjeta.titulo}
                {!tarjeta.href && (
                  <Chip size="sm" variant="flat">
                    Próximamente
                  </Chip>
                )}
              </CardHeader>
              <CardBody className="text-default-500 text-sm pt-0">
                {tarjeta.descripcion}
              </CardBody>
            </Card>
          );

          return habilitada ? (
            <NextLink key={tarjeta.titulo} href={tarjeta.href!}>
              {contenido}
            </NextLink>
          ) : (
            <div key={tarjeta.titulo}>{contenido}</div>
          );
        })}
      </div>
    </div>
  );
}
