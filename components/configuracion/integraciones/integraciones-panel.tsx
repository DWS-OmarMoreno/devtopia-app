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
} from "@nextui-org/react";
import { Formik } from "formik";
import type { Tables } from "@/utils/database.types";
import { DropdownSelector } from "@/components/shared/dropdown-selector";
import { IntegracionSchema, WebhookSchema } from "@/helpers/schemas";
import type { IntegracionFormType, WebhookFormType } from "@/helpers/types";
import {
  crearIntegracion,
  actualizarIntegracion,
  cambiarEstadoIntegracion,
  cambiarHabilitadaIntegracion,
  crearWebhook,
  cambiarEstadoWebhook,
  eliminarWebhook,
} from "@/app/(app)/configuracion/integraciones/actions";

type Integracion = Tables<"integraciones_config">;
type Webhook = Tables<"webhooks_salientes">;

const TIPOS = [
  { id: "FACTURACION_EXTERNA", etiqueta: "Facturación externa" },
  { id: "HELPDESK", etiqueta: "Helpdesk" },
  { id: "EMAIL", etiqueta: "Correo" },
  { id: "MENSAJERIA", etiqueta: "Mensajería" },
  { id: "TRANSPORTADORA", etiqueta: "Transportadora" },
  { id: "OTRO", etiqueta: "Otro" },
];

const METODOS_AUTH = [
  { id: "NINGUNO", etiqueta: "Ninguno" },
  { id: "API_KEY", etiqueta: "API Key" },
  { id: "OAUTH2", etiqueta: "OAuth 2.0" },
  { id: "BASIC", etiqueta: "Básico (usuario/clave)" },
];

const ESTADO_CONEXION_COLOR: Record<string, "success" | "danger" | "warning" | "default"> = {
  OK: "success",
  ERROR: "danger",
  NO_PROBADO: "default",
  DESHABILITADA: "warning",
};

interface Props {
  integraciones: Integracion[];
  webhooks: Webhook[];
  puedeCrear: boolean;
  puedeEditar: boolean;
}

export function IntegracionesPanel({ integraciones, webhooks, puedeCrear, puedeEditar }: Props) {
  const router = useRouter();
  const [modalAbierto, setModalAbierto] = useState(false);
  const [enEdicion, setEnEdicion] = useState<Integracion | null>(null);
  const [integracionParaWebhook, setIntegracionParaWebhook] = useState<Integracion | null>(null);
  const [filaEnProceso, setFilaEnProceso] = useState<string | null>(null);
  const [errorGeneral, setErrorGeneral] = useState("");
  const [guardando, setGuardando] = useState(false);

  const webhooksPorIntegracion = useMemo(() => {
    const mapa = new Map<string, Webhook[]>();
    for (const w of webhooks) {
      const lista = mapa.get(w.integracion_id) ?? [];
      lista.push(w);
      mapa.set(w.integracion_id, lista);
    }
    return mapa;
  }, [webhooks]);

  const abrirCrear = () => {
    setEnEdicion(null);
    setErrorGeneral("");
    setModalAbierto(true);
  };
  const abrirEditar = (integracion: Integracion) => {
    setEnEdicion(integracion);
    setErrorGeneral("");
    setModalAbierto(true);
  };

  const handleEstado = async (id: string, activo: boolean) => {
    setFilaEnProceso(id);
    const resultado = await cambiarEstadoIntegracion(id, activo);
    setFilaEnProceso(null);
    if (!resultado.ok) {
      setErrorGeneral(resultado.error);
      return;
    }
    router.refresh();
  };

  const handleHabilitada = async (id: string, habilitada: boolean) => {
    setFilaEnProceso(id);
    const resultado = await cambiarHabilitadaIntegracion(id, habilitada);
    setFilaEnProceso(null);
    if (!resultado.ok) {
      setErrorGeneral(resultado.error);
      return;
    }
    router.refresh();
  };

  const handleEstadoWebhook = async (id: string, activo: boolean) => {
    setFilaEnProceso(id);
    const resultado = await cambiarEstadoWebhook(id, activo);
    setFilaEnProceso(null);
    if (!resultado.ok) {
      setErrorGeneral(resultado.error);
      return;
    }
    router.refresh();
  };

  const handleEliminarWebhook = async (id: string) => {
    setFilaEnProceso(id);
    const resultado = await eliminarWebhook(id);
    setFilaEnProceso(null);
    if (!resultado.ok) {
      setErrorGeneral(resultado.error);
      return;
    }
    router.refresh();
  };

  const initialValues: IntegracionFormType = {
    nombre: enEdicion?.nombre ?? "",
    tipo: enEdicion?.tipo ?? "",
    proveedor: enEdicion?.proveedor ?? "",
    url_base: enEdicion?.url_base ?? "",
    metodo_autenticacion: enEdicion?.metodo_autenticacion ?? "NINGUNO",
    credenciales_ref: enEdicion?.credenciales_ref ?? "",
  };

  const initialValuesWebhook: WebhookFormType = {
    evento: "",
    url_destino: "",
    metodo_http: "POST",
    secreto_firma_ref: "",
  };

  return (
    <div className="flex flex-col gap-4 py-2">
      {puedeCrear && (
        <div className="flex justify-end">
          <Button color="primary" size="sm" onPress={abrirCrear}>
            Nueva integración
          </Button>
        </div>
      )}

      {errorGeneral && <p className="text-danger text-sm">{errorGeneral}</p>}

      {integraciones.length === 0 ? (
        <p className="text-default-500 text-sm">No hay integraciones configuradas todavía.</p>
      ) : (
        <Accordion variant="bordered" selectionMode="multiple">
          {integraciones.map((integracion) => {
            const webhooksIntegracion = webhooksPorIntegracion.get(integracion.id) ?? [];
            return (
              <AccordionItem
                key={integracion.id}
                aria-label={integracion.nombre}
                title={
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="font-medium">{integracion.nombre}</span>
                    <Chip size="sm" variant="flat">
                      {TIPOS.find((t) => t.id === integracion.tipo)?.etiqueta ?? integracion.tipo}
                    </Chip>
                    <Chip
                      size="sm"
                      color={ESTADO_CONEXION_COLOR[integracion.estado_ultima_conexion] ?? "default"}
                      variant="flat"
                    >
                      {integracion.estado_ultima_conexion}
                    </Chip>
                    {!integracion.activo && (
                      <Chip size="sm" color="default" variant="flat">
                        Inactiva
                      </Chip>
                    )}
                  </div>
                }
              >
                <div className="flex flex-col gap-3 pb-2">
                  <div className="grid md:grid-cols-2 gap-2 text-tiny text-default-500">
                    <span>Proveedor: {integracion.proveedor ?? "—"}</span>
                    <span>URL base: {integracion.url_base ?? "—"}</span>
                    <span>
                      Autenticación:{" "}
                      {METODOS_AUTH.find((m) => m.id === integracion.metodo_autenticacion)?.etiqueta ??
                        integracion.metodo_autenticacion}
                    </span>
                    <span>Credenciales (referencia): {integracion.credenciales_ref ?? "—"}</span>
                  </div>

                  {puedeEditar && (
                    <div className="flex gap-4 items-center flex-wrap">
                      <Button size="sm" variant="light" onPress={() => abrirEditar(integracion)}>
                        Editar
                      </Button>
                      <div className="flex items-center gap-2">
                        <span className="text-tiny text-default-500">Habilitada</span>
                        <Switch
                          size="sm"
                          isSelected={integracion.habilitada}
                          isDisabled={filaEnProceso === integracion.id}
                          onValueChange={(v) => handleHabilitada(integracion.id, v)}
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-tiny text-default-500">Activa</span>
                        <Switch
                          size="sm"
                          isSelected={integracion.activo}
                          isDisabled={filaEnProceso === integracion.id}
                          onValueChange={(v) => handleEstado(integracion.id, v)}
                        />
                      </div>
                      <Button
                        size="sm"
                        variant="flat"
                        color="primary"
                        onPress={() => {
                          setIntegracionParaWebhook(integracion);
                          setErrorGeneral("");
                        }}
                      >
                        Agregar webhook
                      </Button>
                    </div>
                  )}

                  <Table aria-label={`Webhooks de ${integracion.nombre}`} removeWrapper={false}>
                    <TableHeader>
                      <TableColumn>EVENTO</TableColumn>
                      <TableColumn>URL DESTINO</TableColumn>
                      <TableColumn>MÉTODO</TableColumn>
                      <TableColumn>ESTADO</TableColumn>
                      <TableColumn>ACCIONES</TableColumn>
                    </TableHeader>
                    <TableBody emptyContent="Esta integración no tiene webhooks configurados.">
                      {webhooksIntegracion.map((webhook) => (
                        <TableRow key={webhook.id}>
                          <TableCell>{webhook.evento}</TableCell>
                          <TableCell className="text-tiny text-default-500">{webhook.url_destino}</TableCell>
                          <TableCell>{webhook.metodo_http}</TableCell>
                          <TableCell>
                            {puedeEditar ? (
                              <Switch
                                size="sm"
                                isSelected={webhook.activo}
                                isDisabled={filaEnProceso === webhook.id}
                                onValueChange={(v) => handleEstadoWebhook(webhook.id, v)}
                              />
                            ) : (
                              <Chip size="sm" color={webhook.activo ? "success" : "default"} variant="flat">
                                {webhook.activo ? "Activo" : "Inactivo"}
                              </Chip>
                            )}
                          </TableCell>
                          <TableCell>
                            {puedeEditar && (
                              <Button
                                size="sm"
                                variant="light"
                                color="danger"
                                isLoading={filaEnProceso === webhook.id}
                                onPress={() => handleEliminarWebhook(webhook.id)}
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

      {/* Modal: crear/editar integración */}
      <Modal isOpen={modalAbierto} onOpenChange={setModalAbierto} size="2xl">
        <ModalContent>
          {(cerrar) => (
            <Formik
              enableReinitialize
              initialValues={initialValues}
              validationSchema={IntegracionSchema}
              onSubmit={async (valores) => {
                setGuardando(true);
                setErrorGeneral("");

                const formData = new FormData();
                Object.entries(valores).forEach(([clave, valor]) => {
                  formData.set(clave, valor === null || valor === undefined ? "" : String(valor));
                });

                const resultado = enEdicion
                  ? await actualizarIntegracion(enEdicion.id, formData)
                  : await crearIntegracion(formData);

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
                  <ModalHeader>{enEdicion ? "Editar integración" : "Nueva integración"}</ModalHeader>
                  <ModalBody className="gap-4">
                    <Input
                      label="Nombre"
                      variant="bordered"
                      value={values.nombre}
                      onChange={handleChange("nombre")}
                      isInvalid={!!errors.nombre && !!touched.nombre}
                      errorMessage={errors.nombre}
                    />
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="flex flex-col gap-1">
                        <span className="text-small text-default-600">Tipo</span>
                        <DropdownSelector
                          etiquetaAria="Tipo de integración"
                          opciones={TIPOS}
                          valor={values.tipo || null}
                          onCambiar={(id) => setFieldValue("tipo", id ?? "")}
                        />
                      </div>
                      <Input
                        label="Proveedor"
                        variant="bordered"
                        value={values.proveedor}
                        onChange={handleChange("proveedor")}
                      />
                    </div>
                    <Input
                      label="URL base"
                      variant="bordered"
                      value={values.url_base}
                      onChange={handleChange("url_base")}
                    />
                    <div className="flex flex-col gap-1">
                      <span className="text-small text-default-600">Método de autenticación</span>
                      <DropdownSelector
                        etiquetaAria="Método de autenticación"
                        opciones={METODOS_AUTH}
                        valor={values.metodo_autenticacion || "NINGUNO"}
                        onCambiar={(id) => setFieldValue("metodo_autenticacion", id ?? "NINGUNO")}
                      />
                    </div>
                    <Input
                      label="Referencia de credenciales"
                      variant="bordered"
                      description="Alias/identificador hacia el gestor de secretos (variable de entorno, Supabase Vault). Nunca escribas aquí la clave o token real."
                      value={values.credenciales_ref}
                      onChange={handleChange("credenciales_ref")}
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

      {/* Modal: agregar webhook */}
      <Modal
        isOpen={!!integracionParaWebhook}
        onOpenChange={(abierto) => !abierto && setIntegracionParaWebhook(null)}
      >
        <ModalContent>
          {(cerrar) => (
            <Formik
              initialValues={initialValuesWebhook}
              validationSchema={WebhookSchema}
              onSubmit={async (valores, { resetForm }) => {
                if (!integracionParaWebhook) return;
                setGuardando(true);
                setErrorGeneral("");

                const formData = new FormData();
                formData.set("evento", valores.evento);
                formData.set("url_destino", valores.url_destino);
                formData.set("metodo_http", valores.metodo_http);
                formData.set("secreto_firma_ref", valores.secreto_firma_ref ?? "");

                const resultado = await crearWebhook(integracionParaWebhook.id, formData);
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
                  <ModalHeader>Nuevo webhook — {integracionParaWebhook?.nombre}</ModalHeader>
                  <ModalBody className="gap-4">
                    <Input
                      label="Evento"
                      variant="bordered"
                      placeholder="COTIZACION_APROBADA, FACTURA_EMITIDA…"
                      value={values.evento}
                      onChange={handleChange("evento")}
                      isInvalid={!!errors.evento && !!touched.evento}
                      errorMessage={errors.evento}
                    />
                    <Input
                      label="URL de destino"
                      variant="bordered"
                      value={values.url_destino}
                      onChange={handleChange("url_destino")}
                      isInvalid={!!errors.url_destino && !!touched.url_destino}
                      errorMessage={errors.url_destino}
                    />
                    <div className="flex flex-col gap-1">
                      <span className="text-small text-default-600">Método HTTP</span>
                      <DropdownSelector
                        etiquetaAria="Método HTTP"
                        opciones={[
                          { id: "POST", etiqueta: "POST" },
                          { id: "PUT", etiqueta: "PUT" },
                        ]}
                        valor={values.metodo_http || "POST"}
                        onCambiar={(id) => setFieldValue("metodo_http", id ?? "POST")}
                      />
                    </div>
                    <Input
                      label="Referencia del secreto de firma (opcional)"
                      variant="bordered"
                      description="Alias hacia el gestor de secretos usado para firmar el payload — nunca el secreto real."
                      value={values.secreto_firma_ref}
                      onChange={handleChange("secreto_firma_ref")}
                    />
                    {errorGeneral && <p className="text-danger text-sm">{errorGeneral}</p>}
                  </ModalBody>
                  <ModalFooter>
                    <Button variant="flat" onPress={cerrar}>
                      Cerrar
                    </Button>
                    <Button color="primary" isLoading={guardando} onPress={() => handleSubmit()}>
                      Agregar webhook
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
