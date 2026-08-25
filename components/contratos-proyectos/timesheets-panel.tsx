"use client";

import { useState } from "react";
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
} from "@nextui-org/react";
import { Formik } from "formik";
import type { Tables } from "@/utils/database.types";
import { DropdownSelector } from "@/components/shared/dropdown-selector";
import { TimesheetSchema } from "@/helpers/schemas";
import type { TimesheetFormType } from "@/helpers/types";
import { crearTimesheet, actualizarTimesheet, enviarTimesheet, resolverTimesheet } from "@/app/(app)/contratos-proyectos/actions";
import type { ProyectoConRelaciones } from "./proyectos-panel";

export type TimesheetConRelaciones = Tables<"timesheets"> & {
  proyectos: { numero_proyecto: string; nombre_proyecto: string } | null;
  recurso: { nombre_completo: string } | null;
  rol_tarifa: { nombre_rol: string } | null;
};

type HitoConRelaciones = Tables<"hitos_entregables"> & { responsable: { nombre_completo: string } | null };

const ESTADOS_TIMESHEET_EDITABLES = ["BORRADOR", "RECHAZADO"];

const TIPOS_HORA = [
  { id: "FACTURABLE", etiqueta: "Facturable" },
  { id: "NO_FACTURABLE", etiqueta: "No facturable" },
];

const COLOR_ESTADO_TIMESHEET: Record<string, "default" | "primary" | "secondary" | "success" | "warning" | "danger"> = {
  BORRADOR: "default",
  ENVIADO: "warning",
  APROBADO: "success",
  RECHAZADO: "danger",
};

interface Props {
  timesheets: TimesheetConRelaciones[];
  proyectos: ProyectoConRelaciones[];
  hitos: HitoConRelaciones[];
  usuariosEmpresa: { id: string; nombre_completo: string }[];
  catalogoRolesTarifa: Tables<"catalogo_roles_tarifa">[];
  categoriasNoFacturables: Tables<"catalogos_valores">[];
  puedeCrear: boolean;
  puedeEditar: boolean;
  puedeAprobar: boolean;
}

export function TimesheetsPanel({
  timesheets,
  proyectos,
  hitos,
  usuariosEmpresa,
  catalogoRolesTarifa,
  categoriasNoFacturables,
  puedeCrear,
  puedeEditar,
  puedeAprobar,
}: Props) {
  const router = useRouter();
  const [modalAbierto, setModalAbierto] = useState(false);
  const [timesheetEnEdicionId, setTimesheetEnEdicionId] = useState<string | null>(null);
  const [timesheetParaResolver, setTimesheetParaResolver] = useState<TimesheetConRelaciones | null>(null);
  const [decisionResolver, setDecisionResolver] = useState<"APROBADO" | "RECHAZADO">("APROBADO");
  const [comentarioResolver, setComentarioResolver] = useState("");
  const [filaEnProceso, setFilaEnProceso] = useState<string | null>(null);
  const [errorGeneral, setErrorGeneral] = useState("");
  const [guardando, setGuardando] = useState(false);

  const timesheetEnEdicion = timesheetEnEdicionId ? timesheets.find((t) => t.id === timesheetEnEdicionId) ?? null : null;

  const opcionesProyecto = proyectos.map((p) => ({ id: p.id, etiqueta: `${p.numero_proyecto} — ${p.nombre_proyecto}` }));
  const opcionesRecurso = usuariosEmpresa.map((u) => ({ id: u.id, etiqueta: u.nombre_completo }));
  const opcionesRolTarifa = catalogoRolesTarifa.map((r) => ({ id: r.id, etiqueta: r.nombre_rol }));
  const opcionesCategoriaNoFacturable = categoriasNoFacturables.map((c) => ({ id: c.id, etiqueta: c.etiqueta }));

  const abrirCrear = () => {
    setTimesheetEnEdicionId(null);
    setErrorGeneral("");
    setModalAbierto(true);
  };
  const abrirEditar = (id: string) => {
    setTimesheetEnEdicionId(id);
    setErrorGeneral("");
    setModalAbierto(true);
  };

  const handleEnviar = async (id: string) => {
    setFilaEnProceso(id);
    setErrorGeneral("");
    const resultado = await enviarTimesheet(id);
    setFilaEnProceso(null);
    if (!resultado.ok) {
      setErrorGeneral(resultado.error);
      return;
    }
    router.refresh();
  };

  const abrirResolver = (timesheet: TimesheetConRelaciones) => {
    setTimesheetParaResolver(timesheet);
    setDecisionResolver("APROBADO");
    setComentarioResolver("");
    setErrorGeneral("");
  };

  const handleResolver = async () => {
    if (!timesheetParaResolver) return;
    if (decisionResolver === "RECHAZADO" && !comentarioResolver.trim()) {
      setErrorGeneral("Debes indicar el motivo del rechazo.");
      return;
    }
    setGuardando(true);
    setErrorGeneral("");
    const resultado = await resolverTimesheet(timesheetParaResolver.id, decisionResolver, comentarioResolver || null);
    setGuardando(false);
    if (!resultado.ok) {
      setErrorGeneral(resultado.error);
      return;
    }
    router.refresh();
    setTimesheetParaResolver(null);
  };

  const initialValues: TimesheetFormType = {
    proyecto_id: timesheetEnEdicion?.proyecto_id ?? "",
    hito_id: timesheetEnEdicion?.hito_id ?? "",
    recurso_id: timesheetEnEdicion?.recurso_id ?? "",
    fecha: timesheetEnEdicion?.fecha ?? "",
    horas_registradas: timesheetEnEdicion ? String(timesheetEnEdicion.horas_registradas) : "",
    tipo_hora: timesheetEnEdicion?.tipo_hora ?? "FACTURABLE",
    categoria_no_facturable_id: timesheetEnEdicion?.categoria_no_facturable_id ?? "",
    rol_tarifa_id: timesheetEnEdicion?.rol_tarifa_id ?? "",
    descripcion_actividad: timesheetEnEdicion?.descripcion_actividad ?? "",
    ubicacion_trabajo: timesheetEnEdicion?.ubicacion_trabajo ?? "",
  };

  return (
    <div className="flex flex-col gap-4 py-2">
      {puedeCrear && (
        <div className="flex justify-end">
          <Button color="primary" size="sm" onPress={abrirCrear} isDisabled={proyectos.length === 0}>
            Nuevo registro de horas
          </Button>
        </div>
      )}

      {errorGeneral && !timesheetParaResolver && <p className="text-danger text-sm">{errorGeneral}</p>}

      {timesheets.length === 0 ? (
        <p className="text-default-500 text-sm">No hay registros de horas todavía.</p>
      ) : (
        <Table aria-label="Timesheets" removeWrapper={false}>
          <TableHeader>
            <TableColumn>FECHA</TableColumn>
            <TableColumn>PROYECTO</TableColumn>
            <TableColumn>RECURSO</TableColumn>
            <TableColumn>HORAS</TableColumn>
            <TableColumn>TIPO</TableColumn>
            <TableColumn>ESTADO</TableColumn>
            <TableColumn>ACCIONES</TableColumn>
          </TableHeader>
          <TableBody>
            {timesheets.map((timesheet) => {
              const editable = ESTADOS_TIMESHEET_EDITABLES.includes(timesheet.estado_aprobacion);
              return (
                <TableRow key={timesheet.id}>
                  <TableCell className="text-tiny">{timesheet.fecha}</TableCell>
                  <TableCell className="text-tiny">{timesheet.proyectos?.numero_proyecto ?? "—"}</TableCell>
                  <TableCell className="text-tiny text-default-500">{timesheet.recurso?.nombre_completo ?? "—"}</TableCell>
                  <TableCell>{timesheet.horas_registradas}</TableCell>
                  <TableCell className="text-tiny">
                    {TIPOS_HORA.find((t) => t.id === timesheet.tipo_hora)?.etiqueta ?? timesheet.tipo_hora}
                  </TableCell>
                  <TableCell>
                    <Chip size="sm" variant="flat" color={COLOR_ESTADO_TIMESHEET[timesheet.estado_aprobacion] ?? "default"}>
                      {timesheet.estado_aprobacion}
                    </Chip>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2 flex-wrap">
                      {puedeEditar && editable && (
                        <Button size="sm" variant="light" onPress={() => abrirEditar(timesheet.id)}>
                          Editar
                        </Button>
                      )}
                      {puedeEditar && editable && (
                        <Button
                          size="sm"
                          variant="flat"
                          color="primary"
                          isLoading={filaEnProceso === timesheet.id}
                          onPress={() => handleEnviar(timesheet.id)}
                        >
                          Enviar
                        </Button>
                      )}
                      {puedeAprobar && timesheet.estado_aprobacion === "ENVIADO" && (
                        <Button size="sm" variant="flat" onPress={() => abrirResolver(timesheet)}>
                          Resolver
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}

      {/* Modal: crear/editar timesheet */}
      <Modal isOpen={modalAbierto} onOpenChange={setModalAbierto} size="2xl" scrollBehavior="inside">
        <ModalContent>
          {(cerrar) => (
            <Formik
              enableReinitialize
              initialValues={initialValues}
              validationSchema={TimesheetSchema}
              onSubmit={async (valores) => {
                setGuardando(true);
                setErrorGeneral("");

                const formData = new FormData();
                Object.entries(valores).forEach(([clave, valor]) => {
                  formData.set(clave, valor ?? "");
                });

                const resultado = timesheetEnEdicion
                  ? await actualizarTimesheet(timesheetEnEdicion.id, formData)
                  : await crearTimesheet(formData);

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
                const hitosDelProyecto = hitos.filter((h) => h.proyecto_id === values.proyecto_id);
                const opcionesHito = hitosDelProyecto.map((h) => ({ id: h.id, etiqueta: h.nombre }));
                return (
                  <>
                    <ModalHeader>{timesheetEnEdicion ? "Editar registro de horas" : "Nuevo registro de horas"}</ModalHeader>
                    <ModalBody className="gap-4">
                      <div className="flex flex-col gap-1">
                        <span className="text-small text-default-600">Proyecto</span>
                        <DropdownSelector
                          etiquetaAria="Proyecto"
                          opciones={opcionesProyecto}
                          valor={values.proyecto_id || null}
                          onCambiar={(id) => {
                            setFieldValue("proyecto_id", id ?? "");
                            setFieldValue("hito_id", "");
                          }}
                        />
                        {!!errors.proyecto_id && !!touched.proyecto_id && (
                          <span className="text-tiny text-danger">{errors.proyecto_id}</span>
                        )}
                      </div>
                      <div className="flex flex-col gap-1">
                        <span className="text-small text-default-600">Hito (opcional)</span>
                        <DropdownSelector
                          etiquetaAria="Hito"
                          opciones={opcionesHito}
                          valor={values.hito_id || null}
                          onCambiar={(id) => setFieldValue("hito_id", id ?? "")}
                          permitirVacio
                          isDisabled={!values.proyecto_id}
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <span className="text-small text-default-600">Recurso</span>
                        <DropdownSelector
                          etiquetaAria="Recurso"
                          opciones={opcionesRecurso}
                          valor={values.recurso_id || null}
                          onCambiar={(id) => setFieldValue("recurso_id", id ?? "")}
                        />
                        {!!errors.recurso_id && !!touched.recurso_id && (
                          <span className="text-tiny text-danger">{errors.recurso_id}</span>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <Input
                          label="Fecha"
                          type="date"
                          variant="bordered"
                          value={values.fecha}
                          onChange={handleChange("fecha")}
                          isInvalid={!!errors.fecha && !!touched.fecha}
                          errorMessage={errors.fecha}
                        />
                        <Input
                          label="Horas registradas"
                          type="number"
                          step="0.25"
                          variant="bordered"
                          value={values.horas_registradas}
                          onChange={handleChange("horas_registradas")}
                          isInvalid={!!errors.horas_registradas && !!touched.horas_registradas}
                          errorMessage={errors.horas_registradas}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="flex flex-col gap-1">
                          <span className="text-small text-default-600">Tipo de hora</span>
                          <DropdownSelector
                            etiquetaAria="Tipo de hora"
                            opciones={TIPOS_HORA}
                            valor={values.tipo_hora || null}
                            onCambiar={(id) => setFieldValue("tipo_hora", id ?? "")}
                          />
                        </div>
                        {values.tipo_hora === "NO_FACTURABLE" && (
                          <div className="flex flex-col gap-1">
                            <span className="text-small text-default-600">Categoría</span>
                            <DropdownSelector
                              etiquetaAria="Categoría de hora no facturable"
                              opciones={opcionesCategoriaNoFacturable}
                              valor={values.categoria_no_facturable_id || null}
                              onCambiar={(id) => setFieldValue("categoria_no_facturable_id", id ?? "")}
                            />
                            {!!errors.categoria_no_facturable_id && (
                              <span className="text-tiny text-danger">{errors.categoria_no_facturable_id}</span>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col gap-1">
                        <span className="text-small text-default-600">Rol de tarifa (opcional)</span>
                        <DropdownSelector
                          etiquetaAria="Rol de tarifa"
                          opciones={opcionesRolTarifa}
                          valor={values.rol_tarifa_id || null}
                          onCambiar={(id) => setFieldValue("rol_tarifa_id", id ?? "")}
                          permitirVacio
                        />
                      </div>
                      <Textarea
                        label="Descripción de la actividad"
                        variant="bordered"
                        value={values.descripcion_actividad}
                        onChange={handleChange("descripcion_actividad")}
                        isInvalid={!!errors.descripcion_actividad && !!touched.descripcion_actividad}
                        errorMessage={errors.descripcion_actividad}
                      />
                      <Input
                        label="Ubicación de trabajo (opcional)"
                        variant="bordered"
                        value={values.ubicacion_trabajo}
                        onChange={handleChange("ubicacion_trabajo")}
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
                );
              }}
            </Formik>
          )}
        </ModalContent>
      </Modal>

      {/* Modal: resolver (aprobar/rechazar) un timesheet enviado */}
      <Modal isOpen={!!timesheetParaResolver} onOpenChange={(abierto) => !abierto && setTimesheetParaResolver(null)}>
        <ModalContent>
          {(cerrar) => (
            <>
              <ModalHeader>Resolver registro de horas</ModalHeader>
              <ModalBody className="gap-4">
                <div className="flex flex-col gap-1">
                  <span className="text-small text-default-600">Decisión</span>
                  <DropdownSelector
                    etiquetaAria="Decisión"
                    opciones={[
                      { id: "APROBADO", etiqueta: "Aprobar" },
                      { id: "RECHAZADO", etiqueta: "Rechazar" },
                    ]}
                    valor={decisionResolver}
                    onCambiar={(id) => setDecisionResolver((id as "APROBADO" | "RECHAZADO") ?? "APROBADO")}
                  />
                </div>
                <Textarea
                  label={decisionResolver === "RECHAZADO" ? "Motivo del rechazo (obligatorio)" : "Comentario (opcional)"}
                  variant="bordered"
                  value={comentarioResolver}
                  onChange={(e) => setComentarioResolver(e.target.value)}
                />
                {errorGeneral && <p className="text-danger text-sm">{errorGeneral}</p>}
              </ModalBody>
              <ModalFooter>
                <Button variant="flat" onPress={cerrar}>
                  Cancelar
                </Button>
                <Button color="primary" isLoading={guardando} onPress={handleResolver}>
                  Confirmar
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </div>
  );
}
