import { useState } from "react";
import Indice from "./Indice.jsx";
import LeccionVista from "./LeccionVista.jsx";
import { LECCIONES } from "../datos/lecciones.js";
import { anotar } from "../lib/evidencias.js";
import { bloqueoLeccion } from "../lib/progresion.js";

export default function Aprender({ ir, progreso, setProgreso, clave }) {
  const [abierta, setAbierta] = useState(clave || null);
  const [reinicio, setReinicio] = useState(0);
  const abrir = (clave) => { anotar(setProgreso, clave, (e) => ({ ...e, intentos: e.intentos + 1 })); setAbierta(clave); setReinicio((k) => k + 1); window.scrollTo(0, 0); };
  const bloqueo = (i) => bloqueoLeccion(i, LECCIONES, progreso.aprender, progreso.docente);

  if (abierta) {
    const i = LECCIONES.findIndex((l) => l.clave === abierta);
    if (!bloqueo(i) || progreso.aprender.has(abierta)) {
      return (
        <LeccionVista key={`${abierta}-${reinicio}`} leccion={LECCIONES[i]} etiqueta={`Lección ${i + 1} de ${LECCIONES.length}`}
          haySiguiente={i + 1 < LECCIONES.length}
          onVolver={() => setAbierta(null)}
          onCompletar={(c) => { setProgreso((p) => ({ ...p, aprender: new Set([...p.aprender, c]) })); anotar(setProgreso, c, (e) => ({ ...e, fecha: e.fecha || new Date().toISOString() })); }}
          onSiguiente={() => abrir(LECCIONES[i + 1].clave)}
          onReiniciar={() => abrir(abierta)} />
      );
    }
  }
  return (
    <Indice kicker="LECCIONES INTERACTIVAS" titulo="Aprender" subtitulo=""
      ir={ir} atras={["Ruta", "← Mi ruta"]} actividades={LECCIONES} completadas={progreso.aprender} bloqueo={bloqueo} docente={progreso.docente}
      onDocente={(v) => setProgreso((p) => ({ ...p, docente: v }))}
      pieDe={(a) => <span>{a.tarjetas.length} tarjetas</span>}
      extra={<button className="btn discreto med" style={{ marginTop: 6 }} onClick={() => ir("Conceptos")}>Repaso serie y paralelo</button>}
      onAbrir={abrir} />
  );
}
