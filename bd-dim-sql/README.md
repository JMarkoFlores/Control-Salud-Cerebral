# G1 — Data Mart y ETL

**Proyecto:** Prevención del deterioro cognitivo mediante hábitos diarios.  
**Motor:** SQL Server 2022 (T-SQL), administrado desde SSMS.  
**Origen:** `prevencion_cognitiva_oltp` (archivo definitivo `bd-transaccional.sql`, 17 tablas).  
**Destino propuesto:** `prevencion_cognitiva_mart` (una sola base dimensional).  
**Alcance:** autoseguimiento. La aplicación transaccional y los visualizadores no se modifican con estos scripts.

**Versión 5 (Tabla 4 del informe):** el Data Mart tiene exactamente ocho tablas analíticas, seis dimensiones y dos hechos. Cada dimensión conserva exclusivamente los niveles aprobados, además de su KEY e ID. Las vistas de preparación y las cargas ETL se ejecutan desde `prevencion_cognitiva_oltp`; se conservan las seis medidas y los tres indicadores. No se crea auditoría ni coordinador.

## 1. Orden de instalación y ejecución en SSMS

Conéctate a la misma instancia SQL Server que contiene el OLTP. Comprueba primero:

```sql
SELECT DB_ID(N'prevencion_cognitiva_oltp') AS id_bd_origen;
SELECT @@VERSION AS version_sql_server;
```

Si el primer valor es `NULL`, crea la base transaccional con el script definitivo de tu compañero (una sola vez). No vuelvas a ejecutar su script de creación de tablas si ya existe el OLTP. Comprueba que las tablas `persona`, `ubicacion`, `meta_semanal`, `sesion_fisica`, `contacto_social`, `confirmacion_diaria`, `control_programado` y `resultado_control` existan.

Abre y ejecuta los cinco archivos uno por uno en SSMS. No continúes si aparece un error. Cada archivo comienza con `USE` de la base que corresponde.

| Orden | Archivo | Base desde donde se ejecuta | Finalidad |
|---|---|---|---|
| 01 | `01_Crear_DataMart.sql` | Data Mart (creación desde master) | Crear las seis dimensiones, dos hechos, relaciones e índices. |
| 02 | `02_ETL.sql` | Transaccional | Crear las vistas de preparación (PASO 03 interno), cargar las seis dimensiones con MERGE y los dos hechos con DELETE + INSERT (PASO 04 interno). |
| 03 | `03_Vistas_Indicadores.sql` | Data Mart | Crear las cinco vistas analíticas de los tres KPI. |
| 04 | `04_Validacion.sql` | Transaccional | Conciliar las seis medidas y verificar los resultados. |
| 05 | `05_Reportes_DataMart.sql` | Data Mart | Crear los seis procedimientos de reporte. |

**Actualizaciones posteriores:** ejecutar `02_ETL.sql` desde la base transaccional. Ejecutar `04_Validacion.sql` para comprobar. No es necesario volver a crear tablas y vistas. No se instala un coordinador ni triggers. El archivo `02_ETL.sql` añade vistas al esquema dbo del OLTP, no altera las 17 tablas ni sus registros y escribe exclusivamente en el Data Mart.

Dentro de `02_ETL.sql`, tras la sección de dimensiones (PASO 03) y antes de la de hechos (PASO 04), puedes visualizar cómo quedarán los hechos, tal como se prepara una vista en los ejemplos del ingeniero:

```sql
USE [prevencion_cognitiva_oltp];
GO
SELECT * FROM [dbo].[v_HechoHabitosSemanales];
SELECT * FROM [dbo].[v_HechoControlesCardiometabolicosMensuales];
```

Estas consultas son de sólo lectura. El paso 04 realiza finalmente los dos `INSERT INTO [prevencion_cognitiva_mart].[dbo]... SELECT ... FROM [dbo].[v_Hecho...]`.

Si no hay registros en el OLTP, se cargan el calendario y los catálogos técnicos, pero no habrá hechos con participantes. Para una demostración, los datos autorizados o simulados deben cargarse en el OLTP y pasar por el ETL, no escribirse directamente como indicadores.

### Verificar el Data Mart

```sql
USE [prevencion_cognitiva_mart];
GO
SELECT name AS tabla FROM sys.tables ORDER BY name;
```

Una instalación limpia de esta versión devuelve exactamente ocho tablas. Las vistas y los procedimientos de `bi` no se cuentan como tablas.


### Data Mart de una versión anterior

Si el Data Mart ya existía con un esquema previo, elimínalo antes de continuar (por ejemplo con `RESET_MART=true` en el job `db-init` o `DROP DATABASE [prevencion_cognitiva_mart]`) y ejecuta 01 a 05 en orden. Los datos se recargan desde el OLTP con `02_ETL.sql`; no hay script de migración.

En una instalación nueva comienza directamente con 01. No vuelvas a ejecutar la creación incondicional del OLTP si éste ya existe. El archivo `04_Validacion.sql` comprueba los nombres y el orden exactos de las columnas de cada dimensión: si la consulta de discrepancias no devuelve filas, el modelo coincide con la Tabla 4.

### Lectura de los scripts y funciones SQL utilizadas

La sintaxis que usa el profesor `[BaseDeDatos].[esquema].[tabla]` identifica la tabla sin depender de qué base se encuentre seleccionada en SSMS. Por ejemplo, `[prevencion_cognitiva_oltp].[dbo].[persona]` es el origen y `[prevencion_cognitiva_mart].[dbo].[DIM_PERSONA]` el destino. `dbo` es el esquema, no el nombre de la base de datos.

| Función o instrucción | Explicación corta | Ejemplo |
|---|---|---|
| `YEAR`, `MONTH`, `DAY` | Obtienen año, mes y día. | `YEAR('20261126')` → 2026. |
| `DATEADD` | Suma o resta una cantidad de días, meses, años, etc. No calcula una diferencia. | `DATEADD(DAY, 6, '20261123')` → 2026-11-29 (domingo). |
| `DATEPART` | Devuelve una parte numérica de la fecha. | `DATEPART(QUARTER, '20261126')` → 4. |
| `DATENAME` | Devuelve una parte de la fecha como texto, según el idioma. | Con `SET LANGUAGE Spanish`, `DATENAME(MONTH, '20261126')` → noviembre. |
| `SET DATEFIRST 1` | Indica que la semana comienza el lunes (1). | `DATEPART(WEEKDAY, '20261123')` → 1. |
| `DATEFROMPARTS` | Construye una fecha con año, mes y día. | `DATEFROMPARTS(2026, 11, 1)` → 2026-11-01. |
| `DATETRUNC` | Obtiene el inicio de un periodo. `ISO_WEEK` siempre empieza el lunes. Disponible en SQL Server 2022. | `DATETRUNC(ISO_WEEK, CAST('20261126' AS DATE))` → 2026-11-23. |
| `EOMONTH` | Obtiene el último día del mes. | `EOMONTH('20261101')` → 2026-11-30. |
| `ISNULL` | Sustituye un nulo cuando corresponde. No se utiliza para convertir un KPI pendiente en cero. | `ISNULL(NULL, 5)` → 5. |
| `NULLIF` | Devuelve NULL si dos valores son iguales; evita dividir entre cero. | `100.0 / NULLIF(0, 0)` → NULL. |
| `CONVERT` | Cambia un valor de un tipo de datos a otro. | `CONVERT(DATE, GETDATE())` devuelve sólo la fecha. |
| `TRIM`, `UPPER` | Quitan espacios de los extremos y convierten texto a mayúsculas, respectivamente. | `TRIM(' Meta ')` → Meta. |
| `SUM`, `COUNT`, `MIN`, `MAX` | Suman, cuentan, devuelven el mínimo y el máximo. | `SUM(duracion_minutos)` = minutos realizados. |
| `COUNT_BIG` | Como `COUNT`, pero devuelve BIGINT para contar las filas de una carga grande. | `COUNT_BIG(*)` → cantidad de filas. |
| `CASE WHEN` | Evalúa una condición y devuelve un valor. | `CASE WHEN porcentaje >= 100 THEN 'BUENO' ELSE 'REGULAR' END`. |
| `WITH ... AS` | Da nombre a una consulta auxiliar dentro de otra consulta (CTE). | `WITH Datos AS (SELECT ...) SELECT ... FROM Datos`. |
| `SELECT ... INTO #Tabla` | Guarda temporalmente los resultados de un SELECT para el siguiente paso de un procedimiento. | `SELECT ... INTO #HabitosAgrupados`. |
| `MERGE` | Compara origen y destino por ID; actualiza al existir e inserta al faltar. | `ON dim.id_persona = oltp.id_persona`. |
| `AT TIME ZONE` | Convierte la hora UTC a la zona local. | Permite obtener el día de Perú aunque el servidor esté en Google Cloud. |
| `BEGIN TRANSACTION` / `COMMIT` / `ROLLBACK` | Agrupan cambios: se confirman todos o se revierten si falla el ETL. | Protegen el `DELETE` + `INSERT` de los hechos. |

`DATEADD` se conserva únicamente para límites de los periodos y la edad exacta. Sin una operación de fecha, por ejemplo, calcular el domingo a partir del lunes fallaría al cruzar de mes o de año. Los cálculos de porcentaje son operaciones de división, sumas y `CASE` fácilmente verificables.

## 2. Cuadro de mapeo de dimensiones (origen → destino)

Todas las dimensiones comienzan con `key_<dimensión> INT IDENTITY(1,1) PRIMARY KEY` y terminan con `id_<dimensión>`. El ID de negocio se utiliza para la coincidencia del `MERGE`; el `key` se utiliza en los hechos. No se crean llaves foráneas físicas hacia el OLTP.

| Dimensión | Campos de origen | Atributos de destino / transformación | ID de origen |
|---|---|---|---|
| D1 `DIM_PERSONA` | `persona.activo`, `fecha_nacimiento`, `fecha_alta`, `sexo`, `nombres`, `apellidos`, `persona_id` | Estado, grupo de edad, fecha de nacimiento, fecha de alta, sexo, nombres (nombres y apellidos concatenados en un solo campo). Grupo de edad al corte: 30–39, 40–49, 50–59, 60–65 u otro. Las vistas recalculan edad al cierre de cada periodo. | `id_persona = persona.persona_id` |
| D2 `DIM_TIEMPO` | `persona.fecha_alta`, `meta_semanal.inicio_semana`, `sesion_fisica.fecha_hora`, `contacto_social.fecha_hora`, `confirmacion_diaria.fecha`, `control_programado.mes_periodo`, `resultado_control.fecha_medicion` | Calendario continuo: año, trimestre, mes, semana ISO, día y día de semana. El inicio de cada semana/mes se calcula a partir de `id_tiempo` durante el ETL, sin guardar columnas adicionales. | `id_tiempo = fecha DATE` (valor natural derivado) |
| D3 `DIM_UBICACION` | `ubicacion.pais`, `departamento`, `provincia`, `ciudad`, `distrito`, `ubicacion_id`; enlace `persona.ubicacion_id` | País, departamento, provincia, ciudad y distrito. La ciudad se registra en el OLTP; en el piloto los distritos de Trujillo comparten la ciudad `Trujillo`. | `id_ubicacion = ubicacion.ubicacion_id` |
| D4 `DIM_TIPO_SEGUIMIENTO` | Dominio de `meta_semanal.habito`, `control_programado.tipo_control` y `resultado_control.tipo_control` | Periodicidad, tipo de seguimiento, tipo de control, unidad de medida. Dos categorías semanales y cuatro categorías de control mensual. | `id_tipo_seguimiento` (código normalizado del valor origen) |
| D5 `DIM_ORIGEN_RESULTADO` | `resultado_control.origen`, `validado`, `es_referencia` | Origen, estado de validación interna y marca de referencia. Categoría `SIN_RESULTADO` para el control sin resultado seleccionado. | `id_origen_resultado = ORIGEN\|validado\|es_referencia` |
| D6 `DIM_META` | `meta_semanal`: `meta_id`, `unidad`, `origen_meta`, `version_meta`, `vigente`; `control_programado`: `control_id`, `criterio_meta_texto`, `unidad`, `vigente` | Tipo, criterio, unidad, origen, versión y vigencia. Los límites numéricos y las fechas de los controles permanecen en el OLTP y se usan temporalmente para evaluar las medidas. El origen/versión clínicos no están registrados como tales en OLTP. El valor de meta semanal sigue siendo una medida en el hecho. | `id_meta = SEM:<meta_id>` o `CTRL:<control_id>`; `SIN_META` para ausencia. El prefijo evita colisiones entre tablas. |

D2, D4 y D5 no tienen una PK propia en una tabla de catálogo del OLTP; sus identificadores se derivan del contenido transaccional. Los IDs de origen no son autoincrementables en el Mart.

### Campos físicos aprobados (orden exacto)

| Tabla | Campos |
|---|---|
| DIM_PERSONA | key_persona, estado, grupo_edad, fecha_nacimiento, fecha_alta, sexo, nombres, id_persona |
| DIM_TIEMPO | key_tiempo, anio, trimestre, mes, semana, dia, dia_semana, id_tiempo |
| DIM_UBICACION | key_ubicacion, pais, departamento, provincia, ciudad, distrito, id_ubicacion |
| DIM_TIPO_SEGUIMIENTO | key_tipo_seguimiento, periodicidad, tipo_seguimiento, tipo_control, unidad_medida, id_tipo_seguimiento |
| DIM_ORIGEN_RESULTADO | key_origen_resultado, origen_resultado, estado_validacion, resultado_referencia, id_origen_resultado |
| DIM_META | key_meta, tipo_meta, criterio_meta, unidad, origen_meta, version_meta, vigencia, id_meta |

Los campos `estado_datos` y `fecha_corte` permanecen en ambos hechos como atributos técnicos de seguimiento, no como medidas adicionales ni niveles dimensionales. Los números clínicos y fechas de programación no se copian al Data Mart.

## 3. Mapeo de hechos y medidas

### `FACT_HABITOS_SEMANALES`

Grano: persona × lunes de semana × tipo de hábito. Dimensiones D1, D2, D3, D4 y D6. Una fila para actividad física y una fila para contacto social por participante/semana. La PK es la combinación de las cinco FK; una restricción `UNIQUE` adicional impide duplicar el grano aunque varíe una meta o ubicación.

| Medida | Campo destino | Origen y cálculo |
|---|---|---|
| M1 Minutos realizados | `minutos_realizados` | Suma de `sesion_fisica.duracion_minutos` de sesiones `VALIDO` en la semana. |
| M2 Meta de minutos semanal | `meta_minutos_semanal` | `meta_semanal.valor_meta`, hábito `ACTIVIDAD_FISICA`, `vigente=1`, una única versión por persona/semana. |
| M3 Días con contacto social | `dias_con_contacto` | Contar fechas distintas de `contacto_social.fecha_hora` con estado `VALIDO` por persona/semana. |
| M4 Meta de días semanal | `meta_dias_semanal` | `meta_semanal.valor_meta`, hábito `CONTACTO_SOCIAL`, `vigente=1`. |

Los campos de la otra categoría quedan `NULL` (no aplican). Los registros válidos del día acreditan la realización; `CONFIRMADO_SIN_ACTIVIDAD` acredita cero. Un día sin registros ni confirmación o una contradicción queda pendiente. Una semana sin datos no es un cero confirmado. Se consideran días hasta el corte; la semana abierta se distingue de la cerrada. Las semanas sin meta se generan con `SIN_META`, sin denominador. No se generan periodos futuros.

### `FACT_CONTROLES_CARDIOMETABOLICOS_MENSUALES`

Grano: persona × primer día del mes × tipo de control (presión arterial, glucosa, LDL o IMC). Dimensiones D1–D6. Cuatro filas por participante/mes, incluso si un control no fue programado. La PK es la combinación de las seis FK; `UNIQUE` adicional para el grano.

| Medida | Campo destino | Origen y cálculo |
|---|---|---|
| M5 Factores dentro de su meta | `factores_dentro_meta` | 1 si el resultado de referencia es válido internamente, corresponde al mismo control/persona/tipo/mes/unidad, tiene criterio individual verificable y confirma `dentro_de_meta=1`; 0 en otro caso. La categoría de datos distingue pendiente de fuera de meta. |
| M6 Factores con meta y control previsto | `factores_previstos` | 1 si existe `control_programado` vigente con criterio de meta no vacío para el factor y mes; 0 si no fue programado, está inactivo o no tiene meta. Un control pendiente con meta prevista sigue contando en M6. |

No se evalúan como controles programados los resultados libres que no tengan `control_id`. La selección prefiere la referencia explícita, luego el último resultado para identificar el origen; un resultado sin marca de referencia no cuenta en M5. No se aplican umbrales clínicos universales ni se diagnostica a la persona. Se compara exclusivamente con los límites individuales registrados; si no existen límites verificables o se contradice la marca del origen, el control queda pendiente. `validado=1` es una marca del sistema, no certificación de un profesional.

## 4. Indicadores y estados

La aplicación y el Data Mart comparten los mismos límites del informe: CAF 100/70/50 y CCS/FCM 100/0. Los estados `Óptimo`, `Bueno`, `Regular` y `Malo` se calculan con el porcentaje sin redondear; el redondeo es solo de presentación.

| Indicador | Fórmula | Estados de cumplimiento |
|---|---|---|
| CAF | `(SUM(M1) / SUM(M2)) × 100` | Óptimo ≥ 100%; Bueno ≥ 70% y < 100%; Regular ≥ 50% y < 70%; Malo < 50%. |
| CCS | `(SUM(M3) / SUM(M4)) × 100` | Bueno ≥ 100%; Regular > 0% y < 100%; Malo = 0%. |
| FCM | `(SUM(M5) / SUM(M6)) × 100` | Bueno = 100%; Regular > 0% y < 100%; Malo = 0%. |

Las vistas separan `estado_datos` de `estado_indicador`. Sin meta/sin programación o sin resultado evaluable, el porcentaje es `NULL`, no 0%. Para un FCM parcialmente evaluado se muestra el avance observado con el denominador completo (ej. 1/3), mientras el estado queda `DATOS_PENDIENTES`; no se clasifica como malo un dato faltante. Los porcentajes no se limitan artificialmente a 100% para CAF/CCS y no se suman entre participantes. Se aplican los límites del indicador antes de redondearlo para mostrarlo.

### Casos de aceptación para la demostración

Los siguientes son ejemplos ficticios de verificación, no resultados reales de la población.

| Caso | Datos | Resultado esperado |
|---|---|---|
| Actividad física | Semana completa confirmada; 120 minutos válidos, objetivo 150 | M1=120, M2=150, CAF=80%, BUENO. |
| Contacto sin duplicados | 2 contactos el lunes, 1 el miércoles, 1 el viernes; meta 4; resto de días confirmado sin actividad | M3=3, M4=4, CCS=75%, REGULAR. |
| Cero confirmado | Los siete días de contacto se confirman sin actividad; meta 5 | M3=0, M4=5, CCS=0%, MALO. |
| Sin datos | Semana cerrada sin eventos ni confirmaciones, meta 150 | M1=NULL, M2=150, CAF=NULL, DATOS_PENDIENTES. |
| FCM completo | 3 factores programados con meta; dos evaluados dentro y uno fuera; un factor no programado | M5=2, M6=3, FCM=66.67%, REGULAR. |
| FCM parcial | 3 factores previstos, uno dentro de meta, dos pendientes | M5=1, M6=3, FCM=33.33% provisional, DATOS_PENDIENTES. |
| FCM sin programación | Ninguno de los cuatro controles programado | M5=0, M6=0, FCM=NULL, NO_PROGRAMADO. |
| Fuera del rango de edad | Participante de 70 años con registros válidos | `DIM_PERSONA` queda `FUERA_RANGO` y no se generan filas en los hechos; los reportes no lo cuentan. |
| Cuenta administrativa | Administrador de 41 años sin metas | Permanece en `DIM_PERSONA` pero no genera hechos ni aparece como participante. |

## 5. Entrega a los compañeros responsables del dashboard

| Objeto | Uso |
|---|---|
| `bi.v_Indicadores` | Fuente unificada: código CAF/CCS/FCM, persona pseudonimizada, demografía, ubicación, periodo, numerador, denominador, porcentaje, estados y fecha de corte. |
| `bi.v_IndicadoresSemanales` | Detalle semanal y M1–M4, meta utilizada, semana ISO y año del calendario. |
| `bi.v_ControlesDetalle` | Detalle mensual de los cuatro tipos de control, M5/M6, origen, fecha prevista y estado de los datos. |
| `bi.v_IndicadorFCM` | Indicador mensual por persona y coberturas de evaluación. |
| `bi.v_ResumenIndicadores` | Resumen por indicador y periodo de participantes en el rango 30–65 años en Perú. Excluye pendientes de la tasa agregada y muestra sus cantidades. |

Para otros segmentos, consultar `bi.v_Indicadores` filtrando por rango de edad, departamento, provincia, ciudad y distrito. Agrupar por `codigo_indicador` y por el periodo correspondiente y dividir sumas de numeradores y denominadores de filas evaluables. La semana se identifica por su lunes (no por la llave numérica mínima/máxima); si se presenta por mes, se atribuye al mes de ese lunes. No unir directamente ambos hechos por persona y fecha, pues tienen distinta granularidad y se multiplicarían registros.

El backend del dashboard debe aplicar autenticación y permisos por titular y rol. Sólo debe concederse acceso de lectura a las vistas analíticas necesarias y a datos agregados autorizados; la `key_persona` utilizada en los reportes sigue siendo un identificador pseudonimizado, no anónimo. No poner credenciales SQL en Google Charts ni en el navegador. No se da acceso a las vistas ETL del OLTP ni a las tablas de nombres para visualizadores de acceso general. El administrador puede configurar un usuario técnico con permisos mínimos. En producción corresponde validar permisos, cifrado, política de retención y pruebas de protección de datos de salud.

### Reportes del Data Mart (un solo archivo SQL)

`05_Reportes_DataMart.sql` crea los siguientes seis procedimientos. Cada uno se ejecuta por separado. Todos consultan únicamente tablas y vistas del Data Mart y se actualizan con la ejecución del ETL; no se consulta el OLTP desde los reportes. La primera columna `reporte` de cada conjunto identifica su contenido.

| Código | Nombre del reporte | Procedimiento | Resultados para el visualizador |
|---|---|---|---|
| R01 | Reporte de Seguimiento Preventivo | `bi.usp_ReporteSeguimientoPreventivo` | (A) resumen general de CAF, CCS y FCM; (B) tabla por participante con M1–M6, porcentajes y estados; (C) datos de comparación realizado/meta; (D) distribución de estados; (E) detalle de controles. |
| R02 | Reporte semanal de actividad física | `bi.usp_ReporteActividadFisicaSemanal` | M1, M2, CAF, estado y periodo. |
| R03 | Reporte semanal de contacto social | `bi.usp_ReporteContactoSocialSemanal` | M3, M4, CCS, estado y periodo. |
| R04 | Reporte mensual de controles cardiometabólicos | `bi.usp_ReporteControlesCardiometabolicosMensuales` | FCM por participante (M5/M6) y detalle de los cuatro factores. |
| R05 | Reporte de pendientes y controles no programados | `bi.usp_ReportePendientesSeguimiento` | Hábitos pendientes/sin meta y factores pendientes, sin meta o no programados; identifica pendientes en periodos cerrados y en curso (sin evaluar una fecha individual de vencimiento, que no es un nivel de Meta). |
| R06 | Reporte de evolución y comparación de segmentos | `bi.usp_ReporteEvolucionPreventiva` | Series por periodo/indicador y comparación por distrito, edad y sexo. |

Para mostrar el reporte principal del informe en SSMS:

```sql
USE prevencion_cognitiva_mart;
GO
EXEC bi.usp_ReporteSeguimientoPreventivo
    @departamento=N'La Libertad',
    @provincia=N'Trujillo',
    @ciudad=N'Trujillo';
```

Si no se indican fechas se usa la semana y el mes del último ETL completado. Se pueden seleccionar una semana (lunes) y un mes (primer día), de forma independiente. En los otros cinco procedimientos, `@desde` y `@hasta` filtran las fechas de inicio de periodo de manera inclusiva; si se omiten se obtiene el historial disponible. Se puede filtrar por `@key_persona` (la KEY dimensional del titular), país, departamento, provincia, ciudad, distrito, sexo y grupo de edad. El rango de 30–65 años se aplica de forma predeterminada.

En la aplicación, el backend obtiene la KEY del titular autenticado mediante `SELECT key_persona FROM [dbo].[DIM_PERSONA] WHERE id_persona = @id_persona`, con el ID autorizado por la sesión. Después puede ejecutar cada procedimiento mediante el driver `mssql` y mapear los conjuntos de resultados (`recordsets`) según el orden documentado. R01 devuelve cinco conjuntos, R04, R05 y R06 devuelven dos cada uno, R02 y R03 devuelven uno cada uno. Para R01, las tarjetas consumen el conjunto A, la tabla el conjunto B, los gráficos C y D, y el detalle de controles el E. Los reportes no añaden indicadores; sólo reorganizan las seis medidas y los tres KPI establecidos. El frontend no debe realizar un nuevo cálculo de los porcentajes ni reemplazar nulos por cero. Las tasas poblacionales usan sumas de medidas de registros evaluables y muestran aparte la cobertura y los pendientes.

Los filtros no sustituyen la autorización de acceso: el backend debe imponer la KEY dimensional del titular autenticado o el alcance agregado autorizado para un administrador. No se debe permitir que un titular consulte el historial de otra persona enviando una KEY diferente o dejando el parámetro vacío.

## 6. Decisiones, límites del origen y mantenimiento

- Los scripts respetan el material del profesor: MERGE en dimensiones, preparación por SELECT, JOIN, SUM y GROUP BY; hechos con recarga mediante DELETE + INSERT. La carga de dimensiones se confirma en el paso 03 y la carga de los dos hechos se confirma en una segunda transacción única en el paso 04. Si falla la recarga de los hechos, se revierten los DELETE e INSERT. Ejecutar los pasos en orden, sin cargas simultáneas y preferentemente fuera de horas de mayor uso para evitar cambios del OLTP durante la extracción. A mayor escala se deberá pasar a cargas incrementales y evaluar aislamiento consistente del origen, sin cambiar el modelo lógico.
- La dimensión Meta conserva los registros de las versiones semanales que el OLTP retiene; los hechos conservan la versión vigente de cada semana (no una instantánea de todas las modificaciones intra-semana). Los valores reemplazados quedan en el histórico de `meta_semanal`. Los controles mensuales no tienen versionado de criterios en la BD transaccional; si se edita un criterio se refleja el estado actual y no se puede reconstruir una historia de cambios que el origen no guardó.
- El OLTP no tiene histórico de residencia, nombres, estado o tipo de seguimiento para reconstruirlos al cierre pasado; se reflejan los atributos actuales de persona y ubicación, con edad calculada a la fecha del periodo. Si se requiere residencia histórica, la aplicación tendrá que conservar sus cambios. La ciudad forma parte de `ubicacion` y el piloto se puede filtrar por departamento, provincia, ciudad y distrito.
- La población analítica se limita a personas de 30 a 65 años al corte y excluye las cuentas con rol `ADMIN`. Quien está fuera del rango puede registrarse y usar la aplicación, pero el ETL no genera filas para esa persona en los hechos; su `DIM_PERSONA` queda con `FUERA_RANGO`. Así los reportes no mezclan población fuera del piloto ni cuentas de gestión.
- `fecha_corte` usa la zona de Lima. El paso 03 actualiza el calendario hasta el día actual; el paso 04 utiliza ese día y exige que el calendario esté actualizado. Los reportes y validaciones recuperan la fecha de corte de los hechos ya cargados; si están vacíos, la obtienen del calendario. No se almacena un historial separado de ejecuciones.
- `cuenta_rol`, alertas, recordatorios, logros, puntajes y simulaciones no alimentan estos KPI. No se añade dimensión de cuidador, personal o rol. La clasificación de cumplimiento no mide demencia ni probabilidad clínica de deterioro cognitivo.
- Los documentos y el código recibido son de referencia; este paquete no los modifica. Los scripts deben probarse por primera vez contra la propia instancia SQL Server 2022, con la base definitiva poblada. Los valores de prueba son ficticios, sin datos personales.