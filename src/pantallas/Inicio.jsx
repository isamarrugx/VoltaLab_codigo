import { useRef, useState } from "react";
import LienzoVista from "../componentes/LienzoVista.jsx";
import { EJEMPLOS } from "../datos/ejemplos.js";
import { analizar, componentesDesdeDefinicion } from "../lib/explicador.js";
import { limites } from "../lib/guias.js";
import { LECCIONES } from "../datos/lecciones.js";
import { RETOS } from "../datos/retos.js";

// Experimento de la portada: mismo motor y mismo modelo eléctrico que el simulador.
// Primero se predice, después se comprueba y se explica el porqué.
function Experimento({ ir }) {
  const L = useRef(null);
  const [cerrado, setCerrado] = useState(true);
  const [eleccion, setEleccion] = useState(null); // "apaga" | "sigue"
  const medir = () => {
    const l = L.current; if (!l) return;
    const { med } = analizar(l.componentes, l.cables);
    const sw = Object.values(l.componentes).find((c) => c.tipo === "interruptor");
    setCerrado(!!(sw && sw.cerrado));
    if (med && !med.abierto) l.mostrarResultados(med.resultado, med.tagsR); else l.limpiarResultados();
  };
  const alListo = (l) => {
    L.current = l;
    l.cargarEjemplo(EJEMPLOS.interruptor);
    const { componentes, cables } = componentesDesdeDefinicion(EJEMPLOS.interruptor);
    const [f0, f1, c0, c1] = limites(componentes, cables);
    l.encuadrar([f0 - 1, f1 + 1, c0 - 1, c1 + 1], false);
    medir();
    setTimeout(() => { try { l.ajustar(); } catch { /* */ } }, 60);
  };
  const poner = (abierto) => {
    const l = L.current; if (!l) return;
    const [tag] = Object.entries(l.componentes).find(([, c]) => c.tipo === "interruptor");
    l.establecerInterruptor(tag, !abierto);
  };
  const elegir = (e) => { setEleccion(e); poner(true); };
  const acerto = eleccion === "apaga";
  return (
    <aside className="ini-exp" aria-label="Experimento: un circuito, una idea">
      <div className="ini-exp-cab">
        <span className="ini-etiqueta">Experimento</span>
        <span className={`ini-estado ${cerrado ? "on" : "off"}`}>{cerrado ? "Circuito cerrado" : "Circuito abierto"}</span>
      </div>
      <div className="ini-exp-lienzo">
        <LienzoVista opciones={{ editable: false, estatico: true, animacionSuave: true }} centrar={false} onListo={alListo} onCambio={medir} />
      </div>
      <div className="ini-exp-pie" aria-live="polite">
        {eleccion === null ? (
          <>
            <p className="ini-pregunta">Si abres el interruptor, ¿qué le pasa al bombillo?</p>
            <div className="ini-opciones">
              <button className="ini-op" onClick={() => elegir("apaga")}>Se apaga</button>
              <button className="ini-op" onClick={() => elegir("sigue")}>Sigue brillando</button>
            </div>
          </>
        ) : (
          <>
            <p className={`ini-resp ${acerto ? "ok" : "no"}`}><b>{acerto ? "Exacto." : "Casi."}</b> Un camino abierto interrumpe la corriente en todo el circuito, aunque el corte esté lejos del bombillo.</p>
            <div className="ini-opciones">
              <button className="ini-op" onClick={() => poner(cerrado)}>{cerrado ? "Abrirlo otra vez" : "Cerrarlo"}</button>
              <button className="ini-op fuerte" onClick={() => ir("Ruta")}>Seguir aprendiendo →</button>
            </div>
          </>
        )}
      </div>
    </aside>
  );
}

export default function Inicio({ ir, progreso }) {
  const nL = progreso ? progreso.aprender.size : 0, nR = progreso ? progreso.laboratorio.size : 0;
  const empezo = nL > 0;
  return (
    <div className="ini">
      <div className="ini-cont">
        <header className="ini-nav">
          <div className="ini-marca" aria-label="VOLTA, laboratorio interactivo de electricidad">
            <svg className="volta-simbolo" viewBox="0 0 48 48" role="img" aria-label=""><path d="M5 31H14C18 31 18 27 18 23V16C18 12 21 9 25 9H31"/><circle cx="5" cy="31" r="3.2"/><circle cx="31" cy="9" r="3.2"/><path className="volta-chispa" d="M26 23L34 12L32 22L41 19L29 36L31 26Z"/></svg>
            <strong>VOLTA</strong><span className="ini-marca-tag">LABORATORIO ELÉCTRICO</span>
          </div>
          <nav>
            <button className="ini-link" onClick={() => ir("Docentes")}>Docentes</button>
            <button className="ini-progreso" onClick={() => ir("Progreso")}>Mi progreso <b>{nL + nR}/{LECCIONES.length + RETOS.length}</b></button>
          </nav>
        </header>

        <section className="ini-hero">
          <div className="ini-copy">
            <span className="ini-kicker"><span className="ini-kicker-punto"/> LABORATORIO INTERACTIVO · VOL. 01</span>
            <h1>La <span className="rayo" data-t="electricidad">electricidad
              <svg className="rayo-svg" viewBox="0 0 120 60" aria-hidden="true" preserveAspectRatio="none"><path d="M0 34 L22 22 L30 36 L52 12 L60 30 L84 6 L92 26 L120 14" /></svg>
            </span> te conecta con <em>ideas reales.</em></h1>
            <p>Construye circuitos, pon a prueba tus ideas y descubre cómo funciona el mundo que te rodea.</p>
            <div className="ini-cta">
              <button className="ini-btn prim" onClick={() => ir("Ruta")}>{empezo ? "Continuar explorando" : "Comenzar a explorar"}<span aria-hidden="true">→</span></button>
              <button className="ini-btn sec" onClick={() => ir("Configurar")}>Probar el simulador</button>
            </div>
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
