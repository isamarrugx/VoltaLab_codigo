import { IconoEstado } from "./Iconos.jsx";

export function CajaTitulada({ titulo, color, fondo, forma, flash, children, style }) {
  return (
    <div className={`caja-t ${flash ? "flash" : ""}`} style={{ background: fondo, borderColor: color, ...style }}>
      <div className="cab-t" style={{ color }}>{forma ? <IconoEstado forma={forma} color={color} tam={16} /> : null}{titulo}</div>
      {children}
    </div>
  );
}

export function BarraPasos({ total, actual, hechas, texto }) {
  return (
    <div className="pasos-barra">
      <div className="txt-p">{texto}</div>
      <div className="seg">{Array.from({ length: total }, (_, k) => <i key={k} className={k < hechas ? "h" : k === actual ? "a" : ""} />)}</div>
    </div>
  );
}

export function OpcionRelieve({ letra, texto, estado = "normal", deshabilitada, onClick }) {
  return <button type="button" className={`opc-r ${estado}`} disabled={deshabilitada} onClick={onClick}><b>{letra}</b><span>{texto}</span></button>;
}

// Teoria completa (modo lectura)
export function Teoria({ lec, bloques, onVolver }) {
  return (
    <div className="lectura"><div className="col">
      <div className="rot">TEORÍA COMPLETA  ·  PARA REPASAR O PROFUNDIZAR</div>
      <h2>{lec.titulo}</h2>
      <p style={{ color: "var(--acento)", fontSize: 14 }}>{lec.resumen}</p>
      {bloques.map((b, i) => {
        if (b.tipo === "texto") return <div key={i}><h3>{b.titulo}</h3>{b.parrafos.map((p, j) => <p key={j}>{p}</p>)}</div>;
        if (b.tipo === "clave") return <CajaTitulada key={i} titulo="IDEA CLAVE" color="var(--acento)" fondo="var(--acento-suave)"><p style={{ fontWeight: 700, fontSize: 14, margin: 0 }}>{b.texto}</p></CajaTitulada>;
        if (b.tipo === "analogia") return <CajaTitulada key={i} titulo={b.titulo.toUpperCase()} color="var(--elec-oscuro)" fondo="var(--elec-suave)"><p style={{ margin: 0 }}>{b.texto}</p></CajaTitulada>;
        if (b.tipo === "ojo" || b.tipo === "vida") {
          const [c, f] = b.tipo === "ojo" ? ["var(--adv)", "var(--adv-suave)"] : ["var(--exito)", "var(--exito-suave)"];
          return <CajaTitulada key={i} titulo={b.titulo.toUpperCase()} color={c} fondo={f}><p style={{ margin: 0 }}>{b.texto}</p></CajaTitulada>;
        }
        if (b.tipo === "formula") return (
          <div key={i} className="formula-grande"><div className="f">{b.formula}</div>
            {b.simbolos.map(([s, t], j) => <div className="s" key={j}><b style={{ width: 110 }}>{s}</b><span>{t}</span></div>)}</div>);
        if (b.tipo === "ejemplo") return (
          <CajaTitulada key={i} titulo={b.titulo.toUpperCase()} color="var(--texto2)" fondo="var(--fondo)">
            <p style={{ fontWeight: 700, margin: "0 0 6px" }}>{b.enunciado}</p>
            {b.pasos.map((l, j) => <p key={j} style={{ margin: "0 0 3px 12px", fontWeight: j === b.pasos.length - 1 ? 700 : 400, color: j === b.pasos.length - 1 ? "var(--acento)" : undefined }}>{l}</p>)}
          </CajaTitulada>);
        return null;
      })}
      <button className="btn prim grande completo" style={{ marginTop: 10 }} onClick={onVolver}>Volver al circuito  →</button>
    </div></div>
  );
}

export function Candado({ color = "#5F6B7A", t = 26 }) {
  return (
    <svg width={t} height={t} viewBox="0 0 26 26"><path d="M8 11V8.5a5 5 0 0 1 10 0V11" fill="none" stroke={color} strokeWidth="2.2" /><rect x="5.7" y="11" width="14.6" height="11.5" fill={color} /><circle cx="13" cy="16" r="1.4" fill="#fff" /></svg>
  );
}
export function Estrellas({ n, t = 18 }) {
  const pts = (cx, cy, R, r) => Array.from({ length: 10 }, (_, k) => { const a = -Math.PI / 2 + (k * Math.PI) / 5, rr = k % 2 ? r : R; return `${cx + rr * Math.cos(a)},${cy + rr * Math.sin(a)}`; }).join(" ");
  return (
    <svg width={t * 3.4} height={t} viewBox="0 0 62 18">
      {[0, 1, 2].map((k) => <polygon key={k} points={pts(9 + k * 21, 9.5, 8.5, 3.6)} fill={k < n ? "#F2B705" : "#E2DCD0"} stroke={k < n ? "#B7860B" : "#D8D0C0"} strokeWidth="1" strokeLinejoin="round" />)}
    </svg>
  );
}
