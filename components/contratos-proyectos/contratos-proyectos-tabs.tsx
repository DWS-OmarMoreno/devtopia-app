"use client";

import { Tabs, Tab } from "@nextui-org/react";
import type { Tables } from "@/utils/database.types";
import { ContratosPanel, type ContratoConRelaciones } from "./contratos-panel";
import { ProyectosPanel, type ProyectoConRelaciones } from "./proyectos-panel";
import { TimesheetsPanel, type TimesheetConRelaciones } from "./timesheets-panel";
import {
  RecursosPanel,
  type AsignacionRecursoConRelaciones,
  type DisponibilidadRecursoConRelaciones,
} from "./recursos-panel";
import { RentabilidadPanel, type RentabilidadLiveRow } from "./rentabilidad-panel";
import { ChangeRequestsPanel, type ChangeRequestConRelaciones } from "./change-requests-panel";
import {
  ReferenciaExternaPanel,
  type FacturaReferenciaExternaConRelaciones,
  type CasoSoporteReferenciaExternaConRelaciones,
} from "./referencia-externa-panel";

type HitoConRelaciones = Tables<"hitos_entregables"> & { responsable: { nombre_completo: string } | null };

interface Props {
  contratos: ContratoConRelaciones[];
  proyectos: ProyectoConRelaciones[];
  hitos: HitoConRelaciones[];
  criterios: Tables<"hitos_criterios_aceptacion">[];
  estadosContrato: Tables<"estados_ciclo_vida">[];
  transicionesContrato: Tables<"workflows_transiciones">[];
  estadosProyecto: Tables<"estados_ciclo_vida">[];
  transicionesProyecto: Tables<"workflows_transiciones">[];
  cuentas: { id: string; razon_social: string }[];
  monedas: Tables<"monedas">[];
  usuariosEmpresa: { id: string; nombre_completo: string }[];
  secuenciasProyecto: Tables<"secuencias_numeracion">[];
  puedeCrearContrato: boolean;
  puedeEditarContrato: boolean;
  puedeCrearProyecto: boolean;
  puedeEditarProyecto: boolean;
  puedeCrearHito: boolean;
  puedeEditarHito: boolean;

  timesheets: TimesheetConRelaciones[];
  catalogoRolesTarifa: Tables<"catalogo_roles_tarifa">[];
  categoriasNoFacturables: Tables<"catalogos_valores">[];
  puedeCrearTimesheet: boolean;
  puedeEditarTimesheet: boolean;
  puedeAprobarTimesheet: boolean;

  asignaciones: AsignacionRecursoConRelaciones[];
  disponibilidad: DisponibilidadRecursoConRelaciones[];
  puedeCrearAsignacion: boolean;
  puedeEditarAsignacion: boolean;
  puedeEliminarAsignacion: boolean;

  rentabilidadLive: RentabilidadLiveRow[];
  rentabilidadSnapshots: (Tables<"rentabilidad_snapshots"> & { proyectos: { numero_proyecto: string; nombre_proyecto: string } | null })[];
  puedeCrearRentabilidad: boolean;

  changeRequests: ChangeRequestConRelaciones[];
  estadosChangeRequest: Tables<"estados_ciclo_vida">[];
  transicionesChangeRequest: Tables<"workflows_transiciones">[];
  puedeCrearChangeRequest: boolean;
  puedeEditarChangeRequest: boolean;

  facturas: FacturaReferenciaExternaConRelaciones[];
  casosSoporte: CasoSoporteReferenciaExternaConRelaciones[];
  puedeCrearFactura: boolean;
  puedeEditarFactura: boolean;
  puedeCrearCaso: boolean;
  puedeEditarCaso: boolean;
}

export function ContratosProyectosTabs({
  contratos,
  proyectos,
  hitos,
  criterios,
  estadosContrato,
  transicionesContrato,
  estadosProyecto,
  transicionesProyecto,
  cuentas,
  monedas,
  usuariosEmpresa,
  secuenciasProyecto,
  puedeCrearContrato,
  puedeEditarContrato,
  puedeCrearProyecto,
  puedeEditarProyecto,
  puedeCrearHito,
  puedeEditarHito,
  timesheets,
  catalogoRolesTarifa,
  categoriasNoFacturables,
  puedeCrearTimesheet,
  puedeEditarTimesheet,
  puedeAprobarTimesheet,
  asignaciones,
  disponibilidad,
  puedeCrearAsignacion,
  puedeEditarAsignacion,
  puedeEliminarAsignacion,
  rentabilidadLive,
  rentabilidadSnapshots,
  puedeCrearRentabilidad,
  changeRequests,
  estadosChangeRequest,
  transicionesChangeRequest,
  puedeCrearChangeRequest,
  puedeEditarChangeRequest,
  facturas,
  casosSoporte,
  puedeCrearFactura,
  puedeEditarFactura,
  puedeCrearCaso,
  puedeEditarCaso,
}: Props) {
  return (
    <Tabs aria-label="Secciones de Contratos y Proyectos" variant="underlined">
      <Tab key="contratos" title="Contratos">
        <ContratosPanel
          contratos={contratos}
          cuentas={cuentas}
          monedas={monedas}
          usuariosEmpresa={usuariosEmpresa}
          estados={estadosContrato}
          transiciones={transicionesContrato}
          puedeCrear={puedeCrearContrato}
          puedeEditar={puedeEditarContrato}
        />
      </Tab>
      <Tab key="proyectos" title="Proyectos">
        <ProyectosPanel
          proyectos={proyectos}
          contratos={contratos}
          hitos={hitos}
          criterios={criterios}
          usuariosEmpresa={usuariosEmpresa}
          estados={estadosProyecto}
          transiciones={transicionesProyecto}
          secuenciasProyecto={secuenciasProyecto}
          puedeCrear={puedeCrearProyecto}
          puedeEditar={puedeEditarProyecto}
          puedeCrearHito={puedeCrearHito}
          puedeEditarHito={puedeEditarHito}
        />
      </Tab>
      <Tab key="timesheets" title="Timesheets">
        <TimesheetsPanel
          timesheets={timesheets}
          proyectos={proyectos}
          hitos={hitos}
          usuariosEmpresa={usuariosEmpresa}
          catalogoRolesTarifa={catalogoRolesTarifa}
          categoriasNoFacturables={categoriasNoFacturables}
          puedeCrear={puedeCrearTimesheet}
          puedeEditar={puedeEditarTimesheet}
          puedeAprobar={puedeAprobarTimesheet}
        />
      </Tab>
      <Tab key="recursos" title="Recursos">
        <RecursosPanel
          asignaciones={asignaciones}
          disponibilidad={disponibilidad}
          proyectos={proyectos}
          usuariosEmpresa={usuariosEmpresa}
          catalogoRolesTarifa={catalogoRolesTarifa}
          puedeCrear={puedeCrearAsignacion}
          puedeEditar={puedeEditarAsignacion}
          puedeEliminar={puedeEliminarAsignacion}
        />
      </Tab>
      <Tab key="rentabilidad" title="Rentabilidad">
        <RentabilidadPanel
          rentabilidadLive={rentabilidadLive}
          snapshots={rentabilidadSnapshots}
          puedeCrear={puedeCrearRentabilidad}
        />
      </Tab>
      <Tab key="change-requests" title="Change Requests">
        <ChangeRequestsPanel
          changeRequests={changeRequests}
          proyectos={proyectos}
          usuariosEmpresa={usuariosEmpresa}
          estados={estadosChangeRequest}
          transiciones={transicionesChangeRequest}
          puedeCrear={puedeCrearChangeRequest}
          puedeEditar={puedeEditarChangeRequest}
        />
      </Tab>
      <Tab key="referencia-externa" title="Referencia Externa">
        <ReferenciaExternaPanel
          facturas={facturas}
          casosSoporte={casosSoporte}
          proyectos={proyectos}
          contratos={contratos}
          monedas={monedas}
          hitos={hitos}
          puedeCrearFactura={puedeCrearFactura}
          puedeEditarFactura={puedeEditarFactura}
          puedeCrearCaso={puedeCrearCaso}
          puedeEditarCaso={puedeEditarCaso}
        />
      </Tab>
    </Tabs>
  );
}
