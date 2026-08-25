"use client";

import { Tabs, Tab } from "@nextui-org/react";
import type { Tables } from "@/utils/database.types";
import { CuentasPanel, type CuentaConRelaciones } from "./cuentas-panel";
import {
  OportunidadesPanel,
  type OportunidadConRelaciones,
  type SeguimientoConRelaciones,
} from "./oportunidades-panel";
import {
  CotizacionesPanel,
  type CotizacionConRelaciones,
  type CotizacionAprobacionConRelaciones,
} from "./cotizaciones-panel";

interface Props {
  cuentas: CuentaConRelaciones[];
  contactos: Tables<"contactos">[];
  oportunidades: OportunidadConRelaciones[];
  seguimientos: SeguimientoConRelaciones[];
  monedas: Tables<"monedas">[];
  motivosPerdida: Tables<"catalogos_valores">[];
  usuariosEmpresa: { id: string; nombre_completo: string }[];
  usuarioActualId: string | null;
  puedeCrearCuenta: boolean;
  puedeEditarCuenta: boolean;
  puedeCrearOportunidad: boolean;
  puedeEditarOportunidad: boolean;
  cotizaciones: CotizacionConRelaciones[];
  cotizacionesDetalle: Tables<"cotizaciones_detalle">[];
  cotizacionesAprobaciones: CotizacionAprobacionConRelaciones[];
  estadosCotizacion: Tables<"estados_ciclo_vida">[];
  transicionesCotizacion: Tables<"workflows_transiciones">[];
  servicios: Tables<"catalogo_servicios">[];
  rolesTarifa: Tables<"catalogo_roles_tarifa">[];
  puedeCrearCotizacion: boolean;
  puedeEditarCotizacion: boolean;
  puedeAprobarCotizacion: boolean;
  secuenciasProyecto: Tables<"secuencias_numeracion">[];
  puedeConvertirAProyecto: boolean;
}

export function CrmTabs({
  cuentas,
  contactos,
  oportunidades,
  seguimientos,
  monedas,
  motivosPerdida,
  usuariosEmpresa,
  usuarioActualId,
  puedeCrearCuenta,
  puedeEditarCuenta,
  puedeCrearOportunidad,
  puedeEditarOportunidad,
  cotizaciones,
  cotizacionesDetalle,
  cotizacionesAprobaciones,
  estadosCotizacion,
  transicionesCotizacion,
  servicios,
  rolesTarifa,
  puedeCrearCotizacion,
  puedeEditarCotizacion,
  puedeAprobarCotizacion,
  secuenciasProyecto,
  puedeConvertirAProyecto,
}: Props) {
  return (
    <Tabs aria-label="Secciones de CRM y Ventas" variant="underlined">
      <Tab key="cuentas" title="Cuentas">
        <CuentasPanel
          cuentas={cuentas}
          contactos={contactos}
          monedas={monedas}
          usuariosEmpresa={usuariosEmpresa}
          puedeCrear={puedeCrearCuenta}
          puedeEditar={puedeEditarCuenta}
        />
      </Tab>
      <Tab key="oportunidades" title="Oportunidades">
        <OportunidadesPanel
          oportunidades={oportunidades}
          seguimientos={seguimientos}
          cuentas={cuentas}
          contactos={contactos}
          monedas={monedas}
          motivosPerdida={motivosPerdida}
          usuariosEmpresa={usuariosEmpresa}
          usuarioActualId={usuarioActualId}
          puedeCrear={puedeCrearOportunidad}
          puedeEditar={puedeEditarOportunidad}
        />
      </Tab>
      <Tab key="cotizaciones" title="Cotizaciones">
        <CotizacionesPanel
          cotizaciones={cotizaciones}
          cotizacionesDetalle={cotizacionesDetalle}
          cotizacionesAprobaciones={cotizacionesAprobaciones}
          estadosCotizacion={estadosCotizacion}
          transicionesCotizacion={transicionesCotizacion}
          cuentas={cuentas}
          contactos={contactos}
          oportunidades={oportunidades}
          monedas={monedas}
          servicios={servicios}
          rolesTarifa={rolesTarifa}
          usuariosEmpresa={usuariosEmpresa}
          puedeCrear={puedeCrearCotizacion}
          puedeEditar={puedeEditarCotizacion}
          puedeAprobar={puedeAprobarCotizacion}
          secuenciasProyecto={secuenciasProyecto}
          puedeConvertirAProyecto={puedeConvertirAProyecto}
        />
      </Tab>
    </Tabs>
  );
}
