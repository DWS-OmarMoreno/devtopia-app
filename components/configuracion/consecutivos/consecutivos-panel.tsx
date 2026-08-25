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
} from "@nextui-org/react";
import { Formik } from "formik";
import type { Tables } from "@/utils/database.types";
import { DropdownSelector } from "@/components/shared/dropdown-selector";
import { SecuenciaSchema } from "@/helpers/schemas";
import type { SecuenciaFormType } from "@/helpers/types";
import {
  crearSecuencia,
  actualizarSecuencia,
  cambiarEstadoSecuencia,
} from "@/app/(app)/configuracion/consecutivos/actions";

type Secuencia = Tables<"secuencias_numeracion">;

const REINICIOS = [
  { id: "NUNCA", etiqueta: "Nunca" },
  { id: "ANUAL", etiqueta: "Cada año" },
  { id: "MENSUAL", etiqueta: "Cada mes" },
];

function previsualizar(v: SecuenciaFormType): string {
  const anio = v.incluir_anio ? new Date().getFullYear().toString().slice(v.formato_anio === "YY" ? -2 : -4) : "";
  const mes = v.incluir_mes ? String(new Date().getMonth() + 1).padStart(2, "0") : "";
  const partes = [v.prefijo, anio, mes].filter(Boolean);
  const numero = String(Number(v.numero_actual) + 1).padStart(Number(v.longitud_ceros) || 4, "0");
  return [...partes, numero].join(v.separador || "-") + (v.sufijo ?? "");
}

interface Props {
  secuencias: Secuencia[];
  puedeCrear: boolean;
  puedeEditar: boolean;
}

export function ConsecutivosPanel({ secuencias, puedeCrear, puedeEditar }: Props) {
  const router = useRouter();
  const [modalAbierto, setModalAbierto] = useState(false);
  const [enEdicion, setEnEdicion] = useState<Secuencia | null>(null);
  const [filaEnProceso, setFilaEnProceso] = useState<string | null>(null);
  const [errorGeneral, setErrorGeneral] = useState("");
  const [guardando, setGuardando] = useState(false);

  const abrirCrear = () => {
    setEnEdicion(null);
    setErrorGeneral("");
    setModalAbierto(true);
  };

  const abrirEditar = (secuencia: Secuencia) => {
    setEnEdicion(secuencia);
    setErrorGeneral("");
    setModalAbierto(true);
  };

  const handleEstado = async (id: string, activo: boolean) => {
    setFilaEnProceso(id);
    const resultado = await cambiarEstadoSecuencia(id, activo);
    setFilaEnProceso(null);
    if (!resultado.ok) {
      setErrorGeneral(resultado.error);
      return;
    }
    router.refresh();
  };

  const initialValues: SecuenciaFormType = {
    codigo_secuencia: enEdicion?.codigo_secuencia ?? "",
    tipo_documento: enEdicion?.tipo_documento ?? "",
    prefijo: enEdicion?.prefijo ?? "",
    sufijo: enEdicion?.sufijo ?? "",
    longitud_ceros: String(enEdicion?.longitud_ceros ?? 4),
    incluir_anio: enEdicion?.incluir_anio ?? true,
    formato_anio: enEdicion?.formato_anio ?? "YYYY",
    incluir_mes: enEdicion?.incluir_mes ?? false,
    formato_mes: enEdicion?.formato_mes ?? "MM",
    separador: enEdicion?.separador ?? "-",
    numero_inicial: String(enEdicion?.numero_inicial ?? 1),
    numero_actual: String(enEdicion?.numero_actual ?? 0),
    reinicio: enEdicion?.reinicio ?? "NUNCA",
  };

  return (
    <div className="flex flex-col gap-4 py-2">
      {puedeCrear && (
        <div className="flex justify-end">
          <Button color="primary" size="sm" onPress={abrirCrear}>
            Nueva secuencia
          </Button>
        </div>
      )}

      {errorGeneral && <p className="text-danger text-sm">{errorGeneral}</p>}

      <Table aria-label="Secuencias de numeración" removeWrapper={false}>
        <TableHeader>
          <TableColumn>DOCUMENTO</TableColumn>
          <TableColumn>CÓDIGO</TableColumn>
          <TableColumn>FORMATO</TableColumn>
          <TableColumn>NÚMERO ACTUAL</TableColumn>
          <TableColumn>REINICIO</TableColumn>
          <TableColumn>ESTADO</TableColumn>
          <TableColumn>ACCIONES</TableColumn>
        </TableHeader>
        <TableBody emptyContent="No hay secuencias configuradas todavía.">
          {secuencias.map((s) => (
            <TableRow key={s.id}>
              <TableCell>{s.tipo_documento}</TableCell>
              <TableCell>{s.codigo_secuencia}</TableCell>
              <TableCell className="text-tiny text-default-500">
                {[s.prefijo, s.incluir_anio ? s.formato_anio : null, s.incluir_mes ? s.formato_mes : null]
                  .filter(Boolean)
                  .join(s.separador || "-")}
                {"…"}
                {s.sufijo ?? ""}
              </TableCell>
              <TableCell>{s.numero_actual}</TableCell>
              <TableCell>
                {REINICIOS.find((r) => r.id === s.reinicio)?.etiqueta ?? s.reinicio}
              </TableCell>
              <TableCell>
                {puedeEditar ? (
                  <Switch
                    size="sm"
                    isSelected={s.activo}
                    isDisabled={filaEnProceso === s.id}
                    onValueChange={(activo) => handleEstado(s.id, activo)}
                  />
                ) : (
                  <Chip color={s.activo ? "success" : "default"} variant="flat">
                    {s.activo ? "Activa" : "Inactiva"}
                  </Chip>
                )}
              </TableCell>
              <TableCell>
                {puedeEditar && (
                  <Button size="sm" variant="light" onPress={() => abrirEditar(s)}>
                    Editar
                  </Button>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Modal isOpen={modalAbierto} onOpenChange={setModalAbierto} size="2xl">
        <ModalContent>
          {(cerrar) => (
            <Formik
              enableReinitialize
              initialValues={initialValues}
              validationSchema={SecuenciaSchema}
              onSubmit={async (valores) => {
                setGuardando(true);
                setErrorGeneral("");

                const formData = new FormData();
                Object.entries(valores).forEach(([clave, valor]) => {
                  formData.set(
                    clave,
                    typeof valor === "boolean" ? String(valor) : valor === null || valor === undefined ? "" : String(valor)
                  );
                });

                const resultado = enEdicion
                  ? await actualizarSecuencia(enEdicion.id, formData)
                  : await crearSecuencia(formData);

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
                  <ModalHeader>{enEdicion ? "Editar secuencia" : "Nueva secuencia"}</ModalHeader>
                  <ModalBody className="gap-4">
                    <div className="grid md:grid-cols-2 gap-4">
                      <Input
                        label="Código de secuencia"
                        variant="bordered"
                        value={values.codigo_secuencia}
                        onChange={handleChange("codigo_secuencia")}
                        isInvalid={!!errors.codigo_secuencia && !!touched.codigo_secuencia}
                        errorMessage={errors.codigo_secuencia}
                      />
                      <Input
                        label="Tipo de documento"
                        variant="bordered"
                        placeholder="COTIZACION, CONTRATO, ORDEN_COSTO…"
                        value={values.tipo_documento}
                        onChange={handleChange("tipo_documento")}
                        isInvalid={!!errors.tipo_documento && !!touched.tipo_documento}
                        errorMessage={errors.tipo_documento}
                      />
                      <Input
                        label="Prefijo"
                        variant="bordered"
                        value={values.prefijo}
                        onChange={handleChange("prefijo")}
                      />
                      <Input
                        label="Sufijo"
                        variant="bordered"
                        value={values.sufijo}
                        onChange={handleChange("sufijo")}
                      />
                      <Input
                        label="Separador"
                        variant="bordered"
                        value={values.separador}
                        onChange={handleChange("separador")}
                      />
                      <Input
                        label="Longitud en ceros"
                        type="number"
                        variant="bordered"
                        value={values.longitud_ceros}
                        onChange={handleChange("longitud_ceros")}
                        isInvalid={!!errors.longitud_ceros && !!touched.longitud_ceros}
                        errorMessage={errors.longitud_ceros}
                      />
                    </div>

                    <div className="flex flex-wrap gap-6 items-center">
                      <Switch
                        size="sm"
                        isSelected={values.incluir_anio}
                        onValueChange={(v) => setFieldValue("incluir_anio", v)}
                      >
                        Incluir año
                      </Switch>
                      {values.incluir_anio && (
                        <Input
                          size="sm"
                          label="Formato de año"
                          variant="bordered"
                          className="max-w-[140px]"
                          value={values.formato_anio}
                          onChange={handleChange("formato_anio")}
                        />
                      )}
                      <Switch
                        size="sm"
                        isSelected={values.incluir_mes}
                        onValueChange={(v) => setFieldValue("incluir_mes", v)}
                      >
                        Incluir mes
                      </Switch>
                      {values.incluir_mes && (
                        <Input
                          size="sm"
                          label="Formato de mes"
                          variant="bordered"
                          className="max-w-[140px]"
                          value={values.formato_mes}
                          onChange={handleChange("formato_mes")}
                        />
                      )}
                    </div>

                    <div className="grid md:grid-cols-3 gap-4">
                      <Input
                        label="Número inicial"
                        type="number"
                        variant="bordered"
                        value={values.numero_inicial}
                        onChange={handleChange("numero_inicial")}
                      />
                      <Input
                        label="Número actual"
                        type="number"
                        variant="bordered"
                        value={values.numero_actual}
                        onChange={handleChange("numero_actual")}
                        isInvalid={!!errors.numero_actual && !!touched.numero_actual}
                        errorMessage={errors.numero_actual}
                      />
                      <div className="flex flex-col gap-1">
                        <span className="text-small text-default-600">Reinicio</span>
                        <DropdownSelector
                          etiquetaAria="Reinicio"
                          opciones={REINICIOS}
                          valor={values.reinicio || "NUNCA"}
                          onCambiar={(id) => setFieldValue("reinicio", id ?? "NUNCA")}
                        />
                      </div>
                    </div>

                    <p className="text-tiny text-warning-600">
                      Cambiar el número actual manualmente puede generar números
                      de documento duplicados si ya se generaron consecutivos con
                      ese valor. Edítalo solo para corregir una desincronización
                      puntual y verifica el último documento emitido antes de
                      guardar.
                    </p>

                    <p className="text-tiny text-default-500">
                      Próximo número: <span className="font-mono">{previsualizar(values)}</span>
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
              )}
            </Formik>
          )}
        </ModalContent>
      </Modal>
    </div>
  );
}
