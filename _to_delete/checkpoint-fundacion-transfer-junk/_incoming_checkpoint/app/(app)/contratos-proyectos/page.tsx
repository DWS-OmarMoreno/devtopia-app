import { getUsuarioActual, usuarioTienePermiso } from "@/lib/auth/getUsuarioActual";
import { AccesoDenegado } from "@/components/shared/acceso-denegado";
import { ModuloEnConstruccion } from "@/components/shared/modulo-en-construccion";

export default async function ContratosProyectosPage() {
  const usuario = await getUsuarioActual();

  if (!usuarioTienePermiso(usuario, "CONTRATOS_PROYECTOS", "leer")) {
    return <AccesoDenegado />;
  }

  return (
    <ModuloEnConstruccion
      titulo="Contratos y Proyectos"
      descripcion="Hitos y entregables, timesheets, asignación de recursos, rentabilidad, change requests y las sublistas de facturación y soporte externos."
    />
  );
}
