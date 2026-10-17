import { useState } from "react";
import { LECCIONES } from "../datos/lecciones.js";
import { RETOS } from "../datos/retos.js";
import { PROBLEMAS } from "../datos/problemas.js";
import { FICHAS } from "../datos/docente.js";

const TODAS = [
  ...LECCIONES.map((a) => ({ ...a, tipo: "Lección", destino: "Aprender" })),
  ...RETOS.map((a) => ({ ...a, tipo: "Reto", destino: "Laboratorio" })),
  ...PROBLEMAS.map((a) => ({ ...a, tipo: "Problema", destino: "Problemas" })),
];

function Lista({ titulo, items, proyectar }) {
  return (
    <section className="dc-grupo">
      <h2>{titulo}</h2>
      {items.map((a) => {
        const f = FICHAS[a.clave];
        if (!f) return null;
        return (
          <details key={a.clave} className="dc-ficha">
            <summary><span className="dc-t">{a.titulo}</span><span className="dc-min">{f.min} min</span></summary>
            <div className="dc-cuerpo">
              <p><b>Objetivo.</b> {f.objetivo}</p>
              <p><b>Conocimientos previos.</b> {f.previos}</p>
              <p><b>Uso sugerido.</b> {f.uso}</p>
              <div className="dc-dos">
                <div><b>Qué observar</b><ul>{f.criterios.map((c) => <li key={c}>{c}</li>)}</ul></div>
                <div><b>Errores frecuentes</b><ul>{f.errores.map((c) => <li key={c}>{c}</li>)}</ul></div>
              </div>
              <button className="btn prim med" onClick={() => proyectar(a)}>Abrir para proyectar</button>
            </div>
          </details>);
      })}
    </section>
  );
}

const fecha = (iso) => (iso ? new Date(iso).toLocaleDateString("es-CO") : "—");

export default function Docentes({ ir, progreso, setProgreso }) {
  const [tab, setTab] = useState("act");
  const proyectar = (a) => { setProgreso((p) => ({ ...p, docente: true })); ir(a.destino, a.clave); };
  const filas = TODAS.map((a) => {
    const hecha = (a.tipo === "Lección" ? progreso.aprender : a.tipo === "Problema" ? progreso.problemas : progreso.laboratorio).has(a.clave);
    const ev = progreso.evidencias[a.clave] || { intentos: 0, pistas: 0, fecha: null };
    return { a, hecha, ev, est: a.tipo === "Reto" && hecha ? progreso.estrellas[a.clave] || 0 : null };
  });
  const csv = () => {
    const l = [["Estudiante", "Tipo", "Actividad", "Estado", "Aperturas", "Pistas pedidas", "Estrellas", "Fecha de logro"],
      ...filas.map(({ a, hecha, ev, est }) => [progreso.nombre || "", a.tipo, a.titulo, hecha ? "Completada" : ev.intentos ? "En curso" : "Sin empezar", ev.intentos, ev.pistas, est ?? "", ev.fecha ? ev.fecha.slice(0, 10) : ""])];
    const txt = "﻿" + l.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([txt], { type: "text/csv;charset=utf-8" }));
    const el = document.createElement("a"); el.href = url; el.download = "circuitlab_resumen.csv"; document.body.appendChild(el); el.click(); el.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const hechas = filas.filter((f) => f.hecha).length, pistas = filas.reduce((a, f) => a + f.ev.pistas, 0);
  return (
    <div className="pantalla docentes" style={{ overflowY: "auto" }}>
      <div className="cab no-imprimir">
        <button className="btn contorno med" onClick={() => ir("Inicio")} style={{ marginTop: 6 }}>← Inicio</button>
        <div className="titulos"><h1 style={{ fontSize: 28 }}>Panel docente</h1></div>
        <div className="dc-tabs" role="tablist">
          <button role="tab" aria-selected={tab === "act"} className={tab === "act" ? "on" : ""} onClick={() => setTab("act")}>Actividades</button>
          <button role="tab" aria-selected={tab === "ev"} className={tab === "ev" ? "on" : ""} onClick={() => setTab("ev")}>Evidencias</button>
        </div>
      </div>
      <div className="dc-aviso">Los datos viven solo en este navegador. Para ver el avance de un estudiante, pídele que entregue su <b>copia</b> (Mi progreso) o su <b>resumen CSV</b>.</div>
      {tab === "act" ? (
        <div className="dc-cols">
          <Lista titulo="Lecciones" items={LECCIONES} proyectar={(a) => proyectar({ ...a, destino: "Aprender" })} />
          <Lista titulo="Retos del laboratorio" items={RETOS} proyectar={(a) => proyectar({ ...a, destino: "Laboratorio" })} />
        </div>
      ) : (
        <div className="dc-ev">
          <div className="dc-acciones no-imprimir">
            <span><b>{hechas}</b> de {TODAS.length} completadas · <b>{pistas}</b> pistas pedidas</span>
            <span style={{ flex: 1 }} />
            <button className="btn med contorno" onClick={csv}>Descargar resumen (CSV)</button>
            <button className="btn med contorno" onClick={() => window.print()}>Imprimir o guardar PDF</button>
          </div>
          <table className="dc-tabla">
            <thead><tr><th>Actividad</th><th>Estado</th><th>Aperturas</th><th>Pistas</th><th>Estrellas</th><th>Logro</th></tr></thead>
            <tbody>
              {filas.map(({ a, hecha, ev, est }) => (
                <tr key={a.clave} className={hecha ? "ok" : ""}>
                  <td><small>{a.tipo}</small>{a.titulo}</td>
                  <td>{hecha ? "Completada" : ev.intentos ? "En curso" : "Sin empezar"}</td>
                  <td>{ev.intentos}</td><td>{a.tipo !== "Lección" ? ev.pistas : "—"}</td><td>{est ?? "—"}</td><td>{fecha(ev.fecha)}</td>
                </tr>))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
