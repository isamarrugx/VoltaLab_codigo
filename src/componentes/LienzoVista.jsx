import { useEffect, useRef, useState } from "react";
import { Lienzo } from "../lienzo/Lienzo.js";

// Envoltorio React del motor del tablero. `onListo(lienzo)` entrega la instancia.
export default function LienzoVista({ opciones = {}, onListo, onCambio, onSeleccion, onHerramienta, onBloqueado, centrar = true, children }) {
  const canvas = useRef(null);
  const inst = useRef(null);
  const cb = useRef({});
  const zona = useRef(null);
  const [zoom, setZoom] = useState(1);
  const [pleno, setPleno] = useState(false);
  cb.current = { onCambio, onSeleccion, onHerramienta, onBloqueado };
  useEffect(() => {
    const l = new Lienzo(canvas.current, {
      ...opciones,
      onCambio: () => cb.current.onCambio && cb.current.onCambio(),
      onSeleccion: (t) => cb.current.onSeleccion && cb.current.onSeleccion(t),
    });
    l.onZoom = (z) => setZoom(z);
    l.onHerramienta = (h) => cb.current.onHerramienta && cb.current.onHerramienta(h);
    l.onInterruptorBloqueado = (t) => cb.current.onBloqueado && cb.current.onBloqueado(t);
    inst.current = l;
    onListo && onListo(l);
    return () => { l.destruir(); inst.current = null; };
    // eslint-disable-next-line
  }, []);
  return (
    <div className="zona-lienzo" ref={zona}>
      <canvas ref={canvas} />
      {centrar ? (
        <div className="ctl-zoom" role="group" aria-label="Zoom del tablero">
          <button onClick={() => inst.current?.zoomarEn(1 / 1.25)} aria-label="Alejar" title="Alejar">−</button>
          <span title="Zoom actual">{Math.round(zoom * 100)} %</span>
          <button onClick={() => inst.current?.zoomarEn(1.25)} aria-label="Acercar" title="Acercar">+</button>
          <i />
          <button className="txt" onClick={() => inst.current?.ajustar()} title="Ajustar el circuito a la pantalla">Ajustar</button>
          <button className="txt" onClick={() => { const z = zona.current; if (!z) return; if (document.fullscreenElement) document.exitFullscreen(); else z.requestFullscreen?.(); setTimeout(() => setPleno(!!document.fullscreenElement), 300); }} title="Pantalla completa para proyectar">{pleno ? "Salir" : "Proyectar"}</button>
        </div>) : null}
      {centrar ? <div className="ayuda-zoom">Arrastra el fondo: seleccionar · Espacio + arrastrar: mover</div> : null}
      {children}
    </div>
  );
}
