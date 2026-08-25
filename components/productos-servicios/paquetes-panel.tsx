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
import { PaqueteSchema, PaqueteLineaSchema } from "@/helpers/schemas";
import type { PaqueteFormType, PaqueteLineaFormType } from "@/helpers/types";
import {
  crearPaquete,
  actualizarPaquete,
  cambiarEstadoPaquete,
  crearLineaPaquete,
  eliminarLineaPaquete,
} from "@/app/(app)/productos-servicios/actions";

type Paquete = Tables<"paquetes_servicios">;
type LineaPaquete = Tables<"paquetes_servicios_detalle">;

const TIPOS_ITEM = [
  { id: "SERVICIO", etiqueta: "Servicio" },
  { id: "ROL_TARIFA", etiqueta: "Rol / tarifa" },
];

function formatearMoneda(valor: number | null, codigoIso: string | undefined): string {
  if (valor == null) return "—";
  const numero = valor.toLocaleString("es-CO", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return codigoIso ? `${codigoIso} ${numero}` : numero;
}

interface Props {
  paquetes: Paquete[];
  lineasPaquete: LineaPaquete[];
  servicios: Tables<"catalogo_servicios">[];
  rolesTarifa: Tables<"catalogo_roles_tarifa">[];
  monedas: Tables<"monedas">[];
  puedeCrear: boolean;
  puedeEditar: boolean;
}

export function PaquetesPanel({
  paquetes,
  lineasPaquete,
  servicios,
  rolesTarifa,
  monedas,
  puedeCrear,
  puedeEditar,
}: Props) {
  const router = useRouter();
  const [modalPaqueteAbierto, setModalPaqueteAbierto] = useState(false);
  const [paqueteEnEdicion, setPaqueteEnEdicion] = useState<Paquete | null>(null);
  const [paqueteParaLinea, setPaqueteParaLinea] = useState<Paquete | null>(null);
  const [filaEnProceso, setFilaEnProceso] = useState<string | null>(null);
  const [errorGeneral, setErrorGeneral] = useState("");
  const [guardando, setGuardando] = useState(false);

  const lineasPorPaquete = useMemo(() => {
    const mapa = new Map<string, LineaPaquete[]>();
    for (const linea of lineasPaquete) {
      const lista = mapa.get(linea.paquete_id) ?? [];
      lista.push(linea);
      mapa.set(linea.paquete_id, lista);
    }
    return mapa;
  }, [lineasPaquete]);

  const opcionesMoneda = monedas.map((m) => ({ id: m.id, etiqueta: `${m.codigo_iso} — ${m.nombre}` }));
  const opcionesServicio = servicios.map((s) => ({ id: s.id, etiqueta: `${s.codigo} — ${s.nombre}` }));
  const opcionesRolTarifa = rolesTarifa.map((r) => ({ id: r.id, etiqueta: r.nombre_rol }));

  const abrirCrear = () => {
    setPaqueteEnEdicion(null);
    setErrorGeneral("");
    setModalPaqueteAbierto(true);
  };
  const abrirEditar = (paquete: Paquete) => {
    setPaqueteEnEdicion(paquete);
    setErrorGeneral("");
    setModalPaqueteAbierto(true);
  };

  const handleEstado = async (id: string, activo: boolean) => {
    setFilaEnProceso(id);
    const resultado = await cambiarEstadoPaquete(id, activo);
    setFilaEnProceso(null);
    if (!resultado.ok) {
      setErrorGeneral(resultado.error);
      return;
    }
    router.refresh();
  };

  const handleEliminarLinea = async (id: string) => {
    setFilaEnProceso(id);
    const resultado = await eliminarLineaPaquete(id);
    setFilaEnProceso(null);
    if (!resultado.ok) {
      setErrorGeneral(resultado.error);
      return;
    }
    router.refresh();
  };

  const initialValuesPaquete: PaqueteFormType = {
    nombre: paqueteEnEdicion?.nombre ?? "",
    descripcion: paqueteEnEdicion?.descripcion ?? "",
    precio_total_paquete: paqueteEnEdicion ? String(paqueteEnEdicion.precio_total_paquete) : "",
    moneda_id: paqueteEnEdicion?.moneda_id ?? "",
    vigencia_desde: paqueteEnEdicion?.vigencia_desde ?? "",
    vigencia_hasta: paqueteEnEdicion?.vigencia_hasta ?? "",
  };

  const initialValuesLinea: PaqueteLineaFormType = {
    tipo_item: "SERVICIO",
    servicio_id: "",
    rol_tarifa_id: "",
    cantidad: "1",
    precio_unitario_paquete: "",
  };

  return (
    <div className="flex flex-col gap-4 py-2">
      {puedeCrear && (
        <div className="flex justify-end">
          <Button color="primary" size="sm" onPress={abrirCrear}>
            Nuevo paquete
          </Button>
        </div>
      )}

      {errorGeneral && <p className="text-danger text-sm">{errorGeneral}</p>}

      {paquetes.length === 0 ? (
        <p className="text-default-500 text-sm">No hay paquetes de servicios registrados todavía.</p>
      ) : (
        <Accordion variant="bordered" selectionMode="multiple">
          {paquetes.map((paquete) => {
            const lineas = lineasPorPaquete.get(paquete.id) ?? [];
            const moneda = monedas.find((m) => m.id === paquete.moneda_id);
            return (
              <AccordionItem
                key={paquete.id}
                aria-label={paquete.nombre}
                title={
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="font-medium">{paquete.nombre}</span>
                    <Chip size="sm" color={paquete.activo ? "success" : "default"} variant="flat">
                      {paquete.activo ? "Activo" : "Inactivo"}
                    </Chip>
                    <span className="text-tiny text-default-400">
                      {formatearMoneda(paquete.precio_total_paquete, moneda?.codigo_iso)}
                    </span>
                    <span className="text-tiny text-default-400">
                      {lineas.length} ítem{lineas.length === 1 ? "" : "s"}
                    </span>
                  </div>
                }
              >
                <div className="flex flex-col gap-3 pb-2">
                  {paquete.descripcion && <p className="text-default-500 text-sm">{paquete.descripcion}</p>}
                  <div className="flex gap-4 text-tiny text-default-500">
                    {paquete.vigencia_desde && <span>Vigente desde: {paquete.vigencia_desde}</span>}
                    {paquete.vigencia_hasta && <span>Vigente hasta: {paquete.vigencia_hasta}</span>}
                  </div>

                  {puedeEditar && (
                    <div className="flex gap-2 items-center flex-wrap">
                      <Button size="sm" variant="light" onPress={() => abrirEditar(paquete)}>
                        Editar paquete
                      </Button>
                      <div className="flex items-center gap-2">
                        <span className="text-tiny text-default-500">Activo</span>
                        <Switch
                          size="sm"
                          isSelected={paquete.activo}
                          isDisabled={filaEnProceso === paquete.id}
                          onValueChange={(activo) => handleEstado(paquete.id, activo)}
                        />
                      </div>
                      {puedeCrear && (
                        <Button
                          size="sm"
                          variant="flat"
                          color="primary"
                          onPress={() => {
                            setPaqueteParaLinea(paquete);
                            setErrorGeneral("");
                          }}
                        >
                          Agregar ítem
                        </Button>
                      )}
                    </div>
                  )}

                  <Table aria-label={`Ítems de ${paquete.nombre}`} removeWrapper={false}>
                    <TableHeader>
                      <TableColumn>TIPO</TableColumn>
                      <TableColumn>ÍTEM</TableColumn>
                      <TableColumn>CANTIDAD</TableColumn>
                      <TableColumn>PRECIO EN EL PAQUETE</TableColumn>
                      <TableColumn>ACCIONES</TableColumn>
                    </TableHeader>
                    <TableBody emptyContent="Este paquete todavía no tiene ítems definidos.">
                      {lineas.map((linea) => {
                        const servicio = servicios.find((s) => s.id === linea.servicio_id);
                        const rol = rolesTarifa.find((r) => r.id === linea.rol_tarifa_id);
                        return (
                          <TableRow key={linea.id}>
                            <TableCell>
                              <Chip size="sm" variant="flat">
                                {linea.servicio_id ? "Servicio" : "Rol / tarifa"}
                              </Chip>
                            </TableCell>
                            <TableCell>{servicio?.nombre ?? rol?.nombre_rol ?? "—"}</TableCell>
                            <TableCell>{linea.cantidad}</TableCell>
                            <TableCell>{formatearMoneda(linea.precio_unitario_paquete, moneda?.codigo_iso)}</TableCell>
                            <TableCell>
                              {puedeEditar && (
                                <Button
                                  size="sm"
                                  variant="light"
                                  color="danger"
                                  isLoading={filaEnProceso === linea.id}
                                  onPress={() => handleEliminarLinea(linea.id)}
                                >
                                  Quitar
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </AccordionItem>
            );
          })}
        </Accordion>
      )}

      {/* Modal: crear/editar paquete */}
      <Modal isOpen={modalPaqueteAbierto} onOpenChange={setModalPaqueteAbierto} size="2xl" scrollBehavior="inside">
        <ModalContent>
          {(cerrar) => (
            <Formik
              enableReinitialize
              initialValues={initialValuesPaquete}
              validationSchema={PaqueteSchema}
              onSubmit={async (valores) => {
                setGuardando(true);
                setErrorGeneral("");

                const formData = new FormData();
                Object.entries(valores).forEach(([clave, valor]) => {
                  formData.set(clave, valor ?? "");
                });

                const resultado = paqueteEnEdicion
                  ? await actualizarPaquete(paqueteEnEdicion.id, formData)
                  : await crearPaquete(formData);

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
                  <ModalHeader>{paqueteEnEdicion ? "Editar paquete" : "Nuevo paquete"}</ModalHeader>
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
                    <div className="grid grid-cols-2 gap-4">
                      <Input
                        label="Precio total del paquete"
                        type="number"
                        step="0.01"
                        variant="bordered"
                        value={values.precio_total_paquete}
                        onChange={handleChange("precio_total_paquete")}
                        isInvalid={!!errors.precio_total_paquete && !!touched.precio_total_paquete}
                        errorMessage={errors.precio_total_paquete}
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
                    <p className="text-tiny text-default-400">
                      El precio total es independiente de la suma de los ítems — puede reflejar un descuento por
                      empaquetamiento.
                    </p>
                    <div className="grid grid-cols-2 gap-4">
                      <Input
                        label="Vigente desde (opcional)"
                        type="date"
                        variant="bordered"
                        value={values.vigencia_desde}
                        onChange={handleChange("vigencia_desde")}
                      />
                      <Input
                        label="Vigente hasta (opcional)"
                        type="date"
                        variant="bordered"
                        value={values.vigencia_hasta}
                        onChange={handleChange("vigencia_hasta")}
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

      {/* Modal: agregar ítem a un paquete */}
      <Modal isOpen={!!paqueteParaLinea} onOpenChange={(abierto) => !abierto && setPaqueteParaLinea(null)}>
        <ModalContent>
          {(cerrar) => (
            <Formik
              initialValues={initialValuesLinea}
              validationSchema={PaqueteLineaSchema}
              onSubmit={async (valores, { resetForm }) => {
                if (!paqueteParaLinea) return;
                setGuardando(true);
                setErrorGeneral("");

                const formData = new FormData();
                Object.entries(valores).forEach(([clave, valor]) => {
                  formData.set(clave, valor ?? "");
                });

                const resultado = await crearLineaPaquete(paqueteParaLinea.id, formData);
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
                  <ModalHeader>Agregar ítem — {paqueteParaLinea?.nombre}</ModalHeader>
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
                    {values.tipo_item === "SERVICIO" ? (
                      <div className="flex flex-col gap-1">
                        <span className="text-small text-default-600">Servicio</span>
                        <DropdownSelector
                          etiquetaAria="Servicio"
                          opciones={opcionesServicio}
                          valor={values.servicio_id || null}
                          onCambiar={(id) => setFieldValue("servicio_id", id ?? "")}
                        />
                      </div>
                    ) : (
                      <div className="flex flex-col gap-1">
                        <span className="text-small text-default-600">Rol / tarifa</span>
                        <DropdownSelector
                          etiquetaAria="Rol / tarifa"
                          opciones={opcionesRolTarifa}
                          valor={values.rol_tarifa_id || null}
                          onCambiar={(id) => setFieldValue("rol_tarifa_id", id ?? "")}
                        />
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-4">
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
                        label="Precio unitario en el paquete"
                        type="number"
                        step="0.01"
                        variant="bordered"
                        value={values.precio_unitario_paquete}
                        onChange={handleChange("precio_unitario_paquete")}
                        isInvalid={!!errors.precio_unitario_paquete && !!touched.precio_unitario_paquete}
                        errorMessage={errors.precio_unitario_paquete}
                      />
                    </div>
                    {errorGeneral && <p className="text-danger text-sm">{errorGeneral}</p>}
                  </ModalBody>
                  <ModalFooter>
                    <Button variant="flat" onPress={cerrar}>
                      Cerrar
                    </Button>
                    <Button color="primary" isLoading={guardando} onPress={() => handleSubmit()}>
                      Agregar
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
