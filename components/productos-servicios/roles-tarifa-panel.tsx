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
import { RolTarifaSchema } from "@/helpers/schemas";
import type { RolTarifaFormType } from "@/helpers/types";
import {
  cambiarEstadoRolTarifa,
  crearRolTarifa,
  actualizarRolTarifa,
} from "@/app/(app)/productos-servicios/actions";

type RolTarifa = Tables<"catalogo_roles_tarifa">;

const NIVELES_EXPERIENCIA = ["JUNIOR", "MID", "SENIOR", "LEAD"];

interface Props {
  rolesTarifa: RolTarifa[];
  monedas: Tables<"monedas">[];
  puedeCrear: boolean;
  puedeEditar: boolean;
}

const hoyISO = () => new Date().toISOString().slice(0, 10);

export function RolesTarifaPanel({ rolesTarifa, monedas, puedeCrear, puedeEditar }: Props) {
  const router = useRouter();
  const [modalAbierto, setModalAbierto] = useState(false);
  const [enEdicion, setEnEdicion] = useState<RolTarifa | null>(null);
  const [filaEnProceso, setFilaEnProceso] = useState<string | null>(null);
  const [errorGeneral, setErrorGeneral] = useState("");
  const [guardando, setGuardando] = useState(false);

  const monedasPorId = useMemo(() => new Map(monedas.map((m) => [m.id, m.codigo_iso])), [monedas]);
  const opcionesMoneda = monedas.map((m) => ({ id: m.id, etiqueta: `${m.codigo_iso} — ${m.nombre}` }));
  const opcionesNivel = NIVELES_EXPERIENCIA.map((n) => ({ id: n, etiqueta: n }));

  const abrirCrear = () => {
    setEnEdicion(null);
    setErrorGeneral("");
    setModalAbierto(true);
  };
  const abrirEditar = (rol: RolTarifa) => {
    setEnEdicion(rol);
    setErrorGeneral("");
    setModalAbierto(true);
  };

  const handleEstado = async (id: string, activo: boolean) => {
    setFilaEnProceso(id);
    const resultado = await cambiarEstadoRolTarifa(id, activo);
    setFilaEnProceso(null);
    if (!resultado.ok) {
      setErrorGeneral(resultado.error);
      return;
    }
    router.refresh();
  };

  const initialValues: RolTarifaFormType = {
    nombre_rol: enEdicion?.nombre_rol ?? "",
    nivel_experiencia: enEdicion?.nivel_experiencia ?? "",
    tarifa_hora_estandar: enEdicion ? String(enEdicion.tarifa_hora_estandar) : "",
    tarifa_hora_costo_referencia: enEdicion?.tarifa_hora_costo_referencia
      ? String(enEdicion.tarifa_hora_costo_referencia)
      : "",
    moneda_id: enEdicion?.moneda_id ?? "",
    vigente_desde: enEdicion?.vigente_desde ?? hoyISO(),
    vigente_hasta: enEdicion?.vigente_hasta ?? "",
  };

  return (
    <div className="flex flex-col gap-4 py-2">
      {puedeCrear && (
        <div className="flex justify-end">
          <Button color="primary" size="sm" onPress={abrirCrear}>
            Nuevo rol
          </Button>
        </div>
      )}

      {errorGeneral && <p className="text-danger text-sm">{errorGeneral}</p>}

      <Table aria-label="Roles y tarifas" removeWrapper={false}>
        <TableHeader>
          <TableColumn>ROL</TableColumn>
          <TableColumn>NIVEL</TableColumn>
          <TableColumn>TARIFA ESTÁNDAR</TableColumn>
          <TableColumn>VIGENCIA</TableColumn>
          <TableColumn>ESTADO</TableColumn>
          <TableColumn>ACCIONES</TableColumn>
        </TableHeader>
        <TableBody emptyContent="No hay roles facturables registrados todavía.">
          {rolesTarifa.map((rol) => (
            <TableRow key={rol.id}>
              <TableCell className="font-medium">{rol.nombre_rol}</TableCell>
              <TableCell>{rol.nivel_experiencia ?? "—"}</TableCell>
              <TableCell>
                {rol.tarifa_hora_estandar.toLocaleString("es-CO", { minimumFractionDigits: 2 })}{" "}
                {monedasPorId.get(rol.moneda_id) ?? ""}
              </TableCell>
              <TableCell className="text-tiny text-default-500">
                {rol.vigente_desde}
                {rol.vigente_hasta ? ` → ${rol.vigente_hasta}` : " → indefinido"}
              </TableCell>
              <TableCell>
                {puedeEditar ? (
                  <Switch
                    size="sm"
                    isSelected={rol.activo}
                    isDisabled={filaEnProceso === rol.id}
                    onValueChange={(activo) => handleEstado(rol.id, activo)}
                  />
                ) : (
                  <Chip color={rol.activo ? "success" : "default"} variant="flat">
                    {rol.activo ? "Activo" : "Inactivo"}
                  </Chip>
                )}
              </TableCell>
              <TableCell>
                {puedeEditar && (
                  <Button size="sm" variant="light" onPress={() => abrirEditar(rol)}>
                    Editar
                  </Button>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Modal isOpen={modalAbierto} onOpenChange={setModalAbierto} size="lg">
        <ModalContent>
          {(cerrar) => (
            <Formik
              enableReinitialize
              initialValues={initialValues}
              validationSchema={RolTarifaSchema}
              onSubmit={async (valores) => {
                setGuardando(true);
                setErrorGeneral("");

                const formData = new FormData();
                formData.set("nombre_rol", valores.nombre_rol);
                formData.set("nivel_experiencia", valores.nivel_experiencia ?? "");
                formData.set("tarifa_hora_estandar", valores.tarifa_hora_estandar);
                formData.set("tarifa_hora_costo_referencia", valores.tarifa_hora_costo_referencia ?? "");
                formData.set("moneda_id", valores.moneda_id);
                formData.set("vigente_desde", valores.vigente_desde);
                formData.set("vigente_hasta", valores.vigente_hasta ?? "");

                const resultado = enEdicion
                  ? await actualizarRolTarifa(enEdicion.id, formData)
                  : await crearRolTarifa(formData);

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
                  <ModalHeader>{enEdicion ? "Editar rol y tarifa" : "Nuevo rol y tarifa"}</ModalHeader>
                  <ModalBody className="gap-4">
                    <Input
                      label="Nombre del rol"
                      variant="bordered"
                      value={values.nombre_rol}
                      onChange={handleChange("nombre_rol")}
                      isInvalid={!!errors.nombre_rol && !!touched.nombre_rol}
                      errorMessage={errors.nombre_rol}
                    />
                    <div className="flex flex-col gap-1">
                      <span className="text-small text-default-600">Nivel de experiencia</span>
                      <DropdownSelector
                        etiquetaAria="Nivel de experiencia"
                        opciones={opcionesNivel}
                        valor={values.nivel_experiencia || null}
                        onCambiar={(id) => setFieldValue("nivel_experiencia", id ?? "")}
                        permitirVacio
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <Input
                        label="Tarifa estándar / hora"
                        type="number"
                        step="0.01"
                        variant="bordered"
                        value={values.tarifa_hora_estandar}
                        onChange={handleChange("tarifa_hora_estandar")}
                        isInvalid={!!errors.tarifa_hora_estandar && !!touched.tarifa_hora_estandar}
                        errorMessage={errors.tarifa_hora_estandar}
                      />
                      <Input
                        label="Costo de referencia / hora"
                        type="number"
                        step="0.01"
                        variant="bordered"
                        value={values.tarifa_hora_costo_referencia}
                        onChange={handleChange("tarifa_hora_costo_referencia")}
                        isInvalid={
                          !!errors.tarifa_hora_costo_referencia && !!touched.tarifa_hora_costo_referencia
                        }
                        errorMessage={errors.tarifa_hora_costo_referencia}
                      />
                    </div>
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
                    <div className="grid grid-cols-2 gap-4">
                      <Input
                        label="Vigente desde"
                        type="date"
                        variant="bordered"
                        value={values.vigente_desde}
                        onChange={handleChange("vigente_desde")}
                        isInvalid={!!errors.vigente_desde && !!touched.vigente_desde}
                        errorMessage={errors.vigente_desde}
                      />
                      <Input
                        label="Vigente hasta (opcional)"
                        type="date"
                        variant="bordered"
                        value={values.vigente_hasta}
                        onChange={handleChange("vigente_hasta")}
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
