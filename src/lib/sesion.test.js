import { test } from "node:test";
import assert from "node:assert/strict";
import { puntuar, puntajeMaximo, estrellas, insigniasDe, registrarSesion, sesionesIniciales, casosDeSesion, NIVEL_MEZCLA } from "./sesion.js";
import { casosDeNivel } from "../datos/casos.js";

test("acertar suma y alarga la racha; fallar no resta pero corta la racha", () => {
  assert.deepEqual(puntuar({ tipo: "predecir", ok: true }, 0), { puntos: 100, racha: 1 });
  assert.deepEqual(puntuar({ tipo: "predecir", ok: true }, 2), { puntos: 150, racha: 3 });
  assert.deepEqual(puntuar({ tipo: "predecir", ok: false }, 3), { puntos: 0, racha: 0 });
});

test("las pistas y las fallas bajan los puntos, con un mínimo; con pistas no hay racha", () => {
  assert.deepEqual(puntuar({ tipo: "reparar", ok: true }, 0), { puntos: 150, racha: 1 });
  assert.deepEqual(puntuar({ tipo: "reparar", ok: true, pistas: 1 }, 2), { puntos: 125, racha: 0 });
  assert.equal(puntuar({ tipo: "construir", ok: true, pistas: 2, fallas: 5 }, 0).puntos, 50);
  assert.deepEqual(puntuar({ tipo: "construir", saltado: true }, 2), { puntos: 0, racha: 0 });
});

test("máximo y estrellas", () => {
  const max = puntajeMaximo(casosDeNivel(1));
  assert.equal(max, 100 + 125 + 200 + 225);
  assert.equal(estrellas(0, max), 1);
  assert.equal(estrellas(Math.ceil(0.65 * max), max), 2);
  assert.equal(estrellas(max, max), 3);
});

test("insignias", () => {
  const perfecto = [{ tipo: "predecir", ok: true }, { tipo: "predecir", ok: true }, { tipo: "reparar", ok: true }, { tipo: "construir", ok: true }];
  assert.deepEqual(insigniasDe(perfecto), ["ojo", "autonomia", "manos", "racha"]);
  assert.deepEqual(insigniasDe([{ tipo: "predecir", ok: false }, { tipo: "predecir", ok: true }, { tipo: "reparar", ok: true, pistas: 1 }, { tipo: "construir", ok: true, fallas: 1 }]), []);
});

test("registrar: desbloquea el siguiente nivel una sola vez, guarda récord, errores y ranking", () => {
  const reg = [{ clave: "a", tipo: "predecir", ok: false }, { clave: "b", tipo: "predecir", ok: true }];
  let s = registrarSesion(sesionesIniciales(), { nivel: 1, puntos: 300, registro: reg, nombre: "ana" });
  assert.equal(s.nivel, 2); assert.equal(s.mejor[1], 300); assert.equal(s.errores.a, 1); assert.equal(s.ranking[0].nombre, "ana"); assert.ok(s._record);
  s = registrarSesion(s, { nivel: 1, puntos: 200, registro: reg });
  assert.equal(s.nivel, 2, "repetir el nivel 1 no salta niveles"); assert.equal(s.mejor[1], 300); assert.equal(s.errores.a, 2); assert.ok(!s._record);
  s = registrarSesion({ ...s, nivel: 3 }, { nivel: 3, puntos: 10, registro: [] });
  assert.equal(s.nivel, 3, "no hay nivel 4");
});

test("la mezcla conserva el ritmo de una sesión", () => {
  assert.deepEqual(casosDeSesion(NIVEL_MEZCLA).map((c) => c.tipo), ["predecir", "predecir", "reparar", "construir"]);
});
