// Dibuja cómo se reduce un circuito, etapa por etapa, a partir de su estructura serie/paralelo.
//   pieza:    { e: "C" | "R", n: "C₁", v: "12 μF", nuevo?: true }
//   serie:    { s: [ ... ] }      paralelo: { p: [ ... ] }
//   etapa:    { arbol, nota, fuente?: "30 V" }   (sin fuente se dibujan los extremos a y b)
// La pieza marcada como `nuevo` es la que acaba de salir de juntar otras: va resaltada.

const HOJA_W = 80, HOJA_H = 64, RIEL = 14, HUECO = 6;
const TINTA = "#172B49", NUEVO = "#245DA8";

function medir(a) {
  if (a.s) { const h = a.s.map(medir); return { w: h.reduce((x, k) => x + k.w, 0), h: Math.max(...h.map((k) => k.h)), hijos: h }; }
  if (a.p) { const h = a.p.map(medir); return { w: Math.max(...h.map((k) => k.w)) + 2 * RIEL, h: h.reduce((x, k) => x + k.h, 0) + HUECO * (h.length - 1), hijos: h }; }
  return { w: HOJA_W, h: HOJA_H };
}

function linea(x1, y1, x2, y2, col = TINTA, k) { return <line key={k} x1={x1} y1={y1} x2={x2} y2={y2} stroke={col} strokeWidth="2" strokeLinecap="round" />; }

function dibujar(a, m, x, y, out, ruta = "r") {
  if (a.s) {
    let cx = x;
    a.s.forEach((h, i) => { dibujar(h, m.hijos[i], cx, y, out, `${ruta}s${i}`); cx += m.hijos[i].w; });
    return;
  }
  if (a.p) {
    let top = y - m.h / 2;
    const mids = [];
    a.p.forEach((h, i) => {
      const k = m.hijos[i], ym = top + k.h / 2;
      mids.push(ym);
      const x0 = x + RIEL + (m.w - 2 * RIEL - k.w) / 2;
      out.push(linea(x, ym, x0, ym, TINTA, `${ruta}p${i}a`), linea(x0 + k.w, ym, x + m.w, ym, TINTA, `${ruta}p${i}b`));
      dibujar(h, k, x0, ym, out, `${ruta}p${i}`);
      top += k.h + HUECO;
    });
    out.push(linea(x, Math.min(...mids, y), x, Math.max(...mids, y), TINTA, `${ruta}ra`), linea(x + m.w, Math.min(...mids, y), x + m.w, Math.max(...mids, y), TINTA, `${ruta}rb`));
    return;
  }
  // pieza
  const col = a.nuevo ? NUEVO : TINTA, cx = x + HOJA_W / 2;
  if (a.nuevo) out.push(<rect key={`${ruta}f`} x={x + 6} y={y - 30} width={HOJA_W - 12} height={60} rx="10" fill="#EAF1FA" stroke="#A9BED8" />);
  if (a.e === "C") {
    out.push(linea(x, y, cx - 4, y, TINTA, `${ruta}a`), linea(cx + 4, y, x + HOJA_W, y, TINTA, `${ruta}b`),
      <line key={`${ruta}p1`} x1={cx - 4} y1={y - 10} x2={cx - 4} y2={y + 10} stroke={col} strokeWidth="3" />,
      <line key={`${ruta}p2`} x1={cx + 4} y1={y - 10} x2={cx + 4} y2={y + 10} stroke={col} strokeWidth="3" />);
  } else {
    const z = [[-14, 0], [-11, -6], [-6, 6], [-1, -6], [4, 6], [9, -6], [14, 0]].map(([dx, dy]) => `${cx + dx},${y + dy}`).join(" ");
    out.push(linea(x, y, cx - 14, y, TINTA, `${ruta}a`), linea(cx + 14, y, x + HOJA_W, y, TINTA, `${ruta}b`),
      <polyline key={`${ruta}z`} points={z} fill="none" stroke={col} strokeWidth="2" strokeLinejoin="round" />);
  }
  out.push(<text key={`${ruta}n`} x={cx} y={y - 16} textAnchor="middle" fontSize="11" fontWeight="800" fill={col}>{a.n}</text>,
    <text key={`${ruta}v`} x={cx} y={y + 24} textAnchor="middle" fontSize="11" fontWeight="600" fill={a.nuevo ? NUEVO : "#58677C"}>{a.v}</text>);
}

function Etapa({ etapa }) {
  const m = medir(etapa.arbol), out = [];
  const izq = etapa.fuente ? 46 : 22, der = etapa.fuente ? 20 : 22;
  const W = izq + m.w + der, yMid = m.h / 2 + 8, abajo = yMid + m.h / 2 + 14, H = (etapa.fuente ? abajo : yMid + m.h / 2) + 10;
  dibujar(etapa.arbol, m, izq, yMid, out);
  if (etapa.fuente) {
    // lazo con la batería a la izquierda
    const xb = 18, yb = (yMid + abajo) / 2;
    out.push(linea(izq, yMid, xb, yMid, TINTA, "fa"), linea(xb, yMid, xb, yb - 4, TINTA, "fb"), linea(xb, yb + 4, xb, abajo, TINTA, "fc"),
      linea(xb, abajo, izq + m.w + der - 6, abajo, TINTA, "fd"), linea(izq + m.w, yMid, izq + m.w + der - 6, yMid, TINTA, "fe"),
      linea(izq + m.w + der - 6, yMid, izq + m.w + der - 6, abajo, TINTA, "ff"),
      <line key="b1" x1={xb - 9} y1={yb - 4} x2={xb + 9} y2={yb - 4} stroke={TINTA} strokeWidth="2" />,
      <line key="b2" x1={xb - 5} y1={yb + 4} x2={xb + 5} y2={yb + 4} stroke={TINTA} strokeWidth="4" />,
      <text key="bv" x={xb + 13} y={yb + 4} fontSize="10" fontWeight="700" fill="#58677C">{etapa.fuente}</text>);
  } else {
    for (const [x, t] of [[izq, "a"], [izq + m.w, "b"]]) {
      out.push(linea(x, yMid, x + (t === "a" ? -12 : 12), yMid, TINTA, `t${t}`), <circle key={`c${t}`} cx={x + (t === "a" ? -12 : 12)} cy={yMid} r="3.5" fill="#fff" stroke={TINTA} strokeWidth="2" />,
        <text key={`l${t}`} x={x + (t === "a" ? -12 : 12)} y={yMid - 9} textAnchor="middle" fontSize="10" fontWeight="800" fill="#58677C">{t}</text>);
    }
  }
  return (
    <figure className="red-etapa">
      <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} role="img" aria-label={etapa.nota} style={{ maxWidth: "100%", height: "auto" }}>{out}</svg>
      <figcaption>{etapa.nota}</figcaption>
    </figure>
  );
}

export default function Reduccion({ etapas }) {
  return (
    <div className="red">
      <div className="red-t">Así se reduce el circuito</div>
      <div className="red-fila">
        {etapas.map((e, i) => (
          <div key={i} className="red-paso">
            {i > 0 ? <span className="red-flecha" aria-hidden="true">→</span> : null}
            <Etapa etapa={e} />
          </div>))}
      </div>
    </div>
  );
}
