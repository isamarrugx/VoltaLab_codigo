import { IconoCanvas, IconoEstado } from "../componentes/Iconos.jsx";
import { Candado, Estrellas } from "../componentes/piezas.jsx";
import { Switch } from "../componentes/ui.jsx";
import { Barra } from "../componentes/ui.jsx";

function Tarjeta({ i, act, hecha, recomendada, motivo, pie, onAbrir }) {
  const bloq = !!motivo;
  return (
    <button type="button" className={`tarjeta act ${hecha ? "hecha" : ""} ${recomendada ? "reco" : ""} ${bloq ? "bloq" : ""}`}
      style={hecha ? { border: "2px solid var(--exito)", padding: 13 } : undefined} onClick={() => !bloq && onAbrir(act.clave)} aria-disabled={bloq} title={bloq ? motivo : undefined}>
      <div className="arriba">
        {hecha ? <IconoEstado forma="ok" color="#2E9E6A" tam={26} /> : bloq ? <Candado /> : <span className="num">{i + 1}</span>}
        <span style={{ marginLeft: "auto" }}><IconoCanvas tipo={act.icono} w={70} h={34} /></span>
      </div>
      <h3 style={bloq ? { color: "var(--texto2)" } : null}>{act.titulo}</h3>
      <p>{act.resumen}</p>
      <div className="pie">
        {bloq ? null : pie}
      </div>
    </button>
  );
}

// Pantalla indice generica (Aprender / Laboratorio).
export default function Indice({ kicker = "", titulo, subtitulo, ir, actividades, completadas, atras = ["Inicio", "← Inicio"], bloqueo, docente, onDocente, pieDe, extra, agrupar, onAbrir }) {
  const sig = actividades.find((a, i) => !completadas.has(a.clave) && bloqueo(i) === null)?.clave;
  const rejilla = (lista) => (
    <div className="grid3">
      {lista.map(([i, a]) => {
        const hecha = completadas.has(a.clave);
        const motivo = hecha ? null : bloqueo(i);
        const rec = a.clave === sig;
        const estado = hecha ? <b style={{ color: "var(--exito)" }}>Completada</b> : rec ? <b style={{ color: "var(--acento)" }}>Empieza aquí</b> : null;
        return <Tarjeta key={a.clave} i={i} act={a} hecha={hecha} recomendada={rec} motivo={motivo} onAbrir={onAbrir}
          pie={<>{pieDe(a, hecha)}{estado}</>} />;
      })}
    </div>
  );
  const todas = actividades.map((a, i) => [i, a]);
  return (
    <div className="pantalla" style={{ overflowY: "auto" }}>
      <div className="cab">
        <button className="btn contorno med" onClick={() => ir(atras[0])} style={{ marginTop: 6 }}>{atras[1]}</button>
        <div className="titulos"><h1 style={{ fontSize: 28 }}>{titulo}</h1>{subtitulo ? <div className="sub" style={{ fontSize: 13, maxWidth: 620 }}>{subtitulo}</div> : null}</div>
        {extra}
        <div className="tarjeta progreso-card" style={{ marginLeft: extra ? 0 : "auto" }}>
          <b>{completadas.size} de {actividades.length} completadas <button className="enlace-pg" onClick={() => ir("Progreso")}>Ver progreso</button></b>
          <div className="progreso"><div style={{ width: `${(completadas.size / actividades.length) * 100}%` }} /></div>
          <Switch chico on={docente} onChange={onDocente}>Modo docente</Switch>
        </div>
      </div>
      {agrupar ? agrupar(todas, rejilla) : rejilla(todas)}
    </div>
  );
}

export { Estrellas };
