// Guias visuales para las pistas (port de guias.py).
import { nombresComponentes, componentesDesdeDefinicion } from "./explicador.js";
import { dividirEnUniones, puntosInteriores, clave } from "./motor.js";

export const FORMA_AL_COLOCAR = { resistencia: [0, 2], bombillo: [0, 2], interruptor: [0, 2], bateria: [2, 0] };
const eq = (p, q) => p[0] === q[0] && p[1] === q[1];
const tiene = (lista, p) => lista.some((q) => eq(q, p));

class Uniones {
  constructor(cables, componentes = {}) {
    this.padre = new Map();
    const tramos = [];
    for (const c of Object.values(cables)) for (let i = 0; i + 1 < c.puntos.length; i++) tramos.push([c.puntos[i], c.puntos[i + 1]]);
    const bornes = Object.values(componentes).flatMap((c) => [c.punto_a, c.punto_b]);
    for (const [p, q] of dividirEnUniones(tramos, bornes)) this.padre.set(this.raiz(p), this.raiz(q));
  }
  raiz(p) {
    let k = clave(p);
    if (!this.padre.has(k)) this.padre.set(k, k);
    while (this.padre.get(k) !== k) { this.padre.set(k, this.padre.get(this.padre.get(k))); k = this.padre.get(k); }
    return k;
  }
  unidos(p, q) { return eq(p, q) || this.raiz(p) === this.raiz(q); }
}

function ocupado(punto, componentes, cables, propio) {
  if (Object.values(cables).some((c) => tiene(c.puntos, punto))) return true;
  return Object.entries(componentes).some(([t, c]) => t !== propio && (eq(c.punto_a, punto) || eq(c.punto_b, punto)));
}

export function tagDe(nombre, componentes, nombres = null) {
  nombres = nombres || nombresComponentes(componentes);
  return Object.keys(nombres).find((t) => nombres[t] === nombre) ?? null;
}

export function resolver(simbolo, componentes, cables, nombres = null) {
  nombres = nombres || nombresComponentes(componentes);
  if (simbolo === "+" || simbolo === "-") {
    const tag = Object.keys(componentes).find((t) => componentes[t].tipo === "bateria");
    if (tag === undefined) return null;
    return componentes[tag][simbolo === "+" ? "punto_a" : "punto_b"];
  }
  const [nombre, extremo = ""] = simbolo.split(".");
  const tag = tagDe(nombre, componentes, nombres);
  if (tag === null) return null;
  const comp = componentes[tag];
  if (extremo === "b") return comp.punto_b;
  if (extremo === "*") {
    for (const k of ["punto_b", "punto_a"]) if (!ocupado(comp[k], componentes, cables, tag)) return comp[k];
    return comp.punto_b;
  }
  return comp.punto_a;
}

function puntosDe(ruta) {
  const out = [ruta[0]];
  for (let i = 0; i + 1 < ruta.length; i++) {
    const [f0, c0] = ruta[i], [f1, c1] = ruta[i + 1];
    const pasos = Math.max(Math.abs(f1 - f0), Math.abs(c1 - c0));
    for (let k = 1; k <= pasos; k++) out.push([f0 + Math.floor(((f1 - f0) * k) / pasos), c0 + Math.floor(((c1 - c0) * k) / pasos)]);
  }
  return out;
}
function choques(ruta, componentes) {
  const inicio = ruta[0], fin = ruta[ruta.length - 1];
  const ocup = new Set();
  for (const c of Object.values(componentes)) for (const p of puntosDe([c.punto_a, c.punto_b])) ocup.add(clave(p));
  return puntosDe(ruta).slice(1, -1).filter((p) => ocup.has(clave(p)) && !eq(p, inicio) && !eq(p, fin)).length;
}

export function ruta(p1, p2, componentes) {
  const [f1, c1] = p1, [f2, c2] = p2;
  const cand = [];
  if (f1 === f2 || c1 === c2) cand.push([p1, p2]);
  cand.push([p1, [f1, c2], p2], [p1, [f2, c1], p2]);
  for (const d of [-1, 1, -2, 2]) {
    cand.push([p1, [f1 + d, c1], [f1 + d, c2], p2]);
    cand.push([p1, [f1, c1 + d], [f2, c1 + d], p2]);
    cand.push([p1, [f1, c2 + d], [f2, c2 + d], p2]);
    cand.push([p1, [f2 + d, c1], [f2 + d, c2], p2]);
  }
  const limpia = (r) => { const out = [r[0]]; for (const p of r.slice(1)) if (!eq(p, out[out.length - 1])) out.push(p); return out; };
  const costo = (r) => {
    let largo = 0;
    for (let i = 0; i + 1 < r.length; i++) largo += Math.abs(r[i][0] - r[i + 1][0]) + Math.abs(r[i][1] - r[i + 1][1]);
    return choques(r, componentes) * 100 + largo + (r.length - 2) * 0.5;
  };
  let mejor = null, mc = Infinity;
  for (const r of cand.map(limpia)) { const c = costo(r); if (c < mc) { mc = c; mejor = r; } }
  return mejor;
}

function pasosUnitarios(a, b) {
  const cad = [a, ...puntosInteriores(a, b), b];
  return cad.slice(0, -1).map((p, i) => [p, cad[i + 1]]);
}
const parClave = (p, q) => { const a = clave(p), b = clave(q); return a < b ? `${a}|${b}` : `${b}|${a}`; };

function soloEsquinas(puntos) {
  const out = [puntos[0]];
  for (let i = 1; i + 1 < puntos.length; i++) {
    const prev = puntos[i - 1], p = puntos[i], sig = puntos[i + 1];
    if (p[0] - prev[0] !== sig[0] - p[0] || p[1] - prev[1] !== sig[1] - p[1]) out.push(p);
  }
  out.push(puntos[puntos.length - 1]);
  return out;
}

export function sinTramosTapados(camino, cables) {
  const tapados = new Set();
  for (const c of Object.values(cables)) {
    for (let i = 0; i + 1 < c.puntos.length; i++) for (const [p, q] of pasosUnitarios(c.puntos[i], c.puntos[i + 1])) tapados.add(parClave(p, q));
  }
  const trozos = [];
  let actual = [];
  for (let i = 0; i + 1 < camino.length; i++) {
    for (const [p, q] of pasosUnitarios(camino[i], camino[i + 1])) {
      if (tapados.has(parClave(p, q))) { if (actual.length > 1) trozos.push(actual); actual = []; continue; }
      if (!actual.length) actual = [p];
      actual.push(q);
    }
  }
  if (actual.length > 1) trozos.push(actual);
  return trozos.map(soloEsquinas);
}

export function unir(...guias) {
  const total = {};
  for (const g of guias) {
    if (!g) continue;
    for (const [k, v] of Object.entries(g)) {
      if (Array.isArray(v) && k !== "interruptor") {
        total[k] = total[k] || [];
        for (const x of v) if (!total[k].some((y) => JSON.stringify(y) === JSON.stringify(x))) total[k].push(x);
      } else total[k] = v;
    }
  }
  return total;
}

function candidatos(simbolo, componentes, nombres) {
  if (simbolo === "+" || simbolo === "-") { const p = resolver(simbolo, componentes, {}, nombres); return p ? [p] : []; }
  const [nombre, extremo = ""] = simbolo.split(".");
  const tag = tagDe(nombre, componentes, nombres);
  if (tag === null) return [];
  const c = componentes[tag];
  if (extremo === "*") return [c.punto_a, c.punto_b];
  return [extremo === "b" ? c.punto_b : c.punto_a];
}
const dist = (p, q) => Math.abs(p[0] - q[0]) + Math.abs(p[1] - q[1]);
const ocupadoPorCable = (p, cables) => Object.values(cables).some((c) => tiene(c.puntos, p));

export function cablesQueFaltan(guia, componentes, cables) {
  const nombres = nombresComponentes(componentes);
  const uniones = new Uniones(cables, componentes);
  const faltan = [], reservados = [];
  const libres = (lista) => lista.filter((p) => !tiene(reservados, p) && !ocupadoPorCable(p, cables));
  for (const [a, b] of guia.cables || []) {
    const ca = candidatos(a, componentes, nombres), cb = candidatos(b, componentes, nombres);
    if (!ca.length || !cb.length) continue;
    if (ca.some((p) => cb.some((q) => uniones.unidos(p, q)))) continue;
    const oa = libres(ca).length ? libres(ca) : ca.filter((p) => !tiene(reservados, p)).length ? ca.filter((p) => !tiene(reservados, p)) : ca;
    const ob = libres(cb).length ? libres(cb) : cb.filter((p) => !tiene(reservados, p)).length ? cb.filter((p) => !tiene(reservados, p)) : cb;
    let best = null, bd = Infinity;
    for (const p of oa) for (const q of ob) if (!eq(p, q)) { const d = dist(p, q); if (d < bd) { bd = d; best = [p, q]; } }
    if (!best) continue;
    if (ca.length > 1) reservados.push(best[0]);
    if (cb.length > 1) reservados.push(best[1]);
    faltan.push(best);
  }
  return faltan;
}

export function paraTablero(guia, componentes, cables, desplazamiento = [0, 0]) {
  if (!guia) return null;
  const nombres = nombresComponentes(componentes);
  let caminos = [];
  const faltan = cablesQueFaltan(guia, componentes, cables);
  for (const [p1, p2] of faltan) caminos = caminos.concat(sinTramosTapados(ruta(p1, p2, componentes), cables));
  const puntos = [];
  for (const s of guia.puntos || []) { const p = resolver(s, componentes, cables, nombres); if (p && !tiene(puntos, p)) puntos.push(p); }
  for (const par of faltan) for (const p of par) if (!tiene(puntos, p)) puntos.push(p);
  const tags = [];
  const piezas = [...(guia.piezas || []), ...(guia.valores || []).map(([n]) => n)];
  if (guia.interruptor) piezas.push(guia.interruptor[0]);
  for (const n of piezas) { const t = tagDe(n, componentes, nombres); if (t && !tags.includes(t)) tags.push(t); }
  const zonas = [];
  const [df, dc] = desplazamiento;
  const yaHay = {};
  for (const [tipo, [f, c]] of guia.zonas || []) {
    if (yaHay[tipo] === undefined) yaHay[tipo] = Object.values(componentes).filter((x) => x.tipo === tipo).length;
    if (yaHay[tipo] > 0) { yaHay[tipo] -= 1; continue; }
    const a = [f + df, c + dc], forma = FORMA_AL_COLOCAR[tipo];
    zonas.push([tipo, a, [a[0] + forma[0], a[1] + forma[1]]]);
  }
  let borrar = [];
  if (guia.borrar) {
    if (guia.borrar === true) borrar = Object.keys(cables);
    else {
      const tag = tagDe(guia.borrar, componentes, nombres);
      const comp = tag ? componentes[tag] : null;
      if (comp) { const ext = [comp.punto_a, comp.punto_b]; borrar = Object.entries(cables).filter(([, c]) => c.puntos.some((p) => tiene(ext, p))).map(([t]) => t); }
    }
  }
  return { caminos, puntos, tags, zonas, cables_borrar: borrar };
}

export const herramientaDe = (guia) => (guia || {}).herramienta;
export const valorSugerido = (guia, nombre) => { const v = ((guia || {}).valores || []).find(([n]) => n === nombre); return v ? v[1] : null; };

const VALOR_AL_COLOCAR = { resistencia: 100, bombillo: 10, bateria: 12 };
const guiaDe = (pista) => (Array.isArray(pista) ? pista[1] : null);

export function guiaDelPaso(reto, i) {
  const paso = reto.pasos[i];
  if (reto.nivel === 1) return paso.guia;
  const pistas = paso.pistas || reto.pistas || [];
  return unir(...pistas.map(guiaDe));
}

class TableroSimulado {
  constructor(def) {
    const { componentes, cables } = componentesDesdeDefinicion(def);
    this.componentes = componentes; this.cables = cables;
    this.n = Object.keys(componentes).length + Object.keys(cables).length;
  }
  tag() { this.n += 1; return `obj_${this.n}`; }
  seguir(guia) {
    if (!guia) return;
    let dib = paraTablero(guia, this.componentes, this.cables);
    for (const [tipo, a, b] of dib.zonas) {
      const comp = { tipo, punto_a: a, punto_b: b };
      if (tipo === "interruptor") comp.cerrado = true; else comp.valor = VALOR_AL_COLOCAR[tipo];
      this.componentes[this.tag()] = comp;
    }
    const nombres = nombresComponentes(this.componentes);
    for (const [n, v] of guia.valores || []) { const t = tagDe(n, this.componentes, nombres); if (t) this.componentes[t].valor = v; }
    dib = paraTablero(guia, this.componentes, this.cables);
    for (const camino of dib.caminos) this.cables[this.tag()] = { puntos: [...camino], color: "#4B625F" };
    if (guia.interruptor) { const [n, c] = guia.interruptor; const t = tagDe(n, this.componentes); if (t) this.componentes[t].cerrado = c; }
    if (dib.cables_borrar.length) delete this.cables[dib.cables_borrar[dib.cables_borrar.length - 1]];
  }
}

export function circuitoResuelto(reto) {
  const t = new TableroSimulado(reto.circuito);
  const pasos = reto.nivel < 3 ? reto.pasos.map((_, i) => i) : [0];
  for (const i of pasos) {
    const g = { ...(guiaDelPaso(reto, i) || {}) };
    delete g.borrar; delete g.interruptor;
    t.seguir(g);
  }
  return { componentes: t.componentes, cables: t.cables };
}

export function limites(componentes, cables) {
  const pts = [...Object.values(componentes).flatMap((c) => [c.punto_a, c.punto_b]), ...Object.values(cables).flatMap((c) => c.puntos)];
  if (!pts.length) return [4, 4, 6, 6];
  const fs = pts.map((p) => p[0]), cs = pts.map((p) => p[1]);
  return [Math.min(...fs), Math.max(...fs), Math.min(...cs), Math.max(...cs)];
}
