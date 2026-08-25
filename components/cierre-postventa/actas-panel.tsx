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
import { ActaCierreSchema } from "@/helpers/schemas";
import type { ActaCierreFormType } from "@/helpers/types";
import { crearActaCierre, actualizarActaCierre, liberarRecursosActa } from "@/app/(app)/cierre-postventa/actions";

interface Props {
  actas: Tables<"actas_cierre">[];
  proyectos: { id: string; numero_proyecto: string; nombre_proyecto: string; contrato_id: string }[];
  usuarios: { id: string; nombre_completo: string }[];
  contactos: Tables<"contactos">[];
  cuentas: { id: string; razon_social: string }[];
  puedeCrear: boolean;
  puedeEditar: boolean;
}

export function ActasCierrePanel({ actas, proyectos, usuarios, contactos, cuentas, puedeCrear, puedeEditar }: Props) {
  const router = useRouter();
  const [errorGeneral, setErrorGeneral] = useState("");
  const [guardando, setGuardando] = useState(false);

  const [modalActaAbierto, setModalActaAbierto] = useState(false);
  const [actaEnEdicionId, setActaEnEdicionId] = useState<string | null>(null);
  const [proyectoParaNuevaActaId, setProyectoParaNuevaActaId] = useState<string | null>(null);
  const [actaDetalleId, setActaDetalleId] = useState<string | null>(null);

  const opcionesProyecto = proyectos.map((p) => ({ id: p.id, etiqueta: `${p.numero_proyecto} — ${p.nombre_proyecto}` }));
  const opcionesUsuario = usuarios.map((u) => ({ id: u.id, etiqueta: u.nombre_completo }));
  const nombreCuenta = (id: string) => cuentas.find((c) => c.id === id)?.razon_social ?? "—";
  const opcionesContacto = contactos.map((c) => ({
    id: c.id,
    etiqueta: `${c.nombre}${c.apellido ? ` ${c.apellido}` : ""} — ${nombreCuenta(c.cuenta_id)}`,
  }));

  const proyectosConActa = new Set(actas.map((a) => a.proyecto_id));
  const opcionesProyectoSinActa = opcionesProyecto.filter((p) => !proyectosConActa.has(p.id));

  const nombreProyecto = (id: string) => opcionesProyecto.find((p) => p.id === id)?.etiqueta ?? id;
  const nombreUsuario = (id: string) => opcionesUsuario.find((u) => u.id === id)?.etiqueta ?? "—";
  const nombreContacto = (id: string | null) => (id ? opcionesContacto.find((c) => c.id === id)?.etiqueta ?? "—" : "—");

  const actaEnEdicion = actaEnEdicionId ? actas.find((a) => a.id === actaEnEdicionId) ?? null : null;
  const actaDetalle = actaDetalleId ? actas.find((a) => a.id === actaDetalleId) ?? null : null;

  const abrirCrearActa = (proyectoId: string) => {
    setActaEnEdicionId(null);
    setProyectoParaNuevaActaId(proyectoId);
    setErrorGeneral("");
    setModalActaAbierto(true);
  };
  const abrirEditarActa = (acta: Tables<"actas_cierre">) => {
    setActaEnEdicionId(acta.id);
    setProyectoParaNuevaActaId(null);
    setErrorGeneral("");
    setModalActaAbierto(true);
  };

  const initialValuesActa: ActaCierreFormType = {
    fecha_acta: actaEnEdicion?.fecha_acta ?? new Date().toISOString().slice(0, 10),
    firmante_cliente_contacto_id: actaEnEdicion?.firmante_cliente_contacto_id ?? "",
    firmante_interno_usuario_id: actaEnEdicion?.firmante_interno_usuario_id ?? "",
    documento_acta_url: actaEnEdicion?.documento_acta_url ?? "",
    observaciones_finales: actaEnEdicion?.observaciones_finales ?? "",
  };

  const handleLiberarRecursos = async (acta: Tables<"actas_cierre">) => {
    if (
      !confirm(
        "¿Liberar los recursos de este proyecto? Esto marcará el acta como cerrada y finalizará automáticamente todas las asignaciones de recursos activas o planeadas del proyecto. Esta acción no se puede deshacer."
      )
    ) {
      return;
    }
    setGuardando(true);
    setErrorGeneral("");
    const resultado = await liberarRecursosActa(acta.id);
    setGuardando(false);
    if (!resultado.ok) {
      setErrorGeneral(resultado.error);
      return;
    }
    router.refresh();
  };

  return (
    <div className="flex flex-col gap-4 py-2">
      <div className="flex items-center justify-between">
        <span className="text-small font-medium">Actas de cierre por proyecto</span>
        {puedeCrear && (
          <div className="flex items-center gap-2">
            <DropdownSelector
              etiquetaAria="Proyecto sin acta"
              opciones={opcionesProyectoSinActa}
              valor={proyectoParaNuevaActaId}
              onCambiar={(id) => id && abrirCrearActa(id)}
              permitirVacio
              etiquetaVacio="Elegir proyecto…"
              size="sm"
            />
          </div>
        )}
      </div>
      {errorGeneral && !modalActaAbierto && <p className="text-danger text-sm">{errorGeneral}</p>}

      {actas.length === 0 ? (
        <p className="text-default-500 text-sm">Ningún proyecto tiene un acta de cierre registrada todavía.</p>
      ) : (
        <Table aria-label="Actas de cierre" removeWrapper={false}>
          <TableHeader>
            <TableColumn>PROYECTO</TableColumn>
            <TableColumn>FECHA ACTA</TableColumn>
            <TableColumn>FIRMANTE INTERNO</TableColumn>
            <TableColumn>RECURSOS</TableColumn>
            <TableColumn>ACCIONES</TableColumn>
          </TableHeader>
          <TableBody>
            {actas.map((acta) => (
              <TableRow key={acta.id}>
                <TableCell className="text-tiny">{nombreProyecto(acta.proyecto_id)}</TableCell>
                <TableCell className="text-tiny">{acta.fecha_acta}</TableCell>
                <TableCell className="text-tiny">{nombreUsuario(acta.firmante_interno_usuario_id)}</TableCell>
                <TableCell>
                  <Chip size="sm" variant="flat" color={acta.recursos_liberados ? "success" : "warning"}>
                    {acta.recursos_liberados ? "Liberados" : "Pendientes"}
                  </Chip>
                </TableCell>
                <TableCell>
                  <Button size="sm" variant="light" onPress={() => setActaDetalleId(acta.id)}>
                    Ver / Gestionar
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {/* Modal: crear/editar acta */}
      <Modal isOpen={modalActaAbierto} onOpenChange={setModalActaAbierto} size="lg">
        <ModalContent>
          {(cerrar) => (
            <Formik
              enableReinitialize
              initialValues={initialValuesActa}
              validationSchema={ActaCierreSchema}
              onSubmit={async (valores) => {
                if (!actaEnEdicion && !proyectoParaNuevaActaId) return;
                setGuardando(true);
                setErrorGeneral("");
                const formData = new FormData();
                Object.entries(valores).forEach(([clave, valor]) => formData.set(clave, valor ?? ""));
                const resultado = actaEnEdicion
                  ? await actualizarActaCierre(actaEnEdicion.id, formData)
                  : await crearActaCierre(proyectoParaNuevaActaId!, formData);
                setGuardando(false);
                if (!resultado.ok) {
                  setErrorGeneral(resultado.error);
                  return;
                }
                router.refresh();
                setProyectoParaNuevaActaId(null);
                setModalActaAbierto(false);
                cerrar();
              }}
            >
              {({ values, errors, touched, handleChange, handleSubmit, setFieldValue }) => (
                <>
                  <ModalHeader className="flex flex-col items-start gap-1">
                    <span>{actaEnEdicion ? "Editar acta de cierre" : "Nueva acta de cierre"}</span>
                    <span className="text-small text-default-500 font-normal">
                      {nombreProyecto(actaEnEdicion?.proyecto_id ?? proyectoParaNuevaActaId ?? "")}
                    </span>
                  </ModalHeader>
                  <ModalBody className="gap-4">
                    <Input
                      label="Fecha del acta"
                      type="date"
                      variant="bordered"
                      value={values.fecha_acta}
                      onChange={handleChange("fecha_acta")}
                      isInvalid={!!errors.fecha_acta && !!touched.fecha_acta}
                      errorMessage={errors.fecha_acta}
                    />
                    <div className="flex flex-col gap-1">
                      <span className="text-small text-default-600">Firmante del cliente (opcional)</span>
                      <DropdownSelector
                        etiquetaAria="Firmante del cliente"
                        opciones={opcionesContacto}
                        valor={values.firmante_cliente_contacto_id || null}
                        onCambiar={(id) => setFieldValue("firmante_cliente_contacto_id", id ?? "")}
                        permitirVacio
                        etiquetaVacio="Sin firmante del cliente"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-small text-default-600">Firmante interno</span>
                      <DropdownSelector
                        etiquetaAria="Firmante interno"
                        opciones={opcionesUsuario}
                        valor={values.firmante_interno_usuario_id || null}
                        onCambiar={(id) => setFieldValue("firmante_interno_usuario_id", id ?? "")}
                      />
                      {!!errors.firmante_interno_usuario_id && !!touched.firmante_interno_usuario_id && (
                        <span className="text-tiny text-danger">{errors.firmante_interno_usuario_id}</span>
                      )}
                    </div>
                    <Input
                      label="URL del documento del acta (opcional)"
                      variant="bordered"
                      value={values.documento_acta_url}
                      onChange={handleChange("documento_acta_url")}
                    />
                    <Textarea
                      label="Observaciones finales (opcional)"
                      variant="bordered"
                      value={values.observaciones_finales}
                      onChange={handleChange("observaciones_finales")}
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

      {/* Modal: detalle / gestión de un acta */}
      <Modal isOpen={!!actaDetalleId} onOpenChange={(abierto) => !abierto && setActaDetalleId(null)} size="lg">
        <ModalContent>
          {() =>
            actaDetalle && (
              <>
                <ModalHeader className="flex flex-col items-start gap-1">
                  <span>{nombreProyecto(actaDetalle.proyecto_id)}</span>
                  <span className="text-small text-default-500 font-normal">Acta de cierre — {actaDetalle.fecha_acta}</span>
                </ModalHeader>
                <ModalBody className="gap-3">
                  {errorGeneral && <p className="text-danger text-sm">{errorGeneral}</p>}
                  <div className="text-small flex flex-col gap-1">
                    <span>
                      <span className="text-default-500">Firmante del cliente:</span> {nombreContacto(actaDetalle.firmante_cliente_contacto_id)}
                    </span>
                    <span>
                      <span className="text-default-500">Firmante interno:</span> {nombreUsuario(actaDetalle.firmante_interno_usuario_id)}
                    </span>
                    {actaDetalle.documento_acta_url && (
                      <span>
                        <span className="text-default-500">Documento:</span> {actaDetalle.documento_acta_url}
                      </span>
                    )}
                    {actaDetalle.observaciones_finales && (
                      <span>
                        <span className="text-default-500">Observaciones:</span> {actaDetalle.observaciones_finales}
                      </span>
                    )}
                    <span className="flex items-center gap-2 pt-1">
                      <span className="text-default-500">Recursos del proyecto:</span>
                      <Chip size="sm" variant="flat" color={actaDetalle.recursos_liberados ? "success" : "warning"}>
                        {actaDetalle.recursos_liberados ? "Liberados" : "Pendientes"}
                      </Chip>
                    </span>
                  </div>

                  {puedeEditar && (
                    <div className="flex gap-2 flex-wrap pt-2">
                      <Button size="sm" variant="light" onPress={() => abrirEditarActa(actaDetalle)}>
                        Editar datos
                      </Button>
                      {!actaDetalle.recursos_liberados && (
                        <Button size="sm" color="warning" variant="flat" isLoading={guardando} onPress={() => handleLiberarRecursos(actaDetalle)}>
                          Liberar recursos
                        </Button>
                      )}
                    </div>
                  )}
                </ModalBody>
                <ModalFooter>
                  <Button variant="flat" onPress={() => setActaDetalleId(null)}>
                    Cerrar
                  </Button>
                </ModalFooter>
              </>
            )
          }
        </ModalContent>
      </Modal>
    </div>
  );
}
