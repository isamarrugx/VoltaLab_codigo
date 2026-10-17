// Animaciones livianas y utilidades de color (port de animaciones.py).

let reducido = null;
export function movimientoReducido() {
  if (reducido === null) {
    try { reducido = window.matchMedia("(prefers-reduced-motion: reduce)").matches; } catch { reducido = false; }
  }
  return reducido;
}
export function establecerMovimientoReducido(v) { reducido = !!v; }

const limitar = (t) => Math.max(0, Math.min(1, t));
export const suavizar = (t) => 1 - (1 - limitar(t)) ** 3;
export const suavizarEntradaSalida = (t) => { t = limitar(t); return 3 * t * t - 2 * t * t * t; };

const hexARgb = (c) => { c = c.replace("#", ""); return [0, 2, 4].map((i) => parseInt(c.slice(i, i + 2), 16)); };
export function mezclarColor(a, b, t) {
  t = limitar(t);
  const x = hexARgb(a), y = hexARgb(b);
  return "#" + x.map((v, i) => Math.round(v + (y[i] - v) * t).toString(16).padStart(2, "0")).join("");
}

// animar(duracionMs, alPaso(progreso), alFinal) -> { cancelar() }
export function animar(duracionMs, alPaso, alFinal, curva = suavizar) {
  let cancelada = false, id = null;
  if (movimientoReducido() || duracionMs <= 0) {
    alPaso(1); alFinal && alFinal();
    return { cancelar() {} };
  }
  const inicio = performance.now();
  const paso = () => {
    id = null;
    if (cancelada) return;
    const t = (performance.now() - inicio) / duracionMs;
    if (t >= 1) { alPaso(1); alFinal && alFinal(); return; }
    alPaso(curva(t));
    id = requestAnimationFrame(paso);
  };
  paso();
  return { cancelar() { cancelada = true; if (id) cancelAnimationFrame(id); } };
}

export function despues(retrasoMs, fn) {
  if (movimientoReducido()) { fn(); return null; }
  return setTimeout(fn, retrasoMs);
}
