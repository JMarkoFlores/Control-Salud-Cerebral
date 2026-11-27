# G1 — Data Mart y ETL

**Proyecto:** Prevención del deterioro cognitivo mediante hábitos diarios.  
**Motor:** SQL Server 2022 (T-SQL), administrado desde SSMS.  
**Origen:** `prevencion_cognitiva` (archivo definitivo `bd-transaccional.sql`, 17 tablas).  
**Destino propuesto:** `prevencion_cognitiva_mart` (una sola base dimensional).  
**Alcance:** autoseguimiento. La aplicación transaccional y los visualizadores no se modifican con estos scripts.

**Versión 4 (método del ingeniero):** el Data Mart tiene exactamente ocho tablas, seis dimensiones y dos hechos. Las vistas de preparación y las cargas ETL se ejecutan desde `prevencion_cognitiva`; el destino se referencia por `[prevencion_cognitiva_mart].[dbo].[Tabla]`. No se crea ninguna tabla técnica de auditoría ni procedimiento coordinador. Los indicadores y los reportes se conservan.

## 1. Orden de instalación y ejecución en SSMS

Conéctate a la misma instancia SQL Server que contiene el OLTP. Comprueba primero:

```sql
SELECT DB_ID(N'prevencion_cognitiva') AS id_bd_origen;
SELECT @@VERSION AS version_sql_server;
```

Si el primer valor es `NULL`, crea la base transaccional con el script definitivo de tu compañero (una sola vez). No vuelvas a ejecutar su script de creación de tablas si ya existe el OLTP. Comprueba que las tablas `persona`, `ubicacion`, `meta_semanal`, `sesion_fisica`, `contacto_social`, `confirmacion_diaria`, `control_programado` y `resultado_control` existan.

Abre y ejecuta los siete archivos uno por uno en SSMS. No continúes si aparece un error. Cada archivo comienza con `USE` de la base que corresponde.

| Orden | Archivo | Base desde donde se ejecuta | Finalidad |
|---|---|---|---|
| 01 | `01_Crear_DataMart.sql` | Data Mart (creación desde master) | Crear las seis dimensiones, dos hechos, relaciones e índices. |
| 02 | `02_Vistas_ETL.sql` | Transaccional | Preparar los datos de dimensiones y hechos mediante vistas dbo. |
| 03 | `03_ETL_Dimensiones.sql` | Transaccional | Ejecutar los seis MERGE directamente hacia el Data Mart. |
| 04 | `04_ETL_Hechos.sql` | Transaccional | Ejecutar DELETE + INSERT SELECT desde las vistas de hechos del OLTP. |
| 05 | `05_Vistas_Indicadores.sql` | Data Mart | Crear las cinco vistas analíticas de los tres KPI. |
| 06 | `06_Validacion.sql` | Transaccional | Conciliar las seis medidas y verificar los resultados. |
| 07 | `07_Reportes_DataMart.sql` | Data Mart | Crear los seis procedimientos de reporte. |

**Actualizaciones posteriores:** ejecutar 03 y después 04, en ese orden, desde la base transaccional. Ejecutar 06 para comprobar. No es necesario volver a crear tablas y vistas. No se instala un coordinador ni triggers. El paso 02 añade únicamente vistas al esquema dbo del OLTP, no altera las 17 tablas ni sus registros; los pasos 03 y 04 escriben exclusivamente en el Data Mart.

Después del paso 03 y antes del paso 04 puedes visualizar cómo quedarán los hechos, tal como se prepara una vista en los ejemplos del ingeniero:

```sql
USE [prevencion_cognitiva];
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

### Sólo si se instaló la versión anterior

Esta versión no elimina bases ni datos existentes. Si nunca se ejecutó la versión anterior, omite esta sección. Si ya se instaló, primero ejecuta y valida los siete scripts nuevos; la antigua tabla auxiliar no se elimina automáticamente. Tras hacer una copia de seguridad y comprobar que los objetos del esquema `etl` pertenecen al paquete anterior, puedes retirar **sólo los objetos antiguos** con estas instrucciones opcionales. No ejecutar en una instalación limpia.

```sql
USE [prevencion_cognitiva_mart];
GO
DROP PROCEDURE IF EXISTS [etl].[usp_ActualizarDataMart], [etl].[usp_CargarDimensiones], [etl].[usp_CargarHechos];
DROP VIEW IF EXISTS [etl].[v_DatosDimOrigenResultado], [etl].[v_DatosDimMeta], [etl].[v_DatosDimPersona], [etl].[v_DatosDimUbicacion], [etl].[v_DatosDimTipoSeguimiento], [etl].[v_InicioSeguimiento], [etl].[v_DatosHabitosDiarios], [etl].[v_DatosControlProgramado], [etl].[v_DatosResultados];
DROP TABLE IF EXISTS [etl].[AUDITORIA_CARGA];
GO
```

Esta limpieza no forma parte de los siete scripts nuevos; elimina la antigua información auxiliar, no las seis dimensiones ni los dos hechos. No vuelvas a ejecutar la creación incondicional del OLTP si éste ya existe. Los nombres de restricciones de una instalación anterior pueden permanecer sin alterar el modelo.

### Lectura de los scripts y funciones SQL utilizadas

La sintaxis que usa el profesor `[BaseDeDatos].[esquema].[tabla]` identifica la tabla sin depender de qué base se encuentre seleccionada en SSMS. Por ejemplo, `[prevencion_cognitiva].[dbo].[persona]` es el origen y `[prevencion_cognitiva_mart].[dbo].[DIM_PERSONA]` el destino. `dbo` es el esquema, no el nombre de la base de datos.

| Función o instrucción | Explicación corta | Ejemplo |
|---|---|---|
| `YEAR`, `MONTH`, `DAY` | Obtienen año, mes y día. | `YEAR('20261126')` → 2026. |
| `DATEADD` | Suma o resta una cantidad de días, meses, años, etc. No calcula una diferencia. | `DATEADD(DAY, 6, '20261123')` → 2026-11-29 (domingo). |
| `DATEPART` | Devuelve una parte numérica de la fecha. | `DATEPART(QUARTER, '20261126')` → 4. |
| `DATENAME` | Devuelve una parte de la fecha como texto, según el idioma. | Con `SET LANGUAGE Spanish`, `DATENAME(MONTH, '20261126')` → noviembre. |
| `SET DATEFIRST 1` | Indica que la semana comienza el lunes (1). | `DATEPART(WEEKDAY, '20261123')` → 1. |
| `DATEFROMPARTS` | Construye una fecha con año, mes y día. | `DATEFROMPARTS(2026, 11, 1)` → 2026-11-01. |
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
| D1 `DIM_PERSONA` | `persona.activo`, `fecha_nacimiento`, `fecha_alta`, `sexo`, `codigo_interno`, `nombres`, `apellidos`, `persona_id` | Estado, grupo de edad, fecha de nacimiento, fecha de alta, sexo, código interno, nombres, apellidos. Grupo de edad al corte: 30–39, 40–49, 50–59, 60–65 u otro. Las vistas recalculan edad al cierre de cada periodo. | `id_persona = persona.persona_id` |
| D2 `DIM_TIEMPO` | `persona.fecha_alta`, `meta_semanal.inicio_semana`, `sesion_fisica.fecha_hora`, `contacto_social.fecha_hora`, `confirmacion_diaria.fecha`, `control_programado.mes_periodo`, `resultado_control.fecha_medicion` | Calendario continuo desde el primer mes/semana de seguimiento al corte, año, trimestre, mes y nombre de mes, año y semana ISO, lunes, inicio del mes, día y día de semana. | `id_tiempo = fecha DATE` (valor natural derivado) |
| D3 `DIM_UBICACION` | `ubicacion.pais`, `departamento`, `provincia`, `distrito`, `ubicacion_id`; enlace `persona.ubicacion_id` | País, departamento, provincia, ciudad y distrito. Ciudad queda `NULL` porque no existe en el origen; no se debe equiparar provincia y ciudad. | `id_ubicacion = ubicacion.ubicacion_id` |
| D4 `DIM_TIPO_SEGUIMIENTO` | Dominio de `meta_semanal.habito`, `control_programado.tipo_control` y `resultado_control.tipo_control` | Periodicidad, tipo de seguimiento, tipo de control, unidad de medida. Dos categorías semanales y cuatro categorías de control mensual. | `id_tipo_seguimiento` (código normalizado del valor origen) |
| D5 `DIM_ORIGEN_RESULTADO` | `resultado_control.origen`, `validado`, `es_referencia` | Origen, estado de validación interna y marca de referencia. Categoría `SIN_RESULTADO` para el control sin resultado seleccionado. | `id_origen_resultado = ORIGEN\|validado\|es_referencia` |
| D6 `DIM_META` | `meta_semanal`: `meta_id`, `unidad`, `origen_meta`, `version_meta`, `vigente`, `inicio_semana`, `fecha_registro`; `control_programado`: `control_id`, `criterio_meta_texto`, `unidad`, `vigente`, `mes_periodo`, `fecha_prevista`, límites | Tipo, criterio, unidad, origen, versión, vigencia, fecha prevista, fecha de registro y límites de la meta cardiometabólica. El origen/versión clínicos no están registrados como tales en OLTP. El valor de meta semanal sigue siendo una medida en el hecho. | `id_meta = SEM:<meta_id>` o `CTRL:<control_id>`; `SIN_META` para ausencia. El prefijo evita colisiones entre tablas. |

D2, D4 y D5 no tienen una PK propia en una tabla de catálogo del OLTP; sus identificadores se derivan del contenido transaccional. Los IDs de origen no son autoincrementables en el Mart.

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

Se mantiene el informe `INFORME-FINAL-FINAL` y no se adoptan los rangos motivacionales (80%, 75%, etc.) de la versión actual del código de la aplicación.

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

## 5. Entrega a los compañeros responsables del dashboard

| Objeto | Uso |
|---|---|
| `bi.v_Indicadores` | Fuente unificada: código CAF/CCS/FCM, persona pseudonimizada, demografía, ubicación, periodo, numerador, denominador, porcentaje, estados y fecha de corte. |
| `bi.v_IndicadoresSemanales` | Detalle semanal y M1–M4, meta utilizada, semana ISO y año ISO. |
| `bi.v_ControlesDetalle` | Detalle mensual de los cuatro tipos de control, M5/M6, origen, fecha prevista y estado de los datos. |
| `bi.v_IndicadorFCM` | Indicador mensual por persona y coberturas de evaluación. |
| `bi.v_ResumenIndicadores` | Resumen por indicador y periodo de participantes en el rango 30–65 años en Perú. Excluye pendientes de la tasa agregada y muestra sus cantidades. |

Para otros segmentos, consultar `bi.v_Indicadores` filtrando por rango de edad, departamento, provincia y distrito. Agrupar por `codigo_indicador` y por el periodo correspondiente y dividir sumas de numeradores y denominadores de filas evaluables. La semana se identifica por su lunes (no por la llave numérica mínima/máxima); si se presenta por mes, se atribuye al mes de ese lunes. No unir directamente ambos hechos por persona y fecha, pues tienen distinta granularidad y se multiplicarían registros.

El backend del dashboard debe aplicar autenticación y permisos por titular y rol. Sólo debe concederse acceso de lectura a las vistas analíticas necesarias y a datos agregados autorizados; un código interno sigue siendo información pseudonimizada, no anónima. No poner credenciales SQL en Google Charts ni en el navegador. No se da acceso a las vistas ETL del OLTP ni a las tablas de nombres para visualizadores de acceso general. El administrador puede configurar un usuario técnico con permisos mínimos. En producción corresponde validar permisos, cifrado, política de retención y pruebas de protección de datos de salud.

### Reportes del Data Mart (un solo archivo SQL)

`07_Reportes_DataMart.sql` crea los siguientes seis procedimientos. Cada uno se ejecuta por separado. Todos consultan únicamente tablas y vistas del Data Mart y se actualizan con la ejecución del ETL; no se consulta el OLTP desde los reportes. La primera columna `reporte` de cada conjunto identifica su contenido.

| Código | Nombre del reporte | Procedimiento | Resultados para el visualizador |
|---|---|---|---|
| R01 | Reporte de Seguimiento Preventivo | `bi.usp_ReporteSeguimientoPreventivo` | (A) resumen general de CAF, CCS y FCM; (B) tabla por participante con M1–M6, porcentajes y estados; (C) datos de comparación realizado/meta; (D) distribución de estados; (E) detalle de controles. |
| R02 | Reporte semanal de actividad física | `bi.usp_ReporteActividadFisicaSemanal` | M1, M2, CAF, estado y periodo. |
| R03 | Reporte semanal de contacto social | `bi.usp_ReporteContactoSocialSemanal` | M3, M4, CCS, estado y periodo. |
| R04 | Reporte mensual de controles cardiometabólicos | `bi.usp_ReporteControlesCardiometabolicosMensuales` | FCM por participante (M5/M6) y detalle de los cuatro factores. |
| R05 | Reporte de pendientes y controles no programados | `bi.usp_ReportePendientesSeguimiento` | Hábitos pendientes/sin meta y factores pendientes, sin meta o no programados; identifica controles vencidos. |
| R06 | Reporte de evolución y comparación de segmentos | `bi.usp_ReporteEvolucionPreventiva` | Series por periodo/indicador y comparación por distrito, edad y sexo. |

Para mostrar el reporte principal del informe en SSMS:

```sql
USE prevencion_cognitiva_mart;
GO
EXEC bi.usp_ReporteSeguimientoPreventivo
    @departamento=N'La Libertad',
    @provincia=N'Trujillo';
```

Si no se indican fechas se usa la semana y el mes del último ETL completado. Se pueden seleccionar una semana (lunes) y un mes (primer día), de forma independiente. En los otros cinco procedimientos, `@desde` y `@hasta` filtran las fechas de inicio de periodo de manera inclusiva; si se omiten se obtiene el historial disponible. Se puede filtrar por código interno del titular, país, departamento, provincia, distrito, sexo y grupo de edad. El rango de 30–65 años se aplica de forma predeterminada.

En la aplicación, el backend puede ejecutar cada procedimiento mediante el driver `mssql` y mapear los conjuntos de resultados (`recordsets`) según el orden documentado. R01 devuelve cinco conjuntos, R04, R05 y R06 devuelven dos cada uno, R02 y R03 devuelven uno cada uno. Para R01, las tarjetas consumen el conjunto A, la tabla el conjunto B, los gráficos C y D, y el detalle de controles el E. Los reportes no añaden indicadores; sólo reorganizan las seis medidas y los tres KPI establecidos. El frontend no debe realizar un nuevo cálculo de los porcentajes ni reemplazar nulos por cero. Las tasas poblacionales usan sumas de medidas de registros evaluables y muestran aparte la cobertura y los pendientes.

Los filtros no sustituyen la autorización de acceso: el backend debe imponer el código del titular autenticado o el alcance agregado autorizado para un administrador. No se debe permitir que un titular consulte el historial de otra persona enviando un código diferente o dejando el parámetro vacío.

## 6. Decisiones, límites del origen y mantenimiento

- Los scripts respetan el material del profesor: MERGE en dimensiones, preparación por SELECT, JOIN, SUM y GROUP BY; hechos con recarga mediante DELETE + INSERT. La carga de dimensiones se confirma en el paso 03 y la carga de los dos hechos se confirma en una segunda transacción única en el paso 04. Si falla la recarga de los hechos, se revierten los DELETE e INSERT. Ejecutar los pasos en orden, sin cargas simultáneas y preferentemente fuera de horas de mayor uso para evitar cambios del OLTP durante la extracción. A mayor escala se deberá pasar a cargas incrementales y evaluar aislamiento consistente del origen, sin cambiar el modelo lógico.
- La dimensión Meta conserva los registros de las versiones semanales que el OLTP retiene; los hechos conservan la versión vigente de cada semana (no una instantánea de todas las modificaciones intra-semana). Los valores reemplazados quedan en el histórico de `meta_semanal`. Los controles mensuales no tienen versionado de criterios en la BD transaccional; si se edita un criterio se refleja el estado actual y no se puede reconstruir una historia de cambios que el origen no guardó.
- El OLTP no tiene histórico de residencia, nombres, estado o tipo de seguimiento para reconstruirlos al cierre pasado; se reflejan los atributos actuales de persona y ubicación, con edad calculada a la fecha del periodo. Si se requiere residencia histórica, la aplicación tendrá que conservar sus cambios. Ciudad queda sin dato mientras el origen no la incluya. El piloto de Trujillo se puede filtrar por departamento, provincia y los distritos definidos por el equipo.
- `fecha_corte` usa la zona de Lima. El paso 03 actualiza el calendario hasta el día actual; el paso 04 utiliza ese día y exige que el calendario esté actualizado. Los reportes y validaciones recuperan la fecha de corte de los hechos ya cargados; si están vacíos, la obtienen del calendario. No se almacena un historial separado de ejecuciones.
- `cuenta_rol`, alertas, recordatorios, logros, puntajes y simulaciones no alimentan estos KPI. No se añade dimensión de cuidador, personal o rol. La clasificación de cumplimiento no mide demencia ni probabilidad clínica de deterioro cognitivo.
- Los documentos y el código recibido son de referencia; este paquete no los modifica. Los scripts deben probarse por primera vez contra la propia instancia SQL Server 2022, con la base definitiva poblada. Los valores de prueba son ficticios, sin datos personales.
