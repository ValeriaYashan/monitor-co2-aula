# Guía docente

Propuesta de proyecto integrador para secundaria, en espacios de tecnología, informática o robótica. Los estudiantes construyen un dispositivo que mide el CO2 del aula, lo muestran en un semáforo y en un panel web, miden varias aulas durante una o dos semanas y presentan a la dirección una propuesta de mejora basada en evidencia.

La duración sugerida es de diez clases de 80 minutos, más el tiempo de medición, que corre en paralelo a otras actividades. Es una estimación orientativa: dependiendo del nivel previo del grupo y del acceso a la impresora 3D, algunas etapas se acortan o se reparten en más clases. Se trabaja en equipos de tres o cuatro estudiantes con roles rotativos (hardware, programación, diseño y comunicación).

## Qué aprenden

Conectar un sensor digital a un microcontrolador y leer sus datos, programar un firmware con lógica de decisión (el semáforo), registrar y analizar datos reales, diseñar la interfaz de un panel pensando en quien lo va a usar, usar herramientas de IA para programar con criterio y verificación, diseñar y fabricar una pieza 3D, y comunicar resultados con argumentos y datos, parte de ellos en inglés.

## Competencias de la escuela

| Competencia | Dónde se trabaja |
|-------------|------------------|
| Creatividad | Diseño de la carcasa y del panel, propuestas de mejora para la escuela |
| Comunicación | Informe final, presentación a la dirección, interfaz y resumen en inglés |
| Pensamiento crítico | Verificación del código generado por IA, límites del sensor, interpretación de los datos |
| Carácter | Persistencia en la depuración, honestidad al informar errores y resultados que no confirman la hipótesis |
| Colaboración | Roles rotativos, revisión entre pares del código y del diseño |
| Ciudadanía | Medir un espacio compartido, cuidar la salud común y proponer cambios con evidencia |

## Etapas

| Clase | Etapa | Actividad | Evidencia para el seguimiento |
|-------|-------|-----------|-------------------------------|
| 1 | El problema | Qué es el CO2, por qué se usa como indicador de ventilación, qué hipótesis tienen sobre su aula | Hipótesis escrita por equipo |
| 2 | Electrónica | Conectar el SCD40 y los LEDs según `docs/cableado.md` | Circuito funcionando y esquema dibujado por el equipo |
| 3 | Firmware | Cargar el programa, leer el monitor serie, modificar umbrales y probar el semáforo | Cambio propio al firmware, explicado en la bitácora |
| 4 | Diseño UX | Entrevistar a posibles usuarios (otros estudiantes, docentes), bocetar el panel en papel o en una herramienta de prototipado | Boceto y notas de las entrevistas |
| 5 | Panel con IA | Construir o adaptar `panel/` usando IA, siguiendo el protocolo de uso responsable | Registro de prompts completo (`docs/registro_prompts_plantilla.md`) |
| 6 | Prueba de usabilidad | Cada equipo prueba su panel con tres personas ajenas al grupo y registra qué les costó | Informe breve con hallazgos y cambios |
| 7 | Fabricación 3D | Ajustar parámetros de `caja/caja.scad`, exportar e imprimir | Pieza impresa y parámetros cambiados |
| 8 | Medición | Instalar los dispositivos en distintas aulas, previo acuerdo con los docentes de cada una, y registrar durante una o dos semanas | Archivos CSV por aula |
| 9 | Análisis | Correr `software/analizar.py`, interpretar curvas y tiempos sobre el umbral, discutir límites del sensor | Informe con gráfico, tabla y conclusiones |
| 10 | Propuesta y cierre | Presentación a la dirección con datos y una propuesta concreta, más reflexión individual sobre el proceso | Presentación y autoevaluación |

## Uso responsable de IA (vibe coding con criterio)

La IA es una herramienta legítima en este proyecto, y precisamente por eso se enseña a usarla bien. Cada equipo sigue cinco reglas. Escribir primero, con palabras propias, qué se quiere lograr antes de pedirlo. Registrar los prompts y qué devolvió la IA. Leer y poder explicar el código antes de ejecutarlo. Probar el resultado con datos de respuesta conocida, por ejemplo un CSV de tres filas cuyos valores se pueden calcular a mano. Y no pegar nunca contraseñas, claves ni datos personales en una herramienta de IA.

Una actividad que funciona bien es pedirle a la IA el cálculo del tiempo sobre el umbral y comparar su resultado con el de `analizar.py` y con un cálculo manual. Casi siempre aparece una diferencia de criterio (qué hacer con los cortes entre días, cómo tratar el último intervalo), y esa discusión es el aprendizaje.

## Ética de datos y ciudadanía

El dispositivo mide aire, no personas, y no registra datos personales. Aun así, medir el aula de otro docente requiere su consentimiento previo y que se le comuniquen los resultados con respeto, como información para mejorar y no como una evaluación de su trabajo. La propuesta final debe distinguir lo que los datos muestran de lo que no pueden afirmar, por ejemplo que una aula supere el umbral no dice por sí sola cuál es la causa.

Los umbrales de 800 y 1000 ppm son valores de referencia que se usan en guías de ventilación, y que el curso puede discutir. Conviene que el equipo cite la fuente que adopte y verifique su vigencia.

## Inglés

La interfaz del panel ya es bilingüe. Se sugiere que cada equipo prepare en inglés el resumen del informe y una parte de la presentación, con un glosario básico: sensor, reading, threshold, ventilation, dashboard, firmware, prototype, usability test.

## Seguimiento y evaluación

Cada estudiante lleva una bitácora individual donde anota por clase qué hizo, qué intentó que no funcionó y qué aprendió; esa bitácora, junto con las evidencias de la tabla de etapas y la rúbrica de `docs/rubrica.md`, permite documentar el progreso de cada uno y no solo el resultado del equipo. La rúbrica describe niveles de desempeño; la conversión a calificaciones queda a cargo de la institución.

## Adaptaciones

Para grupos con poca experiencia, se entrega el firmware ya cargado y las etapas 3 y 5 se reducen a modificar parámetros. Para grupos avanzados, se puede pedir agregar alertas por Wi-Fi, comparar contra un segundo sensor o rediseñar la carcasa para otra placa.

## Seguridad en el taller

El circuito trabaja a 3,3 V alimentado por USB. La impresora 3D debe operarse con supervisión docente, con atención a las superficies calientes y a la ventilación del lugar.
