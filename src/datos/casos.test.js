import { test } from "node:test";
import assert from "node:assert/strict";
import { CASOS, NIVELES, casosDeNivel } from "./casos.js";
import { Termico, medir } from "../lib/fallas.js";

// Lo que el estudiante debería descubrir en cada caso de predecir (el juego no usa esto:
// allí manda el motor; aquí comprobamos que el motor dice lo que el texto explica).
const ESPERADA = { brillo_serie: "b2", doble_voltaje: "doble", paralelo_fundido: "igual", serie_fundido: "apaga", atajo_fusible: "fusible", bateria_limite: "menos" };

const clonar = (o) => JSON.parse(JSON.stringify(o));
// Corre la física como en el juego: pasos de 50 ms; las piezas que fallan quedan abiertas.
function correr(comp, cables, segundos) {
  const t = new Termico();
  let inicio = null;
  for (let s = 0; s < segundos; s += 0.05) {
    const { med, falla } = t.paso(comp, cables, 0.05);
    if (!inicio) inicio = med;
    if (falla) comp[falla.tag].danado = true;
  }
  return { inicio, fin: medir(comp, cables) };
}

test("cada nivel tiene el ritmo predecir, predecir, reparar, construir", () => {
  for (const { n } of NIVELES) assert.deepEqual(casosDeNivel(n).map((c) => c.tipo), ["predecir", "predecir", "reparar", "construir"]);
});

for (const caso of CASOS.filter((c) => c.tipo === "predecir")) {
  test(`predecir «${caso.titulo}»: el motor da la respuesta que explica el texto`, () => {
    const comp = clonar(caso.componentes), cables = clonar(caso.cables);
    const previo = caso.encendidoDesdeInicio ? correr(comp, cables, 1).fin : medir(comp, cables);
    caso.accion(comp);
    const { inicio, fin } = correr(comp, cables, caso.espera);
    assert.equal(caso.resultado({ previo, inicio, fin, comp }), ESPERADA[caso.clave]);
    assert.ok(caso.opciones.some(([k]) => k === ESPERADA[caso.clave]));
  });
}

for (const caso of CASOS.filter((c) => c.tipo !== "predecir")) {
  test(`${caso.tipo} «${caso.titulo}»: sin tocar no se cumple; con la solución sí, y sin fallas`, () => {
    const comp = clonar(caso.componentes), cables = clonar(caso.cables);
    let r = correr(comp, cables, 2);
    assert.equal(!!caso.meta({ ...r, comp, cables, medir }), false, "no debe resolverse solo");
    const comp2 = clonar(caso.componentes), cables2 = clonar(caso.cables);
    caso.solucion(comp2, cables2);
    r = correr(comp2, cables2, 4);
    assert.ok(!Object.values(comp2).some((c) => c.danado), "la solución no debe dañar nada");
    assert.ok(caso.meta({ ...r, comp: comp2, cables: cables2, medir }), "la solución debe cumplir la meta");
  });
}

test("reparar «Se funde otra vez»: reemplazar sin corregir la causa vuelve a fundirlo", () => {
  const caso = CASOS.find((c) => c.clave === "fundido_otra_vez");
  const comp = clonar(caso.componentes), cables = clonar(caso.cables);
  delete comp.obj_3.danado;
  correr(comp, cables, 2);
  assert.ok(comp.obj_3.danado);
});

test("construir «Protege el circuito»: un fusible de 0.5 A se abre y no cuenta", () => {
  const caso = CASOS.find((c) => c.clave === "protege");
  const comp = clonar(caso.componentes), cables = clonar(caso.cables);
  comp.sol = { tipo: "fusible", punto_a: [0, 3], punto_b: [0, 5], valor: 0.5 };
  const r = correr(comp, cables, 2);
  assert.ok(comp.sol.danado);
  assert.equal(caso.meta({ ...r, comp, cables, medir }), false);
});
