/**
 * Tipos y helpers de RBAC compartidos entre cliente y servidor. Reflejan
 * exactamente la matriz `permisos` y la función `fn_tiene_permiso()` del
 * esquema (docs/data-model/01-configuracion-general.md).
 *
 * IMPORTANTE: `tienePermiso()` aquí es solo para decidir qué MOSTRAR en la UI
 * (ocultar botones, pestañas, rutas del sidebar). La autoridad real de acceso
 * siempre es Row Level Security en Postgres — ninguna pantalla ni Server
 * Action debe asumir que datos protegidos por este chequeo del lado cliente
 * están realmente protegidos; RLS es quien lo garantiza.
 */

export const MODULOS = [
  "CONFIGURACION",
  "CRM_VENTAS",
  "PRODUCTOS_SERVICIOS",
  "CONTRATOS_PROYECTOS",
  "COMPRAS",
  "CIERRE_POSTVENTA",
] as const;

export type Modulo = (typeof MODULOS)[number];

export type Accion = "leer" | "crear" | "editar" | "eliminar" | "aprobar";

export interface PermisoRow {
  modulo: string;
  sublista: string | null;
  puede_leer: boolean;
  puede_crear: boolean;
  puede_editar: boolean;
  puede_eliminar: boolean;
  puede_aprobar: boolean;
  alcance: string;
}

const ACCION_A_COLUMNA: Record<Accion, keyof PermisoRow> = {
  leer: "puede_leer",
  crear: "puede_crear",
  editar: "puede_editar",
  eliminar: "puede_eliminar",
  aprobar: "puede_aprobar",
};

/**
 * Replica del lado aplicación la misma prioridad que fn_tiene_permiso() en
 * Postgres: la fila específica de `sublista` gana sobre la fila general del
 * módulo (sublista = null).
 */
export function tienePermiso(
  permisos: PermisoRow[],
  modulo: Modulo,
  accion: Accion,
  sublista?: string
): boolean {
  const filaEspecifica =
    sublista !== undefined
      ? permisos.find((p) => p.modulo === modulo && p.sublista === sublista)
      : undefined;
  const filaGeneral = permisos.find((p) => p.modulo === modulo && p.sublista === null);
  const fila = filaEspecifica ?? filaGeneral;
  if (!fila) return false;
  return Boolean(fila[ACCION_A_COLUMNA[accion]]);
}

export const ETIQUETAS_MODULO: Record<Modulo, string> = {
  CONFIGURACION: "Configuración General",
  CRM_VENTAS: "CRM y Ventas",
  PRODUCTOS_SERVICIOS: "Productos y Servicios",
  CONTRATOS_PROYECTOS: "Contratos y Proyectos",
  COMPRAS: "Compras y Subcontratación",
  CIERRE_POSTVENTA: "Cierre y Postventa",
};
