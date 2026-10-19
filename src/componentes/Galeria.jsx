import { useEffect, useRef } from "react";
import * as cv from "../lib/cv.js";
import { EJEMPLOS, ORDEN_EJEMPLOS } from "../datos/ejemplos.js";
import { limitesDef } from "../datos/lecciones.js";

const ESP = 40;
const ETIQ = { serie: ["Serie", "adv-suave"], paralelo: ["Paralelo", "acento"], mixto: ["Mixto", "exito"], compleja: ["Compleja", "elec"], control: ["Control", "acento"], falla: ["Falla", "error"] };

// Dibuja el circuito del ejemplo en miniatura (mismas piezas que el tablero).
export function Miniatura({ def, w = 196, h = 84 }) {
  const ref = useRef(null);
  useEffect(() => {
    const c = ref.current, dpr = window.devicePixelRatio || 1;
    c.width = w * dpr; c.height = h * dpr;
    const ctx = c.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, w, h);
    const [f0, f1, c0, c1] = limitesDef(def);
    const bw = (c1 - c0 + 2) * ESP, bh = (f1 - f0 + 2) * ESP;
    const z = Math.min(w / bw, h / bh, 0.55);
    ctx.translate(w / 2 - ((c0 + c1) / 2) * ESP * z, h / 2 - ((f0 + f1) / 2) * ESP * z); ctx.scale(z, z);
    const px = (p) => [p[1] * ESP, p[0] * ESP];
    for (const [a, b] of def.cables || []) cv.dibujarCable(ctx, [px(a), px(b)], cv.COLOR_CABLE_DEFECTO);
    for (const [a, b, v] of def.resistencias || []) cv.dibujarResistencia(ctx, ...px(a), ...px(b), v, false, false);
    for (const [a, b, v] of def.bombillos || []) cv.dibujarBombillo(ctx, ...px(a), ...px(b), v, 0.7, false, false);
    for (const [a, b, cer] of def.interruptores || []) cv.dibujarInterruptor(ctx, ...px(a), ...px(b), cer, false, false);
    if (def.bateria) cv.dibujarBateria(ctx, ...px(def.bateria[0]), ...px(def.bateria[1]), def.bateria[2], false, false);
  }, [def, w, h]);
  return <canvas ref={ref} style={{ width: w, height: h, display: "block" }} />;
}

export default function Galeria({ onElegir, onCerrar, actual }) {
  return (
    <div className="galeria tarjeta">
      <div className="gal-cab">
        <div><h3>Circuitos de ejemplo</h3><span>Elige uno para cargarlo en el tablero. Cada ejemplo trae una guía para explicarlo en clase.</span></div>
        <button className="btn sm" onClick={onCerrar}>Cerrar</button>
      </div>
      <div className="gal-tira">
        {ORDEN_EJEMPLOS.map((k) => {
          const e = EJEMPLOS[k]; const [t, col] = ETIQ[e.etiqueta] || ["", "acento"];
          return (
            <button key={k} className={`gal-card ${actual === k ? "sel" : ""}`} onClick={() => onElegir(k)}>
              <div className="gal-mini"><Miniatura def={e} /></div>
              <span className={`gal-tag ${col}`}>{t}</span>
              <b>{e.nombre}</b>
              <small>{e.descripcion}</small>
            </button>
          );
        })}
      </div>
    </div>
  );
}
