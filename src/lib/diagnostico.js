// Diagnostico del circuito (port de diagnostico.py).
import { dividirEnUniones, puntosInteriores, construirNodos, clave } from "./motor.js";

const res = (estado, titulo, mensaje, pista = "", puntos = [], tags = [], avisos = []) =>
  ({ estado, titulo, mensaje, pista, puntos: [...puntos], tags: [...tags], avisos: [...avisos] });

// -> { segmentos, resistencias, tagsR, bateria, tagBateria }
export function exportar(componentes, cables, incluirAbiertos = false) {
  let segmentos = [];
  const resistencias = [], tagsR = [];
  let bateria = null, tagBateria = null;
  for (const c of Object.values(cables)) {
    for (let i = 0; i + 1 < c.puntos.length; i++) segmentos.push([c.puntos[i], c.puntos[i + 1]]);
  }
  const bornes = Object.values(componentes).flatMap((c) => [c.punto_a, c.punto_b]);
  segmentos = dividirEnUniones(segmentos, bornes);
  for (const [tag, c] of Object.entries(componentes)) {
    // una pieza dañada (bombillo fundido, resistencia quemada, fusible abierto) es un camino abierto
    if (c.danado && !incluirAbiertos) continue;
    if (c.tipo === "resistencia" || c.tipo === "bombillo") {
      resistencias.push([c.punto_a, c.punto_b, c.valor]); tagsR.push(tag);
    } else if ((c.tipo === "interruptor" && (c.cerrado || incluirAbiertos)) || c.tipo === "fusible") {
      segmentos.push([c.punto_a, c.punto_b]);
    } else if (c.tipo === "bateria") {
      bateria = [c.punto_a, c.punto_b, c.valor]; tagBateria = tag;
    }
  }
  return { segmentos, resistencias, tagsR, bateria, tagBateria };
}

function hayCamino(segmentos, resistencias, bateria) {
  const nodoDe = construirNodos(segmentos, resistencias, bateria);
  const inicio = nodoDe(bateria[0]), fin = nodoDe(bateria[1]);
  const vecinos = new Map();
  const add = (x, y) => { if (!vecinos.has(x)) vecinos.set(x, new Set()); vecinos.get(x).add(y); };
  for (const [a, b] of resistencias) {
    const na = nodoDe(a), nb = nodoDe(b);
    if (na !== nb) { add(na, nb); add(nb, na); }
  }
  const vis = new Set([inicio]); const pend = [inicio];
  while (pend.length) {
    const act = pend.pop();
    for (const v of vecinos.get(act) || []) if (!vis.has(v)) { vis.add(v); pend.push(v); }
  }
  return vis.has(fin);
}

function caminoDeCables(componentes, cables, desde, hasta) {
  const vecinos = new Map();
  const unir = (p1, p2, tag) => {
    for (const [x, y] of [[p1, p2], [p2, p1]]) {
      const k = clave(x);
      if (!vecinos.has(k)) vecinos.set(k, []);
      vecinos.get(k).push([y, tag]);
    }
  };
  const todos = [
    ...Object.values(cables).flatMap((c) => c.puntos),
    ...Object.values(componentes).flatMap((c) => [c.punto_a, c.punto_b]),
  ];
  for (const [tag, c] of Object.entries(cables)) {
    const tr = [];
    for (let i = 0; i + 1 < c.puntos.length; i++) tr.push([c.puntos[i], c.puntos[i + 1]]);
    for (const [p1, p2] of dividirEnUniones(tr, todos)) unir(p1, p2, tag);
  }
  for (const [tag, c] of Object.entries(componentes)) {
    if ((c.tipo === "interruptor" && c.cerrado) || (c.tipo === "fusible" && !c.danado)) unir(c.punto_a, c.punto_b, tag);
  }
  const previo = new Map([[clave(desde), null]]);
  const cola = [desde];
  while (cola.length) {
    const act = cola.shift();
    if (clave(act) === clave(hasta)) break;
    for (const [vec, tag] of vecinos.get(clave(act)) || []) {
      if (!previo.has(clave(vec))) { previo.set(clave(vec), [act, tag]); cola.push(vec); }
    }
  }
  const tags = [];
  let punto = hasta;
  while (previo.get(clave(punto))) {
    const [p, tag] = previo.get(clave(punto));
    punto = p;
    if (!tags.includes(tag)) tags.push(tag);
  }
  return tags;
}

export function terminalesSueltos(componentes, cables) {
  const conteo = new Map(); const pt = new Map();
  const sumar = (p, n = 1) => { const k = clave(p); conteo.set(k, (conteo.get(k) || 0) + n); pt.set(k, p); };
  for (const c of Object.values(componentes)) { sumar(c.punto_a); sumar(c.punto_b); }
  for (const c of Object.values(cables)) {
    const ps = c.puntos; if (ps.length < 2) continue;
    sumar(ps[0]); sumar(ps[ps.length - 1]);
    for (const m of ps.slice(1, -1)) sumar(m, 2);
  }
  const interiores = new Set();
  for (const c of Object.values(cables)) {
    for (let i = 0; i + 1 < c.puntos.length; i++) {
      for (const p of puntosInteriores(c.puntos[i], c.puntos[i + 1])) interiores.add(clave(p));
    }
  }
  return [...conteo].filter(([k, n]) => n === 1 && !interiores.has(k)).map(([k]) => pt.get(k))
    .sort((a, b) => a[0] - b[0] || a[1] - b[1]);
}

export function diagnosticar(componentes, cables) {
  const tipos = Object.values(componentes).map((c) => c.tipo);
  if (!tipos.length && !Object.keys(cables).length) {
    return res("vacio", "Tablero vacío", "Empieza colocando una batería y un componente, como una resistencia o un bombillo.");
  }
  if (!tipos.includes("bateria")) {
    return res("incompleto", "Falta la batería", "Sin una fuente de energía no hay nada que empuje la corriente.",
      "Elige Batería en la paleta y haz clic en el tablero para colocarla.");
  }
  if (!tipos.some((t) => t === "resistencia" || t === "bombillo")) {
    return res("incompleto", "Falta un componente", "La corriente necesita pasar por algo: una resistencia o un bombillo.",
      "Coloca una resistencia o un bombillo y conéctalo a la batería.");
  }
  const { segmentos, resistencias, tagsR, bateria, tagBateria } = exportar(componentes, cables);
  const nodoDe = construirNodos(segmentos, resistencias, bateria);
  if (nodoDe(bateria[0]) === nodoDe(bateria[1])) {
    const tags = [tagBateria, ...caminoDeCables(componentes, cables, bateria[0], bateria[1])];
    return res("corto", "Cortocircuito",
      "Los dos bornes de la batería están unidos por un cable sin pasar por ningún componente. La corriente sería enorme y no se puede simular.",
      "Quita el cable que une directamente el + con el −, o haz que pase por una resistencia o un bombillo.", [], tags);
  }
  const camino = hayCamino(segmentos, resistencias, bateria);
  const sueltos = terminalesSueltos(componentes, cables);
  if (!camino) {
    const danados = Object.entries(componentes).filter(([, c]) => c.danado).map(([t]) => t);
    if (danados.length) {
      const e2 = exportar(componentes, cables, true);
      if (hayCamino(e2.segmentos, e2.resistencias, bateria)) {
        const quien = danados.map((t) => componentes[t].tipo === "bombillo" ? "un bombillo fundido" : componentes[t].tipo === "fusible" ? "un fusible abierto" : "una resistencia quemada");
        return res("abierto", "Pieza dañada",
          `El circuito está completo, pero tiene ${[...new Set(quien)].join(" y ")}: por ahí ya no puede pasar la corriente.`,
          "Selecciona la pieza resaltada y pulsa Reemplazar, o usa Reparar todo. Antes, cambia lo que la dañó.", [], danados);
      }
    }
    const abiertos = Object.entries(componentes).filter(([, c]) => c.tipo === "interruptor" && !c.cerrado).map(([t]) => t);
    if (abiertos.length) {
      const e2 = exportar(componentes, cables, true);
      if (hayCamino(e2.segmentos, e2.resistencias, bateria)) {
        return res("abierto", "Interruptor abierto",
          "El interruptor está abierto, por lo que no existe una trayectoria cerrada para la corriente. El resto del circuito sí está completo.",
          "Haz clic sobre el interruptor resaltado para cerrarlo.", [], abiertos);
      }
    }
    let pista;
    if (sueltos.length === 2) pista = "Conecta estos dos terminales con un cable para permitir el paso de corriente.";
    else if (sueltos.length) pista = "Hay terminales sin conectar (resaltados). Únelos con cables para que la corriente pueda ir del + al −.";
    else pista = "Revisa que haya un camino continuo desde el borne + de la batería, pasando por los componentes, hasta el borne −.";
    return res("abierto", "Circuito abierto", "La corriente no tiene un camino completo para salir de la batería y volver a ella.", pista, sueltos);
  }
  const avisos = [];
  const puenteadas = tagsR.filter((_, i) => nodoDe(resistencias[i][0]) === nodoDe(resistencias[i][1]));
  if (puenteadas.length) avisos.push(`${puenteadas.length} componente(s) tienen sus dos terminales unidos por un cable: la corriente los esquiva y no reciben energía.`);
  if (sueltos.length) avisos.push("Hay terminales sueltos en una parte del circuito; esa parte no recibe corriente.");
  return res("cerrado", "Circuito cerrado", "La corriente tiene un camino completo del borne + al −. Ya puedes simular.", "", sueltos, puenteadas, avisos);
}
