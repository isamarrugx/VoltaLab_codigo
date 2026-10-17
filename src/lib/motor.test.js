import { test } from "node:test";
import assert from "node:assert/strict";
import { resolverCircuito, clasificarTopologia, ErrorCircuito } from "./motor.js";

const aprox = (a, b, tol = 1e-6) => assert.ok(Math.abs(a - b) < tol, `${a} != ${b}`);

test("serie: Req 600, I 0.02, misma corriente en todas", () => {
  const A = [0, 0], B = [0, 1], C = [0, 2], D = [0, 3];
  const r = resolverCircuito([], [[A, B, 100], [B, C, 200], [C, D, 300]], [A, D, 12]);
  aprox(r.resistenciaEquivalente, 600);
  aprox(r.corrienteTotal, 0.02);
  r.resistencias.forEach((x) => aprox(x.corriente, 0.02));
});

test("paralelo: Req 54.5455, voltaje completo en cada rama", () => {
  const POS = [0, 0], NEG = [1, 0];
  const r = resolverCircuito([], [[POS, NEG, 100], [POS, NEG, 200], [POS, NEG, 300]], [POS, NEG, 12]);
  aprox(r.resistenciaEquivalente, 1 / (1 / 100 + 1 / 200 + 1 / 300));
  r.resistencias.forEach((x) => aprox(x.voltaje, 12));
});

test("cables fusionan nodos: Req 25", () => {
  const POS = [0, 0], NEG = [5, 0], P1 = [0, 1], P2 = [5, 1];
  const r = resolverCircuito([[POS, P1], [NEG, P2]], [[P1, P2, 50], [P1, P2, 50]], [POS, NEG, 9]);
  aprox(r.resistenciaEquivalente, 25);
});

const puente = (r3, r4) => {
  const POS = [0, 0], NEG = [2, 0], N1 = [1, -1], N2 = [1, 1];
  return {
    POS, NEG, N1, N2,
    res: [[POS, N1, 10], [POS, N2, 20], [N1, NEG, r3], [N2, NEG, r4], [N1, N2, 15]],
    bat: [POS, NEG, 10],
  };
};

test("Wheatstone desbalanceado: V_N1=7.3256, V_N2=6.9767, Req=23.8889, potencias suman", () => {
  const { N1, N2, res, bat } = puente(30, 40);
  const r = resolverCircuito([], res, bat);
  const nodoDe = r.nodoDe;
  aprox(r.voltajesNodo.get(nodoDe(N1)), 7.3256, 1e-4);
  aprox(r.voltajesNodo.get(nodoDe(N2)), 6.9767, 1e-4);
  aprox(r.resistenciaEquivalente, 23.8889, 1e-4);
  aprox(r.resistencias.reduce((s, x) => s + x.potencia, 0), r.potenciaTotal);
});

test("Wheatstone balanceado: corriente en el puente ~0", () => {
  const { res, bat } = puente(20, 40);
  const r = resolverCircuito([], res, bat);
  aprox(r.resistencias[4].corriente, 0, 1e-9);
});

test("cortocircuito lanza ErrorCircuito", () => {
  const POS = [0, 0], NEG = [1, 0];
  assert.throws(() => resolverCircuito([[POS, NEG]], [[POS, NEG, 100]], [POS, NEG, 12]), ErrorCircuito);
});

test("circuito abierto lanza ErrorCircuito", () => {
  const POS = [0, 0], NEG = [1, 0], X = [5, 5];
  assert.throws(() => resolverCircuito([], [[POS, X, 100]], [POS, NEG, 12]), ErrorCircuito);
});

test("resistencia desconectada se reporta", () => {
  const A = [0, 0], B = [0, 1];
  const r = resolverCircuito([], [[A, B, 100], [[9, 9], [9, 10], 500]], [A, B, 12]);
  aprox(r.resistenciaEquivalente, 100);
  assert.deepEqual(r.desconectadas, [1]);
});

test("clasificacion: serie, paralelo, mixto, compleja, unico, vacio", () => {
  const P = [0, 0], N = [3, 0], M1 = [1, 0], M2 = [2, 0];
  assert.equal(clasificarTopologia([], [[P, M1, 1], [M1, M2, 1], [M2, N, 1]], [P, N, 5]).tipo, "serie");
  assert.equal(clasificarTopologia([], [[P, N, 1], [P, N, 2]], [P, N, 5]).tipo, "paralelo");
  // mixto: R1 en serie con (R2 || R3)
  assert.equal(clasificarTopologia([], [[P, M1, 1], [M1, N, 2], [M1, N, 3]], [P, N, 5]).tipo, "mixto");
  assert.equal(clasificarTopologia([], [[P, N, 1]], [P, N, 5]).tipo, "unico");
  assert.equal(clasificarTopologia([], [], [P, N, 5]).tipo, "vacio");
  const { res, bat } = puente(30, 40);
  assert.equal(clasificarTopologia([], res, bat).tipo, "compleja");
});
