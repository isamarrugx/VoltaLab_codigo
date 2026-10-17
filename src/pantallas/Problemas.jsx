import { useMemo, useState } from "react";
import FiguraProblema from "../componentes/FiguraProblema.jsx";
import { PROBLEMAS, NIVELES_PROB, GRUPOS_PROB } from "../datos/problemas.js";
import { anotar } from "../lib/evidencias.js";

const leer = (t) => {
  const n = parseFloat(String(t).replace(",", ".").replace(/[^0-9eE+\-.]/g, ""));
  return Number.isFinite(n) ? n : null;
};
const acierta = (x, v) => x !== null && Math.abs(x - v) <= Math.max(Math.abs(v) * 0.01, 0.011);

function Resolver({ problema, hecho, ir, setProgreso, onVolver, onSiguiente }) {
  const v = useMemo(() => problema.calc(), [problema]);
  const pasos = useMemo(() => problema.pasos(v), [problema, v]);
  const [i, setI] = useState(0);
  const [estado, setEstado] = useState([]);       // por paso: "bien" | "visto" | "leido"
  const [texto, setTexto] = useState("");
  const [fallos, setFallos] = useState(0);
  const [msg, setMsg] = useState(null);           // { ok, t }
  const [mostrar, setMostrar] = useState(false);  // procedimiento visible en el paso actual

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
          {!fin ? (
            <div className="tarjeta pb-paso">
              <div className="pb-paso-n">Paso {i + 1} de {pasos.length}</div>
              <h2>{p.titulo}</h2>
              <p>{p.texto}</p>
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
    </div>
  );
}

export default function Problemas({ ir, progreso, setProgreso, clave }) {
  const [abierto, setAbierto] = useState(clave || null);
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
        <button className="btn contorno med" onClick={() => ir("Ruta")} style={{ marginTop: 6 }}>← Mi ruta</button>
        <div className="titulos">
          <h1 style={{ fontSize: 30 }}>Problemas aplicados</h1>
          <div className="sub">Resuelve paso a paso: predices, compruebas y ves el procedimiento. {hechos} de {PROBLEMAS.length} resueltos.</div>
        </div>
      </div>
      <div className="pb-lista">
        {Object.keys(GRUPOS_PROB).map((g) => (
          <section key={g}>
            <h2>{GRUPOS_PROB[g].titulo} <small>{GRUPOS_PROB[g].sub}</small></h2>
            <div className="pb-cards">
              {PROBLEMAS.filter((p) => p.grupo === g).map((p) => {
                const ok = progreso.problemas.has(p.clave);
                return (
                  <button key={p.clave} className={`pb-card ${ok ? "hecho" : ""}`} onClick={() => abrir(p.clave)}>
                    <span className={`pb-nivel n${p.nivel}`}>{NIVELES_PROB[p.nivel]}</span>
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
    </div>
  );
}
