"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardBody, Button, Input, Textarea } from "@nextui-org/react";
import { Formik } from "formik";
import type { Tables } from "@/utils/database.types";
import { DropdownSelector } from "@/components/shared/dropdown-selector";
import { ParametrosGlobalesSchema } from "@/helpers/schemas";
import type { ParametrosGlobalesFormType } from "@/helpers/types";
import { actualizarParametrosGlobales } from "@/app/(app)/configuracion/parametros/actions";

const TIPOS_IDENTIFICACION = ["NIT", "CC", "CE", "PASAPORTE", "RUT", "OTRO"];
const DIAS_SEMANA = [
  { id: "0", etiqueta: "Domingo" },
  { id: "1", etiqueta: "Lunes" },
  { id: "2", etiqueta: "Martes" },
  { id: "3", etiqueta: "Miércoles" },
  { id: "4", etiqueta: "Jueves" },
  { id: "5", etiqueta: "Viernes" },
  { id: "6", etiqueta: "Sábado" },
];

interface Props {
  empresa: Tables<"empresas">;
  monedas: Tables<"monedas">[];
  puedeEditar: boolean;
}

export function ParametrosGlobalesForm({ empresa, monedas, puedeEditar }: Props) {
  const router = useRouter();
  const [errorGeneral, setErrorGeneral] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [guardadoOk, setGuardadoOk] = useState(false);

  const initialValues: ParametrosGlobalesFormType = {
    razon_social: empresa.razon_social,
    nombre_comercial: empresa.nombre_comercial ?? "",
    tipo_identificacion: empresa.tipo_identificacion,
    numero_identificacion: empresa.numero_identificacion,
    digito_verificacion: empresa.digito_verificacion ?? "",
    direccion: empresa.direccion ?? "",
    ciudad: empresa.ciudad ?? "",
    pais: empresa.pais,
    telefono: empresa.telefono ?? "",
    email_corporativo: empresa.email_corporativo ?? "",
    sitio_web: empresa.sitio_web ?? "",
    moneda_principal_id: empresa.moneda_principal_id ?? "",
    zona_horaria: empresa.zona_horaria,
    idioma_por_defecto: empresa.idioma_por_defecto,
    formato_fecha: empresa.formato_fecha,
    formato_hora: empresa.formato_hora,
    separador_miles: empresa.separador_miles,
    separador_decimal: empresa.separador_decimal,
    primer_dia_semana: String(empresa.primer_dia_semana),
    logo_url_claro: empresa.logo_url_claro ?? "",
    logo_url_oscuro: empresa.logo_url_oscuro ?? "",
    pie_pagina_documentos: empresa.pie_pagina_documentos ?? "",
  };

  const opcionesMoneda = monedas.map((m) => ({ id: m.id, etiqueta: `${m.codigo_iso} — ${m.nombre}` }));
  const opcionesTipoId = TIPOS_IDENTIFICACION.map((t) => ({ id: t, etiqueta: t }));

  return (
    <Formik
      enableReinitialize
      initialValues={initialValues}
      validationSchema={ParametrosGlobalesSchema}
      onSubmit={async (valores) => {
        setGuardando(true);
        setErrorGeneral("");
        setGuardadoOk(false);

        const formData = new FormData();
        Object.entries(valores).forEach(([clave, valor]) => {
          formData.set(clave, valor === null || valor === undefined ? "" : String(valor));
        });

        const resultado = await actualizarParametrosGlobales(empresa.id, formData);
        setGuardando(false);

        if (!resultado.ok) {
          setErrorGeneral(resultado.error);
          return;
        }

        setGuardadoOk(true);
        router.refresh();
      }}
    >
      {({ values, errors, touched, handleChange, handleSubmit, setFieldValue }) => (
        <div className="flex flex-col gap-4 pb-10">
          <Card>
            <CardBody className="gap-4">
              <h4 className="font-semibold text-medium">Identificación de la empresa</h4>
              <div className="grid md:grid-cols-2 gap-4">
                <Input
                  label="Razón social"
                  variant="bordered"
                  isDisabled={!puedeEditar}
                  value={values.razon_social}
                  onChange={handleChange("razon_social")}
                  isInvalid={!!errors.razon_social && !!touched.razon_social}
                  errorMessage={errors.razon_social}
                />
                <Input
                  label="Nombre comercial"
                  variant="bordered"
                  isDisabled={!puedeEditar}
                  value={values.nombre_comercial}
                  onChange={handleChange("nombre_comercial")}
                />
                <div className="flex flex-col gap-1">
                  <span className="text-small text-default-600">Tipo de identificación</span>
                  <DropdownSelector
                    etiquetaAria="Tipo de identificación"
                    opciones={opcionesTipoId}
                    valor={values.tipo_identificacion || null}
                    onCambiar={(id) => setFieldValue("tipo_identificacion", id ?? "")}
                    isDisabled={!puedeEditar}
                  />
                </div>
                <Input
                  label="Número de identificación"
                  variant="bordered"
                  isDisabled={!puedeEditar}
                  value={values.numero_identificacion}
                  onChange={handleChange("numero_identificacion")}
                  isInvalid={!!errors.numero_identificacion && !!touched.numero_identificacion}
                  errorMessage={errors.numero_identificacion}
                />
                <Input
                  label="Dígito de verificación"
                  variant="bordered"
                  isDisabled={!puedeEditar}
                  value={values.digito_verificacion}
                  onChange={handleChange("digito_verificacion")}
                />
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardBody className="gap-4">
              <h4 className="font-semibold text-medium">Contacto y ubicación</h4>
              <div className="grid md:grid-cols-2 gap-4">
                <Input
                  label="Dirección"
                  variant="bordered"
                  isDisabled={!puedeEditar}
                  value={values.direccion}
                  onChange={handleChange("direccion")}
                />
                <Input
                  label="Ciudad"
                  variant="bordered"
                  isDisabled={!puedeEditar}
                  value={values.ciudad}
                  onChange={handleChange("ciudad")}
                />
                <Input
                  label="País"
                  variant="bordered"
                  isDisabled={!puedeEditar}
                  value={values.pais}
                  onChange={handleChange("pais")}
                  isInvalid={!!errors.pais && !!touched.pais}
                  errorMessage={errors.pais}
                />
                <Input
                  label="Teléfono"
                  variant="bordered"
                  isDisabled={!puedeEditar}
                  value={values.telefono}
                  onChange={handleChange("telefono")}
                />
                <Input
                  label="Correo corporativo"
                  variant="bordered"
                  isDisabled={!puedeEditar}
                  value={values.email_corporativo}
                  onChange={handleChange("email_corporativo")}
                  isInvalid={!!errors.email_corporativo && !!touched.email_corporativo}
                  errorMessage={errors.email_corporativo}
                />
                <Input
                  label="Sitio web"
                  variant="bordered"
                  isDisabled={!puedeEditar}
                  value={values.sitio_web}
                  onChange={handleChange("sitio_web")}
                />
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardBody className="gap-4">
              <h4 className="font-semibold text-medium">Formato regional y moneda</h4>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <span className="text-small text-default-600">Moneda principal</span>
                  <DropdownSelector
                    etiquetaAria="Moneda principal"
                    opciones={opcionesMoneda}
                    valor={values.moneda_principal_id || null}
                    onCambiar={(id) => setFieldValue("moneda_principal_id", id ?? "")}
                    isDisabled={!puedeEditar}
                    permitirVacio
                  />
                </div>
                <Input
                  label="Zona horaria"
                  variant="bordered"
                  isDisabled={!puedeEditar}
                  placeholder="America/Bogota"
                  value={values.zona_horaria}
                  onChange={handleChange("zona_horaria")}
                  isInvalid={!!errors.zona_horaria && !!touched.zona_horaria}
                  errorMessage={errors.zona_horaria}
                />
                <Input
                  label="Idioma por defecto"
                  variant="bordered"
                  isDisabled={!puedeEditar}
                  placeholder="es"
                  value={values.idioma_por_defecto}
                  onChange={handleChange("idioma_por_defecto")}
                />
                <Input
                  label="Formato de fecha"
                  variant="bordered"
                  isDisabled={!puedeEditar}
                  placeholder="DD/MM/YYYY"
                  value={values.formato_fecha}
                  onChange={handleChange("formato_fecha")}
                />
                <Input
                  label="Formato de hora"
                  variant="bordered"
                  isDisabled={!puedeEditar}
                  placeholder="24h"
                  value={values.formato_hora}
                  onChange={handleChange("formato_hora")}
                />
                <Input
                  label="Separador de miles"
                  variant="bordered"
                  isDisabled={!puedeEditar}
                  value={values.separador_miles}
                  onChange={handleChange("separador_miles")}
                />
                <Input
                  label="Separador decimal"
                  variant="bordered"
                  isDisabled={!puedeEditar}
                  value={values.separador_decimal}
                  onChange={handleChange("separador_decimal")}
                />
                <div className="flex flex-col gap-1">
                  <span className="text-small text-default-600">Primer día de la semana</span>
                  <DropdownSelector
                    etiquetaAria="Primer día de la semana"
                    opciones={DIAS_SEMANA}
                    valor={values.primer_dia_semana || null}
                    onCambiar={(id) => setFieldValue("primer_dia_semana", id ?? "0")}
                    isDisabled={!puedeEditar}
                  />
                </div>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardBody className="gap-4">
              <h4 className="font-semibold text-medium">Marca en documentos</h4>
              <div className="grid md:grid-cols-2 gap-4">
                <Input
                  label="Logo (tema claro) — URL"
                  variant="bordered"
                  isDisabled={!puedeEditar}
                  value={values.logo_url_claro}
                  onChange={handleChange("logo_url_claro")}
                />
                <Input
                  label="Logo (tema oscuro) — URL"
                  variant="bordered"
                  isDisabled={!puedeEditar}
                  value={values.logo_url_oscuro}
                  onChange={handleChange("logo_url_oscuro")}
                />
              </div>
              <Textarea
                label="Pie de página de documentos"
                variant="bordered"
                isDisabled={!puedeEditar}
                value={values.pie_pagina_documentos}
                onChange={handleChange("pie_pagina_documentos")}
              />
            </CardBody>
          </Card>

          {errorGeneral && <p className="text-danger text-sm">{errorGeneral}</p>}
          {guardadoOk && <p className="text-success text-sm">Parámetros guardados correctamente.</p>}

          {puedeEditar && (
            <div className="flex justify-end">
              <Button color="primary" isLoading={guardando} onPress={() => handleSubmit()}>
                Guardar cambios
              </Button>
            </div>
          )}
        </div>
      )}
    </Formik>
  );
}
