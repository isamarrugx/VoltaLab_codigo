import { useState } from "react";
import Indice from "./Indice.jsx";
import RetoVista from "./RetoVista.jsx";
import { Estrellas } from "../componentes/piezas.jsx";
import { RETOS, NIVELES } from "../datos/retos.js";
import { LECCIONES } from "../datos/lecciones.js";
import { anotar } from "../lib/evidencias.js";
import { sugerenciaReto } from "../lib/progresion.js";
import * as E from "../lib/estilos.js";

const COL = { 1: ["exito", "Guiado"], 2: ["", "Con apoyo"], 3: ["adv", "Reto"] };

export default function Laboratorio({ ir, progreso, setProgreso, clave }) {
  const [abierto, setAbierto] = useState(clave || null);
  const [reinicio, setReinicio] = useState(0);
  const abrir = (c) => { anotar(setProgreso, c, (e) => ({ ...e, intentos: e.intentos + 1 })); setAbierto(c); setReinicio((k) => k + 1); window.scrollTo(0, 0); };
  if (abierto) {
    const i = RETOS.findIndex((r) => r.clave === abierto);
    const reto_ = (k) => RETOS[k].clave;
    return (
      <RetoVista key={`${abierto}-${reinicio}`} reto={RETOS[i]} etiqueta={`Reto ${i + 1} de ${RETOS.length}`} haySiguiente={i + 1 < RETOS.length}
        habilidades={progreso.habilidades}
        onVolver={() => setAbierto(null)}
        onPista={() => anotar(setProgreso, reto_(i), (e) => ({ ...e, pistas: e.pistas + 1 }))}
        onCompletar={(c, est) => { setProgreso((p) => ({ ...p, laboratorio: new Set([...p.laboratorio, c]), estrellas: { ...p.estrellas, [c]: Math.max(est, p.estrellas[c] || 0) } })); anotar(setProgreso, c, (e) => ({ ...e, fecha: e.fecha || new Date().toISOString() })); }}
        onSiguiente={() => abrir(RETOS[i + 1].clave)} onReiniciar={() => abrir(abierto)} />
    );
  }
  const agrupar = (todas, rejilla) => Object.entries(NIVELES).map(([nv, [nombre, desc]]) => {
    const grupo = todas.filter(([, a]) => a.nivel === +nv);
    if (!grupo.length) return null;
    const [cls] = COL[nv];
    return (
      <div key={nv}>
        <div className="nivel-cab"><span className={`chip ${cls}`}>NIVEL {nv}</span><h2>{nombre}</h2></div>
        {rejilla(grupo)}
      </div>
    );
  });
  return (
    <Indice kicker="RETOS DE CONSTRUCCIÓN" titulo="Laboratorio" subtitulo=""
      ir={ir} atras={["Ruta", "← Mi ruta"]} actividades={RETOS} completadas={progreso.laboratorio} bloqueo={() => null} docente={progreso.docente}
      onDocente={(v) => setProgreso((p) => ({ ...p, docente: v }))}
      pieDe={(a, hecha) => {
        const sug = hecha ? null : sugerenciaReto(a, LECCIONES, progreso.aprender);
        return <>{sug ? <span style={{ maxWidth: 170 }}>{sug}</span> : null}{hecha ? <Estrellas n={progreso.estrellas[a.clave] || 0} t={18} /> : null}</>;
      }}
      agrupar={agrupar} onAbrir={abrir} />
  );
}
