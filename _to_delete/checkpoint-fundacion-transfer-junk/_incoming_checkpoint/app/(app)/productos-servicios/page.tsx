import { getUsuarioActual, usuarioTienePermiso } from "@/lib/auth/getUsuarioActual";
import { AccesoDenegado } from "@/components/shared/acceso-denegado";
import { ModuloEnConstruccion } from "@/components/shared/modulo-en-construccion";

export default async function ProductosServiciosPage() {
  const usuario = await getUsuarioActual();

  if (!usuarioTienePermiso(usuario, "PRODUCTOS_SERVICIOS", "leer")) {
    return <AccesoDenegado />;
  }

  return (
    <ModuloEnConstruccion
      titulo="Productos y Servicios"
      descripcion="Catálogo de servicios y tarifas, roles facturables, paquetes, licencias/suscripciones y definición de SLA."
    />
  );
}
