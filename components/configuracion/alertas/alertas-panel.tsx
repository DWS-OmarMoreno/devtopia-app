"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Tabs,
  Tab,
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
import { AlertaSchema } from "@/helpers/schemas";
import type { AlertaFormType } from "@/helpers/types";
import { crearAlerta, actualizarAlerta, cambiarEstadoAlerta } from "@/app/(app)/configuracion/alertas/actions";
import { EVENTOS_DISPARADOR, obtenerDefinicionEvento } from "@/lib/alertas/eventos";

type Regla = Tables<"alertas_notificaciones_reglas">;
type Envio = Tables<"notificaciones_enviadas">;

const CANALES = [
  { id: "EMAIL", etiqueta: "Correo" },
  { id: "IN_APP", etiqueta: "En la app" },
  { id: "WEBHOOK", etiqueta: "Webhook" },
];

const OPCIONES_EVENTO = EVENTOS_DISPARADOR.map((e) => ({ id: e.codigo, etiqueta: e.etiqueta }));

const TIPOS_DESTINATARIO = [
  { id: "PM_PROYECTO", etiqueta: "PM del proyecto" },
  { id: "EQUIPO_PROYECTO", etiqueta: "Equipo del proyecto" },
  { id: "ROL_ESPECIFICO", etiqueta: "Un rol específico" },
  { id: "USUARIO_ESPECIFICO", etiqueta: "Un usuario específico" },
  { id: "CLIENTE", etiqueta: "El cliente" },
];

const ESTADOS_ENVIO_COLOR: Record<string, "success" | "danger" | "warning" | "default"> = {
  ENVIADO: "success",
  FALLIDO: "danger",
  PENDIENTE: "warning",
};

interface Props {
  reglas: Regla[];
  roles: { id: string; nombre: string }[];
  usuarios: { id: string; nombre_completo: string }[];
  envios: Envio[];
  puedeCrear: boolean;
  puedeEditar: boolean;
}

export function AlertasPanel({ reglas, roles, usuarios, envios, puedeCrear, puedeEditar }: Props) {
  const router = useRouter();
  const [modalAbierto, setModalAbierto] = useState(false);
  const [enEdicion, setEnEdicion] = useState<Regla | null>(null);
  const [filaEnProceso, setFilaEnProceso] = useState<string | null>(null);
  const [errorGeneral, setErrorGeneral] = useState("");
  const [guardando, setGuardando] = useState(false);

  const opcionesRol = roles.map((r) => ({ id: r.id, etiqueta: r.nombre }));
  const opcionesUsuario = usuarios.map((u) => ({ id: u.id, etiqueta: u.nombre_completo }));

  const abrirCrear = () => {
    setEnEdicion(null);
    setErrorGeneral("");
    setModalAbierto(true);
  };

  const abrirEditar = (regla: Regla) => {
    setEnEdicion(regla);
    setErrorGeneral("");
    setModalAbierto(true);
  };

  const handleEstado = async (id: string, activa: boolean) => {
    setFilaEnProceso(id);
    const resultado = await cambiarEstadoAlerta(id, activa);
    setFilaEnProceso(null);
    if (!resultado.ok) {
      setErrorGeneral(resultado.error);
      return;
    }
    router.refresh();
  };

  const initialValues: AlertaFormType = {
    nombre: enEdicion?.nombre ?? "",
    evento_disparador: enEdicion?.evento_disparador ?? "",
    canal: enEdicion?.canal ?? "EMAIL",
    destinatarios_tipo: enEdicion?.destinatarios_tipo ?? "PM_PROYECTO",
    destinatarios_rol_id: enEdicion?.destinatarios_rol_id ?? "",
    destinatarios_usuario_id: enEdicion?.destinatarios_usuario_id ?? "",
    plantilla_asunto: enEdicion?.plantilla_asunto ?? "",
    plantilla_cuerpo: enEdicion?.plantilla_cuerpo ?? "",
  };

  return (
    <Tabs aria-label="Secciones de Alertas" variant="underlined">
      <Tab key="reglas" title="Reglas">
        <div className="flex flex-col gap-4 py-2">
          {puedeCrear && (
            <div className="flex justify-end">
              <Button color="primary" size="sm" onPress={abrirCrear}>
                Nueva regla
              </Button>
            </div>
          )}

          {errorGeneral && <p className="text-danger text-sm">{errorGeneral}</p>}

          <Table aria-label="Reglas de alertas" removeWrapper={false}>
            <TableHeader>
              <TableColumn>NOMBRE</TableColumn>
              <TableColumn>EVENTO</TableColumn>
              <TableColumn>CANAL</TableColumn>
              <TableColumn>DESTINATARIO</TableColumn>
              <TableColumn>ESTADO</TableColumn>
              <TableColumn>ACCIONES</TableColumn>
            </TableHeader>
            <TableBody emptyContent="No hay reglas de alerta configuradas todavía.">
              {reglas.map((regla) => (
                <TableRow key={regla.id}>
                  <TableCell>{regla.nombre}</TableCell>
                  <TableCell className="text-tiny text-default-500">
                    {obtenerDefinicionEvento(regla.evento_disparador)?.etiqueta ?? regla.evento_disparador}
                  </TableCell>
                  <TableCell>
                    {CANALES.find((c) => c.id === regla.canal)?.etiqueta ?? regla.canal}
                  </TableCell>
                  <TableCell>
                    {TIPOS_DESTINATARIO.find((t) => t.id === regla.destinatarios_tipo)?.etiqueta ??
                      regla.destinatarios_tipo}
                  </TableCell>
                  <TableCell>
                    {puedeEditar ? (
                      <Switch
                        size="sm"
                        isSelected={regla.activa}
                        isDisabled={filaEnProceso === regla.id}
                        onValueChange={(activa) => handleEstado(regla.id, activa)}
                      />
                    ) : (
                      <Chip color={regla.activa ? "success" : "default"} variant="flat">
                        {regla.activa ? "Activa" : "Inactiva"}
                      </Chip>
                    )}
                  </TableCell>
                  <TableCell>
                    {puedeEditar && (
                      <Button size="sm" variant="light" onPress={() => abrirEditar(regla)}>
                        Editar
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Tab>

      <Tab key="historial" title="Historial de envíos">
        <div className="flex flex-col gap-4 py-2">
          <p className="text-tiny text-default-500">
            Últimos 100 envíos registrados. Solo lectura — incluye tanto los
            eventos transaccionales (disparados al cambiar de estado en cada
            módulo) como los eventos por tiempo (evaluados periódicamente vía
            la ruta de cron). Un registro FALLIDO no significa que la acción
            de negocio haya fallado — el envío de la notificación es
            independiente y nunca bloquea la operación que lo originó.
          </p>
          <Table aria-label="Historial de envíos" removeWrapper={false}>
            <TableHeader>
              <TableColumn>FECHA</TableColumn>
              <TableColumn>ENTIDAD</TableColumn>
              <TableColumn>DESTINATARIO</TableColumn>
              <TableColumn>CANAL</TableColumn>
              <TableColumn>ESTADO</TableColumn>
              <TableColumn>INTENTOS</TableColumn>
            </TableHeader>
            <TableBody emptyContent="No hay envíos registrados.">
              {envios.map((envio) => (
                <TableRow key={envio.id}>
                  <TableCell className="text-tiny">
                    {envio.fecha_envio ? new Date(envio.fecha_envio).toLocaleString() : "—"}
                  </TableCell>
                  <TableCell className="text-tiny">
                    {envio.entidad_tipo} · {envio.entidad_id.slice(0, 8)}
                  </TableCell>
                  <TableCell className="text-tiny">{envio.destinatario}</TableCell>
                  <TableCell>{envio.canal}</TableCell>
                  <TableCell>
                    <Chip size="sm" color={ESTADOS_ENVIO_COLOR[envio.estado_envio] ?? "default"} variant="flat">
                      {envio.estado_envio}
                    </Chip>
                  </TableCell>
                  <TableCell>{envio.intentos}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Tab>

      <Modal isOpen={modalAbierto} onOpenChange={setModalAbierto} size="2xl">
        <ModalContent>
          {(cerrar) => (
            <Formik
              enableReinitialize
              initialValues={initialValues}
              validationSchema={AlertaSchema}
              onSubmit={async (valores) => {
                setGuardando(true);
                setErrorGeneral("");

                const formData = new FormData();
                Object.entries(valores).forEach(([clave, valor]) => {
                  formData.set(clave, valor === null || valor === undefined ? "" : String(valor));
                });

                const resultado = enEdicion
                  ? await actualizarAlerta(enEdicion.id, formData)
                  : await crearAlerta(formData);

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
                  <ModalHeader>{enEdicion ? "Editar regla" : "Nueva regla de alerta"}</ModalHeader>
                  <ModalBody className="gap-4">
                    <Input
                      label="Nombre de la regla"
                      variant="bordered"
                      value={values.nombre}
                      onChange={handleChange("nombre")}
                      isInvalid={!!errors.nombre && !!touched.nombre}
                      errorMessage={errors.nombre}
                    />
                    <div className="flex flex-col gap-1">
                      <span className="text-small text-default-600">Evento disparador</span>
                      <DropdownSelector
                        etiquetaAria="Evento disparador"
                        opciones={OPCIONES_EVENTO}
                        valor={values.evento_disparador || null}
                        onCambiar={(id) => setFieldValue("evento_disparador", id ?? "")}
                      />
                      {!!errors.evento_disparador && !!touched.evento_disparador && (
                        <span className="text-tiny text-danger">{errors.evento_disparador}</span>
                      )}
                      {values.evento_disparador && (
                        <span className="text-tiny text-default-400">
                          Variables disponibles en la plantilla:{" "}
                          {(obtenerDefinicionEvento(values.evento_disparador)?.variables ?? [])
                            .map((v) => `{{${v}}}`)
                            .join(", ")}
                        </span>
                      )}
                    </div>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="flex flex-col gap-1">
                        <span className="text-small text-default-600">Canal</span>
                        <DropdownSelector
                          etiquetaAria="Canal"
                          opciones={CANALES}
                          valor={values.canal || null}
                          onCambiar={(id) => setFieldValue("canal", id ?? "EMAIL")}
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <span className="text-small text-default-600">Destinatario</span>
                        <DropdownSelector
                          etiquetaAria="Tipo de destinatario"
                          opciones={TIPOS_DESTINATARIO}
                          valor={values.destinatarios_tipo || null}
                          onCambiar={(id) => setFieldValue("destinatarios_tipo", id ?? "PM_PROYECTO")}
                        />
                      </div>
                    </div>

                    {values.destinatarios_tipo === "ROL_ESPECIFICO" && (
                      <div className="flex flex-col gap-1">
                        <span className="text-small text-default-600">Rol destinatario</span>
                        <DropdownSelector
                          etiquetaAria="Rol destinatario"
                          opciones={opcionesRol}
                          valor={values.destinatarios_rol_id || null}
                          onCambiar={(id) => setFieldValue("destinatarios_rol_id", id ?? "")}
                        />
                      </div>
                    )}

                    {values.destinatarios_tipo === "USUARIO_ESPECIFICO" && (
                      <div className="flex flex-col gap-1">
                        <span className="text-small text-default-600">Usuario destinatario</span>
                        <DropdownSelector
                          etiquetaAria="Usuario destinatario"
                          opciones={opcionesUsuario}
                          valor={values.destinatarios_usuario_id || null}
                          onCambiar={(id) => setFieldValue("destinatarios_usuario_id", id ?? "")}
                        />
                      </div>
                    )}

                    <Input
                      label="Plantilla — asunto"
                      variant="bordered"
                      value={values.plantilla_asunto}
                      onChange={handleChange("plantilla_asunto")}
                    />
                    <Textarea
                      label="Plantilla — cuerpo"
                      variant="bordered"
                      value={values.plantilla_cuerpo}
                      onChange={handleChange("plantilla_cuerpo")}
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
    </Tabs>
  );
}
