// Registro local de evidencias por actividad (intentos, pistas, errores, fecha de logro).
export const anotar = (setProgreso, clave, cambio) =>
  setProgreso((p) => {
    const e = p.evidencias[clave] || { intentos: 0, pistas: 0, errores: 0, fecha: null };
    return { ...p, evidencias: { ...p.evidencias, [clave]: cambio(e) } };
  });
