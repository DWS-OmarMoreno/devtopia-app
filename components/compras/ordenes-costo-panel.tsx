"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
  Chip,
  Button,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Input,
  Textarea,
  Divider,
} from "@nextui-org/react";
import { Formik } from "formik";
import type { Tables } from "@/utils/database.types";
import { DropdownSelector } from "@/components/shared/dropdown-selector";
import { OrdenCostoSchema, OrdenCostoTransicionSchema } from "@/helpers/schemas";
import type { OrdenCostoFormType, OrdenCostoTransicionFormType } from "@/helpers/types";
import { crearOrdenCosto, actualizarOrdenCosto, cambiarEstadoOrdenCosto } from "@/app/(app)/compras/actions";
import type { ProveedorConRelaciones } from "./proveedores-panel";

export type OrdenCostoConRelaciones = Tables<"ordenes_costo_subcontratacion"> & {
  proveedores: { razon_social_o_nombre: string; numero_proveedor: string } | null;
  proyectos: { numero_proyecto: string; nombre_proyecto: string } | null;
  contratos: { numero_contrato: string } | null;
  monedas: { codigo_iso: string } | null;
  estados_ciclo_vida: { codigo_estado: string; etiqueta: string; color_ui: string | null } | null;
};

export const TIPOS_COSTO = [
  { id: "SERVICIO_PROFESIONAL", etiqueta: "Servicio profesional" },
  { id: "INFRAESTRUCTURA", etiqueta: "Infraestructura" },
  { id: "LICENCIA_TERCERO", etiqueta: "Licencia de tercero" },
  { id: "OTRO", etiqueta: "Otro" },
];

const COLOR_ESTADO_ORDEN_COSTO: Record<string, "default" | "primary" | "secondary" | "success" | "warning" | "danger"> = {
  BORRADOR: "default",
  APROBADA: "primary",
  EN_EJECUCION: "warning",
  FACTURADA: "secondary",
  PAGADA: "success",
  CANCELADA: "danger",
};

function formatearMoneda(valor: number | null, codigoIso: string | undefined): string {
  if (valor == null) return "—";
  const numero = valor.toLocaleString("es-CO", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return codigoIso ? `${codigoIso} ${numero}` : numero;
}

interface Props {
  ordenesCosto: OrdenCostoConRelaciones[];
  proveedores: ProveedorConRelaciones[];
  proyectos: { id: string; numero_proyecto: string; nombre_proyecto: string }[];
  contratos: { id: string; numero_contrato: string }[];
  monedas: Tables<"monedas">[];
  estados: Tables<"estados_ciclo_vida">[];
  transiciones: Tables<"workflows_transiciones">[];
  puedeCrear: boolean;
  puedeEditar: boolean;
}

export function OrdenesCostoPanel({
  ordenesCosto,
  proveedores,
  proyectos,
  contratos,
  monedas,
  estados,
  transiciones,
  puedeCrear,
  puedeEditar,
}: Props) {
  const router = useRouter();
  const [modalAbierto, setModalAbierto] = useState(false);
  const [ordenEnEdicionId, setOrdenEnEdicionId] = useState<string | null>(null);
  const [ordenDetalleId, setOrdenDetalleId] = useState<string | null>(null);
  const [transicionSeleccionada, setTransicionSeleccionada] = useState<{
    id: string;
    destinoId: string;
    etiqueta: string;
    requiereComentario: boolean;
  } | null>(null);
  const [errorGeneral, setErrorGeneral] = useState("");
  const [guardando, setGuardando] = useState(false);

  const ordenEnEdicion = ordenEnEdicionId ? ordenesCosto.find((o) => o.id === ordenEnEdicionId) ?? null : null;
  const ordenDetalle = ordenDetalleId ? ordenesCosto.find((o) => o.id === ordenDetalleId) ?? null : null;

  const transicionesDisponibles = useMemo(() => {
    if (!ordenDetalle) return [];
    return transiciones
      .filter((t) => t.estado_origen_id === ordenDetalle.estado_id)
      .map((t) => ({ transicion: t, destino: estados.find((e) => e.id === t.estado_destino_id) ?? null }))
      .filter((t) => t.destino);
  }, [transiciones, ordenDetalle, estados]);

  const opcionesProveedor = proveedores.map((p) => ({ id: p.id, etiqueta: `${p.numero_proveedor} — ${p.razon_social_o_nombre}` }));
  const opcionesProyecto = proyectos.map((p) => ({ id: p.id, etiqueta: `${p.numero_proyecto} — ${p.nombre_proyecto}` }));
  const opcionesContrato = contratos.map((c) => ({ id: c.id, etiqueta: c.numero_contrato }));
  const opcionesMoneda = monedas.map((m) => ({ id: m.id, etiqueta: `${m.codigo_iso} — ${m.nombre}` }));

  const abrirCrear = () => {
    setOrdenEnEdicionId(null);
    setErrorGeneral("");
    setModalAbierto(true);
  };
  const abrirEditar = (id: string) => {
    setOrdenEnEdicionId(id);
    setErrorGeneral("");
    setModalAbierto(true);
  };
  const abrirDetalle = (id: string) => {
    setOrdenDetalleId(id);
    setErrorGeneral("");
  };

  const initialValues: OrdenCostoFormType = {
    proveedor_id: ordenEnEdicion?.proveedor_id ?? "",
    proyecto_id: ordenEnEdicion?.proyecto_id ?? "",
    contrato_id: ordenEnEdicion?.contrato_id ?? "",
    concepto: ordenEnEdicion?.concepto ?? "",
    tipo_costo: ordenEnEdicion?.tipo_costo ?? "",
    fecha_orden: ordenEnEdicion?.fecha_orden ?? new Date().toISOString().slice(0, 10),
    fecha_inicio_servicio: ordenEnEdicion?.fecha_inicio_servicio ?? "",
    fecha_fin_servicio: ordenEnEdicion?.fecha_fin_servicio ?? "",
    cantidad: ordenEnEdicion ? String(ordenEnEdicion.cantidad) : "1",
    unidad_medida: ordenEnEdicion?.unidad_medida ?? "",
    valor_unitario: ordenEnEdicion ? String(ordenEnEdicion.valor_unitario) : "",
    moneda_id: ordenEnEdicion?.moneda_id ?? "",
    factura_proveedor_numero: ordenEnEdicion?.factura_proveedor_numero ?? "",
    factura_proveedor_fecha: ordenEnEdicion?.factura_proveedor_fecha ?? "",
    factura_proveedor_url: ordenEnEdicion?.factura_proveedor_url ?? "",
    notas: ordenEnEdicion?.notas ?? "",
  };

  const initialValuesTransicion: OrdenCostoTransicionFormType = { comentario: "" };

  return (
    <div className="flex flex-col gap-4 py-2">
      {puedeCrear && (
        <div className="flex justify-end">
          <Button color="primary" size="sm" onPress={abrirCrear} isDisabled={proveedores.length === 0 || proyectos.length === 0}>
            Nueva orden de costo
          </Button>
        </div>
      )}
      {puedeCrear && proveedores.length === 0 && (
        <p className="text-tiny text-warning-600">Crea primero un proveedor en la pestaña Proveedores.</p>
      )}

      {errorGeneral && !ordenDetalleId && <p className="text-danger text-sm">{errorGeneral}</p>}

      {ordenesCosto.length === 0 ? (
        <p className="text-default-500 text-sm">No hay órdenes de costo registradas todavía.</p>
      ) : (
        <Table aria-label="Órdenes de costo" removeWrapper={false}>
          <TableHeader>
            <TableColumn>NÚMERO</TableColumn>
            <TableColumn>PROVEEDOR</TableColumn>
            <TableColumn>PROYECTO</TableColumn>
            <TableColumn>CONCEPTO</TableColumn>
            <TableColumn>VALOR TOTAL</TableColumn>
            <TableColumn>ESTADO</TableColumn>
            <TableColumn>ACCIONES</TableColumn>
          </TableHeader>
          <TableBody>
            {ordenesCosto.map((orden) => (
              <TableRow key={orden.id}>
                <TableCell className="font-mono text-tiny">{orden.numero_orden}</TableCell>
                <TableCell className="text-tiny">{orden.proveedores?.razon_social_o_nombre ?? "—"}</TableCell>
                <TableCell className="text-tiny">{orden.proyectos?.numero_proyecto ?? "—"}</TableCell>
                <TableCell>{orden.concepto}</TableCell>
                <TableCell>{formatearMoneda(orden.valor_total, orden.monedas?.codigo_iso)}</TableCell>
                <TableCell>
                  <Chip size="sm" variant="flat" color={COLOR_ESTADO_ORDEN_COSTO[orden.estados_ciclo_vida?.codigo_estado ?? ""] ?? "default"}>
                    {orden.estados_ciclo_vida?.etiqueta ?? "—"}
                  </Chip>
                </TableCell>
                <TableCell>
                  <Button size="sm" variant="light" onPress={() => abrirDetalle(orden.id)}>
                    Ver / Gestionar
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {/* Modal: crear/editar orden de costo */}
      <Modal isOpen={modalAbierto} onOpenChange={setModalAbierto} size="3xl" scrollBehavior="inside">
        <ModalContent>
          {(cerrar) => (
            <Formik
              enableReinitialize
              initialValues={initialValues}
              validationSchema={OrdenCostoSchema}
              onSubmit={async (valores) => {
                setGuardando(true);
                setErrorGeneral("");

                const formData = new FormData();
                Object.entries(valores).forEach(([clave, valor]) => {
                  formData.set(clave, valor ?? "");
                });

                const resultado = ordenEnEdicion
                  ? await actualizarOrdenCosto(ordenEnEdicion.id, formData)
                  : await crearOrdenCosto(formData);

                setGuardando(false);

                if (!resultado.ok) {
                  setErrorGeneral(resultado.error);
                  return;
                }

                router.refresh();
                cerrar();
              }}
            >
              {({ values, errors, touched, handleChange, handleSubmit, setFieldValue }) => {
                const cantidad = Number(values.cantidad) || 0;
                const valorUnitario = Number(values.valor_unitario) || 0;
                return (
                  <>
                    <ModalHeader>{ordenEnEdicion ? "Editar orden de costo" : "Nueva orden de costo"}</ModalHeader>
                    <ModalBody className="gap-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="flex flex-col gap-1">
                          <span className="text-small text-default-600">Proveedor</span>
                          <DropdownSelector
                            etiquetaAria="Proveedor"
                            opciones={opcionesProveedor}
                            valor={values.proveedor_id || null}
                            onCambiar={(id) => setFieldValue("proveedor_id", id ?? "")}
                          />
                          {!!errors.proveedor_id && !!touched.proveedor_id && (
                            <span className="text-tiny text-danger">{errors.proveedor_id}</span>
                          )}
                        </div>
                        <div className="flex flex-col gap-1">
                          <span className="text-small text-default-600">Proyecto</span>
                          <DropdownSelector
                            etiquetaAria="Proyecto"
                            opciones={opcionesProyecto}
                            valor={values.proyecto_id || null}
                            onCambiar={(id) => setFieldValue("proyecto_id", id ?? "")}
                          />
                          {!!errors.proyecto_id && !!touched.proyecto_id && (
                            <span className="text-tiny text-danger">{errors.proyecto_id}</span>
                          )}
                        </div>
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
                      <Input
                        label="Concepto"
                        variant="bordered"
                        value={values.concepto}
                        onChange={handleChange("concepto")}
                        isInvalid={!!errors.concepto && !!touched.concepto}
                        errorMessage={errors.concepto}
                      />
                      <div className="flex flex-col gap-1">
                        <span className="text-small text-default-600">Tipo de costo</span>
                        <DropdownSelector
                          etiquetaAria="Tipo de costo"
                          opciones={TIPOS_COSTO}
                          valor={values.tipo_costo || null}
                          onCambiar={(id) => setFieldValue("tipo_costo", id ?? "")}
                        />
                        {!!errors.tipo_costo && !!touched.tipo_costo && (
                          <span className="text-tiny text-danger">{errors.tipo_costo}</span>
                        )}
                      </div>
                      <div className="grid grid-cols-3 gap-4">
                        <Input
                          label="Fecha de la orden"
                          type="date"
                          variant="bordered"
                          value={values.fecha_orden}
                          onChange={handleChange("fecha_orden")}
                          isInvalid={!!errors.fecha_orden && !!touched.fecha_orden}
                          errorMessage={errors.fecha_orden}
                        />
                        <Input
                          label="Inicio del servicio (opcional)"
                          type="date"
                          variant="bordered"
                          value={values.fecha_inicio_servicio}
                          onChange={handleChange("fecha_inicio_servicio")}
                        />
                        <Input
                          label="Fin del servicio (opcional)"
                          type="date"
                          variant="bordered"
                          value={values.fecha_fin_servicio}
                          onChange={handleChange("fecha_fin_servicio")}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <Input
                          label="Cantidad"
                          type="number"
                          step="0.01"
                          variant="bordered"
                          value={values.cantidad}
                          onChange={handleChange("cantidad")}
                          isInvalid={!!errors.cantidad && !!touched.cantidad}
                          errorMessage={errors.cantidad}
                        />
                        <Input
                          label="Unidad de medida"
                          variant="bordered"
                          value={values.unidad_medida}
                          onChange={handleChange("unidad_medida")}
                          isInvalid={!!errors.unidad_medida && !!touched.unidad_medida}
                          errorMessage={errors.unidad_medida}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <Input
                          label="Valor unitario"
                          type="number"
                          step="0.01"
                          variant="bordered"
                          value={values.valor_unitario}
                          onChange={handleChange("valor_unitario")}
                          isInvalid={!!errors.valor_unitario && !!touched.valor_unitario}
                          errorMessage={errors.valor_unitario}
                        />
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
                      </div>
                      <p className="text-tiny text-default-500">
                        Valor total (calculado automáticamente, cantidad × valor unitario): {" "}
                        {(cantidad * valorUnitario).toLocaleString("es-CO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </p>
                      <div className="grid grid-cols-2 gap-4">
                        <Input
                          label="Número de factura del proveedor (opcional)"
                          variant="bordered"
                          value={values.factura_proveedor_numero}
                          onChange={handleChange("factura_proveedor_numero")}
                        />
                        <Input
                          label="Fecha de factura del proveedor (opcional)"
                          type="date"
                          variant="bordered"
                          value={values.factura_proveedor_fecha}
                          onChange={handleChange("factura_proveedor_fecha")}
                        />
                      </div>
                      <Input
                        label="URL de la factura del proveedor (opcional)"
                        variant="bordered"
                        value={values.factura_proveedor_url}
                        onChange={handleChange("factura_proveedor_url")}
                      />
                      <Textarea label="Notas (opcional)" variant="bordered" value={values.notas} onChange={handleChange("notas")} />
                      {errorGeneral && <p className="text-danger text-sm">{errorGeneral}</p>}
                    </ModalBody>
                    <ModalFooter>
                      <Button variant="flat" onPress={cerrar}>
                        Cerrar
                      </Button>
                      <Button color="primary" isLoading={guardando} onPress={() => handleSubmit()}>
                        Guardar
                      </Button>
                    </ModalFooter>
                  </>
                );
              }}
            </Formik>
          )}
        </ModalContent>
      </Modal>

      {/* Modal: detalle / gestión de una orden de costo */}
      <Modal
        isOpen={!!ordenDetalleId}
        onOpenChange={(abierto) => !abierto && setOrdenDetalleId(null)}
        size="3xl"
        scrollBehavior="inside"
      >
        <ModalContent>
          {() =>
            ordenDetalle && (
              <>
                <ModalHeader className="flex flex-col items-start gap-1">
                  <div className="flex items-center gap-3">
                    <span>{ordenDetalle.numero_orden}</span>
                    <Chip size="sm" variant="flat" color={COLOR_ESTADO_ORDEN_COSTO[ordenDetalle.estados_ciclo_vida?.codigo_estado ?? ""] ?? "default"}>
                      {ordenDetalle.estados_ciclo_vida?.etiqueta ?? "—"}
                    </Chip>
                  </div>
                  <span className="text-small text-default-500 font-normal">{ordenDetalle.concepto}</span>
                </ModalHeader>
                <ModalBody className="gap-4">
                  {errorGeneral && <p className="text-danger text-sm">{errorGeneral}</p>}

                  <div className="grid md:grid-cols-2 gap-x-6 gap-y-1 text-sm text-default-500">
                    <span>Proveedor: {ordenDetalle.proveedores?.razon_social_o_nombre ?? "—"}</span>
                    <span>Proyecto: {ordenDetalle.proyectos?.numero_proyecto ?? "—"}</span>
                    <span>Contrato: {ordenDetalle.contratos?.numero_contrato ?? "—"}</span>
                    <span>Tipo de costo: {TIPOS_COSTO.find((t) => t.id === ordenDetalle.tipo_costo)?.etiqueta ?? ordenDetalle.tipo_costo}</span>
                    <span>Valor total: {formatearMoneda(ordenDetalle.valor_total, ordenDetalle.monedas?.codigo_iso)}</span>
                    <span>Fecha de la orden: {ordenDetalle.fecha_orden}</span>
                  </div>

                  {puedeEditar && !["PAGADA", "CANCELADA"].includes(ordenDetalle.estados_ciclo_vida?.codigo_estado ?? "") && (
                    <div>
                      <Button size="sm" variant="light" onPress={() => abrirEditar(ordenDetalle.id)}>
                        Editar datos de la orden
                      </Button>
                    </div>
                  )}

                  <Divider />

                  <div className="flex flex-col gap-2">
                    <span className="text-small font-medium">Cambiar estado</span>
                    {puedeEditar && transicionesDisponibles.length > 0 ? (
                      <div className="flex gap-2 flex-wrap">
                        {transicionesDisponibles.map(({ transicion, destino }) => (
                          <Button
                            key={transicion.id}
                            size="sm"
                            variant="flat"
                            onPress={() =>
                              setTransicionSeleccionada({
                                id: transicion.id,
                                destinoId: destino!.id,
                                etiqueta: destino!.etiqueta,
                                requiereComentario: transicion.requiere_comentario,
                              })
                            }
                          >
                            Pasar a {destino!.etiqueta}
                          </Button>
                        ))}
                      </div>
                    ) : (
                      <span className="text-tiny text-default-400">No hay transiciones disponibles desde este estado.</span>
                    )}
                  </div>
                </ModalBody>
                <ModalFooter>
                  <Button variant="flat" onPress={() => setOrdenDetalleId(null)}>
                    Cerrar
                  </Button>
                </ModalFooter>
              </>
            )
          }
        </ModalContent>
      </Modal>

      {/* Modal: confirmar transición de estado */}
      <Modal isOpen={!!transicionSeleccionada} onOpenChange={(abierto) => !abierto && setTransicionSeleccionada(null)}>
        <ModalContent>
          {(cerrar) => (
            <Formik
              initialValues={initialValuesTransicion}
              validationSchema={OrdenCostoTransicionSchema}
              onSubmit={async (valores, { resetForm }) => {
                if (!ordenDetalleId || !transicionSeleccionada) return;
                if (transicionSeleccionada.requiereComentario && !valores.comentario.trim()) {
                  setErrorGeneral("Este cambio de estado requiere un comentario.");
                  return;
                }
                setGuardando(true);
                setErrorGeneral("");

                const resultado = await cambiarEstadoOrdenCosto(
                  ordenDetalleId,
                  transicionSeleccionada.destinoId,
                  valores.comentario || null
                );

                setGuardando(false);

                if (!resultado.ok) {
                  setErrorGeneral(resultado.error);
                  return;
                }

                resetForm();
                router.refresh();
                setTransicionSeleccionada(null);
                cerrar();
              }}
            >
              {({ values, handleChange, handleSubmit }) => (
                <>
                  <ModalHeader>Pasar a {transicionSeleccionada?.etiqueta}</ModalHeader>
                  <ModalBody className="gap-4">
                    <Textarea
                      label={transicionSeleccionada?.requiereComentario ? "Comentario (obligatorio)" : "Comentario (opcional)"}
                      variant="bordered"
                      value={values.comentario}
                      onChange={handleChange("comentario")}
                    />
                    {errorGeneral && <p className="text-danger text-sm">{errorGeneral}</p>}
                  </ModalBody>
                  <ModalFooter>
                    <Button variant="flat" onPress={cerrar}>
                      Cancelar
                    </Button>
                    <Button color="primary" isLoading={guardando} onPress={() => handleSubmit()}>
                      Confirmar
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
