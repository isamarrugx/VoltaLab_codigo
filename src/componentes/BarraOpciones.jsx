import { useEffect, useState } from "react";
import { IconoCanvas } from "./Iconos.jsx";
import { COLORES_CABLE, explicarBandas } from "../lib/cv.js";
import * as F from "../lib/formato.js";
import { nombresComponentes } from "../lib/explicador.js";
import { EJEMPLOS, ORDEN_EJEMPLOS, NOMBRES_CORTOS_EJEMPLOS } from "../datos/ejemplos.js";
import { TECLA } from "../lienzo/Lienzo.js";

export const INFO = {
  seleccionar: ["Seleccionar y mover", `Clic para elegir una pieza; arrastra el fondo para elegir varias. ${TECLA}+Z deshace, ${TECLA}+C / ${TECLA}+V copia y pega.`],
  cable: ["Cable", "Un clic para empezar y otro en cada doblez. Termina solo al tocar una conexión."],
  resistencia: ["Resistencia", "Se opone al paso de la corriente. Se mide en ohmios (Ω)."],
  bombillo: ["Bombillo", "Convierte energía eléctrica en luz; brilla según la potencia P = V × I."],
  interruptor: ["Interruptor", "Abre o cierra el camino de la corriente. Con Mover, un clic lo alterna."],
  bateria: ["Batería", "Fuente de energía: empuja la corriente del + al −. Solo puede haber una."],
};
export const PRESETS = { resistencia: [100, 220, 470, 1000, 10000], bombillo: [5, 10, 22, 47, 100], bateria: [1.5, 3, 4.5, 9, 12] };

export function CampoValor({ tipo, valor, onAplicar, onError, presets = PRESETS, sugerido = null }) {
  const [txt, setTxt] = useState(F.gg(valor));
  useEffect(() => setTxt(F.gg(valor)), [valor]);
  const unidad = tipo === "bateria" ? "V" : "Ω";
  const confirmar = () => {
    const n = parseFloat(txt.replace(",", "."));
    if (Number.isNaN(n)) return onError("Escribe un número (por ejemplo 330).");
    if (n <= 0) return onError("El valor debe ser mayor que 0.");
    onAplicar(n);
  };
  return (
    <>
      <span style={{ marginRight: 6 }}>{tipo === "bateria" ? "Voltaje:" : "Valor:"}</span>
      {presets[tipo].map((p) => (
        <button key={p} className={`btn sm ${Math.abs(p - valor) < 1e-9 ? "activo" : "crema"}`} style={{ minWidth: 50, margin: "0 2px", color: Math.abs(p - valor) < 1e-9 ? "#fff" : "var(--texto)", ...(sugerido != null && Math.abs(p - sugerido) < 1e-9 && Math.abs(p - valor) >= 1e-9 ? { background: "var(--elec)", borderColor: "var(--elec-oscuro)", fontWeight: 700 } : null) }} onClick={() => onAplicar(p)}>{F.fmtValor(p, unidad)}</button>
      ))}
      <input className="entrada" value={txt} onChange={(e) => setTxt(e.target.value)} onKeyDown={(e) => e.key === "Enter" && confirmar()} aria-label="Valor" />
      <span className="pequeno" style={{ marginLeft: 3 }}>{unidad}</span>
      <button className="btn sm prim" style={{ marginLeft: 6, minWidth: 34, padding: "0 8px" }} onClick={confirmar}>OK</button>
    </>
  );
}

export default function BarraOpciones({ L, herr, ejemplos, cerrarEjemplos, cargarEjemplo, bump, accion, presets = PRESETS, sugerido = null }) {
  const [msg, setMsg] = useState(null);
  const [hover, setHover] = useState(null);
  const [verInfo, setVerInfo] = useState(false);
  useEffect(() => { setMsg(null); }, [herr, bump, ejemplos]);
  if (!L) return <div className="barra-opc tarjeta" />;

  if (ejemplos) {
    return (
      <div className="barra-opc tarjeta">
        <div className="cuerpo">
          <div className="fila-t"><h3>Circuitos de ejemplo</h3><div className="acciones"><button className="btn sm crema" style={{ color: "var(--texto)", minWidth: 86 }} onClick={cerrarEjemplos}>Cerrar</button></div></div>
          <div className="desc" style={hover ? { color: "var(--acento)" } : null}>{hover || "Elegir uno reemplaza el circuito actual."}</div>
          <div className="controles" style={{ gap: 6 }}>
            {ORDEN_EJEMPLOS.map((k) => (
              <button key={k} className="btn crema" style={{ height: 30, minWidth: 90, color: "var(--texto)" }}
                onMouseEnter={() => setHover(`${EJEMPLOS[k].nombre}: ${EJEMPLOS[k].descripcion}`)} onMouseLeave={() => setHover(null)} onClick={() => cargarEjemplo(k)}>{NOMBRES_CORTOS_EJEMPLOS[k]}</button>
            ))}
          </div>
        </div>
      </div>
    );
  }
  const historial = (
    <>
      <button className="btn sm crema" style={{ minWidth: 34, color: "var(--texto)" }} disabled={!L.puedeDeshacer()} onClick={() => { L.deshacer(); accion(); }} aria-label="Deshacer" title={`Deshacer (${TECLA}+Z)`}>↶</button>
      <button className="btn sm crema" style={{ minWidth: 34, color: "var(--texto)" }} disabled={!L.puedeRehacer()} onClick={() => { L.rehacer(); accion(); }} aria-label="Rehacer" title={`Rehacer (${TECLA}+Shift+Z)`}>↷</button>
    </>
  );
  const nSel = L.seleccion.size;
  if (nSel > 1) {
    return (
      <div className="barra-opc tarjeta">
        <IconoCanvas tipo="seleccionar" w={92} h={62} />
        <div className="cuerpo">
          <div className="fila-t">
            <h3>{nSel} elementos</h3><span className="chip">SELECCIÓN</span>
            <div className="acciones">
              {historial}
              <button className="btn sm crema" style={{ minWidth: 86, color: "var(--texto)" }} onClick={() => { L.copiar(); accion(); }} title={`${TECLA}+C`}>Copiar</button>
              <button className="btn sm crema" style={{ minWidth: 86, color: "var(--texto)" }} onClick={() => { L.duplicar(); accion(); }} title={`${TECLA}+D`}>Duplicar</button>
              <button className="btn sm crema err" style={{ minWidth: 86 }} onClick={() => { L.eliminarSeleccionado(); accion(); }} title="Supr">Eliminar</button>
            </div>
          </div>
          <div className="desc">Arrastra cualquiera de las piezas para mover todo junto. Shift o {TECLA} + clic suma o quita piezas; Esc deselecciona.</div>
        </div>
      </div>
    );
  }
  const tag = L.seleccionado;
  const elem = tag != null ? L.elemento(tag) : null;
  const editando = !!elem;
  const tipo = editando ? (tag in L.cables ? "cable" : elem.tipo) : herr;
  const [titulo, desc0] = INFO[tipo];
  const valor = tipo in PRESETS ? (editando ? elem.valor : L.valoresNuevos[tipo]) : null;
  const cerrado = editando && tipo === "interruptor" ? elem.cerrado : false;
  const color = editando && tipo === "cable" ? elem.color : L.colorCableActual;
  let chip = null;
  if (editando) chip = "SELECCIONADO"; else if (tipo !== "seleccionar") chip = tipo !== "cable" ? "COLOCAR" : "DIBUJAR";
  // La descripción larga queda oculta; se despliega con «?».
  let desc = verInfo || tipo === "seleccionar" ? desc0 : null, colorDesc = null;
  if (tipo === "bateria" && !editando && L.hayBateria()) { desc = "Ya hay una batería. Con Mover puedes cambiar su voltaje."; colorDesc = "var(--adv)"; }
  if (msg) { desc = msg; colorDesc = "var(--error)"; }
  const aplicarValor = (n) => { if (editando) L.establecerValor(tag, n); else L.valoresNuevos[tipo] = n; accion(); };
  const bandas = tipo === "resistencia" ? explicarBandas(valor) : null;
  return (
    <div className="barra-opc tarjeta">
      <IconoCanvas tipo={tipo} w={92} h={62} valor={valor} cerrado={cerrado} color={color} />
      <div className="cuerpo">
        <div className="fila-t">
          <h3>{titulo}</h3>{chip ? <span className="chip">{chip}</span> : null}
          <div className="acciones">
            {historial}
            {tipo !== "seleccionar" ? <button className={`btn sm info ${verInfo ? "on" : ""}`} aria-label="Qué es esto" title="Qué es esto" onClick={() => setVerInfo((v) => !v)}>?</button> : null}
            {editando ? <><button className="btn sm crema err" style={{ minWidth: 86 }} onClick={() => L.eliminarSeleccionado()}>Eliminar</button>
              {tipo !== "cable" ? <button className="btn sm crema" style={{ minWidth: 86, color: "var(--texto)" }} onClick={() => { L.girar(tag); accion(); }}>Girar</button> : null}</> : null}
          </div>
        </div>
        {desc ? <div className="desc" style={colorDesc ? { color: colorDesc } : null}>{desc}</div> : null}
        {bandas ? (
          <div className="banda"><b style={{ marginRight: 6 }}>Bandas</b>
            {bandas.colores.map((c, i) => <i key={i} style={{ background: c }} />)}
            <span>&nbsp;&nbsp;{bandas.nombres.join(" · ")}&nbsp;&nbsp;&nbsp;→&nbsp;&nbsp;&nbsp;{bandas.formula}</span></div>) : null}
        <div className="controles">
          {tipo in PRESETS ? <CampoValor tipo={tipo} valor={valor} onAplicar={aplicarValor} onError={setMsg} presets={presets} sugerido={editando && sugerido ? sugerido(nombresComponentes(L.componentes)[tag]) : null} /> : null}
          {tipo === "cable" ? (
            <>
              <span style={{ marginRight: 6 }}>Color:</span>
              {COLORES_CABLE.map(([n, hex]) => {
                const act = hex.toLowerCase() === color.toLowerCase();
                return <button key={hex} className={`color-btn ${act ? "activo" : ""}`} style={{ background: hex, margin: "0 2px", color: n === "Amarillo" ? "#1A1D21" : "#fff" }}
                  onClick={() => { if (editando) L.establecerColorCable(tag, hex); else L.establecerColorCableActual(hex); accion(); }}>{act ? "✓" : ""}</button>;
              })}
              <b style={{ marginLeft: 6 }}>{(COLORES_CABLE.find(([, h]) => h.toLowerCase() === color.toLowerCase()) || [""])[0]}</b>
            </>) : null}
          {tipo === "interruptor" && editando ? (
            <>
              <span style={{ marginRight: 6 }}>Estado:</span>
              {[[true, "Cerrado"], [false, "Abierto"]].map(([e, t]) => (
                <button key={t} className={`btn sm ${e === elem.cerrado ? "activo" : "crema"}`} style={{ margin: "0 2px", color: e === elem.cerrado ? "#fff" : "var(--texto)" }} onClick={() => { L.establecerInterruptor(tag, e); accion(); }}>{t}</button>))}
            </>) : null}
        </div>
      </div>
    </div>
  );
}

