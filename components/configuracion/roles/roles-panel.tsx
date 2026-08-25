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
import { RolSchema } from "@/helpers/schemas";
import type { RolFormType } from "@/helpers/types";
import type { Modulo } from "@/lib/rbac";
import { CATALOGO_MODULOS } from "./catalogo-permisos";
import {
  crearRol,
  actualizarRol,
  cambiarEstadoRol,
  eliminarRol,
  guardarPermisoFila,
  type FilaPermiso,
} from "@/app/(app)/configuracion/roles/actions";

type Rol = Tables<"roles">;
type Permiso = Tables<"permisos">;

const ALCANCES = [
  { id: "TODOS", etiqueta: "Todos los registros" },
  { id: "EQUIPO", etiqueta: "Solo del equipo" },
  { id: "PROPIOS", etiqueta: "Solo propios" },
];

const PERMISO_VACIO: FilaPermiso = {
  puede_leer: false,
  puede_crear: false,
  puede_editar: false,
  puede_eliminar: false,
  puede_aprobar: false,
  alcance: "PROPIOS",
};

interface Props {
  roles: Rol[];
  permisos: Permiso[];
  puedeCrear: boolean;
  puedeEditar: boolean;
  puedeEliminar: boolean;
}

export function RolesPanel({ roles, permisos, puedeCrear, puedeEditar, puedeEliminar }: Props) {
  const router = useRouter();
  const [modalRolAbierto, setModalRolAbierto] = useState(false);
  const [rolEnEdicion, setRolEnEdicion] = useState<Rol | null>(null);
  const [rolParaMatriz, setRolParaMatriz] = useState<Rol | null>(null);
  const [filaEnProceso, setFilaEnProceso] = useState<string | null>(null);
  const [errorGeneral, setErrorGeneral] = useState("");
  const [guardando, setGuardando] = useState(false);

  const permisosPorRol = useMemo(() => {
    const mapa = new Map<string, Permiso[]>();
    for (const p of permisos) {
      const lista = mapa.get(p.rol_id) ?? [];
      lista.push(p);
      mapa.set(p.rol_id, lista);
    }
    return mapa;
  }, [permisos]);

  const abrirCrearRol = () => {
    setRolEnEdicion(null);
    setErrorGeneral("");
    setModalRolAbierto(true);
  };
  const abrirEditarRol = (rol: Rol) => {
    setRolEnEdicion(rol);
    setErrorGeneral("");
    setModalRolAbierto(true);
  };

  const handleEstadoRol = async (id: string, activo: boolean) => {
    setFilaEnProceso(id);
    const resultado = await cambiarEstadoRol(id, activo);
    setFilaEnProceso(null);
    if (!resultado.ok) {
      setErrorGeneral(resultado.error);
      return;
    }
    router.refresh();
  };

  const handleEliminarRol = async (id: string) => {
    if (!confirm("¿Eliminar este rol? Esta acción no se puede deshacer.")) return;
    setFilaEnProceso(id);
    const resultado = await eliminarRol(id);
    setFilaEnProceso(null);
    if (!resultado.ok) {
      setErrorGeneral(resultado.error);
      return;
    }
    router.refresh();
  };

  const initialValuesRol: RolFormType = {
    nombre: rolEnEdicion?.nombre ?? "",
    descripcion: rolEnEdicion?.descripcion ?? "",
  };

  return (
    <div className="flex flex-col gap-4 py-2">
      {puedeCrear && (
        <div className="flex justify-end">
          <Button color="primary" size="sm" onPress={abrirCrearRol}>
            Nuevo rol
          </Button>
        </div>
      )}

      {errorGeneral && <p className="text-danger text-sm">{errorGeneral}</p>}

      <Table aria-label="Roles" removeWrapper={false}>
        <TableHeader>
          <TableColumn>NOMBRE</TableColumn>
          <TableColumn>DESCRIPCIÓN</TableColumn>
          <TableColumn>TIPO</TableColumn>
          <TableColumn>ESTADO</TableColumn>
          <TableColumn>ACCIONES</TableColumn>
        </TableHeader>
        <TableBody emptyContent="No hay roles registrados todavía.">
          {roles.map((rol) => (
            <TableRow key={rol.id}>
              <TableCell className="font-medium">{rol.nombre}</TableCell>
              <TableCell className="text-tiny text-default-500">{rol.descripcion ?? "—"}</TableCell>
              <TableCell>
                <Chip size="sm" variant="flat" color={rol.es_rol_sistema ? "secondary" : "default"}>
                  {rol.es_rol_sistema ? "Sistema" : "Personalizado"}
                </Chip>
              </TableCell>
              <TableCell>
                {puedeEditar ? (
                  <Switch
                    size="sm"
                    isSelected={rol.activo}
                    isDisabled={filaEnProceso === rol.id}
                    onValueChange={(v) => handleEstadoRol(rol.id, v)}
                  />
                ) : (
                  <Chip color={rol.activo ? "success" : "default"} variant="flat">
                    {rol.activo ? "Activo" : "Inactivo"}
                  </Chip>
                )}
              </TableCell>
              <TableCell>
                <div className="flex gap-2 flex-wrap">
                  {puedeEditar && (
                    <Button size="sm" variant="flat" color="primary" onPress={() => setRolParaMatriz(rol)}>
                      Matriz de permisos
                    </Button>
                  )}
                  {puedeEditar && !rol.es_rol_sistema && (
                    <Button size="sm" variant="light" onPress={() => abrirEditarRol(rol)}>
                      Editar
                    </Button>
                  )}
                  {puedeEliminar && !rol.es_rol_sistema && (
                    <Button
                      size="sm"
                      variant="light"
                      color="danger"
                      isLoading={filaEnProceso === rol.id}
                      onPress={() => handleEliminarRol(rol.id)}
                    >
                      Eliminar
                    </Button>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {/* Modal: crear/editar rol */}
      <Modal isOpen={modalRolAbierto} onOpenChange={setModalRolAbierto}>
        <ModalContent>
          {(cerrar) => (
            <Formik
              enableReinitialize
              initialValues={initialValuesRol}
              validationSchema={RolSchema}
              onSubmit={async (valores) => {
                setGuardando(true);
                setErrorGeneral("");

                const formData = new FormData();
                formData.set("nombre", valores.nombre);
                formData.set("descripcion", valores.descripcion ?? "");

                const resultado = rolEnEdicion
                  ? await actualizarRol(rolEnEdicion.id, formData)
                  : await crearRol(formData);

                setGuardando(false);

                if (!resultado.ok) {
                  setErrorGeneral(resultado.error);
                  return;
                }

                router.refresh();
                cerrar();
              }}
            >
              {({ values, errors, touched, handleChange, handleSubmit }) => (
                <>
                  <ModalHeader>{rolEnEdicion ? "Editar rol" : "Nuevo rol"}</ModalHeader>
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
                      label="Descripción"
                      variant="bordered"
                      value={values.descripcion}
                      onChange={handleChange("descripcion")}
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

      {/* Modal: matriz de permisos */}
      <Modal
        isOpen={!!rolParaMatriz}
        onOpenChange={(abierto) => !abierto && setRolParaMatriz(null)}
        size="5xl"
        scrollBehavior="inside"
      >
        <ModalContent>
          {(cerrar) => (
            <>
              <ModalHeader>Matriz de permisos — {rolParaMatriz?.nombre}</ModalHeader>
              <ModalBody>
                {rolParaMatriz && (
                  <MatrizPermisos
                    rol={rolParaMatriz}
                    permisosRol={permisosPorRol.get(rolParaMatriz.id) ?? []}
                    onGuardado={() => router.refresh()}
                  />
                )}
              </ModalBody>
              <ModalFooter>
                <Button variant="flat" onPress={cerrar}>
                  Cerrar
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </div>
  );
}

function MatrizPermisos({
  rol,
  permisosRol,
  onGuardado,
}: {
  rol: Rol;
  permisosRol: Permiso[];
  onGuardado: () => void;
}) {
  const [filaEnProceso, setFilaEnProceso] = useState<string | null>(null);
  const [error, setError] = useState("");

  const permisoDeFila = (modulo: Modulo, sublista: string | null): Permiso | undefined =>
    permisosRol.find((p) => p.modulo === modulo && p.sublista === sublista);

  const handleCambio = async (
    modulo: Modulo,
    sublista: string | null,
    actual: FilaPermiso,
    cambio: Partial<FilaPermiso>
  ) => {
    const claveFila = `${modulo}::${sublista ?? ""}`;
    setFilaEnProceso(claveFila);
    setError("");
    const resultado = await guardarPermisoFila(rol.id, modulo, sublista, { ...actual, ...cambio });
    setFilaEnProceso(null);
    if (!resultado.ok) {
      setError(resultado.error);
      return;
    }
    onGuardado();
  };

  return (
    <div className="flex flex-col gap-3">
      <p className="text-tiny text-default-500">
        Los cambios se guardan de inmediato al mover un interruptor o cambiar
        el alcance. La fila &quot;General&quot; de cada módulo aplica cuando no
        hay una fila específica para la sección consultada.
      </p>
      {error && <p className="text-danger text-sm">{error}</p>}

      <Accordion variant="bordered" selectionMode="multiple">
        {CATALOGO_MODULOS.map((moduloCatalogo) => (
          <AccordionItem
            key={moduloCatalogo.modulo}
            aria-label={moduloCatalogo.etiqueta}
            title={moduloCatalogo.etiqueta}
          >
            <Table aria-label={`Permisos de ${moduloCatalogo.etiqueta}`} removeWrapper={false}>
              <TableHeader>
                <TableColumn>SECCIÓN</TableColumn>
                <TableColumn>LEER</TableColumn>
                <TableColumn>CREAR</TableColumn>
                <TableColumn>EDITAR</TableColumn>
                <TableColumn>ELIMINAR</TableColumn>
                <TableColumn>APROBAR</TableColumn>
                <TableColumn>ALCANCE</TableColumn>
              </TableHeader>
              <TableBody>
                {moduloCatalogo.sublistas.map(({ sublista, etiqueta }) => {
                  const permiso = permisoDeFila(moduloCatalogo.modulo, sublista);
                  const actual: FilaPermiso = permiso
                    ? {
                        puede_leer: permiso.puede_leer,
                        puede_crear: permiso.puede_crear,
                        puede_editar: permiso.puede_editar,
                        puede_eliminar: permiso.puede_eliminar,
                        puede_aprobar: permiso.puede_aprobar,
                        alcance: permiso.alcance,
                      }
                    : PERMISO_VACIO;
                  const claveFila = `${moduloCatalogo.modulo}::${sublista ?? ""}`;
                  const enProceso = filaEnProceso === claveFila;

                  const switchCampo = (campo: keyof FilaPermiso) => (
                    <Switch
                      size="sm"
                      isSelected={Boolean(actual[campo])}
                      isDisabled={enProceso}
                      onValueChange={(v) => handleCambio(moduloCatalogo.modulo, sublista, actual, { [campo]: v })}
                    />
                  );

                  return (
                    <TableRow key={claveFila}>
                      <TableCell className="text-small">{etiqueta}</TableCell>
                      <TableCell>{switchCampo("puede_leer")}</TableCell>
                      <TableCell>{switchCampo("puede_crear")}</TableCell>
                      <TableCell>{switchCampo("puede_editar")}</TableCell>
                      <TableCell>{switchCampo("puede_eliminar")}</TableCell>
                      <TableCell>{switchCampo("puede_aprobar")}</TableCell>
                      <TableCell>
                        <DropdownSelector
                          etiquetaAria={`Alcance — ${etiqueta}`}
                          opciones={ALCANCES}
                          valor={actual.alcance}
                          isDisabled={enProceso}
                          size="sm"
                          className="min-w-[150px] justify-between"
                          onCambiar={(id) =>
                            handleCambio(moduloCatalogo.modulo, sublista, actual, { alcance: id ?? "PROPIOS" })
                          }
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
}
