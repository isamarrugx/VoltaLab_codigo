import { useEffect, useState } from "react";
import Inicio from "./pantallas/Inicio.jsx";
import Configurar from "./pantallas/Configurar.jsx";
import Acerca from "./pantallas/Acerca.jsx";
import Aprender from "./pantallas/Aprender.jsx";
import Laboratorio from "./pantallas/Laboratorio.jsx";
import Conceptos from "./pantallas/Conceptos.jsx";
import Progreso from "./pantallas/Progreso.jsx";
import Docentes from "./pantallas/Docentes.jsx";
import Ruta from "./pantallas/Ruta.jsx";
import Problemas from "./pantallas/Problemas.jsx";
import Sesion from "./pantallas/Sesion.jsx";
import { progresoInicial } from "./lib/progresion.js";

const CLAVE = "circuitlab.progreso.v1";
function cargar() {
  const base = progresoInicial();
  try {
    const j = JSON.parse(localStorage.getItem(CLAVE) || "null");
    if (!j) return base;
    return { aprender: new Set(j.aprender || []), laboratorio: new Set(j.laboratorio || []), habilidades: new Set(j.habilidades || []), problemas: new Set(j.problemas || []), estrellas: j.estrellas || {}, docente: !!j.docente, evidencias: j.evidencias || {}, nombre: j.nombre || "", sesiones: { ...base.sesiones, ...(j.sesiones || {}) } };
  } catch { return base; }
}
function guardar(p) {
  try {
    localStorage.setItem(CLAVE, JSON.stringify({ aprender: [...p.aprender], laboratorio: [...p.laboratorio], habilidades: [...p.habilidades], problemas: [...p.problemas], estrellas: p.estrellas, docente: p.docente, evidencias: p.evidencias, nombre: p.nombre, sesiones: p.sesiones }));
  } catch { /* sin almacenamiento */ }
}

export default function App() {
  const [pantalla, setPantalla] = useState("Inicio");
  const [destino, setDestino] = useState(null);
  const [progreso, setProgreso] = useState(cargar);
  // las habilidades se actualizan sobre el mismo Set, por eso se guarda también al cambiar de pantalla
  useEffect(() => { guardar(progreso); }, [progreso, pantalla]);
  const ir = (n, clave = null) => { setDestino(clave); setPantalla(n); window.scrollTo(0, 0); };
  const P = { Inicio, Configurar, Acerca, Aprender, Laboratorio, Conceptos, Progreso, Docentes, Ruta, Problemas, Sesion }[pantalla] || Inicio;
  return <div className="app"><P key={pantalla} ir={ir} progreso={progreso} setProgreso={setProgreso} clave={destino} /></div>;
}
