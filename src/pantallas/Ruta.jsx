import { IconoCanvas } from "../componentes/Iconos.jsx";
import { LECCIONES } from "../datos/lecciones.js";
import { RETOS } from "../datos/retos.js";
import { PROBLEMAS } from "../datos/problemas.js";

function Barra({ n, t }) { return <span className="ini-barra" aria-hidden="true"><i style={{ width: `${(n / t) * 100}%` }} /></span>; }

export default function Ruta({ ir, progreso }) {
  const nL = progreso.aprender.size, nR = progreso.laboratorio.size, nP = progreso.problemas.size;
  const sig = LECCIONES.find((l) => !progreso.aprender.has(l.clave));
  const empezo = nL > 0;
  return (
    <div className="ini">
      <div className="ini-cont">
        <header className="ini-nav">
          <button className="ini-link" onClick={() => ir("Inicio")}>← Inicio</button>
          <nav>
            <button className="ini-progreso" onClick={() => ir("Progreso")}>Mi progreso <b>{nL + nR}/{LECCIONES.length + RETOS.length}</b></button>
          </nav>
        </header>
        <section className="ruta-pg">
          <h1 className="ruta-t">Aprender paso a paso</h1>
          <p className="ruta-sub">Para cuando quieras entender algo con calma: lecciones en orden, retos para practicar y problemas para aplicar.</p>
          <div className="ini-grid">
            <button className="ini-card grande" onClick={() => ir("Aprender")}>
              <span className="ini-num">1</span>
              <span className="ini-ico"><IconoCanvas tipo="bombillo" w={84} h={46} /></span>
              <span className="ini-verbo">Comprender</span>
              <h3>Lecciones guiadas</h3>
              <p>Voltaje, corriente, resistencia, serie y paralelo, cada una con experimentos que cambias tú.</p>
              <span className="ini-prog"><Barra n={nL} t={LECCIONES.length} /><small>{nL} de {LECCIONES.length}</small></span>
              <span className="ini-ir">{sig ? (empezo ? `Siguiente: ${sig.titulo}` : `Empezar: ${sig.titulo}`) : "Repasar las lecciones"}<span aria-hidden="true"> →</span></span>
            </button>
            <button className="ini-card" onClick={() => ir("Laboratorio")}>
              <span className="ini-num">2</span>
              <span className="ini-ico"><IconoCanvas tipo="resistencia" w={84} h={46} /></span>
              <span className="ini-verbo">Resolver</span>
              <h3>Retos de laboratorio</h3>
              <p>Construye lo que se te pide, primero con guía y luego por tu cuenta.</p>
              <span className="ini-prog"><Barra n={nR} t={RETOS.length} /><small>{nR} de {RETOS.length}</small></span>
            </button>
            <button className="ini-card" onClick={() => ir("Problemas")}>
              <span className="ini-num">3</span>
              <span className="ini-ico"><IconoCanvas tipo="cable" w={84} h={46} /></span>
              <span className="ini-verbo">Aplicar <span className="pb-nivel n3 ruta-nivel">Intermedio–avanzado</span></span>
              <h3>Problemas aplicados</h3>
              <p>Kirchhoff, reducción de circuitos y capacitores, resueltos paso a paso.</p>
              <span className="ini-prog"><Barra n={nP} t={PROBLEMAS.length} /><small>{nP} de {PROBLEMAS.length}</small></span>
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
