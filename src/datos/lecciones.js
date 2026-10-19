// Contenido de "Aprender": 9 lecciones hechas de tarjetas (port de lecciones.py).
import { componentesDesdeDefinicion, analizar } from "../lib/explicador.js";
import * as F from "../lib/formato.js";

export const TOLERANCIA = 0.01;

// ---------- circuitos de partida ----------
const definicion = (bateria, { resistencias = [], bombillos = [], interruptores = [], cables = [] } = {}) =>
  ({ bateria, resistencias: [...resistencias], bombillos: [...bombillos], interruptores: [...interruptores], cables: [...cables] });
const componente = (tipo, a, b, valor) => (tipo === "resistencia" ? { resistencias: [[a, b, valor]] } : { bombillos: [[a, b, valor]] });

export function circuitoSimple(voltaje, tipo, valor, interruptor = false) {
  const cables = [[[2, 10], [6, 10]], [[6, 10], [6, 2]]];
  let interruptores = [];
  if (interruptor) { interruptores = [[[2, 2], [2, 5], true]]; cables.unshift([[2, 5], [2, 7]]); }
  else cables.unshift([[2, 2], [2, 7]]);
  return definicion([[2, 2], [6, 2], voltaje], { interruptores, cables, ...componente(tipo, [2, 7], [2, 10], valor) });
}
export function circuitoSerie(voltaje, tipo, v1, v2) {
  const partes = [[[2, 4], [2, 7], v1], [[2, 9], [2, 12], v2]];
  const cables = [[[2, 2], [2, 4]], [[2, 7], [2, 9]], [[2, 12], [6, 12]], [[6, 12], [6, 2]]];
  return definicion([[2, 2], [6, 2], voltaje], { cables, [tipo === "resistencia" ? "resistencias" : "bombillos"]: partes });
}
export function circuitoParalelo(voltaje, tipo, v1, v2) {
  const partes = [[[2, 6], [8, 6], v1], [[2, 10], [8, 10], v2]];
  const cables = [[[2, 2], [2, 6]], [[2, 6], [2, 10]], [[8, 2], [8, 6]], [[8, 6], [8, 10]]];
  return definicion([[2, 2], [8, 2], voltaje], { cables, [tipo === "resistencia" ? "resistencias" : "bombillos"]: partes });
}
export function desplazar(def, filas, cols) {
  const m = (p) => [p[0] + filas, p[1] + cols];
  const b = def.bateria;
  return {
    bateria: b ? [m(b[0]), m(b[1]), b[2]] : null,
    resistencias: (def.resistencias || []).map(([a, c, x]) => [m(a), m(c), x]),
    bombillos: (def.bombillos || []).map(([a, c, x]) => [m(a), m(c), x]),
    interruptores: (def.interruptores || []).map(([a, c, x]) => [m(a), m(c), x]),
    cables: (def.cables || []).map(([a, c]) => [m(a), m(c)]),
  };
}
export function limitesDef(def) {
  let pts = def.bateria ? [def.bateria[0], def.bateria[1]] : [];
  for (const k of ["resistencias", "bombillos", "interruptores", "fusibles"]) for (const [a, b] of def[k] || []) pts.push(a, b);
  for (const [a, b] of def.cables || []) pts.push(a, b);
  if (!pts.length) return [4, 4, 6, 6];
  const fs = pts.map((p) => p[0]), cs = pts.map((p) => p[1]);
  return [Math.min(...fs), Math.max(...fs), Math.min(...cs), Math.max(...cs)];
}
export function medirDefinicion(def) {
  const { componentes, cables } = componentesDesdeDefinicion(def);
  return analizar(componentes, cables).med;
}

// ---------- ayudas ----------
export const tendencia = (antes, despues, tol = TOLERANCIA) =>
  Math.abs(despues - antes) <= tol * Math.max(Math.abs(antes), Math.abs(despues), 1e-12) ? "igual" : despues > antes ? "sube" : "baja";
export const cerca = (valor, objetivo, tol = TOLERANCIA) => Math.abs(valor - objetivo) <= tol * Math.max(Math.abs(objetivo), 1e-12);
export function veces(antes, despues) {
  if (antes <= 0 || despues <= 0) return "cambió";
  const r = despues / antes;
  if (Math.abs(r - 1) <= TOLERANCIA) return "no cambió";
  return r > 1 ? `se multiplicó por ${+r.toPrecision(3)}` : `se dividió entre ${+(1 / r).toPrecision(3)}`;
}
const c = (med, nombre) => med.componentes[nombre];
const v = (x) => `${F.gg(x)} V`;
const A = F.amperios, O = F.ohmios, W = F.vatios, VV = F.voltios;
const clave2 = (m) => `${Math.round(m.V * 1e6) / 1e6}|${Math.round(m.Req * 1e6) / 1e6}`;

function cumple(m, clave, valor) {
  if (clave === "tipo") return m.tipo === valor;
  if (["V", "I", "Req", "P"].includes(clave)) return cerca(m[clave], valor);
  const comp = m.componentes[clave];
  return !!comp && cerca(comp.R, valor);
}
export class Contexto {
  constructor(med, historial) { this.med = med; this.historial = historial; }
  get cerradas() { return this.historial.filter((m) => m && !m.abierto); }
  distintos(clave) { return new Set(this.cerradas.map((m) => Math.round(m[clave] * 1e6) / 1e6)).size; }
  visto(cond) {
    const cs = this.cerradas;
    for (let i = cs.length - 1; i >= 0; i--) if (Object.entries(cond).every(([k, x]) => cumple(cs[i], k, x))) return cs[i];
    return null;
  }
  ahora(cond = {}) {
    const m = this.med;
    return !!m && !m.abierto && Object.entries(cond).every(([k, x]) => cumple(m, k, x));
  }
}

// ---------- formulas vivas ----------
const fOhm = (m) => (m.abierto ? "Circuito abierto: no hay camino, así que I = 0" : `I = V / R  =  ${v(m.V)} / ${O(m.Req)}  =  ${A(m.I)}`);
const fCircuito = (m) => (m.abierto ? "Camino abierto  →  I = 0 mA  →  el bombillo se apaga" : `Camino cerrado  →  I = ${v(m.V)} / ${O(m.Req)} = ${A(m.I)}`);
const fSerie = (m) => { const r1 = c(m, "R1"), r2 = c(m, "R2"); return `Req = ${O(r1.R)} + ${O(r2.R)} = ${O(m.Req)}     V1 + V2 = ${VV(r1.V)} + ${VV(r2.V)} = ${v(m.V)}`; };
const fParalelo = (m) => { const r1 = c(m, "R1"), r2 = c(m, "R2"); return `I1 = ${v(m.V)} / ${O(r1.R)} = ${A(r1.I)}     I2 = ${v(m.V)} / ${O(r2.R)} = ${A(r2.I)}     I = I1 + I2 = ${A(m.I)}`; };
const fPotencia = (m) => { const b = c(m, "B1"); return `P = V × I  =  ${VV(b.V)} × ${A(b.I)}  =  ${W(b.P)}`; };
const fSP = (m) => { const b1 = c(m, "B1"), b2 = c(m, "B2"); const n = m.tipo === "serie" ? "Serie" : "Paralelo"; return `${n}:  B1 recibe ${VV(b1.V)} → ${W(b1.P)}     B2 recibe ${VV(b2.V)} → ${W(b2.P)}`; };

// ---------- controles ----------
// Pone potencia máxima al primer bombillo de una definición (4.º dato, ver Lienzo.cargarEjemplo).
const conLimite = (def, pmax) => ({ ...def, bombillos: def.bombillos.map((b, i) => (i === 0 ? [...b, pmax] : b)) });
const ctrlBateria = (opciones) => ({ id: "v", tipo: "valor", etiqueta: "Batería", componente: ["bateria", 0], opciones, unidad: "V" });
const ctrlR = (n, opciones, tipo = "resistencia", prefijo = "R") => ({ id: `${prefijo.toLowerCase()}${n}`, tipo: "valor", etiqueta: `${prefijo}${n}`, componente: [tipo, n - 1], opciones, unidad: "Ω" });

export const LECCIONES = [
  {
    clave: "resistencia", porDentro: "agua", titulo: "El circuito y la resistencia", icono: "resistencia",
    resumen: "Batería + resistencia: el circuito más simple.",
    circuito: circuitoSimple(9, "resistencia", 100),
    controles: [ctrlR(1, [50, 100, 200, 300, 470, 1000])],
    medidor: ["V", "I", "R"], formula: fOhm,
    tarjetas: [
      { tipo: "idea", titulo: "Un camino que da la vuelta",
        texto: "Un circuito eléctrico es un CAMINO CERRADO por el que se mueve la corriente. En el tablero tienes el circuito más simple que existe: una batería, una resistencia (R1) y dos cables que las unen.\n\nLa corriente sale del borne + de la batería, recorre el cable, atraviesa R1 y regresa por el cable de abajo hasta el borne −. Como el camino no tiene cortes, la corriente puede dar la vuelta una y otra vez.",
        fijate: ["Los puntos amarillos que se mueven son la corriente.", "Las flechas marcan su sentido: del + al −, por fuera de la batería.", "Debajo de R1 está lo que mide: voltaje, corriente y potencia."],
        analogia: "Como una pista de carreras cerrada: los autos solo pueden dar vueltas si la pista está completa, sin tramos cortados." },
      { tipo: "idea", titulo: "¿Qué hace una resistencia?",
        texto: "Una resistencia es una pieza que FRENA el paso de la corriente. Cuanto mayor es su valor, más difícil le resulta a la corriente atravesarla. Se mide en ohmios (símbolo Ω).\n\nLa corriente se mide en amperios (A). Como en estos circuitos los valores son pequeños, usamos miliamperios: 1 A = 1000 mA. Ahora mismo, con 100 Ω, pasan 90 mA.\n\nLas franjas de colores de R1 no son decoración: son un código que dice su valor, para poder leerlo en una pieza real.",
        analogia: "Una resistencia es como un tubo estrecho en una tubería: con el mismo empuje, por un tubo más estrecho pasa menos agua cada segundo." },
      { tipo: "explora", titulo: "Frena la corriente",
        texto: "Usa el control de R1 (abajo del tablero, o haz clic sobre R1) y prueba al menos 3 valores distintos. Mira la velocidad de los puntos y la ficha de CORRIENTE.",
        meta: (ctx) => ctx.distintos("Req") >= 3, progreso: (ctx) => `Valores probados: ${Math.min(ctx.distintos("Req"), 3)} de 3`,
        descubre: "Con más resistencia los puntos van más despacio y la corriente baja; con menos resistencia, todo se acelera. La batería es la misma en todos los casos: lo único que cambió fue cuánto frena R1. Por eso una resistencia sirve para CONTROLAR cuánta corriente pasa.",
        resaltar: "I" },
      { tipo: "explora", titulo: "Duplica la oposición",
        texto: "Pon R1 en 100 Ω y mira la corriente. Después ponla en 200 Ω (el doble). ¿La corriente baja un poco, o baja a la mitad?",
        meta: (ctx) => !!(ctx.visto({ R1: 100 }) && ctx.visto({ R1: 200 })),
        progreso: (ctx) => (ctx.visto({ R1: 100 }) && !ctx.visto({ R1: 200 }) ? "Ahora pon 200 Ω" : ctx.visto({ R1: 200 }) ? "Ahora pon 100 Ω" : "Empieza con 100 Ω"),
        descubre: (ctx) => `Con 100 Ω pasaban ${A(ctx.visto({ R1: 100 }).I)}; con 200 Ω, ${A(ctx.visto({ R1: 200 }).I)}. El doble de resistencia dejó pasar exactamente la MITAD de corriente. No es casualidad: si R se multiplica por un número, la corriente se divide entre ese mismo número.`,
        resaltar: "I" },
      { tipo: "explora", titulo: "Lee las franjas",
        texto: "Pon R1 en 1 kΩ (1000 Ω) y mira cómo cambian sus franjas de color.",
        meta: (ctx) => ctx.ahora({ R1: 1000 }),
        descubre: (ctx) => `Con 1 kΩ pasan solo ${A(ctx.med.I)}. Sus franjas son marrón (1), negro (0) y rojo (×100): «10 × 100 = 1000 Ω». La primera y la segunda franja son dígitos; la tercera dice cuántos ceros agregar. La franja dorada es la tolerancia.`,
        ejemplo: { enunciado: "¿Qué valor tiene una resistencia amarillo-violeta-marrón?", pasos: ["Amarillo = 4 y violeta = 7: los dos primeros dígitos son 47.", "Marrón = ×10: se agrega un cero.", "47 × 10 = 470 Ω. Pruébala en el control de R1."] },
        resaltar: "I" },
      { tipo: "reto", titulo: "Reto: consigue 30 mA",
        texto: "La batería es de 9 V. Elige la resistencia que deja pasar exactamente 30 mA.",
        meta: (ctx) => ctx.ahora({ I: 0.03 }),
        pistas: ["30 mA es menos que los 90 mA de 100 Ω: necesitas más resistencia.", "90 mA ÷ 3 = 30 mA. ¿Por cuánto tienes que multiplicar los 100 Ω?", "300 Ω: el triple de resistencia, un tercio de corriente."],
        solucion: { r1: 300 },
        logro: "Con 300 Ω pasan 30 mA. Triplicaste la resistencia y la corriente se dividió entre 3: usaste la proporción que acabas de descubrir." },
      { tipo: "pregunta",
        texto: "Con la misma batería cambias una resistencia de 200 Ω por una de 50 Ω. La corriente…",
        opciones: [["sube", "Aumenta: se multiplica por 4", "Correcto: 50 Ω es la cuarta parte de 200 Ω, así que frena 4 veces menos y pasa 4 veces más corriente."],
          ["baja", "Disminuye", "Al revés: 50 Ω es MENOS oposición. Menos freno → más corriente."],
          ["igual", "No cambia", "La corriente depende de la resistencia: lo viste al mover el control."]],
        correcta: "sube" },
      { tipo: "resumen", puntos: ["Un circuito es un camino cerrado: del + al −, pasando por las piezas.", "La resistencia frena la corriente; se mide en ohmios (Ω).", "El doble de resistencia deja pasar la mitad de corriente."] },
    ],
  },
  {
    clave: "voltaje", porDentro: "agua", titulo: "Voltaje", icono: "bateria", resumen: "El empuje que da la batería.",
    circuito: circuitoSimple(4.5, "resistencia", 100),
    controles: [ctrlBateria([1.5, 3, 4.5, 6, 9, 12])],
    medidor: ["V", "I", "R"], formula: fOhm,
    tarjetas: [
      { tipo: "idea", titulo: "El empuje eléctrico",
        texto: "La resistencia frena la corriente, pero ¿quién la empuja? La batería. Ese empuje se llama VOLTAJE y se mide en voltios (V).\n\nUna pila AA tiene 1.5 V; la batería de un carro, 12 V; un enchufe de casa, unos 110 o 220 V. A más voltaje, más fuerte empuja la batería a las cargas eléctricas por el camino.\n\nEl circuito es el mismo de la lección anterior, pero ahora R1 queda fija en 100 Ω y lo que vas a cambiar es la batería.",
        fijate: ["La ficha VOLTAJE muestra el empuje de la batería.", "El número junto a la batería en el tablero también cambia."],
        analogia: "Es como la altura de un tanque de agua: cuanto más alto está, con más fuerza baja el agua por la tubería." },
      { tipo: "explora", titulo: "Juega con el empuje",
        texto: "Mueve el control de la batería y prueba al menos 3 voltajes distintos. Mira la velocidad de los puntos y la ficha de CORRIENTE.",
        meta: (ctx) => ctx.distintos("V") >= 3, progreso: (ctx) => `Voltajes probados: ${Math.min(ctx.distintos("V"), 3)} de 3`,
        descubre: "Más voltaje → los puntos van más rápido y la corriente sube. Menos voltaje → todo se frena. La resistencia (100 Ω) no cambió: la diferencia la hace solo el empuje.",
        resaltar: "I" },
      { tipo: "explora", titulo: "¿Qué pasa si lo duplicas?",
        texto: "Pon la batería en 3 V y mira la corriente. Luego ponla en 6 V (el doble).",
        meta: (ctx) => !!(ctx.visto({ V: 3 }) && ctx.visto({ V: 6 })),
        progreso: (ctx) => (ctx.visto({ V: 3 }) && !ctx.visto({ V: 6 }) ? "Ahora pon 6 V" : ctx.visto({ V: 6 }) ? "Ahora pon 3 V" : "Empieza con 3 V"),
        descubre: (ctx) => `Con 3 V: ${A(ctx.visto({ V: 3 }).I)}. Con 6 V: ${A(ctx.visto({ V: 6 }).I)}. ¡El doble de empuje dio el doble de corriente! Voltaje y corriente son PROPORCIONALES: si uno se multiplica por 3, el otro también. Fíjate que es lo contrario de la resistencia, que dividía la corriente.`,
        resaltar: "I" },
      { tipo: "reto", titulo: "Reto: consigue 90 mA",
        texto: "Elige el voltaje que hace pasar exactamente 90 mA por la resistencia.",
        meta: (ctx) => ctx.ahora({ I: 0.09 }),
        pistas: ["La resistencia sigue siendo 100 Ω.", "Con 3 V pasaban 30 mA: cada voltio aporta 10 mA.", "90 mA ÷ 10 mA por voltio = 9 V."],
        solucion: { v: 9 },
        logro: "9 V con 100 Ω dan 90 mA. Razonaste «cada voltio aporta 10 mA»: eso es exactamente la regla que en unas lecciones se llamará Ley de Ohm." },
      { tipo: "pregunta", texto: "Con la misma resistencia, cambias una batería de 3 V por una de 12 V. La corriente…",
        opciones: [["x4", "Se multiplica por 4", "Correcto: 12 V es 4 veces 3 V, y con la misma resistencia la corriente crece en la misma proporción."],
          ["x2", "Se duplica", "Casi: duplicar sería pasar de 3 V a 6 V. ¿Cuántas veces cabe 3 en 12?"],
          ["igual", "No cambia", "Recuerda lo que viste: al subir el voltaje los puntos iban más rápido."]], correcta: "x4" },
      { tipo: "resumen", puntos: ["El voltaje es el empuje de la batería (voltios, V).", "Con la misma resistencia, más voltaje → más corriente.", "Si el voltaje se multiplica por 2, la corriente también."] },
    ],
  },
  {
    clave: "corriente", porDentro: "electrones", titulo: "Corriente", icono: "cable", resumen: "La carga que circula: ¿se gasta por el camino?",
    circuito: circuitoSerie(9, "resistencia", 100, 200),
    controles: [ctrlR(1, [100, 200, 300]), ctrlR(2, [100, 200, 300])],
    medidor: ["V", "I", "R"],
    formula: (m) => `I(R1) = ${A(c(m, "R1").I)}     I(R2) = ${A(c(m, "R2").I)}     I de la batería = ${A(m.I)}`,
    tarjetas: [
      { tipo: "idea", titulo: "Carga en movimiento",
        texto: "La corriente es la cantidad de carga eléctrica que pasa por un punto cada segundo. Ya la mediste en mA; ahora toca entender CÓMO se comporta a lo largo del camino.\n\nEl circuito ahora tiene una pieza más: dos resistencias, R1 y R2, una después de la otra en el MISMO camino. Toda la corriente que sale de la batería tiene que atravesar R1 y luego R2 para volver.\n\nUna idea muy común (y equivocada) es que la corriente «se gasta» en la primera pieza y le llega menos a la segunda. Vas a comprobarlo.",
        fijate: ["Debajo de R1 y de R2 el tablero muestra la corriente de cada una.", "La fórmula EN VIVO compara las dos corrientes con la de la batería."],
        analogia: "Como contar cuántos carros pasan por un peaje cada segundo: si la carretera no tiene salidas, los mismos carros pasan por todos los peajes." },
      { tipo: "explora", titulo: "Cambia una sola resistencia", texto: "Pon R2 en 300 Ω y vuelve a comparar la corriente de R1 y de R2.",
        meta: (ctx) => ctx.ahora({ R2: 300 }),
        descubre: (ctx) => `Ahora pasan ${A(c(ctx.med, "R1").I)} por R1 y ${A(c(ctx.med, "R2").I)} por R2: siguen siendo iguales. Al frenar más en R2 la corriente bajó en las dos a la vez, porque es un único camino: lo que pasa por un punto tiene que pasar por todos.`,
        resaltar: "I" },
      { tipo: "pregunta", texto: "Si la corriente no se gasta al pasar por R1, ¿qué es lo que «usa» una resistencia?",
        opciones: [["energia", "Energía: la convierte en calor", "¡Exacto! La corriente sigue igual; lo que se transforma es la energía (por eso las resistencias se calientan y los bombillos dan luz)."],
          ["corriente", "Una parte de la corriente", "Si fuera así, por R2 pasaría menos que por R1. Pero el tablero mostró lo mismo en las dos."],
          ["cable", "El cable", "Los cables solo son el camino: no se gastan."]], correcta: "energia" },
      { tipo: "reto", titulo: "Reto: la corriente más pequeña", texto: "Mueve R1 y R2 hasta conseguir la corriente MÁS PEQUEÑA posible en este circuito.",
        meta: (ctx) => ctx.ahora({ R1: 300, R2: 300 }),
        pistas: ["Cada resistencia frena la corriente un poco.", "Si las dos frenan más, ¿la corriente sube o baja?", "Pon R1 y R2 en su valor más alto."],
        solucion: { r1: 300, r2: 300 },
        logro: (ctx) => `Con R1 y R2 en 300 Ω pasan solo ${A(ctx.med.I)}, igual en las dos. Los dos frenos se acumulan: el camino entero frena más que cada pieza por separado.` },
      { tipo: "pregunta", texto: "En un circuito de un solo camino, por el primer componente pasan 20 mA. ¿Cuánto pasa por el último?",
        opciones: [["20", "20 mA", "Correcto: en un único camino la corriente es la misma en todos los puntos."],
          ["menos", "Menos de 20 mA", "Eso supondría que la corriente se gasta. Recuerda R1 y R2: siempre iguales."],
          ["cero", "0 mA, ya se gastó", "Si llegara 0 mA al final, la corriente no podría volver a la batería."]], correcta: "20" },
      { tipo: "resumen", puntos: ["En un solo camino, la corriente es igual en todos los puntos.", "La corriente no se gasta: lo que se transforma es la energía.", "Varias resistencias en el camino frenan más que una sola."] },
    ],
  },
  {
    clave: "circuito", porDentro: "agua", titulo: "El interruptor", icono: "interruptor", resumen: "Abrir y cerrar el camino de la corriente.",
    circuito: circuitoSimple(9, "bombillo", 10, true),
    controles: [{ id: "s1", tipo: "interruptor", etiqueta: "Interruptor S1", componente: ["interruptor", 0] }],
    medidor: ["V", "I", "R"], formula: fCircuito,
    tarjetas: [
      { tipo: "idea", titulo: "Dos piezas nuevas",
        texto: "Este circuito trae dos piezas nuevas:\n\n•  Un BOMBILLO (B1). Por dentro es una resistencia muy fina que se pone tan caliente que brilla. Cuanta más corriente pasa, más brilla.\n•  Un INTERRUPTOR (S1). Es un trozo de camino que se puede abrir o cerrar, como el de la luz de tu cuarto.\n\nYa sabes que la corriente solo circula si el camino está cerrado. El interruptor te deja abrir y cerrar ese camino cuando quieras.",
        fijate: ["S1 está CERRADO (placa verde): el camino está completo.", "B1 brilla porque le llega corriente.", "La ficha RESISTENCIA TOTAL muestra cuánto frena el camino completo."] },
      { tipo: "explora", titulo: "Corta el camino",
        texto: "Haz clic sobre el interruptor S1 en el tablero (o usa el control de abajo) para abrirlo. Fíjate en los puntos, en el bombillo y en la ficha de RESISTENCIA TOTAL.",
        meta: (ctx) => !!ctx.med && ctx.med.abierto,
        descubre: "El bombillo se apagó y los puntos se detuvieron en TODO el circuito, no solo después del interruptor. La resistencia total pasó a ser infinita: un camino abierto es como una resistencia gigante que no deja pasar nada.",
        resaltar: "I" },
      { tipo: "explora", titulo: "Vuelve a cerrarlo", texto: "Cierra otra vez el interruptor y observa qué pasa con la corriente.",
        meta: (ctx) => ctx.ahora() && ctx.med.I > 0,
        descubre: (ctx) => `Al cerrar el camino la corriente vuelve al instante: ${A(ctx.med.I)} en todo el lazo. Un interruptor no crea ni gasta corriente: solo abre o cierra el camino.`,
        resaltar: "I" },
      { tipo: "pregunta", texto: "Con el interruptor abierto, ¿en qué parte del circuito hay corriente?",
        opciones: [["nada", "En ninguna: se detiene en todo el circuito", "Exacto. La corriente solo circula si puede volver a la batería."],
          ["antes", "Solo entre el borne + y el interruptor", "Es una idea muy común, pero la corriente no «llena» el cable hasta el corte. Si el camino no se cierra, no circula en ningún tramo."],
          ["debil", "En el bombillo, pero más débil", "Mira el medidor con el interruptor abierto: marca 0 mA. El bombillo no recibe nada."]], correcta: "nada" },
      { tipo: "idea", titulo: "Las cuatro partes de un circuito",
        texto: "Ya conoces todas las partes de un circuito:\n\n•  Fuente: la batería. Da el empuje (voltaje).\n•  Conductores: los cables. Son el camino.\n•  Receptores: bombillos y resistencias. Usan la energía.\n•  Control: el interruptor. Abre o cierra el camino.\n\nCualquier circuito, desde una linterna hasta la instalación de una casa, está hecho de estas cuatro partes." },
      { tipo: "pregunta", texto: "Tienes una batería, un bombillo y dos cables. ¿Cuál montaje enciende el bombillo?",
        opciones: [["dos", "Un cable del + a un lado del bombillo, y otro del otro lado al −", "¡Sí! Así la corriente puede salir del +, atravesar el bombillo y volver por el −."],
          ["uno", "Los dos cables del + al mismo lado del bombillo", "La corriente llegaría al bombillo, pero no tendría por dónde volver a la batería."],
          ["mm", "Un cable del + al −, y el bombillo aparte", "¡Cuidado! Eso es un cortocircuito: la corriente vuelve sin pasar por el bombillo y la batería se descarga muy rápido."]], correcta: "dos" },
      { tipo: "resumen", puntos: ["El interruptor abre o cierra el camino de la corriente.", "Con el camino abierto no hay corriente en ninguna parte.", "Un bombillo es una resistencia que brilla con la corriente."] },
    ],
  },
  {
    clave: "ohm", porDentro: "agua", titulo: "Ley de Ohm", icono: "resistencia", resumen: "I = V / R: la relación que une todo.",
    circuito: circuitoSimple(6, "resistencia", 100),
    controles: [ctrlBateria([3, 6, 9, 12]), ctrlR(1, [100, 200, 300])],
    medidor: ["V", "I", "R"], formula: fOhm,
    tarjetas: [
      { tipo: "idea", titulo: "Una regla que une todo",
        texto: "Ya descubriste dos cosas: con más voltaje pasa más corriente, y con más resistencia pasa menos. La Ley de Ohm junta las dos en una sola fórmula: la corriente es el empuje dividido entre el freno.\n\nCon esta fórmula ya no hace falta probar: puedes CALCULAR la corriente antes de armar el circuito.",
        formula: "I = V / R",
        simbolos: [["I", "corriente, en amperios (A)"], ["V", "voltaje, en voltios (V)"], ["R", "resistencia, en ohmios (Ω)"]],
        ejemplo: { enunciado: "Una batería de 6 V con una resistencia de 200 Ω. ¿Cuánta corriente pasa?", pasos: ["Escribe la fórmula: I = V / R.", "Reemplaza: I = 6 V / 200 Ω.", "Divide: 6 ÷ 200 = 0.03 A.", "Pasa a mA (× 1000): 0.03 A = 30 mA. Compruébalo con los controles."] } },
      { tipo: "explora", titulo: "Llena la tabla",
        texto: "Haz 4 combinaciones distintas de batería y resistencia. Cada una se anota sola en la tabla. Compara la columna «V ÷ R» con la corriente medida.",
        tabla: true,
        meta: (ctx) => new Set(ctx.cerradas.map(clave2)).size >= 4,
        progreso: (ctx) => `Combinaciones: ${Math.min(new Set(ctx.cerradas.map(clave2)).size, 4)} de 4`,
        descubre: "En cada fila, V ÷ R da exactamente la corriente medida. No importa qué valores elijas: la regla siempre se cumple. Eso es lo que hace útil a una ley: predice el resultado sin tener que medirlo." },
      { tipo: "reto", titulo: "Reto: dos caminos a 60 mA", texto: "Encuentra DOS combinaciones distintas de batería y resistencia que den exactamente 60 mA.",
        tabla: true,
        meta: (ctx) => new Set(ctx.cerradas.filter((m) => cerca(m.I, 0.06)).map(clave2)).size >= 2,
        progreso: (ctx) => `Combinaciones con 60 mA: ${Math.min(new Set(ctx.cerradas.filter((m) => cerca(m.I, 0.06)).map(clave2)).size, 2)} de 2`,
        pistas: ["I = V / R: necesitas que V ÷ R = 0.06.", "6 V / 100 Ω = 60 mA. Si duplicas V, ¿qué tienes que hacer con R?", "Sirven 6 V con 100 Ω y 12 V con 200 Ω."],
        solucion: [{ v: 6, r1: 100 }, { v: 12, r1: 200 }],
        logro: "Lo que importa es la razón V / R, no cada valor por separado: si los dos se multiplican por lo mismo, la corriente no cambia." },
      { tipo: "pregunta", texto: "Una batería de 9 V alimenta una resistencia de 450 Ω. ¿Cuál es la corriente?",
        opciones: [["20", "20 mA", "Correcto: 9 / 450 = 0.02 A = 20 mA."], ["50", "50 mA", "Revisa la división: 9 ÷ 450 = 0.02 A. ¿Cuántos mA son?"], ["4050", "4050 mA", "Eso es multiplicar 9 × 450. La Ley de Ohm divide: V / R."]], correcta: "20" },
      { tipo: "idea", titulo: "La misma ley, despejada",
        texto: "La fórmula también sirve al revés. Si conoces dos de las tres magnitudes, siempre puedes calcular la tercera:\n\n•  I = V / R   (la corriente)\n•  V = I × R   (el voltaje)\n•  R = V / I   (la resistencia)",
        ejemplo: { enunciado: "Por un bombillo conectado a 12 V pasan 0.5 A. ¿Cuál es su resistencia?", pasos: ["Buscas R, así que usas R = V / I.", "Reemplaza: R = 12 V / 0.5 A.", "Divide: 12 ÷ 0.5 = 24 Ω."] } },
      { tipo: "pregunta", texto: "Por una resistencia de 100 Ω pasan 0.05 A. ¿Qué voltaje tiene la batería?",
        opciones: [["5", "5 V", "Correcto: V = I × R = 0.05 × 100 = 5 V."], ["2000", "2000 V", "Eso es dividir 100 ÷ 0.05. Para el voltaje se multiplica: V = I × R."], ["0.0005", "0.0005 V", "Eso es dividir 0.05 ÷ 100. Para el voltaje se multiplica: V = I × R."]], correcta: "5" },
      { tipo: "resumen", puntos: ["I = V / R une voltaje, corriente y resistencia.", "También sirve despejada: V = I × R y R = V / I.", "Si V y R se multiplican por lo mismo, I no cambia."], formula: "I = V / R" },
    ],
  },
  {
    clave: "serie", titulo: "Circuito en serie", icono: "resistencia", resumen: "Uno tras otro: cómo se reparte el voltaje.",
    circuito: circuitoSerie(12, "resistencia", 100, 200),
    controles: [ctrlR(1, [100, 200, 300]), ctrlR(2, [100, 200, 300])],
    medidor: ["V", "I", "R"], formula: fSerie,
    tarjetas: [
      { tipo: "idea", titulo: "Uno tras otro",
        texto: "Cuando las piezas van una detrás de otra en un solo camino, se dice que están EN SERIE. Ya sabes dos cosas de este circuito: la corriente es la misma en todas las piezas, y los frenos se acumulan.\n\nAhora vas a descubrir qué pasa con el VOLTAJE: la batería da 12 V en total, pero ¿cuánto le toca a cada resistencia?\n\nCon la Ley de Ohm, el voltaje de cada pieza es V = I × R: como la I es la misma para todas, la pieza con más R se lleva más voltaje.",
        fijate: ["Debajo de R1 y de R2 está el voltaje que recibe cada una.", "La fórmula EN VIVO suma los dos voltajes."],
        analogia: "Como una fila de puertas: todo el que pasa tiene que cruzarlas todas, y en cada puerta pierde un poco de impulso." },
      { tipo: "explora", titulo: "Iguálalas", texto: "Pon R1 y R2 en el mismo valor. Mira cuánto voltaje recibe cada una.",
        meta: (ctx) => ctx.ahora() && cerca(c(ctx.med, "R1").R, c(ctx.med, "R2").R),
        descubre: (ctx) => `Con resistencias iguales, los ${v(ctx.med.V)} se reparten mitad y mitad: ${VV(c(ctx.med, "R1").V)} y ${VV(c(ctx.med, "R2").V)}. Misma corriente y misma R → mismo V = I × R.` },
      { tipo: "explora", titulo: "Ahora hazlas distintas", texto: "Pon R1 = 100 Ω y R2 = 300 Ω. ¿Cuál se lleva más voltaje?",
        meta: (ctx) => ctx.ahora({ R1: 100, R2: 300 }),
        descubre: (ctx) => `R2 recibe ${VV(c(ctx.med, "R2").V)}, tres veces más que R1 (${VV(c(ctx.med, "R1").V)}). La resistencia mayor se lleva más voltaje, y entre las dos suman ${v(ctx.med.V)}: la batería reparte su empuje en proporción a cada R.` },
      { tipo: "reto", titulo: "Reto: 9 V para R1", texto: "Haz que R1 reciba exactamente 9 V de los 12 V de la batería.",
        meta: (ctx) => ctx.ahora() && cerca(c(ctx.med, "R1").V, 9),
        pistas: ["9 V es 3/4 del total: R1 tiene que ser la mayor.", "R1 debe ser el triple de R2.", "R1 = 300 Ω y R2 = 100 Ω."],
        solucion: { r1: 300, r2: 100 },
        logro: "R1 = 300 Ω y R2 = 100 Ω: 300 / 400 = 3/4 de la resistencia total, así que recibe 3/4 de los 12 V = 9 V." },
      { tipo: "idea", titulo: "La resistencia equivalente",
        texto: "Como los frenos se acumulan, dos resistencias en serie se comportan como UNA sola resistencia igual a su suma. A esa suma se le llama resistencia equivalente (Req).",
        formula: "Req = R1 + R2",
        simbolos: [["Req", "la resistencia que «ve» la batería"], ["R1, R2", "cada resistencia del camino"]],
        ejemplo: { enunciado: "R1 = 100 Ω y R2 = 200 Ω con 12 V. ¿Cuánta corriente pasa?", pasos: ["Suma las resistencias: Req = 100 + 200 = 300 Ω.", "Aplica la Ley de Ohm: I = 12 V / 300 Ω = 0.04 A.", "En mA: 40 mA, la misma en R1 y en R2."] } },
      { tipo: "pregunta", texto: "Conectas en serie una resistencia de 100 Ω y otra de 300 Ω. ¿Cuál es la resistencia equivalente?",
        opciones: [["400", "400 Ω", "Correcto: en serie se suman, 100 + 300 = 400 Ω."], ["75", "75 Ω", "Ese sería el resultado en paralelo. En serie la corriente tiene que vencer las dos: se suman."], ["200", "200 Ω", "Ese es el promedio. En serie las oposiciones se acumulan."]], correcta: "400" },
      { tipo: "resumen", puntos: ["En serie el voltaje se reparte: la mayor R recibe más.", "Los voltajes de las piezas suman el de la batería.", "Las resistencias se suman: Req = R1 + R2."], formula: "Req = R1 + R2   ·   V = V1 + V2" },
    ],
  },
  {
    clave: "paralelo", titulo: "Circuito en paralelo", icono: "cable", resumen: "Varias ramas, el mismo voltaje.",
    circuito: circuitoParalelo(12, "resistencia", 100, 200),
    controles: [ctrlR(1, [100, 200, 300]), ctrlR(2, [100, 200, 300])],
    medidor: ["V", "I", "R"], formula: fParalelo,
    tarjetas: [
      { tipo: "idea", titulo: "Varios caminos",
        texto: "En serie había un solo camino. EN PARALELO cada pieza tiene su propia rama, y todas las ramas unen los mismos dos puntos: la línea del + y la línea del −.\n\nPor eso cada rama recibe el voltaje COMPLETO de la batería (no se reparte, como en serie). Lo que se reparte ahora es la CORRIENTE: al llegar a la bifurcación, una parte va por cada rama y luego se vuelven a juntar.",
        fijate: ["Las dos ramas reciben 12 V: míralo debajo de R1 y de R2.", "La corriente de la batería es la suma de las dos ramas."],
        analogia: "Como las cajas de un supermercado: cada caja es un camino, y la gente se reparte entre ellas. Abrir otra caja hace que pase más gente en total." },
      { tipo: "explora", titulo: "Cambia una rama", texto: "Pon R2 en 300 Ω. Fíjate en el voltaje de cada rama y en la corriente de R1.",
        meta: (ctx) => ctx.ahora({ R2: 300 }),
        descubre: (ctx) => `Las dos ramas siguen recibiendo ${v(ctx.med.V)}. Por R1 siguen pasando ${A(c(ctx.med, "R1").I)}: cambiar una rama no afecta a la otra. Solo bajó la corriente de R2 (y con ella, la total).` },
      { tipo: "explora", titulo: "Ramas iguales", texto: "Pon R1 y R2 en el mismo valor y mira cómo se reparte la corriente.",
        meta: (ctx) => ctx.ahora() && cerca(c(ctx.med, "R1").R, c(ctx.med, "R2").R),
        descubre: (ctx) => `Cada rama lleva ${A(c(ctx.med, "R1").I)} y la batería entrega la suma: ${A(ctx.med.I)}. La resistencia equivalente (${O(ctx.med.Req)}) es la MITAD de una rama: dos caminos conducen el doble.` },
      { tipo: "reto", titulo: "Reto: 240 mA de la batería", texto: "Haz que la batería entregue exactamente 240 mA en total.",
        meta: (ctx) => ctx.ahora({ I: 0.24 }),
        pistas: ["La corriente total es la suma de las dos ramas: I = I1 + I2.", "Cada rama recibe 12 V. 240 mA = 120 mA + 120 mA.", "12 V / 100 Ω = 120 mA: pon las dos en 100 Ω."],
        solucion: { r1: 100, r2: 100 },
        logro: "120 mA + 120 mA = 240 mA. En paralelo las corrientes de las ramas se suman." },
      { tipo: "idea", titulo: "Calcular un paralelo",
        texto: "Para resolver un paralelo, calcula cada rama por separado con la Ley de Ohm (todas tienen el voltaje de la batería) y luego suma las corrientes.",
        formula: "I = I1 + I2",
        simbolos: [["I1, I2", "corriente de cada rama: V / R1 y V / R2"], ["I", "corriente que entrega la batería"]],
        ejemplo: { enunciado: "12 V con R1 = 100 Ω y R2 = 300 Ω en paralelo.", pasos: ["Rama 1: I1 = 12 / 100 = 0.12 A = 120 mA.", "Rama 2: I2 = 12 / 300 = 0.04 A = 40 mA.", "Total: I = 120 + 40 = 160 mA.", "Req = V / I = 12 / 0.16 = 75 Ω: menor que cualquier rama."] } },
      { tipo: "pregunta", texto: "Si agregas otra rama en paralelo, la resistencia equivalente…",
        opciones: [["baja", "Disminuye", "Correcto: cada rama nueva es un camino extra, la batería entrega más corriente y Req = V / I baja."], ["sube", "Aumenta", "Eso pasa en serie. En paralelo, ¿abrir otra caja en el supermercado hace la fila más lenta o más rápida?"], ["igual", "No cambia", "Piensa en la corriente total: con una rama más, ¿la batería entrega lo mismo?"]], correcta: "baja" },
      { tipo: "resumen", puntos: ["En paralelo todas las ramas reciben el mismo voltaje.", "La corriente se reparte: pasa más por la rama de menor R.", "La corriente total es la suma, y Req es menor que cualquier rama."], formula: "I = I1 + I2   ·   1/Req = 1/R1 + 1/R2" },
    ],
  },
  {
    clave: "potencia", porDentro: "filamento", titulo: "Potencia eléctrica", icono: "bombillo", resumen: "La energía por segundo: el brillo.",
    circuito: circuitoSimple(6, "bombillo", 10),
    controles: [ctrlBateria([3, 6, 9, 12]), ctrlR(1, [5, 10, 22, 47], "bombillo", "B")],
    medidor: ["V", "I", "P"], formula: fPotencia,
    tarjetas: [
      { tipo: "idea", titulo: "Energía cada segundo",
        texto: "Ya sabes que una resistencia o un bombillo no gastan corriente: transforman ENERGÍA. La POTENCIA dice cuánta energía reciben cada segundo, y se mide en vatios (W).\n\nEn un bombillo, más potencia significa más brillo. Un foco LED de casa usa unos 9 W; una plancha, unos 1000 W.\n\nLa potencia depende de las dos cosas que ya conoces: el empuje (V) y la corriente (I). Si cualquiera de las dos crece, la potencia crece.",
        formula: "P = V × I",
        simbolos: [["P", "potencia, en vatios (W)"], ["V", "voltaje (V)"], ["I", "corriente (A)"]],
        ejemplo: { enunciado: "El bombillo de 10 Ω está conectado a 6 V. ¿Qué potencia recibe?", pasos: ["Primero la corriente: I = 6 V / 10 Ω = 0.6 A.", "Luego la potencia: P = 6 V × 0.6 A = 3.6 W.", "Compáralo con la ficha POTENCIA."] } },
      { tipo: "explora", titulo: "Haz que brille más", texto: "Usa los controles para que el bombillo brille bastante más que ahora (al menos 1.5 veces más potencia).",
        meta: (ctx) => ctx.ahora() && ctx.med.P >= 1.5 * 3.6,
        descubre: (ctx) => `Ahora recibe ${W(ctx.med.P)} (antes 3.6 W). Para lograrlo hay dos caminos: subir el voltaje o bajar la resistencia del bombillo. Los dos aumentan la corriente, y con ella la potencia.`,
        resaltar: "P" },
      { tipo: "explora", titulo: "¿Y la potencia?",
        texto: "Ya sabes que al duplicar el voltaje la corriente se duplica. Con el bombillo de 10 Ω, pon la batería en 6 V y después en 12 V: ¿qué le pasa a la POTENCIA?",
        meta: (ctx) => !!(ctx.visto({ V: 6, B1: 10 }) && ctx.visto({ V: 12, B1: 10 })),
        progreso: (ctx) => (ctx.visto({ V: 6, B1: 10 }) ? "Ahora pon 12 V" : "Primero: B1 en 10 Ω y batería en 6 V"),
        descubre: (ctx) => { const a = ctx.visto({ V: 6, B1: 10 }), b = ctx.visto({ V: 12, B1: 10 });
          return `La corriente se duplicó (${A(a.I)} → ${A(b.I)}), pero la potencia se multiplicó por 4 (${W(a.P)} → ${W(b.P)}). Como P = V × I y los dos se duplicaron: 2 × 2 = 4. Por eso un bombillo conectado a más voltaje del debido se quema enseguida.`; },
        resaltar: "P" },
      { tipo: "reto", titulo: "Reto: exactamente 0.9 W", texto: "Consigue que el bombillo reciba exactamente 0.9 W.",
        meta: (ctx) => ctx.ahora({ P: 0.9 }),
        pistas: ["0.9 W es poca potencia: usa un voltaje bajo.", "También sirve P = V² / R. Prueba con 3 V.", "3 V con el bombillo de 10 Ω: 9 / 10 = 0.9 W."],
        solucion: { v: 3, b1: 10 },
        logro: "P = V² / R = 3² / 10 = 0.9 W. Con poco voltaje el bombillo apenas brilla." },
      { tipo: "pregunta", texto: "Si la corriente por un mismo bombillo se duplica, su potencia…",
        opciones: [["x4", "Se multiplica por 4", "Correcto: con la misma R, si I se duplica también V se duplica, y P = V × I crece 2 × 2 = 4 veces."], ["x2", "Se duplica", "Es lo más intuitivo, pero recuerda lo que viste: 3.6 W pasó a 14.4 W."], ["igual", "No cambia", "Más corriente en el mismo bombillo significa más brillo."]], correcta: "x4" },
      { tipo: "resumen", puntos: ["La potencia es la energía por segundo (vatios, W).", "P = V × I, y también P = V² / R.", "Duplicar el voltaje multiplica la potencia por 4."], formula: "P = V × I = V² / R" },
    ],
  },
  {
    clave: "limites", titulo: "Cuando algo se quema", icono: "bombillo", resumen: "Cada pieza aguanta una potencia máxima.",
    fallas: true, porDentro: "filamento",
    circuito: conLimite(circuitoSimple(6, "bombillo", 10), 5),
    controles: [ctrlBateria([3, 6, 9, 12]), { id: "pmax", tipo: "limite", etiqueta: "B1 soporta", componente: ["bombillo", 0], opciones: [5, 15, 40], unidad: "W" }],
    medidor: ["V", "I", "P"], formula: fPotencia,
    tarjetas: [
      { tipo: "idea", titulo: "Todo tiene un límite",
        texto: "Un bombillo convierte la energía eléctrica en luz, pero también en CALOR. Cada bombillo indica cuánta potencia aguanta: su POTENCIA MÁXIMA. Este bombillo, B1, soporta 5 W.\n\nMientras reciba menos de 5 W, brilla sin problema. Si recibe más, su filamento se calienta por encima de lo que resiste y se corta: decimos que se FUNDIÓ.\n\nAhora, con 6 V, recibe P = 6² / 10 = 3.6 W: está por debajo de su límite.",
        fijate: ["Mira el panel «Por dentro»: el color del filamento indica qué tan caliente está.", "La barra compara la potencia que recibe con la que soporta."],
        analogia: "Como el motor de un carro: puede acelerar mucho, pero si lo fuerzas más allá de la línea roja se recalienta y se daña." },
      { tipo: "explora", titulo: "Ponlo al límite",
        texto: "Antes de tocar nada, predice: ¿con cuántos voltios recibirá B1 más de 5 W? Después sube el voltaje de la batería hasta que B1 se funda.",
        meta: (ctx) => ctx.fallas.some((f) => f.tipo === "bombillo"),
        progreso: () => "Sube el voltaje de la batería",
        descubre: (ctx) => { const f = ctx.fallas.find((x) => x.tipo === "bombillo");
          return `Se fundió al recibir ${+f.P.toPrecision(3)} W, más de los 5 W que soporta. Con 9 V recibe 9² / 10 = 8.1 W y con 12 V, 14.4 W. El límite se pasa alrededor de los 7 V (7² / 10 = 4.9 W). Fíjate en los medidores: un bombillo fundido queda ABIERTO, así que la corriente cayó a 0.`; },
        resaltar: "P" },
      { tipo: "idea", titulo: "¿Qué pasó por dentro?",
        texto: "La potencia crece con el CUADRADO del voltaje: al pasar de 6 V a 12 V, el voltaje se duplica pero la potencia se multiplica por 4. Por eso un bombillo puede estar tranquilo y, con un pequeño aumento, fundirse.\n\nAl fundirse, el filamento se corta en dos. El camino de la corriente queda abierto, igual que si abrieras un interruptor.",
        formula: "P = V² / R",
        simbolos: [["P", "potencia que recibe (W)"], ["V", "voltaje en el bombillo (V)"], ["R", "resistencia del bombillo (Ω)"]],
        ejemplo: { enunciado: "¿Se funde un bombillo de 10 Ω y 5 W conectado a 9 V?", pasos: ["P = V² / R = 9² / 10 = 81 / 10 = 8.1 W.", "8.1 W es más que los 5 W que soporta.", "Sí se funde: necesita un bombillo de al menos 8.1 W o un voltaje menor."] } },
      { tipo: "explora", titulo: "Repáralo de verdad",
        texto: "Pon la batería en 12 V y logra que B1 encienda sin fundirse. Ojo: si solo lo reemplazas, se fundirá otra vez. Elige un bombillo que soporte más (control «B1 soporta») y pulsa «Reemplazar lo dañado».",
        meta: (ctx) => { const b = ctx.pieza("bombillo"), d = ctx.med && ctx.med.componentes.B1;
          return !!(b && !b.danado && ctx.ahora({ V: 12 }) && d && d.P > 1 && (b.pmax || 15) >= d.P); },
        progreso: (ctx) => { const b = ctx.pieza("bombillo"); return !b ? "" : b.danado ? "B1 está fundido: elige su potencia y reemplázalo" : !ctx.ahora({ V: 12 }) ? "Pon la batería en 12 V" : "Elige un bombillo que soporte la potencia que recibe"; },
        descubre: (ctx) => `Con 12 V el bombillo recibe ${+ctx.med.componentes.B1.P.toPrecision(3)} W, y ahora soporta ${ctx.pieza("bombillo").pmax} W: brilla sin peligro. Reparar no es solo cambiar la pieza: hay que cambiar lo que la dañó. Por eso los aparatos indican su voltaje y su potencia.`,
        resaltar: "P" },
      { tipo: "pregunta", texto: "Un bombillo de 10 Ω soporta 5 W. ¿Con qué batería se funde?",
        opciones: [["3", "Con 3 V", "Con 3 V recibe 3² / 10 = 0.9 W: muy por debajo de 5 W."], ["6", "Con 6 V", "Con 6 V recibe 3.6 W: todavía no llega a 5 W."], ["9", "Con 9 V", "Correcto: 9² / 10 = 8.1 W, más de los 5 W que soporta."]], correcta: "9" },
      { tipo: "resumen", puntos: ["Cada pieza tiene una potencia máxima: si la supera, se daña.", "La potencia crece con el cuadrado del voltaje: P = V² / R.", "Una pieza fundida deja el circuito abierto; antes de reemplazarla, corrige la causa."], formula: "P = V² / R  ≤  P máx" },
    ],
  },
  {
    clave: "serie_paralelo", titulo: "Serie vs. paralelo", icono: "bombillo", resumen: "Los mismos bombillos, dos conexiones.",
    circuito: circuitoSerie(12, "bombillo", 10, 10),
    controles: [{ id: "conexion", tipo: "conexion", etiqueta: "Conexión",
      opciones: [["serie", "Serie", circuitoSerie(12, "bombillo", 10, 10)], ["paralelo", "Paralelo", circuitoParalelo(12, "bombillo", 10, 10)]] }],
    medidor: ["V", "I", "R", "P"], formula: fSP,
    tarjetas: [
      { tipo: "idea", titulo: "Mismas piezas, otra forma",
        texto: "Ya conoces la serie y el paralelo por separado. Ahora júntalos con todo lo que sabes: dos bombillos iguales (10 Ω) y una batería de 12 V, que puedes conectar de las dos formas.\n\nAntes de mover nada, intenta predecirlo: en serie cada bombillo recibe la mitad del voltaje; en paralelo, el voltaje completo. Como P = V² / R, ¿cuántas veces más debería brillar cada bombillo en paralelo?",
        fijate: ["Empiezan en serie: mira la potencia debajo de B1 y B2.", "Fíjate también en la corriente total que entrega la batería."] },
      { tipo: "explora", titulo: "Pásalos a paralelo", texto: "Cambia la conexión a «Paralelo» con el control de abajo.",
        meta: (ctx) => ctx.ahora({ tipo: "paralelo" }),
        descubre: (ctx) => { const s = ctx.visto({ tipo: "serie" });
          return s ? `En serie cada bombillo recibía ${VV(c(s, "B1").V)} y ${W(c(s, "B1").P)}. En paralelo recibe ${VV(c(ctx.med, "B1").V)} y ${W(c(ctx.med, "B1").P)}: ¡brilla 4 veces más! El doble de voltaje da 4 veces la potencia, como en la lección anterior.`
            : `En paralelo cada bombillo recibe los ${VV(c(ctx.med, "B1").V)} completos.`; },
        resaltar: "P" },
      { tipo: "explora", titulo: "Mira la batería", texto: "Alterna entre serie y paralelo un par de veces y observa la corriente total que entrega la batería.",
        meta: (ctx) => !!(ctx.visto({ tipo: "serie" }) && ctx.visto({ tipo: "paralelo" })),
        descubre: (ctx) => `En serie la batería entrega ${A(ctx.visto({ tipo: "serie" }).I)}; en paralelo, ${A(ctx.visto({ tipo: "paralelo" }).I)}: cuatro veces más. Más brillo cuesta más energía: en paralelo la batería se descarga cuatro veces más rápido.`,
        resaltar: "I" },
      { tipo: "pregunta", texto: "En SERIE, si uno de los bombillos se funde, el otro…",
        opciones: [["apaga", "También se apaga", "Correcto: en serie hay un único camino. Si se corta, no circula corriente."], ["sigue", "Sigue encendido", "Eso pasa en paralelo. En serie el bombillo fundido corta el único camino."], ["mas", "Brilla más", "Sin camino cerrado no hay corriente en ningún punto."]], correcta: "apaga" },
      { tipo: "pregunta", texto: "¿Por qué las instalaciones de las casas se hacen en paralelo?",
        opciones: [["ok", "Cada aparato recibe el voltaje completo y funciona aunque otro se apague", "Correcto: cada rama es independiente y recibe todo el voltaje."], ["cable", "Porque usa menos cable", "En realidad suele usar más cable. La razón es otra: piensa qué pasa al apagar una lámpara."], ["menos", "Porque así circula menos corriente", "Al contrario: en paralelo la batería (o la red) entrega más corriente."]], correcta: "ok" },
      { tipo: "resumen", puntos: ["En serie los bombillos se reparten el voltaje y brillan menos.", "En paralelo cada uno recibe el voltaje completo y brilla más.", "En paralelo, si uno se apaga, los demás siguen funcionando."], formula: "P = V² / R" },
    ],
  },
  {
    clave: "proteccion", titulo: "Cortocircuitos y fusibles", icono: "cable", resumen: "Un atajo peligroso y la pieza que lo detiene.",
    fallas: true,
    circuito: { bateria: [[2, 2], [6, 2], 12, 3], resistencias: [], bombillos: [[[2, 12], [6, 12], 10, 15]], interruptores: [[[2, 7], [4, 7], false]], fusibles: [[[4, 7], [6, 7], 0.5]], cables: [[[2, 2], [2, 12]], [[6, 12], [6, 2]]] },
    controles: [{ id: "atajo", tipo: "interruptor", etiqueta: "Atajo", componente: ["interruptor", 0] }, { id: "f1", tipo: "valor", etiqueta: "Fusible F1", componente: ["fusible", 0], opciones: [0.5, 1, 2, 5], unidad: "A" }],
    medidor: ["V", "I", "P"], formula: fOhm,
    tarjetas: [
      { tipo: "idea", titulo: "Un atajo peligroso",
        texto: "Un CORTOCIRCUITO ocurre cuando la corriente encuentra un camino casi sin resistencia entre el + y el −: un atajo. Por la ley de Ohm, I = V / R: si R es casi cero, la corriente se dispara.\n\nEn el tablero, B1 está encendido. En el medio hay un atajo con un interruptor (abierto) y un FUSIBLE de 0.5 A: un hilo fino que se funde si la corriente supera su valor.",
        fijate: ["Por B1 pasan 1.2 A.", "La batería entrega como máximo 3 A.", "El atajo todavía está abierto."],
        analogia: "Como un río que encuentra una bajada directa: casi toda el agua se va por ahí y deja seco el camino largo." },
      { tipo: "explora", titulo: "Cierra el atajo",
        texto: "Cierra el atajo (control «Atajo» o haz clic sobre el interruptor) y observa qué pasa con el fusible y con B1.",
        meta: (ctx) => ctx.fallas.some((f) => f.tipo === "fusible"),
        descubre: (ctx) => { const f = ctx.fallas.find((x) => x.tipo === "fusible");
          return `El fusible se abrió en una fracción de segundo: por el atajo pasaban ${A(f.I)} y solo soporta ${A(f.limite)}. Al abrirse, el atajo desapareció y B1 volvió a encender. El fusible se sacrificó para proteger el resto del circuito.`; } },
      { tipo: "explora", titulo: "¿Y sin protección?",
        texto: "Cambia el fusible por uno de 5 A (más de lo que la batería puede dar: es como no tener fusible), pulsa «Reemplazar lo dañado» y deja el atajo cerrado.",
        meta: (ctx) => ctx.vioCorto && ctx.pieza("fusible") && ctx.pieza("fusible").valor >= 5,
        progreso: (ctx) => { const f = ctx.pieza("fusible"); return !f ? "" : f.valor < 5 ? "Elige el fusible de 5 A" : f.danado ? "Pulsa «Reemplazar lo dañado»" : "Cierra el atajo"; },
        descubre: "Sin un fusible adecuado, nada corta el atajo: la batería entrega su máximo (3 A) por ahí, su voltaje cae casi a 0 V y B1 se apaga. Las chispas muestran por dónde pasa esa corriente. En una casa, ese calor podría quemar los cables: por eso existen los fusibles y los breakers." },
      { tipo: "reto", titulo: "Reto: el fusible justo",
        texto: "Abre el atajo y elige el fusible MÁS PEQUEÑO que deje a B1 encendido sin abrirse.",
        meta: (ctx) => { const f = ctx.pieza("fusible"), s = ctx.pieza("interruptor");
          return !!(f && s && !s.cerrado && !f.danado && f.valor === 2 && ctx.med && ctx.med.componentes.B1 && ctx.med.componentes.B1.P > 1); },
        pistas: ["¿Cuánta corriente necesita B1? I = 12 V / 10 Ω.", "B1 necesita 1.2 A: los fusibles de 0.5 A y 1 A se abrirían.", "El de 2 A: aguanta 1.2 A y, si alguien cierra el atajo, se abre."],
        solucion: { f1: 2 },
        logro: "Con 2 A el fusible deja pasar los 1.2 A de B1, pero ante un cortocircuito (3 A) se abre en poco más de un segundo. Así se elige un fusible: un poco por encima de la corriente normal, nunca muy por encima." },
      { tipo: "pregunta", texto: "¿Cómo se conecta un fusible para que proteja un circuito?",
        opciones: [["serie", "En serie, para que toda la corriente pase por él", "Correcto: si toda la corriente lo atraviesa, al abrirse corta el circuito entero."], ["paralelo", "En paralelo con la carga", "En paralelo la corriente lo esquivaría… o peor, el propio fusible sería un cortocircuito."], ["igual", "Da igual dónde esté", "No da igual: solo protege lo que está en serie con él."]], correcta: "serie" },
      { tipo: "resumen", puntos: ["Un cortocircuito es un camino casi sin resistencia: la corriente se dispara.", "El fusible va en serie y se abre si la corriente supera su valor.", "Se elige un poco por encima de la corriente normal del circuito."], formula: "I = V / R" },
    ],
  },
];

export function anterior(clave) {
  const i = LECCIONES.findIndex((l) => l.clave === clave);
  return i > 0 ? LECCIONES[i - 1] : null;
}
export function yaLoSabes(clave) {
  const p = anterior(clave);
  if (!p) return null;
  const r = p.tarjetas.find((t) => t.tipo === "resumen");
  return r ? [p.titulo, r.puntos.slice(0, 2)] : null;
}
export function soluciones(t) {
  const s = t.solucion;
  return s == null ? [] : Array.isArray(s) ? s : [s];
}
