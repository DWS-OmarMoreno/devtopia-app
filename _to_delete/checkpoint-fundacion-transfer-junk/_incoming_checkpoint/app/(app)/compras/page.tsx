import { getUsuarioActual, usuarioTienePermiso } from "@/lib/auth/getUsuarioActual";
import { AccesoDenegado } from "@/components/shared/acceso-denegado";
import { ModuloEnConstruccion } from "@/components/shared/modulo-en-construccion";

export default async function ComprasPage() {
  const usuario = await getUsuarioActual();

  if (!usuarioTienePermiso(usuario, "COMPRAS", "leer")) {
    return <AccesoDenegado />;
  }

  return (
    <ModuloEnConstruccion
      titulo="Compras y Subcontratación"
      descripcion="Proveedores y freelancers, y las órdenes de costo por contratación externa asignadas a cada proyecto."
    />
  );
}
