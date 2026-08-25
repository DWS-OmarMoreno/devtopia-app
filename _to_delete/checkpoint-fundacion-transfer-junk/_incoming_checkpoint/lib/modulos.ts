import type { Modulo } from "@/lib/rbac";

export interface ModuloErp {
  modulo: Modulo;
  titulo: string;
  descripcion: string;
  href: string;
}

/**
 * Registro central de los 6 módulos de negocio del ERP. Único lugar donde se
 * define título/descripción/ruta de cada uno — el sidebar, la página de
 * inicio y la landing de Configuración lo consumen en vez de repetir esta
 * información en cada componente.
 */
export const MODULOS_ERP: ModuloErp[] = [
  {
    modulo: "CRM_VENTAS",
    titulo: "CRM y Ventas",
    descripcion: "Oportunidades, cotizaciones y conversión a proyecto.",
    href: "/crm",
  },
  {
    modulo: "PRODUCTOS_SERVICIOS",
    titulo: "Productos y Servicios",
    descripcion: "Catálogo de servicios, tarifas, licencias y SLA.",
    href: "/productos-servicios",
  },
  {
    modulo: "CONTRATOS_PROYECTOS",
    titulo: "Contratos y Proyectos",
    descripcion: "Hitos, timesheets, recursos, rentabilidad y change requests.",
    href: "/contratos-proyectos",
  },
  {
    modulo: "COMPRAS",
    titulo: "Compras y Subcontratación",
    descripcion: "Proveedores, freelancers y órdenes de costo.",
    href: "/compras",
  },
  {
    modulo: "CIERRE_POSTVENTA",
    titulo: "Cierre y Postventa",
    descripcion: "Checklist de liquidación, actas de cierre y garantías.",
    href: "/cierre-postventa",
  },
];
