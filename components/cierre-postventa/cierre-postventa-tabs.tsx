"use client";

import { Tabs, Tab } from "@nextui-org/react";
import type { Tables } from "@/utils/database.types";
import { ChecklistPanel } from "./checklist-panel";
import { ActasCierrePanel } from "./actas-panel";
import { GarantiasPanel } from "./garantias-panel";

interface Props {
  proyectos: { id: string; numero_proyecto: string; nombre_proyecto: string; contrato_id: string }[];
  contratos: { id: string; numero_contrato: string }[];
  usuarios: { id: string; nombre_completo: string }[];
  contactos: Tables<"contactos">[];
  cuentas: { id: string; razon_social: string }[];
  plantillas: Tables<"checklist_liquidacion_plantillas">[];
  plantillaItems: Tables<"checklist_liquidacion_plantilla_items">[];
  checklistsProyecto: Tables<"checklist_liquidacion_proyecto">[];
  checklistItems: Tables<"checklist_liquidacion_items">[];
  actas: Tables<"actas_cierre">[];
  garantias: Tables<"garantias_contractuales">[];
  garantiaExtensiones: Tables<"garantia_extensiones">[];
  casosSoporteGarantia: Tables<"casos_soporte_referencia_externa">[];
  puedeCrearChecklist: boolean;
  puedeEditarChecklist: boolean;
  puedeEliminarChecklist: boolean;
  puedeCrearActa: boolean;
  puedeEditarActa: boolean;
  puedeCrearGarantia: boolean;
  puedeEditarGarantia: boolean;
}

export function CierrePostventaTabs({
  proyectos,
  contratos,
  usuarios,
  contactos,
  cuentas,
  plantillas,
  plantillaItems,
  checklistsProyecto,
  checklistItems,
  actas,
  garantias,
  garantiaExtensiones,
  casosSoporteGarantia,
  puedeCrearChecklist,
  puedeEditarChecklist,
  puedeEliminarChecklist,
  puedeCrearActa,
  puedeEditarActa,
  puedeCrearGarantia,
  puedeEditarGarantia,
}: Props) {
  return (
    <Tabs aria-label="Secciones de Cierre y Postventa" variant="underlined">
      <Tab key="checklist" title="Checklist de Liquidación">
        <ChecklistPanel
          proyectos={proyectos}
          usuarios={usuarios}
          plantillas={plantillas}
          plantillaItems={plantillaItems}
          checklistsProyecto={checklistsProyecto}
          checklistItems={checklistItems}
          puedeCrear={puedeCrearChecklist}
          puedeEditar={puedeEditarChecklist}
          puedeEliminar={puedeEliminarChecklist}
        />
      </Tab>
      <Tab key="actas" title="Actas de Cierre">
        <ActasCierrePanel
          actas={actas}
          proyectos={proyectos}
          usuarios={usuarios}
          contactos={contactos}
          cuentas={cuentas}
          puedeCrear={puedeCrearActa}
          puedeEditar={puedeEditarActa}
        />
      </Tab>
      <Tab key="garantias" title="Garantías">
        <GarantiasPanel
          garantias={garantias}
          garantiaExtensiones={garantiaExtensiones}
          casosSoporteGarantia={casosSoporteGarantia}
          proyectos={proyectos}
          contratos={contratos}
          puedeCrear={puedeCrearGarantia}
          puedeEditar={puedeEditarGarantia}
        />
      </Tab>
    </Tabs>
  );
}
