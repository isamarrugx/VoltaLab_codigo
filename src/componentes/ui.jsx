import { useEffect, useRef, useState } from "react";
import { animar, mezclarColor } from "../lib/animaciones.js";

export function Switch({ on, onChange, children, chico = false }) {
  return (
    <button type="button" className={`switch ${on ? "on" : ""} ${chico ? "chico" : ""}`} onClick={() => onChange(!on)} role="switch" aria-checked={on}>
      <span className="pista" />{children}
    </button>
  );
}

export function Barra({ valor, color = "var(--exito)" }) {
  return <div className="progreso"><div style={{ width: `${Math.round(valor * 100)}%`, background: color, transition: "width .3s" }} /></div>;
}

// Numero que se anima hacia su nuevo valor
export function useAnimadoValor(objetivo, duracion = 550, inicio = objetivo) {
  const [v, setV] = useState(inicio);
  const ref = useRef(inicio);
  useEffect(() => {
    const desde = ref.current;
    if (desde === objetivo) return;
    const a = animar(duracion, (t) => { const x = desde + (objetivo - desde) * t; ref.current = x; setV(x); }, () => { ref.current = objetivo; setV(objetivo); });
    return () => a.cancelar();
  }, [objetivo, duracion]);
  return v;
}

export function Color({ de, a, t }) { return mezclarColor(de, a, t); }

export function SeccionesExplicacion({ secciones }) {
  return (
    <div>
      {secciones.map((s, i) => (
        <div key={i}>
          <div className="sec-t">{s.titulo}</div>
          <div className="sec-x">{s.texto}</div>
          {s.formula ? <span className="formula">{s.formula}</span> : null}
        </div>
      ))}
    </div>
  );
}

export function Ecuaciones({ pasos }) {
  return (
    <div>
      {pasos.map((p, i) => {
        const dest = new Set(p.destacar ?? [p.lineas.length - 1]);
        return (
          <div className="eq-paso" key={i}>
            <div className="cab-p"><span className="num">{i + 1}</span>{p.titulo}</div>
            {p.texto ? <div className="pequeno" style={{ marginTop: 2 }}>{p.texto}</div> : null}
            <div className="caja">
              {p.lineas.map((l, j) => <div key={j} className={`f ${dest.has(j) ? "fuerte" : ""}`}>{l}</div>)}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function TarjetaValor({ titulo, color, formateador, valor, previo, detalle, formula, proporcion }) {
  const mostrado = useAnimadoValor(valor, 550, previo ?? 0);
  const cambio = previo != null && previo !== 0 && Math.abs(valor - previo) / Math.abs(previo) > 0.005
    ? ((valor - previo) / Math.abs(previo)) * 100 : null;
  const [t, setT] = useState(1);
  const [abierto, setAbierto] = useState(false);
  useEffect(() => {
    if (previo == null || cambio !== null) { setT(0); const a = animar(550, setT); return () => a.cancelar(); }
  }, [valor]); // eslint-disable-line
  const colorNum = mezclarColor(mezclarColor("#1A73A8", "#1F2A37", 0.5), "#1F2A37", t);
  return (
    <div className="valor" onClick={() => setAbierto((a) => !a)} style={{ cursor: "pointer" }} title="Clic para ver el porqué">
      <div className="raya" style={{ background: color }} />
      <div className="c">
        <div className="t"><span style={{ color }}>{titulo}</span>
          {cambio !== null ? <span className="chip elec">{cambio > 0 ? "sube" : "baja"} {Math.abs(cambio).toFixed(0)} %</span> : null}
        </div>
        <div className="n" style={{ color: colorNum }}>{formateador(mostrado)}</div>
        <div className="barrita"><div style={{ width: `${Math.max(0, Math.min(1, proporcion)) * 100}%`, background: color, transition: "width .5s" }} /></div>
        {formula ? <div className="fx">{formula}</div> : null}
        {abierto ? <div className="det" style={{ marginTop: 4 }}>{detalle}</div> : <div className="pq" style={{ marginTop: 3 }}>¿Por qué?  +</div>}
      </div>
    </div>
  );
}
