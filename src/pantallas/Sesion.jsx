import { useEffect, useReducer, useRef, useState } from "react";
import LienzoVista from "../componentes/LienzoVista.jsx";
import BarraOpciones from "../componentes/BarraOpciones.jsx";
import { IconoCanvas, IconoEstado } from "../componentes/Iconos.jsx";
import { Estrellas } from "../componentes/piezas.jsx";
import * as E from "../lib/estilos.js";
import { limites } from "../lib/guias.js";
import { medir, estado as estadoPieza } from "../lib/fallas.js";
import { Simulacion } from "../lib/simulacion.js";
import { NIVELES, PUNTOS } from "../datos/casos.js";
import { casosDeSesion, puntuar, puntajeMaximo, estrellas, INSIGNIAS, registrarSesion, agregarRanking, sesionesIniciales, NIVEL_MEZCLA, tituloNivel } from "../lib/sesion.js";

const NOMBRES_HERR = { seleccionar: "Mover", cable: "Cable", resistencia: "Resistencia", bombillo: "Bombillo", interruptor: "Interruptor", bateria: "Batería", fusible: "Fusible" };
const VERBO = { predecir: "Predice", reparar: "Repara", construir: "Construye" };
const texto = (x, ctx) => (typeof x === "function" ? x(ctx) : x);
const ESTABLE = 1.2; // s que la meta debe cumplirse seguida para darla por lograda

// ---------------------------------------------------------------------------
// Un caso: el tablero con física en vivo y la tarjeta que guía predecir/reparar/construir.
function Caso({ caso, numero, total, onResuelto, onSiguiente }) {
  const [, bump] = useReducer((x) => x + 1, 0);
  const L = useRef(null), sim = useRef(null);
  const s = useRef({ etapa: caso.tipo === "predecir" ? "pregunta" : "jugando", eleccion: null, real: null, previo: null, inicio: null, tAccion: 0, pistas: 0, fallas: 0, estable: 0, ganados: 0, ctx: {}, tick: 0 }).current;
  const editable = caso.tipo !== "predecir";

  const cargar = () => {
    const l = L.current;
    l.cargarPiezas(caso.componentes, caso.cables);
    const [f0, f1, c0, c1] = limites(l.componentes, l.cables);
    l.encuadrar([f0 - 1, f1 + 1, c0 - 1, c1 + 1]);
    l.limpiarResaltado();
    sim.current.apagar();
    if (editable || caso.encendidoDesdeInicio) sim.current.encender();
  };
  const alListo = (l) => {
    L.current = l;
    l.fallasActivas = !!caso.limites;
    l.permitirInterruptores = editable; // al predecir, el interruptor lo cierra el botón Probar
    l.activarHerramienta("seleccionar");
    sim.current = new Simulacion(l, { onFalla: () => { if (s.etapa === "jugando") s.fallas += 1; bump(); } });
    cargar();
    setTimeout(() => { try { l.ajustar(); } catch { /* */ } }, 60);
    bump();
  };
  const alCambiar = () => { if (sim.current) sim.current.recalcular(); s.tick += 1; bump(); };

  // ---- predecir ----
  const probar = (eleccion) => {
    const l = L.current;
    s.eleccion = eleccion;
    s.previo = sim.current.med || medir(l.componentes, l.cables);
    l.aplicar(caso.accion);
    if (!sim.current.encendida) sim.current.encender();
    s.inicio = null; s.tAccion = performance.now(); s.etapa = "probando";
    bump();
  };
  const resolverPrediccion = () => {
    const l = L.current, fin = sim.current.med;
    s.real = caso.resultado({ previo: s.previo, inicio: s.inicio || fin, fin, comp: l.componentes });
    const ok = s.real === s.eleccion;
    s.ctx = { fin }; s.ganados = onResuelto({ ok }); s.etapa = "resultado";
    l.iluminar(null, ok ? E.COLOR_EXITO : E.COLOR_ADVERTENCIA);
    bump();
  };
  // ---- reparar / construir ----
  const lograr = () => {
    s.ctx = { fin: sim.current.med }; s.ganados = onResuelto({ ok: true, pistas: s.pistas, fallas: s.fallas });
    s.etapa = "logrado"; L.current.limpiarResaltado(); L.current.iluminar(null, E.COLOR_EXITO); bump();
  };
  const saltar = () => { s.ctx = { fin: sim.current.med }; s.ganados = onResuelto({ ok: false, saltado: true, pistas: s.pistas }); s.etapa = "saltado"; bump(); };
  const pedirPista = () => {
    const p = caso.pistas[s.pistas]; if (!p) return;
    s.pistas += 1;
    if (p.puntos) L.current.resaltar(p.puntos, [], E.COLOR_ADVERTENCIA);
    bump();
  };

  // Bucle físico + comprobación de la meta (10 veces por segundo).
  useEffect(() => {
    let ult = performance.now(), firma = "";
    const id = setInterval(() => {
      const l = L.current; if (!l || !sim.current) return;
      const ahora = performance.now(), dt = Math.min(0.25, (ahora - ult) / 1000); ult = ahora;
      const r = sim.current.paso(dt);
      if (s.etapa === "probando") {
        if (!s.inicio && r) s.inicio = r.med;
        if (ahora - s.tAccion > caso.espera * 1000) resolverPrediccion();
      } else if (s.etapa === "jugando" && r) {
        const ok = caso.meta({ fin: r.med, comp: l.componentes, cables: l.cables, medir });
        const antes = s.estable;
        s.estable = ok ? s.estable + dt : 0;
        if (s.estable >= ESTABLE) lograr();
        else if ((antes > 0) !== (s.estable > 0)) bump();
      }
      // refrescar el panel de la pieza seleccionada solo si cambia lo que muestra
      const sel = l.seleccionado, c = sel && l.componentes[sel];
      const nueva = c && r ? `${estadoPieza(c, l.calor[sel] || 0)}|${r.med.piezas[sel] ? r.med.piezas[sel].P.toPrecision(3) : 0}` : "";
      if (nueva !== firma) { firma = nueva; s.tick += 1; bump(); }
    }, 100);
    return () => { clearInterval(id); if (sim.current) sim.current.apagar(); };
    // eslint-disable-next-line
  }, []);

  const l = L.current;
  const terminado = s.etapa === "resultado" || s.etapa === "logrado" || s.etapa === "saltado";
  const etiqueta = (k) => (caso.opciones.find(([x]) => x === k) || [k, k])[1];
  return (
    <div className="ses-cuerpo">
      <div className="ses-tablero">
        {editable ? (
          <div className="tarjeta barra-lab">
            <div className="fila-herr">
              {caso.herramientas.map((n) => (
                <button key={n} className={`herr ${l && l.herramienta === n ? "activa" : ""}`} onClick={() => { l.activarHerramienta(n); bump(); }}>
                  <IconoCanvas tipo={n} w={44} h={26} />{NOMBRES_HERR[n]}</button>))}
            </div>
            <div className="sep" />
            {l ? <BarraOpciones L={l} herr={l.herramienta} bump={s.tick} accion={() => { s.tick += 1; bump(); }} /> : <div className="barra-opc" />}
          </div>) : null}
        <LienzoVista opciones={{ editable, modoEducativo: true, animacionSuave: true }} onListo={alListo} onCambio={alCambiar}
          onSeleccion={() => { s.tick += 1; bump(); }} onHerramienta={() => bump()} />
      </div>

      <aside className="ses-tarjeta tarjeta" aria-live="polite">
        <div className="ses-kick"><span className={`ses-tipo ${caso.tipo}`}>{VERBO[caso.tipo]}</span>Caso {numero} de {total}</div>
        <h2>{caso.titulo}</h2>

        {caso.tipo === "predecir" && s.etapa === "pregunta" ? (
          <>
            <p>{caso.intro}</p>
            <p className="ses-pregunta">{caso.pregunta}</p>
            <div className="ses-opciones">{caso.opciones.map(([k, t]) => <button key={k} className="btn med" onClick={() => probar(k)}>{t}</button>)}</div>
            <p className="ses-nota">Elige tu predicción: el tablero la pondrá a prueba.</p>
          </>) : null}
        {s.etapa === "probando" ? (
          <>
            <p className="ses-pregunta">Predijiste: «{etiqueta(s.eleccion)}»</p>
            <div className="ses-observa"><span className="ses-pulso" />Observa el tablero…</div>
          </>) : null}

        {s.etapa === "jugando" ? (
          <>
            <p className="ses-pregunta">{caso.objetivo}</p>
            <div className={`ses-meta ${s.estable > 0 ? "casi" : ""}`}>{s.estable > 0 ? "¡Funciona! Comprobando…" : "El objetivo todavía no se cumple."}</div>
            {caso.pistas.slice(0, s.pistas).map((p, k) => <div key={k} className="ses-pista"><b>Pista {k + 1}</b>{p.texto}</div>)}
            <div className="ses-acc">
              {s.pistas < caso.pistas.length ? <button className="btn" onClick={pedirPista}>Pedir pista (−{PUNTOS.pista})</button> : null}
              <button className="btn discreto" onClick={() => { cargar(); bump(); }}>Empezar de nuevo</button>
              <button className="btn discreto" onClick={saltar}>Saltar caso</button>
            </div>
            {s.fallas ? <p className="ses-nota">Piezas dañadas en este caso: {s.fallas} (−{PUNTOS.falla} c/u)</p> : null}
          </>) : null}

        {terminado ? (
          <>
            {s.etapa === "resultado" ? (
              s.real === s.eleccion
                ? <div className="ses-veredicto ok"><IconoEstado forma="ok" color={E.COLOR_EXITO} tam={22} />¡Acertaste! <b>+{s.ganados}</b></div>
                : <div className="ses-veredicto no"><IconoEstado forma="aviso" color={E.COLOR_ADVERTENCIA} tam={22} />Pasó otra cosa: «{etiqueta(s.real)}»</div>
            ) : s.etapa === "logrado"
              ? <div className="ses-veredicto ok"><IconoEstado forma="ok" color={E.COLOR_EXITO} tam={22} />¡Resuelto! <b>+{s.ganados}</b></div>
              : <div className="ses-veredicto no"><IconoEstado forma="aviso" color={E.COLOR_ADVERTENCIA} tam={22} />Caso saltado</div>}
            <p className="ses-expl">{texto(caso.explicacion, s.ctx)}</p>
            <details className="ses-detalle"><summary>Ver por qué</summary>{caso.detalle}</details>
            <div className="ses-concepto"><span>Aprendiste</span>{caso.concepto}</div>
            <button className="btn prim grande completo" onClick={onSiguiente}>{numero < total ? "Siguiente caso →" : "Ver mis resultados →"}</button>
          </>) : null}
      </aside>
    </div>
  );
}

// ---------------------------------------------------------------------------
export default function Sesion({ ir, progreso, setProgreso }) {
  const ses = { ...sesionesIniciales(), ...(progreso.sesiones || {}) };
  const [, bump] = useReducer((x) => x + 1, 0);
  const st = useRef({ fase: "intro", nivel: Math.min(ses.nivel, NIVELES.length), casos: [], i: 0, puntos: 0, racha: 0, registro: [], final: null, nombre: progreso.nombre || "", guardado: false }).current;

  const empezar = (n) => {
    Object.assign(st, { fase: "caso", nivel: n, casos: casosDeSesion(n), i: 0, puntos: 0, racha: 0, registro: [], final: null, guardado: false });
    window.scrollTo(0, 0); bump();
  };
  const resuelto = (r) => {
    const caso = st.casos[st.i];
    const p = puntuar({ tipo: caso.tipo, ...r }, st.racha);
    st.puntos += p.puntos; st.racha = p.racha;
    st.registro.push({ clave: caso.clave, tipo: caso.tipo, titulo: caso.titulo, concepto: caso.concepto, ok: !!r.ok, pistas: r.pistas || 0, fallas: r.fallas || 0, saltado: !!r.saltado, puntos: p.puntos });
    bump();
    return p.puntos;
  };
  const siguiente = () => {
    if (st.i + 1 < st.casos.length) { st.i += 1; bump(); return; }
    const nuevo = registrarSesion(ses, { nivel: st.nivel, puntos: st.puntos, registro: st.registro });
    const { _nuevas, _record, ...guardar } = nuevo;
    st.final = { nuevas: _nuevas, record: _record && ses.jugadas > 0, desbloqueado: guardar.nivel > ses.nivel ? guardar.nivel : null, maximo: puntajeMaximo(st.casos) };
    st.fase = "final";
    setProgreso((p) => ({ ...p, sesiones: guardar }));
    window.scrollTo(0, 0); bump();
  };
  const guardarRanking = () => {
    if (!st.nombre.trim() || st.guardado) return;
    st.guardado = true;
    setProgreso((p) => ({ ...p, nombre: p.nombre || st.nombre.trim(), sesiones: { ...p.sesiones, ranking: agregarRanking(p.sesiones.ranking || [], { nombre: st.nombre.trim().slice(0, 12), puntos: st.puntos, nivel: st.nivel }) } }));
    bump();
  };

  const niveles = [...NIVELES.filter((x) => x.n <= ses.nivel).map((x) => x.n), ...(ses.mejor[NIVELES.length] ? [NIVEL_MEZCLA] : [])];
  const caso = st.casos[st.i];
  return (
    <div className="ses">
      <header className="ses-hud">
        <button className="btn contorno med" onClick={() => ir("Inicio")}>← {st.fase === "caso" ? "Salir" : "Inicio"}</button>
        <div className="ses-nivel"><small>{st.nivel === NIVEL_MEZCLA ? "MEZCLA" : `NIVEL ${st.nivel}`}</small><b>{tituloNivel(st.nivel)}</b></div>
        {st.fase === "caso" ? (
          <>
            <ol className="ses-puntos-casos" aria-label="Casos de la sesión">
              {st.casos.map((c, k) => { const r = st.registro[k]; return <li key={c.clave} className={r ? (r.ok ? "ok" : "no") : k === st.i ? "ahora" : ""} title={c.titulo} />; })}
            </ol>
            <div className="ses-marcador">
              {st.racha > 1 ? <span className="ses-racha">Racha ×{st.racha}</span> : null}
              <span className="ses-pts" key={st.puntos}><b>{st.puntos}</b> puntos</span>
            </div>
          </>) : <span style={{ flex: 1 }} />}
      </header>

      {st.fase === "intro" ? (
        <section className="ses-intro">
          <span className="ini-kicker"><span className="ini-kicker-punto" /> SESIÓN DE LABORATORIO · ~8 MIN</span>
          <h1>{tituloNivel(st.nivel)}</h1>
          <p className="ses-lead">{st.nivel === NIVEL_MEZCLA ? "Cuatro casos de todos los niveles, en orden aleatorio." : NIVELES.find((x) => x.n === st.nivel).resumen} Cuatro casos en el tablero real: el simulador decide si tienes razón.</p>
          <ol className="ses-ritmo">
            {casosDeSesion(st.nivel === NIVEL_MEZCLA ? 1 : st.nivel).map((c, k) => (
              <li key={k}><span className={`ses-tipo ${c.tipo}`}>{VERBO[c.tipo]}</span><small>{c.tipo === "predecir" ? "Elige qué pasará y compruébalo." : c.tipo === "reparar" ? "Encuentra la falla y arréglala." : "Arma el circuito que se pide."}</small></li>))}
          </ol>
          <p className="ses-reglas">Ganas puntos por acertar y por resolver sin pistas. Encadena aciertos para sumar racha. La velocidad no cuenta.</p>
          {niveles.length > 1 ? (
            <div className="ses-niveles" role="group" aria-label="Elegir nivel">
              {niveles.map((n) => <button key={n} className={`btn opt ${st.nivel === n ? "on" : ""}`} onClick={() => { st.nivel = n; bump(); }}>{n === NIVEL_MEZCLA ? "Mezcla" : `Nivel ${n}`}{ses.mejor[n] ? ` · ${ses.mejor[n]}` : ""}</button>)}
            </div>) : null}
          <div className="ini-cta">
            <button className="ini-btn prim" onClick={() => empezar(st.nivel)}>Empezar<span aria-hidden="true">→</span></button>
            {ses.mejor[st.nivel] ? <span className="ses-record">Tu récord en este nivel: <b>{ses.mejor[st.nivel]}</b></span> : null}
          </div>
        </section>) : null}

      {st.fase === "caso" && caso ? (
        <Caso key={`${st.nivel}-${st.i}-${caso.clave}`} caso={caso} numero={st.i + 1} total={st.casos.length} onResuelto={resuelto} onSiguiente={siguiente} />) : null}

      {st.fase === "final" && st.final ? (
        <section className="ses-final">
          <div className="ses-final-cab tarjeta">
            <span className="ini-kicker"><span className="ini-kicker-punto" /> SESIÓN COMPLETA</span>
            <div className="ses-total"><b>{st.puntos}</b><span>de {st.final.maximo} puntos</span></div>
            <Estrellas n={estrellas(st.puntos, st.final.maximo)} t={34} />
            <div className="ses-logros">
              {st.final.record ? <span className="chip elec">¡Nuevo récord!</span> : null}
              {st.final.desbloqueado ? <span className="chip exito">Desbloqueaste el nivel {st.final.desbloqueado}: {tituloNivel(st.final.desbloqueado)}</span> : null}
            </div>
            <div className="ini-cta" style={{ justifyContent: "center" }}>
              {st.final.desbloqueado ? <button className="ini-btn prim" onClick={() => { st.nivel = st.final.desbloqueado; st.fase = "intro"; bump(); }}>Siguiente nivel<span aria-hidden="true">→</span></button>
                : <button className="ini-btn prim" onClick={() => empezar(st.nivel === NIVELES.length ? NIVEL_MEZCLA : st.nivel)}>{st.nivel === NIVELES.length ? "Jugar la mezcla" : "Jugar otra vez"}<span aria-hidden="true">→</span></button>}
              <button className="ini-btn sec" onClick={() => empezar(st.nivel)}>Repetir este nivel</button>
            </div>
          </div>

          <div className="ses-final-cols">
            <div className="tarjeta ses-bloque">
              <h3>Lo que pasó</h3>
              <ul className="ses-recap">
                {st.registro.map((r) => (
                  <li key={r.clave} className={r.ok ? "ok" : "no"}>
                    <IconoEstado forma={r.ok ? "ok" : "aviso"} color={r.ok ? E.COLOR_EXITO : E.COLOR_ADVERTENCIA} tam={20} />
                    <div><b>{r.titulo}</b><span>{r.concepto}</span></div>
                    <em>{r.saltado ? "saltado" : `+${r.puntos}`}</em>
                  </li>))}
              </ul>
              {st.registro.some((r) => !r.ok) ? <p className="ses-nota">Los casos marcados en ámbar vuelven a aparecer en «Repetir este nivel»: es la mejor forma de fijarlos.</p> : null}
            </div>
            <div className="tarjeta ses-bloque">
              <h3>Insignias</h3>
              <ul className="ses-insignias">
                {Object.entries(INSIGNIAS).map(([k, [t, d]]) => {
                  const ganada = (progreso.sesiones && progreso.sesiones.insignias || []).includes(k), nueva = st.final.nuevas.includes(k);
                  return <li key={k} className={ganada ? "si" : ""}><span className="ses-medalla" aria-hidden="true">{ganada ? "★" : "☆"}</span><div><b>{t}{nueva ? <em> · nueva</em> : null}</b><span>{d}</span></div></li>;
                })}
              </ul>
            </div>
            <div className="tarjeta ses-bloque">
              <h3>Ranking de este equipo</h3>
              {!st.guardado ? (
                <div className="ses-ranking-form">
                  <input value={st.nombre} maxLength={12} placeholder="Tu nombre o iniciales" aria-label="Nombre para el ranking" onChange={(e) => { st.nombre = e.target.value; bump(); }} onKeyDown={(e) => e.key === "Enter" && guardarRanking()} />
                  <button className="btn" disabled={!st.nombre.trim()} onClick={guardarRanking}>Guardar</button>
                </div>) : null}
              <ol className="ses-ranking">
                {(progreso.sesiones && progreso.sesiones.ranking || []).slice(0, 5).map((f, k) => (
                  <li key={k}><span>{k + 1}</span><b>{f.nombre}</b><small>{tituloNivel(f.nivel)}</small><em>{f.puntos}</em></li>))}
                {!(progreso.sesiones && progreso.sesiones.ranking || []).length ? <li className="vacio">Aún no hay nadie. ¡Sé el primero!</li> : null}
              </ol>
            </div>
          </div>
          <div className="ses-salidas">
            <button className="btn med" onClick={() => ir("Configurar")}>Experimentar en el laboratorio libre</button>
            <button className="btn med discreto" onClick={() => ir("Ruta")}>Ver lecciones y retos</button>
          </div>
        </section>) : null}
    </div>
  );
}
