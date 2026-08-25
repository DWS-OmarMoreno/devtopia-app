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
import { GarantiaSchema, ExtensionGarantiaSchema } from "@/helpers/schemas";
import type { GarantiaFormType, ExtensionGarantiaFormType } from "@/helpers/types";
import { crearGarantia, actualizarGarantia, agregarExtensionGarantia } from "@/app/(app)/cierre-postventa/actions";

const ETIQUETAS_ESTADO_GARANTIA: Record<string, { texto: string; color: "success" | "warning" | "secondary" | "default" }> = {
  VIGENTE: { texto: "Vigente", color: "success" },
  EXTENDIDA: { texto: "Extendida", color: "secondary" },
  VENCIDA: { texto: "Vencida", color: "warning" },
};

interface Props {
  garantias: Tables<"garantias_contractuales">[];
  garantiaExtensiones: Tables<"garantia_extensiones">[];
  casosSoporteGarantia: Tables<"casos_soporte_referencia_externa">[];
  proyectos: { id: string; numero_proyecto: string; nombre_proyecto: string; contrato_id: string }[];
  contratos: { id: string; numero_contrato: string }[];
  puedeCrear: boolean;
  puedeEditar: boolean;
}

export function GarantiasPanel({
  garantias,
  garantiaExtensiones,
  casosSoporteGarantia,
  proyectos,
  contratos,
  puedeCrear,
  puedeEditar,
}: Props) {
  const router = useRouter();
  const [errorGeneral, setErrorGeneral] = useState("");
  const [guardando, setGuardando] = useState(false);

  const [modalCrearAbierto, setModalCrearAbierto] = useState(false);
  const [modalEditarAbierto, setModalEditarAbierto] = useState(false);
  const [garantiaDetalleId, setGarantiaDetalleId] = useState<string | null>(null);
  const [modalExtensionAbierto, setModalExtensionAbierto] = useState(false);

  const opcionesProyecto = proyectos.map((p) => ({ id: p.id, etiqueta: `${p.numero_proyecto} — ${p.nombre_proyecto}` }));
  const opcionesContrato = contratos.map((c) => ({ id: c.id, etiqueta: c.numero_contrato }));

  const nombreProyecto = (id: string | null) => (id ? opcionesProyecto.find((p) => p.id === id)?.etiqueta ?? "—" : null);
  const nombreContrato = (id: string | null) => (id ? opcionesContrato.find((c) => c.id === id)?.etiqueta ?? "—" : null);

  const garantiaDetalle = garantiaDetalleId ? garantias.find((g) => g.id === garantiaDetalleId) ?? null : null;
  const extensionesDeLaGarantiaDetalle = useMemo(
    () =>
      garantiaDetalle
        ? garantiaExtensiones
            .filter((e) => e.garantia_id === garantiaDetalle.id)
            .sort((a, b) => (a.fecha_extension < b.fecha_extension ? 1 : -1))
        : [],
    [garantiaExtensiones, garantiaDetalle]
  );
  const casosDeLaGarantiaDetalle = useMemo(
    () =>
      garantiaDetalle
        ? casosSoporteGarantia.filter(
            (c) =>
              (garantiaDetalle.proyecto_id && c.proyecto_id === garantiaDetalle.proyecto_id) ||
              (garantiaDetalle.contrato_id && c.contrato_id === garantiaDetalle.contrato_id)
          )
        : [],
    [casosSoporteGarantia, garantiaDetalle]
  );

  const initialValuesCrear: GarantiaFormType = {
    proyecto_id: "",
    contrato_id: "",
    fecha_inicio_garantia: new Date().toISOString().slice(0, 10),
    duracion_meses: "12",
    alcance_garantia: "",
    condiciones_exclusiones: "",
  };

  const initialValuesEditar: GarantiaFormType = {
    proyecto_id: garantiaDetalle?.proyecto_id ?? "",
    contrato_id: garantiaDetalle?.contrato_id ?? "",
    fecha_inicio_garantia: garantiaDetalle?.fecha_inicio_garantia ?? "",
    duracion_meses: garantiaDetalle ? String(garantiaDetalle.duracion_meses) : "",
    alcance_garantia: garantiaDetalle?.alcance_garantia ?? "",
    condiciones_exclusiones: garantiaDetalle?.condiciones_exclusiones ?? "",
  };

  const initialValuesExtension: ExtensionGarantiaFormType = { meses_adicionales: "", motivo: "", valor_adicional: "" };

  return (
    <div className="flex flex-col gap-4 py-2">
      <div className="flex items-center justify-between">
        <span className="text-small font-medium">Garantías contractuales</span>
        {puedeCrear && (
          <Button
            color="primary"
            size="sm"
            onPress={() => {
              setErrorGeneral("");
              setModalCrearAbierto(true);
            }}
          >
            Nueva garantía
          </Button>
        )}
      </div>
      <p className="text-tiny text-default-500">
        Una garantía puede asociarse a un proyecto, a un contrato, o a ambos. La fecha de fin la calcula siempre el
        sistema a partir de la fecha de inicio, la duración y las extensiones aprobadas.
      </p>

      {garantias.length === 0 ? (
        <p className="text-default-500 text-sm">No hay garantías registradas todavía.</p>
      ) : (
        <Table aria-label="Garantías contractuales" removeWrapper={false}>
          <TableHeader>
            <TableColumn>PROYECTO / CONTRATO</TableColumn>
            <TableColumn>INICIO</TableColumn>
            <TableColumn>FIN</TableColumn>
            <TableColumn>ESTADO</TableColumn>
            <TableColumn>ACCIONES</TableColumn>
          </TableHeader>
          <TableBody>
            {garantias.map((garantia) => {
              const estado = ETIQUETAS_ESTADO_GARANTIA[garantia.estado] ?? { texto: garantia.estado, color: "default" as const };
              return (
                <TableRow key={garantia.id}>
                  <TableCell className="text-tiny">
                    {[nombreProyecto(garantia.proyecto_id), nombreContrato(garantia.contrato_id)].filter(Boolean).join(" · ") || "—"}
                  </TableCell>
                  <TableCell className="text-tiny">{garantia.fecha_inicio_garantia}</TableCell>
                  <TableCell className="text-tiny">{garantia.fecha_fin_garantia}</TableCell>
                  <TableCell>
                    <Chip size="sm" variant="flat" color={estado.color}>
                      {estado.texto}
                    </Chip>
                  </TableCell>
                  <TableCell>
                    <Button size="sm" variant="light" onPress={() => setGarantiaDetalleId(garantia.id)}>
                      Ver / Gestionar
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}

      {/* Modal: crear garantía */}
      <Modal isOpen={modalCrearAbierto} onOpenChange={setModalCrearAbierto} size="lg">
        <ModalContent>
          {(cerrar) => (
            <Formik
              initialValues={initialValuesCrear}
              validationSchema={GarantiaSchema}
              onSubmit={async (valores, { resetForm }) => {
                if (!valores.proyecto_id && !valores.contrato_id) {
                  setErrorGeneral("Debes elegir al menos un proyecto o un contrato.");
                  return;
                }
                setGuardando(true);
                setErrorGeneral("");
                const formData = new FormData();
                Object.entries(valores).forEach(([clave, valor]) => formData.set(clave, valor ?? ""));
                const resultado = await crearGarantia(formData);
                setGuardando(false);
                if (!resultado.ok) {
                  setErrorGeneral(resultado.error);
                  return;
                }
                resetForm();
                router.refresh();
                setModalCrearAbierto(false);
                cerrar();
              }}
            >
              {({ values, errors, touched, handleChange, handleSubmit, setFieldValue }) => (
                <>
                  <ModalHeader>Nueva garantía contractual</ModalHeader>
                  <ModalBody className="gap-4">
                    <div className="flex flex-col gap-1">
                      <span className="text-small text-default-600">Proyecto (opcional si eliges contrato)</span>
                      <DropdownSelector
                        etiquetaAria="Proyecto"
                        opciones={opcionesProyecto}
                        valor={values.proyecto_id || null}
                        onCambiar={(id) => setFieldValue("proyecto_id", id ?? "")}
                        permitirVacio
                        etiquetaVacio="Sin proyecto"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-small text-default-600">Contrato (opcional si eliges proyecto)</span>
                      <DropdownSelector
                        etiquetaAria="Contrato"
                        opciones={opcionesContrato}
                        valor={values.contrato_id || null}
                        onCambiar={(id) => setFieldValue("contrato_id", id ?? "")}
                        permitirVacio
                        etiquetaVacio="Sin contrato"
                      />
                    </div>
                    <Input
                      label="Fecha de inicio de garantía"
                      type="date"
                      variant="bordered"
                      value={values.fecha_inicio_garantia}
                      onChange={handleChange("fecha_inicio_garantia")}
                      isInvalid={!!errors.fecha_inicio_garantia && !!touched.fecha_inicio_garantia}
                      errorMessage={errors.fecha_inicio_garantia}
                    />
                    <Input
                      label="Duración (meses)"
                      type="number"
                      variant="bordered"
                      value={values.duracion_meses}
                      onChange={handleChange("duracion_meses")}
                      isInvalid={!!errors.duracion_meses && !!touched.duracion_meses}
                      errorMessage={errors.duracion_meses}
                    />
                    <Textarea
                      label="Alcance de la garantía (opcional)"
                      variant="bordered"
                      value={values.alcance_garantia}
                      onChange={handleChange("alcance_garantia")}
                    />
                    <Textarea
                      label="Condiciones y exclusiones (opcional)"
                      variant="bordered"
                      value={values.condiciones_exclusiones}
                      onChange={handleChange("condiciones_exclusiones")}
                    />
                    {errorGeneral && <p className="text-danger text-sm">{errorGeneral}</p>}
                  </ModalBody>
                  <ModalFooter>
                    <Button variant="flat" onPress={cerrar}>
                      Cancelar
                    </Button>
                    <Button color="primary" isLoading={guardando} onPress={() => handleSubmit()}>
                      Crear
                    </Button>
                  </ModalFooter>
                </>
              )}
            </Formik>
          )}
        </ModalContent>
      </Modal>

      {/* Modal: editar garantía (solo campos descriptivos) */}
      <Modal isOpen={modalEditarAbierto} onOpenChange={setModalEditarAbierto} size="lg">
        <ModalContent>
          {(cerrar) => (
            <Formik
              enableReinitialize
              initialValues={initialValuesEditar}
              validationSchema={GarantiaSchema}
              onSubmit={async (valores) => {
                if (!garantiaDetalle) return;
                setGuardando(true);
                setErrorGeneral("");
                const formData = new FormData();
                formData.set("alcance_garantia", valores.alcance_garantia ?? "");
                formData.set("condiciones_exclusiones", valores.condiciones_exclusiones ?? "");
                const resultado = await actualizarGarantia(garantiaDetalle.id, formData);
                setGuardando(false);
                if (!resultado.ok) {
                  setErrorGeneral(resultado.error);
                  return;
                }
                router.refresh();
                setModalEditarAbierto(false);
                cerrar();
              }}
            >
              {({ values, handleChange, handleSubmit }) => (
                <>
                  <ModalHeader>Editar garantía</ModalHeader>
                  <ModalBody className="gap-4">
                    <p className="text-tiny text-default-500">
                      La fecha de inicio y la duración no se pueden modificar aquí — si necesitas ampliar la
                      cobertura, registra una extensión desde el detalle de la garantía.
                    </p>
                    <Textarea
                      label="Alcance de la garantía (opcional)"
                      variant="bordered"
                      value={values.alcance_garantia}
                      onChange={handleChange("alcance_garantia")}
                    />
                    <Textarea
                      label="Condiciones y exclusiones (opcional)"
                      variant="bordered"
                      value={values.condiciones_exclusiones}
                      onChange={handleChange("condiciones_exclusiones")}
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

      {/* Modal: detalle / gestión de una garantía */}
      <Modal isOpen={!!garantiaDetalleId} onOpenChange={(abierto) => !abierto && setGarantiaDetalleId(null)} size="2xl" scrollBehavior="inside">
        <ModalContent>
          {() =>
            garantiaDetalle && (
              <>
                <ModalHeader className="flex flex-col items-start gap-1">
                  <span>
                    {[nombreProyecto(garantiaDetalle.proyecto_id), nombreContrato(garantiaDetalle.contrato_id)].filter(Boolean).join(" · ") || "—"}
                  </span>
                  <span className="text-small text-default-500 font-normal">
                    Garantía {garantiaDetalle.fecha_inicio_garantia} → {garantiaDetalle.fecha_fin_garantia}
                  </span>
                </ModalHeader>
                <ModalBody className="gap-4">
                  {errorGeneral && <p className="text-danger text-sm">{errorGeneral}</p>}

                  <div className="text-small flex flex-col gap-1">
                    <span className="flex items-center gap-2">
                      <span className="text-default-500">Estado:</span>
                      <Chip size="sm" variant="flat" color={(ETIQUETAS_ESTADO_GARANTIA[garantiaDetalle.estado] ?? { color: "default" as const }).color}>
                        {ETIQUETAS_ESTADO_GARANTIA[garantiaDetalle.estado]?.texto ?? garantiaDetalle.estado}
                      </Chip>
                    </span>
                    {garantiaDetalle.alcance_garantia && (
                      <span>
                        <span className="text-default-500">Alcance:</span> {garantiaDetalle.alcance_garantia}
                      </span>
                    )}
                    {garantiaDetalle.condiciones_exclusiones && (
                      <span>
                        <span className="text-default-500">Condiciones y exclusiones:</span> {garantiaDetalle.condiciones_exclusiones}
                      </span>
                    )}
                  </div>

                  {puedeEditar && (
                    <div className="flex gap-2 flex-wrap">
                      <Button
                        size="sm"
                        variant="light"
                        onPress={() => {
                          setErrorGeneral("");
                          setModalEditarAbierto(true);
                        }}
                      >
                        Editar datos
                      </Button>
                      <Button
                        size="sm"
                        variant="flat"
                        color="primary"
                        onPress={() => {
                          setErrorGeneral("");
                          setModalExtensionAbierto(true);
                        }}
                      >
                        Agregar extensión
                      </Button>
                    </div>
                  )}

                  <Divider />

                  <span className="text-small font-medium">Historial de extensiones</span>
                  {extensionesDeLaGarantiaDetalle.length === 0 ? (
                    <p className="text-tiny text-default-400">Esta garantía no tiene extensiones registradas.</p>
                  ) : (
                    <Table aria-label="Historial de extensiones" removeWrapper={false}>
                      <TableHeader>
                        <TableColumn>FECHA</TableColumn>
                        <TableColumn>MESES ADICIONALES</TableColumn>
                        <TableColumn>MOTIVO</TableColumn>
                        <TableColumn>VALOR ADICIONAL</TableColumn>
                      </TableHeader>
                      <TableBody>
                        {extensionesDeLaGarantiaDetalle.map((ext) => (
                          <TableRow key={ext.id}>
                            <TableCell className="text-tiny">{ext.fecha_extension?.slice(0, 10)}</TableCell>
                            <TableCell className="text-tiny">{ext.meses_adicionales}</TableCell>
                            <TableCell className="text-tiny">{ext.motivo ?? "—"}</TableCell>
                            <TableCell className="text-tiny">{ext.valor_adicional ?? "—"}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}

                  <Divider />

                  <span className="text-small font-medium">Casos de soporte cubiertos por garantía</span>
                  <p className="text-tiny text-default-500">
                    Historial de soporte del proyecto/contrato marcado como cubierto por garantía — útil como
                    referencia antes de dar por cerrada la cobertura.
                  </p>
                  {casosDeLaGarantiaDetalle.length === 0 ? (
                    <p className="text-tiny text-default-400">No hay casos de soporte cubiertos por garantía registrados.</p>
                  ) : (
                    <Table aria-label="Casos de soporte cubiertos por garantía" removeWrapper={false}>
                      <TableHeader>
                        <TableColumn>TICKET</TableColumn>
                        <TableColumn>ASUNTO</TableColumn>
                        <TableColumn>APERTURA</TableColumn>
                        <TableColumn>ESTADO</TableColumn>
                      </TableHeader>
                      <TableBody>
                        {casosDeLaGarantiaDetalle.map((caso) => (
                          <TableRow key={caso.id}>
                            <TableCell className="text-tiny">{caso.numero_ticket_externo}</TableCell>
                            <TableCell className="text-tiny">{caso.asunto}</TableCell>
                            <TableCell className="text-tiny">{caso.fecha_apertura}</TableCell>
                            <TableCell className="text-tiny">{caso.estado}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </ModalBody>
                <ModalFooter>
                  <Button variant="flat" onPress={() => setGarantiaDetalleId(null)}>
                    Cerrar
                  </Button>
                </ModalFooter>
              </>
            )
          }
        </ModalContent>
      </Modal>

      {/* Modal: agregar extensión */}
      <Modal isOpen={modalExtensionAbierto} onOpenChange={setModalExtensionAbierto} size="lg">
        <ModalContent>
          {(cerrar) => (
            <Formik
              initialValues={initialValuesExtension}
              validationSchema={ExtensionGarantiaSchema}
              onSubmit={async (valores, { resetForm }) => {
                if (!garantiaDetalle) return;
                setGuardando(true);
                setErrorGeneral("");
                const formData = new FormData();
                Object.entries(valores).forEach(([clave, valor]) => formData.set(clave, valor ?? ""));
                const resultado = await agregarExtensionGarantia(garantiaDetalle.id, formData);
                setGuardando(false);
                if (!resultado.ok) {
                  setErrorGeneral(resultado.error);
                  return;
                }
                resetForm();
                router.refresh();
                setModalExtensionAbierto(false);
                cerrar();
              }}
            >
              {({ values, errors, touched, handleChange, handleSubmit }) => (
                <>
                  <ModalHeader>Agregar extensión de garantía</ModalHeader>
                  <ModalBody className="gap-4">
                    <Input
                      label="Meses adicionales"
                      type="number"
                      variant="bordered"
                      value={values.meses_adicionales}
                      onChange={handleChange("meses_adicionales")}
                      isInvalid={!!errors.meses_adicionales && !!touched.meses_adicionales}
                      errorMessage={errors.meses_adicionales}
                    />
                    <Textarea label="Motivo (opcional)" variant="bordered" value={values.motivo} onChange={handleChange("motivo")} />
                    <Input
                      label="Valor adicional (opcional)"
                      type="number"
                      variant="bordered"
                      value={values.valor_adicional}
                      onChange={handleChange("valor_adicional")}
                    />
                    {errorGeneral && <p className="text-danger text-sm">{errorGeneral}</p>}
                  </ModalBody>
                  <ModalFooter>
                    <Button variant="flat" onPress={cerrar}>
                      Cancelar
                    </Button>
                    <Button color="primary" isLoading={guardando} onPress={() => handleSubmit()}>
                      Registrar
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
