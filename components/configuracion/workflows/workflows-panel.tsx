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
} from "@nextui-org/react";
import { Formik } from "formik";
import type { Tables } from "@/utils/database.types";
import { DropdownSelector } from "@/components/shared/dropdown-selector";
import { EstadoCicloVidaSchema, WorkflowTransicionSchema } from "@/helpers/schemas";
import type { EstadoCicloVidaFormType, WorkflowTransicionFormType } from "@/helpers/types";
import {
  crearEstadoCicloVida,
  actualizarEstadoCicloVida,
  cambiarEstadoActivoEstadoCicloVida,
  crearTransicion,
  eliminarTransicion,
} from "@/app/(app)/configuracion/workflows/actions";

type Estado = Tables<"estados_ciclo_vida">;
type Transicion = Tables<"workflows_transiciones">;

const ENTIDADES_CONOCIDAS = ["COTIZACION", "CONTRATO", "PROYECTO", "CHANGE_REQUEST", "ORDEN_COSTO"];

interface Props {
  estados: Estado[];
  transiciones: Transicion[];
  roles: { id: string; nombre: string }[];
  puedeCrear: boolean;
  puedeEditar: boolean;
}

export function WorkflowsPanel({ estados, transiciones, roles, puedeCrear, puedeEditar }: Props) {
  const router = useRouter();

  const entidadesDisponibles = useMemo(() => {
    const set = new Set<string>(ENTIDADES_CONOCIDAS);
    estados.forEach((e) => set.add(e.entidad_aplicable));
    return Array.from(set).sort();
  }, [estados]);

  const [entidadSeleccionada, setEntidadSeleccionada] = useState<string>(entidadesDisponibles[0] ?? "");
  const [modalEstadoAbierto, setModalEstadoAbierto] = useState(false);
  const [estadoEnEdicion, setEstadoEnEdicion] = useState<Estado | null>(null);
  const [modalTransicionAbierto, setModalTransicionAbierto] = useState(false);
  const [modalEntidadNuevaAbierto, setModalEntidadNuevaAbierto] = useState(false);
  const [entidadNueva, setEntidadNueva] = useState("");
  const [filaEnProceso, setFilaEnProceso] = useState<string | null>(null);
  const [errorGeneral, setErrorGeneral] = useState("");
  const [guardando, setGuardando] = useState(false);

  const estadosEntidad = estados.filter((e) => e.entidad_aplicable === entidadSeleccionada);
  const transicionesEntidad = transiciones.filter((t) => t.entidad_aplicable === entidadSeleccionada);
  const estadosPorId = useMemo(() => new Map(estados.map((e) => [e.id, e])), [estados]);
  const rolesPorId = useMemo(() => new Map(roles.map((r) => [r.id, r.nombre])), [roles]);

  const abrirCrearEstado = () => {
    setEstadoEnEdicion(null);
    setErrorGeneral("");
    setModalEstadoAbierto(true);
  };
  const abrirEditarEstado = (estado: Estado) => {
    setEstadoEnEdicion(estado);
    setErrorGeneral("");
    setModalEstadoAbierto(true);
  };

  const handleEstadoActivo = async (id: string, activo: boolean) => {
    setFilaEnProceso(id);
    const resultado = await cambiarEstadoActivoEstadoCicloVida(id, activo);
    setFilaEnProceso(null);
    if (!resultado.ok) {
      setErrorGeneral(resultado.error);
      return;
    }
    router.refresh();
  };

  const handleEliminarTransicion = async (id: string) => {
    setFilaEnProceso(id);
    const resultado = await eliminarTransicion(id);
    setFilaEnProceso(null);
    if (!resultado.ok) {
      setErrorGeneral(resultado.error);
      return;
    }
    router.refresh();
  };

  const initialValuesEstado: EstadoCicloVidaFormType = {
    entidad_aplicable: estadoEnEdicion?.entidad_aplicable ?? entidadSeleccionada,
    codigo_estado: estadoEnEdicion?.codigo_estado ?? "",
    etiqueta: estadoEnEdicion?.etiqueta ?? "",
    orden: String(estadoEnEdicion?.orden ?? estadosEntidad.length),
    es_estado_inicial: estadoEnEdicion?.es_estado_inicial ?? false,
    es_estado_final: estadoEnEdicion?.es_estado_final ?? false,
    color_ui: estadoEnEdicion?.color_ui ?? "",
  };

  const initialValuesTransicion: WorkflowTransicionFormType = {
    estado_origen_id: "",
    estado_destino_id: "",
    rol_permitido_id: "",
    requiere_comentario: false,
    requiere_aprobacion_doble: false,
  };

  const opcionesEstado = estadosEntidad.map((e) => ({ id: e.id, etiqueta: e.etiqueta }));
  const opcionesRol = roles.map((r) => ({ id: r.id, etiqueta: r.nombre }));

  return (
    <div className="flex flex-col gap-4 py-2">
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-small text-default-600">Entidad:</span>
        <DropdownSelector
          etiquetaAria="Entidad aplicable"
          opciones={entidadesDisponibles.map((e) => ({ id: e, etiqueta: e }))}
          valor={entidadSeleccionada || null}
          onCambiar={(id) => id && setEntidadSeleccionada(id)}
        />
        {puedeCrear && (
          <Button size="sm" variant="flat" onPress={() => setModalEntidadNuevaAbierto(true)}>
            + Nueva entidad
          </Button>
        )}
      </div>

      {errorGeneral && <p className="text-danger text-sm">{errorGeneral}</p>}

      {entidadSeleccionada && (
        <>
          <div className="flex justify-between items-center">
            <h4 className="font-semibold text-medium">Estados — {entidadSeleccionada}</h4>
            {puedeCrear && (
              <Button size="sm" color="primary" onPress={abrirCrearEstado}>
                Nuevo estado
              </Button>
            )}
          </div>

          <Table aria-label={`Estados de ${entidadSeleccionada}`} removeWrapper={false}>
            <TableHeader>
              <TableColumn>ORDEN</TableColumn>
              <TableColumn>CÓDIGO</TableColumn>
              <TableColumn>ETIQUETA</TableColumn>
              <TableColumn>INICIAL</TableColumn>
              <TableColumn>FINAL</TableColumn>
              <TableColumn>ACTIVO</TableColumn>
              <TableColumn>ACCIONES</TableColumn>
            </TableHeader>
            <TableBody emptyContent="Esta entidad todavía no tiene estados definidos.">
              {estadosEntidad.map((estado) => (
                <TableRow key={estado.id}>
                  <TableCell>{estado.orden}</TableCell>
                  <TableCell className="font-mono text-tiny">{estado.codigo_estado}</TableCell>
                  <TableCell>
                    <Chip size="sm" variant="flat" style={estado.color_ui ? { backgroundColor: estado.color_ui } : undefined}>
                      {estado.etiqueta}
                    </Chip>
                  </TableCell>
                  <TableCell>{estado.es_estado_inicial ? "Sí" : "—"}</TableCell>
                  <TableCell>{estado.es_estado_final ? "Sí" : "—"}</TableCell>
                  <TableCell>
                    {puedeEditar ? (
                      <Switch
                        size="sm"
                        isSelected={estado.activo}
                        isDisabled={filaEnProceso === estado.id}
                        onValueChange={(v) => handleEstadoActivo(estado.id, v)}
                      />
                    ) : (
                      <Chip size="sm" color={estado.activo ? "success" : "default"} variant="flat">
                        {estado.activo ? "Activo" : "Inactivo"}
                      </Chip>
                    )}
                  </TableCell>
                  <TableCell>
                    {puedeEditar && (
                      <Button size="sm" variant="light" onPress={() => abrirEditarEstado(estado)}>
                        Editar
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <div className="flex justify-between items-center mt-2">
            <h4 className="font-semibold text-medium">Transiciones — {entidadSeleccionada}</h4>
            {puedeCrear && estadosEntidad.length >= 2 && (
              <Button
                size="sm"
                color="primary"
                onPress={() => {
                  setErrorGeneral("");
                  setModalTransicionAbierto(true);
                }}
              >
                Nueva transición
              </Button>
            )}
          </div>

          <Table aria-label={`Transiciones de ${entidadSeleccionada}`} removeWrapper={false}>
            <TableHeader>
              <TableColumn>ORIGEN</TableColumn>
              <TableColumn>DESTINO</TableColumn>
              <TableColumn>ROL PERMITIDO</TableColumn>
              <TableColumn>COMENTARIO</TableColumn>
              <TableColumn>DOBLE APROBACIÓN</TableColumn>
              <TableColumn>ACCIONES</TableColumn>
            </TableHeader>
            <TableBody emptyContent="Esta entidad todavía no tiene transiciones definidas.">
              {transicionesEntidad.map((transicion) => (
                <TableRow key={transicion.id}>
                  <TableCell>{estadosPorId.get(transicion.estado_origen_id)?.etiqueta ?? "—"}</TableCell>
                  <TableCell>{estadosPorId.get(transicion.estado_destino_id)?.etiqueta ?? "—"}</TableCell>
                  <TableCell>
                    {transicion.rol_permitido_id
                      ? rolesPorId.get(transicion.rol_permitido_id) ?? "—"
                      : "Cualquier rol con permiso"}
                  </TableCell>
                  <TableCell>{transicion.requiere_comentario ? "Sí" : "—"}</TableCell>
                  <TableCell>{transicion.requiere_aprobacion_doble ? "Sí" : "—"}</TableCell>
                  <TableCell>
                    {puedeEditar && (
                      <Button
                        size="sm"
                        variant="light"
                        color="danger"
                        isLoading={filaEnProceso === transicion.id}
                        onPress={() => handleEliminarTransicion(transicion.id)}
                      >
                        Eliminar
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </>
      )}

      {/* Modal: nueva entidad (solo define el nombre; luego se seleccionará para agregar estados) */}
      <Modal isOpen={modalEntidadNuevaAbierto} onOpenChange={setModalEntidadNuevaAbierto}>
        <ModalContent>
          {(cerrar) => (
            <>
              <ModalHeader>Nueva entidad</ModalHeader>
              <ModalBody>
                <Input
                  label="Nombre de la entidad"
                  variant="bordered"
                  placeholder="Ej. FACTURA, ACTA_CIERRE…"
                  value={entidadNueva}
                  onChange={(e) => setEntidadNueva(e.target.value.toUpperCase())}
                />
                <p className="text-tiny text-default-500">
                  Escribe el nombre y luego crea su primer estado desde el botón
                  &quot;Nuevo estado&quot; una vez seleccionada.
                </p>
              </ModalBody>
              <ModalFooter>
                <Button variant="flat" onPress={cerrar}>
                  Cerrar
                </Button>
                <Button
                  color="primary"
                  isDisabled={!entidadNueva.trim()}
                  onPress={() => {
                    setEntidadSeleccionada(entidadNueva.trim());
                    setEntidadNueva("");
                    cerrar();
                  }}
                >
                  Continuar
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>

      {/* Modal: crear/editar estado */}
      <Modal isOpen={modalEstadoAbierto} onOpenChange={setModalEstadoAbierto}>
        <ModalContent>
          {(cerrar) => (
            <Formik
              enableReinitialize
              initialValues={initialValuesEstado}
              validationSchema={EstadoCicloVidaSchema}
              onSubmit={async (valores) => {
                setGuardando(true);
                setErrorGeneral("");

                const formData = new FormData();
                Object.entries(valores).forEach(([clave, valor]) => {
                  formData.set(clave, valor === null || valor === undefined ? "" : String(valor));
                });

                const resultado = estadoEnEdicion
                  ? await actualizarEstadoCicloVida(estadoEnEdicion.id, formData)
                  : await crearEstadoCicloVida(formData);

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
                  <ModalHeader>{estadoEnEdicion ? "Editar estado" : "Nuevo estado"}</ModalHeader>
                  <ModalBody className="gap-4">
                    <Input label="Entidad" variant="bordered" isDisabled value={values.entidad_aplicable} />
                    <div className="grid md:grid-cols-2 gap-4">
                      <Input
                        label="Código del estado"
                        variant="bordered"
                        value={values.codigo_estado}
                        onChange={handleChange("codigo_estado")}
                        isInvalid={!!errors.codigo_estado && !!touched.codigo_estado}
                        errorMessage={errors.codigo_estado}
                      />
                      <Input
                        label="Etiqueta"
                        variant="bordered"
                        value={values.etiqueta}
                        onChange={handleChange("etiqueta")}
                        isInvalid={!!errors.etiqueta && !!touched.etiqueta}
                        errorMessage={errors.etiqueta}
                      />
                      <Input
                        label="Orden"
                        type="number"
                        variant="bordered"
                        value={values.orden}
                        onChange={handleChange("orden")}
                      />
                      <Input
                        label="Color (opcional)"
                        variant="bordered"
                        placeholder="#22c55e"
                        value={values.color_ui}
                        onChange={handleChange("color_ui")}
                      />
                    </div>
                    <div className="flex gap-6">
                      <Switch
                        size="sm"
                        isSelected={values.es_estado_inicial}
                        onValueChange={(v) => setFieldValue("es_estado_inicial", v)}
                      >
                        Estado inicial
                      </Switch>
                      <Switch
                        size="sm"
                        isSelected={values.es_estado_final}
                        onValueChange={(v) => setFieldValue("es_estado_final", v)}
                      >
                        Estado final
                      </Switch>
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

      {/* Modal: nueva transición */}
      <Modal isOpen={modalTransicionAbierto} onOpenChange={setModalTransicionAbierto}>
        <ModalContent>
          {(cerrar) => (
            <Formik
              initialValues={initialValuesTransicion}
              validationSchema={WorkflowTransicionSchema}
              onSubmit={async (valores, { resetForm }) => {
                setGuardando(true);
                setErrorGeneral("");

                const formData = new FormData();
                Object.entries(valores).forEach(([clave, valor]) => {
                  formData.set(clave, valor === null || valor === undefined ? "" : String(valor));
                });

                const resultado = await crearTransicion(entidadSeleccionada, formData);
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
              {({ values, errors, touched, handleSubmit, setFieldValue }) => (
                <>
                  <ModalHeader>Nueva transición — {entidadSeleccionada}</ModalHeader>
                  <ModalBody className="gap-4">
                    <div className="flex flex-col gap-1">
                      <span className="text-small text-default-600">Estado de origen</span>
                      <DropdownSelector
                        etiquetaAria="Estado de origen"
                        opciones={opcionesEstado}
                        valor={values.estado_origen_id || null}
                        onCambiar={(id) => setFieldValue("estado_origen_id", id ?? "")}
                      />
                      {!!errors.estado_origen_id && !!touched.estado_origen_id && (
                        <span className="text-tiny text-danger">{errors.estado_origen_id}</span>
                      )}
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-small text-default-600">Estado de destino</span>
                      <DropdownSelector
                        etiquetaAria="Estado de destino"
                        opciones={opcionesEstado}
                        valor={values.estado_destino_id || null}
                        onCambiar={(id) => setFieldValue("estado_destino_id", id ?? "")}
                      />
                      {!!errors.estado_destino_id && !!touched.estado_destino_id && (
                        <span className="text-tiny text-danger">{errors.estado_destino_id}</span>
                      )}
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-small text-default-600">Rol permitido (opcional)</span>
                      <DropdownSelector
                        etiquetaAria="Rol permitido"
                        opciones={opcionesRol}
                        valor={values.rol_permitido_id || null}
                        onCambiar={(id) => setFieldValue("rol_permitido_id", id ?? "")}
                        permitirVacio
                        etiquetaVacio="Cualquier rol con permiso"
                      />
                    </div>
                    <div className="flex gap-6">
                      <Switch
                        size="sm"
                        isSelected={values.requiere_comentario}
                        onValueChange={(v) => setFieldValue("requiere_comentario", v)}
                      >
                        Requiere comentario
                      </Switch>
                      <Switch
                        size="sm"
                        isSelected={values.requiere_aprobacion_doble}
                        onValueChange={(v) => setFieldValue("requiere_aprobacion_doble", v)}
                      >
                        Doble aprobación
                      </Switch>
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
    </div>
  );
}
