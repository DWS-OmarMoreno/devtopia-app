# Módulo: Cierre y Postventa

Dependencias verificadas antes de esta etapa: `proyectos`, `contratos`,
`casos_soporte_referencia_externa` (Etapa 4); `perfiles_usuario`, `contactos`. Esta etapa
no crea ninguna tabla nueva de casos de soporte: **reutiliza**
`casos_soporte_referencia_externa` filtrando `es_cubierto_garantia = true`, evitando
duplicar el modelo (ver decisión de diseño en `04-contratos-proyectos.md §9`).

## 1. Checklist de Liquidación

Modelo de plantilla reutilizable + instancia por proyecto, para que cada tipo de proyecto
(producto vs. consultoría, por ejemplo) pueda tener su propio protocolo de cierre sin
hardcodear los ítems en código.

### `checklist_liquidacion_plantillas`
| Campo | Tipo | Oblig. | Notas |
|---|---|---|---|
| id | uuid | sí | PK |
| empresa_id | uuid | sí | |
| nombre | text | sí | |
| descripcion | text | no | |
| activo | boolean | sí | |

### `checklist_liquidacion_plantilla_items`
| Campo | Tipo | Oblig. | Notas |
|---|---|---|---|
| id | uuid | sí | PK |
| plantilla_id | uuid | sí | FK `checklist_liquidacion_plantillas` |
| orden | smallint | sí | |
| descripcion_item | text | sí | |
| tipo_verificacion | text | sí | `ENTREGABLE_ACEPTADO`/`FIRMA_CLIENTE`/`RECURSOS_LIBERADOS`/`FACTURACION_COMPLETA`/`ACTIVOS_DEVUELTOS`/`DOCUMENTACION_ENTREGADA`/`OTRO` |
| obligatorio | boolean | sí | |

### `checklist_liquidacion_proyecto`
Instancia 1:1 por proyecto, creada al iniciar el protocolo de cierre.

| Campo | Tipo | Oblig. | Notas |
|---|---|---|---|
| id | uuid | sí | PK |
| proyecto_id | uuid | sí | FK `proyectos`, único |
| plantilla_id | uuid | sí | FK `checklist_liquidacion_plantillas` |
| responsable_id | uuid | sí | FK `perfiles_usuario` (típicamente el PM) |
| fecha_inicio_liquidacion | date | sí | |
| fecha_completado | date | no | |
| estado | text | sí | `EN_PROCESO`/`COMPLETADO` |
| porcentaje_completado | numeric(5,2) | no | derivado de `checklist_liquidacion_items` |

### `checklist_liquidacion_items`
Instancia de cada ítem de la plantilla, para ese proyecto.

| Campo | Tipo | Oblig. | Notas |
|---|---|---|---|
| id | uuid | sí | PK |
| checklist_proyecto_id | uuid | sí | FK `checklist_liquidacion_proyecto` |
| plantilla_item_id | uuid | sí | FK `checklist_liquidacion_plantilla_items` |
| cumplido | boolean | sí | |
| fecha_cumplimiento | timestamptz | no | |
| verificado_por_usuario_id | uuid | no | FK `perfiles_usuario` |
| evidencia_url | text | no | |
| comentario | text | no | |

### `actas_cierre`
Firma de aceptación final y liberación de recursos.

| Campo | Tipo | Oblig. | Notas |
|---|---|---|---|
| id | uuid | sí | PK |
| proyecto_id | uuid | sí | FK `proyectos`, único |
| fecha_acta | date | sí | |
| firmante_cliente_contacto_id | uuid | no | FK `contactos` (`es_firmante_autorizado=true`) |
| firmante_interno_usuario_id | uuid | sí | FK `perfiles_usuario` |
| documento_acta_url | text | no | |
| observaciones_finales | text | no | |
| recursos_liberados | boolean | sí | default false |
| fecha_liberacion_recursos | timestamptz | no | |

Al marcar `recursos_liberados = true`, la capa de aplicación cierra las filas abiertas en
`asignacion_recursos` (`estado_asignacion → FINALIZADA`) para ese proyecto.

## 2. Control de Garantía

### `garantias_contractuales`
| Campo | Tipo | Oblig. | Notas |
|---|---|---|---|
| id | uuid | sí | PK |
| proyecto_id | uuid | no | FK `proyectos` |
| contrato_id | uuid | no | FK `contratos` |
| fecha_inicio_garantia | date | sí | |
| duracion_meses | smallint | sí | |
| fecha_fin_garantia | date | sí | calculada, se guarda para consulta directa sin funciones en cada query |
| alcance_garantia | text | no | qué cubre |
| condiciones_exclusiones | text | no | |
| estado | text | sí | `VIGENTE`/`VENCIDA`/`EXTENDIDA` |

Check: al menos uno de (`proyecto_id`, `contrato_id`) no nulo.

### `garantia_extensiones`
| Campo | Tipo | Oblig. | Notas |
|---|---|---|---|
| id | uuid | sí | PK |
| garantia_id | uuid | sí | FK `garantias_contractuales` |
| fecha_extension | date | sí | |
| meses_adicionales | smallint | sí | |
| motivo | text | no | |
| valor_adicional | numeric(18,2) | no | |
| aprobado_por_usuario_id | uuid | no | FK `perfiles_usuario` |

Consulta del historial de soporte cubierto por garantía, previa al cierre definitivo:
`select * from casos_soporte_referencia_externa where proyecto_id = :proyecto_id and
es_cubierto_garantia = true order by fecha_apertura desc` — no requiere tabla ni columna
adicional porque el dato ya vive en la sublista del módulo 04.

## 3. Checklist de cierre de esta etapa (ISO/IEC 25010)

- [x] **Funcionalidad**: checklist de liquidación configurable y control de garantía
  cubiertos, incluida la consulta explícita de casos de soporte antes del cierre
  definitivo pedida en el requerimiento.
- [x] **Mantenibilidad**: cero duplicación de `casos_soporte_referencia_externa` —
  reutilización explícita documentada, reduciendo el riesgo de que ambos módulos
  diverjan sobre el mismo dato.
- [x] **Usabilidad**: separar plantilla de instancia permite que Configuración General (o
  un PM con permiso) ajuste el protocolo de liquidación sin tocar código ni depender de
  un desarrollador.
- [x] **Fiabilidad**: `fecha_fin_garantia` se almacena (no se recalcula en cada consulta)
  para que un cambio futuro en la fórmula no altere retroactivamente garantías ya
  cerradas; las extensiones son filas nuevas, no updates destructivos sobre la fila base.
- [x] **Trazabilidad**: `actas_cierre.recursos_liberados` + su fecha deja evidencia exacta
  de cuándo un recurso quedó libre para asignarse a otro proyecto.
