import { getUsuarioActual, usuarioTienePermiso } from "@/lib/auth/getUsuarioActual";
import { AccesoDenegado } from "@/components/shared/acceso-denegado";
import { ModuloEnConstruccion } from "@/components/shared/modulo-en-construccion";

export default async function CrmPage() {
  const usuario = await getUsuarioActual();

  if (!usuarioTienePermiso(usuario, "CRM_VENTAS", "leer")) {
    return <AccesoDenegado />;
  }

  return (
    <ModuloEnConstruccion
      titulo="CRM y Ventas"
      descripcion="Cuentas, contactos, oportunidades y cotizaciones — con conversión directa a proyecto. Próxima etapa del plan de construcción."
    />
  );
}
