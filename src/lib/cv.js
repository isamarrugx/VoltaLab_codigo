// Dibujo de componentes sobre <canvas> (port de componentes_visuales.py).
// Las coordenadas estan en pixeles; cada funcion recibe ctx 2D.
import { mezclarColor } from "./animaciones.js";
import * as E from "./estilos.js";

export const FUENTE = '"Segoe UI", system-ui, -apple-system, "Helvetica Neue", Arial, sans-serif';
export const fuente = (px, negrita = false) => `${negrita ? "700 " : "400 "}${px}px ${FUENTE}`;

const COLOR_DIGITO = ["#000000", "#8B5A2B", "#FF0000", "#FFA500", "#FFFF00", "#00A000", "#0000FF", "#8B00FF", "#808080", "#FFFFFF"];
const MULT_EXTRA = { "-1": "#FFD700", "-2": "#C0C0C0" };
const TOLERANCIA_ORO = "#FFD700";
const NOMBRE_DIGITO = ["negro", "marrón", "rojo", "naranja", "amarillo", "verde", "azul", "violeta", "gris", "blanco"];
const NOMBRE_MULT_EXTRA = { "-1": "dorado", "-2": "plateado" };

function descomponer(valor) {
  if (!(valor > 0) || !Number.isFinite(valor)) return null;
  let v = valor, exp = 0;
  while (v >= 100) { v /= 10; exp += 1; }
  while (v < 10) { v *= 10; exp -= 1; }
  let entero = Math.round(v);
  if (entero >= 100) { entero = 10; exp += 1; }
  return [Math.floor(entero / 10), entero % 10, exp];
}

export function bandasDeColor(valor) {
  const p = descomponer(valor);
  if (!p) return ["#555555", "#555555", "#555555"];
  const [d1, d2, exp] = p;
  const mult = MULT_EXTRA[exp] ?? COLOR_DIGITO[exp] ?? "#000000";
  return [COLOR_DIGITO[d1], COLOR_DIGITO[d2], mult];
}

const SUP = { "-": "⁻", 0: "⁰", 1: "¹", 2: "²", 3: "³", 4: "⁴", 5: "⁵", 6: "⁶", 7: "⁷", 8: "⁸", 9: "⁹" };
export function formatearOhm(v) {
  return v >= 1000 ? `${+(v / 1000).toPrecision(6)} kΩ` : `${+v.toPrecision(6)} Ω`;
}
export function explicarBandas(valor) {
  const p = descomponer(valor);
  if (!p) return { colores: [], nombres: [], formula: "" };
  const [d1, d2, exp] = p;
  const nombres = [NOMBRE_DIGITO[d1], NOMBRE_DIGITO[d2], NOMBRE_MULT_EXTRA[exp] ?? NOMBRE_DIGITO[exp] ?? "?"];
  const sup = String(exp).split("").map((c) => SUP[c]).join("");
  return { colores: bandasDeColor(valor), nombres, formula: `${d1}${d2} × 10${sup} = ${formatearOhm(valor)}` };
}

export const COLOR_FONDO_LIENZO = "#FBF9F4";
export const COLOR_PUNTO_GRID = "#C4BAA7";
export const COLOR_CABLE_CON_CORRIENTE = "#D65A4A";
const COLOR_CUERPO_RESISTENCIA = "#E6D5B0";
const COLOR_BORDE_RESISTENCIA = "#B39A68";
const COLOR_LEAD = "#6C7278";
const COLOR_AMPOLLA_APAGADA = "#DAD5CB";
const COLOR_AMPOLLA_ENCENDIDA = "#FFE066";
const COLOR_BORDE_BOMBILLO_ENCENDIDO = "#E0A800";
export const COLOR_LUZ = "#FFD23F";

export const COLORES_CABLE = [
  ["Gris", "#495057"], ["Rojo", "#E03131"], ["Negro", "#1A1D21"], ["Azul", "#1C7ED6"],
  ["Verde", "#2F9E44"], ["Amarillo", "#F5C518"], ["Naranja", "#F08C00"],
];
export const COLOR_CABLE_DEFECTO = COLORES_CABLE[0][1];

// ---- primitivas ----
function linea(ctx, x1, y1, x2, y2, color, ancho, cap = "butt") {
  ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2);
  ctx.strokeStyle = color; ctx.lineWidth = ancho; ctx.lineCap = cap; ctx.stroke();
}
function poligono(ctx, pts, relleno, borde, ancho = 1) {
  ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  ctx.closePath();
  if (relleno) { ctx.fillStyle = relleno; ctx.fill(); }
  if (borde) { ctx.strokeStyle = borde; ctx.lineWidth = ancho; ctx.lineJoin = "miter"; ctx.stroke(); }
}
function ovalo(ctx, cx, cy, rx, ry, relleno, borde, ancho = 1) {
  ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
  if (relleno) { ctx.fillStyle = relleno; ctx.fill(); }
  if (borde) { ctx.strokeStyle = borde; ctx.lineWidth = ancho; ctx.stroke(); }
}
export function texto(ctx, t, x, y, color, fnt, ancla = "center") {
  ctx.font = fnt; ctx.fillStyle = color; ctx.textAlign = ancla; ctx.textBaseline = "middle";
  const lineas = String(t).split("\n");
  if (lineas.length === 1) { ctx.fillText(t, x, y); return; }
  const alto = 13;
  lineas.forEach((l, i) => ctx.fillText(l, x, y + (i - (lineas.length - 1) / 2) * alto));
}

export function dibujarGrid(ctx, ancho, alto, espaciado = 28, origen = [0, 0]) {
  const x0 = ((origen[0] % espaciado) + espaciado) % espaciado;
  const y0 = ((origen[1] % espaciado) + espaciado) % espaciado;
  ctx.fillStyle = COLOR_PUNTO_GRID;
  for (let x = x0; x < ancho; x += espaciado) {
    for (let y = y0; y < alto; y += espaciado) {
      ctx.beginPath(); ctx.arc(x, y, 0.85, 0, Math.PI * 2); ctx.fill();
    }
  }
}

export function dibujarCable(ctx, puntos, color, conCorriente = false) {
  if (puntos.length < 2) return;
  const c = conCorriente ? COLOR_CABLE_CON_CORRIENTE : color || COLOR_CABLE_DEFECTO;
  const ancho = conCorriente ? 3.5 : 2.75;
  ctx.beginPath(); ctx.moveTo(puntos[0][0], puntos[0][1]);
  for (let i = 1; i < puntos.length; i++) ctx.lineTo(puntos[i][0], puntos[i][1]);
  ctx.strokeStyle = c; ctx.lineWidth = ancho; ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.stroke();
  for (const [x, y] of [puntos[0], puntos[puntos.length - 1]]) ovalo(ctx, x, y, 3, 3, c);
  for (const [x, y] of puntos.slice(1, -1)) ovalo(ctx, x, y, 2, 2, c);
}

function ejes(x1, y1, x2, y2) {
  const dx = x2 - x1, dy = y2 - y1, L = Math.hypot(dx, dy);
  if (L === 0) return null;
  const ux = dx / L, uy = dy / L;
  return { L, ux, uy, px: -uy, py: ux, mx: (x1 + x2) / 2, my: (y1 + y2) / 2 };
}

// Etiqueta junto al componente: si es vertical, va al costado sin tapar el cuerpo.
function etiquetaLado(ctx, t, mx, my, px, py, d, color) {
  if (Math.abs(px) > 0.7) {
    const lado = -px > 0 ? 1 : -1;
    texto(ctx, t, mx + lado * (d - 12), my, color, fuente(12), lado > 0 ? "left" : "right");
  } else texto(ctx, t, mx - px * d, my - py * d, color, fuente(12));
}

// Color del cuerpo según el calor (θ = fracción de su potencia máxima): beige → naranja → rojo.
function colorCalor(calor) {
  if (!(calor > 0.35)) return COLOR_CUERPO_RESISTENCIA;
  const t = Math.min(1, (calor - 0.35) / 0.65);
  return t < 0.6 ? mezclarColor(COLOR_CUERPO_RESISTENCIA, "#F08C3A", t / 0.6) : mezclarColor("#F08C3A", "#D9381E", (t - 0.6) / 0.4);
}
// Halo de calor alrededor de una pieza caliente (solo si de verdad se está calentando).
export function dibujarCalor(ctx, x1, y1, x2, y2, calor, fondo = COLOR_FONDO_LIENZO) {
  const e = ejes(x1, y1, x2, y2); if (!e || !(calor > 0.55)) return;
  const f = Math.min(1, (calor - 0.55) / 0.5);
  for (const [r, a] of [[22, 0.12], [15, 0.22]]) ovalo(ctx, e.mx, e.my, r + 6 * f, r * 0.7 + 4 * f, mezclarColor(fondo, "#F2683A", a * f));
}

export function dibujarResistencia(ctx, x1, y1, x2, y2, valor, seleccionada = false, conEtiqueta = true, { calor = 0, danado = false } = {}) {
  const e = ejes(x1, y1, x2, y2); if (!e) return;
  const { L, ux, uy, px, py, mx, my } = e;
  const lc = Math.min(46, L * 0.6);
  const cx1 = mx - (ux * lc) / 2, cy1 = my - (uy * lc) / 2;
  const cx2 = mx + (ux * lc) / 2, cy2 = my + (uy * lc) / 2;
  linea(ctx, x1, y1, cx1, cy1, COLOR_LEAD, 2.4);
  linea(ctx, x2, y2, cx2, cy2, COLOR_LEAD, 2.4);
  const sa = 9;
  poligono(ctx, [
    [cx1 + px * sa, cy1 + py * sa], [cx2 + px * sa, cy2 + py * sa],
    [cx2 - px * sa, cy2 - py * sa], [cx1 - px * sa, cy1 - py * sa],
  ], danado ? "#3B3430" : colorCalor(calor), seleccionada ? E.COLOR_ACENTO : danado ? "#1E1A17" : COLOR_BORDE_RESISTENCIA, seleccionada ? 2.5 : 1.5);
  if (danado) {
    // cuerpo carbonizado con una grieta: la resistencia quedó abierta
    ctx.beginPath(); ctx.moveTo(mx - ux * 4 + px * sa, my - uy * 4 + py * sa); ctx.lineTo(mx + ux * 3 + px * 2, my + uy * 3 + py * 2);
    ctx.lineTo(mx - ux * 2 - px * 3, my - uy * 2 - py * 3); ctx.lineTo(mx + ux * 4 - px * sa, my + uy * 4 - py * sa);
    ctx.strokeStyle = "#F08C3A"; ctx.lineWidth = 1.6; ctx.lineJoin = "round"; ctx.stroke();
    if (conEtiqueta) etiquetaLado(ctx, "Quemada", mx, my, px, py, sa + 14, E.COLOR_ERROR);
    return;
  }
  const colores = [...bandasDeColor(valor), TOLERANCIA_ORO];
  const ab = lc * 0.11;
  colores.forEach((color, i) => {
    const t = 0.16 + i * 0.23;
    const bx = cx1 + (cx2 - cx1) * t, by = cy1 + (cy2 - cy1) * t;
    const b1 = [bx + px * sa * 0.92, by + py * sa * 0.92], b2 = [bx - px * sa * 0.92, by - py * sa * 0.92];
    poligono(ctx, [
      [b1[0] + (ux * ab) / 2, b1[1] + (uy * ab) / 2], [b2[0] + (ux * ab) / 2, b2[1] + (uy * ab) / 2],
      [b2[0] - (ux * ab) / 2, b2[1] - (uy * ab) / 2], [b1[0] - (ux * ab) / 2, b1[1] - (uy * ab) / 2],
    ], color);
  });
  if (conEtiqueta) etiquetaLado(ctx, formatearOhm(valor), mx, my, px, py, sa + 14, E.COLOR_TEXTO_SECUNDARIO);
}

export function dibujarBateria(ctx, x1, y1, x2, y2, voltaje, seleccionada = false, conEtiqueta = true) {
  const e = ejes(x1, y1, x2, y2); if (!e) return;
  const { ux, uy, px, py, mx, my } = e;
  const sep = 7;
  const pp = [mx - ux * sep, my - uy * sep], pn = [mx + ux * sep, my + uy * sep];
  linea(ctx, x1, y1, pp[0], pp[1], COLOR_LEAD, 2.4);
  linea(ctx, x2, y2, pn[0], pn[1], COLOR_LEAD, 2.4);
  const borde = seleccionada ? E.COLOR_ACENTO : E.COLOR_TEXTO_PRINCIPAL;
  const lmas = 18;
  linea(ctx, pp[0] + (px * lmas) / 2, pp[1] + (py * lmas) / 2, pp[0] - (px * lmas) / 2, pp[1] - (py * lmas) / 2, borde, 2.5);
  const lmenos = 11;
  linea(ctx, pn[0] + (px * lmenos) / 2, pn[1] + (py * lmenos) / 2, pn[0] - (px * lmenos) / 2, pn[1] - (py * lmenos) / 2, borde, 5.5);
  if (conEtiqueta) texto(ctx, `${+voltaje.toPrecision(6)} V`, mx - px * 30, my - py * 30, E.COLOR_TEXTO_PRINCIPAL, fuente(13, true), "left");
  texto(ctx, "+", pp[0] + px * (lmas / 2 + 10), pp[1] + py * (lmas / 2 + 10), E.COLOR_EXITO, fuente(14, true));
  texto(ctx, "−", pn[0] + px * (lmenos / 2 + 10), pn[1] + py * (lmenos / 2 + 10), E.COLOR_ERROR, fuente(14, true));
}

export function colorBrilloBombillo(brillo) {
  if (!brillo) return COLOR_AMPOLLA_APAGADA;
  return mezclarColor(COLOR_AMPOLLA_APAGADA, COLOR_AMPOLLA_ENCENDIDA, brillo);
}

// El resplandor se dibuja aparte (capa por debajo de los cables).
export function dibujarResplandor(ctx, x1, y1, x2, y2, brillo, fondo = COLOR_FONDO_LIENZO) {
  const e = ejes(x1, y1, x2, y2); if (!e || !brillo || brillo <= 0.02) return;
  const radio = Math.min(16, e.L * 0.32);
  for (const [extra, intensidad] of [[16, 0.16], [10, 0.3], [5, 0.48]]) {
    const r = radio + extra * brillo;
    ovalo(ctx, e.mx, e.my, r, r, mezclarColor(fondo, COLOR_LUZ, intensidad * brillo));
  }
}

export function dibujarBombillo(ctx, x1, y1, x2, y2, valor, brillo = null, seleccionada = false, conEtiqueta = true, { danado = false, calor = 0 } = {}) {
  const e = ejes(x1, y1, x2, y2); if (!e) return;
  const { L, ux, uy, px, py, mx, my } = e;
  const radio = Math.min(16, L * 0.32);
  linea(ctx, x1, y1, mx - ux * radio, my - uy * radio, COLOR_LEAD, 2.4);
  linea(ctx, x2, y2, mx + ux * radio, my + uy * radio, COLOR_LEAD, 2.4);
  const borde = seleccionada ? E.COLOR_ACENTO : danado ? "#5B534A" : calor > 1 ? E.COLOR_ERROR : brillo && brillo > 0.05 ? COLOR_BORDE_BOMBILLO_ENCENDIDO : COLOR_BORDE_RESISTENCIA;
  ovalo(ctx, mx, my, radio, radio, danado ? "#B8B1A6" : colorBrilloBombillo(brillo), borde, seleccionada || calor > 1 ? 2 : 1.5);
  if (danado) {
    // vidrio ennegrecido y filamento cortado en dos
    ovalo(ctx, mx - px * radio * 0.35, my - py * radio * 0.35, radio * 0.55, radio * 0.4, "rgba(60,52,44,.35)");
    const a = [mx - ux * radio * 0.55, my - uy * radio * 0.55], b = [mx + ux * radio * 0.55, my + uy * radio * 0.55];
    linea(ctx, a[0], a[1], mx - ux * 3 + px * 4, my - uy * 3 + py * 4, "#4A4238", 1.5, "round");
    linea(ctx, b[0], b[1], mx + ux * 3 - px * 3, my + uy * 3 - py * 3, "#4A4238", 1.5, "round");
    if (conEtiqueta) etiquetaLado(ctx, "Fundido", mx, my, px, py, radio + 14, E.COLOR_ERROR);
    return;
  }
  // reflejo del vidrio
  const rr = radio * 0.7;
  ctx.beginPath(); ctx.arc(mx, my, rr, -(110 + 60) * Math.PI / 180, -110 * Math.PI / 180);
  ctx.strokeStyle = "#FFFFFF"; ctx.lineWidth = 2; ctx.lineCap = "butt"; ctx.stroke();
  // filamento
  const cf = mezclarColor("#8A7F6A", "#E07B00", Math.min(1, (brillo || 0) * 1.6));
  const pts = [];
  const n = 3;
  for (let i = 0; i <= n; i++) {
    const t = -0.5 + i / n;
    const signo = i % 2 === 0 ? 1 : -1;
    const off = i > 0 && i < n ? radio * 0.45 * signo : 0;
    pts.push([mx + ux * (t * radio * 1.1) + px * off, my + uy * (t * radio * 1.1) + py * off]);
  }
  ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); pts.slice(1).forEach((p) => ctx.lineTo(p[0], p[1]));
  ctx.strokeStyle = cf; ctx.lineWidth = 1.5; ctx.lineJoin = "miter"; ctx.stroke();
  if (conEtiqueta) etiquetaLado(ctx, formatearOhm(valor), mx, my, px, py, radio + 14, E.COLOR_TEXTO_SECUNDARIO);
}

export function dibujarInterruptor(ctx, x1, y1, x2, y2, cerrado, seleccionada = false, conEtiqueta = true) {
  const e = ejes(x1, y1, x2, y2); if (!e) return;
  const { L, ux, uy, px, py, mx, my } = e;
  const hueco = Math.min(34, L * 0.5);
  const ca = [mx - (ux * hueco) / 2, my - (uy * hueco) / 2], cb = [mx + (ux * hueco) / 2, my + (uy * hueco) / 2];
  linea(ctx, x1, y1, ca[0], ca[1], COLOR_LEAD, 2.4);
  linea(ctx, x2, y2, cb[0], cb[1], COLOR_LEAD, 2.4);
  const colorEstado = cerrado ? E.COLOR_EXITO : E.COLOR_ERROR;
  const fondoEstado = cerrado ? E.COLOR_EXITO_SUAVE : E.COLOR_ERROR_SUAVE;
  const sa = Math.max(4, Math.min(9, hueco * 0.28));
  const extra = hueco * 0.3;
  const ba = [ca[0] - ux * extra, ca[1] - uy * extra], bb = [cb[0] + ux * extra, cb[1] + uy * extra];
  poligono(ctx, [
    [ba[0] + px * sa, ba[1] + py * sa], [bb[0] + px * sa, bb[1] + py * sa],
    [bb[0] - px * sa, bb[1] - py * sa], [ba[0] - px * sa, ba[1] - py * sa],
  ], fondoEstado, seleccionada ? E.COLOR_ACENTO : colorEstado, seleccionada ? 2.5 : 1.5);
  const radio = Math.max(2.5, Math.min(4.5, hueco * 0.13));
  for (const c of [ca, cb]) ovalo(ctx, c[0], c[1], radio, radio, "#FFFFFF", COLOR_LEAD, 1.5);
  const grosor = Math.max(3, Math.min(5, hueco * 0.15));
  let punta;
  if (cerrado) punta = cb;
  else {
    const el = hueco * 0.7;
    punta = [ca[0] + ux * hueco * 0.8 + px * el, ca[1] + uy * hueco * 0.8 + py * el];
  }
  linea(ctx, ca[0], ca[1], punta[0], punta[1], colorEstado, grosor, "round");
  ovalo(ctx, ca[0], ca[1], radio, radio, colorEstado);
  if (conEtiqueta) {
    const t = cerrado ? "Cerrado" : "Abierto";
    if (Math.abs(px) > 0.7) {
      // de pie: el texto va al costado, del lado opuesto a la palanca, sin tapar la caja
      const lado = -px > 0 ? 1 : -1;
      texto(ctx, t, mx + lado * (sa + 8), my, colorEstado, fuente(12, true), lado > 0 ? "left" : "right");
    } else texto(ctx, t, mx - px * (sa + 12) + ux * 14, my - py * (sa + 12) + uy * 14, colorEstado, fuente(12, true));
  }
}

// Fusible: tubo de vidrio con un hilo. `calor` es su avance hacia la fusión (0 a 1).
export function dibujarFusible(ctx, x1, y1, x2, y2, corriente, seleccionada = false, conEtiqueta = true, { calor = 0, danado = false } = {}) {
  const e = ejes(x1, y1, x2, y2); if (!e) return;
  const { L, ux, uy, px, py, mx, my } = e;
  const lc = Math.min(40, L * 0.55), sa = 7;
  const c1 = [mx - ux * lc / 2, my - uy * lc / 2], c2 = [mx + ux * lc / 2, my + uy * lc / 2];
  linea(ctx, x1, y1, c1[0], c1[1], COLOR_LEAD, 2.4);
  linea(ctx, x2, y2, c2[0], c2[1], COLOR_LEAD, 2.4);
  const caja = (a, b, s) => [[a[0] + px * s, a[1] + py * s], [b[0] + px * s, b[1] + py * s], [b[0] - px * s, b[1] - py * s], [a[0] - px * s, a[1] - py * s]];
  poligono(ctx, caja(c1, c2, sa), danado ? "#E9E3DA" : "#EEF5FA", seleccionada ? E.COLOR_ACENTO : "#8FA3B3", seleccionada ? 2.5 : 1.5);
  // tapas metálicas
  const t = 6;
  poligono(ctx, caja(c1, [c1[0] + ux * t, c1[1] + uy * t], sa + 1), "#AEB6BF", "#7C8792", 1);
  poligono(ctx, caja([c2[0] - ux * t, c2[1] - uy * t], c2, sa + 1), "#AEB6BF", "#7C8792", 1);
  const h1 = [c1[0] + ux * t, c1[1] + uy * t], h2 = [c2[0] - ux * t, c2[1] - uy * t];
  if (danado) {
    linea(ctx, h1[0], h1[1], mx - ux * 4, my - uy * 4, "#5B534A", 1.6, "round");
    linea(ctx, mx + ux * 4, my + uy * 4, h2[0], h2[1], "#5B534A", 1.6, "round");
    ovalo(ctx, mx, my, 4, 3, "rgba(60,52,44,.25)");
  } else {
    const col = calor > 0.05 ? mezclarColor("#7C8792", "#FF6A1A", Math.min(1, calor * 1.4)) : "#7C8792";
    linea(ctx, h1[0], h1[1], h2[0], h2[1], col, 1.6 + Math.min(1, calor), "round");
  }
  if (conEtiqueta) etiquetaLado(ctx, danado ? "Abierto" : `${+corriente.toPrecision(3)} A`, mx, my, px, py, sa + 14, danado ? E.COLOR_ERROR : E.COLOR_TEXTO_SECUNDARIO);
}

export function dibujarIcono(ctx, tipo, ancho, alto, { valor = null, cerrado = false, color = null } = {}) {
  const margen = 6, cy = alto / 2, x1 = margen, x2 = ancho - margen;
  if (tipo === "resistencia") dibujarResistencia(ctx, x1, cy, x2, cy, valor || 220, false, false);
  else if (tipo === "bombillo") dibujarBombillo(ctx, x1, cy, x2, cy, valor || 10, 0.9, false, false);
  else if (tipo === "interruptor") dibujarInterruptor(ctx, x1, cy + 5, x2, cy + 5, cerrado, false, false);
  else if (tipo === "bateria") dibujarBateria(ctx, x1, cy - 4, x2, cy - 4, valor || 12, false, false);
  else if (tipo === "fusible") dibujarFusible(ctx, x1, cy, x2, cy, valor || 0.5, false, false);
  else if (tipo === "cable") {
    dibujarCable(ctx, [[x1 + 2, alto - 10], [ancho / 2, alto - 10], [ancho / 2, 10], [x2 - 2, 10]], color || COLORES_CABLE[1][1]);
  } else if (tipo === "seleccionar") {
    const cx = ancho / 2 - 5, top = alto / 2 - 13;
    const f = [[0, 0], [0, 22], [6, 16.5], [10, 25], [13.5, 23.5], [9.5, 15], [17, 15]];
    poligono(ctx, f.map(([dx, dy]) => [cx + dx, top + dy]), E.COLOR_TEXTO_PRINCIPAL, E.COLOR_FONDO_TARJETA, 1.5);
  }
}

export function dibujarSimbolo(ctx, tipo, ancho, alto, color = null) {
  const c = color || E.COLOR_TEXTO_PRINCIPAL, cy = alto / 2, x1 = 8, x2 = ancho - 8, mx = ancho / 2, g = 2;
  if (tipo === "resistencia") {
    linea(ctx, x1, cy, mx - 24, cy, c, g); linea(ctx, mx + 24, cy, x2, cy, c, g);
    ctx.beginPath();
    for (let i = 0; i < 7; i++) {
      const x = mx - 24 + i * 8, y = i === 0 || i === 6 ? cy : i % 2 ? cy - 8 : cy + 8;
      i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    }
    ctx.strokeStyle = c; ctx.lineWidth = g; ctx.lineJoin = "miter"; ctx.stroke();
  } else if (tipo === "bombillo") {
    const r = 12;
    linea(ctx, x1, cy, mx - r, cy, c, g); linea(ctx, mx + r, cy, x2, cy, c, g);
    ovalo(ctx, mx, cy, r, r, null, c, g);
    const d = r * 0.7;
    linea(ctx, mx - d, cy - d, mx + d, cy + d, c, g); linea(ctx, mx - d, cy + d, mx + d, cy - d, c, g);
  } else if (tipo === "interruptor") {
    linea(ctx, x1, cy, mx - 14, cy, c, g); linea(ctx, mx + 14, cy, x2, cy, c, g);
    ovalo(ctx, mx - 14, cy, 3, 3, null, c, g); ovalo(ctx, mx + 14, cy, 3, 3, null, c, g);
    linea(ctx, mx - 12, cy - 2, mx + 12, cy - 12, c, g);
  } else if (tipo === "bateria") {
    linea(ctx, x1, cy, mx - 5, cy, c, g); linea(ctx, mx + 5, cy, x2, cy, c, g);
    linea(ctx, mx - 5, cy - 13, mx - 5, cy + 13, c, g); linea(ctx, mx + 5, cy - 7, mx + 5, cy + 7, c, 5);
    texto(ctx, "+", mx - 14, cy - 12, c, fuente(12, true));
  } else if (tipo === "cable") {
    linea(ctx, x1, cy, x2, cy, c, g);
    for (const x of [x1, x2]) ovalo(ctx, x, cy, 3, 3, c);
  }
}
