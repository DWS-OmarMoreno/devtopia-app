"use client";

import { Tabs, Tab } from "@nextui-org/react";
import type { Tables } from "@/utils/database.types";
import { ProveedoresPanel, type ProveedorConRelaciones } from "./proveedores-panel";
import { OrdenesCostoPanel, type OrdenCostoConRelaciones } from "./ordenes-costo-panel";

interface Props {
  proveedores: ProveedorConRelaciones[];
  evaluaciones: Tables<"evaluaciones_proveedor">[];
  ordenesCosto: OrdenCostoConRelaciones[];
  proyectos: { id: string; numero_proyecto: string; nombre_proyecto: string }[];
  contratos: { id: string; numero_contrato: string }[];
  monedas: Tables<"monedas">[];
  categoriasProveedor: Tables<"catalogos_valores">[];
  estadosOrdenCosto: Tables<"estados_ciclo_vida">[];
  transicionesOrdenCosto: Tables<"workflows_transiciones">[];
  puedeCrearProveedor: boolean;
  puedeEditarProveedor: boolean;
  puedeCrearOrdenCosto: boolean;
  puedeEditarOrdenCosto: boolean;
}

export function ComprasTabs({
  proveedores,
  evaluaciones,
  ordenesCosto,
  proyectos,
  contratos,
  monedas,
  categoriasProveedor,
  estadosOrdenCosto,
  transicionesOrdenCosto,
  puedeCrearProveedor,
  puedeEditarProveedor,
  puedeCrearOrdenCosto,
  puedeEditarOrdenCosto,
}: Props) {
  return (
    <Tabs aria-label="Secciones de Compras y Subcontratación" variant="underlined">
      <Tab key="proveedores" title="Proveedores">
        <ProveedoresPanel
          proveedores={proveedores}
          evaluaciones={evaluaciones}
          proyectos={proyectos}
          monedas={monedas}
          categoriasProveedor={categoriasProveedor}
          puedeCrear={puedeCrearProveedor}
          puedeEditar={puedeEditarProveedor}
        />
      </Tab>
      <Tab key="ordenes-costo" title="Órdenes de Costo">
        <OrdenesCostoPanel
          ordenesCosto={ordenesCosto}
          proveedores={proveedores}
          proyectos={proyectos}
          contratos={contratos}
          monedas={monedas}
          estados={estadosOrdenCosto}
          transiciones={transicionesOrdenCosto}
          puedeCrear={puedeCrearOrdenCosto}
          puedeEditar={puedeEditarOrdenCosto}
        />
      </Tab>
    </Tabs>
  );
}
