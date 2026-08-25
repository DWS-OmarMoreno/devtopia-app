"use client";

import { useState } from "react";
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
} from "@nextui-org/react";
import { Formik } from "formik";
import type { Tables } from "@/utils/database.types";
import { DropdownSelector } from "@/components/shared/dropdown-selector";
import { ServicioSchema } from "@/helpers/schemas";
import type { ServicioFormType } from "@/helpers/types";
import {
  cambiarEstadoServicio,
  crearServicio,
  actualizarServicio,
} from "@/app/(app)/productos-servicios/actions";

export type ServicioConRelaciones = Tables<"catalogo_servicios"> & {
  categorias_servicio: { nombre: string } | null;
  sla_planes: { nombre: string } | null;
};

const TIPOS_SERVICIO = [
  "CONSULTORIA",
  "DESARROLLO",
  "SOPORTE",
  "IMPLEMENTACION",
  "CAPACITACION",
  "LICENCIAMIENTO",
];

// El check constraint de catalogo_servicios.unidad_medida solo acepta estos
// valores — ver 20260825000003_productos_servicios.sql.
const UNIDADES_MEDIDA = ["HORA", "DIA", "PROYECTO", "MES", "UNIDAD"];

interface Props {
  servicios: ServicioConRelaciones[];
  categorias: Tables<"categorias_servicio">[];
  planesSla: Tables<"sla_planes">[];
  monedas: Tables<"monedas">[];
  puedeCrear: boolean;
  puedeEditar: boolean;
}

export function ServiciosPanel({
  servicios,
  categorias,
  planesSla,
  monedas,
  puedeCrear,
  puedeEditar,
}: Props) {
  const router = useRouter();
  const [modalAbierto, setModalAbierto] = useState(false);
  const [enEdicion, setEnEdicion] = useState<ServicioConRelaciones | null>(null);
  const [filaEnProceso, setFilaEnProceso] = useState<string | null>(null);
  const [errorGeneral, setErrorGeneral] = useState("");
  const [guardando, setGuardando] = useState(false);

  const opcionesCategoria = categorias.map((c) => ({ id: c.id, etiqueta: c.nombre }));
  const opcionesSla = planesSla.map((p) => ({ id: p.id, etiqueta: p.nombre }));
  const opcionesMoneda = monedas.map((m) => ({ id: m.id, etiqueta: `${m.codigo_iso} — ${m.nombre}` }));
  const opcionesTipo = TIPOS_SERVICIO.map((t) => ({ id: t, etiqueta: t }));
  const opcionesUnidad = UNIDADES_MEDIDA.map((u) => ({ id: u, etiqueta: u }));

  const abrirCrear = () => {
    setEnEdicion(null);
    setErrorGeneral("");
    setModalAbierto(true);
  };
  const abrirEditar = (servicio: ServicioConRelaciones) => {
    setEnEdicion(servicio);
    setErrorGeneral("");
    setModalAbierto(true);
  };

  const handleEstado = async (id: string, activo: boolean) => {
    setFilaEnProceso(id);
    const resultado = await cambiarEstadoServicio(id, activo);
    setFilaEnProceso(null);
    if (!resultado.ok) {
      setErrorGeneral(resultado.error);
      return;
    }
    router.refresh();
  };

  const initialValues: ServicioFormType = {
    codigo: enEdicion?.codigo ?? "",
    nombre: enEdicion?.nombre ?? "",
    descripcion: enEdicion?.descripcion ?? "",
    categoria_id: enEdicion?.categoria_id ?? "",
    tipo_servicio: enEdicion?.tipo_servicio ?? "",
    unidad_medida: enEdicion?.unidad_medida ?? "",
    tarifa_estandar: enEdicion ? String(enEdicion.tarifa_estandar) : "",
    moneda_id: enEdicion?.moneda_id ?? "",
    sla_plan_id: enEdicion?.sla_plan_id ?? "",
    requiere_aprobacion_cotizacion: enEdicion?.requiere_aprobacion_cotizacion ?? false,
    fecha_vigencia_desde: enEdicion?.fecha_vigencia_desde ?? "",
    fecha_vigencia_hasta: enEdicion?.fecha_vigencia_hasta ?? "",
  };

  return (
    <div className="flex flex-col gap-4 py-2">
      {puedeCrear && (
        <div className="flex justify-end">
          <Button color="primary" size="sm" onPress={abrirCrear}>
            Nuevo servicio
          </Button>
        </div>
      )}

      {errorGeneral && <p className="text-danger text-sm">{errorGeneral}</p>}

      <Table aria-label="Catálogo de servicios" removeWrapper={false}>
        <TableHeader>
          <TableColumn>CÓDIGO</TableColumn>
          <TableColumn>NOMBRE</TableColumn>
          <TableColumn>CATEGORÍA</TableColumn>
          <TableColumn>TIPO</TableColumn>
          <TableColumn>TARIFA</TableColumn>
          <TableColumn>SLA</TableColumn>
          <TableColumn>ESTADO</TableColumn>
          <TableColumn>ACCIONES</TableColumn>
        </TableHeader>
        <TableBody emptyContent="No hay servicios en el catálogo todavía.">
          {servicios.map((servicio) => (
            <TableRow key={servicio.id}>
              <TableCell className="font-mono text-tiny">{servicio.codigo}</TableCell>
              <TableCell>
                <div className="flex flex-col">
                  <span className="font-medium">{servicio.nombre}</span>
                  {servicio.requiere_aprobacion_cotizacion && (
                    <span className="text-tiny text-warning-600">Requiere aprobación</span>
                  )}
                </div>
              </TableCell>
              <TableCell>{servicio.categorias_servicio?.nombre ?? "—"}</TableCell>
              <TableCell>
                <Chip size="sm" variant="flat">
                  {servicio.tipo_servicio}
                </Chip>
              </TableCell>
              <TableCell>
                {servicio.tarifa_estandar.toLocaleString("es-CO", { minimumFractionDigits: 2 })} /{" "}
                {servicio.unidad_medida.toLowerCase()}
              </TableCell>
              <TableCell>{servicio.sla_planes?.nombre ?? "—"}</TableCell>
              <TableCell>
                {puedeEditar ? (
                  <Switch
                    size="sm"
                    isSelected={servicio.activo}
                    isDisabled={filaEnProceso === servicio.id}
                    onValueChange={(activo) => handleEstado(servicio.id, activo)}
                  />
                ) : (
                  <Chip color={servicio.activo ? "success" : "default"} variant="flat">
                    {servicio.activo ? "Activo" : "Inactivo"}
                  </Chip>
                )}
              </TableCell>
              <TableCell>
                {puedeEditar && (
                  <Button size="sm" variant="light" onPress={() => abrirEditar(servicio)}>
                    Editar
                  </Button>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Modal isOpen={modalAbierto} onOpenChange={setModalAbierto} size="2xl" scrollBehavior="inside">
        <ModalContent>
          {(cerrar) => (
            <Formik
              enableReinitialize
              initialValues={initialValues}
              validationSchema={ServicioSchema}
              onSubmit={async (valores) => {
                setGuardando(true);
                setErrorGeneral("");

                const formData = new FormData();
                formData.set("codigo", valores.codigo);
                formData.set("nombre", valores.nombre);
                formData.set("descripcion", valores.descripcion ?? "");
                formData.set("categoria_id", valores.categoria_id ?? "");
                formData.set("tipo_servicio", valores.tipo_servicio);
                formData.set("unidad_medida", valores.unidad_medida);
                formData.set("tarifa_estandar", valores.tarifa_estandar);
                formData.set("moneda_id", valores.moneda_id);
                formData.set("sla_plan_id", valores.sla_plan_id ?? "");
                formData.set(
                  "requiere_aprobacion_cotizacion",
                  valores.requiere_aprobacion_cotizacion ? "true" : "false"
                );
                formData.set("fecha_vigencia_desde", valores.fecha_vigencia_desde ?? "");
                formData.set("fecha_vigencia_hasta", valores.fecha_vigencia_hasta ?? "");

                const resultado = enEdicion
                  ? await actualizarServicio(enEdicion.id, formData)
                  : await crearServicio(formData);

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
                  <ModalHeader>{enEdicion ? "Editar servicio" : "Nuevo servicio"}</ModalHeader>
                  <ModalBody className="gap-4">
                    <div className="grid grid-cols-2 gap-4">
                      <Input
                        label="Código"
                        variant="bordered"
                        value={values.codigo}
                        onChange={handleChange("codigo")}
                        isInvalid={!!errors.codigo && !!touched.codigo}
                        errorMessage={errors.codigo}
                      />
                      <Input
                        label="Nombre"
                        variant="bordered"
                        value={values.nombre}
                        onChange={handleChange("nombre")}
                        isInvalid={!!errors.nombre && !!touched.nombre}
                        errorMessage={errors.nombre}
                      />
                    </div>
                    <Textarea
                      label="Descripción"
                      variant="bordered"
                      value={values.descripcion}
                      onChange={handleChange("descripcion")}
                    />
                    <div className="grid grid-cols-2 gap-4">
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
                      <div className="flex flex-col gap-1">
                        <span className="text-small text-default-600">Tipo de servicio</span>
                        <DropdownSelector
                          etiquetaAria="Tipo de servicio"
                          opciones={opcionesTipo}
                          valor={values.tipo_servicio || null}
                          onCambiar={(id) => setFieldValue("tipo_servicio", id ?? "")}
                        />
                        {!!errors.tipo_servicio && !!touched.tipo_servicio && (
                          <span className="text-tiny text-danger">{errors.tipo_servicio}</span>
                        )}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex flex-col gap-1">
                        <span className="text-small text-default-600">Unidad de medida</span>
                        <DropdownSelector
                          etiquetaAria="Unidad de medida"
                          opciones={opcionesUnidad}
                          valor={values.unidad_medida || null}
                          onCambiar={(id) => setFieldValue("unidad_medida", id ?? "")}
                        />
                        {!!errors.unidad_medida && !!touched.unidad_medida && (
                          <span className="text-tiny text-danger">{errors.unidad_medida}</span>
                        )}
                      </div>
                      <Input
                        label="Tarifa estándar"
                        type="number"
                        step="0.01"
                        variant="bordered"
                        value={values.tarifa_estandar}
                        onChange={handleChange("tarifa_estandar")}
                        isInvalid={!!errors.tarifa_estandar && !!touched.tarifa_estandar}
                        errorMessage={errors.tarifa_estandar}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
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
                      <div className="flex flex-col gap-1">
                        <span className="text-small text-default-600">Plan SLA (opcional)</span>
                        <DropdownSelector
                          etiquetaAria="Plan SLA"
                          opciones={opcionesSla}
                          valor={values.sla_plan_id || null}
                          onCambiar={(id) => setFieldValue("sla_plan_id", id ?? "")}
                          permitirVacio
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <Input
                        label="Vigente desde (opcional)"
                        type="date"
                        variant="bordered"
                        value={values.fecha_vigencia_desde}
                        onChange={handleChange("fecha_vigencia_desde")}
                      />
                      <Input
                        label="Vigente hasta (opcional)"
                        type="date"
                        variant="bordered"
                        value={values.fecha_vigencia_hasta}
                        onChange={handleChange("fecha_vigencia_hasta")}
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        size="sm"
                        isSelected={values.requiere_aprobacion_cotizacion}
                        onValueChange={(valor) =>
                          setFieldValue("requiere_aprobacion_cotizacion", valor)
                        }
                      />
                      <span className="text-small">
                        Requiere aprobación al incluirse en una cotización
                      </span>
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
