import { useEffect, useRef, useState } from "react";
import * as E from "../lib/estilos.js";
import { formatearOhm, fuente } from "../lib/cv.js";

const CONTENIDO = {
  serie: {
    titulo: "Circuito en serie", r: [100, 200, 300],
    caracteristicas: ["Los elementos están conectados uno después de otro.", "Existe una sola trayectoria para la corriente.", "La resistencia equivalente corresponde a la suma de las resistencias.", "La corriente atraviesa todos los elementos del circuito.", "Si se interrumpe la trayectoria, deja de circular corriente en todo el circuito."],
    formula: "Req = R1 + R2 + R3 + ...",
    explicacion: "En un circuito en serie hay un único camino para la corriente, así que la misma corriente atraviesa cada resistencia. Por eso, si un elemento se abre o se desconecta (por ejemplo, un bombillo que se funde), el circuito completo deja de funcionar: es el mismo principio detrás de las series de luces antiguas, donde si un foco se quema, todos los demás se apagan.\n\nComo toda la corriente pasa por cada resistencia, para aumentar la resistencia total basta con sumar los valores individuales.",
    ejemplo: "Ejemplo: con R1=100Ω, R2=200Ω y R3=300Ω,\nReq = 100 + 200 + 300 = 600 Ω",
  },
  paralelo: {
    titulo: "Circuito en paralelo", r: [100, 200, 300],
    caracteristicas: ["Los elementos están conectados en diferentes ramas.", "Existen varias trayectorias para la corriente.", "El voltaje es común entre las ramas.", "La resistencia equivalente se obtiene mediante la suma de los inversos de las resistencias."],
    formula: "1/Req = 1/R1 + 1/R2 + 1/R3 + ...",
    explicacion: "En un circuito en paralelo cada resistencia forma su propia rama entre los mismos dos puntos, así que todas comparten el mismo voltaje, pero la corriente se reparte entre las ramas según su resistencia. Por eso, si una rama se desconecta, las demás siguen funcionando con normalidad: es el mismo principio detrás de la instalación eléctrica de una casa, donde apagar una lámpara no afecta a los demás enchufes.\n\nAgregar más ramas en paralelo siempre reduce la resistencia equivalente, incluso por debajo del valor de la resistencia más pequeña.",
    ejemplo: "Ejemplo: con R1=100Ω, R2=200Ω y R3=300Ω,\n1/Req = 1/100 + 1/200 + 1/300 → Req ≈ 54.5 Ω",
  },
};

const FUENTE = (t, b) => fuente(t, !!b);
function dibujar(ctx, w, h, tipo, rs) {
  ctx.clearRect(0, 0, w, h);
  const cab = E.COLOR_TEXTO_SECUNDARIO, caja = E.COLOR_FONDO_TARJETA, borde = E.COLOR_ACENTO, tx = E.COLOR_TEXTO_PRINCIPAL;
  const lin = (x1, y1, x2, y2) => { ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.strokeStyle = cab; ctx.lineWidth = 2; ctx.stroke(); };
  const txt = (t, x, y, f, c) => { ctx.font = f; ctx.fillStyle = c; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(t, x, y); };
  const rect = (x0, y0, x1, y1) => { ctx.fillStyle = caja; ctx.fillRect(x0, y0, x1 - x0, y1 - y0); ctx.strokeStyle = borde; ctx.lineWidth = 2; ctx.strokeRect(x0, y0, x1 - x0, y1 - y0); };
  const n = rs.length;
  if (tipo === "serie") {
    const mx = 46, my = 56, xi = mx, xd = w - mx, ya = my, yb = h - my, ym = (ya + yb) / 2;
    lin(xi, ya, xd, ya); lin(xd, ya, xd, yb); lin(xd, yb, xi, yb); lin(xi, yb, xi, ya);
    txt("V", xi - 22, ym, FUENTE(13, 1), tx); txt("+", xi, ya - 14, FUENTE(12, 1), E.COLOR_EXITO); txt("−", xi, yb + 14, FUENTE(12, 1), E.COLOR_ERROR);
    const aw = 58, ah = 34, paso = (xd - xi) / (n + 1);
    rs.forEach((r, i) => { const cx = xi + paso * (i + 1); rect(cx - aw / 2, ya - ah / 2, cx + aw / 2, ya + ah / 2); txt(`R${i + 1}`, cx, ya - ah / 2 - 12, FUENTE(11, 1), tx); txt(formatearOhm(r), cx, ya, FUENTE(10), cab); });
  } else {
    const mx = Math.min(60, w * 0.18), my = Math.max(30, h * 0.28), yf = my * 0.35;
    const xi = mx, xd = w - mx, ya = my, yb = h - my;
    lin(xi, ya, xi, yb); lin(xd, ya, xd, yb);
    txt("+", xi, yf, FUENTE(12, 1), E.COLOR_EXITO); txt("−", xd, yf, FUENTE(12, 1), E.COLOR_ERROR); txt("V", (xi + xd) / 2, yf, FUENTE(12, 1), tx);
    const py = n === 1 ? yb - ya : (yb - ya) / (n - 1);
    const ys = n === 1 ? [(ya + yb) / 2] : rs.map((_, i) => ya + py * i);
    const ah = Math.min(30, Math.max(14, py * 0.42)), aw = Math.min(56, w * 0.22), cx = (xi + xd) / 2;
    rs.forEach((r, i) => { const y = ys[i]; lin(xi, y, cx - aw / 2, y); lin(cx + aw / 2, y, xd, y); rect(cx - aw / 2, y - ah / 2, cx + aw / 2, y + ah / 2);
      txt(`R${i + 1}`, cx, y - (ah / 2 + 9), FUENTE(py >= 40 ? 11 : 9, 1), tx); txt(formatearOhm(r), cx, y, FUENTE(py >= 40 ? 10 : 8), cab); });
  }
}

function Diagrama({ tipo, rs, alto }) {
  const ref = useRef(null), cont = useRef(null);
  const [w, setW] = useState(300);
  useEffect(() => { const ro = new ResizeObserver(() => cont.current && setW(Math.max(200, cont.current.clientWidth))); ro.observe(cont.current); return () => ro.disconnect(); }, []);
  useEffect(() => {
    const c = ref.current, dpr = window.devicePixelRatio || 1;
    c.width = w * dpr; c.height = alto * dpr;
    const ctx = c.getContext("2d"); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    dibujar(ctx, w, alto, tipo, rs);
  }, [w, alto, tipo, rs]);
  return <div ref={cont}><canvas ref={ref} style={{ width: w, height: alto, display: "block" }} /></div>;
}

export default function Conceptos({ ir }) {
  const [det, setDet] = useState(null);
  const c = det && CONTENIDO[det];
  return (
    <div className="pantalla" style={{ overflowY: "auto" }}>
      <div className="cab">
        <button className="btn contorno med" style={{ marginTop: 6 }} onClick={() => (det ? setDet(null) : ir("Aprender"))}>← {det ? "Volver al repaso" : "Volver a Aprender"}</button>
        <div className="titulos"><h1 style={{ fontSize: 28 }}>{det ? c.titulo : "Antes de comenzar"}</h1><div className="sub" style={{ fontSize: 13 }}>{det ? "Repaso de conceptos" : "Conoce las características de los circuitos en serie y paralelo."}</div></div>
        <button className="btn prim med" style={{ marginTop: 6 }} onClick={() => ir("Configurar")}>Comenzar simulador</button>
      </div>
      {!det ? (
        <div className="grid3" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", maxWidth: 980, margin: "0 auto", width: "100%" }}>
          {Object.entries(CONTENIDO).map(([k, x]) => (
            <div key={k} className="tarjeta" style={{ padding: 18, display: "flex", flexDirection: "column" }}>
              <h3 style={{ margin: "0 0 8px", fontSize: 18 }}>{x.titulo}</h3>
              <Diagrama tipo={k} rs={x.r} alto={150} />
              <ul style={{ paddingLeft: 18, margin: "12px 0", fontSize: 13, flex: 1 }}>{x.caracteristicas.map((t, i) => <li key={i} style={{ marginBottom: 4 }}>{t}</li>)}</ul>
              <button className="btn contorno med completo" onClick={() => setDet(k)}>Explorar</button>
            </div>))}
        </div>
      ) : (
        <div className="grid3" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", maxWidth: 980, margin: "0 auto", width: "100%" }}>
          <div className="tarjeta" style={{ padding: 18 }}>
            <Diagrama tipo={det} rs={c.r} alto={190} />
            <div style={{ textAlign: "center", color: "var(--acento)", fontWeight: 700, fontSize: 20, margin: "10px 0 4px" }}>{c.formula}</div>
            <div className="txt sm" style={{ textAlign: "center", color: "var(--texto2)" }}>{c.ejemplo}</div>
          </div>
          <div className="tarjeta" style={{ padding: 18 }}>
            <h3 style={{ margin: "0 0 8px", fontSize: 18 }}>¿Por qué se comporta así?</h3>
            <p className="txt" style={{ fontSize: 14 }}>{c.explicacion}</p>
          </div>
        </div>
      )}
    </div>
  );
}
