import { useEffect, useRef } from "react";
import * as E from "../lib/estilos.js";
import { fuente } from "../lib/cv.js";

function bonito(max, n = 2) { // valor "redondo" para marcas de eje
  const paso0 = max / n; const p = 10 ** Math.floor(Math.log10(paso0 || 1)); const f = paso0 / p;
  const nice = f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10;
  return nice * p;
}
const g3 = (v) => String(+v.toPrecision(3));

function useCanvasResponsivo(alto, dibujar, deps) {
  const ref = useRef(null);
  useEffect(() => {
    const c = ref.current; if (!c) return;
    const pintar = () => {
      const w = Math.floor(c.parentElement.getBoundingClientRect().width); if (w < 20) return;
      const dpr = window.devicePixelRatio || 1;
      c.width = w * dpr; c.height = alto * dpr; c.style.width = `${w}px`; c.style.height = `${alto}px`;
      const ctx = c.getContext("2d"); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = E.COLOR_FONDO_TARJETA; ctx.fillRect(0, 0, w, alto);
      dibujar(ctx, w, alto);
    };
    pintar();
    const ro = new ResizeObserver(pintar); ro.observe(c.parentElement);
    return () => ro.disconnect();
    // eslint-disable-next-line
  }, deps);
  return <canvas ref={ref} />;
}

const SERIES = [
  ["voltaje", "Voltaje (V)", E.COLOR_VOLTAJE],
  ["corriente", "Corriente (A)", E.COLOR_CORRIENTE],
  ["potencia", "Potencia (W)", E.COLOR_POTENCIA],
];

export function GraficaVivo({ datos, formateadores }) {
  return useCanvasResponsivo(250, (ctx, W, H) => {
    const izq = 40, der = 10, arriba = 4, abajo = 22;
    const ph = (H - arriba - abajo) / 3, sep = 18, alto = ph - sep + 4;
    const n = datos.length, xs = Math.max(5, n);
    SERIES.forEach(([clave, nombre, color], k) => {
      const y0 = arriba + k * ph + 14, y1 = y0 + alto - 14;
      const ys = datos.map((d) => d[clave]);
      const max = ys.length ? Math.max(...ys) : 1;
      const tope = (max > 0 ? max : 1) * 1.3;
      const X = (i) => izq + ((i + 1 - 0.5) / xs) * (W - izq - der);
      const Y = (v) => y1 - (v / tope) * (y1 - y0);
      ctx.font = fuente(11, true); ctx.textBaseline = "middle"; ctx.textAlign = "left"; ctx.fillStyle = E.COLOR_TEXTO_PRINCIPAL;
      ctx.fillText(nombre, 2, y0 - 8);
      if (n) { ctx.textAlign = "right"; ctx.fillText(formateadores[clave](ys[n - 1]), W - der, y0 - 8); }
      // rejilla y ejes
      const marca = bonito(tope, 2);
      ctx.strokeStyle = E.COLOR_BORDE_NORMAL; ctx.lineWidth = 0.7; ctx.fillStyle = E.COLOR_TEXTO_SECUNDARIO; ctx.font = fuente(10); ctx.textAlign = "right";
      for (let v = 0; v <= tope + 1e-12; v += marca) {
        const y = Y(v); ctx.beginPath(); ctx.moveTo(izq, y); ctx.lineTo(W - der, y); ctx.stroke(); ctx.fillText(g3(v), izq - 4, y);
      }
      ctx.beginPath(); ctx.moveTo(izq, y0); ctx.lineTo(izq, y1); ctx.lineTo(W - der, y1); ctx.stroke();
      if (k === 2) {
        ctx.textAlign = "center"; ctx.textBaseline = "top";
        const paso = Math.max(1, Math.ceil(xs / 5));
        for (let i = 1; i <= xs; i += paso) { ctx.fillText(String(i), X(i - 1), y1 + 3); }
        ctx.fillText("Cambio en el circuito", (izq + W - der) / 2, y1 + 13);
      }
      if (n) {
        ctx.beginPath(); ys.forEach((v, i) => (i ? ctx.lineTo(X(i), Y(v)) : ctx.moveTo(X(i), Y(v))));
        ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.lineJoin = "round"; ctx.stroke();
        ys.forEach((v, i) => { ctx.beginPath(); ctx.arc(X(i), Y(v), 4, 0, Math.PI * 2); ctx.fillStyle = color; ctx.fill(); ctx.strokeStyle = E.COLOR_FONDO_TARJETA; ctx.lineWidth = 1; ctx.stroke(); });
      }
    });
    if (!n) {
      ctx.fillStyle = E.COLOR_TEXTO_SECUNDARIO; ctx.font = fuente(11); ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText("Simula el circuito para ver", W / 2 + 14, H / 2 - 6); ctx.fillText("cómo cambian los valores", W / 2 + 14, H / 2 + 8);
    }
  }, [datos]);
}

const TIPOS_REL = {
  VI: ["Voltaje (V)", "Corriente (mA)", "Voltaje y corriente", E.COLOR_VOLTAJE],
  RI: ["Resistencia (Ω)", "Corriente (mA)", "Resistencia y corriente", E.COLOR_CORRIENTE],
  RP: ["Resistencia (Ω)", "Potencia (W)", "Resistencia y potencia", E.COLOR_POTENCIA],
};
export const puntoDe = (tipo, m) => (tipo === "VI" ? [m.V, m.I * 1000] : tipo === "RI" ? [m.Req, m.I * 1000] : [m.Req, m.P]);

export function GraficaRelacion({ tipo, mediciones, alto = 210 }) {
  const [ex, ey, titulo, color] = TIPOS_REL[tipo];
  return useCanvasResponsivo(alto, (ctx, W, H) => {
    const izq = 46, der = 12, arriba = 26, abajo = 34;
    const pw = W - izq - der, ph = H - arriba - abajo;
    ctx.font = fuente(12, true); ctx.fillStyle = E.COLOR_TEXTO_PRINCIPAL; ctx.textAlign = "left"; ctx.textBaseline = "middle";
    const validas = mediciones.filter((m) => !m.abierto && m.I > 0);
    if (!validas.length) {
      ctx.fillText(titulo, 4, 10);
      ctx.fillStyle = E.COLOR_TEXTO_SECUNDARIO; ctx.font = fuente(11); ctx.textAlign = "center"; ctx.fillText("Simula para agregar puntos", W / 2, H / 2);
      return;
    }
    const pts = validas.map((m) => puntoDe(tipo, m)), ult = validas[validas.length - 1];
    const xsv = pts.map((p) => p[0]), ysv = pts.map((p) => p[1]);
    const xMax = Math.max(...xsv) * 1.15; let yMax = Math.max(...ysv) * 1.25;
    const n = 60; let cx = [], cy = [], ley;
    if (tipo === "VI") { cx = Array.from({ length: n + 1 }, (_, i) => (xMax * i) / n); cy = cx.map((x) => (x / ult.Req) * 1000); ley = `I = V / ${+ult.Req.toPrecision(6)} Ω`; }
    else {
      const xMin = Math.min(...xsv) * 0.6; cx = Array.from({ length: n + 1 }, (_, i) => xMin + ((xMax - xMin) * i) / n);
      cy = tipo === "RI" ? cx.map((x) => (ult.V / x) * 1000) : cx.map((x) => (ult.V * ult.V) / x);
      ley = tipo === "RI" ? `I = ${+ult.V.toPrecision(6)} V / R` : `P = (${+ult.V.toPrecision(6)} V)² / R`;
      yMax = Math.max(yMax, Math.max(...ysv) * 1.25);
    }
    ctx.fillText(`${titulo}   (${ley})`, 4, 10);
    const X = (v) => izq + (v / xMax) * pw, Y = (v) => arriba + ph - (v / yMax) * ph;
    ctx.strokeStyle = E.COLOR_BORDE_NORMAL; ctx.lineWidth = 0.7; ctx.fillStyle = E.COLOR_TEXTO_SECUNDARIO; ctx.font = fuente(10);
    const mx = bonito(xMax, 4), my = bonito(yMax, 4);
    ctx.textAlign = "right"; ctx.textBaseline = "middle";
    for (let v = 0; v <= yMax; v += my) { ctx.beginPath(); ctx.moveTo(izq, Y(v)); ctx.lineTo(W - der, Y(v)); ctx.stroke(); ctx.fillText(g3(v), izq - 4, Y(v)); }
    ctx.textAlign = "center"; ctx.textBaseline = "top";
    for (let v = 0; v <= xMax; v += mx) { ctx.beginPath(); ctx.moveTo(X(v), arriba); ctx.lineTo(X(v), arriba + ph); ctx.stroke(); ctx.fillText(g3(v), X(v), arriba + ph + 3); }
    ctx.fillStyle = E.COLOR_TEXTO_SECUNDARIO; ctx.font = fuente(11);
    ctx.fillText(ex, izq + pw / 2, H - 14);
    ctx.save(); ctx.translate(11, arriba + ph / 2); ctx.rotate(-Math.PI / 2); ctx.textBaseline = "middle"; ctx.fillText(ey, 0, 0); ctx.restore();
    ctx.beginPath(); ctx.moveTo(izq, arriba); ctx.lineTo(izq, arriba + ph); ctx.lineTo(W - der, arriba + ph); ctx.strokeStyle = E.COLOR_BORDE_NORMAL; ctx.lineWidth = 1; ctx.stroke();
    ctx.save(); ctx.beginPath(); ctx.rect(izq, arriba, pw, ph); ctx.clip();
    ctx.setLineDash([4, 3]); ctx.beginPath(); cx.forEach((x, i) => (i ? ctx.lineTo(X(x), Y(cy[i])) : ctx.moveTo(X(x), Y(cy[i]))));
    ctx.strokeStyle = E.COLOR_TEXTO_SECUNDARIO; ctx.globalAlpha = 0.8; ctx.lineWidth = 1; ctx.stroke(); ctx.setLineDash([]); ctx.globalAlpha = 1;
    pts.forEach((p, i) => {
      const ultimo = i === pts.length - 1;
      ctx.beginPath(); ctx.arc(X(p[0]), Y(p[1]), ultimo ? 4.8 : 3.4, 0, Math.PI * 2);
      ctx.globalAlpha = ultimo ? 1 : 0.45; ctx.fillStyle = color; ctx.fill(); ctx.globalAlpha = 1;
      if (ultimo) { ctx.strokeStyle = E.COLOR_FONDO_TARJETA; ctx.lineWidth = 1.5; ctx.stroke(); }
    });
    ctx.restore();
  }, [mediciones, tipo]);
}
