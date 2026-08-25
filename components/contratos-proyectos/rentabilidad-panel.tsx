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
  Divider,
} from "@nextui-org/react";
import { Formik } from "formik";
import type { Tables } from "@/utils/database.types";
import { RentabilidadSnapshotSchema } from "@/helpers/schemas";
import type { RentabilidadSnapshotFormType } from "@/helpers/types";
import { generarSnapshotRentabilidad } from "@/app/(app)/contratos-proyectos/actions";

// Fila devuelta por fn_listar_rentabilidad_proyectos() — ya filtrada por
// empresa y por el permiso CONTRATOS_PROYECTOS/leer/rentabilidad dentro de la
// propia función (migración 017). Si el usuario no tiene ese permiso, el RPC
// devuelve 0 filas y este panel simplemente aparece vacío, sin necesidad de
// otra verificación de permisos en el cliente.
export interface RentabilidadLiveRow {
  proyecto_id: string;
  numero_proyecto: string;
  presupuesto_ingreso_total: number | null;
  costo_mano_obra: number;
  costo_subcontratacion: number;
  costo_licencias: number;
  costo_total_actual: number;
  margen_bruto_actual: number;
}

type SnapshotConRelaciones = Tables<"rentabilidad_snapshots"> & {
  proyectos: { numero_proyecto: string; nombre_proyecto: string } | null;
};

function formatearMoneda(valor: number | null): string {
  if (valor == null) return "—";
  return valor.toLocaleString("es-CO", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function margenColor(margenPct: number): "success" | "warning" | "danger" {
  if (margenPct >= 20) return "success";
  if (margenPct >= 0) return "warning";
  return "danger";
}

interface Props {
  rentabilidadLive: RentabilidadLiveRow[];
  snapshots: SnapshotConRelaciones[];
  puedeCrear: boolean;
}

export function RentabilidadPanel({ rentabilidadLive, snapshots, puedeCrear }: Props) {
  const router = useRouter();
  const [proyectoParaSnapshot, setProyectoParaSnapshot] = useState<RentabilidadLiveRow | null>(null);
  const [errorGeneral, setErrorGeneral] = useState("");
  const [guardando, setGuardando] = useState(false);

  const initialValues: RentabilidadSnapshotFormType = { otros_costos: "0" };

  return (
    <div className="flex flex-col gap-6 py-2">
      <div className="flex flex-col gap-2">
        <span className="text-small font-medium">Rentabilidad en tiempo real</span>
        {errorGeneral && !proyectoParaSnapshot && <p className="text-danger text-sm">{errorGeneral}</p>}
        {rentabilidadLive.length === 0 ? (
          <p className="text-default-500 text-sm">
            No hay proyectos con datos de rentabilidad visibles (revisa tu permiso de lectura sobre
            Rentabilidad si esperabas ver información aquí).
          </p>
        ) : (
          <Table aria-label="Rentabilidad en tiempo real" removeWrapper={false}>
            <TableHeader>
              <TableColumn>PROYECTO</TableColumn>
              <TableColumn>INGRESO PRESUPUESTADO</TableColumn>
              <TableColumn>MANO DE OBRA</TableColumn>
              <TableColumn>SUBCONTRATACIÓN</TableColumn>
              <TableColumn>LICENCIAS</TableColumn>
              <TableColumn>COSTO TOTAL</TableColumn>
              <TableColumn>MARGEN</TableColumn>
              <TableColumn>ACCIONES</TableColumn>
            </TableHeader>
            <TableBody>
              {rentabilidadLive.map((fila) => {
                const ingreso = fila.presupuesto_ingreso_total ?? 0;
                const margenPct = ingreso > 0 ? (fila.margen_bruto_actual / ingreso) * 100 : 0;
                return (
                  <TableRow key={fila.proyecto_id}>
                    <TableCell className="font-mono text-tiny">{fila.numero_proyecto}</TableCell>
                    <TableCell>{formatearMoneda(fila.presupuesto_ingreso_total)}</TableCell>
                    <TableCell className="text-tiny text-default-500">{formatearMoneda(fila.costo_mano_obra)}</TableCell>
                    <TableCell className="text-tiny text-default-500">{formatearMoneda(fila.costo_subcontratacion)}</TableCell>
                    <TableCell className="text-tiny text-default-500">{formatearMoneda(fila.costo_licencias)}</TableCell>
                    <TableCell>{formatearMoneda(fila.costo_total_actual)}</TableCell>
                    <TableCell>
                      <Chip size="sm" variant="flat" color={margenColor(margenPct)}>
                        {formatearMoneda(fila.margen_bruto_actual)} ({margenPct.toFixed(1)}%)
                      </Chip>
                    </TableCell>
                    <TableCell>
                      {puedeCrear && (
                        <Button size="sm" variant="light" onPress={() => setProyectoParaSnapshot(fila)}>
                          Generar snapshot
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>

      <Divider />

      <div className="flex flex-col gap-2">
        <span className="text-small font-medium">Historial de snapshots</span>
        {snapshots.length === 0 ? (
          <p className="text-default-500 text-sm">No se ha generado ningún snapshot de rentabilidad todavía.</p>
        ) : (
          <Table aria-label="Historial de snapshots de rentabilidad" removeWrapper={false}>
            <TableHeader>
              <TableColumn>FECHA DE CORTE</TableColumn>
              <TableColumn>PROYECTO</TableColumn>
              <TableColumn>INGRESO</TableColumn>
              <TableColumn>COSTO TOTAL</TableColumn>
              <TableColumn>MARGEN</TableColumn>
              <TableColumn>TIPO</TableColumn>
            </TableHeader>
            <TableBody>
              {snapshots.map((snapshot) => {
                const costoTotal =
                  snapshot.costo_mano_obra + snapshot.costo_subcontratacion + snapshot.costo_licencias + (snapshot.otros_costos ?? 0);
                return (
                  <TableRow key={snapshot.id}>
                    <TableCell className="text-tiny">{snapshot.fecha_corte}</TableCell>
                    <TableCell className="text-tiny">{snapshot.proyectos?.numero_proyecto ?? "—"}</TableCell>
                    <TableCell>{formatearMoneda(snapshot.ingreso_reconocido)}</TableCell>
                    <TableCell>{formatearMoneda(costoTotal)}</TableCell>
                    <TableCell>
                      <Chip size="sm" variant="flat" color={margenColor(snapshot.margen_pct)}>
                        {formatearMoneda(snapshot.margen_bruto)} ({snapshot.margen_pct.toFixed(1)}%)
                      </Chip>
                    </TableCell>
                    <TableCell className="text-tiny text-default-500">{snapshot.tipo_snapshot}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Modal: generar snapshot de rentabilidad */}
      <Modal isOpen={!!proyectoParaSnapshot} onOpenChange={(abierto) => !abierto && setProyectoParaSnapshot(null)}>
        <ModalContent>
          {(cerrar) => (
            <Formik
              initialValues={initialValues}
              validationSchema={RentabilidadSnapshotSchema}
              onSubmit={async (valores, { resetForm }) => {
                if (!proyectoParaSnapshot) return;
                setGuardando(true);
                setErrorGeneral("");

                const formData = new FormData();
                formData.set("otros_costos", valores.otros_costos ?? "0");

                const resultado = await generarSnapshotRentabilidad(proyectoParaSnapshot.proyecto_id, formData);

                setGuardando(false);

                if (!resultado.ok) {
                  setErrorGeneral(resultado.error);
                  return;
                }

                resetForm();
                router.refresh();
                setProyectoParaSnapshot(null);
                cerrar();
              }}
            >
              {({ values, errors, touched, handleChange, handleSubmit }) => (
                <>
                  <ModalHeader>Generar snapshot — {proyectoParaSnapshot?.numero_proyecto}</ModalHeader>
                  <ModalBody className="gap-4">
                    <p className="text-tiny text-default-500">
                      Los costos de mano de obra, subcontratación y licencias se recalculan en el
                      servidor a partir de los datos reales del proyecto — no vienen de este
                      formulario. Solo &quot;otros costos&quot; es un ajuste manual.
                    </p>
                    <Input
                      label="Otros costos (opcional)"
                      type="number"
                      step="0.01"
                      variant="bordered"
                      value={values.otros_costos}
                      onChange={handleChange("otros_costos")}
                      isInvalid={!!errors.otros_costos && !!touched.otros_costos}
                      errorMessage={errors.otros_costos}
                    />
                    {errorGeneral && <p className="text-danger text-sm">{errorGeneral}</p>}
                  </ModalBody>
                  <ModalFooter>
                    <Button variant="flat" onPress={cerrar}>
                      Cancelar
                    </Button>
                    <Button color="primary" isLoading={guardando} onPress={() => handleSubmit()}>
                      Generar
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
