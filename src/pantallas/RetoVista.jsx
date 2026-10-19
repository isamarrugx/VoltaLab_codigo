import { useReducer, useRef } from "react";
import LienzoVista from "../componentes/LienzoVista.jsx";
import BarraOpciones from "../componentes/BarraOpciones.jsx";
import { IconoCanvas, IconoEstado } from "../componentes/Iconos.jsx";
import { CajaTitulada, BarraPasos, Estrellas } from "../componentes/piezas.jsx";
import { SeccionesExplicacion } from "../componentes/ui.jsx";
import * as E from "../lib/estilos.js";
import { explicarCircuito, nombresComponentes } from "../lib/explicador.js";
import { circuitoResuelto, herramientaDe, limites, paraTablero, unir, valorSugerido } from "../lib/guias.js";
import { PREGUNTAS } from "../datos/docente.js";
import { Estado, NIVELES, guiaPista, textoPista } from "../datos/retos.js";

const NOMBRES_HERR = { seleccionar: "Mover", cable: "Cable", resistencia: "Resistencia", bombillo: "Bombillo", interruptor: "Interruptor", bateria: "Batería" };
const PRESETS_LAB = { resistencia: [50, 100, 200, 300, 470], bombillo: [5, 10, 22, 47], bateria: [1.5, 3, 4.5, 9, 12] };
const COL_NIVEL = { 1: [E.COLOR_EXITO, E.COLOR_EXITO_SUAVE], 2: [E.COLOR_ACENTO, E.COLOR_ACENTO_SUAVE], 3: [E.COLOR_ADVERTENCIA, E.COLOR_ADVERTENCIA_SUAVE] };
const estrellasPorPistas = (n) => (n === 0 ? 3 : n === 1 ? 2 : 1);

export default function RetoVista({ reto, etiqueta, onVolver, onCompletar, onSiguiente, onReiniciar, haySiguiente, habilidades, onPista }) {
  const [, bump] = useReducer((x) => x + 1, 0);
  const L = useRef(null);
  const S = useRef({ hechos: 0, cumplidos: [], ultimoLogro: null, pistas: {}, completado: false, estado: null, aviso: null, comoAbierto: false, explicar: false, tocado: false, cargando: false, cierre: "", guia: null, tick: 0 });
  const s = S.current;
  const nivel = reto.nivel, pasos = reto.pasos;

  const claveP = () => (nivel === 3 ? -1 : s.hechos);
  const listaPistas = () => {
    if (nivel < 3 && s.hechos < pasos.length && pasos[s.hechos].pistas) return pasos[s.hechos].pistas;
    return reto.pistas || [];
  };
  const guiaActual = () => {
    if (s.completado) return null;
    const partes = [];
    if (nivel === 1 && s.hechos < pasos.length) partes.push(pasos[s.hechos].guia);
    const vistas = s.pistas[claveP()] || 0;
    partes.push(...listaPistas().slice(0, vistas).map(guiaPista));
    const u = unir(...partes);
    return u && Object.keys(u).length ? u : null;
  };
  const actualizarGuia = () => {
    const l = L.current; if (!l) return;
    s.guia = guiaActual();
    if (s.guia && s.estado) l.mostrarGuia(paraTablero(s.guia, l.componentes, l.cables, [0, 0])); else l.limpiarGuia();
  };
  const evaluar = () => {
    const l = L.current; if (!l) return;
    const e = new Estado(l.componentes, l.cables, l.herramienta);
    s.estado = e;
    if (e.cerrado) { l.limpiarResaltado(); l.mostrarResultados(e.med.resultado, e.med.tagsR); }
    else if (e.corto) l.resaltar(e.diag.puntos, e.diag.tags, E.COLOR_ERROR); else l.limpiarResaltado();
    let avanzo = false, terminado;
    if (nivel < 3) {
      while (!s.completado && s.hechos < pasos.length && pasos[s.hechos].hecho(e)) {
        const p = pasos[s.hechos];
        s.ultimoLogro = typeof p.logro === "function" ? p.logro(e) : p.logro || null;
        if (p.habilidad) habilidades.add(p.habilidad);
        s.hechos += 1; s.comoAbierto = false; avanzo = true;
      }
      terminado = s.hechos === pasos.length;
    } else {
      s.cumplidos = pasos.map((p) => !!p.hecho(e));
      s.hechos = s.cumplidos.filter(Boolean).length;
      terminado = s.cumplidos.every(Boolean);
    }
    s.aviso = e.corto ? [e.diag.titulo, e.diag.mensaje] : null;
    if (terminado && !s.completado) {
      s.completado = true; s.cierre = reto.cierre(e);
      const usadas = Object.values(s.pistas).reduce((a, b) => a + b, 0);
      onCompletar(reto.clave, estrellasPorPistas(usadas));
      l.iluminar(null, E.COLOR_EXITO, 0.9);
    } else if (avanzo) l.iluminar(null, E.COLOR_EXITO, 0.5);
    actualizarGuia();
    bump();
  };
  const encuadre = () => {
    const { componentes, cables } = circuitoResuelto(reto);
    const [f0, f1, c0, c1] = limites(componentes, cables);
    return [f0 - 1, f1 + 1, c0, c1];
  };
  const alListo = (l) => {
    L.current = l;
    s.cargando = true; l.cargarEjemplo(reto.circuito); l.activarHerramienta("seleccionar"); s.cargando = false;
    l.mostrarNombres(nombresComponentes(l.componentes));
    l.encuadrar(encuadre());
    evaluar();
    setTimeout(() => { if (!s.tocado && L.current === l) l.centrarVista(); }, 250);
  };
  const alCambiar = () => {
    if (s.cargando || !L.current) return;
    s.tocado = true;
    L.current.mostrarNombres(nombresComponentes(L.current.componentes));
    evaluar();
  };
  const elegirHerr = (n) => { s.tocado = true; L.current.activarHerramienta(n); evaluar(); };
  const pedirPista = () => { if (onPista) onPista(); const k = claveP(); s.pistas[k] = (s.pistas[k] || 0) + 1; actualizarGuia(); bump(); const sc = document.querySelector(".col-der .scroll"); if (sc) setTimeout(() => (sc.scrollTop = sc.scrollHeight), 30); };

  const l = L.current;
  const sugerida = herramientaDe(s.guia);
  const usadas = Object.values(s.pistas).reduce((a, b) => a + b, 0);
  const [colN, fondoN] = COL_NIVEL[nivel];
  const [nomN, descN] = NIVELES[nivel];
  const pistas = listaPistas(), vistas = s.pistas[claveP()] || 0;

  const Paso = ({ i, p }) => {
    const hecho = nivel === 3 ? !!s.cumplidos[i] : i < s.hechos;
    const actual = nivel < 3 && i === s.hechos && !s.completado;
    const pend = !hecho && !actual && nivel < 3;
    const sabido = actual && nivel === 1 && p.como && habilidades.has(p.habilidad) && !s.comoAbierto;
    return (
      <div className={`paso-l ${actual ? "actual" : ""} ${pend ? "pend" : ""}`}>
        {hecho ? <IconoEstado forma="ok" color={E.COLOR_EXITO} tam={22} /> : nivel === 3 ? <IconoEstado forma="neutro" color={E.COLOR_TEXTO_SECUNDARIO} tam={22} /> : <span className="n">{i + 1}</span>}
        <span style={{ flex: 1 }}>{p.texto}</span>
        {actual && nivel === 1 && p.como ? (sabido
          ? <div className="sabido"><span>Ya sabes hacerlo: sigue la guía del tablero.</span><button className="btn sm discreto" onClick={() => { s.comoAbierto = true; bump(); }}>¿Cómo era?</button></div>
          : <div className="como">{p.como}</div>) : null}
      </div>
    );
  };

  return (
    <div className="vista-lec">
      <div className="cab" style={{ alignItems: "center" }}>
        <button className="btn contorno med" onClick={onVolver}>← Retos</button>
        <div className="titulos"><div className="sub" style={{ letterSpacing: ".3px", fontWeight: 700 }}>{etiqueta.toUpperCase()}</div><h2 style={{ fontSize: 22 }}>{reto.titulo}</h2>{PREGUNTAS[reto.clave] ? <div className="pregunta-guia">{PREGUNTAS[reto.clave]}</div> : null}</div>
        <button className="btn discreto med" onClick={onReiniciar}>Empezar de nuevo</button>
        <BarraPasos total={pasos.length} actual={Math.min(s.hechos, pasos.length - 1)} hechas={s.completado ? pasos.length : s.hechos}
          texto={s.completado ? "¡RETO SUPERADO!" : `${s.hechos} DE ${pasos.length} ${nivel === 3 ? "CRITERIOS" : "PASOS"}`} />
      </div>
      <div className="cuerpo-lec">
        <div className="col-izq">
          <div className="tarjeta barra-lab">
            <div className="fila-herr">
              {reto.herramientas.map((n) => {
                const activa = l && l.herramienta === n, senal = sugerida === n && !activa;
                return <button key={n + (senal ? "s" : "")} className={`herr ${activa ? "activa" : ""} ${senal ? "senalada" : ""}`} onClick={() => elegirHerr(n)}>
                  <IconoCanvas tipo={n} w={44} h={26} />{NOMBRES_HERR[n]}</button>;
              })}
            </div>
            <div className="sep" />
            {l ? <BarraOpciones L={l} herr={l.herramienta} bump={s.tick} accion={() => { s.tocado = true; evaluar(); }} presets={PRESETS_LAB} sugerido={(nombre) => valorSugerido(s.guia, nombre)} /> : <div className="barra-opc" />}
          </div>
          <LienzoVista opciones={{ editable: true, modoEducativo: true }} onListo={alListo} onCambio={alCambiar}
            onSeleccion={() => { s.tick++; bump(); }} onHerramienta={() => { s.tick++; bump(); }} />
        </div>
        <div className="col-der tarjeta">
          <div className="scroll">
            <span className="chip" style={{ background: fondoN, color: colN }}>NIVEL {nivel} · {nomN.toUpperCase()}</span>
            <p className="txt sm" style={{ color: "var(--texto2)", margin: "4px 0 8px" }}>{descN}</p>
            <CajaTitulada titulo="Objetivo" color={E.COLOR_ELECTRICIDAD_OSCURO} fondo={E.COLOR_ELECTRICIDAD_SUAVE}>
              <p className="txt m" style={{ fontWeight: 700, margin: "0 0 4px" }}>{reto.objetivo}</p>
              <p className="txt sm" style={{ color: "var(--texto2)", margin: 0 }}>Aprendes: {reto.aprendes}</p>
            </CajaTitulada>
            {s.completado ? (
              <CajaTitulada titulo="¡Reto superado!" color={E.COLOR_EXITO} fondo={E.COLOR_EXITO_SUAVE} forma="ok" flash>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}><Estrellas n={estrellasPorPistas(usadas)} t={26} /><span style={{ fontSize: 11, color: "var(--texto2)" }}>{usadas === 0 ? "sin pistas" : `con ${usadas} pista${usadas > 1 ? "s" : ""}`}</span></div>
                <div style={{ fontSize: 10, fontWeight: 700, color: "var(--exito)", marginTop: 4 }}>LO QUE APRENDISTE</div>
                <p className="txt m">{s.cierre}</p>
                {haySiguiente ? <button className="btn prim med completo" style={{ marginBottom: 6 }} onClick={onSiguiente}>Siguiente reto  →</button> : null}
                <p className="txt sm" style={{ color: "var(--texto2)", fontSize: 10 }}>Puedes seguir experimentando en el tablero.</p>
                <button className="btn med completo" onClick={() => { s.explicar = !s.explicar; bump(); }}>{s.explicar ? "Ocultar la explicación" : "Explicar mi circuito"}</button>
              </CajaTitulada>) : null}
            {s.completado && s.explicar && s.estado ? <div className="caja-t" style={{ background: E.COLOR_FONDO, borderColor: E.COLOR_BORDE_NORMAL }}><SeccionesExplicacion secciones={explicarCircuito(l.componentes, l.cables, s.estado.med)} /></div> : null}
            {s.aviso ? <CajaTitulada titulo={s.aviso[0]} color={E.COLOR_ERROR} fondo={E.COLOR_ERROR_SUAVE} forma="aviso"><p className="txt sm" style={{ margin: 0 }}>{s.aviso[1]}</p></CajaTitulada>
              : s.ultimoLogro && !s.completado && nivel < 3 ? <CajaTitulada titulo="¡Bien!" color={E.COLOR_EXITO} fondo={E.COLOR_EXITO_SUAVE} forma="ok" flash><p className="txt m" style={{ margin: 0 }}>{s.ultimoLogro}</p></CajaTitulada> : null}
            <div className="rot-sec">{nivel === 3 ? "CRITERIOS" : "PASOS"}</div>
            {pasos.map((p, i) => <Paso key={i} i={i} p={p} />)}
            {!s.completado && pistas.length ? (
              <CajaTitulada titulo="¿Te atascaste?" color={E.COLOR_ACENTO} fondo={E.COLOR_FONDO} style={{ marginTop: 12 }}>
                {pistas.slice(0, vistas).map((p, j) => (
                  <div key={j} style={{ display: "flex", gap: 8, margin: "2px 0" }}>
                    <b style={{ width: 50, fontSize: 11, color: "var(--acento)", flex: "none" }}>Pista {j + 1}</b>
                    <div className="txt sm" style={{ margin: 0 }}>{textoPista(p)}{guiaPista(p) ? <div style={{ fontSize: 10, fontWeight: 700, color: "var(--elec-oscuro)" }}>◆ Míralo dibujado en el tablero</div> : null}</div>
                  </div>))}
                {vistas < pistas.length
                  ? <button className="btn med completo" style={{ marginTop: 6 }} onClick={pedirPista}>{vistas === pistas.length - 1 ? "Ver la última pista (casi la solución)" : vistas ? `Ver una pista (${vistas + 1} de ${pistas.length})` : "Ver una pista"}</button>
                  : <p className="txt sm" style={{ color: "var(--texto2)", margin: "4px 0 0" }}>Ya viste todas las pistas de este paso.</p>}
                {nivel > 1 && vistas === 0 ? <p className="txt sm" style={{ color: "var(--texto2)", fontSize: 10, marginTop: 6 }}>Cada pista que pidas resta una estrella al terminar.</p> : null}
              </CajaTitulada>) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
