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
import { ProveedorSchema, EvaluacionProveedorSchema } from "@/helpers/schemas";
import type { ProveedorFormType, EvaluacionProveedorFormType } from "@/helpers/types";
import { crearProveedor, actualizarProveedor, cambiarEstadoProveedor, crearEvaluacionProveedor } from "@/app/(app)/compras/actions";

export type ProveedorConRelaciones = Tables<"proveedores">;

export const TIPOS_PROVEEDOR = [
  { id: "EMPRESA", etiqueta: "Empresa" },
  { id: "FREELANCER", etiqueta: "Freelancer" },
  { id: "INFRAESTRUCTURA_CLOUD", etiqueta: "Infraestructura cloud" },
  { id: "OTRO", etiqueta: "Otro" },
];

const ESTADOS_PROVEEDOR = [
  { id: "ACTIVO", etiqueta: "Activo" },
  { id: "INACTIVO", etiqueta: "Inactivo" },
  { id: "EN_EVALUACION", etiqueta: "En evaluación" },
  { id: "BLOQUEADO", etiqueta: "Bloqueado" },
];

const COLOR_ESTADO_PROVEEDOR: Record<string, "default" | "primary" | "secondary" | "success" | "warning" | "danger"> = {
  ACTIVO: "success",
  INACTIVO: "default",
  EN_EVALUACION: "warning",
  BLOQUEADO: "danger",
};

function calificacionColor(calificacion: number | null): "default" | "success" | "warning" | "danger" {
  if (calificacion == null) return "default";
  if (calificacion >= 4) return "success";
  if (calificacion >= 2.5) return "warning";
  return "danger";
}

interface Props {
  proveedores: ProveedorConRelaciones[];
  evaluaciones: Tables<"evaluaciones_proveedor">[];
  proyectos: { id: string; numero_proyecto: string; nombre_proyecto: string }[];
  monedas: Tables<"monedas">[];
  categoriasProveedor: Tables<"catalogos_valores">[];
  puedeCrear: boolean;
  puedeEditar: boolean;
}

export function ProveedoresPanel({
  proveedores,
  evaluaciones,
  proyectos,
  monedas,
  categoriasProveedor,
  puedeCrear,
  puedeEditar,
}: Props) {
  const router = useRouter();
  const [modalAbierto, setModalAbierto] = useState(false);
  const [proveedorEnEdicionId, setProveedorEnEdicionId] = useState<string | null>(null);
  const [proveedorDetalleId, setProveedorDetalleId] = useState<string | null>(null);
  const [estadoElegido, setEstadoElegido] = useState("");
  const [modalEvaluacionAbierto, setModalEvaluacionAbierto] = useState(false);
  const [errorGeneral, setErrorGeneral] = useState("");
  const [guardando, setGuardando] = useState(false);

  const proveedorEnEdicion = proveedorEnEdicionId ? proveedores.find((p) => p.id === proveedorEnEdicionId) ?? null : null;
  const proveedorDetalle = proveedorDetalleId ? proveedores.find((p) => p.id === proveedorDetalleId) ?? null : null;

  const evaluacionesDelProveedor = useMemo(() => {
    if (!proveedorDetalle) return [];
    return evaluaciones
      .filter((e) => e.proveedor_id === proveedorDetalle.id)
      .sort((a, b) => (a.fecha_evaluacion < b.fecha_evaluacion ? 1 : -1));
  }, [evaluaciones, proveedorDetalle]);

  const opcionesCategoria = categoriasProveedor.map((c) => ({ id: c.id, etiqueta: c.etiqueta }));
  const opcionesMoneda = monedas.map((m) => ({ id: m.id, etiqueta: `${m.codigo_iso} — ${m.nombre}` }));
  const opcionesProyecto = proyectos.map((p) => ({ id: p.id, etiqueta: `${p.numero_proyecto} — ${p.nombre_proyecto}` }));

  const abrirCrear = () => {
    setProveedorEnEdicionId(null);
    setErrorGeneral("");
    setModalAbierto(true);
  };
  const abrirEditar = (id: string) => {
    setProveedorEnEdicionId(id);
    setErrorGeneral("");
    setModalAbierto(true);
  };
  const abrirDetalle = (id: string) => {
    setProveedorDetalleId(id);
    setEstadoElegido(proveedores.find((p) => p.id === id)?.estado ?? "");
    setErrorGeneral("");
  };

  const handleCambiarEstado = async () => {
    if (!proveedorDetalleId || !estadoElegido) return;
    setGuardando(true);
    setErrorGeneral("");
    const resultado = await cambiarEstadoProveedor(proveedorDetalleId, estadoElegido);
    setGuardando(false);
    if (!resultado.ok) {
      setErrorGeneral(resultado.error);
      return;
    }
    router.refresh();
  };

  const initialValues: ProveedorFormType = {
    tipo_proveedor: proveedorEnEdicion?.tipo_proveedor ?? "",
    razon_social_o_nombre: proveedorEnEdicion?.razon_social_o_nombre ?? "",
    tipo_identificacion: proveedorEnEdicion?.tipo_identificacion ?? "",
    numero_identificacion: proveedorEnEdicion?.numero_identificacion ?? "",
    email: proveedorEnEdicion?.email ?? "",
    telefono: proveedorEnEdicion?.telefono ?? "",
    direccion: proveedorEnEdicion?.direccion ?? "",
    pais: proveedorEnEdicion?.pais ?? "",
    categoria_id: proveedorEnEdicion?.categoria_id ?? "",
    especialidad: proveedorEnEdicion?.especialidad ?? "",
    tarifa_referencia_hora: proveedorEnEdicion?.tarifa_referencia_hora != null ? String(proveedorEnEdicion.tarifa_referencia_hora) : "",
    moneda_id: proveedorEnEdicion?.moneda_id ?? "",
    forma_pago_preferida: proveedorEnEdicion?.forma_pago_preferida ?? "",
    plazo_pago_dias: proveedorEnEdicion?.plazo_pago_dias != null ? String(proveedorEnEdicion.plazo_pago_dias) : "",
    cuenta_bancaria_ref: proveedorEnEdicion?.cuenta_bancaria_ref ?? "",
    documentos_legales_url: proveedorEnEdicion?.documentos_legales_url ?? "",
    fecha_vinculacion: proveedorEnEdicion?.fecha_vinculacion ?? "",
  };

  const initialValuesEvaluacion: EvaluacionProveedorFormType = {
    proyecto_id: "",
    fecha_evaluacion: new Date().toISOString().slice(0, 10),
    calidad: "",
    tiempo: "",
    comunicacion: "",
    comentarios: "",
  };

  return (
    <div className="flex flex-col gap-4 py-2">
      {puedeCrear && (
        <div className="flex justify-end">
          <Button color="primary" size="sm" onPress={abrirCrear}>
            Nuevo proveedor
          </Button>
        </div>
      )}

      {errorGeneral && !proveedorDetalleId && <p className="text-danger text-sm">{errorGeneral}</p>}

      {proveedores.length === 0 ? (
        <p className="text-default-500 text-sm">No hay proveedores registrados todavía.</p>
      ) : (
        <Table aria-label="Proveedores" removeWrapper={false}>
          <TableHeader>
            <TableColumn>NÚMERO</TableColumn>
            <TableColumn>NOMBRE</TableColumn>
            <TableColumn>TIPO</TableColumn>
            <TableColumn>CALIFICACIÓN</TableColumn>
            <TableColumn>ESTADO</TableColumn>
            <TableColumn>ACCIONES</TableColumn>
          </TableHeader>
          <TableBody>
            {proveedores.map((proveedor) => (
              <TableRow key={proveedor.id}>
                <TableCell className="font-mono text-tiny">{proveedor.numero_proveedor}</TableCell>
                <TableCell>{proveedor.razon_social_o_nombre}</TableCell>
                <TableCell className="text-tiny">
                  {TIPOS_PROVEEDOR.find((t) => t.id === proveedor.tipo_proveedor)?.etiqueta ?? proveedor.tipo_proveedor}
                </TableCell>
                <TableCell>
                  <Chip size="sm" variant="flat" color={calificacionColor(proveedor.calificacion_desempeno_promedio)}>
                    {proveedor.calificacion_desempeno_promedio != null ? proveedor.calificacion_desempeno_promedio.toFixed(2) : "—"}
                  </Chip>
                </TableCell>
                <TableCell>
                  <Chip size="sm" variant="flat" color={COLOR_ESTADO_PROVEEDOR[proveedor.estado] ?? "default"}>
                    {ESTADOS_PROVEEDOR.find((e) => e.id === proveedor.estado)?.etiqueta ?? proveedor.estado}
                  </Chip>
                </TableCell>
                <TableCell>
                  <Button size="sm" variant="light" onPress={() => abrirDetalle(proveedor.id)}>
                    Ver / Gestionar
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {/* Modal: crear/editar proveedor */}
      <Modal isOpen={modalAbierto} onOpenChange={setModalAbierto} size="3xl" scrollBehavior="inside">
        <ModalContent>
          {(cerrar) => (
            <Formik
              enableReinitialize
              initialValues={initialValues}
              validationSchema={ProveedorSchema}
              onSubmit={async (valores) => {
                setGuardando(true);
                setErrorGeneral("");

                const formData = new FormData();
                Object.entries(valores).forEach(([clave, valor]) => {
                  formData.set(clave, valor ?? "");
                });

                const resultado = proveedorEnEdicion
                  ? await actualizarProveedor(proveedorEnEdicion.id, formData)
                  : await crearProveedor(formData);

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
                  <ModalHeader>{proveedorEnEdicion ? "Editar proveedor" : "Nuevo proveedor"}</ModalHeader>
                  <ModalBody className="gap-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex flex-col gap-1">
                        <span className="text-small text-default-600">Tipo de proveedor</span>
                        <DropdownSelector
                          etiquetaAria="Tipo de proveedor"
                          opciones={TIPOS_PROVEEDOR}
                          valor={values.tipo_proveedor || null}
                          onCambiar={(id) => setFieldValue("tipo_proveedor", id ?? "")}
                        />
                        {!!errors.tipo_proveedor && !!touched.tipo_proveedor && (
                          <span className="text-tiny text-danger">{errors.tipo_proveedor}</span>
                        )}
                      </div>
                      <div className="flex flex-col gap-1">
                        <span className="text-small text-default-600">Categoría (opcional)</span>
                        <DropdownSelector
                          etiquetaAria="Categoría"
                          opciones={opcionesCategoria}
                          valor={values.categoria_id || null}
                          onCambiar={(id) => setFieldValue("categoria_id", id ?? "")}
                          permitirVacio
                        />
                      </div>
                    </div>
                    <Input
                      label="Razón social o nombre"
                      variant="bordered"
                      value={values.razon_social_o_nombre}
                      onChange={handleChange("razon_social_o_nombre")}
                      isInvalid={!!errors.razon_social_o_nombre && !!touched.razon_social_o_nombre}
                      errorMessage={errors.razon_social_o_nombre}
                    />
                    <div className="grid grid-cols-2 gap-4">
                      <Input
                        label="Tipo de identificación (opcional)"
                        variant="bordered"
                        value={values.tipo_identificacion}
                        onChange={handleChange("tipo_identificacion")}
                      />
                      <Input
                        label="Número de identificación (opcional)"
                        variant="bordered"
                        value={values.numero_identificacion}
                        onChange={handleChange("numero_identificacion")}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <Input
                        label="Correo (opcional)"
                        variant="bordered"
                        value={values.email}
                        onChange={handleChange("email")}
                        isInvalid={!!errors.email && !!touched.email}
                        errorMessage={errors.email}
                      />
                      <Input
                        label="Teléfono (opcional)"
                        variant="bordered"
                        value={values.telefono}
                        onChange={handleChange("telefono")}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <Input
                        label="Dirección (opcional)"
                        variant="bordered"
                        value={values.direccion}
                        onChange={handleChange("direccion")}
                      />
                      <Input label="País (opcional)" variant="bordered" value={values.pais} onChange={handleChange("pais")} />
                    </div>
                    <Input
                      label="Especialidad (opcional)"
                      variant="bordered"
                      value={values.especialidad}
                      onChange={handleChange("especialidad")}
                    />
                    <div className="grid grid-cols-2 gap-4">
                      <Input
                        label="Tarifa de referencia por hora (opcional)"
                        type="number"
                        step="0.01"
                        variant="bordered"
                        value={values.tarifa_referencia_hora}
                        onChange={handleChange("tarifa_referencia_hora")}
                      />
                      <div className="flex flex-col gap-1">
                        <span className="text-small text-default-600">Moneda (opcional)</span>
                        <DropdownSelector
                          etiquetaAria="Moneda"
                          opciones={opcionesMoneda}
                          valor={values.moneda_id || null}
                          onCambiar={(id) => setFieldValue("moneda_id", id ?? "")}
                          permitirVacio
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <Input
                        label="Forma de pago preferida (opcional)"
                        variant="bordered"
                        value={values.forma_pago_preferida}
                        onChange={handleChange("forma_pago_preferida")}
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
                      <Input
                        label="Referencia de cuenta bancaria (opcional)"
                        variant="bordered"
                        value={values.cuenta_bancaria_ref}
                        onChange={handleChange("cuenta_bancaria_ref")}
                      />
                      <span className="text-tiny text-default-400">
                        Guarda solo un alias o referencia (ej. &quot;Cuenta principal Bancolombia&quot;) — nunca el
                        número de cuenta completo.
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <Input
                        label="URL de documentos legales (opcional)"
                        variant="bordered"
                        value={values.documentos_legales_url}
                        onChange={handleChange("documentos_legales_url")}
                      />
                      <Input
                        label="Fecha de vinculación (opcional)"
                        type="date"
                        variant="bordered"
                        value={values.fecha_vinculacion}
                        onChange={handleChange("fecha_vinculacion")}
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

      {/* Modal: detalle / gestión de un proveedor */}
      <Modal
        isOpen={!!proveedorDetalleId}
        onOpenChange={(abierto) => !abierto && setProveedorDetalleId(null)}
        size="3xl"
        scrollBehavior="inside"
      >
        <ModalContent>
          {() =>
            proveedorDetalle && (
              <>
                <ModalHeader className="flex flex-col items-start gap-1">
                  <div className="flex items-center gap-3">
                    <span>{proveedorDetalle.numero_proveedor}</span>
                    <Chip size="sm" variant="flat" color={COLOR_ESTADO_PROVEEDOR[proveedorDetalle.estado] ?? "default"}>
                      {ESTADOS_PROVEEDOR.find((e) => e.id === proveedorDetalle.estado)?.etiqueta ?? proveedorDetalle.estado}
                    </Chip>
                  </div>
                  <span className="text-small text-default-500 font-normal">{proveedorDetalle.razon_social_o_nombre}</span>
                </ModalHeader>
                <ModalBody className="gap-4">
                  {errorGeneral && <p className="text-danger text-sm">{errorGeneral}</p>}

                  <div className="grid md:grid-cols-2 gap-x-6 gap-y-1 text-sm text-default-500">
                    <span>Tipo: {TIPOS_PROVEEDOR.find((t) => t.id === proveedorDetalle.tipo_proveedor)?.etiqueta ?? proveedorDetalle.tipo_proveedor}</span>
                    <span>Correo: {proveedorDetalle.email ?? "—"}</span>
                    <span>Teléfono: {proveedorDetalle.telefono ?? "—"}</span>
                    <span>País: {proveedorDetalle.pais ?? "—"}</span>
                    <span>Especialidad: {proveedorDetalle.especialidad ?? "—"}</span>
                    <span>
                      Calificación promedio:{" "}
                      {proveedorDetalle.calificacion_desempeno_promedio != null
                        ? proveedorDetalle.calificacion_desempeno_promedio.toFixed(2)
                        : "— (sin evaluaciones todavía)"}
                    </span>
                  </div>

                  {puedeEditar && (
                    <div>
                      <Button size="sm" variant="light" onPress={() => abrirEditar(proveedorDetalle.id)}>
                        Editar datos del proveedor
                      </Button>
                    </div>
                  )}

                  <Divider />

                  {puedeEditar && (
                    <div className="flex gap-2 items-end flex-wrap">
                      <div className="flex flex-col gap-1">
                        <span className="text-small text-default-600">Estado</span>
                        <DropdownSelector
                          etiquetaAria="Estado"
                          opciones={ESTADOS_PROVEEDOR}
                          valor={estadoElegido || null}
                          onCambiar={(id) => setEstadoElegido(id ?? "")}
                        />
                      </div>
                      <Button
                        size="sm"
                        color="primary"
                        variant="flat"
                        isLoading={guardando}
                        isDisabled={estadoElegido === proveedorDetalle.estado}
                        onPress={handleCambiarEstado}
                      >
                        Guardar estado
                      </Button>
                    </div>
                  )}

                  <Divider />

                  <div className="flex items-center justify-between">
                    <span className="text-small font-medium">Evaluaciones de desempeño</span>
                    {puedeCrear && (
                      <Button size="sm" variant="flat" color="primary" onPress={() => setModalEvaluacionAbierto(true)}>
                        Nueva evaluación
                      </Button>
                    )}
                  </div>
                  {evaluacionesDelProveedor.length === 0 ? (
                    <p className="text-tiny text-default-400">Este proveedor todavía no tiene evaluaciones.</p>
                  ) : (
                    <Table aria-label="Evaluaciones del proveedor" removeWrapper={false}>
                      <TableHeader>
                        <TableColumn>FECHA</TableColumn>
                        <TableColumn>CALIFICACIÓN</TableColumn>
                        <TableColumn>CALIDAD</TableColumn>
                        <TableColumn>TIEMPO</TableColumn>
                        <TableColumn>COMUNICACIÓN</TableColumn>
                        <TableColumn>COMENTARIOS</TableColumn>
                      </TableHeader>
                      <TableBody>
                        {evaluacionesDelProveedor.map((ev) => {
                          const criterios = (ev.criterios ?? {}) as { calidad?: number; tiempo?: number; comunicacion?: number };
                          return (
                            <TableRow key={ev.id}>
                              <TableCell className="text-tiny">{ev.fecha_evaluacion}</TableCell>
                              <TableCell>
                                <Chip size="sm" variant="flat" color={calificacionColor(ev.calificacion)}>
                                  {ev.calificacion.toFixed(2)}
                                </Chip>
                              </TableCell>
                              <TableCell className="text-tiny">{criterios.calidad ?? "—"}</TableCell>
                              <TableCell className="text-tiny">{criterios.tiempo ?? "—"}</TableCell>
                              <TableCell className="text-tiny">{criterios.comunicacion ?? "—"}</TableCell>
                              <TableCell className="text-tiny text-default-500">{ev.comentarios ?? "—"}</TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  )}
                </ModalBody>
                <ModalFooter>
                  <Button variant="flat" onPress={() => setProveedorDetalleId(null)}>
                    Cerrar
                  </Button>
                </ModalFooter>
              </>
            )
          }
        </ModalContent>
      </Modal>

      {/* Modal: nueva evaluación de proveedor */}
      <Modal isOpen={modalEvaluacionAbierto} onOpenChange={setModalEvaluacionAbierto} size="lg" scrollBehavior="inside">
        <ModalContent>
          {(cerrar) => (
            <Formik
              initialValues={initialValuesEvaluacion}
              validationSchema={EvaluacionProveedorSchema}
              onSubmit={async (valores, { resetForm }) => {
                if (!proveedorDetalleId) return;
                setGuardando(true);
                setErrorGeneral("");

                const formData = new FormData();
                Object.entries(valores).forEach(([clave, valor]) => {
                  formData.set(clave, valor ?? "");
                });

                const resultado = await crearEvaluacionProveedor(proveedorDetalleId, formData);

                setGuardando(false);

                if (!resultado.ok) {
                  setErrorGeneral(resultado.error);
                  return;
                }

                resetForm();
                router.refresh();
                setModalEvaluacionAbierto(false);
                cerrar();
              }}
            >
              {({ values, errors, touched, handleChange, handleSubmit, setFieldValue }) => (
                <>
                  <ModalHeader>Nueva evaluación — {proveedorDetalle?.razon_social_o_nombre}</ModalHeader>
                  <ModalBody className="gap-4">
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
                    <Input
                      label="Fecha de evaluación"
                      type="date"
                      variant="bordered"
                      value={values.fecha_evaluacion}
                      onChange={handleChange("fecha_evaluacion")}
                      isInvalid={!!errors.fecha_evaluacion && !!touched.fecha_evaluacion}
                      errorMessage={errors.fecha_evaluacion}
                    />
                    <p className="text-tiny text-default-500">
                      Califica de 1 a 5 en cada criterio — la calificación general se calcula
                      automáticamente como el promedio de los tres.
                    </p>
                    <div className="grid grid-cols-3 gap-4">
                      <Input
                        label="Calidad"
                        type="number"
                        min={1}
                        max={5}
                        variant="bordered"
                        value={values.calidad}
                        onChange={handleChange("calidad")}
                        isInvalid={!!errors.calidad && !!touched.calidad}
                        errorMessage={errors.calidad}
                      />
                      <Input
                        label="Tiempo"
                        type="number"
                        min={1}
                        max={5}
                        variant="bordered"
                        value={values.tiempo}
                        onChange={handleChange("tiempo")}
                        isInvalid={!!errors.tiempo && !!touched.tiempo}
                        errorMessage={errors.tiempo}
                      />
                      <Input
                        label="Comunicación"
                        type="number"
                        min={1}
                        max={5}
                        variant="bordered"
                        value={values.comunicacion}
                        onChange={handleChange("comunicacion")}
                        isInvalid={!!errors.comunicacion && !!touched.comunicacion}
                        errorMessage={errors.comunicacion}
                      />
                    </div>
                    <Textarea
                      label="Comentarios (opcional)"
                      variant="bordered"
                      value={values.comentarios}
                      onChange={handleChange("comentarios")}
                    />
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
