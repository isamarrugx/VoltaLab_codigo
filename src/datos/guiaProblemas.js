// Guía de conceptos de los problemas aplicados. Se escribe para alguien que NO los conoce:
// cada concepto dice qué es, por qué funciona, su fórmula y un ejemplo pequeño con números.
// Los problemas indican qué conceptos usan (`conceptos`) y cada paso cuál aplica (`concepto`).

export const CONCEPTOS = {
  // ---------------- circuitos con resistencias ----------------
  ohm: {
    titulo: "Ley de Ohm", corto: "Ley de Ohm",
    texto: ["La corriente que pasa por un resistor es proporcional al voltaje entre sus extremos: si duplicas el voltaje, se duplica la corriente.", "La resistencia R dice cuánto «frena» el resistor. Con la fórmula puedes despejar cualquiera de las tres magnitudes si conoces las otras dos."],
    formula: "V = I · R", simbolos: [["V", "voltaje entre los extremos (V)"], ["I", "corriente que lo atraviesa (A)"], ["R", "resistencia (Ω)"]],
    ejemplo: ["Por un resistor de 7 Ω pasan 1.8 A. ¿Qué voltaje tiene?", "V = I · R = 1.8 A · 7 Ω = 12.6 V"],
  },
  fem: {
    titulo: "Fem: el empuje de una fuente", corto: "Fem (ε)",
    texto: ["La fem (fuerza electromotriz, se escribe ε) es el voltaje que una batería o fuente le da al circuito. Se mide en voltios, igual que cualquier voltaje.", "«Resistencia interna despreciable» significa que la batería es ideal: entre sus bornes hay exactamente ε voltios, pase la corriente que pase.", "La raya larga del símbolo es el borne + y la corta es el −. Si atraviesas la batería del − al +, el potencial SUBE ε; del + al −, BAJA ε."],
    formula: "V₊ − V₋ = ε",
    ejemplo: ["Una batería de 24 V con el − a 0 V.", "Su borne + está a 0 + 24 = 24 V."],
  },
  nodos: {
    titulo: "Nodos y ramas", corto: "Nodos y ramas",
    texto: ["Un NODO es un punto donde se unen tres o más cables. Todos los puntos unidos solo por cable (sin resistores ni fuentes en medio) están al mismo potencial: cuentan como un mismo nodo.", "Una RAMA es un camino entre dos nodos. Por toda una rama pasa la misma corriente, porque no tiene dónde dividirse.", "Si varias ramas conectan los mismos dos nodos, todas tienen el MISMO voltaje entre sus extremos: es lo que significa estar en paralelo."],
    ejemplo: ["Tres ramas unen el nodo de arriba con el de abajo.", "Si una tiene 12.6 V entre esos nodos, las otras dos también tienen 12.6 V."],
  },
  lck: {
    titulo: "Ley de corrientes de Kirchhoff (LCK)", corto: "Ley de corrientes (LCK)",
    texto: ["La carga no se acumula ni desaparece en un nodo: toda la corriente que entra tiene que salir.", "Para usarla, dibuja una flecha (un sentido supuesto) para cada corriente. Las que entran al nodo van a un lado de la ecuación y las que salen, al otro.", "Si al resolver una corriente sale NEGATIVA, no hay error: significa que en realidad va en el sentido contrario a la flecha que dibujaste."],
    formula: "Σ I que entran = Σ I que salen",
    ejemplo: ["Al nodo llegan I₁ = 4.2 A e I₂, y sale I₃ = 1.8 A.", "4.2 + I₂ = 1.8  →  I₂ = −2.4 A: en realidad I₂ sale del nodo."],
  },
  lvk: {
    titulo: "Ley de voltajes de Kirchhoff (LVK)", corto: "Ley de voltajes (LVK)",
    texto: ["Si recorres un camino cerrado y vuelves al punto de partida, vuelves al mismo potencial: la suma de las subidas y bajadas de voltaje es cero. También sirve para un camino entre dos nodos: la suma da la diferencia de potencial entre ellos.", "Reglas de signo al recorrer el camino:", "• Resistor recorrido A FAVOR de la corriente: el potencial BAJA I · R (se resta).", "• Resistor recorrido EN CONTRA de la corriente: el potencial SUBE I · R (se suma).", "• Fuente recorrida del − al +: SUBE ε (se suma). Del + al −: BAJA ε (se resta)."],
    formula: "Σ (subidas) − Σ (bajadas) = 0",
    ejemplo: ["Subes desde el − de una batería de 24 V y luego bajas por un resistor de 3 Ω con I₁ a favor de la corriente.", "V_arriba − V_abajo = 24 − 3 · I₁"],
  },
  serie_par: {
    titulo: "Resistores en serie y en paralelo", corto: "Serie y paralelo",
    texto: ["SERIE: uno tras otro en la misma rama, sin nodos entre ellos. Por todos pasa la misma corriente y sus resistencias se SUMAN.", "PARALELO: conectados a los mismos dos nodos. Todos tienen el mismo voltaje y la resistencia total es MENOR que la más pequeña.", "Para dos resistores en paralelo hay un atajo: el producto dividido por la suma. Dos resistores IGUALES en paralelo dan la mitad de uno.", "Si un grupo no está ni en serie ni en paralelo (por ejemplo, un puente), no se puede reducir así: hay que usar las leyes de Kirchhoff."],
    formula: "Serie: R = R₁ + R₂    Paralelo: 1/R = 1/R₁ + 1/R₂",
    ejemplo: ["Dos de 20 Ω en paralelo, y luego en serie con 19 Ω y 1 Ω.", "20 ∥ 20 = 10 Ω  →  10 + 19 + 1 = 30 Ω"],
  },
  req: {
    titulo: "Resistencia equivalente", corto: "Resistencia equivalente",
    texto: ["Es la resistencia de UN solo resistor que, puesto en lugar de toda la red, haría que la batería entregue la misma corriente.", "Si ya conoces el voltaje de la batería y la corriente que entrega, sale directo de la ley de Ohm."],
    formula: "Req = V_batería / I_batería",
    ejemplo: ["Una batería de 14 V entrega 10 A.", "Req = 14 V / 10 A = 1.4 Ω"],
  },
  nodal: {
    titulo: "Método de los potenciales de nodo", corto: "Potenciales de nodo",
    texto: ["Cuando el circuito no se puede reducir, se le pone nombre al potencial de cada nodo desconocido (V₁, V₂…), tomando un nodo como 0 V.", "La corriente por cada resistor es (potencial de un extremo − potencial del otro) / R. Se escribe la ley de corrientes (LCK) en cada nodo desconocido.", "Queda un sistema con tantas ecuaciones como incógnitas. Se resuelve despejando una variable y sustituyéndola en la otra."],
    formula: "I = (V_a − V_b) / R",
    ejemplo: ["Un resistor de 1 Ω va de un nodo a 14 V a otro a V₁.", "Corriente que baja por él: (14 − V₁) / 1"],
  },
  potencia: {
    titulo: "Potencia en un resistor", corto: "Potencia",
    texto: ["La potencia es la energía que un resistor convierte en calor cada segundo. 1 vatio = 1 joule por segundo (J/s).", "Si conoces la potencia y la resistencia, puedes encontrar la corriente despejando de P = I² · R."],
    formula: "P = V · I = I² · R = V² / R",
    ejemplo: ["Un resistor de 6 Ω consume 24 J/s (24 W).", "I = √(P / R) = √(24 / 6) = √4 = 2 A"],
  },
  amperimetro: {
    titulo: "Amperímetro ideal", corto: "Amperímetro",
    texto: ["Un amperímetro mide la corriente que pasa por la rama en la que está, por eso se conecta en serie.", "Si es ideal, su resistencia es 0 Ω: en los cálculos es como un trozo de cable. Solo hay que leer la corriente de esa rama."],
  },
  // ---------------- capacitores ----------------
  capacitor: {
    titulo: "¿Qué es un capacitor?", corto: "Capacitor",
    texto: ["Un capacitor son dos placas conductoras separadas por un aislante. Al conectarlo a una batería, una placa se carga con +Q y la otra con −Q: guarda carga (y energía).", "La CAPACITANCIA C dice cuánta carga guarda por cada voltio. Se mide en faradios (F); en los problemas aparecen microfaradios: 1 μF = 0.000001 F.", "La carga se mide en culombios (C). Con μF y voltios, la carga sale en microculombios (μC)."],
    formula: "Q = C · V", simbolos: [["Q", "carga en cada placa (μC)"], ["C", "capacitancia (μF)"], ["V", "voltaje entre las placas (V)"]],
    ejemplo: ["Un capacitor de 12 μF conectado a 9 V.", "Q = 12 μF · 9 V = 108 μC"],
  },
  cap_serie: {
    titulo: "Capacitores en serie", corto: "Capacitores en serie",
    texto: ["En serie, uno tras otro, TODOS guardan la MISMA carga: la carga que sale de una placa llega a la siguiente.", "El voltaje de la batería se reparte, y el capacitor MÁS PEQUEÑO se lleva más voltaje (V = Q / C).", "Ojo: la fórmula es al revés que con resistores. En serie se suman los INVERSOS, así que la capacitancia total es menor que la más pequeña."],
    formula: "1/Ceq = 1/C₁ + 1/C₂ + 1/C₃",
    ejemplo: ["12 μF, 4 μF y 6 μF en serie.", "1/Ceq = 1/12 + 1/4 + 1/6 = 0.5  →  Ceq = 2 μF"],
  },
  cap_paralelo: {
    titulo: "Capacitores en paralelo", corto: "Capacitores en paralelo",
    texto: ["En paralelo todos tienen el MISMO voltaje (están entre los mismos dos nodos).", "Es como tener placas más grandes: las capacitancias se SUMAN. Cada uno guarda su propia carga, Q = C · V."],
    formula: "Ceq = C₁ + C₂ + …",
    ejemplo: ["Dos capacitores de 20 μF en paralelo.", "Ceq = 20 + 20 = 40 μF"],
  },
  ruptura: {
    titulo: "Voltaje de ruptura", corto: "Voltaje de ruptura",
    texto: ["Si el voltaje de un capacitor pasa de cierto valor, el aislante entre las placas deja pasar una chispa y el capacitor se daña: ese es su voltaje de ruptura.", "En una combinación en serie, todos tienen la misma carga. El que primero llega a su límite manda: la carga máxima de toda la combinación es la carga máxima del capacitor más débil."],
    formula: "Q_máx = C · V_ruptura",
    ejemplo: ["Un capacitor de 10 μF que aguanta 15 V.", "Q_máx = 10 μF · 15 V = 150 μC"],
  },
};

export const GUIA = {
  dc: ["fem", "ohm", "nodos", "lck", "lvk", "serie_par", "req", "nodal", "potencia", "amperimetro"],
  cap: ["capacitor", "cap_serie", "cap_paralelo", "ruptura"],
};
