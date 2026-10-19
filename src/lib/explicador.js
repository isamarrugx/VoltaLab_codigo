// Mediciones, errores amables y explicaciones (port de explicador.py).
import * as F from "./formato.js";
import { diagnosticar, exportar } from "./diagnostico.js";
import { resolverCircuito, clasificarTopologia, construirNodos, ErrorCircuito, clave } from "./motor.js";

const PREFIJOS = { resistencia: "R", bombillo: "B", interruptor: "S", fusible: "F" };
export const NOMBRE_TIPO = { resistencia: "resistencia", bombillo: "bombillo", interruptor: "interruptor", bateria: "batería", fusible: "fusible" };

const ordenTag = (t) => { const n = parseInt(String(t).split("_").pop(), 10); return Number.isNaN(n) ? 0 : n; };

export function nombresComponentes(componentes) {
  const cont = {}, nombres = {};
  for (const tag of Object.keys(componentes).sort((a, b) => ordenTag(a) - ordenTag(b))) {
    const tipo = componentes[tag].tipo;
    if (tipo === "bateria") { nombres[tag] = "Batería"; continue; }
    cont[tipo] = (cont[tipo] || 0) + 1;
    nombres[tag] = `${PREFIJOS[tipo]}${cont[tipo]}`;
  }
  return nombres;
}

export function componentesDesdeDefinicion(def) {
  const componentes = {}, cables = {};
  let n = 0;
  const tag = () => `obj_${++n}`;
  if (def.bateria) { const [a, b, v] = def.bateria; componentes[tag()] = { tipo: "bateria", punto_a: a, punto_b: b, valor: v }; }
  for (const [a, b, v] of def.resistencias || []) componentes[tag()] = { tipo: "resistencia", punto_a: a, punto_b: b, valor: v };
  for (const [a, b, v] of def.bombillos || []) componentes[tag()] = { tipo: "bombillo", punto_a: a, punto_b: b, valor: v, brillo: null };
  for (const [a, b, c] of def.interruptores || []) componentes[tag()] = { tipo: "interruptor", punto_a: a, punto_b: b, cerrado: c };
  for (const [a, b, v] of def.fusibles || []) componentes[tag()] = { tipo: "fusible", punto_a: a, punto_b: b, valor: v };
  for (const [a, b] of def.cables || []) cables[tag()] = { puntos: [a, b], color: "#4B625F" };
  return { componentes, cables };
}

export function errorAmigable(mensaje) {
  const m = mensaje.toLowerCase();
  if (m.includes("cortocircuito")) return ["Cortocircuito", "Los dos bornes de la batería quedaron unidos por un cable sin pasar por ningún componente. La corriente sería enorme y la batería se dañaría.", "Haz que el camino del + al − pase por una resistencia o un bombillo."];
  if (m.includes("ninguna resistencia") || m.includes("no circula corriente")) return ["Circuito abierto", "La corriente no encuentra una trayectoria cerrada: sale de la batería pero no puede volver a ella.", "Revisa que cada terminal esté unido con un cable y que los interruptores estén cerrados."];
  if (m.includes("flotante")) return ["Una parte del circuito está suelta", "Hay componentes conectados entre sí que no llegan a la batería, así que no se puede saber qué voltaje tienen.", "Une esa parte al resto del circuito o elimínala."];
  if (m.includes("valor invalido") || m.includes("valor inválido")) return ["Valor no válido", "Cada resistencia y cada bombillo deben tener un valor mayor que 0 Ω.", "Selecciona el componente y escribe un valor positivo, por ejemplo 100."];
  if (m.includes("al menos una resistencia")) return ["Falta un componente", "La corriente necesita pasar por algo que la aproveche: una resistencia o un bombillo.", "Coloca una resistencia o un bombillo entre los bornes de la batería."];
  if (m.includes("voltaje")) return ["Voltaje no válido", "El voltaje de la batería debe ser un número positivo.", "Selecciona la batería y elige un voltaje, por ejemplo 9 V."];
  return ["No se pudo calcular", mensaje, "Revisa que haya un camino continuo desde el borne + hasta el borne −."];
}

function medicionBase(componentes, nombres, diag) {
  const bat = Object.values(componentes).find((c) => c.tipo === "bateria");
  const med = { V: bat ? bat.valor : 0, I: 0, Req: Infinity, P: 0, abierto: true, tipo: "abierto", clasificacion: null,
    resultado: null, tagsR: [], componentes: {}, interruptores: {}, nombres, diag };
  for (const [tag, c] of Object.entries(componentes)) {
    const nombre = nombres[tag];
    if (c.tipo === "resistencia" || c.tipo === "bombillo") med.componentes[nombre] = { tipo: c.tipo, tag, R: c.valor, V: 0, I: 0, P: 0 };
    else if (c.tipo === "interruptor") med.interruptores[nombre] = c.cerrado;
  }
  return med;
}

// -> { med, diag, error }
export function analizar(componentes, cables) {
  const diag = diagnosticar(componentes, cables);
  const nombres = nombresComponentes(componentes);
  if (diag.estado === "abierto") return { med: medicionBase(componentes, nombres, diag), diag, error: null };
  if (diag.estado !== "cerrado") return { med: null, diag, error: [diag.titulo, diag.mensaje, diag.pista] };
  const { segmentos, resistencias, tagsR, bateria } = exportar(componentes, cables);
  let resultado;
  try { resultado = resolverCircuito(segmentos, resistencias, bateria); }
  catch (e) { if (e instanceof ErrorCircuito) return { med: null, diag, error: errorAmigable(e.message) }; throw e; }
  const clasificacion = clasificarTopologia(segmentos, resistencias, bateria);
  const med = medicionBase(componentes, nombres, diag);
  Object.assign(med, { V: bateria[2], I: resultado.corrienteTotal, Req: resultado.resistenciaEquivalente, P: resultado.potenciaTotal,
    abierto: false, tipo: clasificacion.tipo, clasificacion, resultado, tagsR });
  tagsR.forEach((tag, i) => Object.assign(med.componentes[nombres[tag]], { V: resultado.resistencias[i].voltaje, I: resultado.resistencias[i].corriente, P: resultado.resistencias[i].potencia }));
  return { med, diag, error: null };
}

const clvNombre = (n) => [n[0], /^\d+$/.test(n.slice(1)) ? parseInt(n.slice(1), 10) : 0];
export function conectados(med, tipo = null) {
  return Object.entries(med.componentes)
    .filter(([, c]) => c.I > 1e-12 && (tipo === null || c.tipo === tipo))
    .sort((a, b) => { const x = clvNombre(a[0]), y = clvNombre(b[0]); return x[0] < y[0] ? -1 : x[0] > y[0] ? 1 : x[1] - y[1]; });
}

const _v = (x) => `${F.gg(x)} V`;
const om = F.ohmios, amp = F.amperios, volt = F.voltios, vat = F.vatios;

export function porQue(med) {
  const { V, I, Req, P } = med;
  const activos = conectados(med), tipo = med.tipo;
  let textoReq, formulaReq;
  if (tipo === "unico" && activos.length) {
    textoReq = `Solo hay un componente conectado a la batería, así que la resistencia equivalente es su propio valor: ${om(activos[0][1].R)}.`;
    formulaReq = `Req = ${om(Req)}`;
  } else if (tipo === "serie" && activos.length > 1) {
    textoReq = `En serie la corriente atraviesa todos los componentes uno tras otro, así que sus oposiciones se suman: ${activos.map(([, c]) => om(c.R)).join(" + ")} = ${om(Req)}.`;
    formulaReq = "Req = " + activos.map(([n]) => n).join(" + ");
  } else if (tipo === "paralelo" && activos.length > 1) {
    const menor = Math.min(...activos.map(([, c]) => c.R));
    textoReq = `En paralelo la corriente tiene ${activos.length} caminos, así que la batería 've' menos oposición: ${om(Req)}, menos que la rama más pequeña (${om(menor)}).`;
    formulaReq = "1/Req = " + activos.map(([n]) => `1/${n}`).join(" + ");
  } else {
    textoReq = "Es el valor de un solo componente que haría lo mismo que todo el circuito: se obtiene dividiendo el voltaje de la batería entre la corriente total que entrega.";
    formulaReq = `Req = V / I = ${_v(V)} / ${amp(I)}`;
  }
  return {
    voltaje: [`La batería mantiene ${_v(V)} entre sus bornes: es el empuje que mueve la corriente por el circuito.`, `V = ${_v(V)}`],
    corriente: [`La corriente es ${amp(I)} porque la batería proporciona ${_v(V)} y la resistencia equivalente es ${om(Req)}.`, `I = V / Req = ${_v(V)} / ${om(Req)} = ${amp(I)}`],
    req: [textoReq, formulaReq],
    potencia: [`Cada segundo la batería entrega ${vat(P)}: empuja ${amp(I)} con ${_v(V)}, y los componentes convierten esa energía en calor o luz.`, `P = V × I = ${_v(V)} × ${amp(I)} = ${vat(P)}`],
  };
}

const TIPOS_TEXTO = {
  unico: ["Circuito simple", "Un solo componente conectado directamente a la batería."],
  serie: ["Circuito en serie", "Los componentes están uno tras otro: la corriente tiene un único camino."],
  paralelo: ["Circuito en paralelo", "Cada componente forma su propia rama entre los mismos dos puntos: la corriente tiene varios caminos."],
  mixto: ["Circuito mixto", "Combina partes en serie y partes en paralelo."],
  compleja: ["Topología compleja", "No se puede reducir a serie ni a paralelo (por ejemplo, un puente). El simulador lo resuelve igual con las leyes de Kirchhoff en cada nodo."],
};

function nombresNodos(med) {
  const V = med.resultado.voltajesNodo;
  const orden = [...V.keys()].sort((a, b) => V.get(b) - V.get(a));
  const letras = new Map(orden.map((n, i) => [n, String.fromCharCode(65 + i)]));
  return { letras, V };
}

export function nodosYRangos(componentes, cables, med) {
  const { letras, V } = nombresNodos(med);
  const { segmentos, resistencias, tagsR, bateria } = exportar(componentes, cables);
  const nodoDe = construirNodos(segmentos, resistencias, bateria);
  const rango = {};
  tagsR.forEach((tag, i) => {
    const [a, b] = resistencias[i];
    const na = nodoDe(a), nb = nodoDe(b);
    if (letras.has(na) && letras.has(nb)) rango[med.nombres[tag]] = V.get(na) >= V.get(nb) ? [na, nb] : [nb, na];
  });
  return { letras, V, pos: nodoDe(bateria[0]), neg: nodoDe(bateria[1]), rango, nodoDe };
}

export function explicarCircuito(componentes, cables, med) {
  if (!med || med.abierto || !med.resultado) {
    return [{ titulo: "Aún no hay corriente", texto: "Cierra el circuito y simúlalo para poder explicarlo con valores reales.", formula: "" }];
  }
  const { V, I, Req, P } = med;
  const activos = conectados(med), tipo = med.tipo, sec = [];
  const [tt, tx] = TIPOS_TEXTO[tipo] || ["Circuito", ""];
  sec.push({ titulo: "Tipo de circuito", texto: `${tt}. ${tx}`, formula: "" });

  const partes = [`una batería de ${_v(V)}`];
  for (const [n, c] of Object.entries(med.componentes).sort((a, b) => (a[0] < b[0] ? -1 : 1))) partes.push(`${n}: ${NOMBRE_TIPO[c.tipo]} de ${om(c.R)}`);
  for (const [n, cer] of Object.entries(med.interruptores).sort((a, b) => (a[0] < b[0] ? -1 : 1))) partes.push(`${n}: interruptor ${cer ? "cerrado" : "abierto"}`);
  partes.push(`${Object.keys(cables).length} cable(s)`);
  sec.push({ titulo: "Componentes", texto: "Tu circuito tiene " + partes.join("; ") + ".", formula: "" });

  const { letras, V: volts, pos, neg, rango } = nodosYRangos(componentes, cables, med);
  const lineas = [`Los cables unen los terminales en ${letras.size} nodos (puntos de unión). El nodo ${letras.get(pos)} es el borne + (${_v(V)}) y el nodo ${letras.get(neg)} es el borne − (0 V).`];
  const { segmentos, resistencias, tagsR } = exportar(componentes, cables);
  const nodoDe = construirNodos(segmentos, resistencias, exportar(componentes, cables).bateria);
  tagsR.forEach((tag, i) => {
    const nombre = med.nombres[tag];
    if (rango[nombre]) lineas.push(`${nombre} va del nodo ${letras.get(rango[nombre][0])} al nodo ${letras.get(rango[nombre][1])}.`);
    else lineas.push(`${nombre} no está conectada a la batería: no recibe corriente.`);
  });
  sec.push({ titulo: "Conexiones", texto: lineas.join(" "), formula: "" });

  let texto;
  if (tipo === "serie" || tipo === "unico") {
    const orden = [...activos].sort((a, b) => volts.get(rango[b[0]][0]) - volts.get(rango[a[0]][0]));
    texto = `La corriente sale del borne +, atraviesa ${orden.map(([n]) => n).join(" → ")} y vuelve al borne −. Como hay un solo camino, es la misma en todo el recorrido: ${amp(I)}.`;
  } else if (tipo === "paralelo") {
    texto = `Al salir del borne + la corriente total (${amp(I)}) se divide: ${activos.map(([n, c]) => `${amp(c.I)} por ${n}`).join(", ")}. Las ramas se vuelven a juntar antes de regresar al borne −. Por la rama de menor resistencia pasa más corriente.`;
  } else {
    texto = `La corriente sale del borne + (${amp(I)}) y en cada nodo se reparte hacia los nodos de menor voltaje: ${activos.map(([n, c]) => `${n}: ${amp(c.I)} del nodo ${letras.get(rango[n][0])} al ${letras.get(rango[n][1])}`).join("; ")}.`;
  }
  sec.push({ titulo: "Recorrido de la corriente", texto, formula: "" });

  const caidas = activos.map(([n, c]) => `${n}: ${volt(c.V)}`).join("; ");
  let formula;
  if (tipo === "serie" && activos.length > 1) {
    const suma = activos.reduce((s, [, c]) => s + c.V, 0);
    texto = `El voltaje de la batería se reparte entre los componentes (${caidas}). Sumados dan ${volt(suma)}, lo mismo que la batería. Cada uno recibe más voltaje cuanto mayor es su resistencia.`;
    formula = "V = " + activos.map(([n]) => `V${n}`).join(" + ");
  } else if (tipo === "paralelo") {
    texto = `Todas las ramas están conectadas a los mismos dos nodos, así que todas reciben el voltaje completo de la batería: ${caidas}.`;
    formula = "V = V" + activos.map(([n]) => n).join(" = V");
  } else { texto = `Voltaje en cada componente: ${caidas}.`; formula = "V = I × R en cada componente"; }
  sec.push({ titulo: "Voltajes", texto, formula });

  const corrs = activos.map(([n, c]) => `${n}: ${amp(c.I)}`).join("; ");
  if (tipo === "paralelo") {
    const suma = activos.reduce((s, [, c]) => s + c.I, 0);
    texto = `${corrs}. Sumadas dan ${amp(suma)}, la corriente total que entrega la batería: lo que entra a un nodo es igual a lo que sale.`;
    formula = "I = " + activos.map(([n]) => `I${n}`).join(" + ");
  } else { texto = `${corrs}. La batería entrega ${amp(I)} en total.`; formula = `I = V / Req = ${_v(V)} / ${om(Req)}`; }
  sec.push({ titulo: "Corrientes", texto, formula });

  const pots = activos.map(([n, c]) => `${n}: ${vat(c.P)}`).join("; ");
  const sumaP = activos.reduce((s, [, c]) => s + c.P, 0);
  texto = `${pots}. La suma (${vat(sumaP)}) es exactamente lo que entrega la batería (${vat(P)}): la energía se conserva.`;
  const bombs = conectados(med, "bombillo");
  if (bombs.length) { const mas = bombs.reduce((a, b) => (b[1].P > a[1].P ? b : a)); texto += ` El bombillo que más brilla es ${mas[0]}, porque recibe más potencia.`; }
  sec.push({ titulo: "Potencia", texto, formula: `P = V × I = ${_v(V)} × ${amp(I)} = ${vat(P)}` });

  const leyes = [`Ley de Ohm: en todo el circuito, I = V / Req = ${_v(V)} / ${om(Req)} = ${amp(I)}; y en cada componente, V = I × R.`];
  if (["serie", "mixto", "compleja"].includes(tipo) || activos.length > 1) leyes.push("Ley de voltajes de Kirchhoff: en cualquier camino cerrado, la suma de los voltajes de los componentes es igual al voltaje de la batería.");
  if (["paralelo", "mixto", "compleja"].includes(tipo)) leyes.push("Ley de corrientes de Kirchhoff: en cada nodo, la corriente que entra es igual a la que sale.");
  leyes.push("Conservación de la energía: la potencia que entrega la batería es la suma de la que consumen los componentes.");
  sec.push({ titulo: "Leyes físicas involucradas", texto: leyes.join(" "), formula: "" });
  return sec;
}

export function ecuacionesUsadas(componentes, cables, med) {
  if (!med || med.abierto || !med.resultado) return [];
  const { V, I, Req, P } = med;
  const activos = conectados(med), tipo = med.tipo, pasos = [];
  if (tipo === "unico" && activos.length) {
    pasos.push({ titulo: "Resistencia equivalente", texto: "Solo hay un componente conectado a la batería.", lineas: [`Req = ${activos[0][0]}`, `Req = ${om(Req)}`] });
  } else if (tipo === "serie" && activos.length > 1) {
    pasos.push({ titulo: "Resistencia equivalente (serie)", texto: "En serie las resistencias se suman.", lineas: ["Req = " + activos.map(([n]) => n).join(" + "), "Req = " + activos.map(([, c]) => om(c.R)).join(" + "), `Req = ${om(Req)}`] });
  } else if (tipo === "paralelo" && activos.length > 1) {
    pasos.push({ titulo: "Resistencia equivalente (paralelo)", texto: "En paralelo se suman los inversos de las resistencias.", lineas: ["1/Req = " + activos.map(([n]) => `1/${n}`).join(" + "), "1/Req = " + activos.map(([, c]) => `1/${om(c.R)}`).join(" + "), `Req = ${om(Req)}`] });
  } else {
    pasos.push({ titulo: "Resistencia equivalente", texto: (tipo === "mixto" ? "El circuito mezcla serie y paralelo" : "El circuito no se reduce a serie ni a paralelo") + ", así que primero se resuelven los voltajes de los nodos con Kirchhoff y luego se despeja Req.", lineas: ["Req = V / I", `Req = ${_v(V)} / ${amp(I)}`, `Req = ${om(Req)}`] });
  }
  pasos.push({ titulo: "Corriente total (Ley de Ohm)", texto: "La batería empuja la corriente a través de la resistencia equivalente.", lineas: ["I = V / Req", `I = ${_v(V)} / ${om(Req)}`, `I = ${amp(I)}`] });

  let lineas = [], texto;
  if (tipo === "paralelo") {
    texto = "Cada rama recibe el voltaje completo; su corriente sale de la Ley de Ohm.";
    lineas.push("I(rama) = V / R");
    for (const [n, c] of activos) lineas.push(`I(${n}) = ${_v(V)} / ${om(c.R)} = ${amp(c.I)}`);
  } else if (tipo === "serie" || tipo === "unico") {
    texto = "La misma corriente pasa por todos; cada uno toma su parte del voltaje.";
    lineas.push("V(comp.) = I × R");
    for (const [n, c] of activos) lineas.push(`V(${n}) = ${amp(c.I)} × ${om(c.R)} = ${volt(c.V)}`);
  } else {
    texto = "Con los voltajes de los nodos se obtiene cada caída, y de ahí su corriente.";
    lineas.push("I(comp.) = V(comp.) / R");
    for (const [n, c] of activos) lineas.push(`I(${n}) = ${volt(c.V)} / ${om(c.R)} = ${amp(c.I)}`);
  }
  if (lineas.length) pasos.push({ titulo: "Cada componente", texto, lineas, destacar: lineas.slice(1).map((_, i) => i + 1) });

  if (tipo === "mixto" || tipo === "compleja") {
    let info = null;
    try { info = nodosYRangos(componentes, cables, med); } catch { /* sin nodos */ }
    if (info) {
      const corr = Object.fromEntries(activos.map(([n, c]) => [n, c.I]));
      const ls = [];
      for (const [nodo, letra] of [...info.letras].sort((a, b) => (a[1] < b[1] ? -1 : 1))) {
        if (nodo === info.pos || nodo === info.neg) continue;
        const entran = Object.entries(info.rango).filter(([n, [, bajo]]) => bajo === nodo && n in corr).map(([n]) => n);
        const salen = Object.entries(info.rango).filter(([n, [alto]]) => alto === nodo && n in corr).map(([n]) => n);
        if (!entran.length || !salen.length) continue;
        ls.push(`Nodo ${letra}: ` + entran.map((n) => `I(${n})`).join(" + ") + " = " + salen.map((n) => `I(${n})`).join(" + "));
        ls.push("   " + entran.map((n) => amp(corr[n])).join(" + ") + " = " + salen.map((n) => amp(corr[n])).join(" + "));
      }
      if (ls.length) pasos.push({ titulo: "Ley de corrientes de Kirchhoff", texto: "En cada nodo, la corriente que entra es igual a la que sale.", lineas: ls, destacar: [] });
    }
  }
  lineas = ["P = V × I", `P = ${_v(V)} × ${amp(I)}`, `P = ${vat(P)}`];
  if (activos.length > 1) for (const [n, c] of activos) lineas.push(`P(${n}) = ${volt(c.V)} × ${amp(c.I)} = ${vat(c.P)}`);
  pasos.push({ titulo: "Potencia", texto: "Energía que entrega la batería cada segundo.", lineas, destacar: [2] });

  lineas = [];
  if (tipo === "serie" && activos.length > 1) {
    lineas.push("V = " + activos.map(([n]) => `V(${n})`).join(" + "));
    lineas.push(`${volt(V)} = ` + activos.map(([, c]) => volt(c.V)).join(" + "));
  }
  if (tipo === "paralelo" && activos.length > 1) {
    lineas.push("I = " + activos.map(([n]) => `I(${n})`).join(" + "));
    lineas.push(`${amp(I)} = ` + activos.map(([, c]) => amp(c.I)).join(" + "));
  }
  if (activos.length > 1) lineas.push(`${vat(P)} = ` + activos.map(([, c]) => vat(c.P)).join(" + "));
  if (lineas.length) pasos.push({ titulo: "Comprobación", texto: "Las sumas coinciden: se cumplen Kirchhoff y la conservación de la energía.", lineas, destacar: [] });
  return pasos;
}
