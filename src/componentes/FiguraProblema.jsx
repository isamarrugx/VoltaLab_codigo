// Figuras de los problemas aplicados, dibujadas en SVG. `foco` resalta las piezas del paso actual.

const zig = (x, y, L, vert) => {
  const lead = (L - 42) / 2;
  const pts = [[0, 0], [lead, 0]];
  for (let k = 0; k < 6; k++) pts.push([lead + 3.5 + 7 * k, k % 2 ? 7 : -7]);
  pts.push([lead + 42, 0], [L, 0]);
  return "M" + pts.map(([t, s]) => (vert ? `${x + s} ${y + t}` : `${x + t} ${y + s}`)).join(" L");
};

function useFoco(foco) { return (id) => (foco && foco.includes(id) ? " foco" : ""); }

function Res({ x, y, L, v, id, f }) { return <path className={`e${f(id)}`} d={zig(x, y, L, v)} />; }
function Hilo({ d }) { return <path className="w" d={d} />; }
function Nodo({ x, y, id, f }) { return <circle className={`nodo${f(id)}`} cx={x} cy={y} r="3.6" />; }

// Batería. eje "v": vertical (+ arriba o abajo); eje "h": horizontal (+ izquierda o derecha).
function Bat({ x, y, eje, plus, id, f }) {
  const c = `e${f(id)}`;
  if (eje === "v") {
    const yl = plus === "arriba" ? y - 4 : y + 4, yc = plus === "arriba" ? y + 4 : y - 4;
    return <g className={c}><path d={`M${x - 12} ${yl} H${x + 12}`} /><path d={`M${x - 6} ${yc} H${x + 6}`} strokeWidth="4" /></g>;
  }
  const xl = plus === "izq" ? x - 4 : x + 4, xc = plus === "izq" ? x + 4 : x - 4;
  return <g className={c}><path d={`M${xl} ${y - 12} V${y + 12}`} /><path d={`M${xc} ${y - 6} V${y + 6}`} strokeWidth="4" /></g>;
}

// Capacitor: dos placas. eje "v": cables verticales (placas horizontales); "h": cables horizontales.
function Cap({ x, y, eje, id, f }) {
  const c = `e${f(id)}`;
  return eje === "v"
    ? <g className={c}><path d={`M${x - 13} ${y - 4} H${x + 13} M${x - 13} ${y + 4} H${x + 13}`} /></g>
    : <g className={c}><path d={`M${x - 4} ${y - 13} V${y + 13} M${x + 4} ${y - 13} V${y + 13}`} /></g>;
}

function T({ x, y, children, a = "start", id, f, s = 14 }) {
  return <text className={`t${f ? f(id) : ""}`} x={x} y={y} textAnchor={a} fontSize={s}>{children}</text>;
}

/* ---------------- 26.64 ---------------- */
function F2664({ f }) {
  return (
    <svg viewBox="0 0 380 250" role="img" aria-label="Tres ramas en paralelo: batería de 24 V con 3 ohm, fuente ε con 2 ohm y resistor de 7 ohm">
      <Hilo d="M100 40 H300 M100 210 H300" />
      <path className={`w${f("top")}`} d="M100 40 H300" />
      {/* rama 1 */}
      <Hilo d="M100 40 V80 M100 90 V110 M100 180 V210" /><Bat x={100} y={85} eje="v" plus="arriba" id="b1" f={f} /><Res x={100} y={110} L={70} v id="r1" f={f} />
      {/* rama 2 */}
      <Hilo d="M190 40 V80 M190 90 V110 M190 180 V210" /><Bat x={190} y={85} eje="v" plus="arriba" id="b2" f={f} /><Res x={190} y={110} L={70} v id="r2" f={f} />
      {/* rama 3 */}
      <Hilo d="M300 40 V80 M300 160 V210" /><Res x={300} y={80} L={80} v id="r3" f={f} />
      <Nodo x={100} y={40} f={f} /><Nodo x={190} y={40} f={f} /><Nodo x={100} y={210} f={f} /><Nodo x={190} y={210} f={f} />
      <T x={116} y={76} s={15}>+</T><T x={206} y={76} s={15}>+</T>
      <T x={82} y={90} a="end" id="b1" f={f}>24.0 V</T><T x={86} y={150} a="end" id="r1" f={f}>3.00 Ω</T>
      <T x={172} y={90} a="end" id="b2" f={f}>ε = ?</T><T x={176} y={150} a="end" id="r2" f={f}>2.00 Ω</T>
      <T x={314} y={124} id="r3" f={f}>7.00 Ω</T>
    </svg>
  );
}

/* ---------------- 26.66 ---------------- */
function F2666({ f }) {
  return (
    <svg viewBox="0 0 380 250" role="img" aria-label="Puente de resistores con batería de 14 V">
      <Hilo d="M60 50 H270 M60 210 H270 M60 50 V110 M60 140 V210 M140 130 H170 M240 130 H270" />
      <Bat x={60} y={125} eje="v" plus="arriba" id="bat" f={f} />
      <Hilo d="M60 110 V121 M60 129 V140" />
      <Res x={140} y={50} L={80} v id="r1" f={f} /><Res x={140} y={130} L={80} v id="r4" f={f} />
      <Res x={270} y={50} L={80} v id="r2" f={f} /><Res x={270} y={130} L={80} v id="r5" f={f} />
      <Res x={140} y={130} L={130} id="r3" f={f} />
      <Nodo x={140} y={130} id="n1" f={f} /><Nodo x={270} y={130} id="n2" f={f} />
      <Nodo x={140} y={50} f={f} /><Nodo x={270} y={50} f={f} /><Nodo x={140} y={210} f={f} /><Nodo x={270} y={210} f={f} />
      <T x={42} y={129} a="end" id="bat" f={f}>14.0 V</T>
      <T x={73} y={44} s={15}>+</T>
      <T x={128} y={94} a="end" id="r1" f={f}>R₁ 1.00 Ω</T><T x={128} y={178} a="end" id="r4" f={f}>R₄ 2.00 Ω</T>
      <T x={282} y={94} id="r2" f={f}>R₂ 2.00 Ω</T><T x={282} y={178} id="r5" f={f}>R₅ 1.00 Ω</T>
      <T x={205} y={116} a="middle" id="r3" f={f}>R₃ 1.00 Ω</T>
      <T x={128} y={122} a="end" id="n1" f={f}>V₁</T><T x={282} y={122} id="n2" f={f}>V₂</T>
    </svg>
  );
}

/* ---------------- 26.34 ---------------- */
function F2634({ f }) {
  return (
    <svg viewBox="0 0 470 300" role="img" aria-label="Circuito con tres ramas: fem desconocida, rama central con batería de 25 V y rama derecha con resistores y amperímetro">
      {/* izquierda */}
      <Hilo d="M60 80 H100 M200 80 H270 M60 80 V134 M60 142 V240 M60 240 H100 M200 240 H290" />
      <Bat x={60} y={138} eje="v" plus="arriba" id="e" f={f} />
      <Res x={100} y={80} L={100} id="r17" f={f} /><Res x={100} y={240} L={100} id="r13" f={f} />
      {/* central */}
      <Res x={200} y={80} L={82} v id="r6" f={f} />
      <Bat x={200} y={166} eje="v" plus="arriba" id="b25" f={f} />
      <Res x={200} y={170} L={70} v id="r3m" f={f} />
      <Nodo x={200} y={80} id="nodeT" f={f} /><Nodo x={200} y={240} id="nodeB" f={f} />
      <path className="flecha" d="M186 136 V108 M181 114 L186 107 L191 114" />
      {/* derecha */}
      <Hilo d="M270 80 V42 H290 M270 80 V118 H290 M370 42 H385 V80 M370 118 H385 V80 M385 80 H430 M430 80 V80 M430 170 V186 M430 214 V240 M370 240 H430" />
      <Res x={290} y={42} L={80} id="rp1" f={f} /><Res x={290} y={118} L={80} id="rp2" f={f} />
      <Res x={430} y={80} L={90} v id="r19" f={f} />
      <Res x={290} y={240} L={80} id="r1" f={f} />
      <g className={`e${f("amp")}`}><circle cx="430" cy="200" r="14" style={{ fill: "var(--tarjeta)" }} /><text x="430" y="205" textAnchor="middle" fontSize="14" className="t" style={{ fontStyle: "normal" }}>A</text></g>
      <Nodo x={270} y={80} f={f} /><Nodo x={385} y={80} f={f} />
      <T x={72} y={126} s={15}>+</T><T x={212} y={160} s={15}>+</T>
      <T x={150} y={70} a="middle" id="r17" f={f}>17 Ω</T><T x={150} y={262} a="middle" id="r13" f={f}>13 Ω</T>
      <T x={42} y={144} a="end" id="e" f={f}>ε = ?</T>
      <T x={182} y={190} a="end" id="b25" f={f}>25 V</T>
      <T x={212} y={118} id="r6" f={f}>6.0 Ω</T><T x={212} y={222} id="r3m" f={f}>3.0 Ω</T>
      <T x={330} y={34} a="middle" id="rp1" f={f}>20.0 Ω</T><T x={330} y={142} a="middle" id="rp2" f={f}>20.0 Ω</T>
      <T x={442} y={128} id="r19" f={f}>19 Ω</T>
      <T x={330} y={262} a="middle" id="r1" f={f}>1.0 Ω</T>
    </svg>
  );
}

/* ---------------- 56 ---------------- */
function Fc56({ f }) {
  return (
    <svg viewBox="0 0 380 250" role="img" aria-label="Batería de 30 V con tres capacitores en serie de 12, 4 y 6 microfaradios">
      <Hilo d="M70 40 H250 M70 210 H250 M70 40 V111 M70 139 V210 M250 40 V66 M250 74 V121 M250 129 V176 M250 184 V210" />
      <Bat x={70} y={125} eje="v" plus="arriba" id="bat" f={f} />
      <Hilo d="M70 111 V121 M70 129 V139" />
      <Cap x={250} y={70} eje="v" id="c1" f={f} /><Cap x={250} y={125} eje="v" id="c2" f={f} /><Cap x={250} y={180} eje="v" id="c3" f={f} />
      <T x={52} y={129} a="end" id="bat" f={f}>30 V</T><T x={84} y={34} s={15}>+</T>
      <T x={272} y={74} id="c1" f={f}>C₁ = 12 μF</T><T x={272} y={129} id="c2" f={f}>C₂ = 4 μF</T><T x={272} y={184} id="c3" f={f}>C₃ = 6 μF</T>
    </svg>
  );
}

/* ---------------- 58 ---------------- */
function Fc58({ f }) {
  return (
    <svg viewBox="0 0 380 250" role="img" aria-label="Batería de 9 V, un capacitor de 5 microfaradios en paralelo con dos capacitores de 4 y 6 microfaradios en serie">
      <Hilo d="M60 40 H250 M60 210 H250 M60 40 V111 M60 139 V210 M150 40 V121 M150 129 V210 M250 40 V86 M250 94 V156 M250 164 V210" />
      <Bat x={60} y={125} eje="v" plus="arriba" id="bat" f={f} />
      <Hilo d="M60 111 V121 M60 129 V139" />
      <Cap x={150} y={125} eje="v" id="c1" f={f} /><Cap x={250} y={90} eje="v" id="c2" f={f} /><Cap x={250} y={160} eje="v" id="c3" f={f} />
      <Nodo x={150} y={40} f={f} /><Nodo x={150} y={210} f={f} />
      <T x={42} y={129} a="end" id="bat" f={f}>9 V</T><T x={73} y={34} s={15}>+</T>
      <T x={164} y={129} id="c1" f={f}>C₁ = 5 μF</T><T x={264} y={94} id="c2" f={f}>C₂ = 4 μF</T><T x={264} y={164} id="c3" f={f}>C₃ = 6 μF</T>
    </svg>
  );
}

/* ---------------- 48 ---------------- */
function Fc48({ f }) {
  return (
    <svg viewBox="0 0 400 250" role="img" aria-label="Dos grupos de dos capacitores de 20 microfaradios en paralelo, con un capacitor de 10 microfaradios en medio, todo en serie">
      <Hilo d="M15 125 H50 M50 70 V180 M150 70 V180 M150 125 H196 M204 125 H250 M250 70 V180 M350 70 V180 M350 125 H385" />
      <Hilo d="M50 70 H96 M104 70 H150 M50 180 H96 M104 180 H150 M250 70 H296 M304 70 H350 M250 180 H296 M304 180 H350" />
      <Cap x={100} y={70} eje="h" id="ga1" f={f} /><Cap x={100} y={180} eje="h" id="ga2" f={f} />
      <Cap x={200} y={125} eje="h" id="cm" f={f} />
      <Cap x={300} y={70} eje="h" id="gb1" f={f} /><Cap x={300} y={180} eje="h" id="gb2" f={f} />
      <circle className="nodo" cx="15" cy="125" r="3.6" /><circle className="nodo" cx="385" cy="125" r="3.6" />
      <T x={100} y={52} a="middle" id="ga1" f={f}>20.0 μF</T><T x={100} y={212} a="middle" id="ga2" f={f}>20.0 μF</T>
      <T x={200} y={104} a="middle" id="cm" f={f}>10.0 μF</T>
      <T x={300} y={52} a="middle" id="gb1" f={f}>20.0 μF</T><T x={300} y={212} a="middle" id="gb2" f={f}>20.0 μF</T>
      <T x={200} y={236} a="middle" id="bat" f={f} s={12}>Voltaje de ruptura de cada capacitor: 15.0 V</T>
    </svg>
  );
}

const FIGURAS = { f2664: F2664, f2666: F2666, f2634: F2634, fc56: Fc56, fc58: Fc58, fc48: Fc48 };

export default function FiguraProblema({ tipo, foco }) {
  const F = FIGURAS[tipo];
  const f = useFoco(foco);
  return <div className="pb-fig"><F f={f} /></div>;
}
