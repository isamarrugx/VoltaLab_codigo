// Contenido del Laboratorio: retos para aprender a CONSTRUIR circuitos (port de retos.py).
import { exportar } from "../lib/diagnostico.js";
import { analizar, conectados, nombresComponentes } from "../lib/explicador.js";
import { construirNodos } from "../lib/motor.js";
import * as F from "../lib/formato.js";
import { cerca } from "./lecciones.js";

const A = F.amperios, O = F.ohmios, W = F.vatios, VV = F.voltios;
const v = (x) => `${F.gg(x)} V`;

export const NIVELES = {
  1: ["Guiado", "Paso a paso, con el cómo hacerlo."],
  2: ["Con apoyo", "Tú decides cómo; pide pistas si las necesitas."],
  3: ["Reto", "Solo el objetivo y sus criterios. Pide pistas si te atascas."],
};

const definicion = (bateria, { resistencias = [], bombillos = [], interruptores = [], cables = [] } = {}) => ({ bateria, resistencias, bombillos, interruptores, cables });

// ---------- Estado del circuito que arma el estudiante ----------
export class Estado {
  constructor(componentes, cables, herramienta = "seleccionar", recuerdos = null) {
    this.componentes = componentes; this.cables = cables; this.herramienta = herramienta;
    this.recuerdos = recuerdos || new Set();
    const a = analizar(componentes, cables);
    this.med = a.med; this.diag = a.diag; this.error = a.error;
    this.nombres = nombresComponentes(componentes);
    const ex = exportar(componentes, cables);
    this.bateria = ex.bateria; this.tagBateria = ex.tagBateria;
    this._nodo = ex.bateria ? construirNodos(ex.segmentos, ex.resistencias, ex.bateria) : null;
  }
  tags(tipo) { return Object.entries(this.componentes).filter(([, c]) => c.tipo === tipo).map(([t]) => t).sort((a, b) => (this.nombres[a] || "").localeCompare(this.nombres[b] || "")); }
  cuantos(tipo) { return this.tags(tipo).length; }
  porNombre(n) { return Object.keys(this.nombres).find((t) => this.nombres[t] === n) ?? null; }
  _en(p, borne) { return this._nodo ? this._nodo(p) === this._nodo(this.bateria[borne === "+" ? 0 : 1]) : false; }
  toca(tag, borne) { const c = this.componentes[tag]; return !!c && (this._en(c.punto_a, borne) || this._en(c.punto_b, borne)); }
  unidos(t1, t2) {
    if (!this._nodo) return false;
    const c1 = this.componentes[t1], c2 = this.componentes[t2];
    if (!c1 || !c2) return false;
    return [c1.punto_a, c1.punto_b].some((p) => [c2.punto_a, c2.punto_b].some((q) => this._nodo(p) === this._nodo(q)));
  }
  get corto() { return this.diag.estado === "corto"; }
  get cerrado() { return this.med != null && !this.med.abierto; }
  get tipo() { return this.cerrado ? this.med.tipo : null; }
  datos(tag) { return this.med ? this.med.componentes[this.nombres[tag]] : null; }
  encendido(tag) { const d = tag ? this.datos(tag) : null; return !!d && d.I > 1e-9; }
  encendidos(tipo = "bombillo") { return this.tags(tipo).filter((t) => this.encendido(t)); }
  conInterruptores(estados) {
    const comps = Object.fromEntries(Object.entries(this.componentes).map(([t, c]) => [t, { ...c }]));
    for (const [tag, cerrado] of Object.entries(estados)) comps[tag].cerrado = cerrado;
    return new Estado(comps, this.cables, this.herramienta, this.recuerdos);
  }
  interruptorCerrado(tag) { return this.componentes[tag].cerrado; }
}

// ---------- comprobaciones ----------
const primero = (e, tipo) => e.tags(tipo)[0] ?? null;
const tagB = (e) => primero(e, "bombillo");
function bombilloEnSerieConInterruptor(e) {
  for (const s of e.tags("interruptor")) {
    if (!e.interruptorCerrado(s)) continue;
    if (!e.encendidos().length) return null;
    if (!e.conInterruptores({ [s]: false }).encendidos().length) return s;
  }
  return null;
}
function controla(e, s) {
  const todos = Object.fromEntries(e.tags("interruptor").map((t) => [t, true]));
  const base = e.conInterruptores(todos), abierto = e.conInterruptores({ ...todos, [s]: false });
  const ab = new Set(abierto.encendidos());
  return new Set(base.encendidos().filter((t) => !ab.has(t)));
}
function independientes(e) {
  const sw = e.tags("interruptor"), bs = e.tags("bombillo");
  if (sw.length < 2 || bs.length < 2) return false;
  const todos = e.conInterruptores(Object.fromEntries(sw.map((t) => [t, true])));
  const enc = todos.encendidos();
  if (enc.length !== bs.length || !bs.every((b) => enc.includes(b))) return false;
  const c = sw.map((s) => controla(e, s));
  return c.every((x) => x.size === 1) && [...c[0]][0] !== [...c[1]][0];
}

// ---------- cierres ----------
const cierrePrimero = (e) => { const b = e.datos(primero(e, "bombillo")); return `Armaste un circuito cerrado: la corriente sale del borne +, atraviesa el bombillo y vuelve por el borne −. Con ${VV(e.med.V)} y un bombillo de ${O(b.R)} pasan ${A(b.I)}: el bombillo es una resistencia que brilla. También comprobaste que si quitas un cable, todo se apaga.`; };
const cierreInterruptor = (e) => `El interruptor es un trozo de camino que se puede abrir. Cerrado, deja pasar la corriente (${A(e.med.I)}); abierto, corta el único camino y el bombillo se apaga. Así funcionan los interruptores de la luz de tu casa.`;
const cierreResistencia = (e) => { const b = e.datos(primero(e, "bombillo")); return `La resistencia y el bombillo quedaron en serie: la corriente atraviesa los dos. Ahora pasan ${A(e.med.I)} y el bombillo recibe ${W(b.P)}. Una resistencia grande frena más la corriente y el bombillo brilla menos; una pequeña, al revés. Así funcionan los reguladores de intensidad.`; };
const cierreSerie = (e) => { const bs = e.tags("bombillo").map((t) => e.datos(t)); return `Los dos bombillos están en un solo camino: por ambos pasa la misma corriente (${A(e.med.I)}) y se reparten los ${v(e.med.V)} de la batería (${VV(bs[0].V)} cada uno). Por eso brillan menos que uno solo, y si se corta cualquier punto del camino, se apagan los dos.`; };
const cierreParalelo = (e) => { const bs = e.tags("bombillo").map((t) => e.datos(t)); return `Cada bombillo tiene su propia rama y recibe los ${v(e.med.V)} completos (${W(bs[0].P)} cada uno, cuatro veces más que en serie). La batería entrega la suma de las ramas: ${A(e.med.I)}. Y si una rama se corta, la otra sigue encendida.`; };
const cierreGeneral = () => "Pusiste el interruptor en la parte del camino que comparten las dos ramas (entre la batería y el punto donde se separan). Por ahí pasa TODA la corriente, así que al abrirlo se apagan los dos bombillos a la vez: es un interruptor general.";
const cierreCasa = () => "Cada rama tiene su bombillo y su interruptor en serie, y las ramas están en paralelo. Así cada interruptor solo corta su propia rama, mientras la otra sigue recibiendo el voltaje completo. Es exactamente como está cableada una casa.";
const cierreMixto = (e) => { const p = e.tags("bombillo").map((t) => e.datos(t)).reduce((a, b) => (b.I > a.I ? b : a)); return `El bombillo que está solo lleva TODA la corriente (${A(p.I)}) y recibe ${W(p.P)}; esa corriente luego se divide entre las dos ramas. Por eso brilla más que los otros dos. Un circuito mixto se resuelve por partes: primero el paralelo (Req de las ramas) y luego la serie.`; };
const cierre60 = (e) => { const det = conectados(e.med).map(([n, x]) => `${n} = ${O(x.R)}`).join(" y "); return `Lo lograste con ${det}: la resistencia equivalente es ${O(e.med.Req)}, y 9 V / ${O(e.med.Req)} = ${A(e.med.I)}. Había dos caminos: 50 Ω + 100 Ω en serie, o 300 Ω ∥ 300 Ω en paralelo. Combinar resistencias permite conseguir valores que no tienes.`; };
const cierreCero = (e) => {
  const [b1, b2] = e.tags("bombillo").slice(0, 2).map((t) => e.datos(t));
  const forma = e.tipo;
  const regla = e.tipo === "serie" ? "En serie la corriente es la misma, así que brilla más el de MAYOR resistencia (P = I² × R)."
    : e.tipo === "paralelo" ? "En paralelo el voltaje es el mismo, así que brilla más el de MENOR resistencia (P = V² / R)."
    : "Cada bombillo recibe una potencia distinta según su posición en el circuito.";
  return `Armaste el circuito desde cero (${forma}): B1 recibe ${W(b1.P)} y B2 ${W(b2.P)}. ${regla}`;
};

const C_PRIMER = [["+", "B1.*"], ["B1.*", "-"]];
const C_SERIE = [["+", "B1.*"], ["B1.*", "B2.*"], ["B2.*", "-"]];
const C_PARALELO = [["+", "B1.a"], ["B1.b", "-"], ["B1.a", "B2.a"], ["B1.b", "B2.b"]];
const C_GENERAL = [["+", "S1.a"], ["S1.b", "B1.a"], ["B1.a", "B2.a"], ["B1.b", "-"], ["B1.b", "B2.b"]];
const C_CASA = [["+", "S1.a"], ["S1.b", "B1.a"], ["B1.b", "-"], ["+", "S2.a"], ["S2.b", "B2.a"], ["B2.b", "-"]];
const C_MIXTO = [["+", "B1.a"], ["B1.b", "B2.a"], ["B2.a", "B3.a"], ["B2.b", "B3.b"], ["B2.b", "-"]];

export const RETOS = [
  {
    clave: "lab_primer", nivel: 1, titulo: "Tu primer circuito", icono: "bombillo", requiere: "resistencia",
    resumen: "Conecta una batería y un bombillo con cables.",
    objetivo: "Enciende el bombillo conectándolo a la batería con cables.",
    aprendes: "A dibujar cables y a armar el circuito cerrado que viste en la lección.",
    herramientas: ["seleccionar", "cable"],
    circuito: definicion([[2, 2], [6, 2], 9], { bombillos: [[[2, 7], [2, 10], 10]] }),
    pasos: [
      { texto: "Elige la herramienta Cable", como: "Haz clic en «Cable» en la barra de arriba del tablero (está iluminada).", habilidad: "herramienta",
        guia: { herramienta: "cable" }, hecho: (e) => e.herramienta === "cable", logro: "¡Listo! Con esta herramienta dibujas los caminos de la corriente." },
      { texto: "Une el borne + con el bombillo", como: "Sigue la línea punteada: clic en el punto que late junto al +, y otro clic en el extremo izquierdo del bombillo: el cable termina solo.", habilidad: "cable",
        guia: { herramienta: "cable", cables: [["+", "B1.a"]] }, hecho: (e) => e.toca(tagB(e), "+"),
        logro: "Primer cable listo. Pero el bombillo sigue apagado: la corriente todavía no tiene por dónde volver." },
      { texto: "Cierra el camino hasta el borne −", como: "Igual que antes: dibuja el cable punteado, desde el bombillo hasta el −. Un clic en cada esquina; al llegar al punto de conexión el cable termina solo.", habilidad: "cable",
        guia: { herramienta: "cable", cables: C_PRIMER }, hecho: (e) => e.cerrado && e.encendidos().length > 0, logro: "¡Se encendió! Es el camino cerrado de la lección: + → bombillo → −." },
      { texto: "Borra un cable", como: "Elige «Mover», haz clic sobre uno de los cables marcados en rojo y presiona Supr (o Retroceso).", habilidad: "borrar",
        guia: { herramienta: "seleccionar", borrar: true }, hecho: (e) => !e.cerrado && !e.corto, logro: "Se apagó: ya sabes por qué, el camino quedó abierto." },
      { texto: "Vuelve a encenderlo", como: "Elige «Cable» y dibuja otra vez el cable que borraste.", habilidad: "cable",
        guia: { herramienta: "cable", cables: C_PRIMER }, hecho: (e) => e.cerrado && e.encendidos().length > 0, logro: "¡Encendido de nuevo!" },
    ],
    pistas: [["Los puntos de conexión son los extremos de cada pieza.", { puntos: ["+", "-", "B1.a", "B1.b"] }],
      ["Un cable empieza con un clic y termina solo cuando tocas el punto de conexión de una pieza.", { herramienta: "cable" }],
      ["Camino completo: + → bombillo → −.", { cables: C_PRIMER }]],
    cierre: cierrePrimero,
  },
  {
    clave: "lab_regulador", nivel: 1, titulo: "Regula el brillo", icono: "resistencia", requiere: "resistencia",
    resumen: "Usa una resistencia para controlar el brillo.",
    objetivo: "Agrega una resistencia en el camino del bombillo y úsala para cambiar su brillo.",
    aprendes: "A colocar piezas nuevas y a cambiar su valor.",
    herramientas: ["seleccionar", "cable", "resistencia"],
    circuito: definicion([[2, 2], [7, 2], 9], { bombillos: [[[2, 4], [2, 7], 10]], cables: [[[2, 2], [2, 4]]] }),
    pasos: [
      { texto: "Coloca una resistencia", como: "Elige «Resistencia» y haz clic en el recuadro punteado.", habilidad: "colocar",
        guia: { herramienta: "resistencia", zonas: [["resistencia", [2, 9]]] }, hecho: (e) => e.cuantos("resistencia") >= 1 },
      { texto: "Conéctala para que el bombillo encienda", como: "Une con cables: bombillo → resistencia → borne −.", habilidad: "cable",
        guia: { herramienta: "cable", cables: [["B1.*", "R1.*"], ["R1.*", "-"]] },
        hecho: (e) => e.cerrado && e.encendidos().length > 0 && e.tags("resistencia").some((r) => e.encendido(r)),
        logro: (e) => `Encendido, con ${W(e.datos(tagB(e)).P)}. La resistencia frena un poco la corriente.` },
      { texto: "Hazlo brillar MÁS", como: "Elige «Mover», haz clic sobre la resistencia y, en la barra de arriba, elige el valor iluminado (50 Ω).", habilidad: "valor",
        guia: { herramienta: "seleccionar", valores: [["R1", 50]] },
        hecho: (e) => e.cerrado && e.tags("resistencia").some((r) => e.encendido(r) && cerca(e.datos(r).R, 50)),
        logro: (e) => `Menos resistencia → más corriente (${A(e.med.I)}) → más brillo, como en la lección.` },
      { texto: "Hazlo brillar MENOS", como: "Con la resistencia seleccionada, elige 470 Ω.", habilidad: "valor",
        guia: { herramienta: "seleccionar", valores: [["R1", 470]] },
        hecho: (e) => e.cerrado && e.tags("resistencia").some((r) => e.encendido(r) && cerca(e.datos(r).R, 470)),
        logro: (e) => `Mucha resistencia → poca corriente (${A(e.med.I)}) → el bombillo casi no brilla.` },
    ],
    pistas: [["La resistencia va en el mismo camino que el bombillo, una detrás del otro.", { piezas: ["R1", "B1"] }],
      ["Camino: + → bombillo → resistencia → −.", { cables: [["B1.*", "R1.*"], ["R1.*", "-"]] }],
      ["Para cambiar su valor: «Mover», clic en la resistencia y elige el valor arriba.", { herramienta: "seleccionar", piezas: ["R1"] }]],
    cierre: cierreResistencia,
  },
  {
    clave: "lab_interruptor", nivel: 1, titulo: "Agrega un interruptor", icono: "interruptor", requiere: "circuito",
    resumen: "Coloca un interruptor y controla el bombillo.",
    objetivo: "Agrega un interruptor al circuito para poder encender y apagar el bombillo.",
    aprendes: "A meter un interruptor en el camino, como en la lección.",
    herramientas: ["seleccionar", "cable", "interruptor"],
    circuito: definicion([[2, 2], [7, 2], 9], { bombillos: [[[2, 6], [2, 9], 10]], cables: [[[2, 2], [2, 6]]] }),
    pasos: [
      { texto: "Coloca un interruptor", como: "Elige «Interruptor» en la barra y haz clic dentro del recuadro punteado del tablero.", habilidad: "colocar",
        guia: { herramienta: "interruptor", zonas: [["interruptor", [5, 9]]] }, hecho: (e) => e.cuantos("interruptor") >= 1,
        logro: "Interruptor colocado. Ahora hay que meterlo en el camino de la corriente." },
      { texto: "Une el bombillo con el interruptor", como: "Con «Cable», sigue la línea punteada desde el extremo libre del bombillo.", habilidad: "cable",
        guia: { herramienta: "cable", cables: [["B1.*", "S1.*"]] }, hecho: (e) => e.tags("interruptor").some((s) => e.unidos(tagB(e), s)), logro: "Bien. Falta cerrar el camino hasta la batería." },
      { texto: "Une el interruptor con el borne −", como: "Dibuja el último cable punteado, del interruptor al −.", habilidad: "cable",
        guia: { herramienta: "cable", cables: [["S1.*", "-"]] }, hecho: (e) => !!bombilloEnSerieConInterruptor(e), logro: "¡El bombillo se encendió, y el interruptor está en su camino!" },
      { texto: "Apaga el bombillo con tu interruptor", como: "Con «Mover», un clic sobre el interruptor lo abre, como en la lección «El interruptor».", habilidad: "interruptor",
        guia: { herramienta: "seleccionar", interruptor: ["S1", false] },
        hecho: (e) => e.tags("interruptor").length > 0 && !e.interruptorCerrado(e.tags("interruptor")[0]) && !e.encendidos().length, logro: "Tu interruptor corta el camino, igual que el de la lección." },
      { texto: "Enciéndelo otra vez", como: "Otro clic sobre el interruptor lo cierra.", habilidad: "interruptor",
        guia: { interruptor: ["S1", true] }, hecho: (e) => !!bombilloEnSerieConInterruptor(e), logro: "¡Ahora controlas el bombillo!" },
    ],
    pistas: [["El interruptor debe quedar EN el camino, entre el bombillo y la batería.", { piezas: ["S1"] }],
      ["Camino: + → bombillo → interruptor → −.", { cables: [["B1.*", "S1.*"], ["S1.*", "-"]] }],
      ["Para abrir o cerrar el interruptor, usa «Mover» y haz un clic sobre él.", { herramienta: "seleccionar", piezas: ["S1"] }]],
    cierre: cierreInterruptor,
  },
  {
    clave: "lab_serie", nivel: 2, titulo: "Dos bombillos en serie", icono: "bombillo", requiere: "serie",
    resumen: "Un solo camino para dos bombillos.",
    objetivo: "Conecta los dos bombillos en serie: uno detrás del otro, en un solo camino.",
    aprendes: "A construir con tus manos el circuito en serie de la lección.",
    herramientas: ["seleccionar", "cable"],
    circuito: definicion([[2, 2], [7, 2], 12], { bombillos: [[[2, 5], [2, 7], 10], [[2, 10], [2, 12], 10]] }),
    pasos: [
      { texto: "Enciende los dos bombillos en serie", hecho: (e) => e.tipo === "serie" && e.encendidos().length === 2,
        logro: (e) => `Cada uno recibe ${VV(e.datos(e.tags("bombillo")[0]).V)}: la mitad del voltaje, como viste en la lección.`,
        pistas: [["En serie la corriente pasa primero por un bombillo y luego por el otro.", { piezas: ["B1", "B2"] }],
          ["Camino: + → B1 → B2 → −.", { puntos: ["+", "B1.a", "B1.b", "B2.a", "B2.b", "-"] }],
          ["Necesitas 3 cables: + con B1, B1 con B2, y B2 con −.", { cables: C_SERIE }]] },
      { texto: "Corta el camino en cualquier punto", hecho: (e) => !e.cerrado && !e.corto && e.cuantos("bombillo") === 2,
        logro: "Se apagaron los DOS: en serie hay un solo camino.", pistas: [["Borra cualquiera de tus cables.", { herramienta: "seleccionar", borrar: true }]] },
      { texto: "Vuelve a encenderlos", hecho: (e) => e.tipo === "serie" && e.encendidos().length === 2, pistas: [["Dibuja otra vez el cable que borraste.", { cables: C_SERIE }]] },
    ],
    cierre: cierreSerie,
  },
  {
    clave: "lab_paralelo", nivel: 2, titulo: "Dos bombillos en paralelo", icono: "cable", requiere: "paralelo",
    resumen: "Cada bombillo con su propia rama.",
    objetivo: "Conecta los dos bombillos en paralelo: cada uno en su propia rama entre el + y el −.",
    aprendes: "A construir ramas y a comprobar que son independientes.",
    herramientas: ["seleccionar", "cable"],
    circuito: definicion([[2, 2], [8, 2], 12], { bombillos: [[[4, 6], [6, 6], 10], [[4, 10], [6, 10], 10]] }),
    pasos: [
      { texto: "Enciende B1 conectándolo directo a la batería", hecho: (e) => e.encendido(e.porNombre("B1")), logro: "B1 encendido con el voltaje completo.",
        pistas: [["Un cable del + a un extremo de B1 y otro del otro extremo al −.", { cables: [["+", "B1.a"], ["B1.b", "-"]] }]] },
      { texto: "Agrega B2 en su propia rama", hecho: (e) => e.tipo === "paralelo" && e.encendidos().length === 2, logro: "¡Los dos brillan igual que B1 solo! Cada rama recibe todo el voltaje.",
        pistas: [["B2 debe unir los MISMOS dos puntos que B1: la línea del + y la del −.", { puntos: ["B1.a", "B1.b", "B2.a", "B2.b"] }],
          ["Puedes llevar cables desde los extremos de B1 hasta los de B2.", { piezas: ["B1", "B2"] }],
          ["Extremo de arriba de B2 → extremo de arriba de B1. Extremo de abajo de B2 → extremo de abajo de B1.", { cables: C_PARALELO }]] },
      { texto: "Apaga solo B2, sin apagar B1", hecho: (e) => e.encendido(e.porNombre("B1")) && !e.encendido(e.porNombre("B2")), logro: "B1 siguió encendido: las ramas son independientes.",
        pistas: [["Borra un cable que solo llegue a B2.", { herramienta: "seleccionar", borrar: "B2" }]] },
    ],
    cierre: cierreParalelo,
  },
  {
    clave: "lab_general", nivel: 2, titulo: "Interruptor general", icono: "interruptor", requiere: "paralelo",
    resumen: "Un interruptor que apaga todo.",
    objetivo: "Arma dos bombillos en paralelo con UN interruptor que los apague a los dos a la vez.",
    aprendes: "Dónde poner un interruptor para que controle todo el circuito.",
    herramientas: ["seleccionar", "cable", "interruptor"],
    circuito: definicion([[2, 2], [8, 2], 12], { bombillos: [[[4, 8], [6, 8], 10], [[4, 11], [6, 11], 10]], interruptores: [[[2, 4], [2, 6], true]] }),
    pasos: [
      { texto: "Enciende los dos bombillos en paralelo", hecho: (e) => e.tipo === "paralelo" && e.encendidos().length === 2,
        pistas: [["Cada bombillo debe unir la línea del + con la del −.", { puntos: ["B1.a", "B1.b", "B2.a", "B2.b"] }],
          ["Puedes pasar por el interruptor desde ya: + → S1 → ramas.", { cables: C_GENERAL }]] },
      { texto: "Pon el interruptor de modo que apague los dos", hecho: (e) => e.encendidos().length === 2 && !!bombilloEnSerieConInterruptor(e),
        pistas: ["Toda la corriente sale del borne +. ¿Por dónde pasa antes de dividirse?",
          ["El interruptor va entre la batería y el punto donde se separan las ramas.", { piezas: ["S1"], puntos: ["+", "B1.a"] }],
          ["Camino: + → interruptor → (rama B1 y rama B2) → −.", { cables: C_GENERAL }]] },
      { texto: "Pruébalo: abre el interruptor", hecho: (e) => e.tags("interruptor").length > 0 && e.cuantos("bombillo") === 2 && !e.interruptorCerrado(e.tags("interruptor")[0]) && !e.encendidos().length,
        logro: "Se apagaron los dos a la vez.", pistas: [["Un clic sobre el interruptor.", { herramienta: "seleccionar", interruptor: ["S1", false] }]] },
    ],
    cierre: cierreGeneral,
  },
  {
    clave: "lab_casa", nivel: 3, titulo: "Como en una casa", icono: "interruptor", requiere: "serie_paralelo",
    resumen: "Cada bombillo con su propio interruptor.",
    objetivo: "Arma un circuito en el que cada interruptor encienda y apague SOLO su bombillo, sin afectar al otro.",
    aprendes: "Cómo se cablea la luz de una casa.",
    herramientas: ["seleccionar", "cable"],
    circuito: definicion([[2, 2], [9, 2], 12], { bombillos: [[[4, 8], [7, 8], 10], [[4, 12], [7, 12], 10]], interruptores: [[[2, 5], [2, 7], true], [[2, 10], [2, 12], true]] }),
    pasos: [
      { texto: "Con los dos interruptores cerrados, los dos bombillos encienden", hecho: (e) => e.cuantos("bombillo") === 2 && e.conInterruptores(Object.fromEntries(e.tags("interruptor").map((t) => [t, true]))).encendidos().length === 2 },
      { texto: "S1 apaga un solo bombillo y S2 apaga el otro", hecho: independientes },
      { texto: "Todo encendido al terminar", hecho: (e) => e.encendidos().length === 2 && independientes(e) },
    ],
    pistas: [["Las casas se cablean en paralelo: cada lámpara tiene su propia rama.", { piezas: ["B1", "B2"] }],
      ["En cada rama, el interruptor y el bombillo van en serie.", { cables: [["S1.b", "B1.a"], ["S2.b", "B2.a"]] }],
      ["Rama 1: + → S1 → B1 → −.  Rama 2: + → S2 → B2 → −.", { cables: C_CASA }]],
    cierre: cierreCasa,
  },
  {
    clave: "lab_mixto", nivel: 3, titulo: "Circuito mixto", icono: "bombillo", requiere: "serie_paralelo",
    resumen: "Serie y paralelo en el mismo circuito.",
    objetivo: "Con los tres bombillos, arma un circuito en el que uno de ellos lleve TODA la corriente y los otros dos se la repartan.",
    aprendes: "A combinar serie y paralelo.",
    herramientas: ["seleccionar", "cable"],
    circuito: definicion([[2, 2], [9, 2], 12], { bombillos: [[[2, 5], [2, 7], 10], [[4, 10], [7, 10], 10], [[4, 13], [7, 13], 10]] }),
    pasos: [
      { texto: "Los tres bombillos encendidos", hecho: (e) => e.cerrado && e.encendidos().length === 3 },
      { texto: "Uno lleva toda la corriente de la batería", hecho: (e) => e.cerrado && e.encendidos().length === 3 && e.tags("bombillo").some((t) => cerca(e.datos(t).I, e.med.I)) },
      { texto: "Los otros dos se reparten la corriente", hecho: (e) => e.tipo === "mixto" && e.encendidos().length === 3 },
    ],
    pistas: [["Un bombillo va en serie con un grupo de dos bombillos en paralelo.", { piezas: ["B1"] }],
      ["Primero conecta B2 y B3 en paralelo entre sí (sus extremos unidos de a dos).", { cables: [["B2.a", "B3.a"], ["B2.b", "B3.b"]] }],
      ["Camino: + → B1 → (B2 ∥ B3) → −.", { cables: C_MIXTO }]],
    cierre: cierreMixto,
  },
  {
    clave: "lab_60ma", nivel: 3, titulo: "Exactamente 60 mA", icono: "resistencia", requiere: "serie_paralelo",
    resumen: "Combina resistencias para lograr un valor.",
    objetivo: "Con la batería de 9 V, logra que circulen exactamente 60 mA usando al menos dos resistencias. Ninguna resistencia sola sirve.",
    aprendes: "A combinar resistencias para conseguir el valor que necesitas.",
    herramientas: ["seleccionar", "cable", "resistencia"],
    circuito: definicion([[3, 2], [7, 2], 9]),
    pasos: [
      { texto: "Al menos dos resistencias con corriente", hecho: (e) => e.cerrado && e.encendidos("resistencia").length >= 2 },
      { texto: "La batería entrega 60 mA", hecho: (e) => e.cerrado && cerca(e.med.I, 0.06) },
    ],
    pistas: [["¿Qué resistencia total necesitas? R = V / I = 9 / 0.06.", { puntos: ["+", "-"] }],
      ["Necesitas 150 Ω. Los valores disponibles son 50, 100, 200, 300 y 470 Ω: combínalos en serie o en paralelo.", { zonas: [["resistencia", [3, 5]], ["resistencia", [3, 9]]] }],
      ["En serie: 50 Ω + 100 Ω (o en paralelo: 300 Ω con 300 Ω).", { zonas: [["resistencia", [3, 5]], ["resistencia", [3, 9]]], valores: [["R1", 50], ["R2", 100]], cables: [["+", "R1.a"], ["R1.b", "R2.a"], ["R2.b", "-"]] }]],
    cierre: cierre60,
  },
  {
    clave: "lab_cero", nivel: 3, titulo: "Desde cero", icono: "bateria", requiere: "serie_paralelo",
    resumen: "Tablero vacío: tú pones todo.",
    objetivo: "En un tablero vacío, arma un circuito con una batería y dos bombillos encendidos en el que B1 brille claramente MÁS que B2.",
    aprendes: "A diseñar un circuito por tu cuenta.",
    herramientas: ["seleccionar", "cable", "bateria", "bombillo"],
    circuito: { bateria: null },
    pasos: [
      { texto: "Una batería y dos bombillos en el tablero", hecho: (e) => e.cuantos("bateria") === 1 && e.cuantos("bombillo") >= 2 },
      { texto: "B1 y B2 encendidos", hecho: (e) => e.cerrado && e.encendido(e.porNombre("B1")) && e.encendido(e.porNombre("B2")) },
      { texto: "B1 recibe al menos el doble de potencia que B2", hecho: (e) => e.cerrado && e.encendido(e.porNombre("B2")) && e.datos(e.porNombre("B1")).P >= 2 * e.datos(e.porNombre("B2")).P },
    ],
    pistas: [["Si los dos bombillos son iguales, brillan igual. Cambia el valor de uno.", { zonas: [["bateria", [2, 2]], ["bombillo", [2, 6]], ["bombillo", [5, 6]]] }],
      ["En paralelo brilla más el de MENOR resistencia; en serie, el de MAYOR.", { piezas: ["B1", "B2"] }],
      ["Ejemplo: en paralelo, B1 = 5 Ω y B2 = 22 Ω.", { zonas: [["bateria", [2, 2]], ["bombillo", [2, 6]], ["bombillo", [5, 6]]], valores: [["B1", 5], ["B2", 22]], cables: [["+", "B1.a"], ["B1.b", "-"], ["B1.a", "B2.a"], ["B1.b", "B2.b"]] }]],
    cierre: cierreCero,
  },
];
export const textoPista = (p) => (Array.isArray(p) ? p[0] : p);
export const guiaPista = (p) => (Array.isArray(p) ? p[1] : null);
