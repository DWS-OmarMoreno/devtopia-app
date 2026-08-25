"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Tabs,
  Tab,
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
  Chip,
  Switch,
  Button,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Input,
  Textarea,
} from "@nextui-org/react";
import { Formik } from "formik";
import type { Tables } from "@/utils/database.types";
import { DropdownSelector } from "@/components/shared/dropdown-selector";
import { FacturaReferenciaExternaSchema, CasoSoporteReferenciaExternaSchema } from "@/helpers/schemas";
import type { FacturaReferenciaExternaFormType, CasoSoporteReferenciaExternaFormType } from "@/helpers/types";
import {
  crearFacturaReferenciaExterna,
  actualizarFacturaReferenciaExterna,
  crearCasoSoporteReferenciaExterna,
  actualizarCasoSoporteReferenciaExterna,
} from "@/app/(app)/contratos-proyectos/actions";
import type { ContratoConRelaciones } from "./contratos-panel";
import type { ProyectoConRelaciones } from "./proyectos-panel";

export type FacturaReferenciaExternaConRelaciones = Tables<"facturas_referencia_externa"> & {
  proyectos: { numero_proyecto: string; nombre_proyecto: string } | null;
  contratos: { numero_contrato: string } | null;
  monedas: { codigo_iso: string } | null;
  hito_asociado: { nombre: string } | null;
};

export type CasoSoporteReferenciaExternaConRelaciones = Tables<"casos_soporte_referencia_externa"> & {
  proyectos: { numero_proyecto: string; nombre_proyecto: string } | null;
  contratos: { numero_contrato: string } | null;
};

const ESTADOS_PAGO = [
  { id: "PENDIENTE", etiqueta: "Pendiente" },
  { id: "PARCIAL", etiqueta: "Pago parcial" },
  { id: "PAGADO", etiqueta: "Pagado" },
  { id: "VENCIDO", etiqueta: "Vencido" },
];

const COLOR_ESTADO_PAGO: Record<string, "default" | "primary" | "secondary" | "success" | "warning" | "danger"> = {
  PENDIENTE: "default",
  PARCIAL: "warning",
  PAGADO: "success",
  VENCIDO: "danger",
};

const ESTADOS_CASO = [
  { id: "ABIERTO", etiqueta: "Abierto" },
  { id: "EN_PROGRESO", etiqueta: "En progreso" },
  { id: "RESUELTO", etiqueta: "Resuelto" },
  { id: "CERRADO", etiqueta: "Cerrado" },
];

const COLOR_ESTADO_CASO: Record<string, "default" | "primary" | "secondary" | "success" | "warning" | "danger"> = {
  ABIERTO: "warning",
  EN_PROGRESO: "primary",
  RESUELTO: "success",
  CERRADO: "secondary",
};

const PRIORIDADES_CASO = [
  { id: "BAJA", etiqueta: "Baja" },
  { id: "MEDIA", etiqueta: "Media" },
  { id: "ALTA", etiqueta: "Alta" },
  { id: "CRITICA", etiqueta: "Crítica" },
];

function formatearMoneda(valor: number | null, codigoIso: string | undefined): string {
  if (valor == null) return "—";
  const numero = valor.toLocaleString("es-CO", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return codigoIso ? `${codigoIso} ${numero}` : numero;
}

interface Props {
  facturas: FacturaReferenciaExternaConRelaciones[];
  casosSoporte: CasoSoporteReferenciaExternaConRelaciones[];
  proyectos: ProyectoConRelaciones[];
  contratos: ContratoConRelaciones[];
  monedas: Tables<"monedas">[];
  hitos: (Tables<"hitos_entregables"> & { responsable: { nombre_completo: string } | null })[];
  puedeCrearFactura: boolean;
  puedeEditarFactura: boolean;
  puedeCrearCaso: boolean;
  puedeEditarCaso: boolean;
}

export function ReferenciaExternaPanel({
  facturas,
  casosSoporte,
  proyectos,
  contratos,
  monedas,
  hitos,
  puedeCrearFactura,
  puedeEditarFactura,
  puedeCrearCaso,
  puedeEditarCaso,
}: Props) {
  const router = useRouter();

  const opcionesProyecto = proyectos.map((p) => ({ id: p.id, etiqueta: `${p.numero_proyecto} — ${p.nombre_proyecto}` }));
  const opcionesContrato = contratos.map((c) => ({ id: c.id, etiqueta: c.numero_contrato }));
  const opcionesMoneda = monedas.map((m) => ({ id: m.id, etiqueta: `${m.codigo_iso} — ${m.nombre}` }));

  // --- Facturas ----------------------------------------------------------
  const [modalFacturaAbierto, setModalFacturaAbierto] = useState(false);
  const [facturaEnEdicionId, setFacturaEnEdicionId] = useState<string | null>(null);
  const [errorFactura, setErrorFactura] = useState("");
  const [guardandoFactura, setGuardandoFactura] = useState(false);

  const facturaEnEdicion = facturaEnEdicionId ? facturas.find((f) => f.id === facturaEnEdicionId) ?? null : null;

  const abrirCrearFactura = () => {
    setFacturaEnEdicionId(null);
    setErrorFactura("");
    setModalFacturaAbierto(true);
  };
  const abrirEditarFactura = (id: string) => {
    setFacturaEnEdicionId(id);
    setErrorFactura("");
    setModalFacturaAbierto(true);
  };

  const initialValuesFactura: FacturaReferenciaExternaFormType = {
    proyecto_id: facturaEnEdicion?.proyecto_id ?? "",
    contrato_id: facturaEnEdicion?.contrato_id ?? "",
    numero_factura_externa: facturaEnEdicion?.numero_factura_externa ?? "",
    sistema_origen: facturaEnEdicion?.sistema_origen ?? "",
    fecha_emision: facturaEnEdicion?.fecha_emision ?? "",
    fecha_vencimiento_pago: facturaEnEdicion?.fecha_vencimiento_pago ?? "",
    moneda_id: facturaEnEdicion?.moneda_id ?? "",
    monto_subtotal: facturaEnEdicion?.monto_subtotal != null ? String(facturaEnEdicion.monto_subtotal) : "",
    monto_impuestos: facturaEnEdicion?.monto_impuestos != null ? String(facturaEnEdicion.monto_impuestos) : "",
    monto_total: facturaEnEdicion ? String(facturaEnEdicion.monto_total) : "",
    estado_pago: facturaEnEdicion?.estado_pago ?? "PENDIENTE",
    monto_pagado_acumulado: facturaEnEdicion?.monto_pagado_acumulado != null ? String(facturaEnEdicion.monto_pagado_acumulado) : "",
    fecha_ultimo_pago: facturaEnEdicion?.fecha_ultimo_pago ?? "",
    hito_asociado_id: facturaEnEdicion?.hito_asociado_id ?? "",
    adjunto_url: facturaEnEdicion?.adjunto_url ?? "",
    notas: facturaEnEdicion?.notas ?? "",
  };

  // --- Casos de soporte ----------------------------------------------------
  const [modalCasoAbierto, setModalCasoAbierto] = useState(false);
  const [casoEnEdicionId, setCasoEnEdicionId] = useState<string | null>(null);
  const [errorCaso, setErrorCaso] = useState("");
  const [guardandoCaso, setGuardandoCaso] = useState(false);

  const casoEnEdicion = casoEnEdicionId ? casosSoporte.find((c) => c.id === casoEnEdicionId) ?? null : null;

  const abrirCrearCaso = () => {
    setCasoEnEdicionId(null);
    setErrorCaso("");
    setModalCasoAbierto(true);
  };
  const abrirEditarCaso = (id: string) => {
    setCasoEnEdicionId(id);
    setErrorCaso("");
    setModalCasoAbierto(true);
  };

  const initialValuesCaso: CasoSoporteReferenciaExternaFormType = {
    proyecto_id: casoEnEdicion?.proyecto_id ?? "",
    contrato_id: casoEnEdicion?.contrato_id ?? "",
    numero_ticket_externo: casoEnEdicion?.numero_ticket_externo ?? "",
    sistema_origen: casoEnEdicion?.sistema_origen ?? "",
    asunto: casoEnEdicion?.asunto ?? "",
    descripcion_breve: casoEnEdicion?.descripcion_breve ?? "",
    fecha_apertura: casoEnEdicion?.fecha_apertura ?? "",
    fecha_cierre: casoEnEdicion?.fecha_cierre ?? "",
    estado: casoEnEdicion?.estado ?? "ABIERTO",
    prioridad: casoEnEdicion?.prioridad ?? "",
    categoria: casoEnEdicion?.categoria ?? "",
    horas_consumidas: casoEnEdicion?.horas_consumidas != null ? String(casoEnEdicion.horas_consumidas) : "",
    sla_incumplido: casoEnEdicion?.sla_incumplido ?? false,
    es_cubierto_garantia: casoEnEdicion?.es_cubierto_garantia ?? false,
    notas: casoEnEdicion?.notas ?? "",
  };

  return (
    <div className="flex flex-col gap-4 py-2">
      <Tabs aria-label="Referencia externa" variant="underlined" size="sm">
        <Tab key="facturas" title="Facturas">
          <div className="flex flex-col gap-4 py-2">
            {puedeCrearFactura && (
              <div className="flex justify-end">
                <Button color="primary" size="sm" onPress={abrirCrearFactura}>
                  Nueva factura
                </Button>
              </div>
            )}
            {errorFactura && <p className="text-danger text-sm">{errorFactura}</p>}

            {facturas.length === 0 ? (
              <p className="text-default-500 text-sm">No hay facturas de referencia externa registradas todavía.</p>
            ) : (
              <Table aria-label="Facturas de referencia externa" removeWrapper={false}>
                <TableHeader>
                  <TableColumn>NÚMERO EXTERNO</TableColumn>
                  <TableColumn>ORIGEN</TableColumn>
                  <TableColumn>PROYECTO / CONTRATO</TableColumn>
                  <TableColumn>EMISIÓN</TableColumn>
                  <TableColumn>MONTO TOTAL</TableColumn>
                  <TableColumn>ESTADO DE PAGO</TableColumn>
                  <TableColumn>ACCIONES</TableColumn>
                </TableHeader>
                <TableBody>
                  {facturas.map((factura) => (
                    <TableRow key={factura.id}>
                      <TableCell className="font-mono text-tiny">{factura.numero_factura_externa}</TableCell>
                      <TableCell className="text-tiny text-default-500">{factura.sistema_origen}</TableCell>
                      <TableCell className="text-tiny">
                        {factura.proyectos?.numero_proyecto ?? factura.contratos?.numero_contrato ?? "—"}
                      </TableCell>
                      <TableCell className="text-tiny">{factura.fecha_emision}</TableCell>
                      <TableCell>{formatearMoneda(factura.monto_total, factura.monedas?.codigo_iso)}</TableCell>
                      <TableCell>
                        <Chip size="sm" variant="flat" color={COLOR_ESTADO_PAGO[factura.estado_pago] ?? "default"}>
                          {ESTADOS_PAGO.find((e) => e.id === factura.estado_pago)?.etiqueta ?? factura.estado_pago}
                        </Chip>
                      </TableCell>
                      <TableCell>
                        {puedeEditarFactura && (
                          <Button size="sm" variant="light" onPress={() => abrirEditarFactura(factura.id)}>
                            Editar
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </Tab>

        <Tab key="casos-soporte" title="Casos de soporte">
          <div className="flex flex-col gap-4 py-2">
            {puedeCrearCaso && (
              <div className="flex justify-end">
                <Button color="primary" size="sm" onPress={abrirCrearCaso}>
                  Nuevo caso de soporte
                </Button>
              </div>
            )}
            {errorCaso && <p className="text-danger text-sm">{errorCaso}</p>}

            {casosSoporte.length === 0 ? (
              <p className="text-default-500 text-sm">No hay casos de soporte de referencia externa registrados todavía.</p>
            ) : (
              <Table aria-label="Casos de soporte de referencia externa" removeWrapper={false}>
                <TableHeader>
                  <TableColumn>TICKET EXTERNO</TableColumn>
                  <TableColumn>ORIGEN</TableColumn>
                  <TableColumn>ASUNTO</TableColumn>
                  <TableColumn>PROYECTO / CONTRATO</TableColumn>
                  <TableColumn>APERTURA</TableColumn>
                  <TableColumn>ESTADO</TableColumn>
                  <TableColumn>ACCIONES</TableColumn>
                </TableHeader>
                <TableBody>
                  {casosSoporte.map((caso) => (
                    <TableRow key={caso.id}>
                      <TableCell className="font-mono text-tiny">{caso.numero_ticket_externo}</TableCell>
                      <TableCell className="text-tiny text-default-500">{caso.sistema_origen}</TableCell>
                      <TableCell>{caso.asunto}</TableCell>
                      <TableCell className="text-tiny">
                        {caso.proyectos?.numero_proyecto ?? caso.contratos?.numero_contrato ?? "—"}
                      </TableCell>
                      <TableCell className="text-tiny">{caso.fecha_apertura}</TableCell>
                      <TableCell>
                        <Chip size="sm" variant="flat" color={COLOR_ESTADO_CASO[caso.estado] ?? "default"}>
                          {ESTADOS_CASO.find((e) => e.id === caso.estado)?.etiqueta ?? caso.estado}
                        </Chip>
                      </TableCell>
                      <TableCell>
                        {puedeEditarCaso && (
                          <Button size="sm" variant="light" onPress={() => abrirEditarCaso(caso.id)}>
                            Editar
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </Tab>
      </Tabs>

      {/* Modal: crear/editar factura */}
      <Modal isOpen={modalFacturaAbierto} onOpenChange={setModalFacturaAbierto} size="3xl" scrollBehavior="inside">
        <ModalContent>
          {(cerrar) => (
            <Formik
              enableReinitialize
              initialValues={initialValuesFactura}
              validationSchema={FacturaReferenciaExternaSchema}
              onSubmit={async (valores) => {
                setGuardandoFactura(true);
                setErrorFactura("");

                const formData = new FormData();
                Object.entries(valores).forEach(([clave, valor]) => {
                  formData.set(clave, valor ?? "");
                });

                const resultado = facturaEnEdicion
                  ? await actualizarFacturaReferenciaExterna(facturaEnEdicion.id, formData)
                  : await crearFacturaReferenciaExterna(formData);

                setGuardandoFactura(false);

                if (!resultado.ok) {
                  setErrorFactura(resultado.error);
                  return;
                }

                router.refresh();
                cerrar();
              }}
            >
              {({ values, errors, touched, handleChange, handleSubmit, setFieldValue }) => (
                <>
                  <ModalHeader>{facturaEnEdicion ? "Editar factura" : "Nueva factura"}</ModalHeader>
                  <ModalBody className="gap-4">
                    <p className="text-tiny text-default-500">
                      Elige un proyecto o un contrato (al menos uno es obligatorio). Se registra
                      siempre con método &quot;Manual&quot;: todavía no existe una integración por API.
                    </p>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex flex-col gap-1">
                        <span className="text-small text-default-600">Proyecto (opcional)</span>
                        <DropdownSelector
                          etiquetaAria="Proyecto"
                          opciones={opcionesProyecto}
                          valor={values.proyecto_id || null}
                          onCambiar={(id) => setFieldValue("proyecto_id", id ?? "")}
                          permitirVacio
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <span className="text-small text-default-600">Contrato (opcional)</span>
                        <DropdownSelector
                          etiquetaAria="Contrato"
                          opciones={opcionesContrato}
                          valor={values.contrato_id || null}
                          onCambiar={(id) => setFieldValue("contrato_id", id ?? "")}
                          permitirVacio
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <Input
                        label="Número de factura externa"
                        variant="bordered"
                        value={values.numero_factura_externa}
                        onChange={handleChange("numero_factura_externa")}
                        isInvalid={!!errors.numero_factura_externa && !!touched.numero_factura_externa}
                        errorMessage={errors.numero_factura_externa}
                      />
                      <Input
                        label="Sistema de origen"
                        variant="bordered"
                        value={values.sistema_origen}
                        onChange={handleChange("sistema_origen")}
                        isInvalid={!!errors.sistema_origen && !!touched.sistema_origen}
                        errorMessage={errors.sistema_origen}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <Input
                        label="Fecha de emisión"
                        type="date"
                        variant="bordered"
                        value={values.fecha_emision}
                        onChange={handleChange("fecha_emision")}
                        isInvalid={!!errors.fecha_emision && !!touched.fecha_emision}
                        errorMessage={errors.fecha_emision}
                      />
                      <Input
                        label="Fecha de vencimiento de pago (opcional)"
                        type="date"
                        variant="bordered"
                        value={values.fecha_vencimiento_pago}
                        onChange={handleChange("fecha_vencimiento_pago")}
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-small text-default-600">Moneda</span>
                      <DropdownSelector
                        etiquetaAria="Moneda"
                        opciones={opcionesMoneda}
                        valor={values.moneda_id || null}
                        onCambiar={(id) => setFieldValue("moneda_id", id ?? "")}
                      />
                      {!!errors.moneda_id && !!touched.moneda_id && (
                        <span className="text-tiny text-danger">{errors.moneda_id}</span>
                      )}
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <Input
                        label="Subtotal (opcional)"
                        type="number"
                        step="0.01"
                        variant="bordered"
                        value={values.monto_subtotal}
                        onChange={handleChange("monto_subtotal")}
                      />
                      <Input
                        label="Impuestos (opcional)"
                        type="number"
                        step="0.01"
                        variant="bordered"
                        value={values.monto_impuestos}
                        onChange={handleChange("monto_impuestos")}
                      />
                      <Input
                        label="Monto total"
                        type="number"
                        step="0.01"
                        variant="bordered"
                        value={values.monto_total}
                        onChange={handleChange("monto_total")}
                        isInvalid={!!errors.monto_total && !!touched.monto_total}
                        errorMessage={errors.monto_total}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex flex-col gap-1">
                        <span className="text-small text-default-600">Estado de pago</span>
                        <DropdownSelector
                          etiquetaAria="Estado de pago"
                          opciones={ESTADOS_PAGO}
                          valor={values.estado_pago || null}
                          onCambiar={(id) => setFieldValue("estado_pago", id ?? "PENDIENTE")}
                        />
                      </div>
                      <Input
                        label="Monto pagado acumulado (opcional)"
                        type="number"
                        step="0.01"
                        variant="bordered"
                        value={values.monto_pagado_acumulado}
                        onChange={handleChange("monto_pagado_acumulado")}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <Input
                        label="Fecha del último pago (opcional)"
                        type="date"
                        variant="bordered"
                        value={values.fecha_ultimo_pago}
                        onChange={handleChange("fecha_ultimo_pago")}
                      />
                      <div className="flex flex-col gap-1">
                        <span className="text-small text-default-600">Hito asociado (opcional)</span>
                        <DropdownSelector
                          etiquetaAria="Hito asociado"
                          opciones={hitos.filter((h) => h.proyecto_id === values.proyecto_id).map((h) => ({ id: h.id, etiqueta: h.nombre }))}
                          valor={values.hito_asociado_id || null}
                          onCambiar={(id) => setFieldValue("hito_asociado_id", id ?? "")}
                          permitirVacio
                          isDisabled={!values.proyecto_id}
                        />
                      </div>
                    </div>
                    <Input
                      label="URL del adjunto (opcional)"
                      variant="bordered"
                      value={values.adjunto_url}
                      onChange={handleChange("adjunto_url")}
                    />
                    <Textarea label="Notas (opcional)" variant="bordered" value={values.notas} onChange={handleChange("notas")} />
                    {errorFactura && <p className="text-danger text-sm">{errorFactura}</p>}
                  </ModalBody>
                  <ModalFooter>
                    <Button variant="flat" onPress={cerrar}>
                      Cerrar
                    </Button>
                    <Button color="primary" isLoading={guardandoFactura} onPress={() => handleSubmit()}>
                      Guardar
                    </Button>
                  </ModalFooter>
                </>
              )}
            </Formik>
          )}
        </ModalContent>
      </Modal>

      {/* Modal: crear/editar caso de soporte */}
      <Modal isOpen={modalCasoAbierto} onOpenChange={setModalCasoAbierto} size="3xl" scrollBehavior="inside">
        <ModalContent>
          {(cerrar) => (
            <Formik
              enableReinitialize
              initialValues={initialValuesCaso}
              validationSchema={CasoSoporteReferenciaExternaSchema}
              onSubmit={async (valores) => {
                setGuardandoCaso(true);
                setErrorCaso("");

                const formData = new FormData();
                Object.entries(valores).forEach(([clave, valor]) => {
                  if (typeof valor === "boolean") {
                    formData.set(clave, valor ? "true" : "false");
                  } else {
                    formData.set(clave, valor ?? "");
                  }
                });

                const resultado = casoEnEdicion
                  ? await actualizarCasoSoporteReferenciaExterna(casoEnEdicion.id, formData)
                  : await crearCasoSoporteReferenciaExterna(formData);

                setGuardandoCaso(false);

                if (!resultado.ok) {
                  setErrorCaso(resultado.error);
                  return;
                }

                router.refresh();
                cerrar();
              }}
            >
              {({ values, errors, touched, handleChange, handleSubmit, setFieldValue }) => (
                <>
                  <ModalHeader>{casoEnEdicion ? "Editar caso de soporte" : "Nuevo caso de soporte"}</ModalHeader>
                  <ModalBody className="gap-4">
                    <p className="text-tiny text-default-500">
                      Elige un proyecto o un contrato (al menos uno es obligatorio). Se registra
                      siempre con método &quot;Manual&quot;: todavía no existe una integración por API.
                    </p>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex flex-col gap-1">
                        <span className="text-small text-default-600">Proyecto (opcional)</span>
                        <DropdownSelector
                          etiquetaAria="Proyecto"
                          opciones={opcionesProyecto}
                          valor={values.proyecto_id || null}
                          onCambiar={(id) => setFieldValue("proyecto_id", id ?? "")}
                          permitirVacio
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <span className="text-small text-default-600">Contrato (opcional)</span>
                        <DropdownSelector
                          etiquetaAria="Contrato"
                          opciones={opcionesContrato}
                          valor={values.contrato_id || null}
                          onCambiar={(id) => setFieldValue("contrato_id", id ?? "")}
                          permitirVacio
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <Input
                        label="Número de ticket externo"
                        variant="bordered"
                        value={values.numero_ticket_externo}
                        onChange={handleChange("numero_ticket_externo")}
                        isInvalid={!!errors.numero_ticket_externo && !!touched.numero_ticket_externo}
                        errorMessage={errors.numero_ticket_externo}
                      />
                      <Input
                        label="Sistema de origen"
                        variant="bordered"
                        value={values.sistema_origen}
                        onChange={handleChange("sistema_origen")}
                        isInvalid={!!errors.sistema_origen && !!touched.sistema_origen}
                        errorMessage={errors.sistema_origen}
                      />
                    </div>
                    <Input
                      label="Asunto"
                      variant="bordered"
                      value={values.asunto}
                      onChange={handleChange("asunto")}
                      isInvalid={!!errors.asunto && !!touched.asunto}
                      errorMessage={errors.asunto}
                    />
                    <Textarea
                      label="Descripción breve (opcional)"
                      variant="bordered"
                      value={values.descripcion_breve}
                      onChange={handleChange("descripcion_breve")}
                    />
                    <div className="grid grid-cols-2 gap-4">
                      <Input
                        label="Fecha de apertura"
                        type="date"
                        variant="bordered"
                        value={values.fecha_apertura}
                        onChange={handleChange("fecha_apertura")}
                        isInvalid={!!errors.fecha_apertura && !!touched.fecha_apertura}
                        errorMessage={errors.fecha_apertura}
                      />
                      <Input
                        label="Fecha de cierre (opcional)"
                        type="date"
                        variant="bordered"
                        value={values.fecha_cierre}
                        onChange={handleChange("fecha_cierre")}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex flex-col gap-1">
                        <span className="text-small text-default-600">Estado</span>
                        <DropdownSelector
                          etiquetaAria="Estado"
                          opciones={ESTADOS_CASO}
                          valor={values.estado || null}
                          onCambiar={(id) => setFieldValue("estado", id ?? "ABIERTO")}
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <span className="text-small text-default-600">Prioridad (opcional)</span>
                        <DropdownSelector
                          etiquetaAria="Prioridad"
                          opciones={PRIORIDADES_CASO}
                          valor={values.prioridad || null}
                          onCambiar={(id) => setFieldValue("prioridad", id ?? "")}
                          permitirVacio
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <Input
                        label="Categoría (opcional)"
                        variant="bordered"
                        value={values.categoria}
                        onChange={handleChange("categoria")}
                      />
                      <Input
                        label="Horas consumidas (opcional)"
                        type="number"
                        step="0.25"
                        variant="bordered"
                        value={values.horas_consumidas}
                        onChange={handleChange("horas_consumidas")}
                      />
                    </div>
                    <div className="flex gap-6">
                      <div className="flex items-center gap-2">
                        <Switch
                          size="sm"
                          isSelected={values.sla_incumplido}
                          onValueChange={(v) => setFieldValue("sla_incumplido", v)}
                        />
                        <span className="text-small">SLA incumplido</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          size="sm"
                          isSelected={values.es_cubierto_garantia}
                          onValueChange={(v) => setFieldValue("es_cubierto_garantia", v)}
                        />
                        <span className="text-small">Cubierto por garantía</span>
                      </div>
                    </div>
                    <Textarea label="Notas (opcional)" variant="bordered" value={values.notas} onChange={handleChange("notas")} />
                    {errorCaso && <p className="text-danger text-sm">{errorCaso}</p>}
                  </ModalBody>
                  <ModalFooter>
                    <Button variant="flat" onPress={cerrar}>
                      Cerrar
                    </Button>
                    <Button color="primary" isLoading={guardandoCaso} onPress={() => handleSubmit()}>
                      Guardar
                    </Button>
                  </ModalFooter>
                </>
              )}
            </Formik>
          )}
        </ModalContent>
      </Modal>
    </div>
  );
}
