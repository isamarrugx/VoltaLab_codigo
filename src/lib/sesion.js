// Reglas de una sesión de juego: puntos, racha, estrellas, insignias y lo que se guarda.
// Los puntos premian acertar y resolver sin ayuda, nunca la velocidad.
import { CASOS, NIVELES, PUNTOS, casosDeNivel } from "../datos/casos.js";

export const sesionesIniciales = () => ({ nivel: 1, jugadas: 0, mejor: {}, ranking: [], insignias: [], errores: {} });

// Los 4 casos de una sesión. Después del último nivel, «Mezcla» arma una sesión con el
// mismo ritmo tomando casos de todos los niveles.
export const NIVEL_MEZCLA = 0;
export function casosDeSesion(nivel, azar = Math.random) {
  if (nivel !== NIVEL_MEZCLA) return casosDeNivel(nivel);
  const elegir = (tipo, n) => CASOS.filter((c) => c.tipo === tipo).map((c) => [azar(), c]).sort((a, b) => a[0] - b[0]).slice(0, n).map(([, c]) => c);
  return [...elegir("predecir", 2), ...elegir("reparar", 1), ...elegir("construir", 1)];
}
export const tituloNivel = (n) => (n === NIVEL_MEZCLA ? "Mezcla" : NIVELES.find((x) => x.n === n).titulo);

// Puntos de un caso. `racha` es la racha ANTES de este caso.
// -> { puntos, racha } (racha después del caso)
export function puntuar({ tipo, ok, pistas = 0, fallas = 0, saltado = false }, racha) {
  if (saltado || !ok) return { puntos: 0, racha: 0 };
  const extra = PUNTOS.racha * Math.min(racha, 3);
  if (tipo === "predecir") return { puntos: PUNTOS.prediccion + extra, racha: racha + 1 };
  const base = Math.max(PUNTOS.minimo, PUNTOS.construccion - PUNTOS.pista * pistas - PUNTOS.falla * fallas);
  // resolver con pistas da puntos, pero la racha es solo para lo resuelto sin ayuda
  return pistas ? { puntos: base, racha: 0 } : { puntos: base + extra, racha: racha + 1 };
}

// El mejor puntaje posible con estos casos (todo bien, sin pistas, sin fallas).
export function puntajeMaximo(casos) {
  let racha = 0, total = 0;
  for (const c of casos) { const r = puntuar({ tipo: c.tipo, ok: true }, racha); total += r.puntos; racha = r.racha; }
  return total;
}
// 1 estrella por terminar, 2 desde el 65 % del máximo, 3 desde el 90 %.
export const estrellas = (puntos, maximo) => 1 + (puntos >= 0.65 * maximo) + (puntos >= 0.9 * maximo);

export const INSIGNIAS = {
  ojo: ["Ojo de laboratorio", "Acertaste todas las predicciones."],
  autonomia: ["Sin ayuda", "Terminaste la sesión sin pedir pistas."],
  manos: ["Manos seguras", "Reparaste y construiste sin dañar ninguna pieza."],
  racha: ["Racha completa", "Resolviste los 4 casos seguidos sin fallar."],
};
// `registro`: [{ clave, tipo, ok, pistas, fallas, saltado, puntos }]
export function insigniasDe(registro) {
  const pred = registro.filter((r) => r.tipo === "predecir"), manos = registro.filter((r) => r.tipo !== "predecir");
  const out = [];
  if (pred.length && pred.every((r) => r.ok)) out.push("ojo");
  if (registro.every((r) => !r.pistas && !r.saltado)) out.push("autonomia");
  if (manos.length && manos.every((r) => r.ok && !r.fallas)) out.push("manos");
  if (registro.length === 4 && registro.every((r) => r.ok && !r.pistas)) out.push("racha");
  return out;
}

// Guarda la sesión terminada. Desbloquea el siguiente nivel, actualiza récords y anota
// los casos fallados (los errores recurrentes que verá el docente).
export function registrarSesion(s, { nivel, puntos, registro, nombre = "" }) {
  const t = { ...sesionesIniciales(), ...s };
  const errores = { ...t.errores };
  for (const r of registro) if (!r.ok || r.saltado) errores[r.clave] = (errores[r.clave] || 0) + 1;
  const ganadas = insigniasDe(registro);
  const mejorAntes = t.mejor[nivel] || 0;
  return {
    ...t, errores,
    jugadas: t.jugadas + 1,
    nivel: nivel !== NIVEL_MEZCLA && nivel === t.nivel && nivel < NIVELES.length ? nivel + 1 : t.nivel,
    mejor: { ...t.mejor, [nivel]: Math.max(mejorAntes, puntos) },
    insignias: [...new Set([...t.insignias, ...ganadas])],
    ranking: nombre.trim() ? agregarRanking(t.ranking, { nombre: nombre.trim().slice(0, 12), puntos, nivel }) : t.ranking,
    _nuevas: ganadas.filter((g) => !t.insignias.includes(g)),
    _record: puntos > mejorAntes,
  };
}
export const agregarRanking = (ranking, fila) =>
  [...ranking, { ...fila, fecha: new Date().toISOString().slice(0, 10) }].sort((a, b) => b.puntos - a.puntos).slice(0, 10);
