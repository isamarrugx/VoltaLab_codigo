import { useEffect, useReducer, useRef, useState } from "react";
import LienzoVista from "../componentes/LienzoVista.jsx";
import { IconoCanvas, IconoEstado } from "../componentes/Iconos.jsx";
import { GraficaRelacion } from "../componentes/Graficas.jsx";
import { CajaTitulada, BarraPasos, OpcionRelieve, Teoria } from "../componentes/piezas.jsx";
import * as E from "../lib/estilos.js";
import * as F from "../lib/formato.js";
import { mezclarColor } from "../lib/animaciones.js";
import { analizar, nombresComponentes } from "../lib/explicador.js";
import { Contexto, limitesDef, soluciones, yaLoSabes } from "../datos/lecciones.js";
import { teoriaDe } from "../datos/teoria.js";
import PorDentro from "../componentes/PorDentro.jsx";
import { Simulacion } from "../lib/simulacion.js";
import { ESPEC } from "../lib/fallas.js";

const TIPOS = {
  idea: ["IDEA", E.COLOR_ACENTO, E.COLOR_ACENTO_SUAVE],
  explora: ["TU TURNO", E.COLOR_ELECTRICIDAD_OSCURO, E.COLOR_ELECTRICIDAD_SUAVE],
  reto: ["RETO", E.COLOR_ADVERTENCIA, E.COLOR_ADVERTENCIA_SUAVE],
  pregunta: ["COMPRUEBA", E.COLOR_POTENCIA, "#EFE7F8"],
  resumen: ["RESUMEN", E.COLOR_EXITO, E.COLOR_EXITO_SUAVE],
};
const MAGN = {
  V: ["Voltaje", E.COLOR_VOLTAJE, (m) => m.V, F.voltios],
  I: ["Corriente", E.COLOR_CORRIENTE, (m) => m.I, F.amperios],
  R: ["Resistencia total", E.COLOR_TEXTO_PRINCIPAL, (m) => m.Req, (x) => (x === Infinity ? "∞ (abierto)" : F.ohmios(x))],
  P: ["Potencia", E.COLOR_POTENCIA, (m) => m.P, F.vatios],
};

function Medidor({ clave, med, resaltar }) {
  const [titulo, color, extraer, fmt] = MAGN[clave];
  const val = med ? extraer(med) : null;
  const previo = useRef(null);
  const [info, setInfo] = useState({ texto: "", sube: true, k: 0 });
  useEffect(() => {
    const a = previo.current; previo.current = val;
    if (val == null) return;
    let texto = "";
    if (a != null && a !== val) {
      if (a === 0 || a === Infinity || val === 0 || val === Infinity) texto = val > a ? "SUBE" : "BAJA";
      else { const r = val / a; if (Math.abs(r - 1) > 0.005) texto = r > 1 ? `×${+r.toPrecision(3)}` : `÷${+(1 / r).toPrecision(3)}`; }
    }
    setInfo((p) => ({ texto, sube: a == null || val > a, k: p.k + 1 }));
  }, [val]);
  const fondo = mezclarColor(color, "#FFFFFF", 0.9), borde = mezclarColor(color, "#FFFFFF", 0.7);
  const colCambio = info.sube ? E.COLOR_EXITO : E.COLOR_ERROR;
  return (
    <div className={`medidor ${resaltar ? "res" : ""}`} style={{ background: fondo, borderColor: borde, boxShadow: `0 3px 0 ${mezclarColor(color, "#FFFFFF", 0.55)}` }}>
      <div className="t"><span style={{ color: mezclarColor(color, "#000000", 0.15) }}>{titulo.toUpperCase()}</span>
        {info.texto ? <i key={info.k} style={{ background: colCambio }}>{info.texto}</i> : null}</div>
      <div className="n">{val == null ? "—" : fmt(val)}</div>
    </div>
  );
}

export default function LeccionVista({ leccion: lec, etiqueta, onVolver, onCompletar, onSiguiente, onReiniciar, haySiguiente }) {
  const [, bump] = useReducer((x) => x + 1, 0);
  const L = useRef(null);
  const S = useRef({ i: 0, terminada: false, med: null, historial: [], estado: lec.tarjetas.map(() => ({})), conexion: lec.controles.find((c) => c.tipo === "conexion")?.opciones[0][0] ?? null, cargando: false, tocado: false, pistaVisual: null, leyendo: false, sel: null, fallas: [], vioCorto: false });
  const sim = useRef(null);
  const s = S.current;
  const tarjetas = lec.tarjetas;
  const bloquesTeoria = teoriaDe(lec.clave);
  const t = tarjetas[s.i];
  const st = s.estado[s.i];

  const encuadre = (def) => { const [f0, f1, c0, c1] = limitesDef(def); return [f0 - 1, f1 + 1, c0, c1]; };
  const nombres = () => { const l = L.current; l.mostrarNombres(nombresComponentes(l.componentes)); };
  // Contexto de las metas, con lo que pasó físicamente (fallas, cortocircuito) y las piezas actuales.
  const nuevoCtx = () => {
    const ctx = new Contexto(s.med, s.historial);
    ctx.fallas = s.fallas; ctx.vioCorto = s.vioCorto;
    ctx.pieza = (tipo) => { const l = L.current; const tg = l && l.tagsPorTipo(tipo)[0]; return tg ? l.componentes[tg] : null; };
    return ctx;
  };
  const tagControl = (c) => { const [tipo, idx] = c.componente; const tags = L.current.tagsPorTipo(tipo); return idx < tags.length ? tags[idx] : null; };
  const valorControl = (c) => {
    if (c.tipo === "conexion") return s.conexion;
    const comp = L.current?.componentes[tagControl(c)];
    if (!comp) return null;
    if (c.tipo === "limite") return comp[ESPEC[comp.tipo].campo] ?? ESPEC[comp.tipo].def;
    return c.tipo === "interruptor" ? comp.cerrado : comp.valor;
  };
  const opcionesControl = (c) => c.tipo === "interruptor" ? [[true, "Cerrado"], [false, "Abierto"]] : c.tipo === "conexion" ? c.opciones.map(([k, tx]) => [k, tx]) : c.opciones.map((x) => [x, F.fmtValor(x, c.unidad)]);

  const refrescar = () => {
    const l = L.current;
    const { med } = analizar(l.componentes, l.cables);
    s.med = med;
    if (sim.current) sim.current.recalcular(); // con fallas: incluye el límite de la batería
    else if (med && !med.abierto) l.mostrarResultados(med.resultado, med.tagsR);
  };
  const guiaReto = () => {
    const l = L.current; if (!l) return;
    const t0 = tarjetas[s.i], st0 = s.estado[s.i];
    const vistas = st0.pistas || 0;
    if (s.terminada || t0.tipo !== "reto" || st0.hecha || !vistas) { s.pistaVisual = null; l.limpiarGuia(); return; }
    const ctx = nuevoCtx();
    const ctrls = Object.fromEntries(lec.controles.map((c) => [c.id, c]));
    let sol = null;
    for (const so of soluciones(t0)) {
      const cond = {};
      for (const [k, v] of Object.entries(so)) if (ctrls[k]?.tipo === "valor") cond[ctrls[k].componente[0] === "bateria" ? "V" : ctrls[k].etiqueta] = v;
      if (!ctx.visto(cond)) { sol = so; break; }
    }
    sol = sol || soluciones(t0)[0] || {};
    s.pistaVisual = [vistas, sol];
    const tags = [];
    for (const [k, meta] of Object.entries(sol)) { const c = ctrls[k]; if (c && valorControl(c) !== meta) { const tg = tagControl(c); if (tg) tags.push(tg); } }
    l.mostrarGuia({ tags });
  };
  const evaluar = () => {
    if (s.terminada) return;
    const t0 = tarjetas[s.i], st0 = s.estado[s.i];
    if (t0.tipo === "explora" || t0.tipo === "reto") {
      const ctx = nuevoCtx();
      if (!st0.hecha) {
        let ok = false;
        try { ok = !!t0.meta(ctx); } catch { ok = false; }
        if (ok) {
          st0.hecha = true;
          const tx = t0.tipo === "explora" ? t0.descubre : t0.logro;
          try { st0.texto = typeof tx === "function" ? tx(ctx) : tx; } catch { st0.texto = ""; }
          L.current.iluminar(null, E.COLOR_EXITO, 0.7);
          st0.recien = true;
        }
      }
    }
    guiaReto();
    bump();
  };
  const alCambiar = () => {
    if (s.cargando || !L.current) return;
    s.tocado = true;
    nombres(); refrescar();
    s.historial.push(s.med);
    evaluar();
  };
  const irA = (i) => {
    s.i = i; s.terminada = false; s.historial = [s.med]; s.leyendo = false;
    if (L.current) { evaluar(); }
    const sc = document.querySelector(".col-der .scroll"); if (sc) sc.scrollTop = 0;
  };
  const alListo = (l) => {
    L.current = l;
    if (lec.fallas) {
      // lección con fallas reales: las piezas se calientan y pueden fundirse según el cálculo
      sim.current = new Simulacion(l, { onFalla: (f) => { s.fallas.push(f); } });
      sim.current.encendida = true;
    }
    s.cargando = true; l.cargarEjemplo(lec.circuito); s.cargando = false;
    nombres(); l.encuadrar(encuadre(lec.circuito)); refrescar();
    irA(0);
    setTimeout(() => { if (!s.tocado && L.current === l) l.centrarVista(); }, 250);
  };
  const aplicar = (c, v) => {
    const l = L.current;
    if (c.tipo === "conexion") {
      if (v === s.conexion) return;
      s.conexion = v;
      const def = c.opciones.find(([k]) => k === v)[2];
      l.cargarEjemplo(def); l.encuadrar(encuadre(def), false);
      return;
    }
    const tag = tagControl(c); if (!tag) return;
    if (c.tipo === "interruptor") l.establecerInterruptor(tag, v);
    else if (c.tipo === "limite") l.establecerEspec(tag, v);
    else l.establecerValor(tag, v);
  };

  // Bucle físico de las lecciones con fallas (10 veces por segundo).
  useEffect(() => {
    if (!lec.fallas) return undefined;
    let ult = performance.now();
    const id = setInterval(() => {
      if (!sim.current) return;
      const ahora = performance.now(), r = sim.current.paso(Math.min(0.25, (ahora - ult) / 1000)); ult = ahora;
      if (r && r.med.corto && !s.vioCorto) { s.vioCorto = true; evaluar(); }
    }, 100);
    return () => clearInterval(id);
    // eslint-disable-next-line
  }, []);

  const hecha = (k = s.i) => ["idea", "resumen"].includes(tarjetas[k].tipo) || !!s.estado[k].hecha;
  const seguir = () => {
    if (s.terminada || !hecha()) return;
    if (s.i + 1 < tarjetas.length) irA(s.i + 1);
    else { s.terminada = true; onCompletar(lec.clave); L.current.iluminar(null, E.COLOR_EXITO, 0.9); L.current.limpiarGuia(); bump(); }
  };
  const atras = () => { if (s.terminada) irA(tarjetas.length - 1); else if (s.i > 0) irA(s.i - 1); };
  const responder = (clave) => {
    st.fallidas = st.fallidas || new Set(); st.ultima = clave;
    if (clave === t.correcta) st.hecha = true; else st.fallidas.add(clave);
    bump();
  };

  // ----- piezas -----
  const [vistas, solPista] = s.pistaVisual || [0, {}];
  const grupoControl = (c) => {
    const actual = valorControl(c);
    const meta = solPista[c.id];
    const mover = vistas >= 1 && meta !== undefined && actual !== meta;
    return (
      <div key={c.id} className={`grupo-ctrl ${mover ? "mover" : ""}`}>
        <b>{c.etiqueta}</b>
        {opcionesControl(c).map(([v, tx]) => {
          const num = typeof v === "number";
          const on = num ? actual != null && Math.abs(actual - v) < 1e-9 : actual === v;
          const exacto = mover && vistas >= 3 && v === meta;
          const lado = mover && vistas >= 2 && !exacto && actual != null && typeof meta === "number" && Math.min(actual, meta) < v && v <= Math.max(actual, meta);
          return <button key={String(v)} className={`btn opt ${on ? "on" : exacto ? "exacto" : lado ? "lado" : ""}`} onClick={() => aplicar(c, v)}>{tx}</button>;
        })}
      </div>
    );
  };
  const ctxAhora = nuevoCtx();
  // Datos reales para el panel «Por dentro».
  const datosPorDentro = () => {
    const m = s.med, l = L.current;
    if (lec.porDentro === "filamento") {
      const tg = l && l.tagsPorTipo("bombillo")[0], comp = tg && l.componentes[tg], d = m && m.componentes.B1;
      return { P: d && !m.abierto ? d.P : 0, pmax: lec.fallas && comp ? comp.pmax || 15 : null, danado: !!(comp && comp.danado), abierto: !m || m.abierto };
    }
    if (!m) return { V: 0, I: 0, R: Infinity, P: 0, abierto: true };
    return { V: m.V, I: m.abierto ? 0 : m.I, R: m.Req, P: m.abierto ? 0 : m.P, abierto: m.abierto };
  };
  const hayDanos = !!(L.current && L.current.hayDanados());
  const ctrlSel = s.sel ? lec.controles.find((c) => c.tipo !== "conexion" && tagControl(c) === s.sel) : null;
  const compSel = s.sel && L.current ? L.current.componentes[s.sel] : null;
  // con varias piezas elegidas se comparan sus medidas lado a lado
  const multiSel = L.current && L.current.seleccion.size > 1 ? [...L.current.seleccion].filter((tg) => L.current.componentes[tg]) : [];
  const datoPieza = (tg) => {
    const c = L.current.componentes[tg], d = L.current.datosDe(tg);
    if (d) return `${F.voltios(d.voltaje)} · ${F.amperios(d.corriente)} · ${F.vatios(d.potencia)}`;
    if (c.tipo === "bateria") return `${F.gg(c.valor)} V`;
    if (c.tipo === "interruptor") return c.cerrado ? "cerrado" : "abierto";
    return "sin corriente";
  };

  const Tabla = () => {
    const filas = [], vistos = new Set();
    for (const m of [...ctxAhora.cerradas].reverse()) { const k = `${m.V.toFixed(6)}|${m.Req.toFixed(6)}`; if (vistos.has(k)) continue; vistos.add(k); filas.push(m); }
    const ult = filas.slice(0, 6).reverse();
    return (
      <div className="formula-grande" style={{ padding: "8px 10px" }}>
        <table style={{ width: "100%", fontSize: 11, borderCollapse: "collapse" }}>
          <thead><tr>{["V", "R", "I medida", "V ÷ R"].map((h) => <th key={h} style={{ textAlign: "right", color: "var(--texto2)", fontSize: 10 }}>{h}</th>)}</tr></thead>
          <tbody>{ult.length ? ult.map((m, i) => (
            <tr key={i} style={{ fontWeight: i === ult.length - 1 ? 700 : 400 }}>
              <td align="right">{F.gg(m.V)} V</td><td align="right">{F.ohmios(m.Req)}</td><td align="right">{F.amperios(m.I)}</td><td align="right" style={{ color: "var(--acento)", fontWeight: 700 }}>{F.amperios(m.V / m.Req)}</td></tr>))
            : <tr><td colSpan={4} style={{ textAlign: "center", color: "var(--texto2)", padding: 4 }}>Mueve los controles: cada combinación se anota aquí.</td></tr>}</tbody>
        </table>
      </div>
    );
  };
  const Extras = ({ t }) => (<>
    {t.fijate ? <CajaTitulada titulo="Fíjate en el tablero" color={E.COLOR_ACENTO} fondo={E.COLOR_ACENTO_SUAVE}><ul>{t.fijate.map((p, i) => <li key={i}>{p}</li>)}</ul></CajaTitulada> : null}
    {t.ejemplo ? <CajaTitulada titulo="Ejemplo resuelto" color={E.COLOR_TEXTO_PRINCIPAL} fondo={E.COLOR_FONDO}>
      <p className="txt m" style={{ fontWeight: 700 }}>{t.ejemplo.enunciado}</p>
      {t.ejemplo.pasos.map((p, i) => <div className="ej-paso" key={i}><b>{i + 1}</b><span>{p}</span></div>)}</CajaTitulada> : null}
  </>);

  const cuerpoTarjeta = () => {
    if (s.terminada) {
      const r = tarjetas.find((x) => x.tipo === "resumen");
      return (<>
        <CajaTitulada titulo="¡Lección completada!" color={E.COLOR_EXITO} fondo={E.COLOR_EXITO_SUAVE} forma="ok" flash>
          <p className="txt m">Terminaste «{lec.titulo}». Esto es lo que te llevas:</p>
          {r ? r.puntos.map((p, i) => <p key={i} className="txt sm">•  {p}</p>) : null}
          <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 8 }}>
            {haySiguiente ? <button className="btn prim med" onClick={onSiguiente}>Siguiente lección  →</button> : null}
            <button className="btn med" onClick={onVolver}>Volver a las lecciones</button>
          </div>
        </CajaTitulada>
        <p className="txt sm" style={{ color: "var(--texto2)" }}>El circuito sigue vivo: puedes seguir moviendo los controles.</p>
      </>);
    }
    const [rot, col, fondo] = TIPOS[t.tipo];
    const recuerdo = t.tipo === "idea" && s.i === 0 ? yaLoSabes(lec.clave) : null;
    return (<>
      <span className="chip" style={{ background: fondo, color: col }}>{rot}</span>
      {t.titulo ? <h3 className="tc-titulo">{t.titulo}</h3> : null}
      {t.tipo === "idea" ? (<>
        {recuerdo ? <CajaTitulada titulo={`Ya lo sabes  ·  de «${recuerdo[0]}»`} color={E.COLOR_EXITO} fondo={E.COLOR_EXITO_SUAVE} forma="ok">{recuerdo[1].map((p, i) => <p key={i} className="txt sm">•  {p}</p>)}</CajaTitulada> : null}
        <p className="txt">{t.texto}</p>
        {t.formula ? <div className="formula-grande"><div className="f">{t.formula}</div>{(t.simbolos || []).map(([a, b], i) => <div className="s" key={i}><b>{a}</b><span>{b}</span></div>)}</div> : null}
        {t.analogia ? <CajaTitulada titulo="Imagínalo así" color={E.COLOR_ELECTRICIDAD_OSCURO} fondo={E.COLOR_ELECTRICIDAD_SUAVE}><p className="txt m" style={{ margin: 0 }}>{t.analogia}</p></CajaTitulada> : null}
        <Extras t={t} />
      </>) : null}
      {t.tipo === "explora" ? (<><div className="caja-t" style={{ background: E.COLOR_ELECTRICIDAD_SUAVE, borderColor: E.COLOR_ELECTRICIDAD }}><p className="txt" style={{ margin: 0 }}>{t.texto}</p></div><Extras t={t} /></>) : null}
      {t.tipo === "reto" ? <div className="caja-t" style={{ background: E.COLOR_ADVERTENCIA_SUAVE, borderColor: E.COLOR_ADVERTENCIA }}><p className="txt" style={{ margin: 0, fontWeight: 700 }}>{t.texto}</p></div> : null}
      {t.tipo === "pregunta" ? (<>
        <p className="txt" style={{ fontWeight: 700 }}>{t.texto}</p>
        {t.opciones.map(([k, tx], i) => {
          const fall = st.fallidas?.has(k), ok = st.hecha && k === t.correcta;
          return <OpcionRelieve key={k} letra={"ABCD"[i]} texto={tx} estado={ok ? "correcta" : fall ? "fallida" : "normal"} deshabilitada={!!st.hecha || !!fall} onClick={() => responder(k)} />;
        })}
        {st.ultima ? (() => { const retro = t.opciones.find(([k]) => k === st.ultima)[2]; return st.ultima === t.correcta
          ? <CajaTitulada titulo="¡Correcto!" color={E.COLOR_EXITO} fondo={E.COLOR_EXITO_SUAVE} forma="ok" flash><p className="txt m" style={{ margin: 0 }}>{retro}</p></CajaTitulada>
          : <CajaTitulada titulo="Todavía no" color={E.COLOR_ADVERTENCIA} fondo={E.COLOR_ADVERTENCIA_SUAVE} forma="aviso"><p className="txt m">{retro}</p><p className="txt sm" style={{ color: "var(--texto2)", margin: 0 }}>Prueba con otra opción.</p></CajaTitulada>; })() : null}
      </>) : null}
      {t.tipo === "resumen" ? (<>
        {t.puntos.map((p, i) => <div className="resumen-l" key={i}><IconoEstado forma="ok" color={E.COLOR_EXITO} tam={20} /><span>{p}</span></div>)}
        {t.formula ? <div className="caja-t" style={{ background: E.COLOR_ACENTO_SUAVE, borderColor: E.COLOR_ACENTO, textAlign: "center", fontSize: 18, fontWeight: 700, color: E.COLOR_ACENTO, padding: 12 }}>{t.formula}</div> : null}
      </>) : null}
      {(t.tipo === "explora" || t.tipo === "reto") ? (<>
        {t.tabla ? <Tabla /> : null}
        {!st.hecha ? (<>
          {t.progreso ? <div className="resumen-l" style={{ color: "var(--texto2)", fontWeight: 700 }}><IconoEstado forma="neutro" color={E.COLOR_TEXTO_SECUNDARIO} tam={16} /><span>{(() => { try { return t.progreso(ctxAhora); } catch { return ""; } })()}</span></div> : null}
          {t.tipo === "reto" && t.pistas ? (
            <CajaTitulada titulo="¿Te atascaste?" color={E.COLOR_ACENTO} fondo={E.COLOR_FONDO}>
              {t.pistas.slice(0, st.pistas || 0).map((p, i) => <p key={i} className="txt sm">Pista {i + 1}:  {p}</p>)}
              {(st.pistas || 0) > 0 && soluciones(t).length ? <p className="txt sm" style={{ color: "var(--elec-oscuro)", fontWeight: 700, fontSize: 10 }}>◆ {["", "Mira el tablero y los controles: se ilumina lo que tienes que mover.", "Los valores iluminados van en la dirección correcta.", "El valor exacto está marcado en amarillo."][Math.min(st.pistas, 3)]}</p> : null}
              {(st.pistas || 0) < t.pistas.length ? <button className="btn med" onClick={() => { st.pistas = (st.pistas || 0) + 1; guiaReto(); bump(); }}>{!st.pistas ? "Ver una pista" : `Otra pista (${st.pistas + 1} de ${t.pistas.length})`}</button> : null}
            </CajaTitulada>) : null}
        </>) : (() => { const nuevo = st.recien; st.recien = false; return (
          <CajaTitulada titulo={t.tipo === "explora" ? "Lo que descubriste" : "¡Reto logrado!"} color={E.COLOR_EXITO} fondo={E.COLOR_EXITO_SUAVE} forma="ok" flash={nuevo}>
            <p className="txt m" style={{ margin: 0 }}>{st.texto}</p></CajaTitulada>); })()}
      </>) : null}
    </>);
  };

  const ok = hecha(); const ultima = s.i === tarjetas.length - 1;
  const textoSeguir = ok ? (ultima ? "TERMINAR LA LECCIÓN" : "CONTINUAR") : ({ explora: "Haz la actividad para seguir", reto: "Logra el reto para seguir", pregunta: "Responde para seguir" }[t.tipo] || "CONTINUAR");
  const nHechas = tarjetas.reduce((n, _, k) => n + (hecha(k) && k < s.i ? 1 : 0), 0) + (ok ? 1 : 0);
  const pulsar = !s.terminada && (t.tipo === "explora" || t.tipo === "reto") && !st.hecha;

  return (
    <div className="vista-lec">
      <div className="cab" style={{ alignItems: "center" }}>
        <button className="btn contorno med" onClick={onVolver}>← Lecciones</button>
        <div className="titulos"><div className="sub" style={{ letterSpacing: ".3px", fontWeight: 700 }}>{etiqueta.toUpperCase()}</div><h2 style={{ fontSize: 22 }}>{lec.titulo}</h2></div>
        {bloquesTeoria ? <button className="btn contorno med" onClick={() => { s.leyendo = !s.leyendo; bump(); }}>{s.leyendo ? "Volver al circuito" : "Leer la teoría completa"}</button> : null}
        <button className="btn discreto med" onClick={onReiniciar}>Empezar de nuevo</button>
        <BarraPasos total={tarjetas.length} actual={s.i} hechas={s.terminada ? tarjetas.length : nHechas} texto={s.terminada ? "LECCIÓN COMPLETADA" : `TARJETA ${s.i + 1} DE ${tarjetas.length}`} />
      </div>
      <div className="cuerpo-lec">
        <div className="col-izq">
          <div className="caja-opc tarjeta">
            {multiSel.length > 1 ? (<>
              <span className="tit">{multiSel.length} piezas</span>
              {(() => { const nombres = nombresComponentes(L.current.componentes); return multiSel.map((tg) => <span key={tg} className="sel-dato"><b>{nombres[tg] || tg}</b>{datoPieza(tg)}</span>); })()}
            </>) : compSel ? (<>
              <IconoCanvas tipo={compSel.tipo} w={64} h={36} valor={compSel.valor} cerrado={compSel.cerrado} />
              <span className="tit">{compSel.tipo === "bateria" ? "Batería" : compSel.tipo === "interruptor" ? "Interruptor" : compSel.tipo === "bombillo" ? "Bombillo" : "Resistencia"}</span>
              {ctrlSel ? opcionesControl(ctrlSel).map(([v, tx]) => {
                const actual = valorControl(ctrlSel); const on = typeof v === "number" ? Math.abs(actual - v) < 1e-9 : actual === v;
                return <button key={String(v)} className={`btn opt ${on ? "on" : ""}`} onClick={() => aplicar(ctrlSel, v)}>{tx}</button>; })
                : <span style={{ color: "var(--texto2)" }}>En esta lección esta pieza no se cambia.</span>}
            </>) : <span style={{ color: "var(--texto2)" }}>Toca una pieza para ver sus opciones, o arrastra un recuadro para comparar varias.</span>}
          </div>
          <LienzoVista opciones={{ editable: false, modoEducativo: true }} onListo={alListo} onCambio={alCambiar} onSeleccion={(tg) => { s.sel = tg; bump(); }}>
            {lec.porDentro ? <PorDentro tipo={lec.porDentro} datos={datosPorDentro()} /> : null}
          </LienzoVista>
          <div className={`controles-lec tarjeta ${pulsar ? "pulso" : ""}`} key={pulsar ? `p${s.i}` : "q"}>
            <div className="fila-ctrl">{lec.controles.map(grupoControl)}
              {hayDanos ? <button className="btn sm prim" onClick={() => L.current.repararTodo()}>Reemplazar lo dañado</button> : null}</div>
            <div className="sep" />
            <div className="medidores">{(lec.medidor || ["V", "I", "R"]).map((k) => <Medidor key={k} clave={k} med={s.med} resaltar={!s.terminada && t.resaltar === k} />)}</div>
            <div className="formula-viva"><em>EN VIVO</em><span>{(() => { try { return s.med ? lec.formula(s.med) : ""; } catch { return ""; } })()}</span></div>
          </div>
          {s.leyendo && bloquesTeoria ? <Teoria lec={lec} bloques={bloquesTeoria} onVolver={() => { s.leyendo = false; bump(); }} /> : null}
        </div>
        <div className="col-der tarjeta">
          <div className="scroll" key={`${s.i}-${s.terminada}`}>{cuerpoTarjeta()}</div>
          <div className="nav">
            <button className="btn" disabled={!(s.i > 0 || s.terminada)} onClick={atras}>Atrás</button>
            {!s.terminada ? <button className={`btn sig ${ok ? (ultima ? "exito" : "prim") : "apagado"}`} disabled={!ok} onClick={seguir}>{textoSeguir}</button> : null}
          </div>
        </div>
      </div>
    </div>
  );
}
