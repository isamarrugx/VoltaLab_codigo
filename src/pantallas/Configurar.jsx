import { useEffect, useReducer, useRef, useState } from "react";
import LienzoVista from "../componentes/LienzoVista.jsx";
import { IconoCanvas, IconoEstado } from "../componentes/Iconos.jsx";
import { GraficaVivo } from "../componentes/Graficas.jsx";
import { Switch, TarjetaValor, SeccionesExplicacion, Ecuaciones } from "../componentes/ui.jsx";
import { COLORES_CABLE, explicarBandas } from "../lib/cv.js";
import * as E from "../lib/estilos.js";
import * as F from "../lib/formato.js";
import { animar, establecerMovimientoReducido, movimientoReducido, suavizarEntradaSalida } from "../lib/animaciones.js";
import { diagnosticar } from "../lib/diagnostico.js";
import { analizar, componentesDesdeDefinicion, ecuacionesUsadas, errorAmigable, explicarCircuito, nombresComponentes, porQue } from "../lib/explicador.js";
import { resolverCircuito, clasificarTopologia, ErrorCircuito, compararClaves } from "../lib/motor.js";
import { limites } from "../lib/guias.js";
import { EJEMPLOS, ORDEN_EJEMPLOS, NOMBRES_CORTOS_EJEMPLOS } from "../datos/ejemplos.js";
import BarraOpciones from "../componentes/BarraOpciones.jsx";
import Galeria from "../componentes/Galeria.jsx";
import { TECLA } from "../lienzo/Lienzo.js";

const HERRAMIENTAS = [["seleccionar", "Mover"], ["cable", "Cable"], ["resistencia", "Resistencia"], ["bombillo", "Bombillo"], ["interruptor", "Interruptor"], ["bateria", "Batería"]];
const PASOS = ["Coloca componentes", "Conéctalos con cables", "Simula"];

const estiloEstado = (estado) => ({
  vacio: ["neutro", E.COLOR_TEXTO_SECUNDARIO, E.COLOR_FONDO],
  incompleto: ["neutro", E.COLOR_TEXTO_SECUNDARIO, E.COLOR_FONDO],
  abierto: ["aviso", E.COLOR_ADVERTENCIA, E.COLOR_ADVERTENCIA_SUAVE],
  corto: ["aviso", E.COLOR_ERROR, E.COLOR_ERROR_SUAVE],
  cerrado: ["ok", E.COLOR_EXITO, E.COLOR_EXITO_SUAVE],
}[estado]);

const ETIQ_TOPO = { serie: "Circuito en serie", paralelo: "Circuito en paralelo", mixto: "Circuito mixto (serie y paralelo combinados)", compleja: "Topología compleja (no es serie ni paralelo)", unico: "Un solo componente", vacio: "" };

function TarjetaAviso({ forma, color, fondo, titulo, mensaje, pista, avisos = [] }) {
  return (
    <div className="aviso-tarjeta" style={{ background: fondo, borderColor: color }}>
      <h4><IconoEstado forma={forma} color={color} tam={20} />{titulo}</h4>
      <div>{mensaje}</div>
      {pista ? <div className="pista"><b style={{ color }}>Pista</b>{pista}</div> : null}
      {avisos.map((a, i) => <div className="av" key={i}>{a}</div>)}
    </div>
  );
}

export default function Configurar({ ir }) {
  const Lr = useRef(null);
  const [L, setL] = useState(null);
  const [, forzar] = useReducer((x) => x + 1, 0);
  const [bump, setBump] = useState(0);
  const [herr, setHerr] = useState("resistencia");
  const [ejemplos, setEjemplos] = useState(false);
  const [diag, setDiag] = useState(null);
  const [panel, setPanel] = useState({ tipo: "inicial" });
  const [res, setRes] = useState(null);
  const [ejActual, setEjActual] = useState(null);
  const [prediccion, setPrediccion] = useState(false);
  const [predTxt, setPredTxt] = useState("");
  const [predReal, setPredReal] = useState(null);
  const [simulado, setSimulado] = useState(false);
  const [explicacion, setExplicacion] = useState(false);
  const [datosGrafica, setDatosGrafica] = useState([]);
  const [reducir, setReducir] = useState(movimientoReducido());
  const [textoBoton, setTextoBoton] = useState("Simular circuito");
  const [flash, setFlash] = useState({ chip: 0, insig: 0 });
  const [prog, setProg] = useState(0);
  const r = useRef({ enVivo: false, intento: false, sec: 0, previos: {}, maximos: {}, diag: null, expl: false, graf: [], anim: null }).current;

  const actBarra = () => setBump((b) => b + 1);
  r.predOn = prediccion; r.predTxt = predTxt;

  // ---------- diagnostico ----------
  const resaltadoPermitido = () => {
    const l = Lr.current; const tipos = Object.values(l.componentes).map((c) => c.tipo);
    const armado = tipos.includes("bateria") && tipos.some((t) => t === "resistencia" || t === "bombillo") && Object.keys(l.cables).length > 0;
    return armado || r.intento;
  };
  const evaluarDiagnostico = () => {
    const l = Lr.current;
    const anterior = r.diag ? r.diag.estado : null;
    const d = diagnosticar(l.componentes, l.cables);
    r.diag = d; setDiag(d);
    const [, color] = estiloEstado(d.estado);
    if ((d.estado === "abierto" || d.estado === "corto") && resaltadoPermitido()) l.resaltar(d.puntos, d.tags, color);
    else if (d.estado === "cerrado" && d.tags.length) l.resaltar([], d.tags, E.COLOR_ADVERTENCIA);
    else l.limpiarResaltado();
    if (d.estado === "cerrado" && (anterior === "abierto" || anterior === "corto")) {
      l.iluminar(null, E.COLOR_EXITO, 0.6);
      setFlash((f) => ({ ...f, chip: f.chip + 1 }));
    }
    return d;
  };

  const mostrarDiagnostico = (d) => {
    const [forma, color, fondo] = estiloEstado(d.estado);
    const mensaje = d.estado === "cerrado" ? "La corriente tiene un camino completo. Presiona Simular circuito para ver qué ocurre." : d.mensaje;
    setPanel({ tipo: "aviso", forma, color, fondo, titulo: d.titulo, mensaje, pista: d.pista, avisos: d.avisos });
    setRes(null);
  };
  const mostrarMensajeInicial = () => { setPanel({ tipo: "inicial" }); setRes(null); };
  const mostrarErrorMotor = (texto) => {
    Lr.current.limpiarResultados();
    const [titulo, mensaje, pista] = errorAmigable(texto);
    setPanel({ tipo: "aviso", forma: "aviso", color: E.COLOR_ERROR, fondo: E.COLOR_ERROR_SUAVE, titulo, mensaje, pista, avisos: [] });
    setRes(null);
  };

  // ---------- simulacion ----------
  const cancelarSecuencia = () => { r.sec += 1; setTextoBoton("Simular circuito"); if (r.anim) { r.anim.cancelar(); r.anim = null; } };
  const resolver = () => {
    const { cables, resistencias, bateria, tagsR } = Lr.current.exportarParaMotor();
    if (!bateria) return [null, "Falta colocar la fuente de voltaje (batería)."];
    try {
      const resultado = resolverCircuito(cables, resistencias, bateria);
      return [{ resultado, clasificacion: clasificarTopologia(cables, resistencias, bateria), voltaje: bateria[2], tagsR }, null];
    } catch (e) { if (e instanceof ErrorCircuito) return [null, e.message]; throw e; }
  };
  const agregarGrafica = (v, i, p) => { r.graf = [...r.graf, { voltaje: v, corriente: i, potencia: p }].slice(-30); setDatosGrafica(r.graf); };
  const aplicarResultado = (resultado, clasificacion, voltaje) => {
    const l = Lr.current;
    setSimulado(true); r.enVivo = true;
    if (r.predOn && r.predTxt.trim() !== "") setPredReal((x) => (x === null ? resultado.corrienteTotal : x));
    agregarGrafica(voltaje, resultado.corrienteTotal, resultado.potenciaTotal);
    const { med } = analizar(l.componentes, l.cables);
    const valores = { voltaje, corriente: resultado.corrienteTotal, req: resultado.resistenciaEquivalente, potencia: resultado.potenciaTotal };
    const detalles = med && !med.abierto ? porQue(med) : {
      voltaje: ["El empuje que da la batería al circuito.", ""],
      corriente: ["", `I = V / Req = ${F.gg(voltaje)} V / ${F.ohmios(valores.req)}`],
      req: ["Un solo componente que haría lo mismo que todo el circuito.", ""],
      potencia: ["", `P = V × I = ${F.gg(voltaje)} V × ${F.amperios(valores.corriente)}`],
    };
    const props = {};
    for (const [k, v] of Object.entries(valores)) { r.maximos[k] = Math.max(r.maximos[k] || 0, v); props[k] = r.maximos[k] > 0 ? v / r.maximos[k] : 0; }
    const avisos = r.diag ? [...r.diag.avisos] : [];
    if (resultado.desconectadas.length) avisos.push(`${resultado.desconectadas.length} resistencia(s) no están conectadas a la fuente y no se tuvieron en cuenta.`);
    const pasos = ecuacionesUsadas(l.componentes, l.cables, med);
    const previos = { ...r.previos };
    r.previos = { ...valores };
    setRes({ resultado, clasificacion, voltaje, med, valores, previos, detalles, props, avisos, pasos,
      expl: r.expl ? explicarCircuito(l.componentes, l.cables, med) : null });
    setPanel({ tipo: "resultado" });
  };
  const simularEnVivo = () => {
    const [d, err] = resolver(); if (err) return mostrarErrorMotor(err);
    Lr.current.mostrarResultados(d.resultado, d.tagsR);
    aplicarResultado(d.resultado, d.clasificacion, d.voltaje);
  };
  const registrarSinCorriente = () => {
    const l = Lr.current; const bat = Object.values(l.componentes).find((c) => c.tipo === "bateria");
    const ult = r.graf[r.graf.length - 1];
    if (!bat || (ult && ult.corriente === 0)) return;
    agregarGrafica(bat.valor, 0, 0); r.previos = { ...r.previos, corriente: 0, potencia: 0 };
  };
  const simular = () => {
    const l = Lr.current;
    cancelarSecuencia(); r.intento = true;
    const d = evaluarDiagnostico();
    if (d.estado !== "cerrado") {
      mostrarDiagnostico(d);
      if (d.tags.length) l.iluminar(d.tags, estiloEstado(d.estado)[1]);
      for (const p of d.puntos) l.ping(l.pixel(p), E.COLOR_ADVERTENCIA);
      return;
    }
    const [dat, err] = resolver(); if (err) return mostrarErrorMotor(err);
    const pulso = () => setFlash((f) => ({ ...f, insig: f.insig + 1 }));
    if (movimientoReducido()) { l.mostrarResultados(dat.resultado, dat.tagsR); aplicarResultado(dat.resultado, dat.clasificacion, dat.voltaje); pulso(); return; }
    const token = r.sec;
    setTextoBoton("Analizando circuito…"); setPanel({ tipo: "analizando" }); setRes(null); setProg(0);
    r.anim = animar(720, setProg, null, suavizarEntradaSalida);
    l.iluminar();
    setTimeout(() => { if (token === r.sec) l.mostrarResultados(dat.resultado, dat.tagsR); }, 280);
    setTimeout(() => { if (token === r.sec) { setTextoBoton("Simular circuito"); aplicarResultado(dat.resultado, dat.clasificacion, dat.voltaje); pulso(); } }, 780);
  };

  const alCambiarCircuito = () => {
    const l = Lr.current; if (!l) return;
    if (r.expl) l.mostrarNombres(nombresComponentes(l.componentes));
    setSimulado(false); cancelarSecuencia(); actBarra(); forzar();
    const d = evaluarDiagnostico();
    if (r.enVivo) {
      if (d.estado === "cerrado") simularEnVivo();
      else { registrarSinCorriente(); mostrarDiagnostico(d); }
    } else if (d.estado === "cerrado") mostrarDiagnostico(d);
    else if ((d.estado === "abierto" || d.estado === "corto") && resaltadoPermitido()) mostrarDiagnostico(d);
    else mostrarMensajeInicial();
  };

  const cambiarHerramienta = (n) => { setEjemplos(false); Lr.current.activarHerramienta(n); setHerr(n); actBarra(); };
  const reiniciarSesion = () => {
    r.enVivo = false; r.intento = false; cancelarSecuencia(); r.previos = {}; r.maximos = {}; r.graf = []; setDatosGrafica([]);
    r.expl = false; setExplicacion(false); Lr.current.mostrarNombres({}); setPredReal(null); setPredTxt("");
  };
  const cargarEjemplo = (k) => {
    reiniciarSesion(); const l = Lr.current; l.cargarEjemplo(EJEMPLOS[k]); setEjActual(k); setEjemplos(false);
    const { componentes, cables } = componentesDesdeDefinicion(EJEMPLOS[k]);
    const [f0, f1, c0, c1] = limites(componentes, cables); l.encuadrar([f0 - 1, f1 + 1, c0, c1]);
    cambiarHerramienta("seleccionar");
  };
  const limpiarCircuito = () => { setEjActual(null); reiniciarSesion(); Lr.current.limpiar(); cambiarHerramienta("resistencia"); mostrarMensajeInicial(); };
  const alternarExplicacion = () => {
    const l = Lr.current;
    r.expl = !r.expl; setExplicacion(r.expl);
    l.mostrarNombres(r.expl ? nombresComponentes(l.componentes) : {});
    setRes((x) => (x ? { ...x, expl: r.expl ? explicarCircuito(l.componentes, l.cables, x.med) : null } : x));
  };
  const cambiarMovimiento = (v) => { setReducir(v); establecerMovimientoReducido(v); const l = Lr.current; if (v) l.cancelarEfectos(); l.pedir(); };

  useEffect(() => {
    if (!L) return;
    cambiarHerramienta("resistencia"); mostrarMensajeInicial(); evaluarDiagnostico(); forzar();
    // eslint-disable-next-line
  }, [L]);

  // ---------- pasos ----------
  const l = Lr.current;
  const tipos = l ? Object.values(l.componentes).map((c) => c.tipo) : [];
  const hechos = [tipos.includes("bateria") && tipos.some((t) => t === "resistencia" || t === "bombillo"), l ? Object.keys(l.cables).length > 0 : false, simulado];
  const actual = hechos.findIndex((h) => !h);
  const listo = diag && diag.estado === "cerrado";
  const mostrarTarjeta = (panel.tipo === "resultado" || panel.tipo === "analizando") && diag && diag.estado !== "cerrado";
  const [formaE, colorE, fondoE] = diag ? estiloEstado(diag.estado) : ["neutro", E.COLOR_TEXTO_SECUNDARIO, E.COLOR_FONDO];

  return (
    <div className="pantalla conf">
      <div className="cab">
        <button className="btn" style={{ marginTop: 4 }} onClick={() => ir("Inicio")}>Inicio</button>
        <div className="titulos"><h1>Simulador libre</h1></div>
        <div className="pasos">
          {PASOS.map((t, i) => (
            <span key={t} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              <span className={`paso ${hechos[i] ? "hecho" : i === actual ? "actual" : ""}`}><b>{hechos[i] ? "✓" : i + 1}</b>{t}</span>
              {i < PASOS.length - 1 ? <span style={{ color: "var(--texto2)" }}>→</span> : null}
            </span>))}
        </div>
      </div>
      {ejemplos ? <Galeria actual={ejActual} onElegir={cargarEjemplo} onCerrar={() => setEjemplos(false)} /> : <BarraOpciones L={L} herr={herr} bump={bump} accion={() => { actBarra(); forzar(); }} />}
      <div className="cuerpo-conf">
        <div className="paleta tarjeta">
          <div className="titulo">COMPONENTES</div>
          <div className="rejilla-tiles">
            {HERRAMIENTAS.map(([n, et]) => (
              <div key={n} className={`tile ${herr === n && !ejemplos ? "activo" : herr === n ? "activo" : ""}`} onClick={() => cambiarHerramienta(n)} role="button" tabIndex={0}>
                <IconoCanvas tipo={n} w={70} h={42} />{et}
              </div>))}
          </div>
          <hr />
          <button className="btn ejemplos" onClick={() => setEjemplos(true)}>Cargar ejemplo</button>
          <button className="btn err" onClick={limpiarCircuito}>Limpiar circuito</button>
          <div className="fin">
            <div style={{ padding: "0 14px 6px" }}><Switch on={prediccion} onChange={(v) => { setPrediccion(v); setPredReal(null); setPredTxt(""); }}>Modo predicción</Switch></div>
            <div style={{ padding: "0 14px 6px" }}><Switch on={reducir} onChange={cambiarMovimiento}>Reducir movimiento</Switch></div>
            <div className="atajos" title="Shift: seguir colocando la misma pieza">{TECLA}+Z deshacer · {TECLA}+C/V copiar y pegar · R girar · Supr borrar</div>
          </div>
        </div>
        <LienzoVista opciones={{ animacionSuave: true }} onListo={(x) => { Lr.current = x; setL(x); }} onCambio={alCambiarCircuito}
          onSeleccion={(t) => { if (t != null) setEjemplos(false); actBarra(); forzar(); }} onHerramienta={(h) => { setHerr(h); actBarra(); }} />
        <div className="resultados tarjeta scroll">
          <div className="interno">
            <button className={`btn grande completo ${listo ? "prim" : "crema"}`} style={listo ? null : { color: "var(--acento)" }} onClick={simular}>{textoBoton}</button>
            {mostrarTarjeta ? null : (
              <div key={flash.chip} className={`chip-estado ${flash.chip ? "flash" : ""}`} style={{ background: fondoE, color: colorE }}>
                <IconoEstado forma={formaE} color={colorE} />{diag ? diag.titulo : ""}
              </div>)}
            {ejActual && EJEMPLOS[ejActual] ? (
              <details className="guia-clase">
                <summary>Guía para la clase<span>{EJEMPLOS[ejActual].concepto}</span></summary>
                <ul>{EJEMPLOS[ejActual].observa.map((t, i) => <li key={i}>{t}</li>)}</ul>
                <div className="gc-preg"><span>Pregunta</span>{EJEMPLOS[ejActual].pregunta}</div>
              </details>) : null}
            {prediccion ? (() => {
              const n = parseFloat(predTxt.replace(",", "."));
              if (predReal === null) return (
                <div className="pred">
                  <b>¿Cuánta corriente entregará la batería?</b>
                  <div className="pred-in"><input value={predTxt} onChange={(e) => setPredTxt(e.target.value)} placeholder="ej. 40" inputMode="decimal" aria-label="Predicción de corriente en mA" /><span>mA</span></div>
                </div>);
              const real = predReal * 1000, err = Number.isNaN(n) ? null : Math.abs(n - real) / real * 100;
              const [veredicto, cl] = err === null ? ["", ""] : err <= 5 ? ["Muy cerca.", "exito"] : err <= 25 ? ["Cerca. Revisa Req.", "adv"] : ["Lejos. Calcula Req y luego I = V / Req.", "err"];
              return (
                <div className={`pred res ${cl}`}>
                  <b>Predicción vs. simulador</b>
                  <div className="pred-cmp"><div><small>Predijiste</small><strong>{Number.isNaN(n) ? "—" : `${F.gg(n)} mA`}</strong></div><div><small>Real</small><strong>{F.amperios(predReal)}</strong></div>{err !== null ? <div><small>Error</small><strong>{err.toFixed(1)} %</strong></div> : null}</div>
                  <span className="pequeno">{veredicto}</span>
                  <button className="btn sm crema" style={{ marginTop: 6 }} onClick={() => { setPredReal(null); setPredTxt(""); }}>Nueva predicción</button>
                </div>);
            })() : null}
            {mostrarTarjeta ? (
              <TarjetaAviso forma={formaE} color={colorE} fondo={fondoE} titulo={diag.titulo}
                mensaje={diag.mensaje} pista={diag.pista} avisos={diag.avisos} />) : null}
            {panel.tipo === "aviso" ? <TarjetaAviso {...panel} /> : null}
            {panel.tipo === "analizando" ? (
              <div className="analizando"><b>Analizando circuito…</b>
                <div className="progreso"><div style={{ width: `${prog * 100}%`, background: "var(--acento)" }} /></div></div>) : null}
            {panel.tipo === "resultado" && res ? (
              <>
                <div className="cab-res"><span>Resultados</span><span key={flash.insig} className={`chip exito ${flash.insig ? "flash" : ""}`} style={{ fontSize: 10 }}>Circuito resuelto</span></div>
                {[["voltaje", "VOLTAJE DE LA FUENTE", E.COLOR_VOLTAJE, F.voltios], ["corriente", "CORRIENTE TOTAL", E.COLOR_CORRIENTE, F.amperios], ["req", "RESISTENCIA EQUIVALENTE", E.COLOR_CIAN, F.ohmios], ["potencia", "POTENCIA TOTAL", E.COLOR_POTENCIA, F.vatios]].map(([k, t, c, f]) => (
                  <TarjetaValor key={k} titulo={t} color={c} formateador={f} valor={res.valores[k]} previo={res.previos[k]} detalle={res.detalles[k][0]} formula={res.detalles[k][1]} proporcion={res.props[k]} />))}
                {res.avisos.length ? <div className="pequeno" style={{ color: "var(--adv)", margin: "4px 2px 6px" }}>Aviso: {res.avisos.join(" ")}</div> : null}
                <button className="btn med contorno completo" style={{ marginTop: 8 }} onClick={alternarExplicacion}>{explicacion ? "Ocultar la explicación" : "Explicar mi circuito"}</button>
              </>) : null}
          </div>
          <div className="sec-grafica">
            <div className="cab-g"><b style={{ fontSize: 13 }}>Gráfica en tiempo real</b>
              <button className="btn sm discreto" style={{ color: "var(--acento)" }} onClick={() => { r.graf = []; setDatosGrafica([]); if (simulado && r.previos.voltaje != null) agregarGrafica(r.previos.voltaje, r.previos.corriente, r.previos.potencia); }}>Reiniciar</button></div>
                        <GraficaVivo datos={datosGrafica} formateadores={{ voltaje: F.voltios, corriente: F.amperios, potencia: F.vatios }} />
          </div>
          {panel.tipo === "resultado" && res ? (
            <div className="detalle">
              {explicacion && res.expl ? (
                <div className="caja-expl"><b>Explicación de tu circuito</b><SeccionesExplicacion secciones={res.expl} /></div>) : null}
              <hr style={{ border: 0, borderTop: "1px solid var(--borde)", margin: "4px 0 10px" }} />
              {ETIQ_TOPO[res.clasificacion.tipo] ? <div className="insig"><b>{ETIQ_TOPO[res.clasificacion.tipo]}</b><span>{res.clasificacion.descripcion}</span></div> : null}
              <div style={{ fontWeight: 700, fontSize: 13 }}>Ecuaciones usadas</div>
              {res.pasos.length ? <Ecuaciones pasos={res.pasos} /> : null}
              <div style={{ fontWeight: 700, fontSize: 12, margin: "12px 0 2px" }}>Voltaje en cada nodo</div>
              <div className="nodos">
                {[...res.resultado.voltajesNodo.keys()].sort(compararClaves).map((n, i) => (
                  <div className="fila" key={n}><span>Nodo {i + 1}</span><span>{res.resultado.voltajesNodo.get(n).toFixed(2)} V</span></div>))}
              </div>
            </div>) : null}
        </div>
      </div>
    </div>
  );
}
