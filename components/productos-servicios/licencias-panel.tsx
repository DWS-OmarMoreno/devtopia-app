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
import { LicenciaCatalogoSchema, LicenciaAsignadaSchema } from "@/helpers/schemas";
import type { LicenciaCatalogoFormType, LicenciaAsignadaFormType } from "@/helpers/types";
import {
  crearLicenciaCatalogo,
  actualizarLicenciaCatalogo,
  cambiarEstadoLicenciaCatalogo,
  crearLicenciaAsignada,
  actualizarLicenciaAsignada,
  eliminarLicenciaAsignada,
} from "@/app/(app)/productos-servicios/actions";

type LicenciaCatalogo = Tables<"licencias_suscripciones_catalogo">;
type LicenciaAsignada = Tables<"licencias_asignadas">;

const TIPOS_LICENCIA = [
  { id: "LICENCIA_PERPETUA", etiqueta: "Licencia perpetua" },
  { id: "SUSCRIPCION_SAAS", etiqueta: "Suscripción SaaS" },
  { id: "SOPORTE_ANUAL", etiqueta: "Soporte anual" },
];
const MODELOS_COSTO = [
  { id: "POR_USUARIO", etiqueta: "Por usuario" },
  { id: "POR_INSTANCIA", etiqueta: "Por instancia" },
  { id: "FIJO", etiqueta: "Fijo" },
  { id: "ESCALONADO", etiqueta: "Escalonado" },
];
const PERIODICIDADES = [
  { id: "MENSUAL", etiqueta: "Mensual" },
  { id: "ANUAL", etiqueta: "Anual" },
  { id: "UNICA", etiqueta: "Única" },
];
const ESTADOS_ASIGNACION = ["ACTIVA", "VENCIDA", "CANCELADA", "EN_RENOVACION"];

function formatearMoneda(valor: number | null, codigoIso: string | undefined): string {
  if (valor == null) return "—";
  const numero = valor.toLocaleString("es-CO", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return codigoIso ? `${codigoIso} ${numero}` : numero;
}

const colorEstadoAsignacion = (estado: string) => {
  if (estado === "ACTIVA") return "success";
  if (estado === "VENCIDA" || estado === "CANCELADA") return "danger";
  return "warning";
};

interface Props {
  licenciasCatalogo: LicenciaCatalogo[];
  licenciasAsignadas: LicenciaAsignada[];
  cuentas: { id: string; razon_social: string }[];
  monedas: Tables<"monedas">[];
  puedeCrear: boolean;
  puedeEditar: boolean;
}

const hoyISO = () => new Date().toISOString().slice(0, 10);

export function LicenciasPanel({
  licenciasCatalogo,
  licenciasAsignadas,
  cuentas,
  monedas,
  puedeCrear,
  puedeEditar,
}: Props) {
  const router = useRouter();
  const [modalCatalogoAbierto, setModalCatalogoAbierto] = useState(false);
  const [licenciaEnEdicion, setLicenciaEnEdicion] = useState<LicenciaCatalogo | null>(null);
  const [licenciaParaAsignacion, setLicenciaParaAsignacion] = useState<LicenciaCatalogo | null>(null);
  const [asignacionEnEdicion, setAsignacionEnEdicion] = useState<LicenciaAsignada | null>(null);
  const [filaEnProceso, setFilaEnProceso] = useState<string | null>(null);
  const [errorGeneral, setErrorGeneral] = useState("");
  const [guardando, setGuardando] = useState(false);

  const asignacionesPorLicencia = useMemo(() => {
    const mapa = new Map<string, LicenciaAsignada[]>();
    for (const asignacion of licenciasAsignadas) {
      const lista = mapa.get(asignacion.licencia_catalogo_id) ?? [];
      lista.push(asignacion);
      mapa.set(asignacion.licencia_catalogo_id, lista);
    }
    return mapa;
  }, [licenciasAsignadas]);

  const opcionesMoneda = monedas.map((m) => ({ id: m.id, etiqueta: `${m.codigo_iso} — ${m.nombre}` }));
  const opcionesCliente = cuentas.map((c) => ({ id: c.id, etiqueta: c.razon_social }));
  const opcionesEstadoAsignacion = ESTADOS_ASIGNACION.map((e) => ({ id: e, etiqueta: e }));

  const abrirCrear = () => {
    setLicenciaEnEdicion(null);
    setErrorGeneral("");
    setModalCatalogoAbierto(true);
  };
  const abrirEditar = (licencia: LicenciaCatalogo) => {
    setLicenciaEnEdicion(licencia);
    setErrorGeneral("");
    setModalCatalogoAbierto(true);
  };

  const handleEstado = async (id: string, activo: boolean) => {
    setFilaEnProceso(id);
    const resultado = await cambiarEstadoLicenciaCatalogo(id, activo);
    setFilaEnProceso(null);
    if (!resultado.ok) {
      setErrorGeneral(resultado.error);
      return;
    }
    router.refresh();
  };

  const handleEliminarAsignacion = async (id: string) => {
    setFilaEnProceso(id);
    const resultado = await eliminarLicenciaAsignada(id);
    setFilaEnProceso(null);
    if (!resultado.ok) {
      setErrorGeneral(resultado.error);
      return;
    }
    router.refresh();
  };

  const initialValuesCatalogo: LicenciaCatalogoFormType = {
    nombre_producto: licenciaEnEdicion?.nombre_producto ?? "",
    fabricante: licenciaEnEdicion?.fabricante ?? "",
    sku_proveedor: licenciaEnEdicion?.sku_proveedor ?? "",
    tipo: licenciaEnEdicion?.tipo ?? "",
    modelo_costo: licenciaEnEdicion?.modelo_costo ?? "",
    costo_unitario: licenciaEnEdicion ? String(licenciaEnEdicion.costo_unitario) : "",
    precio_venta_sugerido:
      licenciaEnEdicion?.precio_venta_sugerido != null ? String(licenciaEnEdicion.precio_venta_sugerido) : "",
    moneda_id: licenciaEnEdicion?.moneda_id ?? "",
    periodicidad_facturacion: licenciaEnEdicion?.periodicidad_facturacion ?? "",
    notas: licenciaEnEdicion?.notas ?? "",
  };

  const initialValuesAsignacion: LicenciaAsignadaFormType = {
    cliente_id: asignacionEnEdicion?.cliente_id ?? "",
    cantidad: asignacionEnEdicion ? String(asignacionEnEdicion.cantidad) : "1",
    fecha_inicio: asignacionEnEdicion?.fecha_inicio ?? hoyISO(),
    fecha_fin_vigencia: asignacionEnEdicion?.fecha_fin_vigencia ?? "",
    fecha_renovacion: asignacionEnEdicion?.fecha_renovacion ?? "",
    auto_renovar: asignacionEnEdicion?.auto_renovar ?? false,
    estado: asignacionEnEdicion?.estado ?? "ACTIVA",
    numero_orden_compra_proveedor: asignacionEnEdicion?.numero_orden_compra_proveedor ?? "",
    costo_total_periodo:
      asignacionEnEdicion?.costo_total_periodo != null ? String(asignacionEnEdicion.costo_total_periodo) : "",
    precio_venta_periodo:
      asignacionEnEdicion?.precio_venta_periodo != null ? String(asignacionEnEdicion.precio_venta_periodo) : "",
  };

  return (
    <div className="flex flex-col gap-4 py-2">
      {puedeCrear && (
        <div className="flex justify-end">
          <Button color="primary" size="sm" onPress={abrirCrear}>
            Nueva licencia
          </Button>
        </div>
      )}

      <p className="text-tiny text-default-400">
        La asignación a un proyecto se habilitará cuando exista el módulo de Contratos y Proyectos; por ahora una
        licencia se puede asignar a una cuenta de cliente.
      </p>

      {errorGeneral && <p className="text-danger text-sm">{errorGeneral}</p>}

      {licenciasCatalogo.length === 0 ? (
        <p className="text-default-500 text-sm">No hay licencias o suscripciones registradas todavía.</p>
      ) : (
        <Accordion variant="bordered" selectionMode="multiple">
          {licenciasCatalogo.map((licencia) => {
            const asignaciones = asignacionesPorLicencia.get(licencia.id) ?? [];
            const moneda = monedas.find((m) => m.id === licencia.moneda_id);
            return (
              <AccordionItem
                key={licencia.id}
                aria-label={licencia.nombre_producto}
                title={
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="font-medium">{licencia.nombre_producto}</span>
                    <Chip size="sm" color={licencia.activo ? "success" : "default"} variant="flat">
                      {licencia.activo ? "Activo" : "Inactivo"}
                    </Chip>
                    <Chip size="sm" variant="flat">
                      {TIPOS_LICENCIA.find((t) => t.id === licencia.tipo)?.etiqueta ?? licencia.tipo}
                    </Chip>
                    <span className="text-tiny text-default-400">
                      {formatearMoneda(licencia.costo_unitario, moneda?.codigo_iso)}/
                      {PERIODICIDADES.find((p) => p.id === licencia.periodicidad_facturacion)?.etiqueta ??
                        licencia.periodicidad_facturacion}
                    </span>
                    <span className="text-tiny text-default-400">
                      {asignaciones.length} asignación{asignaciones.length === 1 ? "" : "es"}
                    </span>
                  </div>
                }
              >
                <div className="flex flex-col gap-3 pb-2">
                  <div className="grid md:grid-cols-3 gap-x-6 gap-y-1 text-sm text-default-500">
                    {licencia.fabricante && <span>Fabricante: {licencia.fabricante}</span>}
                    {licencia.sku_proveedor && <span>SKU: {licencia.sku_proveedor}</span>}
                    <span>
                      Modelo de costo: {MODELOS_COSTO.find((m) => m.id === licencia.modelo_costo)?.etiqueta ??
                        licencia.modelo_costo}
                    </span>
                    {licencia.precio_venta_sugerido != null && (
                      <span>
                        Precio de venta sugerido: {formatearMoneda(licencia.precio_venta_sugerido, moneda?.codigo_iso)}
                      </span>
                    )}
                  </div>
                  {licencia.notas && <p className="text-default-500 text-sm">{licencia.notas}</p>}

                  {puedeEditar && (
                    <div className="flex gap-2 items-center flex-wrap">
                      <Button size="sm" variant="light" onPress={() => abrirEditar(licencia)}>
                        Editar licencia
                      </Button>
                      <div className="flex items-center gap-2">
                        <span className="text-tiny text-default-500">Activo</span>
                        <Switch
                          size="sm"
                          isSelected={licencia.activo}
                          isDisabled={filaEnProceso === licencia.id}
                          onValueChange={(activo) => handleEstado(licencia.id, activo)}
                        />
                      </div>
                      {puedeCrear && (
                        <Button
                          size="sm"
                          variant="flat"
                          color="primary"
                          onPress={() => {
                            setLicenciaParaAsignacion(licencia);
                            setAsignacionEnEdicion(null);
                            setErrorGeneral("");
                          }}
                        >
                          Nueva asignación
                        </Button>
                      )}
                    </div>
                  )}

                  <Table aria-label={`Asignaciones de ${licencia.nombre_producto}`} removeWrapper={false}>
                    <TableHeader>
                      <TableColumn>CLIENTE</TableColumn>
                      <TableColumn>CANTIDAD</TableColumn>
                      <TableColumn>VIGENCIA</TableColumn>
                      <TableColumn>ESTADO</TableColumn>
                      <TableColumn>AUTO-RENUEVA</TableColumn>
                      <TableColumn>ACCIONES</TableColumn>
                    </TableHeader>
                    <TableBody emptyContent="Esta licencia todavía no tiene asignaciones.">
                      {asignaciones.map((asignacion) => (
                        <TableRow key={asignacion.id}>
                          <TableCell>
                            {cuentas.find((c) => c.id === asignacion.cliente_id)?.razon_social ?? "—"}
                          </TableCell>
                          <TableCell>{asignacion.cantidad}</TableCell>
                          <TableCell className="text-tiny text-default-500">
                            {asignacion.fecha_inicio} → {asignacion.fecha_fin_vigencia}
                          </TableCell>
                          <TableCell>
                            <Chip size="sm" variant="flat" color={colorEstadoAsignacion(asignacion.estado)}>
                              {asignacion.estado}
                            </Chip>
                          </TableCell>
                          <TableCell>{asignacion.auto_renovar ? "Sí" : "No"}</TableCell>
                          <TableCell>
                            {puedeEditar && (
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  variant="light"
                                  onPress={() => {
                                    setLicenciaParaAsignacion(licencia);
                                    setAsignacionEnEdicion(asignacion);
                                    setErrorGeneral("");
                                  }}
                                >
                                  Editar
                                </Button>
                                <Button
                                  size="sm"
                                  variant="light"
                                  color="danger"
                                  isLoading={filaEnProceso === asignacion.id}
                                  onPress={() => handleEliminarAsignacion(asignacion.id)}
                                >
                                  Quitar
                                </Button>
                              </div>
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

      {/* Modal: crear/editar licencia del catálogo */}
      <Modal isOpen={modalCatalogoAbierto} onOpenChange={setModalCatalogoAbierto} size="2xl" scrollBehavior="inside">
        <ModalContent>
          {(cerrar) => (
            <Formik
              enableReinitialize
              initialValues={initialValuesCatalogo}
              validationSchema={LicenciaCatalogoSchema}
              onSubmit={async (valores) => {
                setGuardando(true);
                setErrorGeneral("");

                const formData = new FormData();
                Object.entries(valores).forEach(([clave, valor]) => {
                  formData.set(clave, valor ?? "");
                });

                const resultado = licenciaEnEdicion
                  ? await actualizarLicenciaCatalogo(licenciaEnEdicion.id, formData)
                  : await crearLicenciaCatalogo(formData);

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
                  <ModalHeader>{licenciaEnEdicion ? "Editar licencia" : "Nueva licencia"}</ModalHeader>
                  <ModalBody className="gap-4">
                    <Input
                      label="Nombre del producto"
                      variant="bordered"
                      value={values.nombre_producto}
                      onChange={handleChange("nombre_producto")}
                      isInvalid={!!errors.nombre_producto && !!touched.nombre_producto}
                      errorMessage={errors.nombre_producto}
                    />
                    <div className="grid grid-cols-2 gap-4">
                      <Input
                        label="Fabricante (opcional)"
                        variant="bordered"
                        value={values.fabricante}
                        onChange={handleChange("fabricante")}
                      />
                      <Input
                        label="SKU del proveedor (opcional)"
                        variant="bordered"
                        value={values.sku_proveedor}
                        onChange={handleChange("sku_proveedor")}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex flex-col gap-1">
                        <span className="text-small text-default-600">Tipo de licencia</span>
                        <DropdownSelector
                          etiquetaAria="Tipo de licencia"
                          opciones={TIPOS_LICENCIA}
                          valor={values.tipo || null}
                          onCambiar={(id) => setFieldValue("tipo", id ?? "")}
                        />
                        {!!errors.tipo && !!touched.tipo && (
                          <span className="text-tiny text-danger">{errors.tipo}</span>
                        )}
                      </div>
                      <div className="flex flex-col gap-1">
                        <span className="text-small text-default-600">Modelo de costo</span>
                        <DropdownSelector
                          etiquetaAria="Modelo de costo"
                          opciones={MODELOS_COSTO}
                          valor={values.modelo_costo || null}
                          onCambiar={(id) => setFieldValue("modelo_costo", id ?? "")}
                        />
                        {!!errors.modelo_costo && !!touched.modelo_costo && (
                          <span className="text-tiny text-danger">{errors.modelo_costo}</span>
                        )}
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <Input
                        label="Costo unitario"
                        type="number"
                        step="0.01"
                        variant="bordered"
                        value={values.costo_unitario}
                        onChange={handleChange("costo_unitario")}
                        isInvalid={!!errors.costo_unitario && !!touched.costo_unitario}
                        errorMessage={errors.costo_unitario}
                      />
                      <Input
                        label="Precio de venta sugerido (opcional)"
                        type="number"
                        step="0.01"
                        variant="bordered"
                        value={values.precio_venta_sugerido}
                        onChange={handleChange("precio_venta_sugerido")}
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
                    <div className="flex flex-col gap-1">
                      <span className="text-small text-default-600">Periodicidad de facturación</span>
                      <DropdownSelector
                        etiquetaAria="Periodicidad de facturación"
                        opciones={PERIODICIDADES}
                        valor={values.periodicidad_facturacion || null}
                        onCambiar={(id) => setFieldValue("periodicidad_facturacion", id ?? "")}
                      />
                      {!!errors.periodicidad_facturacion && !!touched.periodicidad_facturacion && (
                        <span className="text-tiny text-danger">{errors.periodicidad_facturacion}</span>
                      )}
                    </div>
                    <Textarea
                      label="Notas (opcional)"
                      variant="bordered"
                      value={values.notas}
                      onChange={handleChange("notas")}
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

      {/* Modal: crear/editar asignación */}
      <Modal
        isOpen={!!licenciaParaAsignacion}
        onOpenChange={(abierto) => !abierto && setLicenciaParaAsignacion(null)}
        size="2xl"
        scrollBehavior="inside"
      >
        <ModalContent>
          {(cerrar) => (
            <Formik
              enableReinitialize
              initialValues={initialValuesAsignacion}
              validationSchema={LicenciaAsignadaSchema}
              onSubmit={async (valores, { resetForm }) => {
                if (!licenciaParaAsignacion) return;
                setGuardando(true);
                setErrorGeneral("");

                const formData = new FormData();
                Object.entries(valores).forEach(([clave, valor]) => {
                  if (typeof valor === "boolean") {
                    formData.set(clave, valor ? "true" : "false");
                  } else {
                    formData.set(clave, valor ?? "");
                  }
                });

                const resultado = asignacionEnEdicion
                  ? await actualizarLicenciaAsignada(asignacionEnEdicion.id, formData)
                  : await crearLicenciaAsignada(licenciaParaAsignacion.id, formData);

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
                  <ModalHeader>
                    {asignacionEnEdicion ? "Editar asignación" : "Nueva asignación"} —{" "}
                    {licenciaParaAsignacion?.nombre_producto}
                  </ModalHeader>
                  <ModalBody className="gap-4">
                    <div className="flex flex-col gap-1">
                      <span className="text-small text-default-600">Cliente (opcional)</span>
                      <DropdownSelector
                        etiquetaAria="Cliente"
                        opciones={opcionesCliente}
                        valor={values.cliente_id || null}
                        onCambiar={(id) => setFieldValue("cliente_id", id ?? "")}
                        permitirVacio
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <Input
                        label="Cantidad"
                        type="number"
                        step="1"
                        variant="bordered"
                        value={values.cantidad}
                        onChange={handleChange("cantidad")}
                        isInvalid={!!errors.cantidad && !!touched.cantidad}
                        errorMessage={errors.cantidad}
                      />
                      <div className="flex flex-col gap-1">
                        <span className="text-small text-default-600">Estado</span>
                        <DropdownSelector
                          etiquetaAria="Estado"
                          opciones={opcionesEstadoAsignacion}
                          valor={values.estado || null}
                          onCambiar={(id) => setFieldValue("estado", id ?? "ACTIVA")}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
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
                        label="Fecha de fin de vigencia"
                        type="date"
                        variant="bordered"
                        value={values.fecha_fin_vigencia}
                        onChange={handleChange("fecha_fin_vigencia")}
                        isInvalid={!!errors.fecha_fin_vigencia && !!touched.fecha_fin_vigencia}
                        errorMessage={errors.fecha_fin_vigencia}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4 items-end">
                      <Input
                        label="Fecha de renovación (opcional)"
                        type="date"
                        variant="bordered"
                        value={values.fecha_renovacion}
                        onChange={handleChange("fecha_renovacion")}
                      />
                      <div className="flex items-center gap-2 pb-2">
                        <Switch
                          size="sm"
                          isSelected={values.auto_renovar}
                          onValueChange={(v) => setFieldValue("auto_renovar", v)}
                        />
                        <span className="text-small">Renueva automáticamente</span>
                      </div>
                    </div>
                    <Input
                      label="Número de orden de compra al proveedor (opcional)"
                      variant="bordered"
                      value={values.numero_orden_compra_proveedor}
                      onChange={handleChange("numero_orden_compra_proveedor")}
                    />
                    <div className="grid grid-cols-2 gap-4">
                      <Input
                        label="Costo total del período (opcional)"
                        type="number"
                        step="0.01"
                        variant="bordered"
                        value={values.costo_total_periodo}
                        onChange={handleChange("costo_total_periodo")}
                      />
                      <Input
                        label="Precio de venta del período (opcional)"
                        type="number"
                        step="0.01"
                        variant="bordered"
                        value={values.precio_venta_periodo}
                        onChange={handleChange("precio_venta_periodo")}
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
    </div>
  );
}
