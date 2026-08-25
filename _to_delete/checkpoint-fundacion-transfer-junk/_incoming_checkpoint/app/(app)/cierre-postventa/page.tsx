import { getUsuarioActual, usuarioTienePermiso } from "@/lib/auth/getUsuarioActual";
import { AccesoDenegado } from "@/components/shared/acceso-denegado";
import { ModuloEnConstruccion } from "@/components/shared/modulo-en-construccion";

export default async function CierrePostventaPage() {
  const usuario = await getUsuarioActual();

  if (!usuarioTienePermiso(usuario, "CIERRE_POSTVENTA", "leer")) {
    return <AccesoDenegado />;
  }

  return (
    <ModuloEnConstruccion
      titulo="Cierre y Postventa"
      descripcion="Checklist de liquidación, actas de cierre y control de garantía contractual."
    />
  );
}
