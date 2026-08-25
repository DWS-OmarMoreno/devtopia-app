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
import { ContratoSchema, ContratoTransicionSchema } from "@/helpers/schemas";
import type { ContratoFormType, ContratoTransicionFormType } from "@/helpers/types";
import { crearContrato, actualizarContrato, cambiarEstadoContrato } from "@/app/(app)/contratos-proyectos/actions";

export type ContratoConRelaciones = Tables<"contratos"> & {
  cuentas_clientes: { razon_social: string } | null;
  monedas: { codigo_iso: string } | null;
  responsable: { nombre_completo: string } | null;
  estados_ciclo_vida: { codigo_estado: string; etiqueta: string; color_ui: string | null } | null;
};

export const TIPOS_CONTRATO = [
  { id: "TIEMPO_Y_MATERIALES", etiqueta: "Tiempo y materiales" },
  { id: "PRECIO_FIJO", etiqueta: "Precio fijo" },
  { id: "RETAINER", etiqueta: "Retainer" },
  { id: "BOLSA_HORAS", etiqueta: "Bolsa de horas" },
];

const COLOR_ESTADO: Record<string, "default" | "primary" | "secondary" | "success" | "warning" | "danger"> = {
  BORRADOR: "default",
  EN_REVISION: "warning",
  ACTIVO: "success",
  SUSPENDIDO: "warning",
  FINALIZADO: "secondary",
  CANCELADO: "danger",
};

function formatearMoneda(valor: number | null, codigoIso: string | undefined): string {
  if (valor == null) return "—";
  const numero = valor.toLocaleString("es-CO", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return codigoIso ? `${codigoIso} ${numero}` : numero;
}

interface Props {
  contratos: ContratoConRelaciones[];
  cuentas: { id: string; razon_social: string }[];
  monedas: Tables<"monedas">[];
  usuariosEmpresa: { id: string; nombre_completo: string }[];
  estados: Tables<"estados_ciclo_vida">[];
  transiciones: Tables<"workflows_transiciones">[];
  puedeCrear: boolean;
  puedeEditar: boolean;
}

export function ContratosPanel({
  contratos,
  cuentas,
  monedas,
  usuariosEmpresa,
  estados,
  transiciones,
  puedeCrear,
  puedeEditar,
}: Props) {
  const router = useRouter();
  const [modalHeaderAbierto, setModalHeaderAbierto] = useState(false);
  const [contratoEnEdicionId, setContratoEnEdicionId] = useState<string | null>(null);
  const [contratoDetalleId, setContratoDetalleId] = useState<string | null>(null);
  const [transicionSeleccionada, setTransicionSeleccionada] = useState<{
    id: string;
    destinoId: string;
    etiqueta: string;
    requiereComentario: boolean;
  } | null>(null);
  const [errorGeneral, setErrorGeneral] = useState("");
  const [guardando, setGuardando] = useState(false);

  const contratoEnEdicion = contratoEnEdicionId ? contratos.find((c) => c.id === contratoEnEdicionId) ?? null : null;
  const contratoDetalle = contratoDetalleId ? contratos.find((c) => c.id === contratoDetalleId) ?? null : null;

  const transicionesDisponibles = useMemo(() => {
    if (!contratoDetalle) return [];
    return transiciones
      .filter((t) => t.estado_origen_id === contratoDetalle.estado_id)
      .map((t) => ({ transicion: t, destino: estados.find((e) => e.id === t.estado_destino_id) ?? null }))
      .filter((t) => t.destino);
  }, [transiciones, contratoDetalle, estados]);

  const opcionesCuenta = cuentas.map((c) => ({ id: c.id, etiqueta: c.razon_social }));
  const opcionesMoneda = monedas.map((m) => ({ id: m.id, etiqueta: `${m.codigo_iso} — ${m.nombre}` }));
  const opcionesUsuario = usuariosEmpresa.map((u) => ({ id: u.id, etiqueta: u.nombre_completo }));

  const abrirCrear = () => {
    setContratoEnEdicionId(null);
    setErrorGeneral("");
    setModalHeaderAbierto(true);
  };
  const abrirEditar = (id: string) => {
    setContratoEnEdicionId(id);
    setErrorGeneral("");
    setModalHeaderAbierto(true);
  };
  const abrirDetalle = (id: string) => {
    setContratoDetalleId(id);
    setErrorGeneral("");
  };

  const initialValuesHeader: ContratoFormType = {
    cuenta_id: contratoEnEdicion?.cuenta_id ?? "",
    contacto_firmante_id: contratoEnEdicion?.contacto_firmante_id ?? "",
    tipo_contrato: contratoEnEdicion?.tipo_contrato ?? "",
    fecha_firma: contratoEnEdicion?.fecha_firma ?? "",
    fecha_inicio: contratoEnEdicion?.fecha_inicio ?? "",
    fecha_fin_estimada: contratoEnEdicion?.fecha_fin_estimada ?? "",
    moneda_id: contratoEnEdicion?.moneda_id ?? "",
    valor_total_contratado: contratoEnEdicion ? String(contratoEnEdicion.valor_total_contratado) : "",
    forma_pago: contratoEnEdicion?.forma_pago ?? "",
    plazo_pago_dias: contratoEnEdicion?.plazo_pago_dias != null ? String(contratoEnEdicion.plazo_pago_dias) : "",
    responsable_comercial_id: contratoEnEdicion?.responsable_comercial_id ?? "",
    responsable_pm_id: contratoEnEdicion?.responsable_pm_id ?? "",
    archivo_contrato_url: contratoEnEdicion?.archivo_contrato_url ?? "",
    clausulas_especiales: contratoEnEdicion?.clausulas_especiales ?? "",
  };

  const initialValuesTransicion: ContratoTransicionFormType = { comentario: "" };

  return (
    <div className="flex flex-col gap-4 py-2">
      {puedeCrear && (
        <div className="flex justify-end">
          <Button color="primary" size="sm" onPress={abrirCrear} isDisabled={cuentas.length === 0}>
            Nuevo contrato
          </Button>
        </div>
      )}
      {puedeCrear && cuentas.length === 0 && (
        <p className="text-tiny text-warning-600">
          No hay cuentas disponibles para asociar a un contrato todavía.
        </p>
      )}

      {errorGeneral && !contratoDetalleId && <p className="text-danger text-sm">{errorGeneral}</p>}

      {contratos.length === 0 ? (
        <p className="text-default-500 text-sm">No hay contratos registrados todavía.</p>
      ) : (
        <Table aria-label="Contratos" removeWrapper={false}>
          <TableHeader>
            <TableColumn>NÚMERO</TableColumn>
            <TableColumn>CUENTA</TableColumn>
            <TableColumn>TIPO</TableColumn>
            <TableColumn>ESTADO</TableColumn>
            <TableColumn>VALOR</TableColumn>
            <TableColumn>RESPONSABLE</TableColumn>
            <TableColumn>ACCIONES</TableColumn>
          </TableHeader>
          <TableBody>
            {contratos.map((contrato) => (
              <TableRow key={contrato.id}>
                <TableCell className="font-mono text-tiny">{contrato.numero_contrato}</TableCell>
                <TableCell>{contrato.cuentas_clientes?.razon_social ?? "—"}</TableCell>
                <TableCell>{TIPOS_CONTRATO.find((t) => t.id === contrato.tipo_contrato)?.etiqueta ?? contrato.tipo_contrato}</TableCell>
                <TableCell>
                  <Chip size="sm" variant="flat" color={COLOR_ESTADO[contrato.estados_ciclo_vida?.codigo_estado ?? ""] ?? "default"}>
                    {contrato.estados_ciclo_vida?.etiqueta ?? "—"}
                  </Chip>
                </TableCell>
                <TableCell>{formatearMoneda(contrato.valor_total_contratado, contrato.monedas?.codigo_iso)}</TableCell>
                <TableCell className="text-tiny text-default-500">{contrato.responsable?.nombre_completo ?? "—"}</TableCell>
                <TableCell>
                  <Button size="sm" variant="light" onPress={() => abrirDetalle(contrato.id)}>
                    Ver / Gestionar
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {/* Modal: crear/editar contrato */}
      <Modal isOpen={modalHeaderAbierto} onOpenChange={setModalHeaderAbierto} size="3xl" scrollBehavior="inside">
        <ModalContent>
          {(cerrar) => (
            <Formik
              enableReinitialize
              initialValues={initialValuesHeader}
              validationSchema={ContratoSchema}
              onSubmit={async (valores) => {
                setGuardando(true);
                setErrorGeneral("");

                const formData = new FormData();
                Object.entries(valores).forEach(([clave, valor]) => {
                  formData.set(clave, valor ?? "");
                });

                const resultado = contratoEnEdicion
                  ? await actualizarContrato(contratoEnEdicion.id, formData)
                  : await crearContrato(formData);

                setGuardando(false);

                if (!resultado.ok) {
                  setErrorGeneral(resultado.error);
                  return;
                }

                router.refresh();
                cerrar();
              }}
            >
              {({ values, errors, touched, handleChange, handleSubmit, setFieldValue }) => (
                <>
                  <ModalHeader>{contratoEnEdicion ? "Editar contrato" : "Nuevo contrato"}</ModalHeader>
                  <ModalBody className="gap-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex flex-col gap-1">
                        <span className="text-small text-default-600">Cuenta</span>
                        <DropdownSelector
                          etiquetaAria="Cuenta"
                          opciones={opcionesCuenta}
                          valor={values.cuenta_id || null}
                          onCambiar={(id) => setFieldValue("cuenta_id", id ?? "")}
                        />
                        {!!errors.cuenta_id && !!touched.cuenta_id && (
                          <span className="text-tiny text-danger">{errors.cuenta_id}</span>
                        )}
                      </div>
                      <div className="flex flex-col gap-1">
                        <span className="text-small text-default-600">Tipo de contrato</span>
                        <DropdownSelector
                          etiquetaAria="Tipo de contrato"
                          opciones={TIPOS_CONTRATO}
                          valor={values.tipo_contrato || null}
                          onCambiar={(id) => setFieldValue("tipo_contrato", id ?? "")}
                        />
                        {!!errors.tipo_contrato && !!touched.tipo_contrato && (
                          <span className="text-tiny text-danger">{errors.tipo_contrato}</span>
                        )}
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <Input
                        label="Fecha de firma (opcional)"
                        type="date"
                        variant="bordered"
                        value={values.fecha_firma}
                        onChange={handleChange("fecha_firma")}
                      />
                      <Input
                        label="Fecha de inicio"
                        type="date"
                        variant="bordered"
                        value={values.fecha_inicio}
                        onChange={handleChange("fecha_inicio")}
                        isInvalid={!!errors.fecha_inicio && !!touched.fecha_inicio}
                        errorMessage={errors.fecha_inicio}
                      />
                      <Input
                        label="Fecha fin estimada (opcional)"
                        type="date"
                        variant="bordered"
                        value={values.fecha_fin_estimada}
                        onChange={handleChange("fecha_fin_estimada")}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <Input
                        label="Valor total contratado"
                        type="number"
                        step="0.01"
                        variant="bordered"
                        value={values.valor_total_contratado}
                        onChange={handleChange("valor_total_contratado")}
                        isInvalid={!!errors.valor_total_contratado && !!touched.valor_total_contratado}
                        errorMessage={errors.valor_total_contratado}
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
                    <div className="grid grid-cols-2 gap-4">
                      <Input
                        label="Forma de pago (opcional)"
                        variant="bordered"
                        value={values.forma_pago}
                        onChange={handleChange("forma_pago")}
                      />
                      <Input
                        label="Plazo de pago en días (opcional)"
                        type="number"
                        variant="bordered"
                        value={values.plazo_pago_dias}
                        onChange={handleChange("plazo_pago_dias")}
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-small text-default-600">Responsable comercial</span>
                      <DropdownSelector
                        etiquetaAria="Responsable comercial"
                        opciones={opcionesUsuario}
                        valor={values.responsable_comercial_id || null}
                        onCambiar={(id) => setFieldValue("responsable_comercial_id", id ?? "")}
                      />
                      {!!errors.responsable_comercial_id && !!touched.responsable_comercial_id && (
                        <span className="text-tiny text-danger">{errors.responsable_comercial_id}</span>
                      )}
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-small text-default-600">Responsable PM (opcional)</span>
                      <DropdownSelector
                        etiquetaAria="Responsable PM"
                        opciones={opcionesUsuario}
                        valor={values.responsable_pm_id || null}
                        onCambiar={(id) => setFieldValue("responsable_pm_id", id ?? "")}
                        permitirVacio
                      />
                    </div>
                    <Input
                      label="URL del archivo del contrato (opcional)"
                      variant="bordered"
                      value={values.archivo_contrato_url}
                      onChange={handleChange("archivo_contrato_url")}
                    />
                    <Textarea
                      label="Cláusulas especiales (opcional)"
                      variant="bordered"
                      value={values.clausulas_especiales}
                      onChange={handleChange("clausulas_especiales")}
                    />
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
              )}
            </Formik>
          )}
        </ModalContent>
      </Modal>

      {/* Modal: detalle / gestión de un contrato */}
      <Modal
        isOpen={!!contratoDetalleId}
        onOpenChange={(abierto) => !abierto && setContratoDetalleId(null)}
        size="3xl"
        scrollBehavior="inside"
      >
        <ModalContent>
          {() =>
            contratoDetalle && (
              <>
                <ModalHeader className="flex flex-col items-start gap-1">
                  <div className="flex items-center gap-3">
                    <span>{contratoDetalle.numero_contrato}</span>
                    <Chip size="sm" variant="flat" color={COLOR_ESTADO[contratoDetalle.estados_ciclo_vida?.codigo_estado ?? ""] ?? "default"}>
                      {contratoDetalle.estados_ciclo_vida?.etiqueta ?? "—"}
                    </Chip>
                  </div>
                  <span className="text-small text-default-500 font-normal">
                    {contratoDetalle.cuentas_clientes?.razon_social ?? "—"}
                  </span>
                </ModalHeader>
                <ModalBody className="gap-4">
                  {errorGeneral && <p className="text-danger text-sm">{errorGeneral}</p>}

                  <div className="grid md:grid-cols-2 gap-x-6 gap-y-1 text-sm text-default-500">
                    <span>Tipo: {TIPOS_CONTRATO.find((t) => t.id === contratoDetalle.tipo_contrato)?.etiqueta ?? contratoDetalle.tipo_contrato}</span>
                    <span>Valor: {formatearMoneda(contratoDetalle.valor_total_contratado, contratoDetalle.monedas?.codigo_iso)}</span>
                    <span>Inicio: {contratoDetalle.fecha_inicio}</span>
                    <span>Fin estimado: {contratoDetalle.fecha_fin_estimada ?? "—"}</span>
                    <span>Responsable comercial: {contratoDetalle.responsable?.nombre_completo ?? "—"}</span>
                    <span>Forma de pago: {contratoDetalle.forma_pago ?? "—"}</span>
                  </div>

                  {puedeEditar && (
                    <div>
                      <Button size="sm" variant="light" onPress={() => abrirEditar(contratoDetalle.id)}>
                        Editar datos del contrato
                      </Button>
                    </div>
                  )}

                  <Divider />

                  {/* Flujo de estados */}
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
                  <Button variant="flat" onPress={() => setContratoDetalleId(null)}>
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
              validationSchema={ContratoTransicionSchema}
              onSubmit={async (valores, { resetForm }) => {
                if (!contratoDetalleId || !transicionSeleccionada) return;
                if (transicionSeleccionada.requiereComentario && !valores.comentario.trim()) {
                  setErrorGeneral("Este cambio de estado requiere un comentario.");
                  return;
                }
                setGuardando(true);
                setErrorGeneral("");

                const resultado = await cambiarEstadoContrato(
                  contratoDetalleId,
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
