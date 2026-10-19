import { IconoCanvas } from "../componentes/Iconos.jsx";
import { LECCIONES } from "../datos/lecciones.js";
import { RETOS } from "../datos/retos.js";
import { PROBLEMAS } from "../datos/problemas.js";
import { TECLA } from "../lienzo/Lienzo.js";

const OBJETIVOS = [
  ["Comprender", "Relacionar voltaje, corriente y resistencia a partir de la ley de Ohm, observando qué cambia cuando se modifica una sola variable."],
  ["Diferenciar", "Distinguir los circuitos en serie, en paralelo y mixtos según cómo se reparten el voltaje y la corriente."],
  ["Predecir y comprobar", "Formular una hipótesis antes de cada experimento y contrastarla con las mediciones del simulador."],
  ["Resolver", "Aplicar las leyes de Kirchhoff, la reducción de circuitos y la potencia eléctrica en problemas paso a paso."],
];

const PASOS = [
  ["Juega una sesión", "Desde la portada, pulsa Jugar: cuatro casos de unos dos minutos en el tablero real. Predices qué pasará, reparas un circuito averiado y construyes uno que cumpla una condición."],
  ["Aprende del resultado", "El simulador decide si tenías razón. Cada caso termina con una explicación corta, el detalle con los cálculos y la idea que te llevas."],
  ["Sube de nivel", "Al terminar una sesión ves tus puntos, tus estrellas y tus insignias, y se desbloquea el siguiente nivel: primeros circuitos, serie y paralelo, protección."],
  ["Profundiza a tu ritmo", "En «Explorar por mi cuenta» están las lecciones guiadas y los retos de laboratorio, en orden."],
  ["Experimenta sin límites", "En el simulador libre puedes armar cualquier circuito, provocar fallas reales y repararlas. Los problemas aplicados son para nivel intermedio y avanzado."],
];

const HERRAMIENTAS = [
  ["bateria", "Batería", "Da el empuje (voltaje). Solo puede haber una por circuito."],
  ["resistencia", "Resistencia", "Se opone a la corriente. Elige un valor o escríbelo en ohmios."],
  ["bombillo", "Bombillo", "Brilla según la potencia que recibe (P = V × I)."],
  ["interruptor", "Interruptor", "Abre o cierra el camino. Con la herramienta Mover, un clic lo alterna."],
  ["cable", "Cable", "Un clic para empezar, otro en cada doblez; termina al tocar una conexión."],
  ["fusible", "Fusible", "Se funde si pasa más corriente que su valor nominal y protege el circuito."],
];

const ATAJOS = [
  [`${TECLA} + Z`, "Deshace el último cambio (con Shift lo rehace)"],
  ["Arrastrar el fondo", "Dibuja un recuadro para seleccionar varias piezas"],
  [`Shift / ${TECLA} + clic`, "Suma o quita una pieza de la selección"],
  [`${TECLA} + A`, "Selecciona todo el circuito"],
  [`${TECLA} + C / V`, "Copia y pega lo seleccionado (X corta, D duplica)"],
  ["R", "Gira la pieza seleccionada o la que vas a colocar"],
  ["Supr", "Borra lo seleccionado"],
  ["Esc", "Cancela el cable en curso o quita la selección"],
  ["Espacio + arrastrar", "Mueve la vista del tablero"],
  [`${TECLA} + rueda`, "Acerca o aleja el tablero"],
];

const CONCEPTOS = ["Voltaje", "Corriente", "Resistencia", "Ley de Ohm", "Código de colores", "Circuito en serie", "Circuito en paralelo", "Circuitos mixtos", "Potencia eléctrica", "Leyes de Kirchhoff", "Resistencia equivalente", "Capacitores"];

const EQUIPO = ["Santiago Barrios Guerrero", "Isabel Marrugo Jurado", "Valentina Niño Solano", "David Alvarez Villalobos"];
const iniciales = (n) => n.split(" ").slice(0, 2).map((p) => p[0]).join("");

export default function Acerca({ ir }) {
  const MODULOS = [
    ["bombillo", "Comprender", "Lecciones guiadas", `${LECCIONES.length} lecciones`, "Conceptos explicados con experimentos que tú mismo modificas.", "Aprender"],
    ["resistencia", "Resolver", "Retos de laboratorio", `${RETOS.length} retos`, "Desafíos de construcción, de lo guiado a lo libre.", "Laboratorio"],
    ["bateria", "Construir", "Simulador libre", "Tablero abierto", "Un espacio para probar tus propias ideas sin instrucciones.", "Configurar"],
    ["cable", "Aplicar", "Problemas aplicados", `${PROBLEMAS.length} problemas`, "Kirchhoff, reducción de circuitos y capacitores, paso a paso.", "Problemas"],
  ];
  return (
    <div className="ini">
      <div className="ini-cont">
        <header className="ini-nav">
          <button className="ini-link" onClick={() => ir("Inicio")}>← Inicio</button>
          <nav><button className="ini-link" onClick={() => ir("Docentes")}>Para docentes</button></nav>
        </header>

        <section className="ac-hero">
          <span className="ini-kicker"><span className="ini-kicker-punto" /> ACERCA DEL PROYECTO</span>
          <h1>VOLTA, un laboratorio para <em>ver</em> la electricidad.</h1>
          <p>VOLTA es un simulador interactivo de circuitos eléctricos pensado para aprender haciendo. En lugar de memorizar fórmulas, construyes circuitos, cambias sus valores y observas en tiempo real cómo responden el voltaje, la corriente y el brillo de cada bombillo.</p>
          <p>Nace como proyecto de la asignatura <b>Física – Electricidad</b> con una pregunta sencilla: ¿cómo hacer visible algo que no se puede ver? La respuesta es un recorrido que combina explicación, experimentación y práctica.</p>
          <div className="ac-datos">
            <div><b>{LECCIONES.length}</b><span>lecciones</span></div>
            <div><b>{RETOS.length}</b><span>retos</span></div>
            <div><b>{PROBLEMAS.length}</b><span>problemas</span></div>
            <div><b>1</b><span>simulador libre</span></div>
          </div>
        </section>

        <section className="ac-sec">
          <div className="ac-cab"><span className="ac-n">01</span><h2>Objetivos</h2></div>
          <div className="ac-general">
            <span className="ini-verbo">Objetivo general</span>
            <p>Facilitar la comprensión de los circuitos eléctricos de corriente continua mediante un entorno interactivo donde el estudiante predice, experimenta y explica el comportamiento de un circuito.</p>
          </div>
          <div className="ac-grid2">
            {OBJETIVOS.map(([t, d]) => (
              <div key={t} className="ac-obj"><span className="ac-check" aria-hidden="true">✓</span><div><h3>{t}</h3><p>{d}</p></div></div>
            ))}
          </div>
        </section>

        <section className="ac-sec">
          <div className="ac-cab"><span className="ac-n">02</span><h2>Qué encontrarás</h2></div>
          <div className="ac-mods">
            {MODULOS.map(([ico, verbo, t, cuenta, d, destino]) => (
              <button key={t} className="ac-mod" onClick={() => ir(destino)}>
                <span className="ini-ico"><IconoCanvas tipo={ico} w={84} h={46} /></span>
                <span className="ini-verbo">{verbo}</span>
                <h3>{t}</h3>
                <p>{d}</p>
                <span className="ac-cuenta">{cuenta} <span aria-hidden="true">→</span></span>
              </button>
            ))}
          </div>
        </section>

        <section className="ac-sec">
          <div className="ac-cab"><span className="ac-n">03</span><h2>Cómo usar VOLTA</h2></div>
          <ol className="ac-pasos">
            {PASOS.map(([t, d]) => <li key={t}><h3>{t}</h3><p>{d}</p></li>)}
          </ol>
        </section>

        <section className="ac-sec">
          <div className="ac-cab"><span className="ac-n">04</span><h2>Instrucciones del simulador</h2></div>
          <div className="ac-sim">
            <div className="ac-caja">
              <h3>Las piezas</h3>
              <ul className="ac-piezas">
                {HERRAMIENTAS.map(([ico, t, d]) => (
                  <li key={t}><span className="ac-pieza-ico"><IconoCanvas tipo={ico} w={52} h={30} /></span><div><b>{t}</b><p>{d}</p></div></li>
                ))}
              </ul>
            </div>
            <div className="ac-col">
              <div className="ac-caja">
                <h3>Arma tu primer circuito</h3>
                <ol className="ac-mini">
                  <li>Coloca una batería y un bombillo en el tablero.</li>
                  <li>Con la herramienta <b>Cable</b>, une el + de la batería con el bombillo y regresa al −.</li>
                  <li>Cuando el camino esté cerrado, el bombillo brilla y verás la corriente circular.</li>
                  <li>Selecciona una pieza para cambiar su valor y observa cómo cambian las mediciones.</li>
                </ol>
              </div>
              <div className="ac-caja">
                <h3>Atajos de teclado</h3>
                <ul className="ac-atajos">
                  {ATAJOS.map(([k, d]) => <li key={k}><kbd>{k}</kbd><span>{d}</span></li>)}
                </ul>
              </div>
            </div>
          </div>
        </section>

        <section className="ac-sec">
          <div className="ac-cab"><span className="ac-n">05</span><h2>Conceptos que se trabajan</h2></div>
          <div className="ac-chips">{CONCEPTOS.map((c) => <span key={c}>{c}</span>)}</div>
          <p className="ac-nota"><b>Tu progreso se guarda solo en este navegador.</b> No se crean cuentas ni se envían datos. Desde <button className="ac-enlace" onClick={() => ir("Progreso")}>Mi progreso</button> puedes usar <b>Guardar copia</b> para entregarla al docente o continuar en otro equipo.</p>
        </section>

        <section className="ac-sec">
          <div className="ac-cab"><span className="ac-n">06</span><h2>Equipo</h2></div>
          <div className="ac-equipo">
            {EQUIPO.map((n) => <div key={n} className="ac-persona"><span className="ac-avatar" aria-hidden="true">{iniciales(n)}</span><b>{n}</b></div>)}
          </div>
          <dl className="ac-ficha">
            <div><dt>Asignatura</dt><dd>Física – Electricidad</dd></div>
            <div><dt>Tecnologías</dt><dd>React, Vite y HTML Canvas</dd></div>
            <div><dt>Origen</dt><dd>Versión web del proyecto original en Python y CustomTkinter</dd></div>
          </dl>
        </section>

        <section className="ac-final">
          <div>
            <h2>¿Listo para encender tu primer circuito?</h2>
            <p>Empieza por la ruta de aprendizaje o ve directo al simulador.</p>
          </div>
          <div className="ini-cta">
            <button className="ini-btn prim" onClick={() => ir("Ruta")}>Comenzar a explorar<span aria-hidden="true">→</span></button>
            <button className="ini-btn sec" onClick={() => ir("Configurar")}>Probar el simulador</button>
          </div>
        </section>

        <footer className="ini-pie">
          <span className="ini-footer-brand"><b>VOLTA</b><i /> Explora · Conecta · Comprende</span>
          <button className="ini-link" onClick={() => ir("Inicio")}>Volver al inicio</button>
        </footer>
      </div>
    </div>
  );
}
