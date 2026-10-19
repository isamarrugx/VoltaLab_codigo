// Fallas físicas: cada pieza tiene un límite y falla de forma coherente con el cálculo del motor.
//
// Modelo (todo sale de resolverCircuito, nada es decorativo):
//   - Resistencias y bombillos se calientan según P / Pmáx con una constante de tiempo térmica:
//       θ' = (P/Pmáx − θ) / τ      → a potencia constante θ tiende a P/Pmáx.
//     Fallan (quedan abiertos) cuando θ supera su umbral. Si P ≤ Pmáx nunca fallan.
//   - El fusible es un conductor de 0.01 Ω que se funde según su curva tiempo-corriente:
//       t = K / ((I/In)² − 1)   para I > In   (más sobrecorriente → se abre más rápido).
//   - La batería tiene una corriente máxima: si el circuito pide más, limita la corriente
//     bajando su voltaje (todo el circuito escala igual, porque es lineal). Ante un
//     cortocircuito su salida cae a ~0 V: entra en protección.
import { resolverCircuito, construirNodos, dividirEnUniones, ErrorCircuito } from "./motor.js";

export const ESPEC = {
  resistencia: { campo: "pmax", def: 2, presets: [0.25, 0.5, 1, 2, 5], unidad: "W", etiqueta: "Potencia máxima", tau: 1.6, umbral: 1.0 },
  bombillo: { campo: "pmax", def: 15, presets: [2, 5, 15, 40], unidad: "W", etiqueta: "Potencia máxima", tau: 0.35, umbral: 1.15 },
  bateria: { campo: "imax", def: 2, presets: [0.5, 1, 2, 3, 5], unidad: "A", etiqueta: "Corriente máxima" },
};
export const R_FUSIBLE = 0.01;          // Ω de un fusible sano
export const K_FUSIBLE = 1.5;           // s: escala de la curva del fusible
export const V_PROTECCION = 0.5;        // V: por debajo, la batería se considera en protección

export const limite = (c) => {
  if (c.tipo === "fusible") return c.valor;
  const e = ESPEC[c.tipo];
  return e ? c[e.campo] ?? e.def : null;
};

// Tiempo que tarda en abrirse un fusible con corriente I (Infinity si no se abre).
export function tiempoFusion(I, In) {
  const x = I / In;
  return x <= 1 ? Infinity : K_FUSIBLE / (x * x - 1);
}

// Igual que diagnostico.exportar, pero con el fusible como un conductor real (0.01 Ω),
// para conocer la corriente que lo atraviesa. Las piezas dañadas quedan abiertas.
export function exportarFisico(componentes, cables) {
  let segmentos = [];
  const resistencias = [], tags = [];
  let bateria = null, tagBateria = null;
  for (const c of Object.values(cables)) for (let i = 0; i + 1 < c.puntos.length; i++) segmentos.push([c.puntos[i], c.puntos[i + 1]]);
  segmentos = dividirEnUniones(segmentos, Object.values(componentes).flatMap((c) => [c.punto_a, c.punto_b]));
  for (const [tag, c] of Object.entries(componentes)) {
    if (c.danado) continue;
    if (c.tipo === "resistencia" || c.tipo === "bombillo") { resistencias.push([c.punto_a, c.punto_b, c.valor]); tags.push(tag); }
    else if (c.tipo === "fusible") { resistencias.push([c.punto_a, c.punto_b, R_FUSIBLE]); tags.push(tag); }
    else if (c.tipo === "interruptor" && c.cerrado) segmentos.push([c.punto_a, c.punto_b]);
    else if (c.tipo === "bateria") { bateria = [c.punto_a, c.punto_b, c.valor]; tagBateria = tag; }
  }
  return { segmentos, resistencias, tags, bateria, tagBateria };
}

// Lo que pasa físicamente en este instante.
// -> { hay, corto, limitando, k, vSalida, iFuente, imax, piezas: { tag: { I, P } } }
export function medir(componentes, cables) {
  const vacio = { hay: false, corto: false, limitando: false, k: 1, vSalida: 0, iFuente: 0, imax: null, piezas: {} };
  const { segmentos, resistencias, tags, bateria, tagBateria } = exportarFisico(componentes, cables);
  if (!bateria) return vacio;
  const imax = limite(componentes[tagBateria]);
  const nodoDe = construirNodos(segmentos, resistencias, bateria);
  // Bornes unidos por cables ideales: la batería entrega su corriente máxima a ~0 V.
  if (nodoDe(bateria[0]) === nodoDe(bateria[1])) {
    return { ...vacio, hay: true, corto: true, limitando: true, k: 0, vSalida: 0, iFuente: imax, imax };
  }
  if (!resistencias.length) return { ...vacio, imax, vSalida: bateria[2] };
  let r;
  try { r = resolverCircuito(segmentos, resistencias, bateria); }
  catch (e) { if (e instanceof ErrorCircuito) return { ...vacio, imax, vSalida: bateria[2] }; throw e; }
  const k = r.corrienteTotal > imax ? imax / r.corrienteTotal : 1;
  const piezas = {};
  tags.forEach((tag, i) => { const d = r.resistencias[i]; piezas[tag] = { I: d.corriente * k, P: d.potencia * k * k }; });
  const vSalida = bateria[2] * k;
  return { hay: true, corto: vSalida < V_PROTECCION, limitando: k < 1, k, vSalida, iFuente: r.corrienteTotal * k, imax, piezas };
}

// Aplica el límite de la batería a un resultado del motor (para mostrar lo que de verdad ocurre).
export function limitarResultado(resultado, imax) {
  if (!(resultado.corrienteTotal > imax)) return { resultado, k: 1 };
  const k = imax / resultado.corrienteTotal;
  const voltajesNodo = new Map([...resultado.voltajesNodo].map(([n, v]) => [n, v * k]));
  return {
    k,
    resultado: {
      ...resultado, voltajesNodo,
      resistencias: resultado.resistencias.map((d) => ({ ...d, voltaje: d.voltaje * k, corriente: d.corriente * k, potencia: d.potencia * k * k })),
      corrienteTotal: resultado.corrienteTotal * k, potenciaTotal: resultado.potenciaTotal * k * k,
    },
  };
}

// Estado que se muestra de cada pieza.
export function estado(c, calor) {
  if (c.danado) return "dañado";
  if (c.tipo === "fusible") return calor >= 0.5 ? "sobrecalentado" : calor > 0.05 ? "caliente" : "normal";
  const e = ESPEC[c.tipo]; if (!e || !e.tau) return "normal";
  if (calor >= e.umbral * 0.9) return "sobrecalentado";
  if (c.tipo === "resistencia" && calor >= 0.6) return "caliente";
  return "normal";
}
export const ETIQUETA_ESTADO = { normal: "Normal", caliente: "Caliente", sobrecalentado: "Sobrecalentado", "dañado": "Dañado" };

// Integra el calor en el tiempo. Se llama a intervalos cortos mientras el circuito está encendido.
export class Termico {
  constructor() { this.calor = {}; }   // tag -> θ (resistencias y bombillos) o avance de fusión (fusibles)
  reiniciar(tag = null) { if (tag) delete this.calor[tag]; else this.calor = {}; }
  // -> { med, falla: { tag, tipo, I, P, limite, causa } | null }
  paso(componentes, cables, dt) {
    const med = medir(componentes, cables);
    const candidatas = [];
    for (const [tag, c] of Object.entries(componentes)) {
      if (c.danado) { delete this.calor[tag]; continue; }
      const d = med.piezas[tag] || { I: 0, P: 0 };
      const lim = limite(c);
      if (c.tipo === "fusible") {
        const t = tiempoFusion(d.I, lim);
        const prev = this.calor[tag] || 0;
        const ahora = Number.isFinite(t) ? prev + dt / t : Math.max(0, prev - dt / 3);
        this.calor[tag] = ahora;
        if (ahora >= 1) candidatas.push({ tag, tipo: c.tipo, I: d.I, P: d.P, limite: lim, exceso: ahora });
      } else if (ESPEC[c.tipo] && ESPEC[c.tipo].tau) {
        const { tau, umbral } = ESPEC[c.tipo];
        const prev = this.calor[tag] || 0;
        const ahora = prev + (d.P / lim - prev) * (1 - Math.exp(-dt / tau));
        this.calor[tag] = ahora < 1e-4 ? 0 : ahora;
        if (ahora >= umbral) candidatas.push({ tag, tipo: c.tipo, I: d.I, P: d.P, limite: lim, exceso: ahora / umbral });
      }
    }
    // Solo una pieza falla por paso: al abrirse cambia el circuito y se vuelve a calcular.
    // Los fusibles van primero: están para eso.
    candidatas.sort((a, b) => (b.tipo === "fusible") - (a.tipo === "fusible") || b.exceso - a.exceso);
    const f = candidatas[0] || null;
    if (f) delete this.calor[f.tag];
    return { med, falla: f ? { ...f, causa: med.corto || med.limitando ? "corto" : "sobrecarga" } : null };
  }
}

const n2 = (v) => +v.toPrecision(2);
const W = (p) => (p < 1 ? `${n2(p * 1000)} mW` : `${n2(p)} W`);
const A = (i) => (i < 1 ? `${n2(i * 1000)} mA` : `${n2(i)} A`);

// Explicación corta primero; el detalle queda para «Ver por qué».
export function explicarFalla(f, nombre) {
  if (f.tipo === "bombillo") return {
    titulo: `${nombre} se fundió`,
    corto: `Recibía ${W(f.P)} y solo soporta ${W(f.limite)}. El filamento se calentó demasiado y se cortó: ahora ese camino está abierto.`,
    detalle: `La potencia que recibe un bombillo es P = V × I. Por encima de su potencia máxima el filamento sobrepasa su temperatura de trabajo y se rompe en una fracción de segundo. Al cortarse, deja de pasar corriente por esa rama: si estaba en serie con otras piezas, todas se apagan; si estaba en paralelo, las demás ramas siguen funcionando. Para evitarlo, usa un bombillo de mayor potencia o baja el voltaje.`,
  };
  if (f.tipo === "resistencia") return {
    titulo: `${nombre} se quemó`,
    corto: `Disipaba ${W(f.P)} y su límite es ${W(f.limite)}. Se calentó durante unos segundos hasta quemarse y abrir el circuito.`,
    detalle: `Una resistencia convierte la energía eléctrica en calor: P = I² × R. Si disipa más de lo que su cuerpo puede evacuar, la temperatura sube hasta dañarla. Por eso no falla al instante: primero se calienta (cambia de color) y luego se abre. Para evitarlo, usa una resistencia de más potencia, un valor mayor en ohmios o un voltaje menor.`,
  };
  return {
    titulo: `El fusible ${nombre} se fundió`,
    corto: f.causa === "corto"
      ? `Detectó un cortocircuito: pasaban ${A(f.I)} y su límite es ${A(f.limite)}. Se abrió y protegió el resto del circuito.`
      : `Pasaban ${A(f.I)} y su límite es ${A(f.limite)}. Se abrió para proteger el circuito.`,
    detalle: `Un fusible es un hilo fino que se funde cuando la corriente supera su valor nominal. Cuanto mayor es el exceso, más rápido se abre: con el doble de su corriente tarda menos de un segundo; con un pequeño exceso puede tardar mucho. Así corta la corriente antes de que se dañen los cables o la fuente. Para que no vuelva a pasar, busca la causa (un cortocircuito o demasiadas cargas) antes de reemplazarlo.`,
  };
}

export function explicarProteccion(med) {
  if (med.corto) return {
    titulo: "La batería entró en protección",
    corto: `Hay un cortocircuito: los bornes quedaron unidos casi sin resistencia. La batería limita su corriente a ${A(med.imax)} y su voltaje cae a casi 0 V, así que nada funciona.`,
    detalle: "Sin una resistencia en el camino, la ley de Ohm (I = V / R) pediría una corriente enorme. Las fuentes reales tienen protección: limitan la corriente y su voltaje baja casi a cero. Las chispas marcan los cables por donde circula esa corriente. Quita el cable que une directamente el + con el −, o agrega un fusible para que el circuito se proteja solo.",
  };
  return {
    titulo: "La batería está limitando la corriente",
    corto: `El circuito pide más de ${A(med.imax)}, el máximo de esta batería. Para no pasar de ahí, baja su voltaje a ${n2(med.vSalida)} V y todo brilla menos.`,
    detalle: "Cuando la resistencia equivalente es muy pequeña, I = V / Req supera lo que la fuente puede entregar. En lugar de dañarse, la batería reduce su voltaje hasta que la corriente queda en su máximo. Usa resistencias mayores, menos ramas en paralelo o una batería con más corriente máxima.",
  };
}
