import { useEffect, useRef, useState } from "react";
import LienzoVista from "../componentes/LienzoVista.jsx";
import { EJEMPLOS } from "../datos/ejemplos.js";
import { componentesDesdeDefinicion } from "../lib/explicador.js";
import { Simulacion } from "../lib/simulacion.js";
import { limites } from "../lib/guias.js";
import { LECCIONES } from "../datos/lecciones.js";
import { RETOS } from "../datos/retos.js";

// Experimento de la portada: la idea central de VOLTA en un solo circuito.
// Un bombillo de 5 W conectado a 12 V: el estudiante predice y el motor decide (se funde de verdad).
function Experimento({ ir }) {
  const L = useRef(null), sim = useRef(null);
  const [fase, setFase] = useState("pregunta"); // pregunta | probando | resultado
  const [eleccion, setEleccion] = useState(null);
  const [fundido, setFundido] = useState(false);
  const piezas = () => {
    const c = L.current.componentes, de = (tipo) => Object.keys(c).find((k) => c[k].tipo === tipo);
    return { sw: de("interruptor"), b: de("bombillo") };
  };
  // interruptor abierto y bombillo nuevo de 5 W
  const preparar = () => {
    const { sw, b } = piezas();
    sim.current.apagar();
    L.current.aplicar((c) => { c[sw].cerrado = false; delete c[b].danado; c[b].pmax = 5; });
    setFundido(false);
  };
  const alListo = (l) => {
    L.current = l;
    l.permitirInterruptores = false; // el interruptor lo cierra la predicción
    l.cargarEjemplo(EJEMPLOS.interruptor);
    sim.current = new Simulacion(l, { onFalla: () => setFundido(true) });
    preparar();
    const { componentes, cables } = componentesDesdeDefinicion(EJEMPLOS.interruptor);
    const [f0, f1, c0, c1] = limites(componentes, cables);
    l.encuadrar([f0 - 1, f1 + 1, c0 - 1, c1 + 1], false);
    setTimeout(() => { try { l.ajustar(); } catch { /* */ } }, 60);
  };
  const alCambiar = () => { if (sim.current) sim.current.recalcular(); };
  useEffect(() => {
    let ult = performance.now();
    const id = setInterval(() => {
      const ahora = performance.now();
      if (sim.current) sim.current.paso(Math.min(0.25, (ahora - ult) / 1000));
      ult = ahora;
    }, 100);
    return () => { clearInterval(id); if (sim.current) sim.current.apagar(); };
  }, []);
  const elegir = (e) => {
    setEleccion(e); setFase("probando");
    L.current.establecerInterruptor(piezas().sw, true);
    sim.current.encender();
    setTimeout(() => setFase("resultado"), 1300);
  };
  const otraVez = () => { preparar(); setEleccion(null); setFase("pregunta"); };
  const acerto = eleccion === (fundido ? "funde" : "normal");
  const estado = fundido ? ["off", "Bombillo fundido"] : fase === "pregunta" ? ["off", "Interruptor abierto"] : ["on", "Circuito cerrado"];
  return (
    <aside className="ini-exp" aria-label="Experimento: un bombillo al límite">
      <div className="ini-exp-cab">
        <span className="ini-etiqueta">Experimento</span>
        <span className={`ini-estado ${estado[0]}`}>{estado[1]}</span>
      </div>
      <div className="ini-exp-lienzo">
        <LienzoVista opciones={{ editable: false, estatico: true, animacionSuave: true }} centrar={false} onListo={alListo} onCambio={alCambiar} />
      </div>
      <div className="ini-exp-pie" aria-live="polite">
        {fase === "pregunta" ? (
          <>
            <p className="ini-pregunta">Este bombillo soporta 5 W y lo conectas a 12 V. ¿Qué pasará?</p>
            <div className="ini-opciones">
              <button className="ini-op" onClick={() => elegir("normal")}>Brilla normal</button>
              <button className="ini-op" onClick={() => elegir("funde")}>Se funde</button>
            </div>
          </>
        ) : fase === "probando" ? (
          <p className="ini-pregunta">Cerrando el interruptor…</p>
        ) : (
          <>
            <p className={`ini-resp ${acerto ? "ok" : "no"}`}><b>{acerto ? "Exacto." : "Se fundió."}</b> Recibió 14.4 W, casi el triple de lo que soporta: el filamento se calentó tanto que se cortó.</p>
            <div className="ini-opciones">
              <button className="ini-op" onClick={otraVez}>Probar otra vez</button>
              <button className="ini-op fuerte" onClick={() => ir("Ruta")}>Aprende por qué →</button>
            </div>
          </>
        )}
      </div>
    </aside>
  );
}

export default function Inicio({ ir, progreso }) {
  const nL = progreso ? progreso.aprender.size : 0, nR = progreso ? progreso.laboratorio.size : 0;
  return (
    <div className="ini">
      <div className="ini-cont">
        <header className="ini-nav">
          <div className="ini-marca" aria-label="VOLTA, laboratorio interactivo de electricidad">
            <svg className="volta-simbolo" viewBox="0 0 48 48" role="img" aria-label=""><path d="M5 31H14C18 31 18 27 18 23V16C18 12 21 9 25 9H31"/><circle cx="5" cy="31" r="3.2"/><circle cx="31" cy="9" r="3.2"/><path className="volta-chispa" d="M26 23L34 12L32 22L41 19L29 36L31 26Z"/></svg>
            <strong>VOLTA</strong><span className="ini-marca-tag">LABORATORIO ELÉCTRICO</span>
          </div>
          <nav>
            <button className="ini-link" onClick={() => ir("Ruta")}>Aprender</button>
            <button className="ini-link" onClick={() => ir("Docentes")}>Docentes</button>
            <button className="ini-progreso" onClick={() => ir("Progreso")}>Mi progreso <b>{nL + nR}/{LECCIONES.length + RETOS.length}</b></button>
          </nav>
        </header>

        <section className="ini-hero">
          <div className="ini-copy">
            <span className="ini-kicker"><span className="ini-kicker-punto"/> QUEMA · ROMPE · REPARA</span>
            <h1>La <span className="rayo" data-t="electricidad">electricidad
              <svg className="rayo-svg" viewBox="0 0 120 60" aria-hidden="true" preserveAspectRatio="none"><path d="M0 34 L22 22 L30 36 L52 12 L60 30 L84 6 L92 26 L120 14" /></svg>
            </span> te conecta con <em>ideas reales.</em></h1>
            <p>El laboratorio donde puedes quemar, romper y reparar circuitos sin peligro, y entender por qué pasó.</p>
            <div className="ini-cta">
              <button className="ini-btn prim" onClick={() => ir("Ruta")}>Aprender paso a paso<span aria-hidden="true">→</span></button>
              <button className="ini-btn sec" onClick={() => ir("Configurar")}>Laboratorio libre</button>
            </div>
            <p className="ini-sub-cta">{LECCIONES.length} lecciones · {RETOS.length} retos · experimentos en los que las piezas se queman de verdad</p>
          </div>
          <Experimento ir={ir} />
        </section>

        <footer className="ini-pie">
          <span className="ini-footer-brand"><b>VOLTA</b><i/> Explora · Conecta · Comprende</span>
          <span><button className="ini-link" onClick={() => ir("Docentes")}>Para docentes</button><button className="ini-link" onClick={() => ir("Acerca")}>Acerca del proyecto</button></span>
        </footer>
      </div>
    </div>
  );
}
