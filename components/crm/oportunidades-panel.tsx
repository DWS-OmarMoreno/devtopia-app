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
import { OportunidadSchema, SeguimientoSchema } from "@/helpers/schemas";
import type { OportunidadFormType, SeguimientoFormType } from "@/helpers/types";
import {
  crearOportunidad,
  actualizarOportunidad,
  cambiarEtapaOportunidad,
  crearSeguimiento,
} from "@/app/(app)/crm/actions";
import type { CuentaConRelaciones } from "./cuentas-panel";

export type OportunidadConRelaciones = Tables<"oportunidades"> & {
  cuentas_clientes: { razon_social: string } | null;
  contactos: { nombre: string; apellido: string | null } | null;
  ejecutivo: { nombre_completo: string } | null;
};

export type SeguimientoConRelaciones = Tables<"oportunidades_seguimiento"> & {
  perfiles_usuario: { nombre_completo: string } | null;
};

const ETAPAS = ["PROSPECCION", "CALIFICACION", "PROPUESTA_ENVIADA", "NEGOCIACION", "GANADA", "PERDIDA"];
const TIPOS_ACTIVIDAD = ["LLAMADA", "REUNION", "EMAIL", "NOTA"];

const colorEtapa = (etapa: string) => {
  if (etapa === "GANADA") return "success";
  if (etapa === "PERDIDA") return "danger";
  if (etapa === "NEGOCIACION" || etapa === "PROPUESTA_ENVIADA") return "warning";
  return "default";
};

interface Props {
  oportunidades: OportunidadConRelaciones[];
  seguimientos: SeguimientoConRelaciones[];
  cuentas: CuentaConRelaciones[];
  contactos: Tables<"contactos">[];
  monedas: Tables<"monedas">[];
  motivosPerdida: Tables<"catalogos_valores">[];
  usuariosEmpresa: { id: string; nombre_completo: string }[];
  usuarioActualId: string | null;
  puedeCrear: boolean;
  puedeEditar: boolean;
}

const hoyISO = () => new Date().toISOString().slice(0, 10);

export function OportunidadesPanel({
  oportunidades,
  seguimientos,
  cuentas,
  contactos,
  monedas,
  motivosPerdida,
  usuariosEmpresa,
  usuarioActualId,
  puedeCrear,
  puedeEditar,
}: Props) {
  const router = useRouter();
  const [modalAbierto, setModalAbierto] = useState(false);
  const [enEdicion, setEnEdicion] = useState<OportunidadConRelaciones | null>(null);
  const [oportunidadParaActividad, setOportunidadParaActividad] = useState<OportunidadConRelaciones | null>(
    null
  );
  const [filaEnProceso, setFilaEnProceso] = useState<string | null>(null);
  const [errorGeneral, setErrorGeneral] = useState("");
  const [guardando, setGuardando] = useState(false);

  const seguimientosPorOportunidad = useMemo(() => {
    const mapa = new Map<string, SeguimientoConRelaciones[]>();
    for (const s of seguimientos) {
      const lista = mapa.get(s.oportunidad_id) ?? [];
      lista.push(s);
      mapa.set(s.oportunidad_id, lista);
    }
    return mapa;
  }, [seguimientos]);

  const opcionesCuenta = cuentas.map((c) => ({ id: c.id, etiqueta: c.razon_social }));
  const opcionesMoneda = monedas.map((m) => ({ id: m.id, etiqueta: `${m.codigo_iso} — ${m.nombre}` }));
  const opcionesEjecutivo = usuariosEmpresa.map((u) => ({ id: u.id, etiqueta: u.nombre_completo }));
  const opcionesEtapa = ETAPAS.map((e) => ({ id: e, etiqueta: e }));
  const opcionesMotivoPerdida = motivosPerdida.map((m) => ({ id: m.id, etiqueta: m.etiqueta }));
  const opcionesTipoActividad = TIPOS_ACTIVIDAD.map((t) => ({ id: t, etiqueta: t }));

  const abrirCrear = () => {
    setEnEdicion(null);
    setErrorGeneral("");
    setModalAbierto(true);
  };
  const abrirEditar = (oportunidad: OportunidadConRelaciones) => {
    setEnEdicion(oportunidad);
    setErrorGeneral("");
    setModalAbierto(true);
  };

  const handleEtapa = async (id: string, etapa: string) => {
    setFilaEnProceso(id);
    const resultado = await cambiarEtapaOportunidad(id, etapa);
    setFilaEnProceso(null);
    if (!resultado.ok) {
      setErrorGeneral(resultado.error);
      return;
    }
    router.refresh();
  };

  const initialValues: OportunidadFormType = {
    cuenta_id: enEdicion?.cuenta_id ?? "",
    contacto_id: enEdicion?.contacto_id ?? "",
    nombre_oportunidad: enEdicion?.nombre_oportunidad ?? "",
    descripcion: enEdicion?.descripcion ?? "",
    etapa: enEdicion?.etapa ?? "PROSPECCION",
    probabilidad_cierre_pct: enEdicion?.probabilidad_cierre_pct
      ? String(enEdicion.probabilidad_cierre_pct)
      : "",
    valor_estimado: enEdicion?.valor_estimado ? String(enEdicion.valor_estimado) : "",
    moneda_id: enEdicion?.moneda_id ?? "",
    fecha_estimada_cierre: enEdicion?.fecha_estimada_cierre ?? "",
    motivo_perdida_id: enEdicion?.motivo_perdida_id ?? "",
    motivo_perdida_detalle: enEdicion?.motivo_perdida_detalle ?? "",
    origen_oportunidad: enEdicion?.origen_oportunidad ?? "",
    ejecutivo_comercial_id: enEdicion?.ejecutivo_comercial_id ?? usuarioActualId ?? "",
    proxima_accion: enEdicion?.proxima_accion ?? "",
    fecha_proxima_accion: enEdicion?.fecha_proxima_accion ?? "",
  };

  const initialValuesActividad: SeguimientoFormType = {
    tipo_actividad: "",
    descripcion: "",
    resultado: "",
  };

  return (
    <div className="flex flex-col gap-4 py-2">
      {puedeCrear && (
        <div className="flex justify-end">
          <Button color="primary" size="sm" onPress={abrirCrear} isDisabled={cuentas.length === 0}>
            Nueva oportunidad
          </Button>
        </div>
      )}
      {puedeCrear && cuentas.length === 0 && (
        <p className="text-tiny text-warning-600">
          Crea primero una cuenta de cliente en la pestaña Cuentas para poder registrar oportunidades.
        </p>
      )}

      {errorGeneral && <p className="text-danger text-sm">{errorGeneral}</p>}

      {oportunidades.length === 0 ? (
        <p className="text-default-500 text-sm">No hay oportunidades registradas todavía.</p>
      ) : (
        <Accordion variant="bordered" selectionMode="multiple">
          {oportunidades.map((oportunidad) => {
            const actividades = seguimientosPorOportunidad.get(oportunidad.id) ?? [];
            return (
              <AccordionItem
                key={oportunidad.id}
                aria-label={oportunidad.nombre_oportunidad}
                title={
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="text-tiny font-mono text-default-400">{oportunidad.codigo}</span>
                    <span className="font-medium">{oportunidad.nombre_oportunidad}</span>
                    <Chip size="sm" color={colorEtapa(oportunidad.etapa)} variant="flat">
                      {oportunidad.etapa}
                    </Chip>
                    <span className="text-tiny text-default-400">
                      {oportunidad.cuentas_clientes?.razon_social ?? "—"}
                    </span>
                    {oportunidad.valor_estimado != null && (
                      <span className="text-tiny text-default-400">
                        {oportunidad.valor_estimado.toLocaleString("es-CO", {
                          minimumFractionDigits: 2,
                        })}
                      </span>
                    )}
                  </div>
                }
              >
                <div className="flex flex-col gap-3 pb-2">
                  <div className="grid md:grid-cols-3 gap-x-6 gap-y-1 text-sm text-default-500">
                    <span>
                      Contacto: {oportunidad.contactos?.nombre ?? "—"}{" "}
                      {oportunidad.contactos?.apellido ?? ""}
                    </span>
                    <span>Ejecutivo: {oportunidad.ejecutivo?.nombre_completo ?? "—"}</span>
                    <span>
                      Probabilidad:{" "}
                      {oportunidad.probabilidad_cierre_pct != null
                        ? `${oportunidad.probabilidad_cierre_pct}%`
                        : "—"}
                    </span>
                    <span>Cierre estimado: {oportunidad.fecha_estimada_cierre ?? "—"}</span>
                    <span>Próxima acción: {oportunidad.proxima_accion ?? "—"}</span>
                    {oportunidad.etapa === "PERDIDA" && (
                      <span>
                        Motivo:{" "}
                        {opcionesMotivoPerdida.find((m) => m.id === oportunidad.motivo_perdida_id)
                          ?.etiqueta ?? oportunidad.motivo_perdida_detalle ?? "—"}
                      </span>
                    )}
                  </div>
                  {oportunidad.descripcion && (
                    <p className="text-default-500 text-sm">{oportunidad.descripcion}</p>
                  )}

                  {puedeEditar && (
                    <div className="flex gap-3 items-center flex-wrap">
                      <Button size="sm" variant="light" onPress={() => abrirEditar(oportunidad)}>
                        Editar
                      </Button>
                      <div className="flex items-center gap-2">
                        <span className="text-tiny text-default-500">Etapa</span>
                        <DropdownSelector
                          etiquetaAria="Etapa"
                          opciones={opcionesEtapa}
                          valor={oportunidad.etapa}
                          isDisabled={filaEnProceso === oportunidad.id}
                          onCambiar={(id) => id && handleEtapa(oportunidad.id, id)}
                        />
                      </div>
                      <Button
                        size="sm"
                        variant="flat"
                        color="primary"
                        onPress={() => {
                          setOportunidadParaActividad(oportunidad);
                          setErrorGeneral("");
                        }}
                      >
                        Registrar actividad
                      </Button>
                    </div>
                  )}

                  <Table aria-label={`Seguimiento de ${oportunidad.nombre_oportunidad}`} removeWrapper={false}>
                    <TableHeader>
                      <TableColumn>FECHA</TableColumn>
                      <TableColumn>TIPO</TableColumn>
                      <TableColumn>DESCRIPCIÓN</TableColumn>
                      <TableColumn>RESULTADO</TableColumn>
                      <TableColumn>REGISTRÓ</TableColumn>
                    </TableHeader>
                    <TableBody emptyContent="Todavía no hay actividad registrada en esta oportunidad.">
                      {actividades.map((actividad) => (
                        <TableRow key={actividad.id}>
                          <TableCell className="text-tiny text-default-500">
                            {new Date(actividad.fecha).toLocaleString("es-CO")}
                          </TableCell>
                          <TableCell>
                            <Chip size="sm" variant="flat">
                              {actividad.tipo_actividad}
                            </Chip>
                          </TableCell>
                          <TableCell>{actividad.descripcion}</TableCell>
                          <TableCell>{actividad.resultado ?? "—"}</TableCell>
                          <TableCell className="text-tiny text-default-500">
                            {actividad.perfiles_usuario?.nombre_completo ?? "—"}
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

      {/* Modal: crear/editar oportunidad */}
      <Modal isOpen={modalAbierto} onOpenChange={setModalAbierto} size="3xl" scrollBehavior="inside">
        <ModalContent>
          {(cerrar) => (
            <Formik
              enableReinitialize
              initialValues={initialValues}
              validationSchema={OportunidadSchema}
              onSubmit={async (valores) => {
                setGuardando(true);
                setErrorGeneral("");

                const formData = new FormData();
                Object.entries(valores).forEach(([clave, valor]) => {
                  formData.set(clave, valor ?? "");
                });

                const resultado = enEdicion
                  ? await actualizarOportunidad(enEdicion.id, formData)
                  : await crearOportunidad(formData);

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

                return (
                  <>
                    <ModalHeader>{enEdicion ? "Editar oportunidad" : "Nueva oportunidad"}</ModalHeader>
                    <ModalBody className="gap-4">
                      <Input
                        label="Nombre de la oportunidad"
                        variant="bordered"
                        value={values.nombre_oportunidad}
                        onChange={handleChange("nombre_oportunidad")}
                        isInvalid={!!errors.nombre_oportunidad && !!touched.nombre_oportunidad}
                        errorMessage={errors.nombre_oportunidad}
                      />
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
                      <Textarea
                        label="Descripción (opcional)"
                        variant="bordered"
                        value={values.descripcion}
                        onChange={handleChange("descripcion")}
                      />
                      <div className="grid grid-cols-2 gap-4">
                        <div className="flex flex-col gap-1">
                          <span className="text-small text-default-600">Etapa</span>
                          <DropdownSelector
                            etiquetaAria="Etapa"
                            opciones={opcionesEtapa}
                            valor={values.etapa || null}
                            onCambiar={(id) => setFieldValue("etapa", id ?? "PROSPECCION")}
                          />
                        </div>
                        <Input
                          label="Probabilidad de cierre % (opcional)"
                          type="number"
                          step="1"
                          variant="bordered"
                          value={values.probabilidad_cierre_pct}
                          onChange={handleChange("probabilidad_cierre_pct")}
                          isInvalid={
                            !!errors.probabilidad_cierre_pct && !!touched.probabilidad_cierre_pct
                          }
                          errorMessage={errors.probabilidad_cierre_pct}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <Input
                          label="Valor estimado (opcional)"
                          type="number"
                          step="0.01"
                          variant="bordered"
                          value={values.valor_estimado}
                          onChange={handleChange("valor_estimado")}
                          isInvalid={!!errors.valor_estimado && !!touched.valor_estimado}
                          errorMessage={errors.valor_estimado}
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
                          label="Fecha estimada de cierre (opcional)"
                          type="date"
                          variant="bordered"
                          value={values.fecha_estimada_cierre}
                          onChange={handleChange("fecha_estimada_cierre")}
                        />
                        <div className="flex flex-col gap-1">
                          <span className="text-small text-default-600">Ejecutivo comercial</span>
                          <DropdownSelector
                            etiquetaAria="Ejecutivo comercial"
                            opciones={opcionesEjecutivo}
                            valor={values.ejecutivo_comercial_id || null}
                            onCambiar={(id) => setFieldValue("ejecutivo_comercial_id", id ?? "")}
                          />
                          {!!errors.ejecutivo_comercial_id && !!touched.ejecutivo_comercial_id && (
                            <span className="text-tiny text-danger">{errors.ejecutivo_comercial_id}</span>
                          )}
                        </div>
                      </div>
                      {values.etapa === "PERDIDA" && (
                        <div className="grid grid-cols-2 gap-4">
                          <div className="flex flex-col gap-1">
                            <span className="text-small text-default-600">Motivo de pérdida (opcional)</span>
                            <DropdownSelector
                              etiquetaAria="Motivo de pérdida"
                              opciones={opcionesMotivoPerdida}
                              valor={values.motivo_perdida_id || null}
                              onCambiar={(id) => setFieldValue("motivo_perdida_id", id ?? "")}
                              permitirVacio
                            />
                          </div>
                          <Input
                            label="Detalle del motivo (opcional)"
                            variant="bordered"
                            value={values.motivo_perdida_detalle}
                            onChange={handleChange("motivo_perdida_detalle")}
                          />
                        </div>
                      )}
                      <div className="grid grid-cols-2 gap-4">
                        <Input
                          label="Próxima acción (opcional)"
                          variant="bordered"
                          value={values.proxima_accion}
                          onChange={handleChange("proxima_accion")}
                        />
                        <Input
                          label="Fecha próxima acción (opcional)"
                          type="date"
                          variant="bordered"
                          value={values.fecha_proxima_accion}
                          onChange={handleChange("fecha_proxima_accion")}
                        />
                      </div>
                      <Input
                        label="Origen de la oportunidad (opcional)"
                        variant="bordered"
                        value={values.origen_oportunidad}
                        onChange={handleChange("origen_oportunidad")}
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

      {/* Modal: registrar actividad de seguimiento */}
      <Modal
        isOpen={!!oportunidadParaActividad}
        onOpenChange={(abierto) => !abierto && setOportunidadParaActividad(null)}
      >
        <ModalContent>
          {(cerrar) => (
            <Formik
              initialValues={initialValuesActividad}
              validationSchema={SeguimientoSchema}
              onSubmit={async (valores, { resetForm }) => {
                if (!oportunidadParaActividad) return;
                setGuardando(true);
                setErrorGeneral("");

                const formData = new FormData();
                formData.set("tipo_actividad", valores.tipo_actividad);
                formData.set("descripcion", valores.descripcion);
                formData.set("resultado", valores.resultado ?? "");

                const resultado = await crearSeguimiento(oportunidadParaActividad.id, formData);
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
                    Registrar actividad — {oportunidadParaActividad?.nombre_oportunidad}
                  </ModalHeader>
                  <ModalBody className="gap-4">
                    <div className="flex flex-col gap-1">
                      <span className="text-small text-default-600">Tipo de actividad</span>
                      <DropdownSelector
                        etiquetaAria="Tipo de actividad"
                        opciones={opcionesTipoActividad}
                        valor={values.tipo_actividad || null}
                        onCambiar={(id) => setFieldValue("tipo_actividad", id ?? "")}
                      />
                      {!!errors.tipo_actividad && !!touched.tipo_actividad && (
                        <span className="text-tiny text-danger">{errors.tipo_actividad}</span>
                      )}
                    </div>
                    <Textarea
                      label="Descripción"
                      variant="bordered"
                      value={values.descripcion}
                      onChange={handleChange("descripcion")}
                      isInvalid={!!errors.descripcion && !!touched.descripcion}
                      errorMessage={errors.descripcion}
                    />
                    <Textarea
                      label="Resultado (opcional)"
                      variant="bordered"
                      value={values.resultado}
                      onChange={handleChange("resultado")}
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
    </div>
  );
}
