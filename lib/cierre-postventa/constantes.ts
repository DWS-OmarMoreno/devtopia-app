/**
 * Constantes compartidas entre los server actions de Cierre y Postventa
 * (`app/(app)/cierre-postventa/actions.ts`) y sus componentes cliente.
 *
 * IMPORTANTE: un archivo con "use server" al inicio solo puede exportar
 * funciones async — Next.js despacha cualquier otro export (una constante,
 * un array de strings, etc.) de forma distinta al construir el bundle de
 * cliente, y ese valor deja de llegar como el array real al importarlo
 * desde un componente "use client" (revienta en runtime con errores
 * crípticos como "X.map is not a function", sin ningún error en build).
 * Por eso este catálogo vive en un archivo aparte, sin ninguna directiva,
 * para que tanto el server action (validación) como el panel cliente
 * (opciones del dropdown) lo puedan importar sin problema — mismo patrón
 * ya usado en `lib/alertas/eventos.ts`.
 */
export const TIPOS_VERIFICACION_ITEM = [
  "ENTREGABLE_ACEPTADO",
  "FIRMA_CLIENTE",
  "RECURSOS_LIBERADOS",
  "FACTURACION_COMPLETA",
  "ACTIVOS_DEVUELTOS",
  "DOCUMENTACION_ENTREGADA",
  "OTRO",
];
