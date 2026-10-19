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
import { Termico, limite, limitarResultado, explicarFalla, explicarProteccion, estado as estadoPieza } from "../lib/fallas.js";
import { RETO_SERIE } from "../datos/retosFalla.js";

const HERRAMIENTAS = [["seleccionar", "Mover"], ["cable", "Cable"], ["resistencia", "Resistencia"], ["bombillo", "Bombillo"], ["interruptor", "Interruptor"], ["bateria", "Batería"], ["fusible", "Fusible"]];
const PASOS = ["Coloca componentes", "Conéctalos con cables", "Simula"];

const estiloEstado = (estado) => ({
  vacio: ["neutro", E.COLOR_TEXTO_SECUNDARIO, E.COLOR_FONDO],
  incompleto: ["neutro", E.COLOR_TEXTO_SECUNDARIO, E.COLOR_FONDO],
  abierto: ["aviso", E.COLOR_ADVERTENCIA, E.COLOR_ADVERTENCIA_SUAVE],
  corto: ["aviso", E.COLOR_ERROR, E.COLOR_ERROR_SUAVE],
  cerrado: ["ok", E.COLOR_EXITO, E.COLOR_EXITO_SUAVE],
}[estado]);

const ETIQ_TOPO = { serie: "Circuito en serie", paralelo: "Circuito en paralelo", mixto: "Circuito mixto (serie y paralelo combinados)", compleja: "Topología compleja (no es serie ni paralelo)", unico: "Un solo componente", vacio: "" };

// Falla o protección: explicación corta primero; el detalle, a un clic.
function TarjetaFalla({ titulo, corto, detalle, limite, children }) {
  return (
    <div className={`falla-tarjeta ${limite ? "limite" : ""}`} role="status">
      <h4><IconoEstado forma="aviso" color={limite ? E.COLOR_ADVERTENCIA : E.COLOR_ERROR} tam={20} />{titulo}</h4>
      <p>{corto}</p>
      <details><summary>Ver por qué</summary>{detalle}</details>
      {children ? <div className="acc">{children}</div> : null}
    </div>
  );
}

// Reto breve: predecir, encender y comparar con lo que calcula el motor.
function RetoFalla({ reto, def, onElegir, onOtraVez, onCerrar }) {
  if (reto.fase === "pregunta") return (
    <div className="reto-falla">
      <div className="kick">PREDICE Y COMPRUEBA</div>
      <h4>{def.titulo}</h4>
      <p>{def.intro}</p>
      <p><b style={{ color: "var(--texto)" }}>{def.pregunta}</b></p>
      <div className="opciones-p">{def.opciones.map(([k, t]) => <button key={k} className="btn" onClick={() => onElegir(k)}>{t}</button>)}</div>
    </div>);
  if (reto.fase === "corriendo") return (
    <div className="reto-falla"><div className="kick">PREDICE Y COMPRUEBA</div><h4>Cerrando el interruptor…</h4><p>Observa los dos bombillos.</p></div>);
  const ok = reto.eleccion === def.correcta;
  return (
    <div className="reto-falla">
      <div className="kick">{reto.fase === "logrado" ? "RETO SUPERADO" : "RESULTADO"}</div>
      {reto.fase === "logrado" ? (
        <><h4>¡Circuito reparado!</h4><p>Los dos bombillos encienden y ninguno pasa de su potencia máxima.</p></>
      ) : (
        <>
          <div className={`veredicto ${ok ? "ok" : "no"}`}>{ok ? "Acertaste." : `Predijiste: «${def.opciones.find(([k]) => k === reto.eleccion)[1]}». No fue así.`}</div>
          <p style={{ color: "var(--texto)" }}>{def.explicacion}</p>
          <details><summary>Ver los cálculos</summary>{def.detalle}</details>
          <p>{def.reparar}</p>
        </>)}
      <div className="acc">
        <button className="btn sm" onClick={onOtraVez}>Probar otra vez</button>
        <button className="btn sm discreto" onClick={onCerrar}>Cerrar el reto</button>
      </div>
    </div>);
}

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
  const [fallas, setFallas] = useState(true);
  const [falla, setFalla] = useState(null);       // última pieza dañada, con su explicación
  const [fuenteInfo, setFuenteInfo] = useState(null); // la batería limitando su corriente
  const [reto, setReto] = useState(null);         // reto de predicción en curso
  const r = useRef({ enVivo: false, intento: false, sec: 0, previos: {}, maximos: {}, diag: null, expl: false, graf: [], anim: null, termico: new Termico() }).current;

  const actBarra = () => setBump((b) => b + 1);
  r.predOn = prediccion; r.predTxt = predTxt; r.fallas = fallas; r.reto = reto; r.falla = falla;

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
    if (d.estado === "corto" && r.fallas) {
      // con fallas reales el cortocircuito sí se simula: la batería entra en protección
      const bat = Object.values(Lr.current.componentes).find((c) => c.tipo === "bateria");
      const t = explicarProteccion({ corto: true, imax: limite(bat) });
      setPanel({ tipo: "proteccion", ...t }); setRes(null);
      return;
    }
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
      let resultado = resolverCircuito(cables, resistencias, bateria), k = 1;
      if (r.fallas) {
        // la batería no entrega más que su corriente máxima: si hace falta, baja su voltaje
        const bat = Object.values(Lr.current.componentes).find((c) => c.tipo === "bateria");
        ({ resultado, k } = limitarResultado(resultado, limite(bat)));
      }
      return [{ resultado, clasificacion: clasificarTopologia(cables, resistencias, bateria), voltaje: bateria[2] * k, k, tagsR }, null];
    } catch (e) { if (e instanceof ErrorCircuito) return [null, e.message]; throw e; }
  };
  const agregarGrafica = (v, i, p) => { r.graf = [...r.graf, { voltaje: v, corriente: i, potencia: p }].slice(-30); setDatosGrafica(r.graf); };
  const aplicarResultado = (resultado, clasificacion, voltaje, k = 1) => {
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
    if (k < 1) {
      const f = F.amperios(resultado.corrienteTotal);
      detalles.voltaje = [`La batería bajó su voltaje a ${F.voltios(voltaje)} para no entregar más de ${f}, su corriente máxima.`, `V = I máx × Req = ${f} × ${F.ohmios(valores.req)}`];
      detalles.corriente = [`La corriente quedó en ${f}: es el máximo que entrega esta batería.`, `I = I máx = ${f}`];
      detalles.potencia = [`Con el voltaje reducido, la batería entrega ${F.vatios(valores.potencia)}.`, `P = V × I = ${F.voltios(voltaje)} × ${f} = ${F.vatios(valores.potencia)}`];
    }
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
    aplicarResultado(d.resultado, d.clasificacion, d.voltaje, d.k);
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
    if (d.estado === "corto" && r.fallas) { r.enVivo = true; setSimulado(true); mostrarDiagnostico(d); return; }
    if (d.estado !== "cerrado") {
      mostrarDiagnostico(d);
      if (d.tags.length) l.iluminar(d.tags, estiloEstado(d.estado)[1]);
      for (const p of d.puntos) l.ping(l.pixel(p), E.COLOR_ADVERTENCIA);
      return;
    }
    const [dat, err] = resolver(); if (err) return mostrarErrorMotor(err);
    const pulso = () => setFlash((f) => ({ ...f, insig: f.insig + 1 }));
    if (movimientoReducido()) { l.mostrarResultados(dat.resultado, dat.tagsR); aplicarResultado(dat.resultado, dat.clasificacion, dat.voltaje, dat.k); pulso(); return; }
    const token = r.sec;
    setTextoBoton("Analizando circuito…"); setPanel({ tipo: "analizando" }); setRes(null); setProg(0);
    r.anim = animar(720, setProg, null, suavizarEntradaSalida);
    l.iluminar();
    setTimeout(() => { if (token === r.sec) l.mostrarResultados(dat.resultado, dat.tagsR); }, 280);
    setTimeout(() => { if (token === r.sec) { setTextoBoton("Simular circuito"); aplicarResultado(dat.resultado, dat.clasificacion, dat.voltaje, dat.k); pulso(); } }, 780);
  };

  const alCambiarCircuito = () => {
    const l = Lr.current; if (!l) return;
    // si la pieza de la tarjeta ya no está dañada (Reemplazar, deshacer…), la tarjeta sobra
    if (r.falla && !(l.componentes[r.falla.tag] && l.componentes[r.falla.tag].danado)) { r.falla = null; setFalla(null); }
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
    r.termico.reiniciar(); setFalla(null); r.falla = null; setFuenteInfo(null); setReto(null); r.reto = null;
    r.enVivo = false; r.intento = false; cancelarSecuencia(); r.previos = {}; r.maximos = {}; r.graf = []; setDatosGrafica([]);
    r.expl = false; setExplicacion(false); Lr.current.mostrarNombres({}); setPredReal(null); setPredTxt("");
  };
  const cargarEjemplo = (k) => {
    reiniciarSesion(); const l = Lr.current; l.cargarEjemplo(EJEMPLOS[k]); setEjActual(k); setEjemplos(false);
    const { componentes, cables } = componentesDesdeDefinicion(EJEMPLOS[k]);
    const [f0, f1, c0, c1] = limites(componentes, cables); l.encuadrar([f0 - 1, f1 + 1, c0, c1]);
    cambiarHerramienta("seleccionar");
  };
  // ---------- fallas ----------
  const repararTodo = () => { Lr.current.repararTodo(); setFalla(null); };
  const cambiarFallas = (v) => {
    setFallas(v); r.fallas = v; const l = Lr.current;
    l.fallasActivas = v; r.termico.reiniciar(); l.fijarTermico({}, null); setFuenteInfo(null);
    if (r.enVivo) alCambiarCircuito(); else actBarra();
  };
  const cargarReto = () => {
    const l = Lr.current;
    if (!r.fallas) cambiarFallas(true);
    reiniciarSesion(); setEjActual(null); setEjemplos(false);
    l.cargarPiezas(RETO_SERIE.componentes, RETO_SERIE.cables);
    const [f0, f1, c0, c1] = limites(l.componentes, l.cables); l.encuadrar([f0 - 1, f1 + 1, c0, c1]);
    cambiarHerramienta("seleccionar");
    const nuevo = { fase: "pregunta" }; r.reto = nuevo; setReto(nuevo);
  };
  const elegirReto = (eleccion) => {
    const l = Lr.current, nuevo = { fase: "corriendo", eleccion, inicio: performance.now() };
    r.reto = nuevo; setReto(nuevo);
    const sw = Object.keys(l.componentes).find((t) => l.componentes[t].tipo === "interruptor");
    l.establecerInterruptor(sw, true);
    simular();
  };
  const pasarReto = (fase) => { const nuevo = { ...r.reto, fase, estable: 0 }; r.reto = nuevo; setReto(nuevo); };

  // Bucle físico: mientras el circuito está encendido, las piezas se calientan según la
  // potencia que calcula el motor; si una pasa su límite, falla y el circuito se recalcula.
  useEffect(() => {
    if (!L) return undefined;
    L.fallasActivas = r.fallas;
    let ult = performance.now(), chispa = 0, firma = "";
    const id = setInterval(() => {
      const l = Lr.current; if (!l) return;
      const ahora = performance.now(), dt = Math.min(0.25, (ahora - ult) / 1000); ult = ahora;
      if (!r.fallas || !r.enVivo) {
        if (l.fuente || Object.keys(l.calor).length) { r.termico.reiniciar(); l.fijarTermico({}, null); setFuenteInfo(null); }
        return;
      }
      const { med, falla: f } = r.termico.paso(l.componentes, l.cables, dt);
      l.fijarTermico({ ...r.termico.calor }, med);
      // chispas solo donde el modelo dice que hay un cortocircuito
      if (med.corto && ahora - chispa > 420 && r.diag && r.diag.estado === "corto") {
        chispa = ahora;
        const pts = r.diag.tags.flatMap((t) => (l.cables[t] ? l.cables[t].puntos : [])).map((p) => l.pixel(p));
        l.chispas(pts.sort(() => Math.random() - 0.5).slice(0, 3));
      }
      const info = med.limitando && !med.corto ? `${med.imax}|${med.vSalida.toFixed(1)}` : null;
      setFuenteInfo((x) => ((x && x.clave) === info ? x : info ? { clave: info, ...explicarProteccion(med) } : null));
      if (f) {
        const nombre = nombresComponentes(l.componentes)[f.tag];
        l.marcarDanado(f.tag);
        const t = { tag: f.tag, ...explicarFalla(f, nombre) }; r.falla = t; setFalla(t);
        if (r.reto && r.reto.fase === "corriendo") setTimeout(() => pasarReto("resultado"), 700);
      }
      // reto: si no falla nada en 4 s, mostrar igual el resultado; reparado = ambos encendidos un rato
      if (r.reto && r.reto.fase === "corriendo" && ahora - r.reto.inicio > 4000) pasarReto("resultado");
      if (r.reto && r.reto.fase === "resultado") {
        const vivos = RETO_SERIE.vigilar.every((t) => l.componentes[t] && !l.componentes[t].danado && med.piezas[t] && med.piezas[t].P > 0.05);
        r.reto.estable = vivos ? (r.reto.estable || 0) + dt : 0;
        if (r.reto.estable > 1.5) pasarReto("logrado");
      }
      // refrescar el panel solo cuando cambia el estado que muestra
      const sel = l.seleccionado, c = sel && l.componentes[sel];
      const nueva = c ? `${estadoPieza(c, l.calor[sel] || 0)}|${med.piezas[sel] ? med.piezas[sel].P.toPrecision(3) : 0}` : "";
      if (nueva !== firma) { firma = nueva; actBarra(); }
    }, 100);
    return () => clearInterval(id);
    // eslint-disable-next-line
  }, [L]);

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
        <button className="btn contorno med" style={{ marginTop: 6 }} onClick={() => ir("Inicio")}>← Inicio</button>
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
          {l && l.hayDanados() ? <button className="btn prim" onClick={repararTodo}>Reparar todo</button> : null}
          <button className="btn" onClick={cargarReto}>Reto: ¿qué pasará?</button>
          <div className="fin">
            <div style={{ padding: "0 14px 6px" }}><Switch on={prediccion} onChange={(v) => { setPrediccion(v); setPredReal(null); setPredTxt(""); }}>Modo predicción</Switch></div>
            <div style={{ padding: "0 14px 6px" }} title="Las piezas se calientan y pueden fallar según la potencia y la corriente que calcula el motor"><Switch on={fallas} onChange={cambiarFallas}>Fallas reales</Switch></div>
            <div style={{ padding: "0 14px 6px" }}><Switch on={reducir} onChange={cambiarMovimiento}>Reducir movimiento</Switch></div>
            <div className="atajos" title="Shift: seguir colocando la misma pieza">{TECLA}+Z deshacer · {TECLA}+C/V copiar y pegar · R girar · Supr borrar</div>
          </div>
        </div>
        <LienzoVista opciones={{ animacionSuave: true }} onListo={(x) => { Lr.current = x; setL(x); }} onCambio={alCambiarCircuito}
          onSeleccion={(t) => { if (t != null) setEjemplos(false); actBarra(); forzar(); }} onHerramienta={(h) => { setHerr(h); actBarra(); }} />
        <div className="resultados tarjeta scroll">
          <div className="interno">
            <button className={`btn grande completo ${listo ? "prim" : "crema"}`} onClick={simular}>{textoBoton}</button>
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
            {reto ? <RetoFalla reto={reto} def={RETO_SERIE} onElegir={elegirReto} onOtraVez={cargarReto} onCerrar={() => { r.reto = null; setReto(null); }} /> : null}
            {falla && !reto ? (
              <TarjetaFalla titulo={falla.titulo} corto={falla.corto} detalle={falla.detalle}>
                <button className="btn sm prim" onClick={() => { Lr.current.reparar(falla.tag); }}>Reemplazar</button>
                {l && Object.values(l.componentes).filter((c) => c.danado).length > 1 ? <button className="btn sm" onClick={repararTodo}>Reparar todo</button> : null}
              </TarjetaFalla>) : null}
            {fuenteInfo && !reto ? <TarjetaFalla limite titulo={fuenteInfo.titulo} corto={fuenteInfo.corto} detalle={fuenteInfo.detalle} /> : null}
            {panel.tipo === "proteccion" ? <TarjetaFalla titulo={panel.titulo} corto={panel.corto} detalle={panel.detalle} /> : null}
            {mostrarTarjeta && !reto ? (
              <TarjetaAviso forma={formaE} color={colorE} fondo={fondoE} titulo={diag.titulo}
                mensaje={diag.mensaje} pista={diag.pista} avisos={diag.avisos} />) : null}
            {panel.tipo === "aviso" && !reto ? <TarjetaAviso {...panel} /> : null}
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
              <button className="btn sm discreto" onClick={() => { r.graf = []; setDatosGrafica([]); if (simulado && r.previos.voltaje != null) agregarGrafica(r.previos.voltaje, r.previos.corriente, r.previos.potencia); }}>Reiniciar</button></div>
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
