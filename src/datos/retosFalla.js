// Retos breves de predicción con fallas: primero se predice, luego el motor lo comprueba.
// Las piezas llevan sus límites; el resultado lo decide el modelo térmico (lib/fallas.js).
const cable = (...puntos) => ({ puntos, color: "#495057" });

export const RETO_SERIE = {
  clave: "serie_fundido",
  titulo: "¿Qué le pasa a B2?",
  intro: "B1 y B2 son bombillos de 10 Ω en serie con una batería de 12 V. B1 solo soporta 2 W; B2 soporta 15 W.",
  pregunta: "Al cerrar el interruptor, B1 recibe más potencia de la que aguanta. ¿Qué le pasará a B2?",
  opciones: [["apaga", "B2 también se apaga"], ["brilla", "B2 brilla más que antes"], ["igual", "B2 sigue encendido igual"]],
  correcta: "apaga",
  explicacion: "En serie hay un solo camino. Cuando el filamento de B1 se corta, ese camino queda abierto y deja de pasar corriente por B2, aunque B2 esté sano.",
  detalle: "Con el interruptor cerrado pasan I = 12 V / (10 Ω + 10 Ω) = 0.6 A. Cada bombillo recibe P = I² × R = 0.6² × 10 = 3.6 W. Para B2 está bien (soporta 15 W), pero B1 recibe casi el doble de sus 2 W: su filamento se funde en menos de medio segundo. Si los bombillos estuvieran en paralelo, B2 seguiría encendido, porque tendría su propio camino.",
  reparar: "Repáralo de verdad: selecciona B1, elige una potencia máxima de 5 W o más y pulsa Reemplazar.",
  componentes: {
    obj_1: { tipo: "bateria", punto_a: [2, 0], punto_b: [4, 0], valor: 12, imax: 2 },
    obj_2: { tipo: "interruptor", punto_a: [0, 2], punto_b: [0, 4], cerrado: false },
    obj_3: { tipo: "bombillo", punto_a: [0, 6], punto_b: [0, 8], valor: 10, pmax: 2 },
    obj_4: { tipo: "bombillo", punto_a: [2, 10], punto_b: [4, 10], valor: 10, pmax: 15 },
  },
  cables: {
    obj_5: cable([2, 0], [0, 0], [0, 2]),
    obj_6: cable([0, 4], [0, 6]),
    obj_7: cable([0, 8], [0, 10], [2, 10]),
    obj_8: cable([4, 10], [6, 10], [6, 0], [4, 0]),
  },
  // se considera reparado cuando los dos bombillos encienden sin fundirse
  vigilar: ["obj_3", "obj_4"],
};
