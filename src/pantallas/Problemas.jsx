import { useEffect, useMemo, useRef, useState } from "react";
import FiguraProblema from "../componentes/FiguraProblema.jsx";
import { PROBLEMAS, NIVELES_PROB, GRUPOS_PROB } from "../datos/problemas.js";
import { CONCEPTOS, GUIA } from "../datos/guiaProblemas.js";
import Reduccion from "../componentes/Reduccion.jsx";
import { anotar } from "../lib/evidencias.js";

const leer = (t) => {
  const n = parseFloat(String(t).replace(",", ".").replace(/[^0-9eE+\-.]/g, ""));
  return Number.isFinite(n) ? n : null;
};
const acierta = (x, v) => x !== null && Math.abs(x - v) <= Math.max(Math.abs(v) * 0.01, 0.011);

// Un concepto de la guía: qué es, fórmula y ejemplo con números.
function Concepto({ id, compacto = false }) {
  const c = CONCEPTOS[id];
  return (
    <div className="pb-concepto">
      {!compacto ? <h3>{c.titulo}</h3> : null}
      {c.texto.map((t, k) => <p key={k}>{t}</p>)}
      {c.formula ? <div className="pb-formula">{c.formula}</div> : null}
      {c.simbolos ? <ul className="pb-simbolos">{c.simbolos.map(([a, b]) => <li key={a}><b>{a}</b>{b}</li>)}</ul> : null}
      {c.ejemplo ? <div className="pb-ejemplo"><span>Ejemplo</span><p>{c.ejemplo[0]}</p><p className="f">{c.ejemplo[1]}</p></div> : null}
    </div>
  );
}

// Panel lateral con todas las fórmulas y explicaciones del grupo; se abre desde cualquier paso.
function GuiaPanel({ grupo, foco, onCerrar }) {
  const ref = useRef(null);
  useEffect(() => {
    const el = foco && ref.current && ref.current.querySelector(`[data-concepto="${foco}"]`);
    if (el) el.scrollIntoView({ block: "start" });
    const esc = (e) => e.key === "Escape" && onCerrar();
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [foco, onCerrar]);
  return (
    <div className="pb-guia-fondo" onClick={onCerrar}>
      <aside className="pb-guia" ref={ref} onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Fórmulas y explicación">
        <div className="pb-guia-cab">
          <div><small>FÓRMULAS Y EXPLICACIÓN</small><b>{GRUPOS_PROB[grupo].titulo}</b></div>
          <button className="btn sm" onClick={onCerrar}>Cerrar</button>
        </div>
        {GUIA[grupo].map((id) => (
          <details key={id} data-concepto={id} className={`pb-guia-item ${id === foco ? "foco" : ""}`} open={id === foco || !foco}>
            <summary>{CONCEPTOS[id].titulo}{CONCEPTOS[id].formula ? <code>{CONCEPTOS[id].formula}</code> : null}</summary>
            <Concepto id={id} compacto />
          </details>))}
      </aside>
    </div>
  );
}

function Resolver({ problema, hecho, ir, setProgreso, onVolver, onSiguiente }) {
  const v = useMemo(() => problema.calc(), [problema]);
  const pasos = useMemo(() => problema.pasos(v), [problema, v]);
  const [i, setI] = useState(0);
  const [estado, setEstado] = useState([]);       // por paso: "bien" | "visto" | "leido"
  const [texto, setTexto] = useState("");
  const [fallos, setFallos] = useState(0);
  const [msg, setMsg] = useState(null);           // { ok, t }
  const [mostrar, setMostrar] = useState(false);  // procedimiento visible en el paso actual
  const [intro, setIntro] = useState(true);        // «Antes de empezar»
  const [guia, setGuia] = useState(null);          // concepto abierto en el panel (o "todo")
  const primero = problema.nivel === 1;            // el primero de cada grupo enseña desde cero

  const fin = i >= pasos.length;
  const p = pasos[i];
  const conAyuda = estado.includes("visto");
  const terminar = (e) => {
    setProgreso((pr) => ({ ...pr, problemas: new Set([...pr.problemas, problema.clave]) }));
    anotar(setProgreso, problema.clave, (ev) => ({ ...ev, fecha: ev.fecha || new Date().toISOString() }));
    return e;
  };
  const avanzar = (marca) => {
    const e = [...estado, marca];
    setEstado(e); setTexto(""); setFallos(0); setMsg(null); setMostrar(false);
    if (i + 1 >= pasos.length) terminar(e);
    setI(i + 1);
  };
  const comprobar = (ev) => {
    ev.preventDefault();
    const x = leer(texto);
    if (x === null) { setMsg({ ok: false, t: "Escribe un número." }); return; }
    if (acierta(x, p.pregunta.valor)) { setMsg({ ok: true, t: "Correcto." }); setMostrar(true); return; }
    setFallos((n) => n + 1);
    setMsg({ ok: false, t: fallos >= 1 ? p.pregunta.pista : "No coincide. Revisa e inténtalo de nuevo." });
    if (fallos === 1) anotar(setProgreso, problema.clave, (e) => ({ ...e, pistas: e.pistas + 1 }));
  };
  const ver = () => { setMostrar(true); setMsg(null); anotar(setProgreso, problema.clave, (e) => ({ ...e, pistas: e.pistas + 1 })); };
  const correcto = msg && msg.ok;
  const revelado = !p?.pregunta || mostrar;

  return (
    <div className="pantalla pb" style={{ overflowY: "auto" }}>
      <div className="cab">
        <button className="btn contorno med" onClick={onVolver} style={{ marginTop: 6 }}>← Problemas</button>
        <div className="titulos">
          <h1 style={{ fontSize: 26 }}>{problema.titulo}</h1>
          <div className="sub">{problema.ref} · {NIVELES_PROB[problema.nivel]}</div>
        </div>
        <button className="btn contorno med" style={{ marginTop: 6 }} onClick={() => setGuia("todo")}>Fórmulas y explicación</button>
        <span className="pb-prog" aria-label={`Paso ${Math.min(i + 1, pasos.length)} de ${pasos.length}`}>
          {pasos.map((_, k) => <i key={k} className={k < i ? "ok" : k === i ? "ahora" : ""} />)}
        </span>
      </div>
      <div className="pb-cuerpo">
        <div className="pb-izq">
          <div className="tarjeta pb-enun"><p>{problema.enunciado}</p></div>
          <div className="tarjeta pb-figura"><FiguraProblema tipo={problema.figura} foco={fin ? [] : p.foco} /></div>
        </div>
        <div className="pb-der">
          {estado.length > 0 && (
            <ol className="pb-hist">
              {estado.map((e, k) => (
                <li key={k}><span className={`pb-n ${e === "visto" ? "ayuda" : ""}`}>{k + 1}</span><span>{pasos[k].resumen}</span></li>
              ))}
            </ol>
          )}
          {intro ? (
            <div className="tarjeta pb-paso pb-intro">
              <div className="pb-paso-n">{primero ? "Antes de empezar · desde cero" : "Antes de empezar"}</div>
              {primero ? (<>
                <h2>Lo que necesitas saber</h2>
                <p>No hace falta que conozcas nada de esto todavía: aquí está explicado. Léelo con calma; cada paso del problema usa una de estas ideas y te dirá cuál.</p>
                {problema.conceptos.map((id) => <Concepto key={id} id={id} />)}
              </>) : (<>
                <h2>Lo que vas a usar</h2>
                <p>Este problema aplica estas ideas. Si alguna no te suena, ábrela antes de empezar; también puedes abrir «Fórmulas y explicación» en cualquier momento.</p>
                <div className="pb-chips">{problema.conceptos.map((id) => <button key={id} className="pb-usa" onClick={() => setGuia(id)}>{CONCEPTOS[id].corto}</button>)}</div>
              </>)}
              <button className="btn prim med" onClick={() => setIntro(false)}>{primero ? "Ya lo entendí: empezar el problema →" : "Empezar →"}</button>
            </div>
          ) : !fin ? (
            <div className="tarjeta pb-paso">
              <div className="pb-paso-n">Paso {i + 1} de {pasos.length}</div>
              <h2>{p.titulo}</h2>
              {p.concepto ? <button className="pb-usa" onClick={() => setGuia(p.concepto)}>Usa: {CONCEPTOS[p.concepto].corto} · ver explicación</button> : null}
              <p>{p.texto}</p>
              {p.explica ? <p className="pb-explica">{p.explica}</p> : null}
              {p.pregunta && !mostrar && (
                <form className="pb-form" onSubmit={comprobar}>
                  <label htmlFor="pb-resp">{p.pregunta.texto}</label>
                  <div className="pb-fila">
                    <input id="pb-resp" inputMode="decimal" autoComplete="off" value={texto} onChange={(e) => { setTexto(e.target.value); setMsg(null); }} placeholder="0" />
                    <span className="pb-u">{p.pregunta.unidad}</span>
                    <button type="submit" className="btn prim med">Comprobar</button>
                  </div>
                  {msg && <div className={`pb-msg ${msg.ok ? "ok" : "no"}`} role="status">{msg.t}</div>}
                  <button type="button" className="btn discreto sm" onClick={ver}>Ver el procedimiento</button>
                </form>
              )}
              {revelado && (
                <div className="pb-sol">
                  {correcto && <div className="pb-msg ok" role="status">Correcto.</div>}
                  <div className="caja">
                    {p.lineas.map((l, k) => <div key={k} className={`f ${(p.destacar ?? [p.lineas.length - 1]).includes(k) ? "fuerte" : ""}`}>{l}</div>)}
                  </div>
                  {p.reduccion ? <Reduccion etapas={p.reduccion} /> : null}
                  <button className="btn prim med" onClick={() => avanzar(!p.pregunta ? "leido" : correcto ? "bien" : "visto")}>
                    {i + 1 >= pasos.length ? "Terminar" : "Siguiente paso"}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="tarjeta pb-final">
              <span className={`chip ${conAyuda ? "adv" : "exito"}`}>{conAyuda ? "Resuelto con ayuda" : "Resuelto"}</span>
              <h2>Resultado</h2>
              <div className="pb-res">{problema.respuesta(v)}</div>
              <p className="pb-nota">{conAyuda ? "Vuelve a intentarlo sin ver el procedimiento y compáralo con este." : "Comprueba siempre con el libro: que tu resultado coincida con el suyo."}</p>
              <div className="pb-acc">
                <button className="btn contorno med" onClick={() => { setI(0); setEstado([]); setTexto(""); setFallos(0); setMsg(null); setMostrar(false); }}>Repetir</button>
                {onSiguiente ? <button className="btn prim med" onClick={onSiguiente}>Siguiente problema</button> : <button className="btn prim med" onClick={onVolver}>Ver todos</button>}
              </div>
            </div>
          )}
        </div>
      </div>
      {guia ? <GuiaPanel grupo={problema.grupo} foco={guia === "todo" ? null : guia} onCerrar={() => setGuia(null)} /> : null}
    </div>
  );
}

export default function Problemas({ ir, progreso, setProgreso, clave }) {
  const [abierto, setAbierto] = useState(clave || null);
  const [guiaLista, setGuiaLista] = useState(null);
  const abrir = (c) => { anotar(setProgreso, c, (e) => ({ ...e, intentos: e.intentos + 1 })); setAbierto(c); window.scrollTo(0, 0); };
  if (abierto) {
    const k = PROBLEMAS.findIndex((p) => p.clave === abierto);
    const sig = PROBLEMAS[k + 1];
    return <Resolver key={abierto} problema={PROBLEMAS[k]} hecho={progreso.problemas.has(abierto)} ir={ir} setProgreso={setProgreso}
      onVolver={() => setAbierto(null)} onSiguiente={sig ? () => abrir(sig.clave) : null} />;
  }
  const hechos = PROBLEMAS.filter((p) => progreso.problemas.has(p.clave)).length;
  return (
    <div className="pantalla pb" style={{ overflowY: "auto" }}>
      <div className="cab">
        <button className="btn contorno med" onClick={() => ir("Ruta")} style={{ marginTop: 6 }}>← Aprender</button>
        <div className="titulos">
          <h1 style={{ fontSize: 30 }}>Problemas aplicados <span className="pb-nivel n3 pb-nivel-t">Intermedio–avanzado</span></h1>
          <div className="sub">Resuelve paso a paso: escribes tu respuesta, compruebas y ves el procedimiento. {hechos} de {PROBLEMAS.length} resueltos.</div>
        </div>
      </div>
      <div className="pb-lista">
        {Object.keys(GRUPOS_PROB).map((g) => (
          <section key={g}>
            <div className="pb-grupo-cab">
              <h2>{GRUPOS_PROB[g].titulo} <small>{GRUPOS_PROB[g].sub}</small></h2>
              <button className="btn sm" onClick={() => setGuiaLista(g)}>Leer la guía de este tema</button>
            </div>
            <div className="pb-cards">
              {PROBLEMAS.filter((p) => p.grupo === g).map((p) => {
                const ok = progreso.problemas.has(p.clave);
                return (
                  <button key={p.clave} className={`pb-card ${ok ? "hecho" : ""}`} onClick={() => abrir(p.clave)}>
                    <span className={`pb-nivel n${p.nivel}`}>{NIVELES_PROB[p.nivel]}{p.nivel === 1 ? " · empieza aquí" : ""}</span>
                    <h3>{p.titulo}</h3>
                    <span className="pb-ref">{p.ref}</span>
                    <span className="pb-estado">{ok ? "Resuelto" : "Resolver →"}</span>
                  </button>
                );
              })}
            </div>
          </section>
        ))}
      </div>
      {guiaLista ? <GuiaPanel grupo={guiaLista} foco={null} onCerrar={() => setGuiaLista(null)} /> : null}
    </div>
  );
}
