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
import { ChangeRequestSchema, ChangeRequestTransicionSchema } from "@/helpers/schemas";
import type { ChangeRequestFormType, ChangeRequestTransicionFormType } from "@/helpers/types";
import { crearChangeRequest, actualizarChangeRequest, cambiarEstadoChangeRequest } from "@/app/(app)/contratos-proyectos/actions";
import type { ProyectoConRelaciones } from "./proyectos-panel";

export type ChangeRequestConRelaciones = Tables<"change_requests"> & {
  proyectos: { numero_proyecto: string; nombre_proyecto: string } | null;
  contratos: { numero_contrato: string } | null;
  solicitante: { nombre_completo: string } | null;
  aprobador: { nombre_completo: string } | null;
  estados_ciclo_vida: { codigo_estado: string; etiqueta: string; color_ui: string | null } | null;
};

export const TIPOS_CAMBIO = [
  { id: "ALCANCE", etiqueta: "Alcance" },
  { id: "CRONOGRAMA", etiqueta: "Cronograma" },
  { id: "PRESUPUESTO", etiqueta: "Presupuesto" },
  { id: "RECURSOS", etiqueta: "Recursos" },
  { id: "OTRO", etiqueta: "Otro" },
];

const COLOR_ESTADO_CR: Record<string, "default" | "primary" | "secondary" | "success" | "warning" | "danger"> = {
  BORRADOR: "default",
  EN_EVALUACION: "warning",
  APROBADO_CLIENTE: "primary",
  RECHAZADO: "danger",
  IMPLEMENTADO: "success",
};

function formatearMoneda(valor: number | null): string {
  if (valor == null) return "—";
  return valor.toLocaleString("es-CO", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

interface Props {
  changeRequests: ChangeRequestConRelaciones[];
  proyectos: ProyectoConRelaciones[];
  usuariosEmpresa: { id: string; nombre_completo: string }[];
  estados: Tables<"estados_ciclo_vida">[];
  transiciones: Tables<"workflows_transiciones">[];
  puedeCrear: boolean;
  puedeEditar: boolean;
}

export function ChangeRequestsPanel({
  changeRequests,
  proyectos,
  usuariosEmpresa,
  estados,
  transiciones,
  puedeCrear,
  puedeEditar,
}: Props) {
  const router = useRouter();
  const [modalAbierto, setModalAbierto] = useState(false);
  const [crEnEdicionId, setCrEnEdicionId] = useState<string | null>(null);
  const [crDetalleId, setCrDetalleId] = useState<string | null>(null);
  const [transicionSeleccionada, setTransicionSeleccionada] = useState<{
    id: string;
    destinoId: string;
    etiqueta: string;
    requiereComentario: boolean;
  } | null>(null);
  const [errorGeneral, setErrorGeneral] = useState("");
  const [guardando, setGuardando] = useState(false);

  const crEnEdicion = crEnEdicionId ? changeRequests.find((c) => c.id === crEnEdicionId) ?? null : null;
  const crDetalle = crDetalleId ? changeRequests.find((c) => c.id === crDetalleId) ?? null : null;

  const transicionesDisponibles = useMemo(() => {
    if (!crDetalle) return [];
    return transiciones
      .filter((t) => t.estado_origen_id === crDetalle.estado_id)
      .map((t) => ({ transicion: t, destino: estados.find((e) => e.id === t.estado_destino_id) ?? null }))
      .filter((t) => t.destino);
  }, [transiciones, crDetalle, estados]);

  const opcionesProyecto = proyectos.map((p) => ({ id: p.id, etiqueta: `${p.numero_proyecto} — ${p.nombre_proyecto}` }));
  const opcionesUsuario = usuariosEmpresa.map((u) => ({ id: u.id, etiqueta: u.nombre_completo }));

  const abrirCrear = () => {
    setCrEnEdicionId(null);
    setErrorGeneral("");
    setModalAbierto(true);
  };
  const abrirEditar = (id: string) => {
    setCrEnEdicionId(id);
    setErrorGeneral("");
    setModalAbierto(true);
  };
  const abrirDetalle = (id: string) => {
    setCrDetalleId(id);
    setErrorGeneral("");
  };

  const initialValues: ChangeRequestFormType = {
    proyecto_id: crEnEdicion?.proyecto_id ?? "",
    titulo: crEnEdicion?.titulo ?? "",
    descripcion_cambio: crEnEdicion?.descripcion_cambio ?? "",
    tipo_cambio: crEnEdicion?.tipo_cambio ?? "",
    justificacion: crEnEdicion?.justificacion ?? "",
    impacto_horas: crEnEdicion?.impacto_horas != null ? String(crEnEdicion.impacto_horas) : "",
    impacto_costo: crEnEdicion?.impacto_costo != null ? String(crEnEdicion.impacto_costo) : "",
    impacto_valor_contrato: crEnEdicion?.impacto_valor_contrato != null ? String(crEnEdicion.impacto_valor_contrato) : "",
    impacto_fecha_fin_dias: crEnEdicion?.impacto_fecha_fin_dias != null ? String(crEnEdicion.impacto_fecha_fin_dias) : "",
    solicitado_por_usuario_id: crEnEdicion?.solicitado_por_usuario_id ?? "",
    fecha_solicitud: crEnEdicion?.fecha_solicitud ?? new Date().toISOString().slice(0, 10),
    aprobador_interno_id: crEnEdicion?.aprobador_interno_id ?? "",
    documento_addenda_url: crEnEdicion?.documento_addenda_url ?? "",
  };

  const initialValuesTransicion: ChangeRequestTransicionFormType = { comentario: "" };

  return (
    <div className="flex flex-col gap-4 py-2">
      {puedeCrear && (
        <div className="flex justify-end">
          <Button color="primary" size="sm" onPress={abrirCrear} isDisabled={proyectos.length === 0}>
            Nuevo change request
          </Button>
        </div>
      )}

      {errorGeneral && !crDetalleId && <p className="text-danger text-sm">{errorGeneral}</p>}

      {changeRequests.length === 0 ? (
        <p className="text-default-500 text-sm">No hay change requests registrados todavía.</p>
      ) : (
        <Table aria-label="Change requests" removeWrapper={false}>
          <TableHeader>
            <TableColumn>NÚMERO</TableColumn>
            <TableColumn>PROYECTO</TableColumn>
            <TableColumn>TÍTULO</TableColumn>
            <TableColumn>TIPO</TableColumn>
            <TableColumn>ESTADO</TableColumn>
            <TableColumn>IMPACTO COSTO</TableColumn>
            <TableColumn>ACCIONES</TableColumn>
          </TableHeader>
          <TableBody>
            {changeRequests.map((cr) => (
              <TableRow key={cr.id}>
                <TableCell className="font-mono text-tiny">{cr.numero_cr}</TableCell>
                <TableCell className="text-tiny">{cr.proyectos?.numero_proyecto ?? "—"}</TableCell>
                <TableCell>{cr.titulo}</TableCell>
                <TableCell className="text-tiny">{TIPOS_CAMBIO.find((t) => t.id === cr.tipo_cambio)?.etiqueta ?? cr.tipo_cambio}</TableCell>
                <TableCell>
                  <Chip size="sm" variant="flat" color={COLOR_ESTADO_CR[cr.estados_ciclo_vida?.codigo_estado ?? ""] ?? "default"}>
                    {cr.estados_ciclo_vida?.etiqueta ?? "—"}
                  </Chip>
                </TableCell>
                <TableCell>{formatearMoneda(cr.impacto_costo)}</TableCell>
                <TableCell>
                  <Button size="sm" variant="light" onPress={() => abrirDetalle(cr.id)}>
                    Ver / Gestionar
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {/* Modal: crear/editar change request */}
      <Modal isOpen={modalAbierto} onOpenChange={setModalAbierto} size="3xl" scrollBehavior="inside">
        <ModalContent>
          {(cerrar) => (
            <Formik
              enableReinitialize
              initialValues={initialValues}
              validationSchema={ChangeRequestSchema}
              onSubmit={async (valores) => {
                setGuardando(true);
                setErrorGeneral("");

                const formData = new FormData();
                Object.entries(valores).forEach(([clave, valor]) => {
                  formData.set(clave, valor ?? "");
                });

                const resultado = crEnEdicion
                  ? await actualizarChangeRequest(crEnEdicion.id, formData)
                  : await crearChangeRequest(formData);

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
                  <ModalHeader>{crEnEdicion ? "Editar change request" : "Nuevo change request"}</ModalHeader>
                  <ModalBody className="gap-4">
                    <div className="flex flex-col gap-1">
                      <span className="text-small text-default-600">Proyecto</span>
                      <DropdownSelector
                        etiquetaAria="Proyecto"
                        opciones={opcionesProyecto}
                        valor={values.proyecto_id || null}
                        onCambiar={(id) => setFieldValue("proyecto_id", id ?? "")}
                        isDisabled={!!crEnEdicion}
                      />
                      {crEnEdicion && (
                        <span className="text-tiny text-default-400">
                          El proyecto no se puede cambiar después de crear el change request.
                        </span>
                      )}
                      {!!errors.proyecto_id && !!touched.proyecto_id && (
                        <span className="text-tiny text-danger">{errors.proyecto_id}</span>
                      )}
                    </div>
                    <Input
                      label="Título"
                      variant="bordered"
                      value={values.titulo}
                      onChange={handleChange("titulo")}
                      isInvalid={!!errors.titulo && !!touched.titulo}
                      errorMessage={errors.titulo}
                    />
                    <Textarea
                      label="Descripción del cambio"
                      variant="bordered"
                      value={values.descripcion_cambio}
                      onChange={handleChange("descripcion_cambio")}
                      isInvalid={!!errors.descripcion_cambio && !!touched.descripcion_cambio}
                      errorMessage={errors.descripcion_cambio}
                    />
                    <div className="flex flex-col gap-1">
                      <span className="text-small text-default-600">Tipo de cambio</span>
                      <DropdownSelector
                        etiquetaAria="Tipo de cambio"
                        opciones={TIPOS_CAMBIO}
                        valor={values.tipo_cambio || null}
                        onCambiar={(id) => setFieldValue("tipo_cambio", id ?? "")}
                      />
                      {!!errors.tipo_cambio && !!touched.tipo_cambio && (
                        <span className="text-tiny text-danger">{errors.tipo_cambio}</span>
                      )}
                    </div>
                    <Textarea
                      label="Justificación (opcional)"
                      variant="bordered"
                      value={values.justificacion}
                      onChange={handleChange("justificacion")}
                    />
                    <div className="grid grid-cols-2 gap-4">
                      <Input
                        label="Impacto en horas (opcional)"
                        type="number"
                        variant="bordered"
                        value={values.impacto_horas}
                        onChange={handleChange("impacto_horas")}
                      />
                      <Input
                        label="Impacto en costo (opcional)"
                        type="number"
                        step="0.01"
                        variant="bordered"
                        value={values.impacto_costo}
                        onChange={handleChange("impacto_costo")}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <Input
                        label="Impacto en valor del contrato (opcional)"
                        type="number"
                        step="0.01"
                        variant="bordered"
                        value={values.impacto_valor_contrato}
                        onChange={handleChange("impacto_valor_contrato")}
                      />
                      <Input
                        label="Impacto en fecha fin (días, opcional)"
                        type="number"
                        variant="bordered"
                        value={values.impacto_fecha_fin_dias}
                        onChange={handleChange("impacto_fecha_fin_dias")}
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-small text-default-600">Solicitado por</span>
                      <DropdownSelector
                        etiquetaAria="Solicitado por"
                        opciones={opcionesUsuario}
                        valor={values.solicitado_por_usuario_id || null}
                        onCambiar={(id) => setFieldValue("solicitado_por_usuario_id", id ?? "")}
                      />
                      {!!errors.solicitado_por_usuario_id && !!touched.solicitado_por_usuario_id && (
                        <span className="text-tiny text-danger">{errors.solicitado_por_usuario_id}</span>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <Input
                        label="Fecha de solicitud"
                        type="date"
                        variant="bordered"
                        value={values.fecha_solicitud}
                        onChange={handleChange("fecha_solicitud")}
                        isInvalid={!!errors.fecha_solicitud && !!touched.fecha_solicitud}
                        errorMessage={errors.fecha_solicitud}
                      />
                      <div className="flex flex-col gap-1">
                        <span className="text-small text-default-600">Aprobador interno (opcional)</span>
                        <DropdownSelector
                          etiquetaAria="Aprobador interno"
                          opciones={opcionesUsuario}
                          valor={values.aprobador_interno_id || null}
                          onCambiar={(id) => setFieldValue("aprobador_interno_id", id ?? "")}
                          permitirVacio
                        />
                      </div>
                    </div>
                    <Input
                      label="URL del documento de adenda (opcional)"
                      variant="bordered"
                      value={values.documento_addenda_url}
                      onChange={handleChange("documento_addenda_url")}
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

      {/* Modal: detalle / gestión de un change request */}
      <Modal
        isOpen={!!crDetalleId}
        onOpenChange={(abierto) => !abierto && setCrDetalleId(null)}
        size="3xl"
        scrollBehavior="inside"
      >
        <ModalContent>
          {() =>
            crDetalle && (
              <>
                <ModalHeader className="flex flex-col items-start gap-1">
                  <div className="flex items-center gap-3">
                    <span>{crDetalle.numero_cr}</span>
                    <Chip size="sm" variant="flat" color={COLOR_ESTADO_CR[crDetalle.estados_ciclo_vida?.codigo_estado ?? ""] ?? "default"}>
                      {crDetalle.estados_ciclo_vida?.etiqueta ?? "—"}
                    </Chip>
                  </div>
                  <span className="text-small text-default-500 font-normal">{crDetalle.titulo}</span>
                </ModalHeader>
                <ModalBody className="gap-4">
                  {errorGeneral && <p className="text-danger text-sm">{errorGeneral}</p>}

                  <p className="text-sm text-default-600">{crDetalle.descripcion_cambio}</p>

                  <div className="grid md:grid-cols-2 gap-x-6 gap-y-1 text-sm text-default-500">
                    <span>Proyecto: {crDetalle.proyectos?.numero_proyecto ?? "—"}</span>
                    <span>Contrato: {crDetalle.contratos?.numero_contrato ?? "—"}</span>
                    <span>Tipo: {TIPOS_CAMBIO.find((t) => t.id === crDetalle.tipo_cambio)?.etiqueta ?? crDetalle.tipo_cambio}</span>
                    <span>Impacto en costo: {formatearMoneda(crDetalle.impacto_costo)}</span>
                    <span>Impacto en valor del contrato: {formatearMoneda(crDetalle.impacto_valor_contrato)}</span>
                    <span>Solicitado por: {crDetalle.solicitante?.nombre_completo ?? "—"}</span>
                    <span>Fecha de solicitud: {crDetalle.fecha_solicitud}</span>
                    <span>Aprobador interno: {crDetalle.aprobador?.nombre_completo ?? "—"}</span>
                  </div>

                  {puedeEditar && (
                    <div>
                      <Button size="sm" variant="light" onPress={() => abrirEditar(crDetalle.id)}>
                        Editar datos del change request
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
                  <Button variant="flat" onPress={() => setCrDetalleId(null)}>
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
              validationSchema={ChangeRequestTransicionSchema}
              onSubmit={async (valores, { resetForm }) => {
                if (!crDetalleId || !transicionSeleccionada) return;
                if (transicionSeleccionada.requiereComentario && !valores.comentario.trim()) {
                  setErrorGeneral("Este cambio de estado requiere un comentario.");
                  return;
                }
                setGuardando(true);
                setErrorGeneral("");

                const resultado = await cambiarEstadoChangeRequest(
                  crDetalleId,
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
