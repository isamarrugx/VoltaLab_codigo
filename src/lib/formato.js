// Formato de magnitudes electricas (port de formato.py).
const g = (v, n) => { // equivalente a Python f"{v:.{n}g}"
  if (v === 0) return "0";
  const s = Number(v).toPrecision(n);
  return String(Number(s)).includes("e") ? s : String(Number(s));
};
export const voltios = (v) => `${v.toFixed(2)} V`;
export const amperios = (v) => (Math.abs(v) < 1 ? `${(v * 1000).toFixed(1)} mA` : `${v.toFixed(3)} A`);
export const vatios = (v) => (Math.abs(v) < 0.01 ? `${(v * 1000).toFixed(2)} mW` : `${v.toFixed(3)} W`);
export const ohmios = (v) => (v >= 1000 ? `${g(v / 1000, 3)} kΩ` : `${g(v, 4)} Ω`);
// f"{v:g}" de Python (6 cifras significativas)
export const gg = (v) => g(v, 6);
export const fmtValor = (valor, unidad) => {
  if (unidad === "Ω" && valor >= 1000) return `${gg(valor / 1000)} kΩ`;
  return `${gg(valor)} ${unidad}`;
};
