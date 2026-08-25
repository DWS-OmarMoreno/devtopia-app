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
} from "@nextui-org/react";
import { Formik } from "formik";
import type { Tables } from "@/utils/database.types";
import { DropdownSelector } from "@/components/shared/dropdown-selector";
import { PlanSlaSchema, NivelSlaSchema } from "@/helpers/schemas";
import type { PlanSlaFormType, NivelSlaFormType } from "@/helpers/types";
import {
  cambiarEstadoPlanSla,
  crearPlanSla,
  actualizarPlanSla,
  crearNivelSla,
  eliminarNivelSla,
} from "@/app/(app)/productos-servicios/actions";

type PlanSla = Tables<"sla_planes">;
type NivelSla = Tables<"sla_niveles">;

const SEVERIDADES = ["CRITICA", "ALTA", "MEDIA", "BAJA"];

interface Props {
  planesSla: PlanSla[];
  nivelesSla: NivelSla[];
  puedeCrear: boolean;
  puedeEditar: boolean;
}

export function SlaPanel({ planesSla, nivelesSla, puedeCrear, puedeEditar }: Props) {
  const router = useRouter();
  const [modalPlanAbierto, setModalPlanAbierto] = useState(false);
  const [planEnEdicion, setPlanEnEdicion] = useState<PlanSla | null>(null);
  const [planParaNivel, setPlanParaNivel] = useState<PlanSla | null>(null);
  const [filaEnProceso, setFilaEnProceso] = useState<string | null>(null);
  const [errorGeneral, setErrorGeneral] = useState("");
  const [guardando, setGuardando] = useState(false);

  const nivelesPorPlan = useMemo(() => {
    const mapa = new Map<string, NivelSla[]>();
    for (const nivel of nivelesSla) {
      const lista = mapa.get(nivel.sla_plan_id) ?? [];
      lista.push(nivel);
      mapa.set(nivel.sla_plan_id, lista);
    }
    return mapa;
  }, [nivelesSla]);

  const abrirCrearPlan = () => {
    setPlanEnEdicion(null);
    setErrorGeneral("");
    setModalPlanAbierto(true);
  };
  const abrirEditarPlan = (plan: PlanSla) => {
    setPlanEnEdicion(plan);
    setErrorGeneral("");
    setModalPlanAbierto(true);
  };

  const handleEstadoPlan = async (id: string, activo: boolean) => {
    setFilaEnProceso(id);
    const resultado = await cambiarEstadoPlanSla(id, activo);
    setFilaEnProceso(null);
    if (!resultado.ok) {
      setErrorGeneral(resultado.error);
      return;
    }
    router.refresh();
  };

  const handleEliminarNivel = async (id: string) => {
    setFilaEnProceso(id);
    const resultado = await eliminarNivelSla(id);
    setFilaEnProceso(null);
    if (!resultado.ok) {
      setErrorGeneral(resultado.error);
      return;
    }
    router.refresh();
  };

  const initialValuesPlan: PlanSlaFormType = {
    nombre: planEnEdicion?.nombre ?? "",
    descripcion: planEnEdicion?.descripcion ?? "",
  };

  const initialValuesNivel: NivelSlaFormType = {
    severidad: "",
    tiempo_respuesta_horas: "",
    tiempo_resolucion_horas: "",
    horario_cobertura: "",
    penalizacion_incumplimiento: "",
    penalizacion_pct_credito: "",
  };

  const severidadesDisponibles = (planId: string) => {
    const usadas = new Set((nivelesPorPlan.get(planId) ?? []).map((n) => n.severidad));
    return SEVERIDADES.filter((s) => !usadas.has(s)).map((s) => ({ id: s, etiqueta: s }));
  };

  return (
    <div className="flex flex-col gap-4 py-2">
      {puedeCrear && (
        <div className="flex justify-end">
          <Button color="primary" size="sm" onPress={abrirCrearPlan}>
            Nuevo plan SLA
          </Button>
        </div>
      )}

      {errorGeneral && <p className="text-danger text-sm">{errorGeneral}</p>}

      {planesSla.length === 0 ? (
        <p className="text-default-500 text-sm">No hay planes SLA registrados todavía.</p>
      ) : (
        <Accordion variant="bordered" selectionMode="multiple">
          {planesSla.map((plan) => {
            const niveles = nivelesPorPlan.get(plan.id) ?? [];
            return (
              <AccordionItem
                key={plan.id}
                aria-label={plan.nombre}
                title={
                  <div className="flex items-center gap-3">
                    <span className="font-medium">{plan.nombre}</span>
                    <Chip size="sm" color={plan.activo ? "success" : "default"} variant="flat">
                      {plan.activo ? "Activo" : "Inactivo"}
                    </Chip>
                    <span className="text-tiny text-default-400">
                      {niveles.length} nivel{niveles.length === 1 ? "" : "es"}
                    </span>
                  </div>
                }
              >
                <div className="flex flex-col gap-3 pb-2">
                  {plan.descripcion && (
                    <p className="text-default-500 text-sm">{plan.descripcion}</p>
                  )}

                  {puedeEditar && (
                    <div className="flex gap-2 items-center flex-wrap">
                      <Button size="sm" variant="light" onPress={() => abrirEditarPlan(plan)}>
                        Editar plan
                      </Button>
                      <div className="flex items-center gap-2">
                        <span className="text-tiny text-default-500">Activo</span>
                        <Switch
                          size="sm"
                          isSelected={plan.activo}
                          isDisabled={filaEnProceso === plan.id}
                          onValueChange={(activo) => handleEstadoPlan(plan.id, activo)}
                        />
                      </div>
                      {puedeCrear && severidadesDisponibles(plan.id).length > 0 && (
                        <Button
                          size="sm"
                          variant="flat"
                          color="primary"
                          onPress={() => {
                            setPlanParaNivel(plan);
                            setErrorGeneral("");
                          }}
                        >
                          Agregar nivel
                        </Button>
                      )}
                    </div>
                  )}

                  <Table aria-label={`Niveles de ${plan.nombre}`} removeWrapper={false}>
                    <TableHeader>
                      <TableColumn>SEVERIDAD</TableColumn>
                      <TableColumn>T. RESPUESTA (h)</TableColumn>
                      <TableColumn>T. RESOLUCIÓN (h)</TableColumn>
                      <TableColumn>COBERTURA</TableColumn>
                      <TableColumn>CRÉDITO POR INCUMPLIMIENTO</TableColumn>
                      <TableColumn>ACCIONES</TableColumn>
                    </TableHeader>
                    <TableBody emptyContent="Este plan todavía no tiene niveles definidos.">
                      {niveles.map((nivel) => (
                        <TableRow key={nivel.id}>
                          <TableCell>
                            <Chip size="sm" variant="flat">
                              {nivel.severidad}
                            </Chip>
                          </TableCell>
                          <TableCell>{nivel.tiempo_respuesta_horas}</TableCell>
                          <TableCell>{nivel.tiempo_resolucion_horas}</TableCell>
                          <TableCell>{nivel.horario_cobertura}</TableCell>
                          <TableCell>
                            {nivel.penalizacion_pct_credito ? `${nivel.penalizacion_pct_credito}%` : "—"}
                          </TableCell>
                          <TableCell>
                            {puedeEditar && (
                              <Button
                                size="sm"
                                variant="light"
                                color="danger"
                                isLoading={filaEnProceso === nivel.id}
                                onPress={() => handleEliminarNivel(nivel.id)}
                              >
                                Quitar
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </AccordionItem>
            );
          })}
        </Accordion>
      )}

      {/* Modal: crear/editar plan */}
      <Modal isOpen={modalPlanAbierto} onOpenChange={setModalPlanAbierto}>
        <ModalContent>
          {(cerrar) => (
            <Formik
              enableReinitialize
              initialValues={initialValuesPlan}
              validationSchema={PlanSlaSchema}
              onSubmit={async (valores) => {
                setGuardando(true);
                setErrorGeneral("");

                const formData = new FormData();
                formData.set("nombre", valores.nombre);
                formData.set("descripcion", valores.descripcion ?? "");

                const resultado = planEnEdicion
                  ? await actualizarPlanSla(planEnEdicion.id, formData)
                  : await crearPlanSla(formData);

                setGuardando(false);

                if (!resultado.ok) {
                  setErrorGeneral(resultado.error);
                  return;
                }

                router.refresh();
                cerrar();
              }}
            >
              {({ values, errors, touched, handleChange, handleSubmit }) => (
                <>
                  <ModalHeader>{planEnEdicion ? "Editar plan SLA" : "Nuevo plan SLA"}</ModalHeader>
                  <ModalBody className="gap-4">
                    <Input
                      label="Nombre del plan"
                      variant="bordered"
                      value={values.nombre}
                      onChange={handleChange("nombre")}
                      isInvalid={!!errors.nombre && !!touched.nombre}
                      errorMessage={errors.nombre}
                    />
                    <Textarea
                      label="Descripción"
                      variant="bordered"
                      value={values.descripcion}
                      onChange={handleChange("descripcion")}
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

      {/* Modal: agregar nivel a un plan */}
      <Modal isOpen={!!planParaNivel} onOpenChange={(abierto) => !abierto && setPlanParaNivel(null)}>
        <ModalContent>
          {(cerrar) => (
            <Formik
              initialValues={initialValuesNivel}
              validationSchema={NivelSlaSchema}
              onSubmit={async (valores, { resetForm }) => {
                if (!planParaNivel) return;
                setGuardando(true);
                setErrorGeneral("");

                const formData = new FormData();
                formData.set("severidad", valores.severidad);
                formData.set("tiempo_respuesta_horas", valores.tiempo_respuesta_horas);
                formData.set("tiempo_resolucion_horas", valores.tiempo_resolucion_horas);
                formData.set("horario_cobertura", valores.horario_cobertura);
                formData.set("penalizacion_incumplimiento", valores.penalizacion_incumplimiento ?? "");
                formData.set("penalizacion_pct_credito", valores.penalizacion_pct_credito ?? "");

                const resultado = await crearNivelSla(planParaNivel.id, formData);
                setGuardando(false);

                if (!resultado.ok) {
                  setErrorGeneral(resultado.error);
                  return;
                }

                resetForm();
                router.refresh();
                cerrar();
              }}
            >
              {({ values, errors, touched, handleChange, handleSubmit, setFieldValue }) => (
                <>
                  <ModalHeader>Nuevo nivel — {planParaNivel?.nombre}</ModalHeader>
                  <ModalBody className="gap-4">
                    <div className="flex flex-col gap-1">
                      <span className="text-small text-default-600">Severidad</span>
                      <DropdownSelector
                        etiquetaAria="Severidad"
                        opciones={
                          planParaNivel ? severidadesDisponibles(planParaNivel.id) : []
                        }
                        valor={values.severidad || null}
                        onCambiar={(id) => setFieldValue("severidad", id ?? "")}
                      />
                      {!!errors.severidad && !!touched.severidad && (
                        <span className="text-tiny text-danger">{errors.severidad}</span>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <Input
                        label="Tiempo de respuesta (horas)"
                        type="number"
                        step="0.5"
                        variant="bordered"
                        value={values.tiempo_respuesta_horas}
                        onChange={handleChange("tiempo_respuesta_horas")}
                        isInvalid={!!errors.tiempo_respuesta_horas && !!touched.tiempo_respuesta_horas}
                        errorMessage={errors.tiempo_respuesta_horas}
                      />
                      <Input
                        label="Tiempo de resolución (horas)"
                        type="number"
                        step="0.5"
                        variant="bordered"
                        value={values.tiempo_resolucion_horas}
                        onChange={handleChange("tiempo_resolucion_horas")}
                        isInvalid={!!errors.tiempo_resolucion_horas && !!touched.tiempo_resolucion_horas}
                        errorMessage={errors.tiempo_resolucion_horas}
                      />
                    </div>
                    <Input
                      label="Horario de cobertura"
                      placeholder="Ej. 24x7, 8x5"
                      variant="bordered"
                      value={values.horario_cobertura}
                      onChange={handleChange("horario_cobertura")}
                      isInvalid={!!errors.horario_cobertura && !!touched.horario_cobertura}
                      errorMessage={errors.horario_cobertura}
                    />
                    <Textarea
                      label="Penalización por incumplimiento (opcional)"
                      variant="bordered"
                      value={values.penalizacion_incumplimiento}
                      onChange={handleChange("penalizacion_incumplimiento")}
                    />
                    <Input
                      label="% de crédito por incumplimiento (opcional)"
                      type="number"
                      step="0.1"
                      variant="bordered"
                      value={values.penalizacion_pct_credito}
                      onChange={handleChange("penalizacion_pct_credito")}
                      isInvalid={!!errors.penalizacion_pct_credito && !!touched.penalizacion_pct_credito}
                      errorMessage={errors.penalizacion_pct_credito}
                    />
                    {errorGeneral && <p className="text-danger text-sm">{errorGeneral}</p>}
                  </ModalBody>
                  <ModalFooter>
                    <Button variant="flat" onPress={cerrar}>
                      Cerrar
                    </Button>
                    <Button color="primary" isLoading={guardando} onPress={() => handleSubmit()}>
                      Agregar nivel
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
