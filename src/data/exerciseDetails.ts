export interface ExerciseDetail {
  nameArg?: string
  wgerId?: number
  instructions: string[]
  tips: string[]
  primaryMuscles: string[]
  secondaryMuscles: string[]
}

// Las instrucciones y los tips siguen la evidencia resumida en
// docs/evidencia-ejercicios.md, que cita los estudios detrás de cada
// recomendación. El último tip de cada ejercicio es la dosis sugerida.
export const exerciseDetails: Record<string, ExerciseDetail> = {
  // ─── PECHO ─────────────────────────────────────────────────────────────────
  'pecho-01': {
    nameArg: 'Press de Banco',
    wgerId: 192,
    instructions: [
      'Acostado, apoyá firme los pies y juntá los omóplatos contra el banco: esa base es la que te deja empujar fuerte.',
      'Agarre a ~1,5 veces el ancho de hombros. Más abierto que eso no recluta más pecho y sí carga más el hombro.',
      'Bajá la barra a la línea del esternón con los codos a unos 45-60° del torso, no abiertos a 90°.',
      'Tocá el pecho sin rebotar y empujá hasta extender los codos sin bloquearlos de golpe.',
    ],
    tips: [
      'Agarre hasta 1,5× el ancho biacromial: reduce el riesgo de hombro y la fuerza máxima cambia solo ~5%',
      'Bajar completo hasta el pecho: el rango completo rinde más que los parciales cortos',
      'Excéntrica de ~2 s, sin frenar 5 s de más: entre 0,5 y 8 s por rep el resultado es el mismo',
      'Dosis: 3-4 series de 5-10 reps, 2-3 min de descanso, dejando 0-2 reps en reserva',
    ],
    primaryMuscles: ['Pectoral mayor'],
    secondaryMuscles: ['Tríceps', 'Deltoides anterior'],
  },
  'pecho-02': {
    nameArg: 'Press Inclinado con Mancuernas',
    wgerId: 314,
    instructions: [
      'Banco a 30°. Pasados los 45° el trabajo se va al deltoides anterior y el pectoral pierde protagonismo.',
      'Arrancá con las mancuernas a la altura del pecho, codos a ~45° del torso.',
      'Bajá hasta sentir el estiramiento con los codos apenas por debajo de la línea del banco.',
      'Empujá hacia arriba y adentro sin chocar las mancuernas, manteniendo tensión arriba.',
    ],
    tips: [
      'La ventaja sobre la barra es el rango: aprovechá la parte estirada, que es la que más estimula',
      '30° de inclinación para pecho superior; más inclinado ya es press de hombro',
      'Dosis: 3-4 series de 8-12 reps, 2 min de descanso, 0-2 reps en reserva',
    ],
    primaryMuscles: ['Pectoral mayor (clavicular)'],
    secondaryMuscles: ['Deltoides anterior', 'Tríceps'],
  },
  'pecho-03': {
    nameArg: 'Press en Máquina',
    instructions: [
      'Ajustá el asiento para que las manijas queden a la altura del esternón, no del cuello.',
      'Espalda apoyada y omóplatos juntos contra el respaldo durante toda la serie.',
      'Empujá hasta casi extender los codos, sin bloquear ni despegar los hombros del respaldo.',
      'Volvé controlado hasta sentir el estiramiento, sin apoyar el peso entre repeticiones.',
    ],
    tips: [
      'En máquina crecés igual que con peso libre: la evidencia no encuentra diferencias en hipertrofia',
      'Al ser trayectoria fija podés ir más cerca del fallo con menos riesgo',
      'Dosis: 3 series de 8-15 reps, 1-2 min de descanso, 0-2 reps en reserva',
    ],
    primaryMuscles: ['Pectoral mayor'],
    secondaryMuscles: ['Tríceps', 'Deltoides anterior'],
  },
  'pecho-04': {
    nameArg: 'Cruce de Cables',
    instructions: [
      'Poleas altas, una manija en cada mano, un pie adelante y torso apenas inclinado.',
      'Codos fijos en una flexión leve: el movimiento pasa solo por el hombro.',
      'Cerrá los brazos hacia abajo y adelante, cruzando apenas las manos.',
      'Volvé lento y dejá que los brazos se abran hasta sentir el pectoral estirado.',
    ],
    tips: [
      'La ventaja del cable es la tensión constante, sobre todo en la posición estirada',
      'Con poleas altas el foco va al pectoral inferior; a la altura del pecho, al medio',
      'Dosis: 3 series de 12-20 reps, 1-2 min de descanso',
    ],
    primaryMuscles: ['Pectoral mayor', 'Pectoral menor'],
    secondaryMuscles: ['Deltoides anterior'],
  },
  'pecho-05': {
    nameArg: 'Aperturas con Mancuernas',
    wgerId: 119,
    instructions: [
      'Acostado en banco plano, mancuernas arriba del pecho con los codos apenas flexionados.',
      'Abrí los brazos en arco hasta que las manos queden a la altura del torso o un poco más abajo.',
      'Frená donde sentís el estiramiento del pectoral, sin dolor en la parte delantera del hombro.',
      'Cerrá el arco apretando el pecho, sin convertirlo en un press.',
    ],
    tips: [
      'La parte estirada es la que estimula: bajá con control 2-3 s y no rebotes',
      'Codos con ángulo fijo — si se abren y cierran, pasó a ser un press',
      'Dosis: 3 series de 10-15 reps con peso moderado, 1-2 min de descanso',
    ],
    primaryMuscles: ['Pectoral mayor'],
    secondaryMuscles: ['Deltoides anterior'],
  },
  'pecho-07': {
    nameArg: 'Flexiones',
    instructions: [
      'Manos un poco más anchas que los hombros, cuerpo en línea recta de la cabeza a los talones.',
      'Bajá hasta que el pecho quede a un puño del piso, codos a ~45°.',
      'Empujá hasta extender los codos y dejá que los omóplatos se separen arriba.',
      'Si te sobran reps, elevá los pies o agregá peso en la espalda antes de sumar repeticiones infinitas.',
    ],
    tips: [
      'Llevalas cerca del fallo: con peso corporal, series de 15+ solo sirven si terminás exigido',
      'Glúteos y abdomen activos — si la cadera cae, la serie deja de ser de pecho',
      'Dosis: 3-4 series a 0-2 reps del fallo, 1-2 min de descanso',
    ],
    primaryMuscles: ['Pectoral mayor'],
    secondaryMuscles: ['Tríceps', 'Deltoides anterior', 'Core'],
  },
  'pecho-08': {
    nameArg: 'Press Declinado',
    instructions: [
      'Banco en declive suave (15-30°), pies trabados y omóplatos juntos.',
      'Bajá la barra a la parte baja del pecho con los codos a ~45°.',
      'Tocá sin rebotar y empujá hasta extender los codos.',
      'Pedí ayuda para entrar y salir de la posición: en declive es incómodo soltar la barra.',
    ],
    tips: [
      'Buen complemento del banco plano, pero no lo reemplaza: el pectoral trabaja completo en ambos',
      'Rango algo más corto que en plano — no cargues de más solo porque levantás más',
      'Dosis: 3 series de 8-12 reps, 2 min de descanso',
    ],
    primaryMuscles: ['Pectoral inferior'],
    secondaryMuscles: ['Tríceps', 'Deltoides anterior'],
  },
  'pecho-09': {
    nameArg: 'Pec Deck',
    instructions: [
      'Ajustá el asiento para que las manijas queden a la altura del pecho, con los codos apenas por debajo del hombro.',
      'Juntá los brazos al frente sin encoger los hombros hacia las orejas.',
      'Apretá un segundo en el punto más cerrado.',
      'Abrí lento y aguantá el estiramiento antes de volver.',
    ],
    tips: [
      'Es el aislamiento más fácil de llevar al fallo con seguridad: aprovechalo al final de la sesión',
      'Regulá el asiento hasta que no sientas tirón en la parte delantera del hombro',
      'Dosis: 2-3 series de 12-20 reps, 1-2 min de descanso, llegando al fallo o muy cerca',
    ],
    primaryMuscles: ['Pectoral mayor'],
    secondaryMuscles: ['Deltoides anterior'],
  },
  // ─── ESPALDA ───────────────────────────────────────────────────────────────
  'espalda-01': {
    nameArg: 'Jalón al Pecho',
    wgerId: 122,
    instructions: [
      'Agarre prono (palmas al frente) a un ancho cómodo, apenas más que los hombros.',
      'Arrancá dejando que los hombros suban con el peso: el dorsal tiene que estirarse arriba.',
      'Tirá llevando los codos hacia las costillas y el esternón hacia la barra, sin echar el torso atrás.',
      'Bajá la barra hasta la clavícula y volvé controlado hasta la extensión completa.',
    ],
    tips: [
      'Agarre prono activa más el dorsal que el supino; el ancho casi no cambia nada',
      'No fijes los omóplatos abajo desde el arranque: perdés el estiramiento que más estimula',
      'Siempre adelante de la cabeza — atrás del cuello no aporta y castiga el hombro',
      'Dosis: 3-4 series de 8-12 reps, 2 min de descanso',
    ],
    primaryMuscles: ['Dorsal ancho'],
    secondaryMuscles: ['Bíceps', 'Romboides', 'Trapecio inferior'],
  },
  'espalda-02': {
    nameArg: 'Remo en Máquina',
    instructions: [
      'Pecho apoyado en el respaldo, asiento a una altura que te deje tirar a la línea del ombligo.',
      'Estirá los brazos al frente y dejá que los omóplatos se separen: ahí arranca el rango.',
      'Tirá con los codos pegados al torso hasta que las manos lleguen al abdomen.',
      'Volvé lento hasta la extensión completa, sin soltar la tensión.',
    ],
    tips: [
      'El pecho apoyado saca la espalda baja de la ecuación: podés ir más cerca del fallo',
      'Codos pegados al cuerpo apuntan al dorsal; codos abiertos, al trapecio medio y deltoides posterior',
      'Dosis: 3-4 series de 8-12 reps, 1-2 min de descanso',
    ],
    primaryMuscles: ['Dorsal ancho', 'Romboides', 'Trapecio medio'],
    secondaryMuscles: ['Bíceps', 'Deltoides posterior'],
  },
  'espalda-03': {
    nameArg: 'Remo con Mancuerna a Una Mano',
    instructions: [
      'Una rodilla y una mano en el banco, la espalda paralela al piso y neutra.',
      'Dejá que el brazo cuelgue estirado y el omóplato se separe: ahí empieza el rango.',
      'Tirá la mancuerna hacia la cadera con el codo cerca del torso, sin rotar la espalda.',
      'Bajá controlado hasta el estiramiento completo antes de la siguiente repetición.',
    ],
    tips: [
      'Unilateral: te deja más rango y corrige diferencias entre lados',
      'Si tenés que girar el torso para subir la mancuerna, el peso es demasiado',
      'Dosis: 3 series de 8-12 reps por lado, 1-2 min de descanso',
    ],
    primaryMuscles: ['Dorsal ancho'],
    secondaryMuscles: ['Bíceps', 'Romboides'],
  },
  'espalda-06': {
    nameArg: 'Remo en Cable',
    wgerId: 213,
    instructions: [
      'Sentado con las rodillas apenas flexionadas y el torso vertical.',
      'Estirá los brazos y dejá que los omóplatos se separen al frente.',
      'Tirá el mango al abdomen con los codos cerca del cuerpo, sin recostarte hacia atrás.',
      'Volvé lento hasta la extensión completa manteniendo el torso quieto.',
    ],
    tips: [
      'Es un tirón horizontal: pegale al dorsal y al trapecio medio con el codo cerca del torso',
      'El torso no acompaña — si se mece hacia atrás y adelante, bajá el peso',
      'Dosis: 3-4 series de 10-15 reps, 1-2 min de descanso',
    ],
    primaryMuscles: ['Dorsal ancho', 'Romboides'],
    secondaryMuscles: ['Bíceps', 'Trapecio medio'],
  },
  'espalda-07': {
    nameArg: 'Remo en T',
    instructions: [
      'Parado sobre la plataforma con las rodillas flexionadas y la cadera atrás, espalda neutra.',
      'Torso a unos 45°, brazos estirados y omóplatos sueltos abajo.',
      'Tirá la barra al abdomen con los codos cerca del cuerpo.',
      'Bajá controlado hasta la extensión completa sin redondear la espalda baja.',
    ],
    tips: [
      'Permite mucha carga: cuidá que el torso no suba con cada repetición',
      'Si la espalda baja se cansa antes que el dorsal, pasá a una versión con pecho apoyado',
      'Dosis: 3-4 series de 8-12 reps, 2 min de descanso',
    ],
    primaryMuscles: ['Dorsal ancho', 'Romboides', 'Trapecio medio'],
    secondaryMuscles: ['Bíceps', 'Erectores espinales'],
  },
  'espalda-09': {
    nameArg: 'Face Pulls',
    instructions: [
      'Polea a la altura de la cara con cuerda, un pie adelante para estabilizar.',
      'Tirá la cuerda hacia la frente separando las manos, codos altos a la altura de los hombros.',
      'Terminá con los antebrazos alineados con el cable y los omóplatos juntos.',
      'Volvé lento dejando que los hombros se estiren al frente.',
    ],
    tips: [
      'Peso liviano y muchas reps: es deltoides posterior y trapecio, no un remo pesado',
      'Codos a la altura de los hombros — si caen, pasa a ser un remo alto común',
      'Dosis: 3 series de 15-20 reps, 1 min de descanso',
    ],
    primaryMuscles: ['Deltoides posterior', 'Manguito rotador'],
    secondaryMuscles: ['Romboides', 'Trapecio medio'],
  },
  'espalda-10': {
    nameArg: 'Pullover con Mancuerna',
    instructions: [
      'Acostado en el banco, mancuerna sostenida con las dos manos sobre el pecho.',
      'Bajá el peso por detrás de la cabeza con los codos apenas flexionados y fijos.',
      'Llegá hasta donde el hombro te permita sin arquear la espalda baja.',
      'Volvé tirando con el dorsal hasta la vertical, sin pasar de largo.',
    ],
    tips: [
      'Trabaja el dorsal en máximo estiramiento: es su punto fuerte como ejercicio',
      'Costillas abajo y abdomen firme — el rango extra no puede salir de la espalda baja',
      'Dosis: 3 series de 10-15 reps, 1-2 min de descanso',
    ],
    primaryMuscles: ['Dorsal ancho'],
    secondaryMuscles: ['Pectoral mayor', 'Tríceps'],
  },
  // ─── HOMBROS ───────────────────────────────────────────────────────────────
  'hombros-01': {
    nameArg: 'Press de Hombros en Máquina',
    instructions: [
      'Asiento regulado para que las manijas queden a la altura de los hombros.',
      'Espalda apoyada y abdomen firme, sin arquear la zona lumbar.',
      'Empujá hasta casi extender los codos sin bloquear.',
      'Bajá controlado hasta que las manos queden a la altura de las orejas o un poco más abajo.',
    ],
    tips: [
      'La trayectoria fija te deja llevarlo cerca del fallo sin necesidad de ayuda',
      'Bajá hasta donde el hombro esté cómodo: forzar el rango acá no suma',
      'Dosis: 3-4 series de 8-12 reps, 2 min de descanso',
    ],
    primaryMuscles: ['Deltoides anterior', 'Deltoides medio'],
    secondaryMuscles: ['Tríceps', 'Trapecios'],
  },
  'hombros-02': {
    nameArg: 'Elevaciones Laterales',
    wgerId: 65,
    instructions: [
      'De pie, mancuernas a los costados y una inclinación mínima del torso hacia adelante.',
      'Subí los brazos hacia el costado hasta la altura de los hombros, codos apenas flexionados.',
      'Guiá el movimiento con el codo, no con la mano.',
      'Bajá lento hasta abajo del todo: la parte baja es donde el deltoide está más estirado.',
    ],
    tips: [
      'Con mancuerna o con polea crecés lo mismo: elegí la que te resulte más cómoda',
      'Evitá subir con el pulgar hacia abajo — activa un poco más pero castiga el hombro',
      'Sin impulso de cadera: es el aislamiento donde más se hace trampa',
      'Dosis: 3-4 series de 12-20 reps, 1 min de descanso, cerca del fallo',
    ],
    primaryMuscles: ['Deltoides medio'],
    secondaryMuscles: ['Trapecio superior'],
  },
  'hombros-03': {
    nameArg: 'Elevación Frontal',
    instructions: [
      'De pie, mancuernas al frente de los muslos con agarre neutro o prono.',
      'Subí los brazos al frente hasta la altura de los ojos, codos apenas flexionados.',
      'Sin balancear el torso ni arquear la espalda baja.',
      'Bajá controlado hasta abajo del todo.',
    ],
    tips: [
      'El deltoides anterior ya trabaja mucho en todos los press: es accesorio, no prioridad',
      'Peso moderado — si necesitás impulso, no está haciendo lo que buscás',
      'Dosis: 2-3 series de 12-15 reps, 1 min de descanso',
    ],
    primaryMuscles: ['Deltoides anterior'],
    secondaryMuscles: ['Trapecio', 'Pectoral mayor (clavicular)'],
  },
  'hombros-06': {
    nameArg: 'Pájaros (Deltoides Posterior)',
    wgerId: 78,
    instructions: [
      'Torso inclinado hacia adelante casi paralelo al piso, mancuernas colgando.',
      'Abrí los brazos hacia los costados llevando los codos hacia atrás y afuera.',
      'Frená a la altura de los hombros sin encogerlos hacia las orejas.',
      'Bajá lento hasta el estiramiento completo.',
    ],
    tips: [
      'El deltoides posterior responde mejor a reps altas y peso liviano que a cargas pesadas',
      'Si el trapecio se lleva el trabajo, bajá el peso y frená antes de encoger los hombros',
      'Dosis: 3 series de 15-20 reps, 1 min de descanso',
    ],
    primaryMuscles: ['Deltoides posterior'],
    secondaryMuscles: ['Romboides', 'Infraespinoso', 'Trapecio medio'],
  },
  // ─── BÍCEPS ────────────────────────────────────────────────────────────────
  'biceps-01': {
    nameArg: 'Curl Inclinado',
    instructions: [
      'Banco a 45-60°, espalda apoyada y brazos colgando por detrás de la línea del torso.',
      'Dejá los codos quietos atrás durante toda la serie: esa posición es la que estira el bíceps.',
      'Subí las mancuernas sin llevar los codos hacia adelante.',
      'Bajá lento hasta la extensión completa y aguantá un instante el estiramiento.',
    ],
    tips: [
      'Con el hombro extendido el bíceps trabaja estirado: crece más en la porción de arriba del brazo',
      'Si los codos se van adelante, perdiste justo lo que hace especial a este curl',
      'Dosis: 3 series de 8-12 reps, 1-2 min de descanso',
    ],
    primaryMuscles: ['Bíceps braquial (cabeza larga)'],
    secondaryMuscles: ['Braquial', 'Braquiorradial'],
  },
  'biceps-02': {
    nameArg: 'Curl en Banco Scott con Mancuernas',
    instructions: [
      'Ajustá el asiento para que la axila apoye en la parte alta del respaldo.',
      'Brazos completamente apoyados, muñecas neutras.',
      'Subí hasta la contracción sin despegar los codos del apoyo.',
      'Bajá lento hasta extender casi del todo: la parte baja es la más exigente.',
    ],
    tips: [
      'El predicador engrosa más la parte de abajo del brazo; el curl inclinado, la de arriba: son complementarios',
      'No extiendas de golpe al final — es donde más tirón se lleva el codo',
      'Dosis: 3 series de 8-12 reps, 1-2 min de descanso',
    ],
    primaryMuscles: ['Bíceps braquial'],
    secondaryMuscles: ['Braquial'],
  },
  'biceps-03': {
    nameArg: 'Curl con Barra en Cable',
    instructions: [
      'Polea baja con barra recta o EZ, parado a un paso del soporte.',
      'Codos pegados al torso y quietos.',
      'Subí la barra hasta la contracción completa.',
      'Bajá lento aguantando la tensión del cable hasta extender del todo.',
    ],
    tips: [
      'La polea mantiene tensión abajo, justo donde la barra la pierde',
      'Codos fijos: si se van hacia atrás entra el hombro y descarga el bíceps',
      'Dosis: 3 series de 10-15 reps, 1 min de descanso',
    ],
    primaryMuscles: ['Bíceps braquial'],
    secondaryMuscles: ['Braquial', 'Braquiorradial'],
  },
  'biceps-04': {
    nameArg: 'Curl con Barra EZ',
    instructions: [
      'De pie, barra EZ con agarre a la altura de los hombros en la zona angulada.',
      'Codos pegados al torso, abdomen firme y espalda neutra.',
      'Subí la barra sin mover los codos hacia adelante.',
      'Bajá controlado hasta extender los codos del todo.',
    ],
    tips: [
      'La barra EZ carga menos la muñeca que la recta con el mismo estímulo',
      'Sin balanceo de cadera: si necesitás impulso, bajá el peso',
      'Dosis: 3 series de 8-12 reps, 1-2 min de descanso',
    ],
    primaryMuscles: ['Bíceps braquial'],
    secondaryMuscles: ['Braquial', 'Braquiorradial'],
  },
  'biceps-05': {
    nameArg: 'Curl Predicador',
    wgerId: 73,
    instructions: [
      'Sentado en el banco predicador con una mancuerna, el brazo apoyado en la almohadilla.',
      'Bajá hasta extender casi del todo, controlando el último tramo.',
      'Subí hasta la contracción sin despegar el codo del apoyo.',
      'Hacé todas las reps de un brazo y recién ahí cambiá.',
    ],
    tips: [
      'Unilateral con mancuerna: te deja ver y corregir la diferencia entre brazos',
      'La bajada es la parte que más estimula acá — no la sueltes',
      'Dosis: 3 series de 10-12 reps por brazo, 1 min de descanso',
    ],
    primaryMuscles: ['Bíceps braquial (parte baja)'],
    secondaryMuscles: ['Braquial'],
  },
  'biceps-06': {
    nameArg: 'Curl Concentrado',
    instructions: [
      'Sentado, codo apoyado en la cara interna del muslo.',
      'Brazo estirado del todo abajo antes de arrancar.',
      'Subí la mancuerna hasta la contracción sin mover el codo del muslo.',
      'Bajá lento hasta la extensión completa.',
    ],
    tips: [
      'El apoyo elimina el impulso: es el curl más difícil de hacer mal',
      'Peso moderado y foco en la bajada',
      'Dosis: 2-3 series de 10-15 reps por brazo, 1 min de descanso',
    ],
    primaryMuscles: ['Bíceps braquial (pico)'],
    secondaryMuscles: ['Braquial'],
  },
  // ─── TRÍCEPS ───────────────────────────────────────────────────────────────
  'triceps-01': {
    nameArg: 'Extensión de Tríceps sobre la Cabeza',
    instructions: [
      'Sentado con respaldo, mancuerna sostenida con las dos manos por encima de la cabeza.',
      'Codos apuntando al techo y lo más cerca posible entre sí.',
      'Bajá el peso por detrás de la cabeza hasta sentir el estiramiento del tríceps.',
      'Extendé sin mover los codos de lugar.',
    ],
    tips: [
      'Con el brazo arriba la porción larga trabaja estirada: creció ~40% más que en pushdown en un estudio a 12 semanas',
      'Es el ejercicio de tríceps que más conviene tener sí o sí en la rutina',
      'Costillas abajo: si la espalda se arquea, el rango extra sale de ahí y no del tríceps',
      'Dosis: 3 series de 10-15 reps, 1-2 min de descanso',
    ],
    primaryMuscles: ['Tríceps (cabeza larga)'],
    secondaryMuscles: [],
  },
  'triceps-02': {
    nameArg: 'Extensión en Polea',
    instructions: [
      'Polea alta con cuerda o barra, un paso atrás y torso apenas inclinado.',
      'Codos pegados al torso y fijos durante toda la serie.',
      'Extendé hasta abajo separando las manos si usás cuerda.',
      'Volvé controlado hasta que el antebrazo pase la horizontal.',
    ],
    tips: [
      'Con el brazo al costado la porción larga trabaja acortada: sumale siempre un overhead',
      'Si los codos se despegan del torso, se transformó en un press',
      'Dosis: 3 series de 12-20 reps, 1 min de descanso, cerca del fallo',
    ],
    primaryMuscles: ['Tríceps'],
    secondaryMuscles: [],
  },
  'triceps-03': {
    nameArg: 'Press Francés (Skull Crusher)',
    wgerId: 67,
    instructions: [
      'Acostado con barra EZ, brazos verticales y codos apuntando al techo.',
      'Bajá la barra hacia la frente o apenas por detrás de la cabeza.',
      'Llevarla por detrás estira más la porción larga que frenar en la frente.',
      'Extendé sin dejar que los codos se abran hacia los costados.',
    ],
    tips: [
      'Bajar por detrás de la cabeza suma estiramiento sin cambiar de ejercicio',
      'Codos quietos: si se abren, el trabajo se reparte y el tríceps se lleva menos',
      'Dosis: 3 series de 10-12 reps, 1-2 min de descanso',
    ],
    primaryMuscles: ['Tríceps (cabeza larga)'],
    secondaryMuscles: [],
  },
  'triceps-04': {
    nameArg: 'Extensión de Tríceps sobre la Cabeza con Mancuerna',
    instructions: [
      'Sentado, una mancuerna en una mano por encima de la cabeza.',
      'La otra mano puede sostener el codo para que no se abra.',
      'Bajá por detrás de la cabeza hasta el estiramiento completo.',
      'Extendé sin mover el codo de posición.',
    ],
    tips: [
      'Mismo beneficio que el overhead a dos manos, con más rango y control por lado',
      'Sirve para emparejar brazos cuando uno rinde menos',
      'Dosis: 3 series de 10-15 reps por brazo, 1 min de descanso',
    ],
    primaryMuscles: ['Tríceps (cabeza larga)'],
    secondaryMuscles: [],
  },
  // ─── PIERNAS ───────────────────────────────────────────────────────────────
  'piernas-01': {
    nameArg: 'Sentadilla',
    wgerId: 222,
    instructions: [
      'Barra apoyada en el trapecio, pies al ancho de hombros con las puntas apenas afuera.',
      'Bajá controlando, llevando cadera y rodillas al mismo tiempo.',
      'Bajá al menos hasta que el muslo quede paralelo al piso, o más si la cadera te lo permite sin redondear.',
      'Subí empujando el piso, sin que la cadera se adelante al pecho.',
    ],
    tips: [
      'Más profundidad no cambia mucho el cuádriceps, pero sí suma en glúteo y aductores',
      'La rodilla puede pasar la punta del pie: es normal y no es peligroso',
      'Dosis: 3-4 series de 5-10 reps, 2-3 min de descanso',
    ],
    primaryMuscles: ['Cuádriceps', 'Glúteos'],
    secondaryMuscles: ['Isquiotibiales', 'Erectores espinales'],
  },
  'piernas-02': {
    nameArg: 'Sentadilla Frontal',
    instructions: [
      'Barra al frente sobre los deltoides, codos bien altos durante todo el movimiento.',
      'Pies al ancho de hombros, torso lo más vertical posible.',
      'Bajá hasta abajo manteniendo el pecho arriba.',
      'Subí sin dejar que los codos caigan: si caen, la barra se va adelante.',
    ],
    tips: [
      'Torso más vertical = más cuádriceps y menos carga en la espalda baja que en la sentadilla trasera',
      'Vas a mover menos peso que atrás: es esperable, no es un retroceso',
      'Dosis: 3-4 series de 6-10 reps, 2-3 min de descanso',
    ],
    primaryMuscles: ['Cuádriceps'],
    secondaryMuscles: ['Glúteos', 'Erectores espinales'],
  },
  'piernas-03': {
    nameArg: 'Prensa de Piernas',
    wgerId: 227,
    instructions: [
      'Pies al ancho de hombros en el centro de la plataforma.',
      'Bajá hasta donde la pelvis no se despegue del respaldo.',
      'Empujá con toda la planta del pie, sin bloquear las rodillas arriba.',
      'No te tomes de las rodillas: manos en las manijas.',
    ],
    tips: [
      'Si la cola se despega abajo, la espalda baja se lleva el golpe: ese es tu tope de rango',
      'Permite acercarte al fallo con seguridad, aprovechalo',
      'Dosis: 3-4 series de 8-15 reps, 2 min de descanso',
    ],
    primaryMuscles: ['Cuádriceps', 'Glúteos'],
    secondaryMuscles: ['Isquiotibiales'],
  },
  'piernas-04': {
    nameArg: 'Extensión de Cuádriceps',
    wgerId: 248,
    instructions: [
      'Ajustá el respaldo para que la rodilla quede alineada con el eje de la máquina.',
      'Extendé hasta arriba y apretá un segundo.',
      'Bajá lento hasta la flexión máxima que te permita la máquina.',
      'Si querés más recto anterior, sentate más erguido en lugar de recostado.',
    ],
    tips: [
      'Si tenés que acortar el rango por fatiga, quedate con la mitad de abajo (la más estirada): rinde más',
      'Respaldo más vertical estira el recto femoral y le da más estímulo',
      'Dosis: 3 series de 12-20 reps, 1-2 min de descanso, al fallo o muy cerca',
    ],
    primaryMuscles: ['Cuádriceps'],
    secondaryMuscles: [],
  },
  'piernas-05': {
    nameArg: 'Curl de Isquiotibiales Acostado',
    wgerId: 24,
    instructions: [
      'Boca abajo con el rodillo apoyado justo arriba del talón.',
      'Cadera pegada al banco durante toda la serie.',
      'Flexioná las rodillas hasta el tope sin levantar la cadera.',
      'Bajá lento hasta extender casi del todo.',
    ],
    tips: [
      'Complementa al curl sentado, que estira más el isquio y da más crecimiento',
      'Si la cadera se levanta, bajá el peso: es la trampa clásica acá',
      'Dosis: 3 series de 10-15 reps, 1-2 min de descanso',
    ],
    primaryMuscles: ['Isquiotibiales'],
    secondaryMuscles: ['Gastrocnemio'],
  },
  'piernas-06': {
    nameArg: 'Peso Muerto Rumano',
    wgerId: 220,
    instructions: [
      'De pie con la barra pegada a los muslos, rodillas con una flexión leve y fija (~15°).',
      'Llevá la cadera hacia atrás bajando la barra pegada a las piernas.',
      'Frená cuando sientas el estiramiento del isquio o cuando la espalda esté por redondearse: lo que pase primero.',
      'Volvé empujando la cadera hacia adelante, sin hiperextender arriba.',
    ],
    tips: [
      'Bajar más allá de donde llega tu cadera no suma isquio: solo redondea la lumbar',
      'La barra pegada al cuerpo — cada centímetro que se aleja es carga extra para la espalda baja',
      'Dosis: 3-4 series de 8-12 reps, 2 min de descanso',
    ],
    primaryMuscles: ['Isquiotibiales', 'Glúteos'],
    secondaryMuscles: ['Erectores espinales'],
  },
  'piernas-07': {
    nameArg: 'Zancadas',
    wgerId: 45,
    instructions: [
      'Paso largo hacia adelante manteniendo el torso erguido.',
      'Bajá hasta que la rodilla de atrás casi toque el piso.',
      'Empujá con el talón de la pierna de adelante para volver.',
      'Alterná piernas o completá todas las reps de un lado antes de cambiar.',
    ],
    tips: [
      'Paso largo carga más glúteo; paso corto, más cuádriceps',
      'La rodilla de adelante sigue la línea del pie, sin colapsar hacia adentro',
      'Dosis: 3 series de 10-12 reps por pierna, 1-2 min de descanso',
    ],
    primaryMuscles: ['Cuádriceps', 'Glúteos'],
    secondaryMuscles: ['Isquiotibiales'],
  },
  'piernas-08': {
    nameArg: 'Sentadilla Búlgara',
    wgerId: 211,
    instructions: [
      'Pie de atrás sobre el banco, el de adelante lo bastante lejos como para bajar vertical.',
      'Mancuernas a los costados, torso apenas inclinado hacia adelante.',
      'Bajá hasta que el muslo de adelante quede paralelo al piso o más abajo.',
      'Empujá con el pie de adelante sin usar el de atrás para impulsarte.',
    ],
    tips: [
      'Es de los que más rango de cadera permiten: buen estímulo de glúteo con poca carga espinal',
      'Más inclinado el torso, más glúteo; más vertical, más cuádriceps',
      'Dosis: 3 series de 8-12 reps por pierna, 1-2 min de descanso',
    ],
    primaryMuscles: ['Cuádriceps', 'Glúteos'],
    secondaryMuscles: ['Isquiotibiales'],
  },
  'piernas-09': {
    nameArg: 'Hack Squat',
    instructions: [
      'Espalda y cadera pegadas al respaldo, pies a media plataforma.',
      'Bajá controlado hasta donde la cadera no se despegue.',
      'Empujá sin bloquear las rodillas arriba.',
      'Mantené la planta del pie completa apoyada.',
    ],
    tips: [
      'La guía fija te deja llevarlo al fallo sin equilibrio de por medio: ideal para acumular volumen de cuádriceps',
      'Pies más abajo en la plataforma cargan más cuádriceps; más arriba, más glúteo',
      'Dosis: 3-4 series de 8-15 reps, 2 min de descanso',
    ],
    primaryMuscles: ['Cuádriceps'],
    secondaryMuscles: ['Glúteos', 'Isquiotibiales'],
  },
  'piernas-10': {
    nameArg: 'Hip Thrust con Barra',
    instructions: [
      'Omóplatos apoyados en el borde del banco, barra sobre la cadera con almohadilla.',
      'Pies al ancho de hombros, espinillas verticales arriba del movimiento.',
      'Subí la cadera hasta alinear torso y muslos, apretando el glúteo arriba.',
      'Mantené la pelvis en retroversión y el mentón hacia el pecho: no arquees la lumbar.',
    ],
    tips: [
      'Hip thrust y sentadilla dan crecimiento de glúteo parecido: no hace falta elegir, se complementan',
      'Pausá 1 s arriba: es donde el glúteo trabaja más corto y con más tensión',
      'Dosis: 3-4 series de 8-12 reps, 2 min de descanso',
    ],
    primaryMuscles: ['Glúteos', 'Isquiotibiales'],
    secondaryMuscles: ['Cuádriceps', 'Erectores espinales'],
  },
  'piernas-11': {
    nameArg: 'Elevación de Pantorrilla',
    instructions: [
      'De pie con la punta del pie en el escalón y la rodilla extendida.',
      'Bajá el talón hasta el máximo estiramiento y aguantá un instante.',
      'Subí hasta la punta del pie del todo.',
      'Nada de rebotes: el rebote es tendón, no músculo.',
    ],
    tips: [
      'De pie (rodilla estirada) el gemelo crece mucho más que sentado: 9-12% contra 1-2% a 12 semanas',
      'Rango completo, sobre todo la parte de abajo estirada',
      'Dosis: 3-4 series de 10-15 reps con pausa abajo, 1 min de descanso',
    ],
    primaryMuscles: ['Gastrocnemio (gemelos)', 'Sóleo'],
    secondaryMuscles: [],
  },
  'piernas-12': {
    nameArg: 'Curl de Isquiotibiales Sentado',
    instructions: [
      'Sentado con el respaldo ajustado y el rodillo justo arriba del talón.',
      'Traba el muslo con la almohadilla para que la cadera no se mueva.',
      'Flexioná la rodilla hasta el tope.',
      'Volvé lento hasta la extensión completa, aguantando el estiramiento.',
    ],
    tips: [
      'Con la cadera flexionada el isquio trabaja estirado: creció más que el curl acostado en comparación directa',
      'Si tenés que elegir un solo curl, que sea este',
      'Dosis: 3 series de 10-15 reps, 1-2 min de descanso',
    ],
    primaryMuscles: ['Isquiotibiales'],
    secondaryMuscles: ['Gastrocnemio'],
  },
  // ─── GLÚTEOS ───────────────────────────────────────────────────────────────
  'gluteos-01': {
    nameArg: 'Hip Thrust',
    wgerId: 228,
    instructions: [
      'Omóplatos en el borde del banco, barra sobre la cadera con almohadilla.',
      'Pies al ancho de hombros y lo bastante adelante como para que la espinilla quede vertical arriba.',
      'Subí hasta alinear torso y muslos, apretando el glúteo un segundo.',
      'Bajá controlado sin apoyar del todo entre repeticiones.',
    ],
    tips: [
      'Mentón al pecho y pelvis en retroversión: el rango extra no puede salir de la lumbar',
      'Comparado con la sentadilla, activa más el glúteo pero el crecimiento termina siendo parecido',
      'Dosis: 3-4 series de 8-12 reps con pausa arriba, 2 min de descanso',
    ],
    primaryMuscles: ['Glúteo mayor'],
    secondaryMuscles: ['Isquiotibiales', 'Glúteo medio'],
  },
  'gluteos-02': {
    nameArg: 'Glute Bridge',
    instructions: [
      'Acostado boca arriba, rodillas flexionadas y pies apoyados cerca de la cola.',
      'Subí la cadera hasta alinear rodillas, cadera y hombros.',
      'Apretá el glúteo arriba 1-2 s.',
      'Bajá sin apoyar del todo para no perder la tensión.',
    ],
    tips: [
      'Sirve para aprender el patrón y como entrada en calor del hip thrust',
      'Si no sentís el glúteo, acercá los talones a la cola',
      'Dosis: 3 series de 15-20 reps con pausa, 1 min de descanso',
    ],
    primaryMuscles: ['Glúteo mayor'],
    secondaryMuscles: ['Isquiotibiales', 'Core'],
  },
  'gluteos-03': {
    nameArg: 'Patada de Glúteos en Cable',
    wgerId: 209,
    instructions: [
      'Tobillera en la polea baja, tomate del soporte con el torso apenas inclinado.',
      'Llevá la pierna hacia atrás con la rodilla casi extendida.',
      'Frená donde el glúteo se contrae, sin arquear la espalda baja para ganar rango.',
      'Volvé lento hasta el estiramiento.',
    ],
    tips: [
      'Aislamiento puro de glúteo: peso liviano, reps altas, foco en la contracción',
      'El rango sale de la cadera, no de la lumbar',
      'Dosis: 3 series de 12-20 reps por pierna, 1 min de descanso',
    ],
    primaryMuscles: ['Glúteo mayor'],
    secondaryMuscles: ['Isquiotibiales'],
  },
  'gluteos-04': {
    nameArg: 'Abducción en Máquina',
    instructions: [
      'Sentado con la espalda apoyada y las almohadillas contra la cara externa del muslo.',
      'Abrí las piernas hasta el tope de tu rango.',
      'Apretá un segundo en la apertura máxima.',
      'Volvé lento sin dejar que las placas apoyen.',
    ],
    tips: [
      'Trabaja glúteo medio, que casi no entra en sentadillas y pesos muertos',
      'Inclinar el torso hacia adelante cambia el énfasis dentro del glúteo: probá las dos posiciones',
      'Dosis: 3 series de 15-20 reps, 1 min de descanso',
    ],
    primaryMuscles: ['Glúteo medio', 'Glúteo menor'],
    secondaryMuscles: [],
  },
  'gluteos-05': {
    nameArg: 'Peso Muerto Sumo',
    instructions: [
      'Pies bien abiertos con las puntas hacia afuera, manos por dentro de las piernas.',
      'Pecho arriba, espalda neutra y cadera baja antes de despegar.',
      'Empujá el piso con las piernas manteniendo la barra pegada al cuerpo.',
      'Terminá parado sin hiperextender la espalda.',
    ],
    tips: [
      'Sumo carga más cuádriceps y aductores; convencional, más isquios y espalda baja',
      'Ninguna de las dos es mejor: usá la que te salga más fuerte y natural',
      'Dosis: 3-4 series de 4-8 reps, 2-3 min de descanso',
    ],
    primaryMuscles: ['Glúteos', 'Isquiotibiales'],
    secondaryMuscles: ['Cuádriceps', 'Dorsales', 'Erectores espinales'],
  },
  'gluteos-06': {
    nameArg: 'Subida al Escalón',
    instructions: [
      'Cajón a una altura que te deje el muslo paralelo al piso al apoyar el pie.',
      'Subí empujando con el pie de arriba, sin impulsarte con el de abajo.',
      'Extendé la cadera arriba apretando el glúteo.',
      'Bajá controlado con la misma pierna antes de cambiar.',
    ],
    tips: [
      'Cuanto más alto el cajón, más glúteo — pero solo si podés subir sin envión',
      'Si te impulsás con la pierna de atrás, dejó de ser unilateral',
      'Dosis: 3 series de 8-12 reps por pierna, 1-2 min de descanso',
    ],
    primaryMuscles: ['Glúteos', 'Cuádriceps'],
    secondaryMuscles: ['Isquiotibiales', 'Gastrocnemio'],
  },
  // ─── CORE ──────────────────────────────────────────────────────────────────
  'core-01': {
    nameArg: 'Rueda Abdominal',
    wgerId: 38,
    instructions: [
      'De rodillas con la rueda debajo de los hombros.',
      'Rodá hacia adelante manteniendo la pelvis en retroversión y las costillas abajo.',
      'Llegá hasta donde puedas sin que la espalda baja se arquee.',
      'Volvé tirando con el abdomen, no con los brazos.',
    ],
    tips: [
      'Es de los ejercicios con más activación abdominal medida en EMG',
      'El tope de tu rango es donde la lumbar se empieza a arquear, no donde llegan los brazos',
      'Dosis: 3 series de 8-12 reps, 1-2 min de descanso',
    ],
    primaryMuscles: ['Recto abdominal', 'Core profundo (transverso)'],
    secondaryMuscles: ['Dorsales', 'Tríceps'],
  },
  'core-02': {
    nameArg: 'Abdominales en Polea',
    wgerId: 100,
    instructions: [
      'De rodillas frente a la polea alta con la cuerda a los costados de la cabeza.',
      'Flexioná la columna llevando los codos hacia los muslos.',
      'El movimiento es de columna, no de cadera: la cadera queda quieta.',
      'Volvé lento hasta el estiramiento del abdomen.',
    ],
    tips: [
      'Es el ejercicio de abdomen más fácil de sobrecargar progresivamente: tratalo como cualquier otro músculo',
      'Si la cadera se va hacia atrás, pasó a ser un jalón de dorsal',
      'Dosis: 3 series de 10-15 reps con peso que te exija, 1 min de descanso',
    ],
    primaryMuscles: ['Recto abdominal'],
    secondaryMuscles: ['Oblicuos'],
  },
  'core-03': {
    nameArg: 'Plancha',
    wgerId: 47,
    instructions: [
      'Antebrazos bajo los hombros, cuerpo en línea recta de la cabeza a los talones.',
      'Pelvis en retroversión y glúteos apretados.',
      'Respirá normal, sin aguantar el aire.',
      'Cortá la serie cuando la cadera empieza a caer.',
    ],
    tips: [
      'Es isométrico: sirve para estabilidad, pero para hacer crecer el abdomen rinden más los que llevan carga',
      'Aguantar minutos no suma: mejor series de 20-40 s con peso encima',
      'Dosis: 3 series de 20-45 s, 1 min de descanso',
    ],
    primaryMuscles: ['Core (transverso abdominal)', 'Rectores espinales'],
    secondaryMuscles: ['Glúteos', 'Deltoides'],
  },
  'core-04': {
    nameArg: 'Elevación de Piernas Colgante',
    instructions: [
      'Colgado de la barra con los hombros activos, sin quedar completamente suelto.',
      'Subí las piernas llevando la pelvis hacia arriba: el rango útil empieza cuando la pelvis rota.',
      'Frená arriba sin balancearte.',
      'Bajá lento y sin dejar que el cuerpo oscile.',
    ],
    tips: [
      'Si solo levantás las piernas sin rotar la pelvis, estás trabajando flexores de cadera',
      'Empezá con rodillas flexionadas y estirá las piernas a medida que controles el movimiento',
      'Dosis: 3 series de 8-15 reps, 1-2 min de descanso',
    ],
    primaryMuscles: ['Recto abdominal inferior', 'Flexores de cadera'],
    secondaryMuscles: ['Core', 'Antebrazos (agarre)'],
  },
  'core-05': {
    nameArg: 'Russian Twist',
    instructions: [
      'Sentado con el torso a 45° y los pies apoyados o suspendidos.',
      'Girá el torso llevando las manos de un lado al otro.',
      'La rotación viene del tronco, no de los brazos.',
      'Mantené la espalda neutra: no redondees para llegar más lejos.',
    ],
    tips: [
      'Es trabajo de oblicuos con rotación: peso liviano y control, no velocidad',
      'Si te apurás, el movimiento pasa a ser de brazos y no de tronco',
      'Dosis: 3 series de 15-20 toques por lado, 1 min de descanso',
    ],
    primaryMuscles: ['Oblicuos'],
    secondaryMuscles: ['Recto abdominal', 'Flexores de cadera'],
  },
  'core-06': {
    nameArg: 'Crunch Declinado',
    instructions: [
      'Trabá las piernas en el banco declinado con la cadera fija.',
      'Subí flexionando la columna, no tirando del cuello.',
      'Frená cuando los omóplatos se despegan del banco.',
      'Bajá lento hasta sentir el estiramiento del abdomen.',
    ],
    tips: [
      'La declinación agrega resistencia en la parte de arriba del rango',
      'Sostené un disco en el pecho cuando pasás de 20 reps',
      'Dosis: 3 series de 12-20 reps, 1 min de descanso',
    ],
    primaryMuscles: ['Recto abdominal'],
    secondaryMuscles: ['Oblicuos'],
  },
  'core-07': {
    nameArg: 'Press Pallof',
    instructions: [
      'De pie de costado a la polea, manos juntas al pecho.',
      'Extendé los brazos al frente resistiendo la rotación que ejerce el cable.',
      'Aguantá 2-3 s con los brazos estirados.',
      'Volvé al pecho sin dejar que el torso gire.',
    ],
    tips: [
      'Es antirrotación: el objetivo es que nada se mueva, no llegar lejos',
      'Glúteos apretados y costillas abajo para que la cadera no acompañe',
      'Dosis: 3 series de 8-12 reps por lado con pausa, 1 min de descanso',
    ],
    primaryMuscles: ['Core (oblicuos, transverso)'],
    secondaryMuscles: ['Recto abdominal', 'Glúteos'],
  },
  'core-08': {
    nameArg: 'Flexión Lateral con Mancuerna',
    instructions: [
      'De pie con una mancuerna en una mano, brazo estirado al costado.',
      'Inclinate hacia el lado de la mancuerna dejando que baje pegada a la pierna.',
      'Volvé a la vertical contrayendo el oblicuo del lado contrario.',
      'No rotes el torso ni te vayas hacia adelante.',
    ],
    tips: [
      'Trabajo de oblicuos en flexión lateral: rango corto y control, sin balanceo',
      'Peso desmedido acá solo agrega riesgo lumbar sin más estímulo',
      'Dosis: 3 series de 12-15 reps por lado, 1 min de descanso',
    ],
    primaryMuscles: ['Oblicuos'],
    secondaryMuscles: ['Cuadrado lumbar', 'Dorsal'],
  },
  'core-09': {
    nameArg: 'Mountain Climbers',
    instructions: [
      'En posición de plancha alta con las manos bajo los hombros.',
      'Llevá una rodilla al pecho y volvé, alternando.',
      'Mantené la cadera a la altura de los hombros todo el tiempo.',
      'Si la cadera sube y baja, bajá el ritmo.',
    ],
    tips: [
      'Es más acondicionamiento que hipertrofia de abdomen: usalo para elevar pulsaciones o entrar en calor',
      'La calidad de la posición importa más que la velocidad',
      'Dosis: 3 series de 30-45 s, 1 min de descanso',
    ],
    primaryMuscles: ['Core', 'Flexores de cadera'],
    secondaryMuscles: ['Deltoides', 'Cuádriceps', 'Cardio'],
  },
  'core-10': {
    nameArg: 'Dead Bug',
    wgerId: 113,
    instructions: [
      'Boca arriba con brazos al techo y caderas y rodillas a 90°.',
      'Pegá la zona lumbar al piso y mantenela ahí toda la serie.',
      'Estirá un brazo y la pierna contraria sin que la espalda se despegue.',
      'Volvé y alterná lados con control.',
    ],
    tips: [
      'Ejercicio de control: si la lumbar se despega del piso, acortá el recorrido',
      'Ideal como entrada en calor antes de sentadillas o peso muerto',
      'Dosis: 2-3 series de 8-10 reps por lado, sin apuro',
    ],
    primaryMuscles: ['Core profundo (transverso abdominal)'],
    secondaryMuscles: ['Recto abdominal', 'Estabilizadores'],
  },
  'core-11': {
    nameArg: 'Crunch en Máquina',
    instructions: [
      'Ajustá el asiento para que el eje de giro quede a la altura del ombligo.',
      'Flexioná la columna llevando el pecho hacia la pelvis.',
      'No tires con los brazos: son solo apoyo.',
      'Volvé lento hasta el estiramiento.',
    ],
    tips: [
      'La máquina permite progresar en peso, que es lo que hace crecer al abdomen',
      'Rango corto pero cargado: es su punto fuerte frente al crunch en el piso',
      'Dosis: 3 series de 12-20 reps, 1 min de descanso',
    ],
    primaryMuscles: ['Recto abdominal'],
    secondaryMuscles: ['Oblicuos'],
  },
  // ─── CARDIO ────────────────────────────────────────────────────────────────
  'cardio-01': {
    nameArg: 'Cinta de Correr',
    instructions: [
      'Arrancá con 5 minutos suaves antes de subir el ritmo.',
      'Pisada bajo el cuerpo, torso erguido y hombros sueltos.',
      'Manejá la intensidad para poder hablar de a frases cortas en el trabajo aeróbico base.',
      'Terminá con 3-5 minutos de vuelta a la calma.',
    ],
    tips: [
      'Ubicá el cardio después de la pesa o en otro momento del día si tu prioridad es la fuerza',
      'Una pendiente del 2-3% te da estímulo con menos impacto que correr rápido en plano',
      'Dosis: 20-40 min continuos, o 6-10 series de 1 min fuerte con 2 min suaves',
    ],
    primaryMuscles: ['Cuádriceps', 'Glúteos', 'Isquiotibiales'],
    secondaryMuscles: ['Pantorrillas', 'Core'],
  },
  'cardio-02': {
    nameArg: 'Bicicleta Estática',
    instructions: [
      'Regulá el asiento a la altura de la cadera: la rodilla tiene que quedar apenas flexionada abajo.',
      'Pedaleá con el torso relajado y sin apoyar todo el peso en las manos.',
      'Mantené una cadencia estable en el trabajo continuo.',
      'Bajá la carga de a poco los últimos minutos.',
    ],
    tips: [
      'Bajo impacto: es la opción más amable para los días entre piernas pesadas',
      'Si querés que interfiera lo menos posible con la fuerza, priorizá bici por sobre correr',
      'Dosis: 20-45 min continuos, o 8-10 series de 30 s fuerte con 90 s suaves',
    ],
    primaryMuscles: ['Cuádriceps', 'Glúteos'],
    secondaryMuscles: ['Isquiotibiales', 'Pantorrillas', 'Core'],
  },
}
