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
import { CuentaClienteSchema, ContactoSchema } from "@/helpers/schemas";
import type { CuentaClienteFormType, ContactoFormType } from "@/helpers/types";
import {
  crearCuenta,
  actualizarCuenta,
  cambiarEstadoCuenta,
  crearContacto,
  actualizarContacto,
  cambiarEstadoContacto,
} from "@/app/(app)/crm/actions";

export type CuentaConRelaciones = Tables<"cuentas_clientes"> & {
  ejecutivo: { nombre_completo: string } | null;
};

type Contacto = Tables<"contactos">;

const TIPOS_IDENTIFICACION = ["NIT", "CC", "CE", "PASAPORTE", "RUT", "OTRO"];
const TAMANOS_EMPRESA = ["MICRO", "PEQUENA", "MEDIANA", "GRANDE"];
const ORIGENES_CAPTACION = ["REFERIDO", "WEB", "EVENTO", "OUTBOUND", "OTRO"];
const ESTADOS_CUENTA = ["PROSPECTO", "ACTIVO", "INACTIVO"];

const colorEstado = (estado: string) =>
  estado === "ACTIVO" ? "success" : estado === "INACTIVO" ? "default" : "primary";

interface Props {
  cuentas: CuentaConRelaciones[];
  contactos: Contacto[];
  monedas: Tables<"monedas">[];
  usuariosEmpresa: { id: string; nombre_completo: string }[];
  puedeCrear: boolean;
  puedeEditar: boolean;
}

export function CuentasPanel({
  cuentas,
  contactos,
  monedas,
  usuariosEmpresa,
  puedeCrear,
  puedeEditar,
}: Props) {
  const router = useRouter();
  const [modalCuentaAbierto, setModalCuentaAbierto] = useState(false);
  const [cuentaEnEdicion, setCuentaEnEdicion] = useState<CuentaConRelaciones | null>(null);
  const [cuentaParaContacto, setCuentaParaContacto] = useState<CuentaConRelaciones | null>(null);
  const [contactoEnEdicion, setContactoEnEdicion] = useState<Contacto | null>(null);
  const [filaEnProceso, setFilaEnProceso] = useState<string | null>(null);
  const [errorGeneral, setErrorGeneral] = useState("");
  const [guardando, setGuardando] = useState(false);

  const contactosPorCuenta = useMemo(() => {
    const mapa = new Map<string, Contacto[]>();
    for (const contacto of contactos) {
      const lista = mapa.get(contacto.cuenta_id) ?? [];
      lista.push(contacto);
      mapa.set(contacto.cuenta_id, lista);
    }
    return mapa;
  }, [contactos]);

  const opcionesCuentaPadre = (excluirId?: string) =>
    cuentas.filter((c) => c.id !== excluirId).map((c) => ({ id: c.id, etiqueta: c.razon_social }));
  const opcionesMoneda = monedas.map((m) => ({ id: m.id, etiqueta: `${m.codigo_iso} — ${m.nombre}` }));
  const opcionesEjecutivo = usuariosEmpresa.map((u) => ({ id: u.id, etiqueta: u.nombre_completo }));
  const opcionesTipoId = TIPOS_IDENTIFICACION.map((t) => ({ id: t, etiqueta: t }));
  const opcionesTamano = TAMANOS_EMPRESA.map((t) => ({ id: t, etiqueta: t }));
  const opcionesOrigen = ORIGENES_CAPTACION.map((t) => ({ id: t, etiqueta: t }));
  const opcionesEstado = ESTADOS_CUENTA.map((t) => ({ id: t, etiqueta: t }));

  const abrirCrearCuenta = () => {
    setCuentaEnEdicion(null);
    setErrorGeneral("");
    setModalCuentaAbierto(true);
  };
  const abrirEditarCuenta = (cuenta: CuentaConRelaciones) => {
    setCuentaEnEdicion(cuenta);
    setErrorGeneral("");
    setModalCuentaAbierto(true);
  };

  const handleEstadoCuenta = async (id: string, estado: string) => {
    setFilaEnProceso(id);
    const resultado = await cambiarEstadoCuenta(id, estado);
    setFilaEnProceso(null);
    if (!resultado.ok) {
      setErrorGeneral(resultado.error);
      return;
    }
    router.refresh();
  };

  const handleEstadoContacto = async (id: string, activo: boolean) => {
    setFilaEnProceso(id);
    const resultado = await cambiarEstadoContacto(id, activo);
    setFilaEnProceso(null);
    if (!resultado.ok) {
      setErrorGeneral(resultado.error);
      return;
    }
    router.refresh();
  };

  const initialValuesCuenta: CuentaClienteFormType = {
    razon_social: cuentaEnEdicion?.razon_social ?? "",
    nombre_comercial: cuentaEnEdicion?.nombre_comercial ?? "",
    tipo_identificacion: cuentaEnEdicion?.tipo_identificacion ?? "",
    numero_identificacion: cuentaEnEdicion?.numero_identificacion ?? "",
    cuenta_padre_id: cuentaEnEdicion?.cuenta_padre_id ?? "",
    sector_industria: cuentaEnEdicion?.sector_industria ?? "",
    tamano_empresa: cuentaEnEdicion?.tamano_empresa ?? "",
    sitio_web: cuentaEnEdicion?.sitio_web ?? "",
    direccion_facturacion: cuentaEnEdicion?.direccion_facturacion ?? "",
    ciudad: cuentaEnEdicion?.ciudad ?? "",
    pais: cuentaEnEdicion?.pais ?? "",
    telefono_principal: cuentaEnEdicion?.telefono_principal ?? "",
    email_principal: cuentaEnEdicion?.email_principal ?? "",
    moneda_preferida_id: cuentaEnEdicion?.moneda_preferida_id ?? "",
    ejecutivo_comercial_id: cuentaEnEdicion?.ejecutivo_comercial_id ?? "",
    origen_captacion: cuentaEnEdicion?.origen_captacion ?? "",
    estado: cuentaEnEdicion?.estado ?? "PROSPECTO",
    notas: cuentaEnEdicion?.notas ?? "",
  };

  const initialValuesContacto: ContactoFormType = {
    nombre: contactoEnEdicion?.nombre ?? "",
    apellido: contactoEnEdicion?.apellido ?? "",
    cargo: contactoEnEdicion?.cargo ?? "",
    email: contactoEnEdicion?.email ?? "",
    telefono: contactoEnEdicion?.telefono ?? "",
    celular: contactoEnEdicion?.celular ?? "",
    canal_preferido: contactoEnEdicion?.canal_preferido ?? "",
    es_contacto_principal: contactoEnEdicion?.es_contacto_principal ?? false,
    es_firmante_autorizado: contactoEnEdicion?.es_firmante_autorizado ?? false,
    notas: contactoEnEdicion?.notas ?? "",
  };

  return (
    <div className="flex flex-col gap-4 py-2">
      {puedeCrear && (
        <div className="flex justify-end">
          <Button color="primary" size="sm" onPress={abrirCrearCuenta}>
            Nueva cuenta
          </Button>
        </div>
      )}

      {errorGeneral && <p className="text-danger text-sm">{errorGeneral}</p>}

      {cuentas.length === 0 ? (
        <p className="text-default-500 text-sm">No hay cuentas de cliente registradas todavía.</p>
      ) : (
        <Accordion variant="bordered" selectionMode="multiple">
          {cuentas.map((cuenta) => {
            const contactosCuenta = contactosPorCuenta.get(cuenta.id) ?? [];
            return (
              <AccordionItem
                key={cuenta.id}
                aria-label={cuenta.razon_social}
                title={
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="font-medium">{cuenta.razon_social}</span>
                    <Chip size="sm" color={colorEstado(cuenta.estado)} variant="flat">
                      {cuenta.estado}
                    </Chip>
                    <span className="text-tiny text-default-400">
                      {cuenta.tipo_identificacion} {cuenta.numero_identificacion}
                    </span>
                    {cuenta.ejecutivo?.nombre_completo && (
                      <span className="text-tiny text-default-400">
                        · {cuenta.ejecutivo.nombre_completo}
                      </span>
                    )}
                  </div>
                }
              >
                <div className="flex flex-col gap-3 pb-2">
                  <div className="grid md:grid-cols-3 gap-x-6 gap-y-1 text-sm text-default-500">
                    {cuenta.nombre_comercial && <span>Nombre comercial: {cuenta.nombre_comercial}</span>}
                    {cuenta.ciudad && <span>Ciudad: {cuenta.ciudad}</span>}
                    {cuenta.pais && <span>País: {cuenta.pais}</span>}
                    {cuenta.telefono_principal && <span>Teléfono: {cuenta.telefono_principal}</span>}
                    {cuenta.email_principal && <span>Email: {cuenta.email_principal}</span>}
                    {cuenta.sitio_web && <span>Sitio web: {cuenta.sitio_web}</span>}
                  </div>
                  {cuenta.notas && <p className="text-default-500 text-sm">{cuenta.notas}</p>}

                  {puedeEditar && (
                    <div className="flex gap-3 items-center flex-wrap">
                      <Button size="sm" variant="light" onPress={() => abrirEditarCuenta(cuenta)}>
                        Editar cuenta
                      </Button>
                      <div className="flex items-center gap-2">
                        <span className="text-tiny text-default-500">Estado</span>
                        <DropdownSelector
                          etiquetaAria="Estado de la cuenta"
                          opciones={opcionesEstado}
                          valor={cuenta.estado}
                          isDisabled={filaEnProceso === cuenta.id}
                          onCambiar={(id) => id && handleEstadoCuenta(cuenta.id, id)}
                        />
                      </div>
                      {puedeCrear && (
                        <Button
                          size="sm"
                          variant="flat"
                          color="primary"
                          onPress={() => {
                            setCuentaParaContacto(cuenta);
                            setContactoEnEdicion(null);
                            setErrorGeneral("");
                          }}
                        >
                          Agregar contacto
                        </Button>
                      )}
                    </div>
                  )}

                  <Table aria-label={`Contactos de ${cuenta.razon_social}`} removeWrapper={false}>
                    <TableHeader>
                      <TableColumn>NOMBRE</TableColumn>
                      <TableColumn>CARGO</TableColumn>
                      <TableColumn>CONTACTO</TableColumn>
                      <TableColumn>ROL</TableColumn>
                      <TableColumn>ACTIVO</TableColumn>
                      <TableColumn>ACCIONES</TableColumn>
                    </TableHeader>
                    <TableBody emptyContent="Esta cuenta todavía no tiene contactos.">
                      {contactosCuenta.map((contacto) => (
                        <TableRow key={contacto.id}>
                          <TableCell className="font-medium">
                            {contacto.nombre} {contacto.apellido ?? ""}
                          </TableCell>
                          <TableCell>{contacto.cargo ?? "—"}</TableCell>
                          <TableCell className="text-tiny text-default-500">
                            {contacto.email ?? contacto.telefono ?? contacto.celular ?? "—"}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1 flex-wrap">
                              {contacto.es_contacto_principal && (
                                <Chip size="sm" variant="flat" color="primary">
                                  Principal
                                </Chip>
                              )}
                              {contacto.es_firmante_autorizado && (
                                <Chip size="sm" variant="flat">
                                  Firmante
                                </Chip>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            {puedeEditar ? (
                              <Switch
                                size="sm"
                                isSelected={contacto.activo}
                                isDisabled={filaEnProceso === contacto.id}
                                onValueChange={(activo) => handleEstadoContacto(contacto.id, activo)}
                              />
                            ) : (
                              <Chip color={contacto.activo ? "success" : "default"} variant="flat">
                                {contacto.activo ? "Activo" : "Inactivo"}
                              </Chip>
                            )}
                          </TableCell>
                          <TableCell>
                            {puedeEditar && (
                              <Button
                                size="sm"
                                variant="light"
                                onPress={() => {
                                  setCuentaParaContacto(cuenta);
                                  setContactoEnEdicion(contacto);
                                  setErrorGeneral("");
                                }}
                              >
                                Editar
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

      {/* Modal: crear/editar cuenta */}
      <Modal isOpen={modalCuentaAbierto} onOpenChange={setModalCuentaAbierto} size="3xl" scrollBehavior="inside">
        <ModalContent>
          {(cerrar) => (
            <Formik
              enableReinitialize
              initialValues={initialValuesCuenta}
              validationSchema={CuentaClienteSchema}
              onSubmit={async (valores) => {
                setGuardando(true);
                setErrorGeneral("");

                const formData = new FormData();
                Object.entries(valores).forEach(([clave, valor]) => {
                  formData.set(clave, valor ?? "");
                });

                const resultado = cuentaEnEdicion
                  ? await actualizarCuenta(cuentaEnEdicion.id, formData)
                  : await crearCuenta(formData);

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
                  <ModalHeader>{cuentaEnEdicion ? "Editar cuenta" : "Nueva cuenta"}</ModalHeader>
                  <ModalBody className="gap-4">
                    <div className="grid grid-cols-2 gap-4">
                      <Input
                        label="Razón social"
                        variant="bordered"
                        value={values.razon_social}
                        onChange={handleChange("razon_social")}
                        isInvalid={!!errors.razon_social && !!touched.razon_social}
                        errorMessage={errors.razon_social}
                      />
                      <Input
                        label="Nombre comercial (opcional)"
                        variant="bordered"
                        value={values.nombre_comercial}
                        onChange={handleChange("nombre_comercial")}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex flex-col gap-1">
                        <span className="text-small text-default-600">Tipo de identificación</span>
                        <DropdownSelector
                          etiquetaAria="Tipo de identificación"
                          opciones={opcionesTipoId}
                          valor={values.tipo_identificacion || null}
                          onCambiar={(id) => setFieldValue("tipo_identificacion", id ?? "")}
                        />
                        {!!errors.tipo_identificacion && !!touched.tipo_identificacion && (
                          <span className="text-tiny text-danger">{errors.tipo_identificacion}</span>
                        )}
                      </div>
                      <Input
                        label="Número de identificación"
                        variant="bordered"
                        value={values.numero_identificacion}
                        onChange={handleChange("numero_identificacion")}
                        isInvalid={!!errors.numero_identificacion && !!touched.numero_identificacion}
                        errorMessage={errors.numero_identificacion}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex flex-col gap-1">
                        <span className="text-small text-default-600">Cuenta padre (opcional)</span>
                        <DropdownSelector
                          etiquetaAria="Cuenta padre"
                          opciones={opcionesCuentaPadre(cuentaEnEdicion?.id)}
                          valor={values.cuenta_padre_id || null}
                          onCambiar={(id) => setFieldValue("cuenta_padre_id", id ?? "")}
                          permitirVacio
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <span className="text-small text-default-600">Tamaño de empresa (opcional)</span>
                        <DropdownSelector
                          etiquetaAria="Tamaño de empresa"
                          opciones={opcionesTamano}
                          valor={values.tamano_empresa || null}
                          onCambiar={(id) => setFieldValue("tamano_empresa", id ?? "")}
                          permitirVacio
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <Input
                        label="Sector / industria (opcional)"
                        variant="bordered"
                        value={values.sector_industria}
                        onChange={handleChange("sector_industria")}
                      />
                      <Input
                        label="Sitio web (opcional)"
                        variant="bordered"
                        value={values.sitio_web}
                        onChange={handleChange("sitio_web")}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <Input
                        label="Ciudad (opcional)"
                        variant="bordered"
                        value={values.ciudad}
                        onChange={handleChange("ciudad")}
                      />
                      <Input
                        label="País (opcional)"
                        variant="bordered"
                        value={values.pais}
                        onChange={handleChange("pais")}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <Input
                        label="Teléfono principal (opcional)"
                        variant="bordered"
                        value={values.telefono_principal}
                        onChange={handleChange("telefono_principal")}
                      />
                      <Input
                        label="Email principal (opcional)"
                        variant="bordered"
                        value={values.email_principal}
                        onChange={handleChange("email_principal")}
                        isInvalid={!!errors.email_principal && !!touched.email_principal}
                        errorMessage={errors.email_principal}
                      />
                    </div>
                    <Input
                      label="Dirección de facturación (opcional)"
                      variant="bordered"
                      value={values.direccion_facturacion}
                      onChange={handleChange("direccion_facturacion")}
                    />
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex flex-col gap-1">
                        <span className="text-small text-default-600">Moneda preferida (opcional)</span>
                        <DropdownSelector
                          etiquetaAria="Moneda preferida"
                          opciones={opcionesMoneda}
                          valor={values.moneda_preferida_id || null}
                          onCambiar={(id) => setFieldValue("moneda_preferida_id", id ?? "")}
                          permitirVacio
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <span className="text-small text-default-600">Ejecutivo comercial (opcional)</span>
                        <DropdownSelector
                          etiquetaAria="Ejecutivo comercial"
                          opciones={opcionesEjecutivo}
                          valor={values.ejecutivo_comercial_id || null}
                          onCambiar={(id) => setFieldValue("ejecutivo_comercial_id", id ?? "")}
                          permitirVacio
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex flex-col gap-1">
                        <span className="text-small text-default-600">Origen de captación (opcional)</span>
                        <DropdownSelector
                          etiquetaAria="Origen de captación"
                          opciones={opcionesOrigen}
                          valor={values.origen_captacion || null}
                          onCambiar={(id) => setFieldValue("origen_captacion", id ?? "")}
                          permitirVacio
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <span className="text-small text-default-600">Estado</span>
                        <DropdownSelector
                          etiquetaAria="Estado"
                          opciones={opcionesEstado}
                          valor={values.estado || null}
                          onCambiar={(id) => setFieldValue("estado", id ?? "PROSPECTO")}
                        />
                      </div>
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

      {/* Modal: crear/editar contacto */}
      <Modal
        isOpen={!!cuentaParaContacto}
        onOpenChange={(abierto) => !abierto && setCuentaParaContacto(null)}
        size="lg"
      >
        <ModalContent>
          {(cerrar) => (
            <Formik
              enableReinitialize
              initialValues={initialValuesContacto}
              validationSchema={ContactoSchema}
              onSubmit={async (valores, { resetForm }) => {
                if (!cuentaParaContacto) return;
                setGuardando(true);
                setErrorGeneral("");

                const formData = new FormData();
                formData.set("nombre", valores.nombre);
                formData.set("apellido", valores.apellido ?? "");
                formData.set("cargo", valores.cargo ?? "");
                formData.set("email", valores.email ?? "");
                formData.set("telefono", valores.telefono ?? "");
                formData.set("celular", valores.celular ?? "");
                formData.set("canal_preferido", valores.canal_preferido ?? "");
                formData.set("es_contacto_principal", valores.es_contacto_principal ? "true" : "false");
                formData.set("es_firmante_autorizado", valores.es_firmante_autorizado ? "true" : "false");
                formData.set("notas", valores.notas ?? "");

                const resultado = contactoEnEdicion
                  ? await actualizarContacto(contactoEnEdicion.id, formData)
                  : await crearContacto(cuentaParaContacto.id, formData);

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
                    {contactoEnEdicion ? "Editar contacto" : "Nuevo contacto"} — {cuentaParaContacto?.razon_social}
                  </ModalHeader>
                  <ModalBody className="gap-4">
                    <div className="grid grid-cols-2 gap-4">
                      <Input
                        label="Nombre"
                        variant="bordered"
                        value={values.nombre}
                        onChange={handleChange("nombre")}
                        isInvalid={!!errors.nombre && !!touched.nombre}
                        errorMessage={errors.nombre}
                      />
                      <Input
                        label="Apellido (opcional)"
                        variant="bordered"
                        value={values.apellido}
                        onChange={handleChange("apellido")}
                      />
                    </div>
                    <Input
                      label="Cargo (opcional)"
                      variant="bordered"
                      value={values.cargo}
                      onChange={handleChange("cargo")}
                    />
                    <div className="grid grid-cols-2 gap-4">
                      <Input
                        label="Email (opcional)"
                        variant="bordered"
                        value={values.email}
                        onChange={handleChange("email")}
                        isInvalid={!!errors.email && !!touched.email}
                        errorMessage={errors.email}
                      />
                      <Input
                        label="Canal preferido (opcional)"
                        placeholder="EMAIL, TELEFONO, WHATSAPP…"
                        variant="bordered"
                        value={values.canal_preferido}
                        onChange={handleChange("canal_preferido")}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <Input
                        label="Teléfono (opcional)"
                        variant="bordered"
                        value={values.telefono}
                        onChange={handleChange("telefono")}
                      />
                      <Input
                        label="Celular (opcional)"
                        variant="bordered"
                        value={values.celular}
                        onChange={handleChange("celular")}
                      />
                    </div>
                    <div className="flex gap-6">
                      <div className="flex items-center gap-2">
                        <Switch
                          size="sm"
                          isSelected={values.es_contacto_principal}
                          onValueChange={(v) => setFieldValue("es_contacto_principal", v)}
                        />
                        <span className="text-small">Contacto principal</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          size="sm"
                          isSelected={values.es_firmante_autorizado}
                          onValueChange={(v) => setFieldValue("es_firmante_autorizado", v)}
                        />
                        <span className="text-small">Firmante autorizado</span>
                      </div>
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
    </div>
  );
}
