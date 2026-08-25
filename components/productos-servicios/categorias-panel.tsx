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
  Textarea,
} from "@nextui-org/react";
import { Formik } from "formik";
import type { Tables } from "@/utils/database.types";
import { DropdownSelector } from "@/components/shared/dropdown-selector";
import { CategoriaServicioSchema } from "@/helpers/schemas";
import type { CategoriaServicioFormType } from "@/helpers/types";
import {
  cambiarEstadoCategoria,
  crearCategoria,
  actualizarCategoria,
} from "@/app/(app)/productos-servicios/actions";

type Categoria = Tables<"categorias_servicio">;

interface Props {
  categorias: Categoria[];
  puedeCrear: boolean;
  puedeEditar: boolean;
}

export function CategoriasPanel({ categorias, puedeCrear, puedeEditar }: Props) {
  const router = useRouter();
  const [modalAbierto, setModalAbierto] = useState(false);
  const [categoriaEnEdicion, setCategoriaEnEdicion] = useState<Categoria | null>(null);
  const [filaEnProceso, setFilaEnProceso] = useState<string | null>(null);
  const [errorGeneral, setErrorGeneral] = useState("");
  const [guardando, setGuardando] = useState(false);

  const nombresPorId = useMemo(() => new Map(categorias.map((c) => [c.id, c.nombre])), [categorias]);

  const abrirCrear = () => {
    setCategoriaEnEdicion(null);
    setErrorGeneral("");
    setModalAbierto(true);
  };

  const abrirEditar = (categoria: Categoria) => {
    setCategoriaEnEdicion(categoria);
    setErrorGeneral("");
    setModalAbierto(true);
  };

  const handleEstado = async (id: string, activo: boolean) => {
    setFilaEnProceso(id);
    const resultado = await cambiarEstadoCategoria(id, activo);
    setFilaEnProceso(null);
    if (!resultado.ok) {
      setErrorGeneral(resultado.error);
      return;
    }
    router.refresh();
  };

  const initialValues: CategoriaServicioFormType = {
    nombre: categoriaEnEdicion?.nombre ?? "",
    descripcion: categoriaEnEdicion?.descripcion ?? "",
    categoria_padre_id: categoriaEnEdicion?.categoria_padre_id ?? "",
  };

  const opcionesPadre = categorias
    .filter((c) => c.id !== categoriaEnEdicion?.id)
    .map((c) => ({ id: c.id, etiqueta: c.nombre }));

  return (
    <div className="flex flex-col gap-4 py-2">
      {puedeCrear && (
        <div className="flex justify-end">
          <Button color="primary" size="sm" onPress={abrirCrear}>
            Nueva categoría
          </Button>
        </div>
      )}

      {errorGeneral && <p className="text-danger text-sm">{errorGeneral}</p>}

      <Table aria-label="Categorías de servicio" removeWrapper={false}>
        <TableHeader>
          <TableColumn>NOMBRE</TableColumn>
          <TableColumn>CATEGORÍA PADRE</TableColumn>
          <TableColumn>ESTADO</TableColumn>
          <TableColumn>ACCIONES</TableColumn>
        </TableHeader>
        <TableBody emptyContent="No hay categorías registradas todavía.">
          {categorias.map((categoria) => (
            <TableRow key={categoria.id}>
              <TableCell>
                <div className="flex flex-col">
                  <span className="font-medium">{categoria.nombre}</span>
                  {categoria.descripcion && (
                    <span className="text-tiny text-default-400">{categoria.descripcion}</span>
                  )}
                </div>
              </TableCell>
              <TableCell>
                {categoria.categoria_padre_id
                  ? nombresPorId.get(categoria.categoria_padre_id) ?? "—"
                  : "—"}
              </TableCell>
              <TableCell>
                {puedeEditar ? (
                  <Switch
                    size="sm"
                    isSelected={categoria.activo}
                    isDisabled={filaEnProceso === categoria.id}
                    onValueChange={(activo) => handleEstado(categoria.id, activo)}
                  />
                ) : (
                  <Chip color={categoria.activo ? "success" : "default"} variant="flat">
                    {categoria.activo ? "Activa" : "Inactiva"}
                  </Chip>
                )}
              </TableCell>
              <TableCell>
                {puedeEditar && (
                  <Button size="sm" variant="light" onPress={() => abrirEditar(categoria)}>
                    Editar
                  </Button>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Modal isOpen={modalAbierto} onOpenChange={setModalAbierto}>
        <ModalContent>
          {(cerrar) => (
            <Formik
              enableReinitialize
              initialValues={initialValues}
              validationSchema={CategoriaServicioSchema}
              onSubmit={async (valores) => {
                setGuardando(true);
                setErrorGeneral("");

                const formData = new FormData();
                formData.set("nombre", valores.nombre);
                formData.set("descripcion", valores.descripcion ?? "");
                formData.set("categoria_padre_id", valores.categoria_padre_id ?? "");

                const resultado = categoriaEnEdicion
                  ? await actualizarCategoria(categoriaEnEdicion.id, formData)
                  : await crearCategoria(formData);

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
                  <ModalHeader>
                    {categoriaEnEdicion ? "Editar categoría" : "Nueva categoría"}
                  </ModalHeader>
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
                    <div className="flex flex-col gap-1">
                      <span className="text-small text-default-600">Categoría padre</span>
                      <DropdownSelector
                        etiquetaAria="Categoría padre"
                        opciones={opcionesPadre}
                        valor={values.categoria_padre_id || null}
                        onCambiar={(id) => setFieldValue("categoria_padre_id", id ?? "")}
                        permitirVacio
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
