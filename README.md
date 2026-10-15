# GymPro

App de entrenamiento (PWA) en React + TypeScript + Vite. Todo se guarda en el dispositivo:
no hay backend ni cuentas.

## Desarrollo

```bash
npm install
npm run dev      # servidor local
npm run build    # tsc -b + vite build
npm run lint
```

## Ilustraciones de los ejercicios

Los dibujos salen de [Workout Guide](https://bryllim.github.io/workout-guide/) de Bryl Lim
(**CC BY-SA 4.0**, con parte de las poses derivadas de
[Everkinetic](https://github.com/everkinetic/data), también CC BY-SA 4.0). La atribución
está a la vista en Ajustes → Créditos, como pide la licencia.

De cada uno de los 302 ejercicios del catálogo copiamos dos frames (inicio y final del
movimiento) a `public/exercise-frames/`, redimensionados a 256 px. La app los alterna para
mostrar el movimiento, así que **no depende de los GIFs remotos de ExerciseDB ni de la API
de wger** y funciona sin conexión.

Para regenerarlos:

```bash
npm i --no-save @bryllim/workout-guide   # el paquete pesa 34 MB, no queda como dependencia
node scripts/sync-exercise-frames.mjs
```

El script copia los frames y regenera `src/data/exerciseFrames.ts` (mapa de ejercicio base
→ dibujo, y el catálogo completo que se usa para adivinar el dibujo de los ejercicios que
crea el usuario).

## Ejercicios propios

Se puede armar una rutina escribiendo sólo el nombre del ejercicio:

- en el detalle de la rutina, campo *"…o escribí el nombre y listo"*;
- en el buscador de ejercicios, cuando lo que se escribe no existe aparece
  *"Crear y agregar"*.

A partir del nombre (`src/utils/exerciseMatch.ts`) se deducen grupo muscular,
equipamiento y dibujo, con un diccionario castellano → inglés sobre el catálogo. Lo que se
crea así es un ejercicio como cualquier otro: entra en el historial, en los récords y en
las estadísticas. Se puede corregir después en Rutinas → *Mis ejercicios* (tocando la
fila), sin perder el historial, porque el id no cambia.

## Ejercicios por tiempo

Un ejercicio puede registrarse por tiempo en vez de kg × reps (`trackingType:
'duration'` en `src/data/exercises.ts`). La unidad la define `durationUnit`:
minutos para el cardio (**Cinta** y **Cinta inclinada**, bicicleta) y segundos
para los isométricos (plancha, plancha lateral, sentadilla contra la pared,
plancha alta tocando hombros).

En la rutina se configura el objetivo (`targetSeconds`), la pantalla de entreno
muestra un solo campo con la unidad al lado, y el historial suma el tiempo en
vez del volumen. Los ejercicios por tiempo no generan récords de peso.

## Progresión (doble progresión)

`src/utils/progression.ts` sugiere el peso de cada ejercicio: se mantiene el
peso hasta completar **todas** las series en el tope del rango de reps y recién
ahí se sube, volviendo al piso del rango. El salto sale del equipamiento (2,5 kg
barra, 2 kg mancuernas, 5 kg máquina/polea) y se redondea a lo que hay en un
gimnasio.

Es una sugerencia, no una imposición: aparece como un cartel arriba de cada
ejercicio en el entreno, con un botón *"Usar X kg"* que la aplica a las series
que faltan. Las series arrancan prellenadas con el **peso máximo de la última
vez** (sin calentamiento), así subir o no lo decide el usuario. Si pasaron más
de tres semanas desde la última vez, propone arrancar un 10 % abajo (con pesos
chicos, donde bajar un salto entero es demasiado, propone mantener con calma).
Al subir suma exactamente un salto (3 kg → 5 kg, no 6), y si la última vez las
reps quedaron muy lejos del piso del rango, propone bajar un salto.

## Cierre automático del entreno

Un entreno que queda abierto más de **4 horas** se cierra solo (al abrir la app,
al volver del segundo plano y una vez por minuto mientras está en uso): si tiene
series completadas se guarda con la duración capeada en 2 h, y si no tiene
ninguna se descarta. Así la sesión del día no se arrastra al día siguiente ni
queda viva para siempre porque el teléfono se guardó en el bolso.

Terminado a mano, el entreno guarda lo que duró de verdad. Cada serie guarda la
hora en que se tildó (`completedAt`), así se pueden medir los descansos reales.

Cada entreno guarda además **de dónde salió** (`Workout.origen`: en vivo,
cargado a mano desde la Agenda o pasándolo a otro día, o cerrado solo), y la
**semana del plan y la variante** con que se hizo (`semanaPrograma`,
`variante`). Los informes no usan la hora ni la duración de los cargados a mano
(la hora es inventada) ni de los cerrados solos (duración fija).

**Terminar** dice cuántas series se hicieron, qué ejercicios faltan y si quedaron
series con datos cargados sin tildar; esas se pueden guardar igual
(*Guardar también esas*). Lo prellenado de la vez anterior no cuenta como
cargado: sólo lo que se escribió en ese entreno (`ActiveWorkoutSet.editada`).

## Constancia

La Agenda muestra el mes con cada día entrenado pintado del color de su rutina, y
los días planificados con un aro. El color se guarda en la rutina al crearla
(`Routine.color`): borrar una rutina no recolorea a las demás.

Los días anteriores a empezar a usar la app no cuentan como faltas
(`inicioUso`, que se fija al terminar el onboarding; para quien ya la usaba, el
día del primer entreno).

## Datos guardados y backup

Todo vive en `localStorage` (`gympro-storage-v2`), con versión (`STORAGE_VERSION`)
y migraciones en `migrarEstado` (`src/store/useStore.ts`). El almacenamiento
(`src/utils/safeStorage.ts`) no reescribe lo que no cambió y, si el teléfono se
queda sin espacio, avisa en vez de cortar lo que se estaba haciendo.

- **Exportar** arma el archivo con lo que hay en memoria y **sin la API key** de
  Anthropic, que se queda sólo en el teléfono.
- **Importar** valida el archivo (forma mínima, entrenos y rutinas sanos, versión
  conocida) y guarda una copia de los datos anteriores: en Ajustes aparece
  *"Volver a los datos de antes del último import"*.
- Si una pantalla revienta, en vez de quedar en blanco aparece una salida para
  exportar los datos o volver a la copia anterior (`ErrorBoundary`).
- Borrar un ejercicio propio lo **archiva**: deja de ofrecerse, pero el historial,
  los récords y Progreso lo siguen mostrando. Tiene *Deshacer*, y crearlo de nuevo
  con el mismo nombre lo recupera con su historial.

## Plan de Milena

Las tres rutinas del plan de septiembre (`src/data/mileRoutines.ts`) vienen
cargadas desde el primer arranque, repartidas en la semana (lunes piernas,
miércoles brazos, viernes full body). Si ya usabas la app, el botón *"Cargar
plan de Mile"* en Rutinas las agrega.

Cada rutina está armada en bloques (circuito de entrada, principal, tabata),
con la superserie del full body marcada. Las series y reps de base son las de
las semanas 1-2-3; las de las semanas 4-5-6 van en `alt` y se eligen con el
selector *Semanas 1-3 / 4-6* de la rutina, que cambia también lo que se carga
en el entreno. Los descansos y las aclaraciones ("por pierna") quedan en la
nota. Las rutinas guardadas antes de esto se completan solas al abrir la app
(`completarPlanMile`).

Cualquier rutina puede usar lo mismo: en modo edición, el menú ⋯ de cada
ejercicio define su bloque y lo une en superserie con el siguiente, y con
*Semanas 4-6* elegido se editan las series de ese bloque.

**Modo bloque en el entreno** (`src/utils/bloques.ts`). El entreno muestra el
título de cada bloque y la nota de cada ejercicio en ámbar. Un bloque cuyo
nombre dice "circuito" o "rondas", y los ejercicios seguidos de una superserie,
van en una sola tarjeta por rondas: la próxima serie alterna A1 → B1 → C1 →
A2…, entre ejercicios de la ronda no se descansa y el descanso arranca solo al
cerrarla (con el tiempo de la nota, o el de siempre). Un bloque que dice
"tabata" se hace con un cronómetro de intervalos a pantalla completa: lee
trabajo, descanso y rondas del nombre (`Tabata 20" / 10" · 4 rondas`; si no,
20 / 10 / 8), hace cada ejercicio por turno en cada ronda y, al terminar o al
cerrarlo con alguna ronda hecha, tilda las series de esas rondas. Una rutina
sin bloques ni superseries se ve igual que siempre.

**Semana del plan.** Inicio pregunta una vez en qué semana estás; con eso
muestra *Semana N de 6* y en la semana 4 pasa solo todas las rutinas a
Semanas 4-6 (`src/utils/program.ts`). Pasada la 6, pregunta si arrancás de
nuevo; *Terminar el plan* vuelve las rutinas a Semanas 1-3, y desde Ajustes se
puede retomar. Un cambio manual del selector no se pisa: sólo se aplica cuando
el plan cambia de bloque. El domingo la tarjeta ya muestra la semana que arranca
al otro día, y la semana que se elige ese día es la que viene. Reiniciar o terminar
el plan guarda el ciclo anterior en `ciclosPrograma`, para poder ver su
informe después.

**Plan en orden.** La semana tipo dice qué días se entrena y en qué orden van
las rutinas, pero no ata una rutina a un día: toca la siguiente a la última que
hiciste (`src/utils/planOrder.ts`). Si faltaste el miércoles, el viernes te
espera brazos, y el calendario corre los días que vienen.

**Descanso por ejercicio.** El temporizador lee el descanso de la nota
("descanso 2 min", "descanso 1:30"; `src/utils/restFromNote.ts`). Elegir otro
tiempo durante el descanso vale para ese ejercicio el resto del entreno.

## Informes

Los cálculos son puros y tienen tests (`src/utils/cycleReport.ts`,
`periodSummary.ts`, `yearReview.ts`, `informes.ts`); ninguno usa 1RM.

- **Fin de ciclo.** Pasada la semana 6, la tarjeta del plan ofrece *Ver el
  informe*: asistencia por semana, récords y, por ejercicio, la mejor serie del
  principio contra la del final. Como en la semana 4 cambian las reps, la
  comparación limpia es dentro de cada bloque (S1→S3 y S4→S6). Los ciclos
  anteriores y el que está en curso se abren desde Progreso → Resumen → *Ciclos*.
- **Resumen del mes.** Progreso → Resumen muestra entrenos, series, horas y
  récords del mes contra el mes anterior o el mismo mes del año pasado. El mes
  en curso se compara contra los mismos días del otro. Las horas no cuentan los
  entrenos cargados a mano ni los cerrados solos. Del 1 al 7 de cada mes, Inicio
  ofrece el resumen del mes que terminó.
- **Tu año en el gym.** Tarjetas estilo historia con el año calendario; el
  primer año arranca el día que empezaste a usar la app (`inicioUso`). Aparece
  en Inicio del 1 de diciembre al 15 de enero si hay al menos 8 entrenos, y
  siempre desde Progreso → Resumen. Cada tarjeta se puede compartir como imagen.

## Diseño

Los colores, la escala tipográfica (11/12/13/15/17/22/26/32) y los radios
(8/12/16/24) están en `design-tokens.js`: de ahí salen las clases de Tailwind,
las variables CSS (`--bg`, `--acc`, `--mute`…) y `S`/`T`/`R` de
`src/theme.ts`. Cada color dice una sola cosa: coral es acción, ámbar es récord,
verde es hecho, rojo es error. El texto de tercer nivel va en `mute` (`faint`
sólo para trazos), y sobre coral el texto va oscuro (`onAcc`). Los colores del
cronómetro del tabata están aparte, en `tabata` (`S.tabata`), para cambiarlos
en un solo lugar.

## Iconos

```bash
node scripts/generate-icons.mjs
```

Genera favicon, iconos PWA (incluido el maskable), el `apple-touch-icon.png` de 180 px que
usa iOS al agregar a pantalla de inicio, y los mipmaps del TWA de Android.

## Documentación

- `docs/ideas-opengym.md` — relevamiento de openGym y qué conviene implementar.
- `docs/evidencia-ejercicios.md`, `docs/auditoria-gifs.md` — notas previas.
