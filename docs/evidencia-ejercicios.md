# Evidencia detrás de las instrucciones y los tips

Este documento es la fuente de las instrucciones, los tips y las dosis que la app
muestra en cada ejercicio (`src/data/exerciseDetails.ts`). La idea es que cada
recomendación se pueda rastrear hasta un estudio, y que cuando algo cambie en la
literatura se sepa qué tocar.

Criterio de jerarquía: primero meta-análisis y revisiones sistemáticas, después
ensayos controlados (mejor si son intra-sujeto, una pierna/brazo contra el otro,
que controlan la variabilidad individual), y recién al final estudios de EMG. La
activación medida por EMG **no predice bien** el crecimiento: el propio ensayo de
hip thrust contra sentadilla lo muestra, con más activación glútea en el hip
thrust y crecimiento parecido en los dos grupos.

---

## 1. Principios generales

### Rango de movimiento y longitud muscular

Entrenar en posiciones donde el músculo está estirado es lo que más consistentemente
aparece como ventaja en la literatura reciente. Un meta-análisis de 2025 encontró
mayor hipertrofia entrenando a longitudes largas frente a cortas (ES = 0,283;
p = 0,036), y las revisiones sobre parciales en posición estirada reportan
resultados iguales o mejores que el rango completo.

Consecuencias prácticas que están en la app:
- Si hay que acortar el rango por fatiga, quedarse con la mitad estirada.
- Los ejercicios que ponen al músculo en estiramiento (curl inclinado, extensión
  overhead, curl sentado, gemelo de pie) tienen prioridad sobre sus alternativas.

Fuentes: [meta-análisis longitud larga vs corta (Ulster, 2025)](https://pure.ulster.ac.uk/en/publications/muscle-hypertrophy-from-partial-repetition-at-long-vs-short-muscl/) ·
[parciales estirados vs ROM completo (PeerJ, 2025)](https://peerj.com/articles/18904/) ·
[Pedrosa et al., 2022 — parciales a longitudes largas](https://onlinelibrary.wiley.com/doi/10.1080/17461391.2021.1927199)

### Cercanía al fallo

Robinson et al. (2024) modelaron la proximidad al fallo como variable continua
sobre 55 estudios de hipertrofia y 67 de fuerza: **la hipertrofia mejora cuanto
más cerca del fallo se termina la serie**, mientras que la fuerza es indiferente
en un rango amplio de RIR.

Por eso las dosis de la app usan 0-2 reps en reserva en compuestos y fallo o casi
en aislamientos y máquinas, donde llegar al fallo es seguro.

Fuente: [Robinson et al., meta-regresiones de proximidad al fallo](https://sportrxiv.org/index.php/server/preprint/view/295)

### Volumen y frecuencia

Pelland et al. (2024) encontraron una relación dosis-respuesta entre volumen
semanal e hipertrofia con rendimientos decrecientes, y para fuerza una meseta
funcional más marcada. La frecuencia por sí sola tiene efectos consistentes en
fuerza pero no tanto en hipertrofia: lo que importa es el total semanal.

Referencia práctica: ~10-20 series semanales por grupo muscular, repartidas en 2+
sesiones para que cada una no sea interminable.

Fuente: [Pelland et al., 2024 — dosis-respuesta](https://link.springer.com/article/10.1007/s40279-025-02344-w)

### Descanso entre series

Schoenfeld et al. (2016) mostraron más fuerza e hipertrofia con 3 minutos que con
1 en entrenados. Meta-análisis más recientes matizan: el salto grande está entre
menos de 60 s y más de 60 s, y arriba de eso las diferencias son chicas.

En la app: 2-3 min en compuestos pesados, 1-2 min en accesorios, 1 min en
aislamientos livianos.

Fuentes: [Schoenfeld et al., 2016](https://brookbushinstitute.com/articles/longer-interset-rest-periods-enhance-muscle-strength-hypertrophy-resistance-trained-men) ·
[meta-análisis bayesiano de descansos (2024)](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC11349676/)

### Tempo

Entre 0,5 y 8 segundos por repetición los resultados son equivalentes; por encima
de 10 s por rep la hipertrofia empeora. O sea: control sí, súper-lento no.

Fuente: [Schoenfeld et al. — duración de la repetición](https://pubmed.ncbi.nlm.nih.gov/25601394/)

### Máquinas vs peso libre

El meta-análisis de Haugen et al. (2023), con 13 estudios y 1016 participantes,
**no encontró diferencias en hipertrofia** entre máquinas y peso libre. Las
diferencias aparecen en fuerza y son específicas de la modalidad en que se
entrena y se testea.

Por eso las variantes en máquina de la app no se presentan como "la opción fácil"
sino como una forma válida de acumular volumen con menos riesgo.

Fuente: [Haugen et al., 2023](https://link.springer.com/article/10.1186/s13102-023-00713-4)

---

## 2. Hallazgos que cambian la selección de ejercicios

Estos son los casos donde la evidencia no dice "da igual", sino que hay una
opción claramente mejor. Son los que más pesan en los tips de la app.

### Tríceps: overhead le gana a pushdown

Maeo et al. (2023), 21 participantes, 12 semanas, un brazo con cada variante: el
brazo que entrenó con el codo por encima de la cabeza creció **~1,4 veces más**
que el que hizo pushdown (p < 0,001). La porción larga cruza el hombro, así que
solo se estira con el brazo arriba.

Aplicado en `triceps-01` y `triceps-04`.

Fuente: [Maeo et al., European Journal of Sport Science, 2023](https://onlinelibrary.wiley.com/doi/10.1080/17461391.2022.2100279)

### Isquiotibiales: curl sentado le gana a curl acostado

Maeo et al. (2021), mismo diseño intra-sujeto a 12 semanas: el curl sentado
(cadera flexionada, isquio estirado) produjo más crecimiento en semimembranoso,
semitendinoso y porción larga del bíceps femoral. En la porción corta —la única
que no cruza la cadera— no hubo diferencia, que es exactamente lo que predice el
mecanismo.

Aplicado en `piernas-12` (prioridad) y `piernas-05` (complemento).

Fuente: [Maeo et al., 2021](https://www.researchgate.net/publication/344445943_Greater_Hamstrings_Muscle_Hypertrophy_but_Similar_Damage_Protection_after_Training_at_Long_versus_Short_Muscle_Lengths)

### Gemelos: de pie le gana a sentado

Kinoshita et al. (2023), 12 semanas, una pierna cada variante: gastrocnemio
lateral +12,4% de pie contra +1,7% sentado, y medial +9,2% contra +0,6%. En sóleo
no hubo diferencia (2,1% vs 2,9%), otra vez consistente con qué músculo cruza la
rodilla.

Aplicado en `piernas-11`.

Fuente: [Kinoshita et al., Frontiers in Physiology, 2023](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC10753835/)

### Bíceps: curl inclinado y predicador hacen cosas distintas

Un ensayo de 2025 comparó las dos variantes: el curl inclinado (hombro extendido,
bíceps estirado) generó más crecimiento en la parte **proximal** del brazo, y el
predicador más en la **distal**. No es que uno gane: conviene tener los dos.

Aplicado en `biceps-01` y `biceps-02`.

Fuente: [Distinct muscle growth after preacher and incline curls (2025)](https://pubmed.ncbi.nlm.nih.gov/39809454/)

### Glúteos: hip thrust y sentadilla empatan

Plotkin et al. (2023), 9 semanas con resonancia magnética: el crecimiento glúteo
fue **similar** entre hip thrust y sentadilla, aunque el hip thrust mostró más
activación EMG en todos los sitios medidos. La sentadilla además creció más
cuádriceps y aductores.

Aplicado en `piernas-10` y `gluteos-01`: se presentan como complementarios, no
como rivales.

Fuente: [Plotkin et al., 2023](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC10593473/)

---

## 3. Técnica por patrón de movimiento

### Press de banca

Un agarre mayor a 1,5 veces el ancho biacromial se asocia a más riesgo de hombro
(inestabilidad anterior, osteólisis distal de clavícula, rotura de pectoral).
Reducirlo a ≤1,5 no cambia el reclutamiento muscular y afecta la fuerza máxima en torno a
un 5%. Los codos muy abiertos activan algo más la porción esternocostal pero
dejan el hombro en posición vulnerable.

Fuentes: [efectos del ancho de agarre](https://www.researchgate.net/publication/232096734_The_Affect_of_Grip_Width_on_Bench_Press_Performance_and_Risk_of_Injury) ·
[cargas sobre el hombro según la técnica (Frontiers, 2024)](https://www.frontiersin.org/journals/physiology/articles/10.3389/fphys.2024.1393235/full)

### Sentadilla

La profundidad favorece al cuádriceps solo marginalmente cuando el volumen está
igualado, pero sí marca diferencia en glúteo y aductores. Conclusión práctica:
bajar todo lo que la cadera permita sin redondear, sin obsesionarse si un día no
llega tan abajo.

Fuentes: [revisión sobre profundidad y crecimiento](https://www.strongerbyscience.com/squat-depth-growth/) ·
[Enes et al., 2024](https://onlinelibrary.wiley.com/doi/10.1002/ejsc.12042)

### Jalones y remos

El agarre prono activa más el dorsal que el supino, y el ancho de agarre casi no
cambia la activación. Un detalle de técnica que sí importa: **no** hay que fijar
los omóplatos abajo y atrás desde el arranque, porque impide el estiramiento del
dorsal en la parte alta del recorrido.

Fuentes: [EMG del jalón según agarre y orientación](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC12452428/) ·
[cues de movimiento escapular (ACE)](https://www.acefitness.org/certifiednewsarticle/2384/correct-cues-for-scapular-motion/)

### Elevaciones laterales

Mancuerna y polea producen hipertrofia equivalente del deltoides lateral: el
análisis multivariado dio soporte "extremo" a la hipótesis nula. La rotación
interna (pulgar abajo) activa algo más pero deja el hombro en posición de riesgo.

Fuente: [Dumbbell vs cable lateral raises (2025)](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC12277279/)

### Peso muerto rumano

El punto de corte del rango es la cadera, no las manos: bajar más allá de donde
llega la cadera aumenta la flexión lumbar sin sumar trabajo del isquio.

Fuente: [Romanian deadlift — Physiopedia](https://www.physio-pedia.com/Romanian_deadlift)

### Sumo vs convencional

Sumo carga más cuádriceps y aductores; convencional más isquios y erectores.
Ninguna es mejor en términos generales.

Fuente: [análisis biomecánico de ambas variantes](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC12148905/)

### Abdominales

Los ejercicios dinámicos y cargables (crunch en polea, crunch en máquina) le
ganan a los isométricos para hacer crecer el recto abdominal, porque permiten
sobrecarga progresiva. La rueda abdominal y las elevaciones colgado aparecen
consistentemente entre las de mayor activación medida.

Fuentes: [EMG de ejercicios abdominales tradicionales y no tradicionales](https://pubmed.ncbi.nlm.nih.gov/16649890/) ·
[activación segmentaria por ecografía (2023)](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC10824285/)

---

## 4. Qué no dice la evidencia

Para no sobrevender lo anterior:

- **La mayoría de los estudios citados son cortos** (8-12 semanas) y varios en
  personas sin experiencia previa. Las diferencias entre ejercicios se achican
  cuando el volumen total y el esfuerzo están igualados.
- **El tamaño de muestra suele ser chico.** El estudio de tríceps que muestra un
  40% de diferencia tiene 21 participantes; el efecto es grande y significativo,
  pero conviene leerlo como "esta variante conviene", no como un número exacto.
- **Adherencia gana.** El ejercicio que se hace todas las semanas con buena
  técnica rinde más que el teóricamente óptimo que se abandona en un mes.
