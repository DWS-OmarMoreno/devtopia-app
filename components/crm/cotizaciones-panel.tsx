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
import {
  CotizacionSchema,
  CotizacionLineaSchema,
  CotizacionTransicionSchema,
  CotizacionSolicitarAprobacionSchema,
  CotizacionResolverAprobacionSchema,
  CotizacionConvertirProyectoSchema,
} from "@/helpers/schemas";
import type {
  CotizacionFormType,
  CotizacionLineaFormType,
  CotizacionTransicionFormType,
  CotizacionSolicitarAprobacionFormType,
  CotizacionResolverAprobacionFormType,
  CotizacionConvertirProyectoFormType,
} from "@/helpers/types";
import {
  crearCotizacion,
  actualizarCotizacion,
  agregarLineaCotizacion,
  actualizarLineaCotizacion,
  eliminarLineaCotizacion,
  cambiarEstadoCotizacion,
  solicitarAprobacion,
  resolverAprobacion,
} from "@/app/(app)/crm/cotizaciones-actions";
import { convertirCotizacionAProyecto } from "@/app/(app)/contratos-proyectos/actions";
import { TIPOS_CONTRATO } from "@/components/contratos-proyectos/contratos-panel";
import type { CuentaConRelaciones } from "./cuentas-panel";
import type { OportunidadConRelaciones } from "./oportunidades-panel";

export type CotizacionConRelaciones = Tables<"cotizaciones"> & {
  cuentas_clientes: { razon_social: string } | null;
  contactos: { nombre: string; apellido: string | null } | null;
  oportunidades: { codigo: string; nombre_oportunidad: string } | null;
  monedas: { codigo_iso: string } | null;
  responsable: { nombre_completo: string } | null;
  estados_ciclo_vida: { codigo_estado: string; etiqueta: string; color_ui: string | null } | null;
};

export type CotizacionAprobacionConRelaciones = Tables<"cotizaciones_aprobaciones"> & {
  aprobador: { nombre_completo: string } | null;
};

type LineaCotizacion = Tables<"cotizaciones_detalle">;

const TIPOS_ITEM = [
  { id: "SERVICIO", etiqueta: "Servicio" },
  { id: "ROL_TARIFA", etiqueta: "Rol / tarifa" },
  { id: "ITEM_LIBRE", etiqueta: "Ítem libre" },
];

const ESTADOS_EDITABLES = ["BORRADOR", "EN_REVISION"];

const COLOR_ESTADO: Record<string, "default" | "primary" | "secondary" | "success" | "warning" | "danger"> = {
  BORRADOR: "default",
  EN_REVISION: "warning",
  ENVIADA: "primary",
  ACEPTADA: "success",
  RECHAZADA: "danger",
  VENCIDA: "default",
  CONVERTIDA: "secondary",
};

const COLOR_APROBACION: Record<string, "warning" | "success" | "danger"> = {
  PENDIENTE: "warning",
  APROBADO: "success",
  RECHAZADO: "danger",
};

function formatearMoneda(valor: number | null, codigoIso: string | undefined): string {
  if (valor == null) return "—";
  const numero = valor.toLocaleString("es-CO", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return codigoIso ? `${codigoIso} ${numero}` : numero;
}

interface Props {
  cotizaciones: CotizacionConRelaciones[];
  cotizacionesDetalle: LineaCotizacion[];
  cotizacionesAprobaciones: CotizacionAprobacionConRelaciones[];
  estadosCotizacion: Tables<"estados_ciclo_vida">[];
  transicionesCotizacion: Tables<"workflows_transiciones">[];
  cuentas: CuentaConRelaciones[];
  contactos: Tables<"contactos">[];
  oportunidades: OportunidadConRelaciones[];
  monedas: Tables<"monedas">[];
  servicios: Tables<"catalogo_servicios">[];
  rolesTarifa: Tables<"catalogo_roles_tarifa">[];
  usuariosEmpresa: { id: string; nombre_completo: string }[];
  puedeCrear: boolean;
  puedeEditar: boolean;
  puedeAprobar: boolean;
  secuenciasProyecto: Tables<"secuencias_numeracion">[];
  puedeConvertirAProyecto: boolean;
}

export function CotizacionesPanel({
  cotizaciones,
  cotizacionesDetalle,
  cotizacionesAprobaciones,
  estadosCotizacion,
  transicionesCotizacion,
  cuentas,
  contactos,
  oportunidades,
  monedas,
  servicios,
  rolesTarifa,
  usuariosEmpresa,
  puedeCrear,
  puedeEditar,
  puedeAprobar,
  secuenciasProyecto,
  puedeConvertirAProyecto,
}: Props) {
  const router = useRouter();

  const [modalHeaderAbierto, setModalHeaderAbierto] = useState(false);
  const [cotizacionEnEdicionId, setCotizacionEnEdicionId] = useState<string | null>(null);
  const [cotizacionDetalleId, setCotizacionDetalleId] = useState<string | null>(null);
  const [modalLineaAbierto, setModalLineaAbierto] = useState(false);
  const [lineaEnEdicionId, setLineaEnEdicionId] = useState<string | null>(null);
  const [transicionSeleccionada, setTransicionSeleccionada] = useState<{
    id: string;
    destinoId: string;
    etiqueta: string;
    requiereComentario: boolean;
  } | null>(null);
  const [modalConvertirAbierto, setModalConvertirAbierto] = useState(false);
  const [modalAprobacionAbierto, setModalAprobacionAbierto] = useState(false);
  const [aprobacionAResolver, setAprobacionAResolver] = useState<{
    id: string;
    accion: "APROBADO" | "RECHAZADO";
  } | null>(null);
  const [errorGeneral, setErrorGeneral] = useState("");
  const [guardando, setGuardando] = useState(false);

  const cotizacionEnEdicion = cotizacionEnEdicionId
    ? cotizaciones.find((c) => c.id === cotizacionEnEdicionId) ?? null
    : null;
  const cotizacionDetalle = cotizacionDetalleId
    ? cotizaciones.find((c) => c.id === cotizacionDetalleId) ?? null
    : null;
  const lineaEnEdicion = lineaEnEdicionId
    ? cotizacionesDetalle.find((l) => l.id === lineaEnEdicionId) ?? null
    : null;

  const lineasDetalle = useMemo(
    () => cotizacionesDetalle.filter((l) => l.cotizacion_id === cotizacionDetalleId),
    [cotizacionesDetalle, cotizacionDetalleId]
  );
  const aprobacionesDetalle = useMemo(
    () => cotizacionesAprobaciones.filter((a) => a.cotizacion_id === cotizacionDetalleId),
    [cotizacionesAprobaciones, cotizacionDetalleId]
  );
  const transicionesDisponibles = useMemo(() => {
    if (!cotizacionDetalle) return [];
    return transicionesCotizacion
      .filter((t) => t.estado_origen_id === cotizacionDetalle.estado_id)
      .map((t) => ({
        transicion: t,
        destino: estadosCotizacion.find((e) => e.id === t.estado_destino_id) ?? null,
      }))
      .filter((t) => t.destino);
  }, [transicionesCotizacion, cotizacionDetalle, estadosCotizacion]);

  const opcionesCuenta = cuentas.map((c) => ({ id: c.id, etiqueta: c.razon_social }));
  const opcionesMoneda = monedas.map((m) => ({ id: m.id, etiqueta: `${m.codigo_iso} — ${m.nombre}` }));
  const opcionesResponsable = usuariosEmpresa.map((u) => ({ id: u.id, etiqueta: u.nombre_completo }));
  const opcionesAprobador = usuariosEmpresa.map((u) => ({ id: u.id, etiqueta: u.nombre_completo }));
  const opcionesServicio = servicios.map((s) => ({ id: s.id, etiqueta: `${s.codigo} — ${s.nombre}` }));
  const opcionesRolTarifa = rolesTarifa.map((r) => ({ id: r.id, etiqueta: r.nombre_rol }));
  const opcionesPm = usuariosEmpresa.map((u) => ({ id: u.id, etiqueta: u.nombre_completo }));
  const opcionesSecuenciaProyecto = secuenciasProyecto.map((s) => ({
    id: s.codigo_secuencia,
    etiqueta: `${s.prefijo ?? s.codigo_secuencia} (${s.codigo_secuencia})`,
  }));

  const puedeEditarCotizacionActual =
    puedeEditar && !!cotizacionDetalle && ESTADOS_EDITABLES.includes(cotizacionDetalle.estados_ciclo_vida?.codigo_estado ?? "");

  const abrirCrear = () => {
    setCotizacionEnEdicionId(null);
    setErrorGeneral("");
    setModalHeaderAbierto(true);
  };
  const abrirEditarHeader = (id: string) => {
    setCotizacionEnEdicionId(id);
    setErrorGeneral("");
    setModalHeaderAbierto(true);
  };
  const abrirDetalle = (id: string) => {
    setCotizacionDetalleId(id);
    setErrorGeneral("");
  };
  const abrirAgregarLinea = () => {
    setLineaEnEdicionId(null);
    setErrorGeneral("");
    setModalLineaAbierto(true);
  };
  const abrirEditarLinea = (id: string) => {
    setLineaEnEdicionId(id);
    setErrorGeneral("");
    setModalLineaAbierto(true);
  };

  const handleQuitarLinea = async (lineaId: string) => {
    if (!cotizacionDetalleId) return;
    setGuardando(true);
    const resultado = await eliminarLineaCotizacion(lineaId, cotizacionDetalleId);
    setGuardando(false);
    if (!resultado.ok) {
      setErrorGeneral(resultado.error);
      return;
    }
    router.refresh();
  };

  const initialValuesHeader: CotizacionFormType = {
    cuenta_id: cotizacionEnEdicion?.cuenta_id ?? "",
    contacto_id: cotizacionEnEdicion?.contacto_id ?? "",
    oportunidad_id: cotizacionEnEdicion?.oportunidad_id ?? "",
    fecha_validez_hasta: cotizacionEnEdicion?.fecha_validez_hasta ?? "",
    moneda_id: cotizacionEnEdicion?.moneda_id ?? "",
    descuento_pct: cotizacionEnEdicion?.descuento_pct != null ? String(cotizacionEnEdicion.descuento_pct) : "",
    impuestos_pct: cotizacionEnEdicion?.impuestos_pct != null ? String(cotizacionEnEdicion.impuestos_pct) : "",
    condiciones_pago: cotizacionEnEdicion?.condiciones_pago ?? "",
    condiciones_comerciales: cotizacionEnEdicion?.condiciones_comerciales ?? "",
    tiempo_estimado_entrega: cotizacionEnEdicion?.tiempo_estimado_entrega ?? "",
    responsable_comercial_id: cotizacionEnEdicion?.responsable_comercial_id ?? "",
    archivo_pdf_url: cotizacionEnEdicion?.archivo_pdf_url ?? "",
  };

  const initialValuesLinea: CotizacionLineaFormType = {
    tipo_item: lineaEnEdicion?.tipo_item ?? "SERVICIO",
    servicio_id: lineaEnEdicion?.servicio_id ?? "",
    rol_tarifa_id: lineaEnEdicion?.rol_tarifa_id ?? "",
    descripcion: lineaEnEdicion?.descripcion ?? "",
    cantidad: lineaEnEdicion ? String(lineaEnEdicion.cantidad) : "1",
    unidad_medida: lineaEnEdicion?.unidad_medida ?? "",
    precio_unitario: lineaEnEdicion ? String(lineaEnEdicion.precio_unitario) : "",
    descuento_linea_pct:
      lineaEnEdicion?.descuento_linea_pct != null ? String(lineaEnEdicion.descuento_linea_pct) : "",
  };

  const initialValuesTransicion: CotizacionTransicionFormType = { comentario: "" };
  const initialValuesAprobacion: CotizacionSolicitarAprobacionFormType = { aprobador_id: "" };
  const initialValuesResolver: CotizacionResolverAprobacionFormType = { comentario: "" };
  const initialValuesConvertir: CotizacionConvertirProyectoFormType = {
    tipo_contrato: "",
    fecha_inicio_contrato: new Date().toISOString().slice(0, 10),
    contacto_firmante_id: "",
    forma_pago: "",
    plazo_pago_dias: "",
    pm_id: "",
    nombre_proyecto: cotizacionDetalle?.numero_cotizacion ?? "",
    tipo_proyecto: "",
    codigo_secuencia_proyecto: "",
    fecha_inicio_planeada: "",
    fecha_fin_planeada: "",
  };

  return (
    <div className="flex flex-col gap-4 py-2">
      {puedeCrear && (
        <div className="flex justify-end">
          <Button color="primary" size="sm" onPress={abrirCrear} isDisabled={cuentas.length === 0}>
            Nueva cotización
          </Button>
        </div>
      )}
      {puedeCrear && cuentas.length === 0 && (
        <p className="text-tiny text-warning-600">
          Crea primero una cuenta de cliente en la pestaña Cuentas para poder cotizar.
        </p>
      )}

      {errorGeneral && !cotizacionDetalleId && <p className="text-danger text-sm">{errorGeneral}</p>}

      {cotizaciones.length === 0 ? (
        <p className="text-default-500 text-sm">No hay cotizaciones registradas todavía.</p>
      ) : (
        <Table aria-label="Cotizaciones" removeWrapper={false}>
          <TableHeader>
            <TableColumn>NÚMERO</TableColumn>
            <TableColumn>CUENTA</TableColumn>
            <TableColumn>ESTADO</TableColumn>
            <TableColumn>TOTAL</TableColumn>
            <TableColumn>VÁLIDA HASTA</TableColumn>
            <TableColumn>RESPONSABLE</TableColumn>
            <TableColumn>ACCIONES</TableColumn>
          </TableHeader>
          <TableBody>
            {cotizaciones.map((cotizacion) => (
              <TableRow key={cotizacion.id}>
                <TableCell className="font-mono text-tiny">{cotizacion.numero_cotizacion}</TableCell>
                <TableCell>{cotizacion.cuentas_clientes?.razon_social ?? "—"}</TableCell>
                <TableCell>
                  <Chip
                    size="sm"
                    variant="flat"
                    color={COLOR_ESTADO[cotizacion.estados_ciclo_vida?.codigo_estado ?? ""] ?? "default"}
                  >
                    {cotizacion.estados_ciclo_vida?.etiqueta ?? "—"}
                  </Chip>
                </TableCell>
                <TableCell>{formatearMoneda(cotizacion.total, cotizacion.monedas?.codigo_iso)}</TableCell>
                <TableCell className="text-tiny text-default-500">{cotizacion.fecha_validez_hasta}</TableCell>
                <TableCell className="text-tiny text-default-500">
                  {cotizacion.responsable?.nombre_completo ?? "—"}
                </TableCell>
                <TableCell>
                  <Button size="sm" variant="light" onPress={() => abrirDetalle(cotizacion.id)}>
                    Ver / Gestionar
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {/* Modal: crear/editar encabezado de cotización */}
      <Modal isOpen={modalHeaderAbierto} onOpenChange={setModalHeaderAbierto} size="3xl" scrollBehavior="inside">
        <ModalContent>
          {(cerrar) => (
            <Formik
              enableReinitialize
              initialValues={initialValuesHeader}
              validationSchema={CotizacionSchema}
              onSubmit={async (valores) => {
                setGuardando(true);
                setErrorGeneral("");

                const formData = new FormData();
                Object.entries(valores).forEach(([clave, valor]) => {
                  formData.set(clave, valor ?? "");
                });

                const resultado = cotizacionEnEdicion
                  ? await actualizarCotizacion(cotizacionEnEdicion.id, formData)
                  : await crearCotizacion(formData);

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
                const contactosDeLaCuenta = contactos
                  .filter((c) => c.cuenta_id === values.cuenta_id)
                  .map((c) => ({ id: c.id, etiqueta: `${c.nombre} ${c.apellido ?? ""}`.trim() }));
                const oportunidadesDeLaCuenta = oportunidades
                  .filter((o) => o.cuenta_id === values.cuenta_id)
                  .map((o) => ({ id: o.id, etiqueta: `${o.codigo} — ${o.nombre_oportunidad}` }));

                return (
                  <>
                    <ModalHeader>{cotizacionEnEdicion ? "Editar cotización" : "Nueva cotización"}</ModalHeader>
                    <ModalBody className="gap-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="flex flex-col gap-1">
                          <span className="text-small text-default-600">Cuenta</span>
                          <DropdownSelector
                            etiquetaAria="Cuenta"
                            opciones={opcionesCuenta}
                            valor={values.cuenta_id || null}
                            onCambiar={(id) => {
                              setFieldValue("cuenta_id", id ?? "");
                              setFieldValue("contacto_id", "");
                              setFieldValue("oportunidad_id", "");
                            }}
                          />
                          {!!errors.cuenta_id && !!touched.cuenta_id && (
                            <span className="text-tiny text-danger">{errors.cuenta_id}</span>
                          )}
                        </div>
                        <div className="flex flex-col gap-1">
                          <span className="text-small text-default-600">Contacto (opcional)</span>
                          <DropdownSelector
                            etiquetaAria="Contacto"
                            opciones={contactosDeLaCuenta}
                            valor={values.contacto_id || null}
                            onCambiar={(id) => setFieldValue("contacto_id", id ?? "")}
                            permitirVacio
                            isDisabled={!values.cuenta_id}
                          />
                        </div>
                      </div>
                      <div className="flex flex-col gap-1">
                        <span className="text-small text-default-600">Oportunidad de origen (opcional)</span>
                        <DropdownSelector
                          etiquetaAria="Oportunidad de origen"
                          opciones={oportunidadesDeLaCuenta}
                          valor={values.oportunidad_id || null}
                          onCambiar={(id) => setFieldValue("oportunidad_id", id ?? "")}
                          permitirVacio
                          isDisabled={!values.cuenta_id}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <Input
                          label="Válida hasta"
                          type="date"
                          variant="bordered"
                          value={values.fecha_validez_hasta}
                          onChange={handleChange("fecha_validez_hasta")}
                          isInvalid={!!errors.fecha_validez_hasta && !!touched.fecha_validez_hasta}
                          errorMessage={errors.fecha_validez_hasta}
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
                        <span className="text-small text-default-600">Responsable comercial</span>
                        <DropdownSelector
                          etiquetaAria="Responsable comercial"
                          opciones={opcionesResponsable}
                          valor={values.responsable_comercial_id || null}
                          onCambiar={(id) => setFieldValue("responsable_comercial_id", id ?? "")}
                        />
                        {!!errors.responsable_comercial_id && !!touched.responsable_comercial_id && (
                          <span className="text-tiny text-danger">{errors.responsable_comercial_id}</span>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <Input
                          label="Descuento global % (opcional)"
                          type="number"
                          step="0.01"
                          variant="bordered"
                          value={values.descuento_pct}
                          onChange={handleChange("descuento_pct")}
                          isInvalid={!!errors.descuento_pct && !!touched.descuento_pct}
                          errorMessage={errors.descuento_pct}
                        />
                        <Input
                          label="Impuestos % (opcional)"
                          type="number"
                          step="0.01"
                          variant="bordered"
                          value={values.impuestos_pct}
                          onChange={handleChange("impuestos_pct")}
                          isInvalid={!!errors.impuestos_pct && !!touched.impuestos_pct}
                          errorMessage={errors.impuestos_pct}
                        />
                      </div>
                      <Textarea
                        label="Condiciones de pago (opcional)"
                        variant="bordered"
                        value={values.condiciones_pago}
                        onChange={handleChange("condiciones_pago")}
                      />
                      <Textarea
                        label="Condiciones comerciales (opcional)"
                        variant="bordered"
                        value={values.condiciones_comerciales}
                        onChange={handleChange("condiciones_comerciales")}
                      />
                      <Input
                        label="Tiempo estimado de entrega (opcional)"
                        variant="bordered"
                        value={values.tiempo_estimado_entrega}
                        onChange={handleChange("tiempo_estimado_entrega")}
                      />
                      <Input
                        label="URL del PDF (opcional, se genera fuera de la app por ahora)"
                        variant="bordered"
                        value={values.archivo_pdf_url}
                        onChange={handleChange("archivo_pdf_url")}
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

      {/* Modal: detalle / gestión de una cotización */}
      <Modal
        isOpen={!!cotizacionDetalleId}
        onOpenChange={(abierto) => !abierto && setCotizacionDetalleId(null)}
        size="5xl"
        scrollBehavior="inside"
      >
        <ModalContent>
          {() =>
            cotizacionDetalle && (
              <>
                <ModalHeader className="flex flex-col items-start gap-1">
                  <div className="flex items-center gap-3">
                    <span>{cotizacionDetalle.numero_cotizacion}</span>
                    <Chip
                      size="sm"
                      variant="flat"
                      color={COLOR_ESTADO[cotizacionDetalle.estados_ciclo_vida?.codigo_estado ?? ""] ?? "default"}
                    >
                      {cotizacionDetalle.estados_ciclo_vida?.etiqueta ?? "—"}
                    </Chip>
                  </div>
                  <span className="text-small text-default-500 font-normal">
                    {cotizacionDetalle.cuentas_clientes?.razon_social ?? "—"}
                    {cotizacionDetalle.contactos?.nombre
                      ? ` · ${cotizacionDetalle.contactos.nombre} ${cotizacionDetalle.contactos.apellido ?? ""}`
                      : ""}
                    {cotizacionDetalle.oportunidades?.codigo
                      ? ` · Origen: ${cotizacionDetalle.oportunidades.codigo}`
                      : ""}
                  </span>
                </ModalHeader>
                <ModalBody className="gap-4">
                  {errorGeneral && <p className="text-danger text-sm">{errorGeneral}</p>}

                  <div className="grid md:grid-cols-4 gap-x-6 gap-y-1 text-sm text-default-500">
                    <span>Válida hasta: {cotizacionDetalle.fecha_validez_hasta}</span>
                    <span>Responsable: {cotizacionDetalle.responsable?.nombre_completo ?? "—"}</span>
                    <span>Entrega estimada: {cotizacionDetalle.tiempo_estimado_entrega ?? "—"}</span>
                    <span>Versión: {cotizacionDetalle.version}</span>
                    {cotizacionDetalle.condiciones_pago && (
                      <span className="md:col-span-2">Condiciones de pago: {cotizacionDetalle.condiciones_pago}</span>
                    )}
                    {cotizacionDetalle.condiciones_comerciales && (
                      <span className="md:col-span-2">
                        Condiciones comerciales: {cotizacionDetalle.condiciones_comerciales}
                      </span>
                    )}
                    {cotizacionDetalle.motivo_rechazo && (
                      <span className="md:col-span-4 text-danger">
                        Motivo de rechazo: {cotizacionDetalle.motivo_rechazo}
                      </span>
                    )}
                  </div>

                  {puedeEditar && (
                    <div>
                      <Button size="sm" variant="light" onPress={() => abrirEditarHeader(cotizacionDetalle.id)}>
                        Editar datos generales
                      </Button>
                      {!puedeEditarCotizacionActual && (
                        <span className="text-tiny text-default-400 ml-2">
                          Solo se puede editar en Borrador o En revisión interna.
                        </span>
                      )}
                    </div>
                  )}

                  <Divider />

                  {/* Líneas de detalle */}
                  <div className="flex items-center justify-between">
                    <span className="text-small font-medium">Ítems cotizados</span>
                    {puedeEditarCotizacionActual && (
                      <Button size="sm" variant="flat" color="primary" onPress={abrirAgregarLinea}>
                        Agregar ítem
                      </Button>
                    )}
                  </div>
                  <Table aria-label="Ítems de la cotización" removeWrapper={false}>
                    <TableHeader>
                      <TableColumn>TIPO</TableColumn>
                      <TableColumn>DESCRIPCIÓN</TableColumn>
                      <TableColumn>CANTIDAD</TableColumn>
                      <TableColumn>UNIDAD</TableColumn>
                      <TableColumn>PRECIO UNIT.</TableColumn>
                      <TableColumn>DESC. %</TableColumn>
                      <TableColumn>SUBTOTAL</TableColumn>
                      <TableColumn>ACCIONES</TableColumn>
                    </TableHeader>
                    <TableBody emptyContent="Esta cotización todavía no tiene ítems.">
                      {lineasDetalle.map((linea) => {
                        const servicio = servicios.find((s) => s.id === linea.servicio_id);
                        return (
                          <TableRow key={linea.id}>
                            <TableCell>
                              <div className="flex flex-col gap-1">
                                <Chip size="sm" variant="flat">
                                  {TIPOS_ITEM.find((t) => t.id === linea.tipo_item)?.etiqueta ?? linea.tipo_item}
                                </Chip>
                                {servicio?.requiere_aprobacion_cotizacion && (
                                  <span className="text-tiny text-warning-600">Requiere aprobación</span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>{linea.descripcion}</TableCell>
                            <TableCell>{linea.cantidad}</TableCell>
                            <TableCell>{linea.unidad_medida}</TableCell>
                            <TableCell>{formatearMoneda(linea.precio_unitario, undefined)}</TableCell>
                            <TableCell>{linea.descuento_linea_pct ?? 0}%</TableCell>
                            <TableCell className="font-medium">
                              {formatearMoneda(linea.subtotal_linea, undefined)}
                            </TableCell>
                            <TableCell>
                              {puedeEditarCotizacionActual && (
                                <div className="flex gap-2">
                                  <Button size="sm" variant="light" onPress={() => abrirEditarLinea(linea.id)}>
                                    Editar
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="light"
                                    color="danger"
                                    isDisabled={guardando}
                                    onPress={() => handleQuitarLinea(linea.id)}
                                  >
                                    Quitar
                                  </Button>
                                </div>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>

                  <div className="flex flex-col items-end gap-1 text-sm">
                    <span>Subtotal: {formatearMoneda(cotizacionDetalle.subtotal, cotizacionDetalle.monedas?.codigo_iso)}</span>
                    {!!cotizacionDetalle.descuento_valor && (
                      <span>
                        Descuento ({cotizacionDetalle.descuento_pct ?? 0}%): -
                        {formatearMoneda(cotizacionDetalle.descuento_valor, cotizacionDetalle.monedas?.codigo_iso)}
                      </span>
                    )}
                    {!!cotizacionDetalle.impuestos_valor && (
                      <span>
                        Impuestos ({cotizacionDetalle.impuestos_pct ?? 0}%): +
                        {formatearMoneda(cotizacionDetalle.impuestos_valor, cotizacionDetalle.monedas?.codigo_iso)}
                      </span>
                    )}
                    <span className="text-lg font-semibold">
                      Total: {formatearMoneda(cotizacionDetalle.total, cotizacionDetalle.monedas?.codigo_iso)}
                    </span>
                  </div>

                  <Divider />

                  {/* Flujo de estados */}
                  <div className="flex flex-col gap-2">
                    <span className="text-small font-medium">Cambiar estado</span>
                    {puedeEditar && transicionesDisponibles.length > 0 ? (
                      <div className="flex gap-2 flex-wrap">
                        {transicionesDisponibles.map(({ transicion, destino }) =>
                          destino!.codigo_estado === "CONVERTIDA" ? null : (
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
                          )
                        )}
                      </div>
                    ) : (
                      <span className="text-tiny text-default-400">
                        No hay transiciones disponibles desde este estado.
                      </span>
                    )}
                    {transicionesDisponibles.some((t) => t.destino!.codigo_estado === "CONVERTIDA") &&
                      (puedeConvertirAProyecto ? (
                        <div>
                          <Button
                            size="sm"
                            variant="flat"
                            color="secondary"
                            onPress={() => setModalConvertirAbierto(true)}
                          >
                            Convertir a proyecto
                          </Button>
                        </div>
                      ) : (
                        <span className="text-tiny text-default-400">
                          Convertir a proyecto requiere permisos de creación en Contratos y Proyectos.
                        </span>
                      ))}
                  </div>

                  <Divider />

                  {/* Aprobaciones */}
                  <div className="flex items-center justify-between">
                    <span className="text-small font-medium">Aprobaciones</span>
                    {puedeEditar && (
                      <Button size="sm" variant="flat" color="primary" onPress={() => setModalAprobacionAbierto(true)}>
                        Solicitar aprobación
                      </Button>
                    )}
                  </div>
                  <Table aria-label="Aprobaciones de la cotización" removeWrapper={false}>
                    <TableHeader>
                      <TableColumn>APROBADOR</TableColumn>
                      <TableColumn>ESTADO</TableColumn>
                      <TableColumn>SOLICITADA</TableColumn>
                      <TableColumn>RESUELTA</TableColumn>
                      <TableColumn>COMENTARIO</TableColumn>
                      <TableColumn>ACCIONES</TableColumn>
                    </TableHeader>
                    <TableBody emptyContent="No se ha solicitado ninguna aprobación todavía.">
                      {aprobacionesDetalle.map((aprobacion) => (
                        <TableRow key={aprobacion.id}>
                          <TableCell>{aprobacion.aprobador?.nombre_completo ?? "—"}</TableCell>
                          <TableCell>
                            <Chip size="sm" variant="flat" color={COLOR_APROBACION[aprobacion.estado] ?? "default"}>
                              {aprobacion.estado}
                            </Chip>
                          </TableCell>
                          <TableCell className="text-tiny text-default-500">
                            {new Date(aprobacion.fecha_solicitud).toLocaleString("es-CO")}
                          </TableCell>
                          <TableCell className="text-tiny text-default-500">
                            {aprobacion.fecha_resolucion
                              ? new Date(aprobacion.fecha_resolucion).toLocaleString("es-CO")
                              : "—"}
                          </TableCell>
                          <TableCell>{aprobacion.comentario ?? "—"}</TableCell>
                          <TableCell>
                            {puedeAprobar && aprobacion.estado === "PENDIENTE" && (
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  variant="flat"
                                  color="success"
                                  onPress={() => setAprobacionAResolver({ id: aprobacion.id, accion: "APROBADO" })}
                                >
                                  Aprobar
                                </Button>
                                <Button
                                  size="sm"
                                  variant="flat"
                                  color="danger"
                                  onPress={() => setAprobacionAResolver({ id: aprobacion.id, accion: "RECHAZADO" })}
                                >
                                  Rechazar
                                </Button>
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ModalBody>
                <ModalFooter>
                  <Button variant="flat" onPress={() => setCotizacionDetalleId(null)}>
                    Cerrar
                  </Button>
                </ModalFooter>
              </>
            )
          }
        </ModalContent>
      </Modal>

      {/* Modal: agregar/editar línea de detalle */}
      <Modal isOpen={modalLineaAbierto} onOpenChange={setModalLineaAbierto} size="2xl" scrollBehavior="inside">
        <ModalContent>
          {(cerrar) => (
            <Formik
              enableReinitialize
              initialValues={initialValuesLinea}
              validationSchema={CotizacionLineaSchema}
              onSubmit={async (valores, { resetForm }) => {
                if (!cotizacionDetalleId) return;
                setGuardando(true);
                setErrorGeneral("");

                const formData = new FormData();
                Object.entries(valores).forEach(([clave, valor]) => {
                  formData.set(clave, valor ?? "");
                });

                const resultado = lineaEnEdicion
                  ? await actualizarLineaCotizacion(lineaEnEdicion.id, cotizacionDetalleId, formData)
                  : await agregarLineaCotizacion(cotizacionDetalleId, formData);

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
              {({ values, errors, touched, handleChange, handleSubmit, setFieldValue }) => {
                const cantidad = Number(values.cantidad) || 0;
                const precio = Number(values.precio_unitario) || 0;
                const descuento = Number(values.descuento_linea_pct) || 0;
                const subtotalPreview = cantidad * precio * (1 - descuento / 100);

                return (
                  <>
                    <ModalHeader>{lineaEnEdicion ? "Editar ítem" : "Agregar ítem"}</ModalHeader>
                    <ModalBody className="gap-4">
                      <div className="flex flex-col gap-1">
                        <span className="text-small text-default-600">Tipo de ítem</span>
                        <DropdownSelector
                          etiquetaAria="Tipo de ítem"
                          opciones={TIPOS_ITEM}
                          valor={values.tipo_item || null}
                          onCambiar={(id) => {
                            setFieldValue("tipo_item", id ?? "SERVICIO");
                            setFieldValue("servicio_id", "");
                            setFieldValue("rol_tarifa_id", "");
                          }}
                        />
                      </div>

                      {values.tipo_item === "SERVICIO" && (
                        <div className="flex flex-col gap-1">
                          <span className="text-small text-default-600">Servicio del catálogo</span>
                          <DropdownSelector
                            etiquetaAria="Servicio"
                            opciones={opcionesServicio}
                            valor={values.servicio_id || null}
                            permitirVacio
                            etiquetaVacio="— Elegir del catálogo —"
                            onCambiar={(id) => {
                              setFieldValue("servicio_id", id ?? "");
                              const servicio = servicios.find((s) => s.id === id);
                              if (servicio) {
                                setFieldValue("descripcion", servicio.nombre);
                                setFieldValue("unidad_medida", servicio.unidad_medida);
                                setFieldValue("precio_unitario", String(servicio.tarifa_estandar));
                              }
                            }}
                          />
                        </div>
                      )}

                      {values.tipo_item === "ROL_TARIFA" && (
                        <div className="flex flex-col gap-1">
                          <span className="text-small text-default-600">Rol / tarifa del catálogo</span>
                          <DropdownSelector
                            etiquetaAria="Rol / tarifa"
                            opciones={opcionesRolTarifa}
                            valor={values.rol_tarifa_id || null}
                            permitirVacio
                            etiquetaVacio="— Elegir del catálogo —"
                            onCambiar={(id) => {
                              setFieldValue("rol_tarifa_id", id ?? "");
                              const rol = rolesTarifa.find((r) => r.id === id);
                              if (rol) {
                                setFieldValue("descripcion", rol.nombre_rol);
                                setFieldValue("unidad_medida", "HORA");
                                setFieldValue("precio_unitario", String(rol.tarifa_hora_estandar));
                              }
                            }}
                          />
                        </div>
                      )}

                      <Input
                        label="Descripción"
                        variant="bordered"
                        value={values.descripcion}
                        onChange={handleChange("descripcion")}
                        isInvalid={!!errors.descripcion && !!touched.descripcion}
                        errorMessage={errors.descripcion}
                      />
                      <div className="grid grid-cols-3 gap-4">
                        <Input
                          label="Cantidad"
                          type="number"
                          step="0.01"
                          variant="bordered"
                          value={values.cantidad}
                          onChange={handleChange("cantidad")}
                          isInvalid={!!errors.cantidad && !!touched.cantidad}
                          errorMessage={errors.cantidad}
                        />
                        <Input
                          label="Unidad de medida"
                          variant="bordered"
                          value={values.unidad_medida}
                          onChange={handleChange("unidad_medida")}
                          isInvalid={!!errors.unidad_medida && !!touched.unidad_medida}
                          errorMessage={errors.unidad_medida}
                        />
                        <Input
                          label="Precio unitario"
                          type="number"
                          step="0.01"
                          variant="bordered"
                          value={values.precio_unitario}
                          onChange={handleChange("precio_unitario")}
                          isInvalid={!!errors.precio_unitario && !!touched.precio_unitario}
                          errorMessage={errors.precio_unitario}
                        />
                      </div>
                      <Input
                        label="Descuento de línea % (opcional)"
                        type="number"
                        step="0.01"
                        variant="bordered"
                        value={values.descuento_linea_pct}
                        onChange={handleChange("descuento_linea_pct")}
                        isInvalid={!!errors.descuento_linea_pct && !!touched.descuento_linea_pct}
                        errorMessage={errors.descuento_linea_pct}
                      />
                      <p className="text-small text-default-500">
                        Subtotal estimado: {formatearMoneda(subtotalPreview, undefined)} (el total real lo calcula
                        el servidor al guardar).
                      </p>
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

      {/* Modal: confirmar transición de estado */}
      <Modal isOpen={!!transicionSeleccionada} onOpenChange={(abierto) => !abierto && setTransicionSeleccionada(null)}>
        <ModalContent>
          {(cerrar) => (
            <Formik
              initialValues={initialValuesTransicion}
              validationSchema={CotizacionTransicionSchema}
              onSubmit={async (valores, { resetForm }) => {
                if (!cotizacionDetalleId || !transicionSeleccionada) return;
                if (transicionSeleccionada.requiereComentario && !valores.comentario.trim()) {
                  setErrorGeneral("Este cambio de estado requiere un comentario.");
                  return;
                }
                setGuardando(true);
                setErrorGeneral("");

                const resultado = await cambiarEstadoCotizacion(
                  cotizacionDetalleId,
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
                      label={
                        transicionSeleccionada?.requiereComentario ? "Comentario (obligatorio)" : "Comentario (opcional)"
                      }
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

      {/* Modal: convertir cotización a contrato + proyecto */}
      <Modal isOpen={modalConvertirAbierto} onOpenChange={setModalConvertirAbierto} size="3xl" scrollBehavior="inside">
        <ModalContent>
          {(cerrar) => (
            <Formik
              enableReinitialize
              initialValues={initialValuesConvertir}
              validationSchema={CotizacionConvertirProyectoSchema}
              onSubmit={async (valores, { resetForm }) => {
                if (!cotizacionDetalleId) return;
                setGuardando(true);
                setErrorGeneral("");

                const formData = new FormData();
                Object.entries(valores).forEach(([clave, valor]) => {
                  formData.set(clave, valor ?? "");
                });

                const resultado = await convertirCotizacionAProyecto(cotizacionDetalleId, formData);

                setGuardando(false);

                if (!resultado.ok) {
                  setErrorGeneral(resultado.error);
                  return;
                }

                resetForm();
                router.refresh();
                setModalConvertirAbierto(false);
                cerrar();
              }}
            >
              {({ values, errors, touched, handleChange, handleSubmit, setFieldValue }) => (
                <>
                  <ModalHeader>Convertir a proyecto — {cotizacionDetalle?.numero_cotizacion}</ModalHeader>
                  <ModalBody className="gap-4">
                    <p className="text-small text-default-500">
                      Esto crea un contrato y un proyecto nuevos a partir de esta cotización, en una sola
                      operación atómica, y deja la cotización en estado Convertida.
                    </p>

                    <span className="text-small font-semibold">Datos del contrato</span>
                    <div className="grid grid-cols-2 gap-4">
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
                      <Input
                        label="Fecha de inicio del contrato"
                        type="date"
                        variant="bordered"
                        value={values.fecha_inicio_contrato}
                        onChange={handleChange("fecha_inicio_contrato")}
                        isInvalid={!!errors.fecha_inicio_contrato && !!touched.fecha_inicio_contrato}
                        errorMessage={errors.fecha_inicio_contrato}
                      />
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

                    <Divider />

                    <span className="text-small font-semibold">Datos del proyecto</span>
                    <Input
                      label="Nombre del proyecto"
                      variant="bordered"
                      value={values.nombre_proyecto}
                      onChange={handleChange("nombre_proyecto")}
                      isInvalid={!!errors.nombre_proyecto && !!touched.nombre_proyecto}
                      errorMessage={errors.nombre_proyecto}
                    />
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex flex-col gap-1">
                        <span className="text-small text-default-600">PM</span>
                        <DropdownSelector
                          etiquetaAria="PM"
                          opciones={opcionesPm}
                          valor={values.pm_id || null}
                          onCambiar={(id) => setFieldValue("pm_id", id ?? "")}
                        />
                        {!!errors.pm_id && !!touched.pm_id && <span className="text-tiny text-danger">{errors.pm_id}</span>}
                      </div>
                      <div className="flex flex-col gap-1">
                        <span className="text-small text-default-600">Secuencia de numeración</span>
                        <DropdownSelector
                          etiquetaAria="Secuencia de numeración"
                          opciones={opcionesSecuenciaProyecto}
                          valor={values.codigo_secuencia_proyecto || null}
                          onCambiar={(id) => setFieldValue("codigo_secuencia_proyecto", id ?? "")}
                        />
                        {!!errors.codigo_secuencia_proyecto && !!touched.codigo_secuencia_proyecto && (
                          <span className="text-tiny text-danger">{errors.codigo_secuencia_proyecto}</span>
                        )}
                      </div>
                    </div>
                    <Input
                      label="Tipo de proyecto (opcional)"
                      variant="bordered"
                      value={values.tipo_proyecto}
                      onChange={handleChange("tipo_proyecto")}
                    />
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
                    <p className="text-tiny text-default-400">
                      El firmante del contrato y el aprobador del cliente para los hitos se asignan después,
                      desde el módulo de Contratos y Proyectos — todavía no tienen selector aquí porque
                      requieren acceso a Contactos.
                    </p>
                    {errorGeneral && <p className="text-danger text-sm">{errorGeneral}</p>}
                  </ModalBody>
                  <ModalFooter>
                    <Button variant="flat" onPress={cerrar}>
                      Cancelar
                    </Button>
                    <Button color="secondary" isLoading={guardando} onPress={() => handleSubmit()}>
                      Convertir
                    </Button>
                  </ModalFooter>
                </>
              )}
            </Formik>
          )}
        </ModalContent>
      </Modal>

      {/* Modal: solicitar aprobación */}
      <Modal isOpen={modalAprobacionAbierto} onOpenChange={setModalAprobacionAbierto}>
        <ModalContent>
          {(cerrar) => (
            <Formik
              initialValues={initialValuesAprobacion}
              validationSchema={CotizacionSolicitarAprobacionSchema}
              onSubmit={async (valores, { resetForm }) => {
                if (!cotizacionDetalleId) return;
                setGuardando(true);
                setErrorGeneral("");

                const formData = new FormData();
                formData.set("aprobador_id", valores.aprobador_id);

                const resultado = await solicitarAprobacion(cotizacionDetalleId, formData);
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
                  <ModalHeader>Solicitar aprobación</ModalHeader>
                  <ModalBody className="gap-4">
                    <div className="flex flex-col gap-1">
                      <span className="text-small text-default-600">Aprobador</span>
                      <DropdownSelector
                        etiquetaAria="Aprobador"
                        opciones={opcionesAprobador}
                        valor={values.aprobador_id || null}
                        onCambiar={(id) => setFieldValue("aprobador_id", id ?? "")}
                      />
                      {!!errors.aprobador_id && !!touched.aprobador_id && (
                        <span className="text-tiny text-danger">{errors.aprobador_id}</span>
                      )}
                    </div>
                    {errorGeneral && <p className="text-danger text-sm">{errorGeneral}</p>}
                  </ModalBody>
                  <ModalFooter>
                    <Button variant="flat" onPress={cerrar}>
                      Cancelar
                    </Button>
                    <Button color="primary" isLoading={guardando} onPress={() => handleSubmit()}>
                      Solicitar
                    </Button>
                  </ModalFooter>
                </>
              )}
            </Formik>
          )}
        </ModalContent>
      </Modal>

      {/* Modal: aprobar/rechazar */}
      <Modal isOpen={!!aprobacionAResolver} onOpenChange={(abierto) => !abierto && setAprobacionAResolver(null)}>
        <ModalContent>
          {(cerrar) => (
            <Formik
              initialValues={initialValuesResolver}
              validationSchema={CotizacionResolverAprobacionSchema}
              onSubmit={async (valores, { resetForm }) => {
                if (!cotizacionDetalleId || !aprobacionAResolver) return;
                setGuardando(true);
                setErrorGeneral("");

                const resultado = await resolverAprobacion(
                  aprobacionAResolver.id,
                  cotizacionDetalleId,
                  aprobacionAResolver.accion,
                  valores.comentario || null
                );

                setGuardando(false);

                if (!resultado.ok) {
                  setErrorGeneral(resultado.error);
                  return;
                }

                resetForm();
                router.refresh();
                setAprobacionAResolver(null);
                cerrar();
              }}
            >
              {({ values, handleChange, handleSubmit }) => (
                <>
                  <ModalHeader>
                    {aprobacionAResolver?.accion === "APROBADO" ? "Aprobar cotización" : "Rechazar cotización"}
                  </ModalHeader>
                  <ModalBody className="gap-4">
                    <Textarea
                      label="Comentario (opcional)"
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
                    <Button
                      color={aprobacionAResolver?.accion === "APROBADO" ? "success" : "danger"}
                      isLoading={guardando}
                      onPress={() => handleSubmit()}
                    >
                      {aprobacionAResolver?.accion === "APROBADO" ? "Aprobar" : "Rechazar"}
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
