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
import { AsignacionRecursoSchema } from "@/helpers/schemas";
import type { AsignacionRecursoFormType } from "@/helpers/types";
import {
  crearAsignacionRecurso,
  actualizarAsignacionRecurso,
  crearDisponibilidad,
  actualizarDisponibilidad,
  eliminarDisponibilidad,
} from "@/app/(app)/contratos-proyectos/actions";
import type { ProyectoConRelaciones } from "./proyectos-panel";

export type AsignacionRecursoConRelaciones = Tables<"asignacion_recursos"> & {
  proyectos: { numero_proyecto: string; nombre_proyecto: string } | null;
  recurso: { nombre_completo: string } | null;
  rol_en_proyecto: { nombre_rol: string } | null;
};

export type DisponibilidadRecursoConRelaciones = Tables<"disponibilidad_recursos"> & {
  recurso: { nombre_completo: string } | null;
};

const ESTADOS_ASIGNACION = [
  { id: "PLANEADA", etiqueta: "Planeada" },
  { id: "ACTIVA", etiqueta: "Activa" },
  { id: "FINALIZADA", etiqueta: "Finalizada" },
  { id: "CANCELADA", etiqueta: "Cancelada" },
];

const COLOR_ESTADO_ASIGNACION: Record<string, "default" | "primary" | "secondary" | "success" | "warning" | "danger"> = {
  PLANEADA: "default",
  ACTIVA: "primary",
  FINALIZADA: "success",
  CANCELADA: "danger",
};

interface Props {
  asignaciones: AsignacionRecursoConRelaciones[];
  disponibilidad: DisponibilidadRecursoConRelaciones[];
  proyectos: ProyectoConRelaciones[];
  usuariosEmpresa: { id: string; nombre_completo: string }[];
  catalogoRolesTarifa: Tables<"catalogo_roles_tarifa">[];
  puedeCrear: boolean;
  puedeEditar: boolean;
  puedeEliminar: boolean;
}

export function RecursosPanel({
  asignaciones,
  disponibilidad,
  proyectos,
  usuariosEmpresa,
  catalogoRolesTarifa,
  puedeCrear,
  puedeEditar,
  puedeEliminar,
}: Props) {
  const router = useRouter();

  // --- Asignación de recursos ------------------------------------------------
  const [modalAsignacionAbierto, setModalAsignacionAbierto] = useState(false);
  const [asignacionEnEdicionId, setAsignacionEnEdicionId] = useState<string | null>(null);
  const [errorAsignacion, setErrorAsignacion] = useState("");
  const [guardandoAsignacion, setGuardandoAsignacion] = useState(false);

  const asignacionEnEdicion = asignacionEnEdicionId ? asignaciones.find((a) => a.id === asignacionEnEdicionId) ?? null : null;

  const opcionesProyecto = proyectos.map((p) => ({ id: p.id, etiqueta: `${p.numero_proyecto} — ${p.nombre_proyecto}` }));
  const opcionesRecurso = usuariosEmpresa.map((u) => ({ id: u.id, etiqueta: u.nombre_completo }));
  const opcionesRolTarifa = catalogoRolesTarifa.map((r) => ({ id: r.id, etiqueta: r.nombre_rol }));

  const abrirCrearAsignacion = () => {
    setAsignacionEnEdicionId(null);
    setErrorAsignacion("");
    setModalAsignacionAbierto(true);
  };
  const abrirEditarAsignacion = (id: string) => {
    setAsignacionEnEdicionId(id);
    setErrorAsignacion("");
    setModalAsignacionAbierto(true);
  };

  const initialValuesAsignacion: AsignacionRecursoFormType = {
    proyecto_id: asignacionEnEdicion?.proyecto_id ?? "",
    recurso_id: asignacionEnEdicion?.recurso_id ?? "",
    rol_en_proyecto_id: asignacionEnEdicion?.rol_en_proyecto_id ?? "",
    fecha_inicio_asignacion: asignacionEnEdicion?.fecha_inicio_asignacion ?? "",
    fecha_fin_asignacion: asignacionEnEdicion?.fecha_fin_asignacion ?? "",
    porcentaje_dedicacion: asignacionEnEdicion ? String(asignacionEnEdicion.porcentaje_dedicacion) : "",
    horas_planeadas_totales: asignacionEnEdicion?.horas_planeadas_totales != null ? String(asignacionEnEdicion.horas_planeadas_totales) : "",
    tarifa_costo_hora_aplicable: asignacionEnEdicion?.tarifa_costo_hora_aplicable != null ? String(asignacionEnEdicion.tarifa_costo_hora_aplicable) : "",
    tarifa_venta_hora_aplicable: asignacionEnEdicion?.tarifa_venta_hora_aplicable != null ? String(asignacionEnEdicion.tarifa_venta_hora_aplicable) : "",
    estado_asignacion: asignacionEnEdicion?.estado_asignacion ?? "PLANEADA",
    notas: asignacionEnEdicion?.notas ?? "",
  };

  // --- Disponibilidad de recursos ---------------------------------------------
  const [modalDisponibilidadAbierto, setModalDisponibilidadAbierto] = useState(false);
  const [disponibilidadEnEdicion, setDisponibilidadEnEdicion] = useState<DisponibilidadRecursoConRelaciones | null>(null);
  const [recursoNuevo, setRecursoNuevo] = useState("");
  const [fechaNueva, setFechaNueva] = useState("");
  const [horasDisponibles, setHorasDisponibles] = useState("8");
  const [filaEnProceso, setFilaEnProceso] = useState<string | null>(null);
  const [errorDisponibilidad, setErrorDisponibilidad] = useState("");
  const [guardandoDisponibilidad, setGuardandoDisponibilidad] = useState(false);

  const abrirCrearDisponibilidad = () => {
    setDisponibilidadEnEdicion(null);
    setRecursoNuevo("");
    setFechaNueva("");
    setHorasDisponibles("8");
    setErrorDisponibilidad("");
    setModalDisponibilidadAbierto(true);
  };
  const abrirEditarDisponibilidad = (fila: DisponibilidadRecursoConRelaciones) => {
    setDisponibilidadEnEdicion(fila);
    setHorasDisponibles(String(fila.horas_disponibles));
    setErrorDisponibilidad("");
    setModalDisponibilidadAbierto(true);
  };

  const handleGuardarDisponibilidad = async () => {
    setGuardandoDisponibilidad(true);
    setErrorDisponibilidad("");

    if (disponibilidadEnEdicion) {
      const resultado = await actualizarDisponibilidad(disponibilidadEnEdicion.id, Number(horasDisponibles));
      setGuardandoDisponibilidad(false);
      if (!resultado.ok) {
        setErrorDisponibilidad(resultado.error);
        return;
      }
    } else {
      const formData = new FormData();
      formData.set("recurso_id", recursoNuevo);
      formData.set("fecha", fechaNueva);
      formData.set("horas_disponibles", horasDisponibles);
      const resultado = await crearDisponibilidad(formData);
      setGuardandoDisponibilidad(false);
      if (!resultado.ok) {
        setErrorDisponibilidad(resultado.error);
        return;
      }
    }

    router.refresh();
    setModalDisponibilidadAbierto(false);
  };

  const handleEliminarDisponibilidad = async (id: string) => {
    setFilaEnProceso(id);
    const resultado = await eliminarDisponibilidad(id);
    setFilaEnProceso(null);
    if (!resultado.ok) {
      setErrorDisponibilidad(resultado.error);
      return;
    }
    router.refresh();
  };

  return (
    <div className="flex flex-col gap-4 py-2">
      <Tabs aria-label="Recursos" variant="underlined" size="sm">
        <Tab key="asignacion" title="Asignación de recursos">
          <div className="flex flex-col gap-4 py-2">
            {puedeCrear && (
              <div className="flex justify-end">
                <Button color="primary" size="sm" onPress={abrirCrearAsignacion} isDisabled={proyectos.length === 0}>
                  Nueva asignación
                </Button>
              </div>
            )}
            {errorAsignacion && <p className="text-danger text-sm">{errorAsignacion}</p>}

            {asignaciones.length === 0 ? (
              <p className="text-default-500 text-sm">No hay asignaciones de recursos registradas todavía.</p>
            ) : (
              <Table aria-label="Asignación de recursos" removeWrapper={false}>
                <TableHeader>
                  <TableColumn>PROYECTO</TableColumn>
                  <TableColumn>RECURSO</TableColumn>
                  <TableColumn>ROL</TableColumn>
                  <TableColumn>INICIO</TableColumn>
                  <TableColumn>FIN</TableColumn>
                  <TableColumn>% DEDICACIÓN</TableColumn>
                  <TableColumn>ESTADO</TableColumn>
                  <TableColumn>ACCIONES</TableColumn>
                </TableHeader>
                <TableBody>
                  {asignaciones.map((asignacion) => (
                    <TableRow key={asignacion.id}>
                      <TableCell className="text-tiny">{asignacion.proyectos?.numero_proyecto ?? "—"}</TableCell>
                      <TableCell className="text-tiny text-default-500">{asignacion.recurso?.nombre_completo ?? "—"}</TableCell>
                      <TableCell className="text-tiny text-default-500">{asignacion.rol_en_proyecto?.nombre_rol ?? "—"}</TableCell>
                      <TableCell className="text-tiny">{asignacion.fecha_inicio_asignacion}</TableCell>
                      <TableCell className="text-tiny">{asignacion.fecha_fin_asignacion ?? "—"}</TableCell>
                      <TableCell>{asignacion.porcentaje_dedicacion}%</TableCell>
                      <TableCell>
                        <Chip size="sm" variant="flat" color={COLOR_ESTADO_ASIGNACION[asignacion.estado_asignacion] ?? "default"}>
                          {ESTADOS_ASIGNACION.find((e) => e.id === asignacion.estado_asignacion)?.etiqueta ?? asignacion.estado_asignacion}
                        </Chip>
                      </TableCell>
                      <TableCell>
                        {puedeEditar && (
                          <Button size="sm" variant="light" onPress={() => abrirEditarAsignacion(asignacion.id)}>
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

        <Tab key="disponibilidad" title="Disponibilidad de recursos">
          <div className="flex flex-col gap-4 py-2">
            {puedeCrear && (
              <div className="flex justify-end">
                <Button color="primary" size="sm" onPress={abrirCrearDisponibilidad}>
                  Nueva disponibilidad
                </Button>
              </div>
            )}
            {errorDisponibilidad && <p className="text-danger text-sm">{errorDisponibilidad}</p>}

            {disponibilidad.length === 0 ? (
              <p className="text-default-500 text-sm">No hay disponibilidad registrada todavía.</p>
            ) : (
              <Table aria-label="Disponibilidad de recursos" removeWrapper={false}>
                <TableHeader>
                  <TableColumn>RECURSO</TableColumn>
                  <TableColumn>FECHA</TableColumn>
                  <TableColumn>HORAS DISPONIBLES</TableColumn>
                  <TableColumn>ACCIONES</TableColumn>
                </TableHeader>
                <TableBody>
                  {disponibilidad.map((fila) => (
                    <TableRow key={fila.id}>
                      <TableCell className="text-tiny text-default-500">{fila.recurso?.nombre_completo ?? "—"}</TableCell>
                      <TableCell className="text-tiny">{fila.fecha}</TableCell>
                      <TableCell>{fila.horas_disponibles}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          {puedeEditar && (
                            <Button size="sm" variant="light" onPress={() => abrirEditarDisponibilidad(fila)}>
                              Editar
                            </Button>
                          )}
                          {puedeEliminar && (
                            <Button
                              size="sm"
                              variant="light"
                              color="danger"
                              isLoading={filaEnProceso === fila.id}
                              onPress={() => handleEliminarDisponibilidad(fila.id)}
                            >
                              Eliminar
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </Tab>
      </Tabs>

      {/* Modal: crear/editar asignación */}
      <Modal isOpen={modalAsignacionAbierto} onOpenChange={setModalAsignacionAbierto} size="2xl" scrollBehavior="inside">
        <ModalContent>
          {(cerrar) => (
            <Formik
              enableReinitialize
              initialValues={initialValuesAsignacion}
              validationSchema={AsignacionRecursoSchema}
              onSubmit={async (valores) => {
                setGuardandoAsignacion(true);
                setErrorAsignacion("");

                const formData = new FormData();
                Object.entries(valores).forEach(([clave, valor]) => {
                  formData.set(clave, valor ?? "");
                });

                const resultado = asignacionEnEdicion
                  ? await actualizarAsignacionRecurso(asignacionEnEdicion.id, formData)
                  : await crearAsignacionRecurso(formData);

                setGuardandoAsignacion(false);

                if (!resultado.ok) {
                  setErrorAsignacion(resultado.error);
                  return;
                }

                router.refresh();
                cerrar();
              }}
            >
              {({ values, errors, touched, handleChange, handleSubmit, setFieldValue }) => (
                <>
                  <ModalHeader>{asignacionEnEdicion ? "Editar asignación" : "Nueva asignación"}</ModalHeader>
                  <ModalBody className="gap-4">
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
                    <div className="flex flex-col gap-1">
                      <span className="text-small text-default-600">Rol en el proyecto (opcional)</span>
                      <DropdownSelector
                        etiquetaAria="Rol en el proyecto"
                        opciones={opcionesRolTarifa}
                        valor={values.rol_en_proyecto_id || null}
                        onCambiar={(id) => setFieldValue("rol_en_proyecto_id", id ?? "")}
                        permitirVacio
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <Input
                        label="Inicio de la asignación"
                        type="date"
                        variant="bordered"
                        value={values.fecha_inicio_asignacion}
                        onChange={handleChange("fecha_inicio_asignacion")}
                        isInvalid={!!errors.fecha_inicio_asignacion && !!touched.fecha_inicio_asignacion}
                        errorMessage={errors.fecha_inicio_asignacion}
                      />
                      <Input
                        label="Fin de la asignación (opcional)"
                        type="date"
                        variant="bordered"
                        value={values.fecha_fin_asignacion}
                        onChange={handleChange("fecha_fin_asignacion")}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <Input
                        label="% de dedicación"
                        type="number"
                        variant="bordered"
                        value={values.porcentaje_dedicacion}
                        onChange={handleChange("porcentaje_dedicacion")}
                        isInvalid={!!errors.porcentaje_dedicacion && !!touched.porcentaje_dedicacion}
                        errorMessage={errors.porcentaje_dedicacion}
                      />
                      <Input
                        label="Horas planeadas totales (opcional)"
                        type="number"
                        variant="bordered"
                        value={values.horas_planeadas_totales}
                        onChange={handleChange("horas_planeadas_totales")}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <Input
                        label="Tarifa costo/hora (opcional)"
                        type="number"
                        step="0.01"
                        variant="bordered"
                        value={values.tarifa_costo_hora_aplicable}
                        onChange={handleChange("tarifa_costo_hora_aplicable")}
                      />
                      <Input
                        label="Tarifa venta/hora (opcional)"
                        type="number"
                        step="0.01"
                        variant="bordered"
                        value={values.tarifa_venta_hora_aplicable}
                        onChange={handleChange("tarifa_venta_hora_aplicable")}
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-small text-default-600">Estado de la asignación</span>
                      <DropdownSelector
                        etiquetaAria="Estado de la asignación"
                        opciones={ESTADOS_ASIGNACION}
                        valor={values.estado_asignacion || null}
                        onCambiar={(id) => setFieldValue("estado_asignacion", id ?? "PLANEADA")}
                      />
                    </div>
                    <Textarea
                      label="Notas (opcional)"
                      variant="bordered"
                      value={values.notas}
                      onChange={handleChange("notas")}
                    />
                    {errorAsignacion && <p className="text-danger text-sm">{errorAsignacion}</p>}
                  </ModalBody>
                  <ModalFooter>
                    <Button variant="flat" onPress={cerrar}>
                      Cerrar
                    </Button>
                    <Button color="primary" isLoading={guardandoAsignacion} onPress={() => handleSubmit()}>
                      Guardar
                    </Button>
                  </ModalFooter>
                </>
              )}
            </Formik>
          )}
        </ModalContent>
      </Modal>

      {/* Modal: crear/editar disponibilidad */}
      <Modal isOpen={modalDisponibilidadAbierto} onOpenChange={setModalDisponibilidadAbierto}>
        <ModalContent>
          {(cerrar) => (
            <>
              <ModalHeader>{disponibilidadEnEdicion ? "Editar disponibilidad" : "Nueva disponibilidad"}</ModalHeader>
              <ModalBody className="gap-4">
                {!disponibilidadEnEdicion && (
                  <>
                    <div className="flex flex-col gap-1">
                      <span className="text-small text-default-600">Recurso</span>
                      <DropdownSelector
                        etiquetaAria="Recurso"
                        opciones={opcionesRecurso}
                        valor={recursoNuevo || null}
                        onCambiar={(id) => setRecursoNuevo(id ?? "")}
                      />
                    </div>
                    <Input
                      label="Fecha"
                      type="date"
                      variant="bordered"
                      value={fechaNueva}
                      onChange={(e) => setFechaNueva(e.target.value)}
                    />
                  </>
                )}
                <Input
                  label="Horas disponibles"
                  type="number"
                  variant="bordered"
                  value={horasDisponibles}
                  onChange={(e) => setHorasDisponibles(e.target.value)}
                />
                {errorDisponibilidad && <p className="text-danger text-sm">{errorDisponibilidad}</p>}
              </ModalBody>
              <ModalFooter>
                <Button variant="flat" onPress={cerrar}>
                  Cerrar
                </Button>
                <Button color="primary" isLoading={guardandoDisponibilidad} onPress={handleGuardarDisponibilidad}>
                  Guardar
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </div>
  );
}
