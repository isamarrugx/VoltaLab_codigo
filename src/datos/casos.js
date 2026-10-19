// Casos de las sesiones de juego. Cada sesión = un nivel = 4 casos con el mismo ritmo:
// predecir → predecir → reparar → construir.
//
// En los casos de predecir, la respuesta correcta NO está escrita a mano: `resultado` la lee de
// lo que calcula el motor tras la acción. En reparar/construir, `meta` comprueba el circuito
// del estudiante con el motor, y `solucion` es una solución de referencia que se prueba en
// casos.test.js para garantizar que cada caso se puede resolver.

// ---- piezas (punto_a, punto_b en [fila, col]; la batería tiene el + en punto_a) ----
const bat = (a, b, valor, imax = 2) => ({ tipo: "bateria", punto_a: a, punto_b: b, valor, imax });
const bomb = (a, b, valor = 10, pmax = 15, extra = {}) => ({ tipo: "bombillo", punto_a: a, punto_b: b, valor, pmax, ...extra });
const resi = (a, b, valor, pmax = 2) => ({ tipo: "resistencia", punto_a: a, punto_b: b, valor, pmax });
const sw = (a, b, cerrado = false) => ({ tipo: "interruptor", punto_a: a, punto_b: b, cerrado });
const fus = (a, b, valor) => ({ tipo: "fusible", punto_a: a, punto_b: b, valor });
const cab = (...puntos) => ({ cable: true, puntos });
const ROJO = "#E03131";

// Numera en orden (obj_1, obj_2…): así los nombres salen B1, B2… como se leen en el texto.
function armar(...items) {
  const componentes = {}, cables = {};
  items.forEach((it, i) => {
    const tag = `obj_${i + 1}`;
    if (it.cable) cables[tag] = { puntos: it.puntos, color: it.color || "#495057" };
    else componentes[tag] = it;
  });
  return { componentes, cables };
}
const rojo = (c) => ({ ...c, color: ROJO });

// ---- lecturas del motor ----
const P = (med, tag) => (med && med.piezas[tag] ? med.piezas[tag].P : 0);
const encendido = (med, tag) => P(med, tag) > 0.05;
const parecidos = (a, b, tol = 0.06) => Math.abs(a - b) <= tol * Math.max(a, b, 1e-9);
const sinDanos = (comp) => !Object.values(comp).some((c) => c.danado);
const deTipo = (comp, tipo) => Object.keys(comp).filter((t) => comp[t].tipo === tipo);

export const NIVELES = [
  { n: 1, titulo: "Primeros circuitos", resumen: "Brillo, voltaje y caminos cerrados." },
  { n: 2, titulo: "Serie y paralelo", resumen: "Qué pasa cuando una pieza falla." },
  { n: 3, titulo: "Protección", resumen: "Cortocircuitos, fusibles y fuentes reales." },
];

export const CASOS = [
  // ===================== NIVEL 1 =====================
  {
    clave: "brillo_serie", nivel: 1, tipo: "predecir", titulo: "¿Cuál brilla más?",
    concepto: "En serie, la pieza con más resistencia recibe más potencia.",
    intro: "B1 (10 Ω) y B2 (22 Ω) están en serie con una batería de 9 V.",
    pregunta: "Al cerrar el interruptor, ¿cuál bombillo brillará más?",
    opciones: [["b1", "B1, el de 10 Ω"], ["b2", "B2, el de 22 Ω"], ["igual", "Brillan igual"]],
    accion: (c) => { c.obj_4.cerrado = true; }, espera: 1.2,
    resultado: ({ fin }) => (parecidos(P(fin, "obj_2"), P(fin, "obj_3")) ? "igual" : P(fin, "obj_3") > P(fin, "obj_2") ? "b2" : "b1"),
    explicacion: "Por los dos pasa la misma corriente (es un solo camino), y la potencia es P = I² × R. Con la misma I, el de mayor R convierte más energía en luz: B2.",
    detalle: "I = 9 V / (10 Ω + 22 Ω) = 0.28 A. B1 recibe 0.28² × 10 = 0.79 W y B2 recibe 0.28² × 22 = 1.74 W, más del doble. En paralelo sería al revés: allí ambos tienen el mismo voltaje y brilla más el de menor resistencia (P = V² / R).",
    ...armar(bat([2, 0], [4, 0], 9), bomb([0, 3], [0, 5], 10), bomb([2, 8], [4, 8], 22), sw([6, 5], [6, 3]),
      cab([2, 0], [0, 0], [0, 3]), cab([0, 5], [0, 8], [2, 8]), cab([4, 8], [6, 8], [6, 5]), cab([6, 3], [6, 0], [4, 0])),
  },
  {
    clave: "doble_voltaje", nivel: 1, tipo: "predecir", titulo: "Duplica el voltaje",
    concepto: "Con la misma resistencia, el doble de voltaje da el doble de corriente (I = V / R).",
    intro: "Un bombillo de 10 Ω está encendido con una batería de 6 V.",
    pregunta: "Si cambias la batería a 12 V, ¿qué pasa con la corriente?",
    opciones: [["doble", "Se duplica"], ["igual", "Se queda igual"], ["mitad", "Baja a la mitad"]],
    encendidoDesdeInicio: true,
    accion: (c) => { c.obj_1.valor = 12; }, espera: 1,
    resultado: ({ previo, fin }) => {
      const r = fin.iFuente / previo.iFuente;
      return r > 1.5 ? "doble" : r < 0.75 ? "mitad" : "igual";
    },
    explicacion: "La ley de Ohm dice I = V / R. La resistencia del bombillo no cambió, así que al duplicar V se duplica I: de 0.6 A a 1.2 A.",
    detalle: "Fíjate en el brillo: la potencia es P = V × I, y ahora se duplicaron las dos. Pasó de 3.6 W a 14.4 W, cuatro veces más. Por eso un bombillo conectado a más voltaje del que soporta se funde tan rápido.",
    ...armar(bat([2, 0], [4, 0], 6), bomb([2, 6], [4, 6], 10), cab([2, 0], [0, 0], [0, 6], [2, 6]), cab([4, 6], [6, 6], [6, 0], [4, 0])),
  },
  {
    clave: "cable_suelto", nivel: 1, tipo: "reparar", titulo: "El bombillo no enciende",
    concepto: "La corriente solo circula si el camino está cerrado de principio a fin.",
    objetivo: "Encuentra por qué B1 no enciende y repáralo.",
    herramientas: ["seleccionar", "cable"],
    pistas: [
      { texto: "Sigue el camino desde el + de la batería. ¿Hay algún cable que no llegue a ninguna parte?" },
      { texto: "Abajo hay un hueco entre dos extremos de cable (marcados). Elige Cable y únelos.", puntos: [[6, 3], [6, 5]] },
    ],
    meta: ({ fin }) => encendido(fin, "obj_2"),
    solucion: (c, k) => { k.sol = { puntos: [[6, 5], [6, 3]] }; },
    explicacion: "Faltaba un tramo de cable: el camino estaba abierto y la corriente no podía volver al borne −. Al cerrarlo, la corriente da la vuelta completa y el bombillo enciende.",
    detalle: "Un circuito abierto se comporta como si el bombillo no estuviera conectado: la batería empuja, pero sin un camino de regreso no circula corriente. Un interruptor abierto o un bombillo fundido producen el mismo efecto.",
    ...armar(bat([2, 0], [4, 0], 9), bomb([2, 8], [4, 8], 10), cab([2, 0], [0, 0], [0, 8], [2, 8]), cab([4, 8], [6, 8], [6, 5]), cab([6, 3], [6, 0], [4, 0])),
  },
  {
    clave: "dos_bombillos", nivel: 1, tipo: "construir", titulo: "Enciende los dos",
    concepto: "Puedes conectar varias piezas en serie (un camino) o en paralelo (varias ramas).",
    objetivo: "Conecta los cables para que B1 y B2 enciendan a la vez.",
    herramientas: ["seleccionar", "cable"],
    pistas: [
      { texto: "Cada bombillo necesita un camino que salga del + y vuelva al −." },
      { texto: "Une con un cable el + de la batería con la parte de arriba de los dos bombillos, y con otro el − con la parte de abajo.", puntos: [[2, 0], [2, 4], [2, 8], [4, 0], [4, 4], [4, 8]] },
    ],
    meta: ({ fin }) => encendido(fin, "obj_2") && encendido(fin, "obj_3"),
    solucion: (c, k) => { k.a = { puntos: [[2, 0], [0, 0], [0, 8], [2, 8]] }; k.b = { puntos: [[0, 4], [2, 4]] }; k.c = { puntos: [[4, 8], [6, 8], [6, 0], [4, 0]] }; k.d = { puntos: [[4, 4], [6, 4]] }; },
    explicacion: ({ fin }) => (fin && parecidos(fin.piezas.obj_2.P, 8.1, 0.1)
      ? "Los conectaste en paralelo: cada bombillo tiene su propia rama y recibe los 9 V completos. Por eso brillan con fuerza, y si uno se funde el otro sigue encendido."
      : "Los conectaste en serie: la corriente pasa por uno y luego por el otro, y los 9 V se reparten entre los dos. Por eso brillan menos que si estuvieran solos."),
    detalle: "En paralelo cada bombillo recibe 9 V: P = 9² / 10 = 8.1 W. En serie se reparten 4.5 V cada uno: P = 4.5² / 10 = 2 W, cuatro veces menos. Prueba la otra forma en el laboratorio libre y compara.",
    ...armar(bat([2, 0], [4, 0], 9), bomb([2, 4], [4, 4], 10), bomb([2, 8], [4, 8], 10)),
  },

  // ===================== NIVEL 2 =====================
  {
    clave: "paralelo_fundido", nivel: 2, tipo: "predecir", titulo: "Una rama se funde",
    concepto: "En paralelo, cada rama es independiente: si una se abre, las demás siguen.",
    intro: "B1 y B2 son bombillos de 10 Ω en paralelo con 12 V. B1 solo soporta 2 W; B2 soporta 15 W.",
    pregunta: "Al cerrar el interruptor, B1 se va a fundir. ¿Qué le pasará a B2?",
    opciones: [["apaga", "B2 también se apaga"], ["igual", "B2 sigue encendido igual"], ["brilla", "B2 brilla más"]],
    accion: (c) => { c.obj_4.cerrado = true; }, espera: 2,
    resultado: ({ inicio, fin }) => (!encendido(fin, "obj_3") ? "apaga" : parecidos(P(inicio, "obj_3"), P(fin, "obj_3")) ? "igual" : P(fin, "obj_3") > P(inicio, "obj_3") ? "brilla" : "apaga"),
    explicacion: "En paralelo cada bombillo tiene su propia rama conectada a los 12 V. Cuando B1 se funde, solo se abre su rama: B2 sigue recibiendo el mismo voltaje y brilla igual.",
    detalle: "B1 recibía P = 12² / 10 = 14.4 W, siete veces su límite, y se fundió en una fracción de segundo. B2 recibe esos mismos 14.4 W, que sí soporta. Así funcionan las casas: si se quema una lámpara, las demás siguen encendidas.",
    ...armar(bat([2, 0], [4, 0], 12, 3), bomb([2, 4], [4, 4], 10, 2), bomb([2, 8], [4, 8], 10, 15), sw([0, 1], [0, 3]),
      cab([2, 0], [0, 0], [0, 1]), cab([0, 3], [0, 8], [2, 8]), cab([0, 4], [2, 4]), cab([4, 8], [6, 8], [6, 0], [4, 0]), cab([4, 4], [6, 4])),
  },
  {
    clave: "serie_fundido", nivel: 2, tipo: "predecir", titulo: "¿Qué le pasa a B2?",
    concepto: "En serie hay un solo camino: si una pieza se abre, todo se apaga.",
    intro: "Ahora B1 (2 W) y B2 (15 W), ambos de 10 Ω, están en serie con 12 V.",
    pregunta: "Al cerrar el interruptor, B1 recibe más potencia de la que aguanta. ¿Qué le pasará a B2?",
    opciones: [["apaga", "B2 también se apaga"], ["brilla", "B2 brilla más que antes"], ["igual", "B2 sigue encendido igual"]],
    accion: (c) => { c.obj_2.cerrado = true; }, espera: 2,
    resultado: ({ fin }) => (encendido(fin, "obj_4") ? "igual" : "apaga"),
    explicacion: "En serie hay un solo camino. Cuando el filamento de B1 se corta, ese camino queda abierto y deja de pasar corriente por B2, aunque B2 esté sano.",
    detalle: "Con el interruptor cerrado pasan I = 12 V / 20 Ω = 0.6 A. Cada bombillo recibe P = 0.6² × 10 = 3.6 W: B2 lo soporta, pero B1 recibe casi el doble de sus 2 W y se funde. Compáralo con el caso anterior: en paralelo, B2 seguía encendido.",
    ...armar(bat([2, 0], [4, 0], 12), sw([0, 2], [0, 4]), bomb([0, 6], [0, 8], 10, 2), bomb([2, 10], [4, 10], 10, 15),
      cab([2, 0], [0, 0], [0, 2]), cab([0, 4], [0, 6]), cab([0, 8], [0, 10], [2, 10]), cab([4, 10], [6, 10], [6, 0], [4, 0])),
  },
  {
    clave: "fundido_otra_vez", nivel: 2, tipo: "reparar", titulo: "Se funde otra vez",
    concepto: "Antes de reemplazar una pieza dañada hay que corregir lo que la dañó.",
    objetivo: "B1 está fundido. Haz que los dos bombillos enciendan y que ninguno se vuelva a fundir.",
    herramientas: ["seleccionar"], limites: true,
    pistas: [
      { texto: "Si solo lo reemplazas, ¿recibirá la misma potencia que lo fundió? Selecciona B1 y mira su potencia máxima." },
      { texto: "B1 recibe 3.6 W y soporta 2 W. Elige una potencia máxima de 5 W o más y pulsa Reemplazar. También funciona bajar la batería a 9 V." },
    ],
    meta: ({ fin, comp }) => sinDanos(comp) && encendido(fin, "obj_3") && encendido(fin, "obj_4"),
    solucion: (c) => { delete c.obj_3.danado; c.obj_3.pmax = 5; },
    explicacion: "B1 se fundía porque recibía 3.6 W y solo soportaba 2 W. Reemplazarlo por uno igual no sirve: se funde de nuevo. Hay que usar un bombillo que aguante esa potencia o darle menos voltaje.",
    detalle: "Con 12 V y 20 Ω en serie pasan 0.6 A y cada bombillo recibe 3.6 W. Con un bombillo de 5 W hay margen. Con la batería de 9 V pasarían 0.45 A y B1 recibiría 2 W: justo en su límite, por eso también funciona, aunque sin margen.",
    ...armar(bat([2, 0], [4, 0], 12), sw([0, 2], [0, 4], true), bomb([0, 6], [0, 8], 10, 2, { danado: true }), bomb([2, 10], [4, 10], 10, 15),
      cab([2, 0], [0, 0], [0, 2]), cab([0, 4], [0, 6]), cab([0, 8], [0, 10], [2, 10]), cab([4, 10], [6, 10], [6, 0], [4, 0])),
  },
  {
    clave: "corriente_justa", nivel: 2, tipo: "construir", titulo: "Corriente justa",
    concepto: "Para conseguir una corriente, se elige la resistencia con R = V / I.",
    objetivo: "Coloca resistencias en el hueco de arriba para que la batería entregue entre 40 y 60 mA.",
    herramientas: ["seleccionar", "resistencia"],
    pistas: [
      { texto: "Despeja la ley de Ohm: R = V / I. ¿Qué resistencia da unos 50 mA con 9 V?" },
      { texto: "9 V / 0.05 A = 180 Ω. Coloca una resistencia de 220 Ω en el hueco marcado (o dos de 100 Ω seguidas).", puntos: [[0, 3], [0, 5]] },
    ],
    meta: ({ fin, comp }) => sinDanos(comp) && fin.iFuente >= 0.04 && fin.iFuente <= 0.06,
    solucion: (c) => { c.sol = resi([0, 3], [0, 5], 220); },
    explicacion: ({ fin }) => `La batería entrega ${(fin.iFuente * 1000).toFixed(1)} mA. Como I = V / R, para unos 50 mA con 9 V hace falta R ≈ 180 Ω; la de 220 Ω deja 41 mA, dentro del rango.`,
    detalle: "Si pones resistencias en serie, sus valores se suman: dos de 100 Ω equivalen a 200 Ω y dan 45 mA. Si las pones en paralelo, la resistencia total baja y la corriente sube. Así se diseñan los circuitos: primero se decide la corriente y luego se calcula la resistencia.",
    ...armar(bat([2, 0], [4, 0], 9), cab([2, 0], [0, 0], [0, 3]), cab([0, 5], [0, 8], [6, 8], [6, 0], [4, 0])),
  },

  // ===================== NIVEL 3 =====================
  {
    clave: "atajo_fusible", nivel: 3, tipo: "predecir", titulo: "Un atajo peligroso",
    concepto: "Un fusible se abre ante un cortocircuito y protege el resto del circuito.",
    intro: "B1 está encendido. En el medio hay un atajo sin resistencia con un interruptor abierto y un fusible de 0.5 A.",
    pregunta: "Si cierras el interruptor, la corriente tendrá un atajo casi sin resistencia. ¿Qué pasará?",
    opciones: [["fusible", "El fusible se abre y B1 sigue encendido"], ["apaga", "Todo se apaga y no vuelve"], ["brilla", "B1 brilla más"]],
    encendidoDesdeInicio: true,
    accion: (c) => { c.obj_3.cerrado = true; }, espera: 1.5,
    resultado: ({ fin, comp }) => (comp.obj_4.danado && encendido(fin, "obj_2") ? "fusible" : encendido(fin, "obj_2") ? "brilla" : "apaga"),
    explicacion: "El atajo forma un cortocircuito: casi toda la corriente se va por ahí. La batería entrega su máximo (2 A), cuatro veces lo que soporta el fusible, y su hilo se funde en una décima de segundo. Al abrirse, el atajo desaparece y B1 vuelve a encender.",
    detalle: "Sin el fusible, la batería quedaría en protección con el voltaje casi en 0 V y B1 apagado mientras dure el corto. Por eso las casas tienen fusibles o breakers: cortan solo la parte con problemas y protegen los cables.",
    ...armar(bat([2, 0], [4, 0], 12), bomb([2, 6], [4, 6], 10), sw([1, 3], [3, 3]), fus([3, 3], [5, 3], 0.5),
      cab([2, 0], [0, 0], [0, 6], [2, 6]), cab([4, 6], [6, 6], [6, 0], [4, 0]), cab([0, 3], [1, 3]), cab([5, 3], [6, 3])),
  },
  {
    clave: "bateria_limite", nivel: 3, tipo: "predecir", titulo: "Más bombillos, ¿mismo brillo?",
    concepto: "Una fuente real tiene una corriente máxima: con demasiadas cargas, baja su voltaje.",
    intro: "B1 está encendido con 12 V. La batería entrega como máximo 2 A. El interruptor agrega B2 y B3 en paralelo.",
    pregunta: "Al cerrar el interruptor, ¿qué le pasa al brillo de B1?",
    opciones: [["igual", "Sigue igual: está en paralelo"], ["menos", "Brilla menos"], ["mas", "Brilla más"]],
    encendidoDesdeInicio: true,
    accion: (c) => { c.obj_5.cerrado = true; }, espera: 1,
    resultado: ({ previo, fin }) => (parecidos(P(previo, "obj_2"), P(fin, "obj_2"), 0.1) ? "igual" : P(fin, "obj_2") < P(previo, "obj_2") ? "menos" : "mas"),
    explicacion: "Con una batería ideal, B1 brillaría igual. Pero tres bombillos de 10 Ω en paralelo piden 3.6 A, y esta batería solo da 2 A: baja su voltaje a unos 6.7 V y los tres brillan menos.",
    detalle: "Solo, B1 pide 12 V / 10 Ω = 1.2 A y recibe 14.4 W. Con tres ramas, la resistencia equivalente es 3.3 Ω y harían falta 3.6 A. La batería limita la corriente a 2 A, así que V = 2 A × 3.3 Ω ≈ 6.7 V y cada bombillo recibe 4.4 W. Por eso un enchufe con demasiados aparatos puede no dar abasto.",
    ...armar(bat([2, 0], [4, 0], 12, 2), bomb([2, 4], [4, 4], 10), bomb([2, 7], [4, 7], 10), bomb([2, 10], [4, 10], 10), sw([0, 4], [0, 6]),
      cab([2, 0], [0, 0], [0, 4], [2, 4]), cab([4, 4], [6, 4], [6, 0], [4, 0]), cab([0, 6], [0, 10], [2, 10]), cab([0, 7], [2, 7]), cab([4, 7], [6, 7]), cab([4, 10], [6, 10], [6, 4])),
  },
  {
    clave: "en_proteccion", nivel: 3, tipo: "reparar", titulo: "La batería no responde",
    concepto: "Un cortocircuito deja la fuente en protección: hay que quitar el camino sin resistencia.",
    objetivo: "Nada enciende y la batería está en protección. Encuentra el problema y haz que B1 y B2 enciendan.",
    herramientas: ["seleccionar"],
    pistas: [
      { texto: "Las chispas marcan por dónde circula la corriente del cortocircuito." },
      { texto: "Hay un cable rojo que une directamente el + con el −. Selecciónalo y bórralo con Supr o con Eliminar." },
    ],
    meta: ({ fin }) => !fin.limitando && encendido(fin, "obj_2") && encendido(fin, "obj_3"),
    solucion: (c, k) => { delete k.obj_8; },
    explicacion: "El cable rojo unía el + con el − sin pasar por ningún bombillo. Toda la corriente se iba por ahí y la batería se protegía bajando su voltaje a casi 0 V. Al quitarlo, la corriente vuelve a pasar por los bombillos.",
    detalle: "Un cable tiene casi 0 Ω. En paralelo con los bombillos, la resistencia equivalente se vuelve casi cero y I = V / R se dispara. Una fuente sin protección se calentaría o se dañaría; por eso los cortocircuitos son peligrosos en una instalación real.",
    ...armar(bat([2, 0], [4, 0], 12, 3), bomb([2, 5], [4, 5], 10), bomb([2, 8], [4, 8], 10),
      cab([2, 0], [0, 0], [0, 8], [2, 8]), cab([0, 5], [2, 5]), cab([4, 8], [6, 8], [6, 0], [4, 0]), cab([4, 5], [6, 5]),
      rojo(cab([2, 0], [2, 2], [4, 2], [4, 0]))),
  },
  {
    clave: "protege", nivel: 3, tipo: "construir", titulo: "Protege el circuito",
    concepto: "Un fusible va en serie y debe soportar la corriente normal, pero no mucho más.",
    objetivo: "Coloca un fusible en el hueco para proteger el circuito. B1 debe quedar encendido y el fusible no debe abrirse.",
    herramientas: ["seleccionar", "fusible"],
    pistas: [
      { texto: "Primero calcula cuánta corriente pasa normalmente: I = 12 V / 10 Ω." },
      { texto: "Pasan 1.2 A. Un fusible de 0.5 A o de 1 A se abre. Coloca uno de 2 A en el hueco marcado.", puntos: [[0, 3], [0, 5]] },
    ],
    meta: ({ fin, comp, cables, medir }) => {
      const fs = deTipo(comp, "fusible");
      if (!sinDanos(comp) || !fs.length || !encendido(fin, "obj_2")) return false;
      // en serie: si el fusible se abre, el bombillo se apaga
      const abierto = Object.fromEntries(Object.entries(comp).map(([t, c]) => [t, fs.includes(t) ? { ...c, danado: true } : c]));
      return !encendido(medir(abierto, cables), "obj_2") && fs.every((t) => fin.piezas[t] && fin.piezas[t].I <= comp[t].valor);
    },
    solucion: (c) => { c.sol = fus([0, 3], [0, 5], 2); },
    explicacion: "El fusible está en serie: toda la corriente pasa por él. Con 2 A soporta los 1.2 A normales, pero ante un cortocircuito (la batería da hasta 3 A) se abre y protege el circuito.",
    detalle: "Un fusible demasiado pequeño se abre sin que haya ningún problema; uno demasiado grande no protege nada. Se elige un poco por encima de la corriente normal. Un fusible en paralelo no sirve: la corriente lo esquiva o, peor, se convierte en un cortocircuito.",
    ...armar(bat([2, 0], [4, 0], 12, 3), bomb([2, 8], [4, 8], 10), cab([2, 0], [0, 0], [0, 3]), cab([0, 5], [0, 8], [2, 8]), cab([4, 8], [6, 8], [6, 0], [4, 0])),
  },
];

export const casosDeNivel = (n) => CASOS.filter((c) => c.nivel === n);
export const PUNTOS = { prediccion: 100, construccion: 150, pista: 25, falla: 20, minimo: 50, racha: 25 };
