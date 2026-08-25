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
  Switch,
  Button,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Input,
  Textarea,
  Checkbox,
  Divider,
  Progress,
} from "@nextui-org/react";
import { Formik } from "formik";
import type { Tables } from "@/utils/database.types";
import { DropdownSelector } from "@/components/shared/dropdown-selector";
import {
  PlantillaChecklistSchema,
  ItemPlantillaChecklistSchema,
  IniciarChecklistSchema,
  ItemChecklistSchema,
} from "@/helpers/schemas";
import type {
  PlantillaChecklistFormType,
  ItemPlantillaChecklistFormType,
  IniciarChecklistFormType,
  ItemChecklistFormType,
} from "@/helpers/types";
import {
  crearPlantillaChecklist,
  actualizarPlantillaChecklist,
  cambiarEstadoPlantillaChecklist,
  crearItemPlantilla,
  actualizarItemPlantilla,
  eliminarItemPlantilla,
  iniciarChecklistProyecto,
  marcarItemChecklist,
  TIPOS_VERIFICACION_ITEM,
} from "@/app/(app)/cierre-postventa/actions";

const ETIQUETAS_TIPO_VERIFICACION: Record<string, string> = {
  ENTREGABLE_ACEPTADO: "Entregable aceptado",
  FIRMA_CLIENTE: "Firma del cliente",
  RECURSOS_LIBERADOS: "Recursos liberados",
  FACTURACION_COMPLETA: "Facturación completa",
  ACTIVOS_DEVUELTOS: "Activos devueltos",
  DOCUMENTACION_ENTREGADA: "Documentación entregada",
  OTRO: "Otro",
};

const OPCIONES_TIPO_VERIFICACION = TIPOS_VERIFICACION_ITEM.map((t) => ({ id: t, etiqueta: ETIQUETAS_TIPO_VERIFICACION[t] ?? t }));

interface Props {
  proyectos: { id: string; numero_proyecto: string; nombre_proyecto: string }[];
  usuarios: { id: string; nombre_completo: string }[];
  plantillas: Tables<"checklist_liquidacion_plantillas">[];
  plantillaItems: Tables<"checklist_liquidacion_plantilla_items">[];
  checklistsProyecto: Tables<"checklist_liquidacion_proyecto">[];
  checklistItems: Tables<"checklist_liquidacion_items">[];
  puedeCrear: boolean;
  puedeEditar: boolean;
  puedeEliminar: boolean;
}

export function ChecklistPanel({
  proyectos,
  usuarios,
  plantillas,
  plantillaItems,
  checklistsProyecto,
  checklistItems,
  puedeCrear,
  puedeEditar,
  puedeEliminar,
}: Props) {
  const router = useRouter();
  const [errorGeneral, setErrorGeneral] = useState("");
  const [guardando, setGuardando] = useState(false);

  // Plantillas
  const [modalPlantillaAbierto, setModalPlantillaAbierto] = useState(false);
  const [plantillaEnEdicionId, setPlantillaEnEdicionId] = useState<string | null>(null);
  const [plantillaDetalleId, setPlantillaDetalleId] = useState<string | null>(null);
  const [modalItemAbierto, setModalItemAbierto] = useState(false);
  const [itemEnEdicionId, setItemEnEdicionId] = useState<string | null>(null);

  // Checklists por proyecto
  const [modalIniciarAbierto, setModalIniciarAbierto] = useState(false);
  const [checklistDetalleId, setChecklistDetalleId] = useState<string | null>(null);
  const [itemChecklistEnEdicionId, setItemChecklistEnEdicionId] = useState<string | null>(null);
  const [modalItemChecklistAbierto, setModalItemChecklistAbierto] = useState(false);

  const opcionesProyecto = proyectos.map((p) => ({ id: p.id, etiqueta: `${p.numero_proyecto} — ${p.nombre_proyecto}` }));
  const opcionesUsuario = usuarios.map((u) => ({ id: u.id, etiqueta: u.nombre_completo }));
  const opcionesPlantillaActiva = plantillas.filter((p) => p.activo).map((p) => ({ id: p.id, etiqueta: p.nombre }));

  const plantillaEnEdicion = plantillaEnEdicionId ? plantillas.find((p) => p.id === plantillaEnEdicionId) ?? null : null;
  const plantillaDetalle = plantillaDetalleId ? plantillas.find((p) => p.id === plantillaDetalleId) ?? null : null;
  const itemsDeLaPlantillaDetalle = useMemo(
    () => (plantillaDetalle ? plantillaItems.filter((i) => i.plantilla_id === plantillaDetalle.id).sort((a, b) => a.orden - b.orden) : []),
    [plantillaItems, plantillaDetalle]
  );
  const itemEnEdicion = itemEnEdicionId ? plantillaItems.find((i) => i.id === itemEnEdicionId) ?? null : null;

  const checklistDetalle = checklistDetalleId ? checklistsProyecto.find((c) => c.id === checklistDetalleId) ?? null : null;
  const itemsDelChecklistDetalle = useMemo(
    () => (checklistDetalle ? checklistItems.filter((i) => i.checklist_proyecto_id === checklistDetalle.id) : []),
    [checklistItems, checklistDetalle]
  );
  const itemChecklistEnEdicion = itemChecklistEnEdicionId
    ? checklistItems.find((i) => i.id === itemChecklistEnEdicionId) ?? null
    : null;

  const proyectosConChecklist = new Set(checklistsProyecto.map((c) => c.proyecto_id));
  const opcionesProyectoSinChecklist = opcionesProyecto.filter((p) => !proyectosConChecklist.has(p.id));

  const nombreProyecto = (id: string) => opcionesProyecto.find((p) => p.id === id)?.etiqueta ?? id;
  const nombreUsuario = (id: string) => opcionesUsuario.find((u) => u.id === id)?.etiqueta ?? "—";
  const nombrePlantilla = (id: string) => plantillas.find((p) => p.id === id)?.nombre ?? id;
  const nombreDescripcionItem = (plantillaItemId: string) => plantillaItems.find((i) => i.id === plantillaItemId)?.descripcion_item ?? "—";

  const abrirCrearPlantilla = () => {
    setPlantillaEnEdicionId(null);
    setErrorGeneral("");
    setModalPlantillaAbierto(true);
  };
  const abrirEditarPlantilla = (id: string) => {
    setPlantillaEnEdicionId(id);
    setErrorGeneral("");
    setModalPlantillaAbierto(true);
  };

  const initialValuesPlantilla: PlantillaChecklistFormType = {
    nombre: plantillaEnEdicion?.nombre ?? "",
    descripcion: plantillaEnEdicion?.descripcion ?? "",
  };

  const initialValuesItem: ItemPlantillaChecklistFormType = {
    orden: itemEnEdicion ? String(itemEnEdicion.orden) : String(itemsDeLaPlantillaDetalle.length + 1),
    descripcion_item: itemEnEdicion?.descripcion_item ?? "",
    tipo_verificacion: itemEnEdicion?.tipo_verificacion ?? "",
    obligatorio: itemEnEdicion?.obligatorio ?? true,
  };

  const initialValuesIniciar: IniciarChecklistFormType = { proyecto_id: "", plantilla_id: "", responsable_id: "" };

  const initialValuesItemChecklist: ItemChecklistFormType = {
    evidencia_url: itemChecklistEnEdicion?.evidencia_url ?? "",
    comentario: itemChecklistEnEdicion?.comentario ?? "",
  };

  const handleEliminarItem = async (id: string) => {
    setGuardando(true);
    setErrorGeneral("");
    const resultado = await eliminarItemPlantilla(id);
    setGuardando(false);
    if (!resultado.ok) {
      setErrorGeneral(resultado.error);
      return;
    }
    router.refresh();
  };

  return (
    <div className="flex flex-col gap-6 py-2">
      {/* ================= Plantillas ================= */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <span className="text-small font-medium">Plantillas de protocolo de liquidación</span>
          {puedeCrear && (
            <Button color="primary" size="sm" onPress={abrirCrearPlantilla}>
              Nueva plantilla
            </Button>
          )}
        </div>
        <p className="text-tiny text-default-500">
          Catálogo compartido de la empresa — cada proyecto arranca su checklist a partir de una copia de estos
          ítems (editar la plantilla después no afecta checklists ya iniciados).
        </p>

        {plantillas.length === 0 ? (
          <p className="text-default-500 text-sm">No hay plantillas todavía.</p>
        ) : (
          <Table aria-label="Plantillas de checklist" removeWrapper={false}>
            <TableHeader>
              <TableColumn>NOMBRE</TableColumn>
              <TableColumn>ÍTEMS</TableColumn>
              <TableColumn>ESTADO</TableColumn>
              <TableColumn>ACCIONES</TableColumn>
            </TableHeader>
            <TableBody>
              {plantillas.map((plantilla) => (
                <TableRow key={plantilla.id}>
                  <TableCell>{plantilla.nombre}</TableCell>
                  <TableCell className="text-tiny">{plantillaItems.filter((i) => i.plantilla_id === plantilla.id).length}</TableCell>
                  <TableCell>
                    <Chip size="sm" variant="flat" color={plantilla.activo ? "success" : "default"}>
                      {plantilla.activo ? "Activa" : "Inactiva"}
                    </Chip>
                  </TableCell>
                  <TableCell>
                    <Button size="sm" variant="light" onPress={() => setPlantillaDetalleId(plantilla.id)}>
                      Ver / Gestionar
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <Divider />

      {/* ================= Checklists por proyecto ================= */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <span className="text-small font-medium">Checklists de liquidación por proyecto</span>
          {puedeCrear && (
            <Button
              color="primary"
              size="sm"
              onPress={() => {
                setErrorGeneral("");
                setModalIniciarAbierto(true);
              }}
              isDisabled={opcionesProyectoSinChecklist.length === 0 || opcionesPlantillaActiva.length === 0}
            >
              Iniciar checklist
            </Button>
          )}
        </div>

        {checklistsProyecto.length === 0 ? (
          <p className="text-default-500 text-sm">Ningún proyecto tiene un checklist de liquidación iniciado todavía.</p>
        ) : (
          <Table aria-label="Checklists por proyecto" removeWrapper={false}>
            <TableHeader>
              <TableColumn>PROYECTO</TableColumn>
              <TableColumn>PLANTILLA</TableColumn>
              <TableColumn>RESPONSABLE</TableColumn>
              <TableColumn>PROGRESO</TableColumn>
              <TableColumn>ESTADO</TableColumn>
              <TableColumn>ACCIONES</TableColumn>
            </TableHeader>
            <TableBody>
              {checklistsProyecto.map((checklist) => (
                <TableRow key={checklist.id}>
                  <TableCell className="text-tiny">{nombreProyecto(checklist.proyecto_id)}</TableCell>
                  <TableCell className="text-tiny">{nombrePlantilla(checklist.plantilla_id)}</TableCell>
                  <TableCell className="text-tiny">{nombreUsuario(checklist.responsable_id)}</TableCell>
                  <TableCell className="w-40">
                    <Progress size="sm" value={checklist.porcentaje_completado ?? 0} showValueLabel aria-label="Progreso" />
                  </TableCell>
                  <TableCell>
                    <Chip size="sm" variant="flat" color={checklist.estado === "COMPLETADO" ? "success" : "warning"}>
                      {checklist.estado === "COMPLETADO" ? "Completado" : "En proceso"}
                    </Chip>
                  </TableCell>
                  <TableCell>
                    <Button size="sm" variant="light" onPress={() => setChecklistDetalleId(checklist.id)}>
                      Ver / Gestionar
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Modal: crear/editar plantilla */}
      <Modal isOpen={modalPlantillaAbierto} onOpenChange={setModalPlantillaAbierto} size="lg">
        <ModalContent>
          {(cerrar) => (
            <Formik
              enableReinitialize
              initialValues={initialValuesPlantilla}
              validationSchema={PlantillaChecklistSchema}
              onSubmit={async (valores) => {
                setGuardando(true);
                setErrorGeneral("");
                const formData = new FormData();
                Object.entries(valores).forEach(([clave, valor]) => formData.set(clave, valor ?? ""));
                const resultado = plantillaEnEdicion
                  ? await actualizarPlantillaChecklist(plantillaEnEdicion.id, formData)
                  : await crearPlantillaChecklist(formData);
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
                  <ModalHeader>{plantillaEnEdicion ? "Editar plantilla" : "Nueva plantilla"}</ModalHeader>
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

      {/* Modal: detalle / gestión de una plantilla (sus ítems) */}
      <Modal isOpen={!!plantillaDetalleId} onOpenChange={(abierto) => !abierto && setPlantillaDetalleId(null)} size="2xl" scrollBehavior="inside">
        <ModalContent>
          {() =>
            plantillaDetalle && (
              <>
                <ModalHeader className="flex flex-col items-start gap-1">
                  <span>{plantillaDetalle.nombre}</span>
                  {plantillaDetalle.descripcion && (
                    <span className="text-small text-default-500 font-normal">{plantillaDetalle.descripcion}</span>
                  )}
                </ModalHeader>
                <ModalBody className="gap-4">
                  {errorGeneral && <p className="text-danger text-sm">{errorGeneral}</p>}

                  {puedeEditar && (
                    <div className="flex gap-2 items-center flex-wrap">
                      <Button size="sm" variant="light" onPress={() => abrirEditarPlantilla(plantillaDetalle.id)}>
                        Editar datos
                      </Button>
                      <Switch
                        size="sm"
                        isSelected={plantillaDetalle.activo}
                        onValueChange={async (activo) => {
                          setGuardando(true);
                          const resultado = await cambiarEstadoPlantillaChecklist(plantillaDetalle.id, activo);
                          setGuardando(false);
                          if (!resultado.ok) setErrorGeneral(resultado.error);
                          else router.refresh();
                        }}
                      >
                        Activa
                      </Switch>
                    </div>
                  )}

                  <Divider />

                  <div className="flex items-center justify-between">
                    <span className="text-small font-medium">Ítems del checklist</span>
                    {puedeCrear && (
                      <Button
                        size="sm"
                        variant="flat"
                        color="primary"
                        onPress={() => {
                          setItemEnEdicionId(null);
                          setErrorGeneral("");
                          setModalItemAbierto(true);
                        }}
                      >
                        Nuevo ítem
                      </Button>
                    )}
                  </div>
                  {itemsDeLaPlantillaDetalle.length === 0 ? (
                    <p className="text-tiny text-default-400">Esta plantilla no tiene ítems todavía.</p>
                  ) : (
                    <Table aria-label="Ítems de la plantilla" removeWrapper={false}>
                      <TableHeader>
                        <TableColumn>ORDEN</TableColumn>
                        <TableColumn>DESCRIPCIÓN</TableColumn>
                        <TableColumn>TIPO</TableColumn>
                        <TableColumn>OBLIGATORIO</TableColumn>
                        <TableColumn>ACCIONES</TableColumn>
                      </TableHeader>
                      <TableBody>
                        {itemsDeLaPlantillaDetalle.map((item) => (
                          <TableRow key={item.id}>
                            <TableCell className="text-tiny">{item.orden}</TableCell>
                            <TableCell className="text-tiny">{item.descripcion_item}</TableCell>
                            <TableCell className="text-tiny">{ETIQUETAS_TIPO_VERIFICACION[item.tipo_verificacion] ?? item.tipo_verificacion}</TableCell>
                            <TableCell>
                              <Chip size="sm" variant="flat" color={item.obligatorio ? "warning" : "default"}>
                                {item.obligatorio ? "Sí" : "No"}
                              </Chip>
                            </TableCell>
                            <TableCell className="flex gap-2">
                              {puedeEditar && (
                                <Button
                                  size="sm"
                                  variant="light"
                                  onPress={() => {
                                    setItemEnEdicionId(item.id);
                                    setErrorGeneral("");
                                    setModalItemAbierto(true);
                                  }}
                                >
                                  Editar
                                </Button>
                              )}
                              {puedeEliminar && (
                                <Button size="sm" variant="light" color="danger" isLoading={guardando} onPress={() => handleEliminarItem(item.id)}>
                                  Eliminar
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </ModalBody>
                <ModalFooter>
                  <Button variant="flat" onPress={() => setPlantillaDetalleId(null)}>
                    Cerrar
                  </Button>
                </ModalFooter>
              </>
            )
          }
        </ModalContent>
      </Modal>

      {/* Modal: crear/editar ítem de plantilla */}
      <Modal isOpen={modalItemAbierto} onOpenChange={setModalItemAbierto} size="lg">
        <ModalContent>
          {(cerrar) => (
            <Formik
              enableReinitialize
              initialValues={initialValuesItem}
              validationSchema={ItemPlantillaChecklistSchema}
              onSubmit={async (valores) => {
                if (!plantillaDetalleId) return;
                setGuardando(true);
                setErrorGeneral("");
                const formData = new FormData();
                formData.set("orden", valores.orden);
                formData.set("descripcion_item", valores.descripcion_item);
                formData.set("tipo_verificacion", valores.tipo_verificacion);
                formData.set("obligatorio", String(valores.obligatorio));
                const resultado = itemEnEdicion
                  ? await actualizarItemPlantilla(itemEnEdicion.id, formData)
                  : await crearItemPlantilla(plantillaDetalleId, formData);
                setGuardando(false);
                if (!resultado.ok) {
                  setErrorGeneral(resultado.error);
                  return;
                }
                router.refresh();
                setModalItemAbierto(false);
                cerrar();
              }}
            >
              {({ values, errors, touched, handleChange, handleSubmit, setFieldValue }) => (
                <>
                  <ModalHeader>{itemEnEdicion ? "Editar ítem" : "Nuevo ítem"}</ModalHeader>
                  <ModalBody className="gap-4">
                    <Input
                      label="Orden"
                      type="number"
                      variant="bordered"
                      value={values.orden}
                      onChange={handleChange("orden")}
                      isInvalid={!!errors.orden && !!touched.orden}
                      errorMessage={errors.orden}
                    />
                    <Textarea
                      label="Descripción del ítem"
                      variant="bordered"
                      value={values.descripcion_item}
                      onChange={handleChange("descripcion_item")}
                      isInvalid={!!errors.descripcion_item && !!touched.descripcion_item}
                      errorMessage={errors.descripcion_item}
                    />
                    <div className="flex flex-col gap-1">
                      <span className="text-small text-default-600">Tipo de verificación</span>
                      <DropdownSelector
                        etiquetaAria="Tipo de verificación"
                        opciones={OPCIONES_TIPO_VERIFICACION}
                        valor={values.tipo_verificacion || null}
                        onCambiar={(id) => setFieldValue("tipo_verificacion", id ?? "")}
                      />
                      {!!errors.tipo_verificacion && !!touched.tipo_verificacion && (
                        <span className="text-tiny text-danger">{errors.tipo_verificacion}</span>
                      )}
                    </div>
                    <Checkbox isSelected={values.obligatorio} onValueChange={(v) => setFieldValue("obligatorio", v)}>
                      Ítem obligatorio
                    </Checkbox>
                    {errorGeneral && <p className="text-danger text-sm">{errorGeneral}</p>}
                  </ModalBody>
                  <ModalFooter>
                    <Button variant="flat" onPress={cerrar}>
                      Cancelar
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

      {/* Modal: iniciar checklist para un proyecto */}
      <Modal isOpen={modalIniciarAbierto} onOpenChange={setModalIniciarAbierto} size="lg">
        <ModalContent>
          {(cerrar) => (
            <Formik
              initialValues={initialValuesIniciar}
              validationSchema={IniciarChecklistSchema}
              onSubmit={async (valores, { resetForm }) => {
                setGuardando(true);
                setErrorGeneral("");
                const formData = new FormData();
                Object.entries(valores).forEach(([clave, valor]) => formData.set(clave, valor ?? ""));
                const resultado = await iniciarChecklistProyecto(formData);
                setGuardando(false);
                if (!resultado.ok) {
                  setErrorGeneral(resultado.error);
                  return;
                }
                resetForm();
                router.refresh();
                setModalIniciarAbierto(false);
                cerrar();
              }}
            >
              {({ values, errors, touched, handleSubmit, setFieldValue }) => (
                <>
                  <ModalHeader>Iniciar checklist de liquidación</ModalHeader>
                  <ModalBody className="gap-4">
                    <div className="flex flex-col gap-1">
                      <span className="text-small text-default-600">Proyecto</span>
                      <DropdownSelector
                        etiquetaAria="Proyecto"
                        opciones={opcionesProyectoSinChecklist}
                        valor={values.proyecto_id || null}
                        onCambiar={(id) => setFieldValue("proyecto_id", id ?? "")}
                      />
                      {!!errors.proyecto_id && !!touched.proyecto_id && <span className="text-tiny text-danger">{errors.proyecto_id}</span>}
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-small text-default-600">Plantilla</span>
                      <DropdownSelector
                        etiquetaAria="Plantilla"
                        opciones={opcionesPlantillaActiva}
                        valor={values.plantilla_id || null}
                        onCambiar={(id) => setFieldValue("plantilla_id", id ?? "")}
                      />
                      {!!errors.plantilla_id && !!touched.plantilla_id && <span className="text-tiny text-danger">{errors.plantilla_id}</span>}
                    </div>
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
                    {errorGeneral && <p className="text-danger text-sm">{errorGeneral}</p>}
                  </ModalBody>
                  <ModalFooter>
                    <Button variant="flat" onPress={cerrar}>
                      Cancelar
                    </Button>
                    <Button color="primary" isLoading={guardando} onPress={() => handleSubmit()}>
                      Iniciar
                    </Button>
                  </ModalFooter>
                </>
              )}
            </Formik>
          )}
        </ModalContent>
      </Modal>

      {/* Modal: detalle / gestión de un checklist de proyecto */}
      <Modal isOpen={!!checklistDetalleId} onOpenChange={(abierto) => !abierto && setChecklistDetalleId(null)} size="2xl" scrollBehavior="inside">
        <ModalContent>
          {() =>
            checklistDetalle && (
              <>
                <ModalHeader className="flex flex-col items-start gap-1">
                  <span>{nombreProyecto(checklistDetalle.proyecto_id)}</span>
                  <span className="text-small text-default-500 font-normal">
                    {nombrePlantilla(checklistDetalle.plantilla_id)} · Responsable: {nombreUsuario(checklistDetalle.responsable_id)}
                  </span>
                </ModalHeader>
                <ModalBody className="gap-4">
                  {errorGeneral && <p className="text-danger text-sm">{errorGeneral}</p>}

                  <Progress
                    size="md"
                    value={checklistDetalle.porcentaje_completado ?? 0}
                    showValueLabel
                    color={checklistDetalle.estado === "COMPLETADO" ? "success" : "primary"}
                    aria-label="Progreso del checklist"
                  />

                  <Table aria-label="Ítems del checklist" removeWrapper={false}>
                    <TableHeader>
                      <TableColumn>ÍTEM</TableColumn>
                      <TableColumn>CUMPLIDO</TableColumn>
                      <TableColumn>VERIFICADO POR</TableColumn>
                      <TableColumn>ACCIONES</TableColumn>
                    </TableHeader>
                    <TableBody>
                      {itemsDelChecklistDetalle.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell className="text-tiny">{nombreDescripcionItem(item.plantilla_item_id)}</TableCell>
                          <TableCell>
                            <Checkbox
                              isSelected={item.cumplido}
                              isDisabled={!puedeEditar || guardando}
                              onValueChange={async (marcado) => {
                                setGuardando(true);
                                setErrorGeneral("");
                                const formData = new FormData();
                                formData.set("evidencia_url", item.evidencia_url ?? "");
                                formData.set("comentario", item.comentario ?? "");
                                const resultado = await marcarItemChecklist(item.id, marcado, formData);
                                setGuardando(false);
                                if (!resultado.ok) {
                                  setErrorGeneral(resultado.error);
                                  return;
                                }
                                router.refresh();
                              }}
                            />
                          </TableCell>
                          <TableCell className="text-tiny">{item.verificado_por_usuario_id ? nombreUsuario(item.verificado_por_usuario_id) : "—"}</TableCell>
                          <TableCell>
                            {puedeEditar && (
                              <Button
                                size="sm"
                                variant="light"
                                onPress={() => {
                                  setItemChecklistEnEdicionId(item.id);
                                  setErrorGeneral("");
                                  setModalItemChecklistAbierto(true);
                                }}
                              >
                                Evidencia / comentario
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ModalBody>
                <ModalFooter>
                  <Button variant="flat" onPress={() => setChecklistDetalleId(null)}>
                    Cerrar
                  </Button>
                </ModalFooter>
              </>
            )
          }
        </ModalContent>
      </Modal>

      {/* Modal: evidencia/comentario de un ítem de checklist */}
      <Modal isOpen={modalItemChecklistAbierto} onOpenChange={setModalItemChecklistAbierto} size="lg">
        <ModalContent>
          {(cerrar) => (
            <Formik
              enableReinitialize
              initialValues={initialValuesItemChecklist}
              validationSchema={ItemChecklistSchema}
              onSubmit={async (valores) => {
                if (!itemChecklistEnEdicion) return;
                setGuardando(true);
                setErrorGeneral("");
                const formData = new FormData();
                formData.set("evidencia_url", valores.evidencia_url);
                formData.set("comentario", valores.comentario);
                const resultado = await marcarItemChecklist(itemChecklistEnEdicion.id, itemChecklistEnEdicion.cumplido, formData);
                setGuardando(false);
                if (!resultado.ok) {
                  setErrorGeneral(resultado.error);
                  return;
                }
                router.refresh();
                setModalItemChecklistAbierto(false);
                cerrar();
              }}
            >
              {({ values, handleChange, handleSubmit }) => (
                <>
                  <ModalHeader>Evidencia y comentario del ítem</ModalHeader>
                  <ModalBody className="gap-4">
                    <Input
                      label="URL de evidencia (opcional)"
                      variant="bordered"
                      value={values.evidencia_url}
                      onChange={handleChange("evidencia_url")}
                    />
                    <Textarea label="Comentario (opcional)" variant="bordered" value={values.comentario} onChange={handleChange("comentario")} />
                    {errorGeneral && <p className="text-danger text-sm">{errorGeneral}</p>}
                  </ModalBody>
                  <ModalFooter>
                    <Button variant="flat" onPress={cerrar}>
                      Cancelar
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
    </div>
  );
}
