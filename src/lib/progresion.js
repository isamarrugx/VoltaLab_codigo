// Cada leccion se abre al completar la anterior. El Laboratorio siempre esta abierto.
export function bloqueoLeccion(i, lista, completadas, docente = false) {
  if (docente || i === 0 || completadas.has(lista[i - 1].clave)) return null;
  return `Completa primero «${lista[i - 1].titulo}».`;
}
export function sugerenciaReto(reto, lecciones, hechas) {
  const r = reto.requiere;
  if (!r || hechas.has(r)) return null;
  const l = lecciones.find((x) => x.clave === r);
  return `Te ayuda la lección «${l ? l.titulo : r}».`;
}
export const progresoInicial = () => ({ aprender: new Set(), laboratorio: new Set(), habilidades: new Set(), problemas: new Set(), estrellas: {}, docente: false, evidencias: {}, nombre: "", sesiones: { nivel: 1, jugadas: 0, mejor: {}, ranking: [], insignias: [], errores: {} } });
