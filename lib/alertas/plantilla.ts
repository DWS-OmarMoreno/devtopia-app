/**
 * Reemplazo simple de variables `{{nombre_variable}}` en las plantillas de
 * asunto/cuerpo de `alertas_notificaciones_reglas`. Deliberadamente no es un
 * motor de plantillas completo (sin condicionales/loops) — las variables
 * disponibles por evento están documentadas en `lib/alertas/eventos.ts`.
 * Una variable no provista en `valores` se deja tal cual (`{{variable}}`) en
 * vez de reventar, para que un error de configuración de la regla sea visible
 * en el mensaje resultante en vez de silencioso.
 */
export function renderizarPlantilla(plantilla: string, valores: Record<string, string>): string {
  return plantilla.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (coincidencia, nombre) => {
    return Object.prototype.hasOwnProperty.call(valores, nombre) ? valores[nombre] : coincidencia;
  });
}
