"use client";

import { useCallback, useMemo, useState } from "react";
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
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem,
  Button,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Input,
  useDisclosure,
} from "@nextui-org/react";
import { Formik } from "formik";
import {
  cambiarEstadoUsuario,
  cambiarRolUsuario,
  invitarUsuario,
} from "@/app/(app)/configuracion/usuarios/actions";
import { InvitarUsuarioSchema } from "@/helpers/schemas";
import type { InvitarUsuarioFormType } from "@/helpers/types";

export type UsuarioFila = {
  id: string;
  nombreCompleto: string;
  cargo: string | null;
  activo: boolean;
  rolId: string;
  rolNombre: string;
  email: string | null;
};

export type RolOpcion = {
  id: string;
  nombre: string;
};

interface Props {
  usuarios: UsuarioFila[];
  roles: RolOpcion[];
  puedeCrear: boolean;
  puedeEditar: boolean;
  correoDisponible: boolean;
  usuarioActualId: string | null;
}

/**
 * Este starter viene con NextUI 2.0.22, versión en la que @nextui-org/select
 * todavía no existía como parte del paquete — por eso la selección de rol se
 * arma con Dropdown (sí disponible, ver components/navbar/user-dropdown.tsx)
 * en vez de <Select>, para no forzar un upgrade de NextUI en este checkpoint.
 */
function SelectorRol({
  roles,
  valor,
  onCambiar,
  isDisabled,
  etiqueta,
}: {
  roles: RolOpcion[];
  valor: string;
  onCambiar: (rolId: string) => void;
  isDisabled?: boolean;
  etiqueta: string;
}) {
  const nombreActual = roles.find((r) => r.id === valor)?.nombre ?? "Elegir rol";

  return (
    <Dropdown>
      <DropdownTrigger>
        <Button size="sm" variant="bordered" isDisabled={isDisabled} className="min-w-[180px] justify-between">
          {nombreActual}
        </Button>
      </DropdownTrigger>
      <DropdownMenu
        aria-label={etiqueta}
        selectionMode="single"
        disallowEmptySelection
        selectedKeys={valor ? new Set([valor]) : new Set()}
        onSelectionChange={(seleccion) => {
          if (seleccion === "all") return;
          const rolId = Array.from(seleccion)[0] as string | undefined;
          if (rolId) onCambiar(rolId);
        }}
      >
        {roles.map((rol) => (
          <DropdownItem key={rol.id}>{rol.nombre}</DropdownItem>
        ))}
      </DropdownMenu>
    </Dropdown>
  );
}

export const UsuariosTabla = ({
  usuarios,
  roles,
  puedeCrear,
  puedeEditar,
  correoDisponible,
  usuarioActualId,
}: Props) => {
  const router = useRouter();
  const { isOpen, onOpen, onOpenChange } = useDisclosure();
  const [filaEnProceso, setFilaEnProceso] = useState<string | null>(null);
  const [errorFila, setErrorFila] = useState<{ id: string; mensaje: string } | null>(null);
  const [errorInvitar, setErrorInvitar] = useState("");
  const [invitando, setInvitando] = useState(false);
  const [invitacionOk, setInvitacionOk] = useState("");

  const rolesPorId = useMemo(() => new Map(roles.map((r) => [r.id, r.nombre])), [roles]);

  const handleCambiarRol = useCallback(
    async (usuarioId: string, rolId: string) => {
      setFilaEnProceso(usuarioId);
      setErrorFila(null);
      const resultado = await cambiarRolUsuario(usuarioId, rolId);
      setFilaEnProceso(null);
      if (!resultado.ok) {
        setErrorFila({ id: usuarioId, mensaje: resultado.error });
        return;
      }
      router.refresh();
    },
    [router]
  );

  const handleCambiarEstado = useCallback(
    async (usuarioId: string, activo: boolean) => {
      setFilaEnProceso(usuarioId);
      setErrorFila(null);
      const resultado = await cambiarEstadoUsuario(usuarioId, activo);
      setFilaEnProceso(null);
      if (!resultado.ok) {
        setErrorFila({ id: usuarioId, mensaje: resultado.error });
        return;
      }
      router.refresh();
    },
    [router]
  );

  const initialValues: InvitarUsuarioFormType = {
    nombre_completo: "",
    email: "",
    rol_id: "",
  };

  return (
    <div className="flex flex-col gap-4">
      {puedeCrear && (
        <div className="flex justify-end">
          <Button color="primary" onPress={onOpen}>
            Invitar usuario
          </Button>
        </div>
      )}

      {!correoDisponible && (
        <Chip color="warning" variant="flat" className="w-fit">
          Falta configurar SUPABASE_SERVICE_ROLE_KEY en el servidor: no se
          pueden mostrar correos ni invitar usuarios todavía.
        </Chip>
      )}

      <Table aria-label="Usuarios del ERP" removeWrapper={false}>
        <TableHeader>
          <TableColumn>NOMBRE</TableColumn>
          <TableColumn>CORREO</TableColumn>
          <TableColumn>CARGO</TableColumn>
          <TableColumn>ROL</TableColumn>
          <TableColumn>ESTADO</TableColumn>
        </TableHeader>
        <TableBody emptyContent="No hay usuarios registrados todavía.">
          {usuarios.map((usuario) => (
            <TableRow key={usuario.id}>
              <TableCell>
                <div className="flex flex-col">
                  <span className="font-medium">{usuario.nombreCompleto}</span>
                  {usuario.id === usuarioActualId && (
                    <span className="text-tiny text-default-400">Tú</span>
                  )}
                  {errorFila?.id === usuario.id && (
                    <span className="text-tiny text-danger">{errorFila.mensaje}</span>
                  )}
                </div>
              </TableCell>
              <TableCell>{usuario.email ?? "—"}</TableCell>
              <TableCell>{usuario.cargo ?? "—"}</TableCell>
              <TableCell>
                {puedeEditar ? (
                  <SelectorRol
                    etiqueta={`Rol de ${usuario.nombreCompleto}`}
                    roles={roles}
                    valor={usuario.rolId}
                    isDisabled={filaEnProceso === usuario.id}
                    onCambiar={(rolId) => {
                      if (rolId !== usuario.rolId) handleCambiarRol(usuario.id, rolId);
                    }}
                  />
                ) : (
                  <Chip variant="flat">{rolesPorId.get(usuario.rolId) ?? usuario.rolNombre}</Chip>
                )}
              </TableCell>
              <TableCell>
                {puedeEditar ? (
                  <Switch
                    size="sm"
                    isSelected={usuario.activo}
                    isDisabled={filaEnProceso === usuario.id || usuario.id === usuarioActualId}
                    onValueChange={(activo) => handleCambiarEstado(usuario.id, activo)}
                  />
                ) : (
                  <Chip color={usuario.activo ? "success" : "default"} variant="flat">
                    {usuario.activo ? "Activo" : "Inactivo"}
                  </Chip>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Modal
        isOpen={isOpen}
        onOpenChange={(abierto) => {
          onOpenChange();
          if (!abierto) {
            setErrorInvitar("");
            setInvitacionOk("");
          }
        }}
      >
        <ModalContent>
          {(cerrar) => (
            <Formik
              initialValues={initialValues}
              validationSchema={InvitarUsuarioSchema}
              onSubmit={async (valores, { resetForm }) => {
                setInvitando(true);
                setErrorInvitar("");
                setInvitacionOk("");

                const formData = new FormData();
                formData.set("nombre_completo", valores.nombre_completo);
                formData.set("email", valores.email);
                formData.set("rol_id", valores.rol_id);

                const resultado = await invitarUsuario(formData);
                setInvitando(false);

                if (!resultado.ok) {
                  setErrorInvitar(resultado.error);
                  return;
                }

                resetForm();
                setInvitacionOk(`Se envió la invitación a ${valores.email}.`);
                router.refresh();
              }}
            >
              {({ values, errors, touched, handleChange, handleSubmit, setFieldValue }) => (
                <>
                  <ModalHeader>Invitar usuario</ModalHeader>
                  <ModalBody className="gap-4">
                    <p className="text-default-500 text-sm">
                      Se enviará un correo de invitación de Supabase Auth. La
                      persona define su contraseña al aceptar; no hay registro
                      público en este ERP.
                    </p>
                    <Input
                      label="Nombre completo"
                      variant="bordered"
                      value={values.nombre_completo}
                      onChange={handleChange("nombre_completo")}
                      isInvalid={!!errors.nombre_completo && !!touched.nombre_completo}
                      errorMessage={errors.nombre_completo}
                    />
                    <Input
                      label="Correo electrónico"
                      type="email"
                      variant="bordered"
                      value={values.email}
                      onChange={handleChange("email")}
                      isInvalid={!!errors.email && !!touched.email}
                      errorMessage={errors.email}
                    />
                    <div className="flex flex-col gap-1">
                      <span className="text-small text-default-600">Rol</span>
                      <SelectorRol
                        etiqueta="Rol a asignar"
                        roles={roles}
                        valor={values.rol_id}
                        onCambiar={(rolId) => setFieldValue("rol_id", rolId)}
                      />
                      {!!errors.rol_id && !!touched.rol_id && (
                        <span className="text-tiny text-danger">{errors.rol_id as string}</span>
                      )}
                    </div>
                    {errorInvitar && <p className="text-danger text-sm">{errorInvitar}</p>}
                    {invitacionOk && <p className="text-success text-sm">{invitacionOk}</p>}
                  </ModalBody>
                  <ModalFooter>
                    <Button variant="flat" onPress={cerrar}>
                      Cerrar
                    </Button>
                    <Button
                      color="primary"
                      isLoading={invitando}
                      onPress={() => handleSubmit()}
                    >
                      Enviar invitación
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
};
