"use client";

import { useState } from "react";
import {
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
  Chip,
  Button,
  Input,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
} from "@nextui-org/react";
import type { Tables } from "@/utils/database.types";
import { DropdownSelector } from "@/components/shared/dropdown-selector";

type Registro = Tables<"log_auditoria">;

const OPERACIONES = [
  { id: "INSERT", etiqueta: "Creación" },
  { id: "UPDATE", etiqueta: "Edición" },
  { id: "DELETE", etiqueta: "Eliminación" },
];

const OPERACION_COLOR: Record<string, "success" | "warning" | "danger"> = {
  INSERT: "success",
  UPDATE: "warning",
  DELETE: "danger",
};

interface Props {
  registros: Registro[];
  tablas: string[];
  nombresPorId: Record<string, string>;
  filtros: { tabla: string; operacion: string; desde: string; hasta: string };
}

export function AuditoriaPanel({ registros, tablas, nombresPorId, filtros }: Props) {
  const [detalle, setDetalle] = useState<Registro | null>(null);
  const [tabla, setTabla] = useState(filtros.tabla);
  const [operacion, setOperacion] = useState(filtros.operacion);

  const opcionesTabla = tablas.map((t) => ({ id: t, etiqueta: t }));

  return (
    <div className="flex flex-col gap-4 py-2">
      <form method="get" className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1">
          <span className="text-small text-default-600">Tabla</span>
          <DropdownSelector
            etiquetaAria="Tabla afectada"
            opciones={opcionesTabla}
            valor={tabla || null}
            onCambiar={(id) => setTabla(id ?? "")}
            permitirVacio
            etiquetaVacio="Todas"
          />
          <input type="hidden" name="tabla" value={tabla} />
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-small text-default-600">Operación</span>
          <DropdownSelector
            etiquetaAria="Operación"
            opciones={OPERACIONES}
            valor={operacion || null}
            onCambiar={(id) => setOperacion(id ?? "")}
            permitirVacio
            etiquetaVacio="Todas"
          />
          <input type="hidden" name="operacion" value={operacion} />
        </div>
        <Input
          name="desde"
          type="date"
          label="Desde"
          variant="bordered"
          size="sm"
          defaultValue={filtros.desde}
          className="max-w-[160px]"
        />
        <Input
          name="hasta"
          type="date"
          label="Hasta"
          variant="bordered"
          size="sm"
          defaultValue={filtros.hasta}
          className="max-w-[160px]"
        />
        <Button type="submit" color="primary" size="sm">
          Filtrar
        </Button>
        <Button as="a" href="/configuracion/auditoria" variant="flat" size="sm">
          Limpiar
        </Button>
      </form>

      <Table aria-label="Registros de auditoría" removeWrapper={false}>
        <TableHeader>
          <TableColumn>FECHA</TableColumn>
          <TableColumn>TABLA</TableColumn>
          <TableColumn>OPERACIÓN</TableColumn>
          <TableColumn>USUARIO</TableColumn>
          <TableColumn>CAMPOS MODIFICADOS</TableColumn>
          <TableColumn>ACCIONES</TableColumn>
        </TableHeader>
        <TableBody emptyContent="No hay registros de auditoría que cumplan los filtros.">
          {registros.map((registro) => (
            <TableRow key={registro.id}>
              <TableCell className="text-tiny">{new Date(registro.fecha_hora).toLocaleString()}</TableCell>
              <TableCell className="font-mono text-tiny">{registro.tabla_afectada}</TableCell>
              <TableCell>
                <Chip size="sm" color={OPERACION_COLOR[registro.operacion]} variant="flat">
                  {OPERACIONES.find((o) => o.id === registro.operacion)?.etiqueta ?? registro.operacion}
                </Chip>
              </TableCell>
              <TableCell className="text-tiny">
                {registro.usuario_id ? nombresPorId[registro.usuario_id] ?? "—" : "Sistema"}
              </TableCell>
              <TableCell className="text-tiny text-default-500">
                {registro.campos_modificados?.length ? registro.campos_modificados.join(", ") : "—"}
              </TableCell>
              <TableCell>
                <Button size="sm" variant="light" onPress={() => setDetalle(registro)}>
                  Ver detalle
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Modal isOpen={!!detalle} onOpenChange={(abierto) => !abierto && setDetalle(null)} size="3xl" scrollBehavior="inside">
        <ModalContent>
          {(cerrar) => (
            <>
              <ModalHeader>
                {detalle?.tabla_afectada} · {detalle && OPERACIONES.find((o) => o.id === detalle.operacion)?.etiqueta}
              </ModalHeader>
              <ModalBody className="gap-4">
                <div className="text-tiny text-default-500 grid grid-cols-2 gap-2">
                  <span>Registro: {detalle?.registro_id}</span>
                  <span>
                    Usuario: {detalle?.usuario_id ? nombresPorId[detalle.usuario_id] ?? detalle.usuario_id : "Sistema"}
                  </span>
                  <span>Fecha: {detalle && new Date(detalle.fecha_hora).toLocaleString()}</span>
                  <span>IP: {detalle?.ip_origen ?? "—"}</span>
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <h5 className="font-semibold text-small mb-1">Valores anteriores</h5>
                    <pre className="text-tiny bg-default-100 rounded-md p-3 overflow-auto max-h-[320px]">
                      {detalle?.valores_anteriores ? JSON.stringify(detalle.valores_anteriores, null, 2) : "—"}
                    </pre>
                  </div>
                  <div>
                    <h5 className="font-semibold text-small mb-1">Valores nuevos</h5>
                    <pre className="text-tiny bg-default-100 rounded-md p-3 overflow-auto max-h-[320px]">
                      {detalle?.valores_nuevos ? JSON.stringify(detalle.valores_nuevos, null, 2) : "—"}
                    </pre>
                  </div>
                </div>
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
