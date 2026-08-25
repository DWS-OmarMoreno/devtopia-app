"use client";

import { Tabs, Tab } from "@nextui-org/react";
import type { Tables } from "@/utils/database.types";
import { CategoriasPanel } from "./categorias-panel";
import { RolesTarifaPanel } from "./roles-tarifa-panel";
import { SlaPanel } from "./sla-panel";
import { ServiciosPanel, type ServicioConRelaciones } from "./servicios-panel";
import { PaquetesPanel } from "./paquetes-panel";
import { LicenciasPanel } from "./licencias-panel";

interface Props {
  categorias: Tables<"categorias_servicio">[];
  rolesTarifa: Tables<"catalogo_roles_tarifa">[];
  planesSla: Tables<"sla_planes">[];
  nivelesSla: Tables<"sla_niveles">[];
  servicios: ServicioConRelaciones[];
  monedas: Tables<"monedas">[];
  paquetes: Tables<"paquetes_servicios">[];
  lineasPaquete: Tables<"paquetes_servicios_detalle">[];
  licenciasCatalogo: Tables<"licencias_suscripciones_catalogo">[];
  licenciasAsignadas: Tables<"licencias_asignadas">[];
  cuentas: { id: string; razon_social: string }[];
  puedeCrear: boolean;
  puedeEditar: boolean;
}

export function ProductosServiciosTabs({
  categorias,
  rolesTarifa,
  planesSla,
  nivelesSla,
  servicios,
  monedas,
  paquetes,
  lineasPaquete,
  licenciasCatalogo,
  licenciasAsignadas,
  cuentas,
  puedeCrear,
  puedeEditar,
}: Props) {
  return (
    <Tabs aria-label="Secciones de Productos y Servicios" variant="underlined">
      <Tab key="servicios" title="Servicios">
        <ServiciosPanel
          servicios={servicios}
          categorias={categorias}
          planesSla={planesSla}
          monedas={monedas}
          puedeCrear={puedeCrear}
          puedeEditar={puedeEditar}
        />
      </Tab>
      <Tab key="categorias" title="Categorías">
        <CategoriasPanel
          categorias={categorias}
          puedeCrear={puedeCrear}
          puedeEditar={puedeEditar}
        />
      </Tab>
      <Tab key="roles-tarifa" title="Roles y Tarifa">
        <RolesTarifaPanel
          rolesTarifa={rolesTarifa}
          monedas={monedas}
          puedeCrear={puedeCrear}
          puedeEditar={puedeEditar}
        />
      </Tab>
      <Tab key="sla" title="SLA">
        <SlaPanel
          planesSla={planesSla}
          nivelesSla={nivelesSla}
          puedeCrear={puedeCrear}
          puedeEditar={puedeEditar}
        />
      </Tab>
      <Tab key="paquetes" title="Paquetes">
        <PaquetesPanel
          paquetes={paquetes}
          lineasPaquete={lineasPaquete}
          servicios={servicios}
          rolesTarifa={rolesTarifa}
          monedas={monedas}
          puedeCrear={puedeCrear}
          puedeEditar={puedeEditar}
        />
      </Tab>
      <Tab key="licencias" title="Licencias y Suscripciones">
        <LicenciasPanel
          licenciasCatalogo={licenciasCatalogo}
          licenciasAsignadas={licenciasAsignadas}
          cuentas={cuentas}
          monedas={monedas}
          puedeCrear={puedeCrear}
          puedeEditar={puedeEditar}
        />
      </Tab>
    </Tabs>
  );
}
