"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Accordion,
  AccordionItem,
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
  Divider,
} from "@nextui-org/react";
import { Formik } from "formik";
import type { Tables } from "@/utils/database.types";
import { DropdownSelector } from "@/components/shared/dropdown-selector";
import { ProyectoSchema, ProyectoTransicionSchema, HitoSchema } from "@/helpers/schemas";
import type { ProyectoFormType, ProyectoTransicionFormType, HitoFormType } from "@/helpers/types";
import {
  crearProyecto,
  actualizarProyecto,
  cambiarEstadoProyecto,
  crearHito,
  actualizarHito,
  cambiarEstadoHito,
  crearCriterio,
  marcarCriterioCumplido,
  eliminarCriterio,
} from "@/app/(app)/contratos-proyectos/actions";
import type { ContratoConRelaciones } from "./contratos-panel";

export type ProyectoConRelaciones = Tables<"proyectos"> & {
  contratos: { numero_contrato: string } | null;
  pm: { nombre_completo: string } | null;
  estados_ciclo_vida: { codigo_estado: string; etiqueta: string; color_ui: string | null } | null;
};

type HitoConRelaciones = Tables<"hitos_entregables"> & { responsable: { nombre_completo: string } | null };

const PRIORIDADES = [
  { id: "ALTA", etiqueta: "Alta" },
  { id: "MEDIA", etiqueta: "Media" },
  { id: "BAJA", etiqueta: "Baja" },
];

const ESTADOS_HITO = [
  { id: "PENDIENTE", etiqueta: "Pendiente" },
  { id: "EN_PROGRESO", etiqueta: "En progreso" },
  { id: "ENTREGADO", etiqueta: "Entregado" },
  { id: "EN_REVISION_CLIENTE", etiqueta: "En revisión del cliente" },
  { id: "ACEPTADO", etiqueta: "Aceptado" },
  { id: "RECHAZADO", etiqueta: "Rechazado" },
];

const COLOR_ESTADO_PROYECTO: Record<string, "default" | "primary" | "secondary" | "success" | "warning" | "danger"> = {
  PLANIFICACION: "default",
  EN_EJECUCION: "primary",
  EN_PAUSA: "warning",
  CERRADO: "success",
  CANCELADO: "danger",
};

const COLOR_ESTADO_HITO: Record<string, "default" | "primary" | "secondary" | "success" | "warning" | "danger"> = {
  PENDIENTE: "default",
  EN_PROGRESO: "primary",
  ENTREGADO: "secondary",
  EN_REVISION_CLIENTE: "warning",
  ACEPTADO: "success",
  RECHAZADO: "danger",
};

function formatearMoneda(valor: number | null): string {
  if (valor == null) return "—";
  return valor.toLocaleString("es-CO", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

interface Props {
  proyectos: ProyectoConRelaciones[];
  contratos: ContratoConRelaciones[];
  hitos: HitoConRelaciones[];
  criterios: Tables<"hitos_criterios_aceptacion">[];
  usuariosEmpresa: { id: string; nombre_completo: string }[];
  estados: Tables<"estados_ciclo_vida">[];
  transiciones: Tables<"workflows_transiciones">[];
  secuenciasProyecto: Tables<"secuencias_numeracion">[];
  puedeCrear: boolean;
  puedeEditar: boolean;
  puedeCrearHito: boolean;
  puedeEditarHito: boolean;
}

export function ProyectosPanel({
  proyectos,
  contratos,
  hitos,
  criterios,
  usuariosEmpresa,
  estados,
  transiciones,
  secuenciasProyecto,
  puedeCrear,
  puedeEditar,
  puedeCrearHito,
  puedeEditarHito,
}: Props) {
  const router = useRouter();
  const [modalProyectoAbierto, setModalProyectoAbierto] = useState(false);
  const [proyectoEnEdicionId, setProyectoEnEdicionId] = useState<string | null>(null);
  const [proyectoParaHito, setProyectoParaHito] = useState<ProyectoConRelaciones | null>(null);
  const [hitoEnEdicionId, setHitoEnEdicionId] = useState<string | null>(null);
  const [hitoParaEstado, setHitoParaEstado] = useState<HitoConRelaciones | null>(null);
  const [estadoHitoElegido, setEstadoHitoElegido] = useState("");
  const [notasRechazo, setNotasRechazo] = useState("");
  const [hitoParaCriterios, setHitoParaCriterios] = useState<HitoConRelaciones | null>(null);
  const [criterioNuevo, setCriterioNuevo] = useState("");
  const [transicionSeleccionada, setTransicionSeleccionada] = useState<{
    proyectoId: string;
    id: string;
    destinoId: string;
    etiqueta: string;
    requiereComentario: boolean;
  } | null>(null);
  const [filaEnProceso, setFilaEnProceso] = useState<string | null>(null);
  const [errorGeneral, setErrorGeneral] = useState("");
  const [guardando, setGuardando] = useState(false);

  const proyectoEnEdicion = proyectoEnEdicionId ? proyectos.find((p) => p.id === proyectoEnEdicionId) ?? null : null;

  const hitosPorProyecto = useMemo(() => {
    const mapa = new Map<string, HitoConRelaciones[]>();
    for (const hito of hitos) {
      const lista = mapa.get(hito.proyecto_id) ?? [];
      lista.push(hito);
      mapa.set(hito.proyecto_id, lista);
    }
    return mapa;
  }, [hitos]);

  const criteriosPorHito = useMemo(() => {
    const mapa = new Map<string, Tables<"hitos_criterios_aceptacion">[]>();
    for (const criterio of criterios) {
      const lista = mapa.get(criterio.hito_id) ?? [];
      lista.push(criterio);
      mapa.set(criterio.hito_id, lista);
    }
    return mapa;
  }, [criterios]);

  const opcionesContrato = contratos.map((c) => ({ id: c.id, etiqueta: `${c.numero_contrato} — ${c.cuentas_clientes?.razon_social ?? ""}` }));
  const opcionesUsuario = usuariosEmpresa.map((u) => ({ id: u.id, etiqueta: u.nombre_completo }));
  const opcionesSecuencia = secuenciasProyecto.map((s) => ({ id: s.codigo_secuencia, etiqueta: `${s.prefijo ?? s.codigo_secuencia} (${s.codigo_secuencia})` }));

  const abrirCrearProyecto = () => {
    setProyectoEnEdicionId(null);
    setErrorGeneral("");
    setModalProyectoAbierto(true);
  };
  const abrirEditarProyecto = (id: string) => {
    setProyectoEnEdicionId(id);
    setErrorGeneral("");
    setModalProyectoAbierto(true);
  };

  const abrirCrearHito = (proyecto: ProyectoConRelaciones) => {
    setProyectoParaHito(proyecto);
    setHitoEnEdicionId(null);
    setErrorGeneral("");
  };
  const abrirEditarHito = (proyecto: ProyectoConRelaciones, hitoId: string) => {
    setProyectoParaHito(proyecto);
    setHitoEnEdicionId(hitoId);
    setErrorGeneral("");
  };
  const hitoEnEdicion = hitoEnEdicionId ? hitos.find((h) => h.id === hitoEnEdicionId) ?? null : null;

  const abrirEstadoHito = (hito: HitoConRelaciones) => {
    setHitoParaEstado(hito);
    setEstadoHitoElegido(hito.estado);
    setNotasRechazo(hito.notas_rechazo ?? "");
    setErrorGeneral("");
  };

  const handleGuardarEstadoHito = async () => {
    if (!hitoParaEstado) return;
    setGuardando(true);
    setErrorGeneral("");
    const resultado = await cambiarEstadoHito(hitoParaEstado.id, estadoHitoElegido, notasRechazo || null);
    setGuardando(false);
    if (!resultado.ok) {
      setErrorGeneral(resultado.error);
      return;
    }
    router.refresh();
    setHitoParaEstado(null);
  };

  const handleAgregarCriterio = async () => {
    if (!hitoParaCriterios || !criterioNuevo.trim()) return;
    setGuardando(true);
    setErrorGeneral("");
    const formData = new FormData();
    formData.set("criterio", criterioNuevo.trim());
    const resultado = await crearCriterio(hitoParaCriterios.id, formData);
    setGuardando(false);
    if (!resultado.ok) {
      setErrorGeneral(resultado.error);
      return;
    }
    setCriterioNuevo("");
    router.refresh();
  };

  const handleMarcarCriterio = async (id: string, cumplido: boolean) => {
    setFilaEnProceso(id);
    const resultado = await marcarCriterioCumplido(id, cumplido);
    setFilaEnProceso(null);
    if (!resultado.ok) {
      setErrorGeneral(resultado.error);
      return;
    }
    router.refresh();
  };

  const handleEliminarCriterio = async (id: string) => {
    setFilaEnProceso(id);
    const resultado = await eliminarCriterio(id);
    setFilaEnProceso(null);
    if (!resultado.ok) {
      setErrorGeneral(resultado.error);
      return;
    }
    router.refresh();
  };

  const initialValuesProyecto: ProyectoFormType = {
    contrato_id: proyectoEnEdicion?.contrato_id ?? "",
    nombre_proyecto: proyectoEnEdicion?.nombre_proyecto ?? "",
    descripcion: proyectoEnEdicion?.descripcion ?? "",
    tipo_proyecto: proyectoEnEdicion?.tipo_proyecto ?? "",
    pm_id: proyectoEnEdicion?.pm_id ?? "",
    prioridad: proyectoEnEdicion?.prioridad ?? "",
    codigo_secuencia: "",
    fecha_inicio_planeada: proyectoEnEdicion?.fecha_inicio_planeada ?? "",
    fecha_fin_planeada: proyectoEnEdicion?.fecha_fin_planeada ?? "",
    fecha_inicio_real: proyectoEnEdicion?.fecha_inicio_real ?? "",
    fecha_fin_real: proyectoEnEdicion?.fecha_fin_real ?? "",
    presupuesto_horas_total: proyectoEnEdicion?.presupuesto_horas_total != null ? String(proyectoEnEdicion.presupuesto_horas_total) : "",
    presupuesto_costo_total: proyectoEnEdicion?.presupuesto_costo_total != null ? String(proyectoEnEdicion.presupuesto_costo_total) : "",
    presupuesto_ingreso_total: proyectoEnEdicion?.presupuesto_ingreso_total != null ? String(proyectoEnEdicion.presupuesto_ingreso_total) : "",
    porcentaje_avance: proyectoEnEdicion?.porcentaje_avance != null ? String(proyectoEnEdicion.porcentaje_avance) : "",
  };

  const initialValuesHito: HitoFormType = {
    nombre: hitoEnEdicion?.nombre ?? "",
    descripcion: hitoEnEdicion?.descripcion ?? "",
    fase_orden: hitoEnEdicion ? String(hitoEnEdicion.fase_orden) : "0",
    fecha_planeada_entrega: hitoEnEdicion?.fecha_planeada_entrega ?? "",
    condiciones_aceptacion: hitoEnEdicion?.condiciones_aceptacion ?? "",
    responsable_id: hitoEnEdicion?.responsable_id ?? "",
    porcentaje_facturacion_asociado:
      hitoEnEdicion?.porcentaje_facturacion_asociado != null ? String(hitoEnEdicion.porcentaje_facturacion_asociado) : "",
    valor_hito: hitoEnEdicion?.valor_hito != null ? String(hitoEnEdicion.valor_hito) : "",
    aprobador_cliente_contacto_id: hitoEnEdicion?.aprobador_cliente_contacto_id ?? "",
  };

  const initialValuesTransicion: ProyectoTransicionFormType = { comentario: "" };

  return (
    <div className="flex flex-col gap-4 py-2">
      {puedeCrear && (
        <div className="flex justify-end">
          <Button color="primary" size="sm" onPress={abrirCrearProyecto} isDisabled={contratos.length === 0}>
            Nuevo proyecto
          </Button>
        </div>
      )}
      {puedeCrear && contratos.length === 0 && (
        <p className="text-tiny text-warning-600">Crea primero un contrato en la pestaña Contratos.</p>
      )}

      {errorGeneral && !proyectoParaHito && !hitoParaEstado && !hitoParaCriterios && !transicionSeleccionada && (
        <p className="text-danger text-sm">{errorGeneral}</p>
      )}

      {proyectos.length === 0 ? (
        <p className="text-default-500 text-sm">No hay proyectos registrados todavía.</p>
      ) : (
        <Accordion variant="bordered" selectionMode="multiple">
          {proyectos.map((proyecto) => {
            const hitosDelProyecto = (hitosPorProyecto.get(proyecto.id) ?? []).slice().sort((a, b) => a.fase_orden - b.fase_orden);
            const transicionesDisponibles = transiciones
              .filter((t) => t.estado_origen_id === proyecto.estado_id)
              .map((t) => ({ transicion: t, destino: estados.find((e) => e.id === t.estado_destino_id) ?? null }))
              .filter((t) => t.destino);

            return (
              <AccordionItem
                key={proyecto.id}
                aria-label={proyecto.nombre_proyecto}
                title={
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="font-mono text-tiny text-default-400">{proyecto.numero_proyecto}</span>
                    <span className="font-medium">{proyecto.nombre_proyecto}</span>
                    <Chip size="sm" variant="flat" color={COLOR_ESTADO_PROYECTO[proyecto.estados_ciclo_vida?.codigo_estado ?? ""] ?? "default"}>
                      {proyecto.estados_ciclo_vida?.etiqueta ?? "—"}
                    </Chip>
                    <span className="text-tiny text-default-400">{proyecto.contratos?.numero_contrato ?? "—"}</span>
                    <span className="text-tiny text-default-400">PM: {proyecto.pm?.nombre_completo ?? "—"}</span>
                  </div>
                }
              >
                <div className="flex flex-col gap-3 pb-2">
                  {proyecto.descripcion && <p className="text-default-500 text-sm">{proyecto.descripcion}</p>}
                  <div className="grid md:grid-cols-4 gap-x-6 gap-y-1 text-tiny text-default-500">
                    <span>Inicio planeado: {proyecto.fecha_inicio_planeada}</span>
                    <span>Fin planeado: {proyecto.fecha_fin_planeada}</span>
                    <span>Prioridad: {PRIORIDADES.find((p) => p.id === proyecto.prioridad)?.etiqueta ?? proyecto.prioridad ?? "—"}</span>
                    <span>Avance: {proyecto.porcentaje_avance ?? 0}%</span>
                    <span>Presupuesto ingreso: {formatearMoneda(proyecto.presupuesto_ingreso_total)}</span>
                  </div>

                  {puedeEditar && (
                    <div className="flex gap-2 items-center flex-wrap">
                      <Button size="sm" variant="light" onPress={() => abrirEditarProyecto(proyecto.id)}>
                        Editar proyecto
                      </Button>
                      {transicionesDisponibles.length > 0 &&
                        transicionesDisponibles.map(({ transicion, destino }) => (
                          <Button
                            key={transicion.id}
                            size="sm"
                            variant="flat"
                            onPress={() =>
                              setTransicionSeleccionada({
                                proyectoId: proyecto.id,
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
                      {puedeCrearHito && (
                        <Button size="sm" variant="flat" color="primary" onPress={() => abrirCrearHito(proyecto)}>
                          Agregar hito
                        </Button>
                      )}
                    </div>
                  )}

                  <Table aria-label={`Hitos de ${proyecto.nombre_proyecto}`} removeWrapper={false}>
                    <TableHeader>
                      <TableColumn>N.º</TableColumn>
                      <TableColumn>NOMBRE</TableColumn>
                      <TableColumn>ENTREGA PLANEADA</TableColumn>
                      <TableColumn>RESPONSABLE</TableColumn>
                      <TableColumn>ESTADO</TableColumn>
                      <TableColumn>CRITERIOS</TableColumn>
                      <TableColumn>ACCIONES</TableColumn>
                    </TableHeader>
                    <TableBody emptyContent="Este proyecto todavía no tiene hitos definidos.">
                      {hitosDelProyecto.map((hito) => {
                        const criteriosDelHito = criteriosPorHito.get(hito.id) ?? [];
                        const cumplidos = criteriosDelHito.filter((c) => c.cumplido).length;
                        return (
                          <TableRow key={hito.id}>
                            <TableCell className="font-mono text-tiny">{hito.numero_entregable}</TableCell>
                            <TableCell>{hito.nombre}</TableCell>
                            <TableCell className="text-tiny text-default-500">{hito.fecha_planeada_entrega}</TableCell>
                            <TableCell className="text-tiny text-default-500">{hito.responsable?.nombre_completo ?? "—"}</TableCell>
                            <TableCell>
                              <Chip size="sm" variant="flat" color={COLOR_ESTADO_HITO[hito.estado] ?? "default"}>
                                {ESTADOS_HITO.find((e) => e.id === hito.estado)?.etiqueta ?? hito.estado}
                              </Chip>
                            </TableCell>
                            <TableCell className="text-tiny text-default-500">
                              {criteriosDelHito.length === 0 ? "—" : `${cumplidos}/${criteriosDelHito.length}`}
                            </TableCell>
                            <TableCell>
                              {puedeEditarHito && (
                                <div className="flex gap-2 flex-wrap">
                                  <Button size="sm" variant="light" onPress={() => abrirEditarHito(proyecto, hito.id)}>
                                    Editar
                                  </Button>
                                  <Button size="sm" variant="light" onPress={() => abrirEstadoHito(hito)}>
                                    Estado
                                  </Button>
                                  <Button size="sm" variant="light" onPress={() => setHitoParaCriterios(hito)}>
                                    Criterios
                                  </Button>
                                </div>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </AccordionItem>
            );
          })}
        </Accordion>
      )}

      {/* Modal: crear/editar proyecto */}
      <Modal isOpen={modalProyectoAbierto} onOpenChange={setModalProyectoAbierto} size="3xl" scrollBehavior="inside">
        <ModalContent>
          {(cerrar) => (
            <Formik
              enableReinitialize
              initialValues={initialValuesProyecto}
              validationSchema={ProyectoSchema}
              onSubmit={async (valores) => {
                setGuardando(true);
                setErrorGeneral("");

                const formData = new FormData();
                Object.entries(valores).forEach(([clave, valor]) => {
                  formData.set(clave, valor ?? "");
                });

                const resultado = proyectoEnEdicion
                  ? await actualizarProyecto(proyectoEnEdicion.id, formData)
                  : await crearProyecto(formData);

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
                  <ModalHeader>{proyectoEnEdicion ? "Editar proyecto" : "Nuevo proyecto"}</ModalHeader>
                  <ModalBody className="gap-4">
                    <div className="flex flex-col gap-1">
                      <span className="text-small text-default-600">Contrato</span>
                      <DropdownSelector
                        etiquetaAria="Contrato"
                        opciones={opcionesContrato}
                        valor={values.contrato_id || null}
                        onCambiar={(id) => setFieldValue("contrato_id", id ?? "")}
                      />
                      {!!errors.contrato_id && !!touched.contrato_id && (
                        <span className="text-tiny text-danger">{errors.contrato_id}</span>
                      )}
                    </div>
                    <Input
                      label="Nombre del proyecto"
                      variant="bordered"
                      value={values.nombre_proyecto}
                      onChange={handleChange("nombre_proyecto")}
                      isInvalid={!!errors.nombre_proyecto && !!touched.nombre_proyecto}
                      errorMessage={errors.nombre_proyecto}
                    />
                    <Textarea
                      label="Descripción (opcional)"
                      variant="bordered"
                      value={values.descripcion}
                      onChange={handleChange("descripcion")}
                    />
                    <div className="grid grid-cols-2 gap-4">
                      <Input
                        label="Tipo de proyecto (opcional)"
                        variant="bordered"
                        value={values.tipo_proyecto}
                        onChange={handleChange("tipo_proyecto")}
                      />
                      <div className="flex flex-col gap-1">
                        <span className="text-small text-default-600">Prioridad (opcional)</span>
                        <DropdownSelector
                          etiquetaAria="Prioridad"
                          opciones={PRIORIDADES}
                          valor={values.prioridad || null}
                          onCambiar={(id) => setFieldValue("prioridad", id ?? "")}
                          permitirVacio
                        />
                      </div>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-small text-default-600">PM</span>
                      <DropdownSelector
                        etiquetaAria="PM"
                        opciones={opcionesUsuario}
                        valor={values.pm_id || null}
                        onCambiar={(id) => setFieldValue("pm_id", id ?? "")}
                      />
                      {!!errors.pm_id && !!touched.pm_id && <span className="text-tiny text-danger">{errors.pm_id}</span>}
                    </div>
                    {!proyectoEnEdicion && (
                      <div className="flex flex-col gap-1">
                        <span className="text-small text-default-600">Secuencia de numeración</span>
                        <DropdownSelector
                          etiquetaAria="Secuencia de numeración"
                          opciones={opcionesSecuencia}
                          valor={values.codigo_secuencia || null}
                          onCambiar={(id) => setFieldValue("codigo_secuencia", id ?? "")}
                        />
                        {!!errors.codigo_secuencia && !!touched.codigo_secuencia && (
                          <span className="text-tiny text-danger">{errors.codigo_secuencia}</span>
                        )}
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-4">
                      <Input
                        label="Inicio planeado"
                        type="date"
                        variant="bordered"
                        value={values.fecha_inicio_planeada}
                        onChange={handleChange("fecha_inicio_planeada")}
                        isInvalid={!!errors.fecha_inicio_planeada && !!touched.fecha_inicio_planeada}
                        errorMessage={errors.fecha_inicio_planeada}
                      />
                      <Input
                        label="Fin planeado"
                        type="date"
                        variant="bordered"
                        value={values.fecha_fin_planeada}
                        onChange={handleChange("fecha_fin_planeada")}
                        isInvalid={!!errors.fecha_fin_planeada && !!touched.fecha_fin_planeada}
                        errorMessage={errors.fecha_fin_planeada}
                      />
                    </div>
                    {proyectoEnEdicion && (
                      <div className="grid grid-cols-2 gap-4">
                        <Input
                          label="Inicio real (opcional)"
                          type="date"
                          variant="bordered"
                          value={values.fecha_inicio_real}
                          onChange={handleChange("fecha_inicio_real")}
                        />
                        <Input
                          label="Fin real (opcional)"
                          type="date"
                          variant="bordered"
                          value={values.fecha_fin_real}
                          onChange={handleChange("fecha_fin_real")}
                        />
                      </div>
                    )}
                    <div className="grid grid-cols-3 gap-4">
                      <Input
                        label="Presupuesto horas (opcional)"
                        type="number"
                        variant="bordered"
                        value={values.presupuesto_horas_total}
                        onChange={handleChange("presupuesto_horas_total")}
                      />
                      <Input
                        label="Presupuesto costo (opcional)"
                        type="number"
                        step="0.01"
                        variant="bordered"
                        value={values.presupuesto_costo_total}
                        onChange={handleChange("presupuesto_costo_total")}
                      />
                      <Input
                        label="Presupuesto ingreso (opcional)"
                        type="number"
                        step="0.01"
                        variant="bordered"
                        value={values.presupuesto_ingreso_total}
                        onChange={handleChange("presupuesto_ingreso_total")}
                      />
                    </div>
                    {proyectoEnEdicion && (
                      <Input
                        label="Porcentaje de avance (opcional)"
                        type="number"
                        variant="bordered"
                        value={values.porcentaje_avance}
                        onChange={handleChange("porcentaje_avance")}
                      />
                    )}
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

      {/* Modal: confirmar transición de estado del proyecto */}
      <Modal isOpen={!!transicionSeleccionada} onOpenChange={(abierto) => !abierto && setTransicionSeleccionada(null)}>
        <ModalContent>
          {(cerrar) => (
            <Formik
              initialValues={initialValuesTransicion}
              validationSchema={ProyectoTransicionSchema}
              onSubmit={async (valores, { resetForm }) => {
                if (!transicionSeleccionada) return;
                if (transicionSeleccionada.requiereComentario && !valores.comentario.trim()) {
                  setErrorGeneral("Este cambio de estado requiere un comentario.");
                  return;
                }
                setGuardando(true);
                setErrorGeneral("");

                const resultado = await cambiarEstadoProyecto(
                  transicionSeleccionada.proyectoId,
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

      {/* Modal: crear/editar hito */}
      <Modal isOpen={!!proyectoParaHito} onOpenChange={(abierto) => !abierto && setProyectoParaHito(null)} size="2xl" scrollBehavior="inside">
        <ModalContent>
          {(cerrar) => (
            <Formik
              enableReinitialize
              initialValues={initialValuesHito}
              validationSchema={HitoSchema}
              onSubmit={async (valores, { resetForm }) => {
                if (!proyectoParaHito) return;
                setGuardando(true);
                setErrorGeneral("");

                const formData = new FormData();
                Object.entries(valores).forEach(([clave, valor]) => {
                  formData.set(clave, valor ?? "");
                });

                const resultado = hitoEnEdicion
                  ? await actualizarHito(hitoEnEdicion.id, formData)
                  : await crearHito(proyectoParaHito.id, formData);

                setGuardando(false);

                if (!resultado.ok) {
                  setErrorGeneral(resultado.error);
                  return;
                }

                resetForm();
                router.refresh();
                setProyectoParaHito(null);
                cerrar();
              }}
            >
              {({ values, errors, touched, handleChange, handleSubmit, setFieldValue }) => (
                <>
                  <ModalHeader>
                    {hitoEnEdicion ? "Editar hito" : "Nuevo hito"} — {proyectoParaHito?.nombre_proyecto}
                  </ModalHeader>
                  <ModalBody className="gap-4">
                    <Input
                      label="Nombre"
                      variant="bordered"
                      value={values.nombre}
                      onChange={handleChange("nombre")}
                      isInvalid={!!errors.nombre && !!touched.nombre}
                      errorMessage={errors.nombre}
                    />
                    <Textarea
                      label="Descripción (opcional)"
                      variant="bordered"
                      value={values.descripcion}
                      onChange={handleChange("descripcion")}
                    />
                    <div className="grid grid-cols-2 gap-4">
                      <Input
                        label="Orden dentro del plan de fases"
                        type="number"
                        variant="bordered"
                        value={values.fase_orden}
                        onChange={handleChange("fase_orden")}
                        isInvalid={!!errors.fase_orden && !!touched.fase_orden}
                        errorMessage={errors.fase_orden}
                      />
                      <Input
                        label="Fecha planeada de entrega"
                        type="date"
                        variant="bordered"
                        value={values.fecha_planeada_entrega}
                        onChange={handleChange("fecha_planeada_entrega")}
                        isInvalid={!!errors.fecha_planeada_entrega && !!touched.fecha_planeada_entrega}
                        errorMessage={errors.fecha_planeada_entrega}
                      />
                    </div>
                    <Textarea
                      label="Condiciones de aceptación (opcional)"
                      variant="bordered"
                      value={values.condiciones_aceptacion}
                      onChange={handleChange("condiciones_aceptacion")}
                    />
                    <div className="flex flex-col gap-1">
                      <span className="text-small text-default-600">Responsable</span>
                      <DropdownSelector
                        etiquetaAria="Responsable"
                        opciones={opcionesUsuario}
                        valor={values.responsable_id || null}
                        onCambiar={(id) => setFieldValue("responsable_id", id ?? "")}
                      />
                      {!!errors.responsable_id && !!touched.responsable_id && (
                        <span className="text-tiny text-danger">{errors.responsable_id}</span>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <Input
                        label="% de facturación asociado (opcional)"
                        type="number"
                        variant="bordered"
                        value={values.porcentaje_facturacion_asociado}
                        onChange={handleChange("porcentaje_facturacion_asociado")}
                      />
                      <Input
                        label="Valor del hito (opcional)"
                        type="number"
                        step="0.01"
                        variant="bordered"
                        value={values.valor_hito}
                        onChange={handleChange("valor_hito")}
                      />
                    </div>
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

      {/* Modal: cambiar estado de un hito */}
      <Modal isOpen={!!hitoParaEstado} onOpenChange={(abierto) => !abierto && setHitoParaEstado(null)}>
        <ModalContent>
          {(cerrar) => (
            <>
              <ModalHeader>Cambiar estado — {hitoParaEstado?.nombre}</ModalHeader>
              <ModalBody className="gap-4">
                <div className="flex flex-col gap-1">
                  <span className="text-small text-default-600">Estado</span>
                  <DropdownSelector
                    etiquetaAria="Estado"
                    opciones={ESTADOS_HITO}
                    valor={estadoHitoElegido || null}
                    onCambiar={(id) => setEstadoHitoElegido(id ?? "")}
                  />
                </div>
                {estadoHitoElegido === "RECHAZADO" && (
                  <Textarea
                    label="Motivo del rechazo"
                    variant="bordered"
                    value={notasRechazo}
                    onChange={(e) => setNotasRechazo(e.target.value)}
                  />
                )}
                {errorGeneral && <p className="text-danger text-sm">{errorGeneral}</p>}
              </ModalBody>
              <ModalFooter>
                <Button variant="flat" onPress={cerrar}>
                  Cancelar
                </Button>
                <Button color="primary" isLoading={guardando} onPress={handleGuardarEstadoHito}>
                  Guardar
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>

      {/* Modal: criterios de aceptación de un hito */}
      <Modal isOpen={!!hitoParaCriterios} onOpenChange={(abierto) => !abierto && setHitoParaCriterios(null)} scrollBehavior="inside">
        <ModalContent>
          {(cerrar) => (
            <>
              <ModalHeader>Criterios de aceptación — {hitoParaCriterios?.nombre}</ModalHeader>
              <ModalBody className="gap-4">
                <Table aria-label="Criterios de aceptación" removeWrapper={false}>
                  <TableHeader>
                    <TableColumn>CRITERIO</TableColumn>
                    <TableColumn>CUMPLIDO</TableColumn>
                    <TableColumn>ACCIONES</TableColumn>
                  </TableHeader>
                  <TableBody emptyContent="Este hito todavía no tiene criterios definidos.">
                    {(hitoParaCriterios ? criteriosPorHito.get(hitoParaCriterios.id) ?? [] : []).map((criterio) => (
                      <TableRow key={criterio.id}>
                        <TableCell>{criterio.criterio}</TableCell>
                        <TableCell>
                          <Switch
                            size="sm"
                            isSelected={criterio.cumplido}
                            isDisabled={filaEnProceso === criterio.id}
                            onValueChange={(cumplido) => handleMarcarCriterio(criterio.id, cumplido)}
                          />
                        </TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            variant="light"
                            color="danger"
                            isLoading={filaEnProceso === criterio.id}
                            onPress={() => handleEliminarCriterio(criterio.id)}
                          >
                            Quitar
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <Divider />
                <div className="flex gap-2 items-end">
                  <Input
                    label="Nuevo criterio"
                    variant="bordered"
                    value={criterioNuevo}
                    onChange={(e) => setCriterioNuevo(e.target.value)}
                  />
                  <Button color="primary" isLoading={guardando} onPress={handleAgregarCriterio}>
                    Agregar
                  </Button>
                </div>
                {errorGeneral && <p className="text-danger text-sm">{errorGeneral}</p>}
              </ModalBody>
              <ModalFooter>
                <Button variant="flat" onPress={cerrar}>
                  Cerrar
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </div>
  );
}
