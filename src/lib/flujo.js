// Reparto de corriente sobre los tramos de cable (port de flujo_corriente.py).
// La solucion de minima norma de A f = b es f = A^T l con (A A^T) l = b (laplaciano).
import { construirNodos, resolverLineal, clave } from "./motor.js";

const UMBRAL_RELATIVO = 1e-6;

export function calcularTrayectos(cables, resistencias, bateria, resultado, tagsR = null, tagBateria = null) {
  const total = resultado.corrienteTotal;
  if (!(total > 0)) return [];
  const umbral = total * UMBRAL_RELATIVO;
  tagsR = tagsR || resistencias.map(() => null);
  const nodoDe = construirNodos(cables, resistencias, bateria);
  const V = resultado.voltajesNodo;
  const trayectos = [];
  const inyeccion = new Map(); // clave -> [punto, valor]
  const inyectar = (p, v) => {
    const k = clave(p);
    inyeccion.set(k, [p, (inyeccion.get(k)?.[1] || 0) + v]);
  };
  resistencias.forEach(([a, b, r], idx) => {
    const na = nodoDe(a), nb = nodoDe(b);
    if (!V.has(na) || !V.has(nb) || clave(a) === clave(b)) return;
    const iab = (V.get(na) - V.get(nb)) / r;
    if (Math.abs(iab) <= umbral) return;
    const [desde, hasta] = iab > 0 ? [a, b] : [b, a];
    trayectos.push({ desde, hasta, corriente: Math.abs(iab), tipo: "componente", tag: tagsR[idx] });
    inyectar(desde, -Math.abs(iab));
    inyectar(hasta, Math.abs(iab));
  });
  const [pos, neg] = bateria;
  trayectos.push({ desde: neg, hasta: pos, corriente: total, tipo: "fuente", tag: tagBateria });
  inyectar(pos, total);
  inyectar(neg, -total);

  const segs = cables.filter(([p1, p2]) => clave(p1) !== clave(p2));
  if (segs.length) {
    const pts = new Map();
    for (const [p1, p2] of segs) { pts.set(clave(p1), p1); pts.set(clave(p2), p2); }
    const claves = [...pts.keys()];
    const idx = new Map(claves.map((k, i) => [k, i]));
    const n = claves.length;
    // componentes conexas
    const padre = claves.map((_, i) => i);
    const raiz = (i) => { while (padre[i] !== i) { padre[i] = padre[padre[i]]; i = padre[i]; } return i; };
    for (const [p1, p2] of segs) padre[raiz(idx.get(clave(p1)))] = raiz(idx.get(clave(p2)));
    const L = Array.from({ length: n }, () => new Array(n).fill(0));
    for (const [p1, p2] of segs) {
      const i = idx.get(clave(p1)), j = idx.get(clave(p2));
      L[i][i] += 1; L[j][j] += 1; L[i][j] -= 1; L[j][i] -= 1;
    }
    const b = new Array(n).fill(0);
    for (const [k, [, v]] of inyeccion) if (idx.has(k)) b[idx.get(k)] = v;
    const lambda = new Array(n).fill(0);
    const grupos = new Map();
    claves.forEach((_, i) => { const r = raiz(i); if (!grupos.has(r)) grupos.set(r, []); grupos.get(r).push(i); });
    for (const miembros of grupos.values()) {
      if (miembros.length < 2) continue;
      const m = miembros.slice(1); // el primero es la tierra
      const M = m.map((i) => m.map((j) => L[i][j]));
      const rhs = m.map((i) => b[i]);
      const sol = resolverLineal(M, rhs);
      if (sol) m.forEach((i, t) => { lambda[i] = sol[t]; });
    }
    for (const [p1, p2] of segs) {
      const f = lambda[idx.get(clave(p1))] - lambda[idx.get(clave(p2))];
      if (Math.abs(f) <= umbral) continue;
      const [desde, hasta] = f > 0 ? [p1, p2] : [p2, p1];
      trayectos.push({ desde, hasta, corriente: Math.abs(f), tipo: "cable", tag: null });
    }
  }
  return trayectos;
}
