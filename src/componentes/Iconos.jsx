import { useEffect, useRef } from "react";
import * as cv from "../lib/cv.js";

function usarCanvas(w, h, dibujar, deps) {
  const ref = useRef(null);
  useEffect(() => {
    const c = ref.current; if (!c) return;
    const dpr = window.devicePixelRatio || 1;
    c.width = w * dpr; c.height = h * dpr;
    const ctx = c.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    dibujar(ctx);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [w, h, ...deps]);
  return <canvas ref={ref} style={{ width: w, height: h }} />;
}

export function IconoCanvas({ tipo, w = 70, h = 42, valor = null, cerrado = false, color = null }) {
  return usarCanvas(w, h, (ctx) => cv.dibujarIcono(ctx, tipo, w, h, { valor, cerrado, color }), [tipo, valor, cerrado, color]);
}
export function SimboloCanvas({ tipo, w = 80, h = 34, color = null }) {
  return usarCanvas(w, h, (ctx) => cv.dibujarSimbolo(ctx, tipo, w, h, color), [tipo, color]);
}

export function IconoEstado({ forma, color, tam = 18 }) {
  const m = 2, t = tam;
  if (forma === "neutro") return <svg width={t} height={t}><circle cx={t / 2} cy={t / 2} r={t / 2 - m} fill="none" stroke={color} strokeWidth="2" /></svg>;
  return (
    <svg width={t} height={t}>
      <circle cx={t / 2} cy={t / 2} r={t / 2 - m} fill={color} />
      {forma === "ok"
        ? <polyline points={`${t * 0.3},${t * 0.52} ${t * 0.45},${t * 0.66} ${t * 0.72},${t * 0.36}`} fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        : <><line x1={t / 2} y1={t * 0.28} x2={t / 2} y2={t * 0.58} stroke="#fff" strokeWidth="2" strokeLinecap="round" /><circle cx={t / 2} cy={t * 0.7} r="1.2" fill="#fff" /></>}
    </svg>
  );
}

export { usarCanvas };
