// Guión de la amiga: emociones, reacciones al guardar, nota semanal, sugerencias
// y frases ancla. Los sprites viven en public/amiga/.
// Tono de cada línea: "w" cálido, "s" filoso.

export const EMOCIONES = [
  { nombre: "Alegría", color: "oklch(60% 0.13 70)", soft: "oklch(94% 0.045 70)" },
  { nombre: "Miedo", color: "oklch(46% 0.10 300)", soft: "oklch(94% 0.035 300)" },
  { nombre: "Ira", color: "oklch(50% 0.14 30)", soft: "oklch(93% 0.04 30)" },
  { nombre: "Desagrado", color: "oklch(46% 0.09 145)", soft: "oklch(93% 0.032 145)" },
  { nombre: "Tristeza", color: "oklch(46% 0.09 250)", soft: "oklch(94% 0.032 250)" },
  { nombre: "Ansiedad", color: "oklch(48% 0.11 340)", soft: "oklch(93% 0.035 340)" },
];

export const EMO_COLOR = {};
for (const e of EMOCIONES) EMO_COLOR[e.nombre] = e.color;

export const PROBLEMATICAS = ["Miedo", "Ira", "Desagrado", "Tristeza", "Ansiedad"];
export const ABSOLUTOS = ["siempre", "nunca", "nadie", "todos", "todo el mundo", "jamás", "nada me"];

export const REACTIONS = {
  primera: { img: "curiosa", prio: 95, lines: [
    ["w", "Primera entrada. Bienvenida al club de las que se dan cuenta."],
    ["s", "Ah, empezamos. Esto se va a poner interesante."],
    ["w", "Anotaste la primera. Lo más difícil ya pasó."],
  ]},
  intensaAlta: { img: "enserio", prio: 90, lines: [
    ["w", "Con la emoción casi al tope y te sentaste a escribir igual. Respeto."],
    ["s", "¿Ese número? Amiga. Esto va primero en la lista de la próxima sesión."],
    ["w", "Estabas al 90 y ordenaste la cabeza igual. No es poca cosa."],
  ]},
  faltaContra: { img: "datecuenta", prio: 82, lines: [
    ["s", "Escribiste la acusación y te olvidaste de la defensa. Amiga, date cuenta."],
    ["w", "Falta la evidencia en contra. Ahí abajo suele estar lo bueno."],
    ["s", "Fiscal impecable, abogada ausente."],
  ]},
  absolutos: { img: "clasico", prio: 76, lines: [
    ["s", "«Siempre», «nunca», «nadie». Hmm… clásico."],
    ["s", "Detecté un absoluto. Tu terapeuta también lo va a detectar."],
    ["w", "Ojo con las palabras totales. Casi nunca son literales."],
  ]},
  patron: { img: "chismosa", prio: 70, lines: [
    ["s", "Tercera vez esta semana con algo parecido. ¿Y luego qué pasó?"],
    ["s", "Contame más. Aunque creo que ya sé cómo sigue."],
    ["w", "Se está dibujando un patrón. Eso es exactamente lo que buscábamos."],
  ]},
  subio: { img: "teentiendo", prio: 64, lines: [
    ["w", "Subió. No lo resuelvas hoy: marcalo y descansá."],
    ["w", "Te entiendo. Subió y aun así lo anotaste; hoy eso es la victoria."],
    ["s", "Subió. Cero pánico: esto es material de sesión, no un fracaso."],
  ]},
  sinCambio: { img: "averaver", prio: 58, lines: [
    ["w", "No bajó, y está bien. Escribirlo no siempre alivia; siempre informa."],
    ["s", "Cero cambio. Perfecto: también es un dato."],
    ["w", "A ver, a ver… quedó igual. Entonces el trabajo está en otra parte."],
  ]},
  bajaMucho: { img: "jajaja", prio: 54, lines: [
    ["w", "Bajó bastante. Eso no fue suerte, fue que lo escribiste."],
    ["s", "Bajó así nomás por ordenarlo, y todavía dudás del método."],
    ["w", "Guardá esta entrada para el día que digas que nada sirve."],
  ]},
  completo: { img: "sindrama", prio: 48, lines: [
    ["w", "Registro completo. Tu terapeuta va a estar insoportablemente orgullosa."],
    ["s", "Todo lleno. Te estás poniendo peligrosamente buena en esto."],
    ["s", "Podés, y sin tanto drama. Quedó demostrado."],
  ]},
  faltaAlterno: { img: "yalosabia", prio: 42, lines: [
    ["w", "Te falta el pensamiento alternativo. Sé que es la parte incómoda."],
    ["s", "Media tarea. Volvé cuando tengas la otra versión de la historia."],
    ["s", "Ya lo sabía: llegaste hasta la evidencia y ahí aflojaste."],
  ]},
  bajaPoco: { img: "sindrama", prio: 36, lines: [
    ["w", "Bajó un poco. Un poco cuenta."],
    ["s", "No es un milagro, es un descuento. Igual lo aceptamos."],
  ]},
  constancia: { img: "tequieropero", prio: 30, lines: [
    ["w", "Van varios registros. Te quiero, pero también te admiro."],
    ["w", "Esto ya no es un cuaderno: es prueba de que estás trabajando."],
    ["s", "Te quiero, pero la próxima traé también la parte difícil."],
  ]},
  base: { img: "porfavor", prio: 0, lines: [
    ["w", "Anotado. Cuando haya tres parecidos, te lo voy a decir."],
    ["s", "Listo, guardado. Yo llevo la cuenta, vos respirá."],
    ["w", "Queda registrado. Nada más por hoy."],
  ]},
  patronEmo: { img: "datecuenta", prio: 88, lines: [
    ["s", "Esa emoción ya volvió tres veces y no baja cuando la escribís. Amiga, date cuenta: esto es tema de sesión."],
    ["w", "La misma emoción, otra vez, y sin bajar. Ya no es un registro suelto: es un patrón."],
  ]},
};

// reacción según la emoción dominante del registro
const EMO_REACTIONS = {
  "Alegría": { img: "jajaja", prio: 66, lines: [
    ["w", "Alegría anotada. También se registra lo bueno, no sólo el incendio."],
    ["s", "Mirá vos, una entrada feliz. Que quede en actas."],
  ]},
  "Miedo": { img: "averaver", prio: 66, lines: [
    ["w", "Miedo. Escribí el peor escenario completo: casi siempre es menos de lo que parecía."],
    ["s", "A ver, a ver… ¿es el miedo o la costumbre de tenerlo?"],
  ]},
  "Ira": { img: "enserio", prio: 66, lines: [
    ["s", "Ira. No mandes ese mensaje hoy: mañana lo leés y decidís."],
    ["w", "Tenías bronca y escribiste en vez de estallar. Eso ya es otra cosa."],
  ]},
  "Desagrado": { img: "clasico", prio: 66, lines: [
    ["s", "Desagrado. Clásico: pesimismo con cara de criterio."],
    ["w", "Fijate si es asco a la situación o cansancio acumulado."],
  ]},
  "Tristeza": { img: "teentiendo", prio: 66, lines: [
    ["w", "Tristeza. Escribile hoy a alguien, aunque sean dos líneas."],
    ["s", "Tristeza anotada. A veces pesa más la soledad que el problema."],
  ]},
  "Ansiedad": { img: "porfavor", prio: 66, lines: [
    ["w", "Ansiedad. Cinco minutos de respiración y una acción mínima, en ese orden."],
    ["s", "Por favor: dormí, movete, y después analizamos."],
  ]},
};
for (const nombre of Object.keys(EMO_REACTIONS)) REACTIONS[`emo:${nombre}`] = EMO_REACTIONS[nombre];

export const WEEK_REACTIONS = {
  vacia: { img: "curiosa", lines: [
    ["w", "Semana en blanco. O estuvo tranquila, o no tuviste tiempo: las dos valen."],
    ["s", "Curiosa… nada anotado todavía. Empezá por el día que peor te fue."],
  ]},
  noAyudo: { img: "datecuenta", lines: [
    ["s", "Varias estrategias que no funcionaron. No sos vos: es la estrategia."],
    ["w", "Nada te está ayudando esta semana. Llevá justo esto a sesión."],
  ]},
  siAyudo: { img: "yalosabia", lines: [
    ["s", "Lo que estás haciendo funciona. Ya lo sabía: anotá exactamente qué fue."],
    ["w", "Encontraste algo que sirve. Repetilo antes de olvidarte."],
  ]},
  intensa: { img: "teentiendo", lines: [
    ["w", "Semana pesada. Llevala entera a sesión, sin editar."],
    ["s", "Los números están altos. No los suavices para quedar bien."],
  ]},
  suave: { img: "jajaja", lines: [
    ["w", "Semana liviana. Se permite disfrutarla sin buscarle el truco."],
    ["s", "Todo bajo. Sí, también se anota lo bueno."],
  ]},
  bio: { img: "modoseria", lines: [
    ["s", "Dos días o más con la ansiedad arriba de 7. Antes de analizar nada: dormí 7 u 8 horas, saca el azúcar, movete tres veces esta semana."],
    ["w", "Varios días en rojo. No es momento de introspección, es momento de sueño, comida y movimiento."],
  ]},
  unoPorCiento: { img: "asisehace", lines: [
    ["w", "En la mayoría de tus registros la intensidad baja después de escribir. Ese es tu 1% diario, y ya está medido."],
    ["s", "Tus propios datos dicen que esto funciona. Guardá el dato para el día que quieras abandonar."],
  ]},
  enCurso: { img: "averaver", lines: [
    ["w", "A ver, a ver… ya hay algo acá. Seguí llenando y lo miramos juntas."],
    ["s", "Vamos bien. Falta la intensidad de algunos días, ¿eh?"],
  ]},
};

export const FRASES_ANCLA = [
  "La esperanza no es un plan.",
  "Tu cuerpo es la mente. Sin eso, el resto es imposible.",
  "La calma llega después de la cima, no antes.",
  "Seguridad es saber que, si pasa lo peor, te levantás y lo hacés mejor.",
  "Un 1% por día te deja 37 veces mejor en un año.",
];

// sprites: gestos → 0 respira · 1 venaca · 2 asisehace · 3 modoseria
//          tonos  → 0 complice · 1 chismosa · 2 condescendiente · 3 sarcastica · 4 preocupada · 5 protectora
export const SUGERENCIAS = {
  "Ansiedad": { etiqueta: "Ansiedad · respirá y movete", sprite: "gestos", i: 0,
    texto: "Cinco minutos de respiración y después una acción mínima. La ansiedad que se mueve rinde; la que se queda quieta, sólo crece." },
  "Miedo": { etiqueta: "Miedo · escribí el peor escenario", sprite: "tonos", i: 4,
    texto: "Escribí lo peor que puede pasar. Casi siempre es nada — y cuando no lo es, al menos ya tiene plan.",
    pasos: ["Elegí un riesgo chico que puedas probar varios días seguidos.", "Imaginá el peor escenario, el fatalista completo.", "Ahora escribí el escenario realista.", "Hacelo y prestá atención a cómo te sentís.", "Si sobreviviste, volvé a intentarlo."] },
  "Ira": { etiqueta: "Ira · primero el cuerpo", sprite: "tonos", i: 5,
    texto: "No decidas nada hasta dormir, comer y moverte. Tu cuerpo es la mente: si está en rojo, todo lo demás miente." },
  "Desagrado": { etiqueta: "Desagrado · auditá el pesimismo", sprite: "tonos", i: 2,
    texto: "Revisemos si eso que ves es probable o es sesgo. El cinismo también cuesta plata, no sólo humor." },
  "Tristeza": { etiqueta: "Tristeza · perdonate e iterá", sprite: "gestos", i: 1,
    texto: "Si fallaste hoy, mañana sale el sol igual. Escribile a alguien antes de que se haga costumbre: la soledad pesa como quince cigarrillos por día." },
  "Alegría": { etiqueta: "Alegría · usá el envión", sprite: "gestos", i: 2,
    texto: "Aprovechá y ayudá a alguien hoy. Retorna casi cuatro a uno, y no es metáfora: son cuatro neuroquímicos." },
};

// gesto nombrado por becario.js → celda del sprite
export const GESTO_SPRITE = {
  respira: ["gestos", 0], venaca: ["gestos", 1], asisehace: ["gestos", 2], modoseria: ["gestos", 3],
  complice: ["tonos", 0], chismosa2: ["tonos", 1], condescendiente: ["tonos", 2],
  sarcastica: ["tonos", 3], preocupada: ["tonos", 4], protectora: ["tonos", 5],
};

export function sugerirPara(emociones) {
  const orden = (emociones || []).slice().sort((a, b) => Number(b.antes) - Number(a.antes));
  for (const emo of orden) { const hit = SUGERENCIAS[emo.nombre]; if (hit) return hit; }
  return null;
}

export function pickLine(pool, tono, avoid) {
  let lines = pool.lines.filter(([t]) => tono === "mixto" || t === (tono === "filoso" ? "s" : "w"));
  if (!lines.length) lines = pool.lines;
  const fresh = lines.filter(([, text]) => text !== avoid);
  const use = fresh.length ? fresh : lines;
  return use[Math.floor(Math.random() * use.length)][1];
}

// emoción problemática que vuelve en 21 días y no baja al escribirla
export function patronesSinResolver(entries) {
  const hoy = Date.now();
  const out = [];
  for (const nombre of PROBLEMATICAS) {
    const rel = (entries || []).filter((e) => {
      const dias = (hoy - new Date(e.fecha + "T00:00:00").getTime()) / 86400000;
      return dias >= -1 && dias <= 21 && (e.emociones || []).some((x) => x.nombre === nombre);
    });
    if (rel.length < 3) continue;
    const deltas = rel.map((e) => { const x = e.emociones.find((k) => k.nombre === nombre); return Number(x.despues) - Number(x.antes); });
    const avg = deltas.reduce((a, b) => a + b, 0) / deltas.length;
    if (avg > -6) out.push({ nombre, veces: rel.length, avg: Math.round(avg) });
  }
  return out.sort((a, b) => b.veces - a.veces);
}
