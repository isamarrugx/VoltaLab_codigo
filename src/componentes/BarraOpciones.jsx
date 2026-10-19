import { useEffect, useState } from "react";
import { IconoCanvas } from "./Iconos.jsx";
import { COLORES_CABLE, explicarBandas } from "../lib/cv.js";
import * as F from "../lib/formato.js";
import { nombresComponentes } from "../lib/explicador.js";
import { EJEMPLOS, ORDEN_EJEMPLOS, NOMBRES_CORTOS_EJEMPLOS } from "../datos/ejemplos.js";
import { TECLA } from "../lienzo/Lienzo.js";
import { ESPEC, ETIQUETA_ESTADO, estado } from "../lib/fallas.js";

export const INFO = {
  seleccionar: ["Seleccionar y mover", `Clic para elegir una pieza; arrastra el fondo para elegir varias. ${TECLA}+Z deshace, ${TECLA}+C / ${TECLA}+V copia y pega.`],
  cable: ["Cable", "Un clic para empezar y otro en cada doblez. Termina solo al tocar una conexión."],
  resistencia: ["Resistencia", "Se opone al paso de la corriente. Se mide en ohmios (Ω)."],
  bombillo: ["Bombillo", "Convierte energía eléctrica en luz; brilla según la potencia P = V × I."],
  interruptor: ["Interruptor", "Abre o cierra el camino de la corriente. Con Mover, un clic lo alterna."],
  bateria: ["Batería", "Fuente de energía: empuja la corriente del + al −. Solo puede haber una."],
  fusible: ["Fusible", "Protege el circuito: si pasa más corriente que su valor nominal, su hilo se funde y abre el camino."],
};
// Flecha curva para deshacer; `espejo` la voltea para rehacer.
function IconoFlecha({ espejo = false }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={espejo ? { transform: "scaleX(-1)" } : null}>
      <path d="M9 14L4 9l5-5" /><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11" />
    </svg>
  );
}
export const PRESETS = { resistencia: [100, 220, 470, 1000, 10000], bombillo: [5, 10, 22, 47, 100], bateria: [1.5, 3, 4.5, 9, 12], fusible: [0.1, 0.25, 0.5, 1, 2] };
const UNIDAD = { bateria: "V", fusible: "A" };
const ETIQUETA_VALOR = { bateria: "Voltaje:", fusible: "Corriente nominal:" };

export function CampoValor({ tipo, valor, onAplicar, onError, presets = PRESETS, sugerido = null }) {
  const [txt, setTxt] = useState(F.gg(valor));
  useEffect(() => setTxt(F.gg(valor)), [valor]);
  const unidad = UNIDAD[tipo] || "Ω";
  const confirmar = () => {
    const n = parseFloat(txt.replace(",", "."));
    if (Number.isNaN(n)) return onError("Escribe un número (por ejemplo 330).");
    if (n <= 0) return onError("El valor debe ser mayor que 0.");
    onAplicar(n);
  };
  return (
    <>
      <span style={{ marginRight: 6 }}>{ETIQUETA_VALOR[tipo] || "Valor:"}</span>
      {presets[tipo].map((p) => (
        <button key={p} className={`btn opt ${Math.abs(p - valor) < 1e-9 ? "on" : sugerido != null && Math.abs(p - sugerido) < 1e-9 ? "exacto" : ""}`} style={{ margin: "0 2px" }} onClick={() => onAplicar(p)}>{F.fmtValor(p, unidad)}</button>
      ))}
      <input className="entrada" value={txt} onChange={(e) => setTxt(e.target.value)} onKeyDown={(e) => e.key === "Enter" && confirmar()} aria-label="Valor" />
      <span className="pequeno" style={{ marginLeft: 3 }}>{unidad}</span>
      <button className="btn sm prim" style={{ marginLeft: 6 }} onClick={confirmar}>OK</button>
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
          <div className="fila-t"><h3>Circuitos de ejemplo</h3><div className="acciones"><button className="btn sm" onClick={cerrarEjemplos}>Cerrar</button></div></div>
          <div className="desc" style={hover ? { color: "var(--acento)" } : null}>{hover || "Elegir uno reemplaza el circuito actual."}</div>
          <div className="controles" style={{ gap: 6 }}>
            {ORDEN_EJEMPLOS.map((k) => (
              <button key={k} className="btn sm"
                onMouseEnter={() => setHover(`${EJEMPLOS[k].nombre}: ${EJEMPLOS[k].descripcion}`)} onMouseLeave={() => setHover(null)} onClick={() => cargarEjemplo(k)}>{NOMBRES_CORTOS_EJEMPLOS[k]}</button>
            ))}
          </div>
        </div>
      </div>
    );
  }
  const historial = (
    <>
      {/* .acciones va de derecha a izquierda: rehacer primero para que se vea «deshacer · rehacer» */}
      <button className="btn icono" disabled={!L.puedeRehacer()} onClick={() => { L.rehacer(); accion(); }} aria-label="Rehacer" title={`Rehacer (${TECLA}+Shift+Z)`}><IconoFlecha espejo /></button>
      <button className="btn icono" disabled={!L.puedeDeshacer()} onClick={() => { L.deshacer(); accion(); }} aria-label="Deshacer" title={`Deshacer (${TECLA}+Z)`}><IconoFlecha /></button>
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
              <button className="btn sm" onClick={() => { L.copiar(); accion(); }} title={`${TECLA}+C`}>Copiar</button>
              <button className="btn sm" onClick={() => { L.duplicar(); accion(); }} title={`${TECLA}+D`}>Duplicar</button>
              <button className="btn sm err" onClick={() => { L.eliminarSeleccionado(); accion(); }} title="Supr">Eliminar</button>
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
  const danado = editando && !!elem.danado;
  // límites y estado térmico: solo cuando el simulador tiene activadas las fallas
  const espec = L.fallasActivas && tipo !== "cable" ? ESPEC[tipo] : null;
  const est = editando && L.fallasActivas && tipo !== "cable" && tipo !== "interruptor" && tipo !== "bateria" ? estado(elem, L.calor[tag] || 0) : null;
  const limiteActual = espec ? (editando ? elem[espec.campo] ?? espec.def : L.especNuevas[tipo]) : null;
  // potencia (o corriente, en el fusible) que recibe ahora frente a su límite
  const fis = est && est !== "dañado" && L.fuente && L.fuente.piezas[tag];
  const carga = !fis ? null : tipo === "fusible" ? `${F.amperios(fis.I)} de ${F.fmtValor(elem.valor, "A")}` : `${F.vatios(fis.P)} de ${F.fmtValor(limiteActual, "W")}`;
  const aplicarEspec = (v) => { if (editando) L.establecerEspec(tag, v); else L.especNuevas[tipo] = v; accion(); };
  let chip = null;
  if (danado) chip = "DAÑADO";
  else if (editando) chip = "SELECCIONADO"; else if (tipo !== "seleccionar") chip = tipo !== "cable" ? "COLOCAR" : "DIBUJAR";
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
          <h3>{titulo}</h3>{chip ? <span className={`chip ${danado ? "err" : ""}`}>{chip}</span> : null}
          <div className="acciones">
            {historial}
            {danado ? <button className="btn sm prim" onClick={() => { L.reparar(tag); accion(); }}>Reemplazar</button> : null}
            {tipo !== "seleccionar" ? <button className={`btn sm info ${verInfo ? "on" : ""}`} aria-label="Qué es esto" title="Qué es esto" onClick={() => setVerInfo((v) => !v)}>?</button> : null}
            {editando ? <><button className="btn sm err" onClick={() => L.eliminarSeleccionado()}>Eliminar</button>
              {tipo !== "cable" ? <button className="btn sm" onClick={() => { L.girar(tag); accion(); }}>Girar</button> : null}</> : null}
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
          {espec ? (
            <span className="espec">
              <span style={{ marginRight: 6 }}>{espec.etiqueta}:</span>
              {espec.presets.map((v) => (
                <button key={v} className={`btn opt ${Math.abs(v - limiteActual) < 1e-9 ? "on" : ""}`} style={{ margin: "0 2px" }} onClick={() => aplicarEspec(v)}>{F.fmtValor(v, espec.unidad)}</button>))}
            </span>) : null}
          {est ? <span className={`estado-pieza ${est === "dañado" ? "danado" : est}`}>{ETIQUETA_ESTADO[est]}{carga ? ` · ${carga}` : ""}</span> : null}
          {tipo === "interruptor" && editando ? (
            <>
              <span style={{ marginRight: 6 }}>Estado:</span>
              {[[true, "Cerrado"], [false, "Abierto"]].map(([e, t]) => (
                <button key={t} className={`btn opt ${e === elem.cerrado ? "on" : ""}`} style={{ margin: "0 2px" }} onClick={() => { L.establecerInterruptor(tag, e); accion(); }}>{t}</button>))}
            </>) : null}
        </div>
      </div>
    </div>
  );
}

