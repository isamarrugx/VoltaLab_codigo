// Problemas aplicados: cada uno calcula sus propios números (calc) y arma sus pasos (pasos).
// Una pregunta tiene { texto, valor, unidad, pista }. Un paso sin pregunta solo explica.
// Los textos de las diapositivas de capacitores estaban en inglés: aquí van traducidos.

export const NIVELES_PROB = { 1: "Fácil", 2: "Intermedio", 3: "Difícil" };
export const GRUPOS_PROB = {
  dc: { titulo: "Circuitos con resistencias", sub: "Kirchhoff y reducción de circuitos" },
  cap: { titulo: "Capacitores", sub: "Serie, paralelo y límites de voltaje" },
};

export const num = (x, d = 2) => {
  const s = (+x.toFixed(d)).toString();
  return s === "-0" ? "0" : s;
};

// Resuelve A·x = b por eliminación gaussiana (sistemas pequeños).
export function resolverSistema(A, b) {
  const n = b.length;
  const M = A.map((f, i) => [...f, b[i]]);
  for (let c = 0; c < n; c++) {
    let p = c;
    for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r;
    [M[c], M[p]] = [M[p], M[c]];
    for (let r = c + 1; r < n; r++) {
      const k = M[r][c] / M[c][c];
      for (let j = c; j <= n; j++) M[r][j] -= k * M[c][j];
    }
  }
  const x = new Array(n).fill(0);
  for (let i = n - 1; i >= 0; i--) {
    let s = M[i][n];
    for (let j = i + 1; j < n; j++) s -= M[i][j] * x[j];
    x[i] = s / M[i][i];
  }
  return x;
}

const recip = (...c) => 1 / c.reduce((a, x) => a + 1 / x, 0);

export const PROBLEMAS = [
  /* ---------------------------------------------------------------- */
  {
    clave: "p26_64", grupo: "dc", nivel: 1, ref: "Problema 26.64", titulo: "Tres ramas en paralelo", figura: "f2664",
    enunciado: "¿Cuál debe ser la fem ε en la figura para que la corriente a través del resistor de 7.00 Ω sea 1.80 A? Cada fuente de fem tiene resistencia interna despreciable.",
    calc() {
      const e1 = 24, R1 = 3, R2 = 2, R3 = 7, I3 = 1.8;
      const V = I3 * R3;
      const I1 = (e1 - V) / R1;
      const I2 = I3 - I1;
      const e = V + R2 * I2;
      return { e1, R1, R2, R3, I3, V, I1, I2, e };
    },
    pasos(v) {
      return [
        { titulo: "Voltaje en el resistor de 7.00 Ω", foco: ["r3"],
          texto: "Las tres ramas están entre los mismos dos nodos, así que todas tienen el mismo voltaje que el resistor de 7.00 Ω.",
          pregunta: { texto: "¿Cuánto voltaje hay entre el nodo superior y el inferior?", valor: v.V, unidad: "V", pista: "Ley de Ohm: V = I · R." },
          lineas: [`V = I · R = ${num(v.I3)} A · ${num(v.R3)} Ω`, `V = ${num(v.V)} V`], resumen: `V = ${num(v.V)} V` },
        { titulo: "Corriente de la rama izquierda", foco: ["b1", "r1"],
          texto: "Sube desde el borne negativo: la batería aporta 24.0 V y el resistor de 3.00 Ω resta I₁ · 3.00. Eso debe ser igual a V.",
          pregunta: { texto: "¿Cuánto vale I₁ (corriente que sale del borne + de la batería de 24 V)?", valor: v.I1, unidad: "A", pista: "24.0 − 3.00 · I₁ = 12.6" },
          lineas: [`${num(v.e1)} − ${num(v.R1)} · I₁ = ${num(v.V)}`, `I₁ = (${num(v.e1)} − ${num(v.V)}) / ${num(v.R1)}`, `I₁ = ${num(v.I1)} A`], resumen: `I₁ = ${num(v.I1)} A` },
        { titulo: "Ley de corrientes en el nodo superior", foco: ["top"],
          texto: "Lo que entra al nodo es igual a lo que sale: I₁ + I₂ = I₃. Tomamos I₁ e I₂ saliendo del borne + de cada fuente y subiendo al nodo.",
          pregunta: { texto: "¿Cuánto vale I₂?", valor: v.I2, unidad: "A", pista: "I₂ = I₃ − I₁. Si te da negativa, no hay error: esa fuente se está cargando." },
          lineas: [`I₁ + I₂ = I₃`, `I₂ = ${num(v.I3)} − ${num(v.I1)}`, `I₂ = ${num(v.I2)} A`, "El signo negativo indica que la corriente real entra por el borne + de esa fuente."], destacar: [2], resumen: `I₂ = ${num(v.I2)} A` },
        { titulo: "Ley de voltajes en la rama central", foco: ["b2", "r2"],
          texto: "En esta rama el voltaje entre nodos es ε − 2.00 · I₂. Debe valer lo mismo que en las otras: 12.6 V.",
          pregunta: { texto: "¿Cuánto vale ε?", valor: v.e, unidad: "V", pista: "ε − 2.00 · I₂ = 12.6, con el I₂ que obtuviste (con su signo)." },
          lineas: [`ε − ${num(v.R2)} · I₂ = ${num(v.V)}`, `ε = ${num(v.V)} + ${num(v.R2)} · (${num(v.I2)})`, `ε = ${num(v.e)} V`], resumen: `ε = ${num(v.e)} V` },
      ];
    },
    respuesta: (v) => `ε = ${num(v.e)} V`,
  },

  /* ---------------------------------------------------------------- */
  {
    clave: "p26_66", grupo: "dc", nivel: 2, ref: "Problema 26.66", titulo: "Puente de resistores", figura: "f2666",
    enunciado: "a) Encuentre la corriente a través de la batería y de cada uno de los resistores en el circuito de la figura. b) ¿Cuál es la resistencia equivalente de la red de resistores?",
    calc() {
      const E = 14, R1 = 1, R2 = 2, R3 = 1, R4 = 2, R5 = 1;
      // Nodos intermedios V1 (izquierdo) y V2 (derecho); batería: arriba E, abajo 0.
      const g = (r) => 1 / r;
      const A = [[g(R1) + g(R4) + g(R3), -g(R3)], [-g(R3), g(R2) + g(R5) + g(R3)]];
      const b = [E * g(R1), E * g(R2)];
      const [V1, V2] = resolverSistema(A, b);
      const I1 = (E - V1) / R1, I2 = (E - V2) / R2, I4 = V1 / R4, I5 = V2 / R5, I3 = (V1 - V2) / R3;
      const Ib = I1 + I2, Req = E / Ib;
      return { E, R1, R2, R3, R4, R5, V1, V2, I1, I2, I3, I4, I5, Ib, Req, paralela: recip(R1 + R4, R2 + R5) };
    },
    pasos(v) {
      return [
        { titulo: "¿Se puede reducir?", foco: ["r1", "r2", "r3", "r4", "r5"],
          texto: "R₃ une los puntos medios de las dos columnas. Ninguna pareja está en serie ni en paralelo, así que primero hay que resolver el circuito con las leyes de Kirchhoff.",
          pregunta: null,
          lineas: ["Es un puente: no se reduce solo con serie y paralelo.", "Plan: potenciales V₁ y V₂ en los nodos del centro, con el borne − de la batería como 0 V."], resumen: "Es un puente: se resuelve por nodos" },
        { titulo: "Ecuaciones de los nodos", foco: ["n1", "n2"],
          texto: "Ley de corrientes en cada nodo del centro: lo que llega por arriba es lo que baja más lo que pasa por R₃.",
          pregunta: null,
          lineas: [`Nodo 1:  (14 − V₁)/${num(v.R1)} = V₁/${num(v.R4)} + (V₁ − V₂)/${num(v.R3)}`, `Nodo 2:  (14 − V₂)/${num(v.R2)} + (V₁ − V₂)/${num(v.R3)} = V₂/${num(v.R5)}`, `Ordenado:  2.5 V₁ − V₂ = 14   y   −V₁ + 2.5 V₂ = 7`], destacar: [2], resumen: "2.5 V₁ − V₂ = 14   y   −V₁ + 2.5 V₂ = 7" },
        { titulo: "Resolver los potenciales", foco: ["n1", "n2"],
          texto: "Despeja V₁ de la primera ecuación y sustitúyela en la segunda.",
          pregunta: { texto: "¿Cuánto vale V₂ (nodo derecho)?", valor: v.V2, unidad: "V", pista: "V₁ = 2.5 V₂ − 7. Reemplázala en 2.5 V₁ − V₂ = 14." },
          lineas: [`V₁ = 2.5 V₂ − 7`, `2.5 (2.5 V₂ − 7) − V₂ = 14   →   5.25 V₂ = 31.5`, `V₂ = ${num(v.V2)} V    V₁ = ${num(v.V1)} V`], destacar: [2], resumen: `V₁ = ${num(v.V1)} V, V₂ = ${num(v.V2)} V` },
        { titulo: "Corriente por R₃", foco: ["r3"],
          texto: "R₃ está entre los nodos 1 y 2. La corriente va del potencial mayor al menor.",
          pregunta: { texto: "¿Cuánta corriente pasa por R₃ (de izquierda a derecha)?", valor: v.I3, unidad: "A", pista: "I₃ = (V₁ − V₂) / R₃" },
          lineas: [`I₃ = (V₁ − V₂) / R₃ = (${num(v.V1)} − ${num(v.V2)}) / ${num(v.R3)}`, `I₃ = ${num(v.I3)} A`], resumen: `I₃ = ${num(v.I3)} A` },
        { titulo: "Corrientes de las otras ramas", foco: ["r1", "r2", "r4", "r5"],
          texto: "Cada resistor ve la diferencia de potencial entre sus extremos.",
          pregunta: { texto: "¿Cuánto vale la corriente por R₁ (de 1.00 Ω, arriba a la izquierda)?", valor: v.I1, unidad: "A", pista: "I₁ = (14 − V₁) / R₁" },
          lineas: [`I₁ = (14 − ${num(v.V1)}) / ${num(v.R1)} = ${num(v.I1)} A`, `I₂ = (14 − ${num(v.V2)}) / ${num(v.R2)} = ${num(v.I2)} A`, `I₄ = ${num(v.V1)} / ${num(v.R4)} = ${num(v.I4)} A`, `I₅ = ${num(v.V2)} / ${num(v.R5)} = ${num(v.I5)} A`], destacar: [0, 1, 2, 3], resumen: `I₁ = ${num(v.I1)} A, I₂ = ${num(v.I2)} A, I₄ = ${num(v.I4)} A, I₅ = ${num(v.I5)} A` },
        { titulo: "Corriente de la batería", foco: ["bat"],
          texto: "Toda la corriente de la batería se reparte en las dos columnas de arriba.",
          pregunta: { texto: "¿Cuánta corriente entrega la batería?", valor: v.Ib, unidad: "A", pista: "Suma las corrientes que salen hacia R₁ y R₂." },
          lineas: [`I = I₁ + I₂ = ${num(v.I1)} + ${num(v.I2)}`, `I = ${num(v.Ib)} A`], resumen: `I batería = ${num(v.Ib)} A` },
        { titulo: "Resistencia equivalente", foco: ["bat"],
          texto: "Lo que la batería «ve» es una sola resistencia que da esa misma corriente con 14.0 V.",
          pregunta: { texto: "¿Cuánto vale Req?", valor: v.Req, unidad: "Ω", pista: "Req = V / I de la batería." },
          lineas: [`Req = V / I = ${num(v.E)} V / ${num(v.Ib)} A`, `Req = ${num(v.Req)} Ω`, `Si ignoraras R₃ saldría ${num(v.paralela)} Ω: por eso el puente cambia el resultado.`], destacar: [1], resumen: `Req = ${num(v.Req)} Ω` },
      ];
    },
    respuesta: (v) => `I batería = ${num(v.Ib)} A · Req = ${num(v.Req)} Ω`,
  },

  /* ---------------------------------------------------------------- */
  {
    clave: "p26_34", grupo: "dc", nivel: 3, ref: "Problema 26.34", titulo: "Ramas, potencia y amperímetro", figura: "f2634",
    enunciado: "En el circuito de la figura, el resistor de 6.0 Ω consume energía a una razón de 24 J/s cuando la corriente a través de él fluye como se muestra. a) Calcule la corriente a través del amperímetro A. b) ¿Cuáles son la polaridad y la fem ε de la batería, suponiendo que tiene una resistencia interna despreciable?",
    calc() {
      const P = 24, R6 = 6, R3 = 3, E25 = 25;
      const Imid = Math.sqrt(P / R6);
      const Vtb = -R3 * Imid + E25 - R6 * Imid;
      const par = 20 * 20 / 40, Rder = par + 19 + 1;
      const Ia = Vtb / Rder;
      const Iizq = Imid - Ia;
      const Rizq = 17 + 13;
      const e = Vtb - Rizq * Iizq; // fem con el signo de la polaridad dibujada (+ arriba)
      return { P, R6, R3, E25, Imid, Vtb, par, Rder, Ia, Iizq, Rizq, e };
    },
    pasos(v) {
      return [
        { titulo: "Corriente en el resistor de 6.0 Ω", foco: ["r6"],
          texto: "Conoces la potencia y la resistencia. La flecha indica que esa corriente sube por la rama central.",
          pregunta: { texto: "¿Cuánta corriente pasa por la rama central?", valor: v.Imid, unidad: "A", pista: "P = I² · R, entonces I = √(P / R)." },
          lineas: [`P = I² · R   →   I = √(${num(v.P)} / ${num(v.R6)})`, `I = ${num(v.Imid)} A`], resumen: `I central = ${num(v.Imid)} A (hacia arriba)` },
        { titulo: "Voltaje entre el nodo de arriba y el de abajo", foco: ["r6", "b25", "r3m"],
          texto: "Sube por la rama central de abajo hacia arriba: el resistor de 3.0 Ω resta, la batería de 25 V suma (entras por el −), el de 6.0 Ω resta.",
          pregunta: { texto: "¿Cuánto vale V(arriba) − V(abajo)?", valor: v.Vtb, unidad: "V", pista: "−3.0 · I + 25 − 6.0 · I, con I = 2 A." },
          lineas: [`V_arriba − V_abajo = −${num(v.R3)}·${num(v.Imid)} + ${num(v.E25)} − ${num(v.R6)}·${num(v.Imid)}`, `V_arriba − V_abajo = ${num(v.Vtb)} V`], resumen: `V arriba − V abajo = ${num(v.Vtb)} V` },
        { titulo: "Reducir la rama derecha", foco: ["rp1", "rp2", "r19", "amp", "r1"],
          texto: "Los dos resistores de 20.0 Ω están en paralelo; ese par queda en serie con 19 Ω y 1.0 Ω. El amperímetro ideal no tiene resistencia.",
          pregunta: { texto: "¿Cuánto vale la resistencia total de la rama derecha?", valor: v.Rder, unidad: "Ω", pista: "20 ∥ 20 = 10 Ω; luego 10 + 19 + 1." },
          lineas: [`20.0 ∥ 20.0 = ${num(v.par)} Ω`, `R_der = ${num(v.par)} + 19 + 1.0 = ${num(v.Rder)} Ω`], resumen: `R rama derecha = ${num(v.Rder)} Ω` },
        { titulo: "a) Corriente del amperímetro", foco: ["r19", "amp"],
          texto: "La rama derecha está entre los mismos dos nodos que la central.",
          pregunta: { texto: "¿Cuánto marca el amperímetro?", valor: v.Ia, unidad: "A", pista: "I = V / R con el voltaje y la resistencia de los pasos anteriores." },
          lineas: [`I_A = V / R_der = ${num(v.Vtb)} / ${num(v.Rder)}`, `I_A = ${num(v.Ia, 3)} A`], resumen: `I amperímetro = ${num(v.Ia, 3)} A` },
        { titulo: "Corriente de la rama izquierda", foco: ["nodeT"],
          texto: "En el nodo de arriba entra la corriente de la rama central y sale la de las otras dos ramas.",
          pregunta: { texto: "¿Cuánta corriente sale por la rama izquierda?", valor: v.Iizq, unidad: "A", pista: "I_izq = 2 − I_A" },
          lineas: [`I_central = I_A + I_izq`, `I_izq = ${num(v.Imid)} − ${num(v.Ia, 3)} = ${num(v.Iizq, 3)} A`, "Fluye desde el nodo de arriba hacia la izquierda y baja por el lado de la batería."], destacar: [1], resumen: `I rama izquierda = ${num(v.Iizq, 3)} A` },
        { titulo: "b) Fem y polaridad de ε", foco: ["e", "r17", "r13"],
          texto: "Recorre la rama izquierda desde el nodo de arriba al de abajo, siguiendo la corriente. Si entras por el borne + dibujado, la batería resta ε.",
          pregunta: { texto: "¿Cuánto vale la magnitud de ε?", valor: Math.abs(v.e), unidad: "V", pista: "V_arriba − V_abajo = 17·I + 13·I + ε. Despeja ε." },
          lineas: [`${num(v.Vtb)} = (${num(17)} + ${num(13)}) · ${num(v.Iizq, 3)} + ε`, `ε = ${num(v.Vtb)} − ${num(v.Rizq * v.Iizq, 1)} = ${num(v.e, 1)} V`, `Salió negativa: la polaridad es la contraria a la dibujada.`, `ε = ${num(Math.abs(v.e))} V con el borne + abajo.`], destacar: [3], resumen: `ε = ${num(Math.abs(v.e))} V, borne + abajo` },
      ];
    },
    respuesta: (v) => `I amperímetro = ${num(v.Ia, 3)} A · ε = ${num(Math.abs(v.e))} V (+ abajo)`,
  },

  /* ---------------------------------------------------------------- */
  {
    clave: "c56", grupo: "cap", nivel: 1, ref: "Problema 56", titulo: "Tres capacitores en serie", figura: "fc56",
    enunciado: "¿Cuáles son la carga y la diferencia de potencial en cada capacitor de la figura?",
    calc() {
      const V = 30, C1 = 12, C2 = 4, C3 = 6;
      const Ceq = recip(C1, C2, C3);
      const Q = Ceq * V;
      return { V, C1, C2, C3, Ceq, Q, V1: Q / C1, V2: Q / C2, V3: Q / C3 };
    },
    pasos(v) {
      return [
        { titulo: "Capacitancia equivalente", foco: ["c1", "c2", "c3"],
          texto: "Los tres están uno tras otro, sin ramas: están en serie. Se suman los inversos.",
          pregunta: { texto: "¿Cuánto vale Ceq?", valor: v.Ceq, unidad: "μF", pista: "1/Ceq = 1/12 + 1/4 + 1/6" },
          lineas: [`1/Ceq = 1/${v.C1} + 1/${v.C2} + 1/${v.C3} = ${num(1 / v.Ceq)}`, `Ceq = ${num(v.Ceq)} μF`], resumen: `Ceq = ${num(v.Ceq)} μF` },
        { titulo: "Carga de cada capacitor", foco: ["bat"],
          texto: "En serie, todos almacenan la misma carga, igual a la del equivalente.",
          pregunta: { texto: "¿Cuánta carga tiene cada capacitor?", valor: v.Q, unidad: "μC", pista: "Q = Ceq · V" },
          lineas: [`Q = Ceq · V = ${num(v.Ceq)} μF · ${num(v.V)} V`, `Q = ${num(v.Q)} μC en cada uno`], resumen: `Q = ${num(v.Q)} μC en cada uno` },
        { titulo: "Voltaje en cada capacitor", foco: ["c1", "c2", "c3"],
          texto: "Cada uno tiene su propio voltaje: V = Q / C. El más pequeño de los tres se lleva la mayor parte.",
          pregunta: { texto: "¿Cuánto voltaje hay en el capacitor de 4 μF?", valor: v.V2, unidad: "V", pista: "V₂ = Q / C₂" },
          lineas: [`V₁ = ${num(v.Q)} / ${v.C1} = ${num(v.V1)} V`, `V₂ = ${num(v.Q)} / ${v.C2} = ${num(v.V2)} V`, `V₃ = ${num(v.Q)} / ${v.C3} = ${num(v.V3)} V`, `Comprobación: ${num(v.V1)} + ${num(v.V2)} + ${num(v.V3)} = ${num(v.V1 + v.V2 + v.V3)} V`], destacar: [1, 3], resumen: `V₁ = ${num(v.V1)} V, V₂ = ${num(v.V2)} V, V₃ = ${num(v.V3)} V` },
      ];
    },
    respuesta: (v) => `Q = ${num(v.Q)} μC · V = ${num(v.V1)}, ${num(v.V2)} y ${num(v.V3)} V`,
  },

  /* ---------------------------------------------------------------- */
  {
    clave: "c58", grupo: "cap", nivel: 2, ref: "Problema 58", titulo: "Serie dentro de un paralelo", figura: "fc58",
    enunciado: "¿Cuáles son la carga y la diferencia de potencial en cada capacitor de la figura?",
    calc() {
      const V = 9, C1 = 5, C2 = 4, C3 = 6;
      const C23 = recip(C2, C3);
      const Ceq = C1 + C23;
      const Q1 = C1 * V, Q23 = C23 * V;
      return { V, C1, C2, C3, C23, Ceq, Q1, Q23, V2: Q23 / C2, V3: Q23 / C3 };
    },
    pasos(v) {
      return [
        { titulo: "Reducir la rama derecha", foco: ["c2", "c3"],
          texto: "C₂ y C₃ están uno tras otro en la misma rama: serie.",
          pregunta: { texto: "¿Cuánto vale C₂₃ (C₂ y C₃ en serie)?", valor: v.C23, unidad: "μF", pista: "(C₂ · C₃) / (C₂ + C₃)" },
          lineas: [`C₂₃ = (${v.C2} · ${v.C3}) / (${v.C2} + ${v.C3})`, `C₂₃ = ${num(v.C23)} μF`], resumen: `C₂₃ = ${num(v.C23)} μF` },
        { titulo: "Capacitancia equivalente", foco: ["c1", "c2", "c3"],
          texto: "Ahora C₁ y C₂₃ están en paralelo: comparten los mismos 9 V. En paralelo, las capacitancias se suman.",
          pregunta: { texto: "¿Cuánto vale Ceq?", valor: v.Ceq, unidad: "μF", pista: "C₁ + C₂₃" },
          lineas: [`Ceq = C₁ + C₂₃ = ${v.C1} + ${num(v.C23)}`, `Ceq = ${num(v.Ceq)} μF`], resumen: `Ceq = ${num(v.Ceq)} μF` },
        { titulo: "Carga de C₁", foco: ["c1"],
          texto: "C₁ está conectado directo a la batería, con los 9 V completos.",
          pregunta: { texto: "¿Cuánta carga tiene C₁?", valor: v.Q1, unidad: "μC", pista: "Q = C · V" },
          lineas: [`Q₁ = C₁ · V = ${v.C1} · ${v.V}`, `Q₁ = ${num(v.Q1)} μC`], resumen: `Q₁ = ${num(v.Q1)} μC, V₁ = ${num(v.V)} V` },
        { titulo: "Carga de C₂ y C₃", foco: ["c2", "c3"],
          texto: "La rama derecha tiene 9 V en total y se comporta como un solo capacitor C₂₃. En serie, C₂ y C₃ guardan la misma carga.",
          pregunta: { texto: "¿Cuánta carga tiene cada uno, C₂ y C₃?", valor: v.Q23, unidad: "μC", pista: "Q = C₂₃ · V" },
          lineas: [`Q₂ = Q₃ = C₂₃ · V = ${num(v.C23)} · ${v.V}`, `Q₂ = Q₃ = ${num(v.Q23)} μC`], resumen: `Q₂ = Q₃ = ${num(v.Q23)} μC` },
        { titulo: "Voltaje de C₂ y C₃", foco: ["c2", "c3"],
          texto: "Con la carga ya conocida, el voltaje de cada uno sale de V = Q / C.",
          pregunta: { texto: "¿Cuánto voltaje hay en C₂ (4 μF)?", valor: v.V2, unidad: "V", pista: "V₂ = Q₂ / C₂" },
          lineas: [`V₂ = ${num(v.Q23)} / ${v.C2} = ${num(v.V2)} V`, `V₃ = ${num(v.Q23)} / ${v.C3} = ${num(v.V3)} V`, `Comprobación: ${num(v.V2)} + ${num(v.V3)} = ${num(v.V2 + v.V3)} V`], destacar: [2], resumen: `V₂ = ${num(v.V2)} V, V₃ = ${num(v.V3)} V` },
      ];
    },
    respuesta: (v) => `Ceq = ${num(v.Ceq)} μF · Q₁ = ${num(v.Q1)} μC · Q₂ = Q₃ = ${num(v.Q23)} μC`,
  },

  /* ---------------------------------------------------------------- */
  {
    clave: "c48", grupo: "cap", nivel: 3, ref: "Problema 48", titulo: "Voltaje de ruptura de la combinación", figura: "fc48",
    enunciado: "Cada capacitor de la combinación de la figura tiene un voltaje de ruptura de 15.0 V. ¿Cuál es el voltaje de ruptura de la combinación?",
    calc() {
      const Vr = 15, Ca = 20, Cm = 10;
      const Cg = Ca + Ca;
      const Ceq = recip(Cg, Cm, Cg);
      const Qg = Cg * Vr, Qm = Cm * Vr;
      const Qmax = Math.min(Qg, Qm);
      const Vmax = Qmax / Ceq;
      return { Vr, Ca, Cm, Cg, Ceq, Qg, Qm, Qmax, Vmax, Vgrupo: Qmax / Cg };
    },
    pasos(v) {
      return [
        { titulo: "Reducir cada grupo", foco: ["ga1", "ga2", "gb1", "gb2"],
          texto: "Cada pareja de 20.0 μF está en paralelo, así que se suman.",
          pregunta: { texto: "¿Cuánto vale cada grupo en paralelo?", valor: v.Cg, unidad: "μF", pista: "20 + 20" },
          lineas: [`C_grupo = ${v.Ca} + ${v.Ca} = ${num(v.Cg)} μF`, `Queda en serie: ${num(v.Cg)} μF, ${v.Cm} μF y ${num(v.Cg)} μF.`], resumen: `Cada grupo = ${num(v.Cg)} μF` },
        { titulo: "Capacitancia equivalente", foco: ["ga1", "ga2", "cm", "gb1", "gb2"],
          texto: "Ahora los tres bloques están en serie.",
          pregunta: { texto: "¿Cuánto vale Ceq?", valor: v.Ceq, unidad: "μF", pista: "1/Ceq = 1/40 + 1/10 + 1/40" },
          lineas: [`1/Ceq = 1/${num(v.Cg)} + 1/${v.Cm} + 1/${num(v.Cg)} = ${num(1 / v.Ceq, 3)}`, `Ceq = ${num(v.Ceq)} μF`], resumen: `Ceq = ${num(v.Ceq)} μF` },
        { titulo: "Carga máxima de cada bloque", foco: ["ga1", "ga2", "cm", "gb1", "gb2"],
          texto: "En serie todos los bloques guardan la misma carga, pero cada uno puede aguantar una carga distinta antes de romperse: Q_máx = C · 15 V.",
          pregunta: { texto: "¿Cuál es la carga máxima que aguanta el capacitor de 10 μF?", valor: v.Qm, unidad: "μC", pista: "Q = C · V con V = 15 V." },
          lineas: [`Grupo de ${num(v.Cg)} μF:  Q_máx = ${num(v.Cg)} · ${v.Vr} = ${num(v.Qg)} μC`, `Capacitor de ${v.Cm} μF:  Q_máx = ${v.Cm} · ${v.Vr} = ${num(v.Qm)} μC`, `Como la carga es la misma, manda el menor: ${num(v.Qmax)} μC.`], destacar: [2], resumen: `Q máx = ${num(v.Qmax)} μC (limita el de ${v.Cm} μF)` },
        { titulo: "Voltaje de ruptura de la combinación", foco: ["bat"],
          texto: "Con esa carga máxima, el voltaje total es el del capacitor equivalente.",
          pregunta: { texto: "¿Cuál es el voltaje de ruptura de la combinación?", valor: v.Vmax, unidad: "V", pista: "V = Q_máx / Ceq" },
          lineas: [`V_máx = Q_máx / Ceq = ${num(v.Qmax)} μC / ${num(v.Ceq)} μF`, `V_máx = ${num(v.Vmax)} V`, `Cada grupo queda con ${num(v.Vgrupo, 2)} V y el de ${v.Cm} μF con 15 V: el que se rompe primero es el de ${v.Cm} μF.`], destacar: [1], resumen: `V ruptura = ${num(v.Vmax)} V` },
      ];
    },
    respuesta: (v) => `V ruptura = ${num(v.Vmax)} V`,
  },
];
