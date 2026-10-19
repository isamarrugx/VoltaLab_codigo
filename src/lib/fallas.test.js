import { test } from "node:test";
import assert from "node:assert/strict";
import { Termico, medir, tiempoFusion, limitarResultado, estado } from "./fallas.js";
import { resolverCircuito } from "./motor.js";

const aprox = (a, b, tol = 1e-6) => assert.ok(Math.abs(a - b) < tol, `${a} != ${b}`);

// Batería vertical de (0,0) a (2,0); las piezas se cierran con cables por arriba y por abajo.
const bat = (v, imax) => ({ tipo: "bateria", punto_a: [0, 0], punto_b: [2, 0], valor: v, ...(imax ? { imax } : {}) });
const cable = (a, b) => ({ puntos: [a, b] });
// Una pieza entre (0,c) y (2,c), conectada en paralelo con la batería.
function paralelo(...piezas) {
  const componentes = { b: bat(...piezas.shift()) }, cables = {};
  piezas.forEach((p, i) => {
    const c = 2 * (i + 1);
    componentes[`p${i}`] = { punto_a: [0, c], punto_b: [2, c], ...p };
    cables[`a${i}`] = cable([0, c - 2], [0, c]); cables[`b${i}`] = cable([2, c - 2], [2, c]);
  });
  return { componentes, cables };
}
const correr = (t, { componentes, cables }, segundos, dt = 0.05) => {
  for (let s = 0; s < segundos; s += dt) { const r = t.paso(componentes, cables, dt); if (r.falla) return { ...r, t: s }; }
  return null;
};

test("bombillo dentro de su potencia nunca se funde", () => {
  const c = paralelo([9, 5], { tipo: "bombillo", valor: 10, pmax: 15 }); // 8.1 W
  assert.equal(correr(new Termico(), c, 20), null);
});

test("bombillo con el doble de su potencia se funde en menos de un segundo y queda abierto", () => {
  const c = paralelo([12, 5], { tipo: "bombillo", valor: 10, pmax: 7 }); // 14.4 W
  const r = correr(new Termico(), c, 5);
  assert.ok(r && r.falla.tag === "p0" && r.t < 1, JSON.stringify(r && r.falla));
  aprox(r.falla.P, 14.4);
});

test("resistencia: se calienta antes de quemarse y el estado lo refleja", () => {
  const c = paralelo([12, 5], { tipo: "resistencia", valor: 100, pmax: 1 }); // 1.44 W, 144 %
  const t = new Termico();
  t.paso(c.componentes, c.cables, 1);
  assert.equal(estado(c.componentes.p0, t.calor.p0), "caliente");
  const r = correr(t, c, 10);
  assert.ok(r && r.t > 0.5, "no debe fallar al instante"); // teórico: 1.6 × ln(1.44 / 0.44) ≈ 1.9 s
});

test("resistencia a 72 % de su potencia se queda caliente pero no falla", () => {
  const c = paralelo([12, 5], { tipo: "resistencia", valor: 100, pmax: 2 });
  const t = new Termico();
  assert.equal(correr(t, c, 30), null);
  assert.equal(estado(c.componentes.p0, t.calor.p0), "caliente");
});

test("curva del fusible: sin exceso no se abre; más exceso, más rápido", () => {
  assert.equal(tiempoFusion(0.5, 0.5), Infinity);
  assert.ok(tiempoFusion(1, 0.5) < 1);
  assert.ok(tiempoFusion(0.6, 0.5) > tiempoFusion(1, 0.5));
});

test("en paralelo, al fundirse una rama la otra sigue con el mismo voltaje", () => {
  const c = paralelo([12, 5], { tipo: "bombillo", valor: 10, pmax: 5 }, { tipo: "bombillo", valor: 10, pmax: 40 });
  const r = correr(new Termico(), c, 5);
  assert.equal(r.falla.tag, "p0");
  c.componentes.p0.danado = true;
  const m = medir(c.componentes, c.cables);
  aprox(m.piezas.p1.P, 14.4);
});

test("la batería limita la corriente bajando su voltaje", () => {
  const c = paralelo([12, 1], { tipo: "resistencia", valor: 4, pmax: 100 }); // pediría 3 A
  const m = medir(c.componentes, c.cables);
  assert.ok(m.limitando && !m.corto);
  aprox(m.iFuente, 1); aprox(m.vSalida, 4);
});

test("cortocircuito con cable: protección a ~0 V", () => {
  const c = paralelo([12, 2], { tipo: "bombillo", valor: 10 });
  c.cables.corto = cable([0, 0], [2, 0]);
  const m = medir(c.componentes, c.cables);
  assert.ok(m.corto); assert.equal(m.vSalida, 0); assert.equal(m.iFuente, 2);
});

test("cortocircuito a través de un fusible: el fusible se abre y protege", () => {
  const c = paralelo([12, 2], { tipo: "bombillo", valor: 10 }, { tipo: "fusible", valor: 0.5 });
  const r = correr(new Termico(), c, 2);
  assert.equal(r.falla.tag, "p1"); assert.equal(r.falla.causa, "corto");
  assert.ok(r.t < 0.3, `tardó ${r.t}`);
  c.componentes.p1.danado = true;
  const m = medir(c.componentes, c.cables);
  assert.ok(!m.corto && !m.limitando); aprox(m.piezas.p0.P, 14.4);
});

test("serie: al fundirse un bombillo el otro se apaga", () => {
  // B1 de (0,0)-(0,2) y B2 de (0,2)-(0,4) en serie; batería de (2,0) a (2,4) cerrada por cables
  const componentes = {
    b: { tipo: "bateria", punto_a: [2, 0], punto_b: [2, 4], valor: 12 },
    b1: { tipo: "bombillo", punto_a: [0, 0], punto_b: [0, 2], valor: 10, pmax: 2 },
    b2: { tipo: "bombillo", punto_a: [0, 2], punto_b: [0, 4], valor: 10, pmax: 15 },
  };
  const cables = { a: cable([2, 0], [0, 0]), z: cable([0, 4], [2, 4]) };
  const r = correr(new Termico(), { componentes, cables }, 5);
  assert.equal(r.falla.tag, "b1");
  componentes.b1.danado = true;
  assert.equal(medir(componentes, cables).piezas.b2, undefined);
});

test("limitarResultado escala corriente, voltajes y potencia", () => {
  const POS = [0, 0], NEG = [1, 0];
  const r = resolverCircuito([], [[POS, NEG, 4]], [POS, NEG, 12]);
  const { resultado, k } = limitarResultado(r, 1);
  aprox(k, 1 / 3); aprox(resultado.corrienteTotal, 1); aprox(resultado.resistencias[0].voltaje, 4); aprox(resultado.potenciaTotal, 4);
  assert.equal(limitarResultado(r, 5).k, 1);
});
