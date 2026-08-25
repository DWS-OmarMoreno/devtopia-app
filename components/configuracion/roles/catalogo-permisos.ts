import { MODULOS, ETIQUETAS_MODULO, type Modulo } from "@/lib/rbac";

export interface SublistaCatalogo {
  sublista: string | null;
  etiqueta: string;
}

export interface ModuloCatalogo {
  modulo: Modulo;
  etiqueta: string;
  sublistas: SublistaCatalogo[];
}

/**
 * Catálogo de referencia módulo → sublistas usadas por las políticas RLS
 * generadas con fn_crear_politicas_rls() (ver migraciones de cada módulo).
 * Se armó consultando pg_policies en Postgres local (devtopia_test) para
 * cada tabla y extrayendo el segundo/tercer argumento de fn_tiene_permiso(),
 * no a mano — así que debería reflejar exactamente lo que las políticas
 * realmente verifican hoy. Si se agrega una tabla/sublista nueva a un
 * módulo, hay que agregarla aquí también para que el editor de matriz la
 * ofrezca.
 *
 * "General (todo el módulo)" (sublista = null) es la fila de fallback que
 * usa fn_tiene_permiso(): si no existe una fila específica para la
 * sublista consultada, se usa esta. Es válida y útil para los 6 módulos,
 * no solo los que tienen una tabla puramente a nivel de módulo.
 */
export const CATALOGO_MODULOS: ModuloCatalogo[] = [
  {
    modulo: "CONFIGURACION",
    etiqueta: ETIQUETAS_MODULO.CONFIGURACION,
    sublistas: [
      { sublista: null, etiqueta: "General (todo el módulo)" },
      { sublista: "perfiles_usuario", etiqueta: "Usuarios" },
      { sublista: "roles", etiqueta: "Roles y permisos" },
      { sublista: "secuencias_numeracion", etiqueta: "Consecutivos" },
      { sublista: "alertas", etiqueta: "Alertas" },
      { sublista: "integraciones", etiqueta: "Integraciones" },
      { sublista: "workflows", etiqueta: "Workflows" },
      { sublista: "catalogos", etiqueta: "Catálogos generales" },
      { sublista: "monedas", etiqueta: "Monedas" },
      { sublista: "auditoria", etiqueta: "Auditoría" },
    ],
  },
  {
    modulo: "CRM_VENTAS",
    etiqueta: ETIQUETAS_MODULO.CRM_VENTAS,
    sublistas: [
      { sublista: null, etiqueta: "General (todo el módulo)" },
      { sublista: "cuentas", etiqueta: "Cuentas de cliente" },
      { sublista: "contactos", etiqueta: "Contactos" },
      { sublista: "oportunidades", etiqueta: "Oportunidades" },
      { sublista: "cotizaciones", etiqueta: "Cotizaciones" },
    ],
  },
  {
    modulo: "PRODUCTOS_SERVICIOS",
    etiqueta: ETIQUETAS_MODULO.PRODUCTOS_SERVICIOS,
    sublistas: [
      { sublista: null, etiqueta: "General (servicios, categorías)" },
      { sublista: "roles_tarifa", etiqueta: "Roles y tarifa" },
      { sublista: "sla", etiqueta: "Planes SLA" },
      { sublista: "paquetes", etiqueta: "Paquetes" },
      { sublista: "licencias", etiqueta: "Licencias y suscripciones" },
    ],
  },
  {
    modulo: "CONTRATOS_PROYECTOS",
    etiqueta: ETIQUETAS_MODULO.CONTRATOS_PROYECTOS,
    sublistas: [
      { sublista: null, etiqueta: "General (todo el módulo)" },
      { sublista: "contratos", etiqueta: "Contratos" },
      { sublista: "proyectos", etiqueta: "Proyectos" },
      { sublista: "hitos_entregables", etiqueta: "Hitos y entregables" },
      { sublista: "timesheets", etiqueta: "Timesheets" },
      { sublista: "asignacion_recursos", etiqueta: "Asignación de recursos" },
      { sublista: "rentabilidad", etiqueta: "Rentabilidad" },
      { sublista: "change_requests", etiqueta: "Change requests" },
      { sublista: "facturas_referencia_externa", etiqueta: "Facturas (referencia externa)" },
      { sublista: "casos_soporte_referencia_externa", etiqueta: "Casos de soporte (referencia externa)" },
    ],
  },
  {
    modulo: "COMPRAS",
    etiqueta: ETIQUETAS_MODULO.COMPRAS,
    sublistas: [
      { sublista: null, etiqueta: "General (todo el módulo)" },
      { sublista: "proveedores", etiqueta: "Proveedores" },
      { sublista: "ordenes_costo", etiqueta: "Órdenes de costo / subcontratación" },
    ],
  },
  {
    modulo: "CIERRE_POSTVENTA",
    etiqueta: ETIQUETAS_MODULO.CIERRE_POSTVENTA,
    sublistas: [
      { sublista: null, etiqueta: "General (todo el módulo)" },
      { sublista: "checklist", etiqueta: "Checklist de liquidación" },
      { sublista: "actas_cierre", etiqueta: "Actas de cierre" },
      { sublista: "garantias", etiqueta: "Garantías" },
    ],
  },
];

export const MODULOS_ORDENADOS = MODULOS;
