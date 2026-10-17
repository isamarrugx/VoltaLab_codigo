// motor.js
// Motor de calculo para circuitos de topologia libre (port de motor_circuito.py).
//
// Modelo de datos:
//   punto:        [fila, col]
//   cables:       [[a, b], ...]
//   resistencias: [[a, b, ohms], ...]
//   bateria:      [pos, neg, voltios]
//
// Metodo: analisis nodal (Kirchhoff + Ohm) con eliminacion gaussiana.

export class ErrorCircuito extends Error {
  constructor(mensaje) {
    super(mensaje);
    this.name = "ErrorCircuito";
  }
}

export const clave = (p) => `${p[0]},${p[1]}`;
export const igual = (p, q) => p[0] === q[0] && p[1] === q[1];
// Orden numerico de claves "fila,col" (como ordenar tuplas en Python).
export const compararClaves = (a, b) => {
  const [fa, ca] = a.split(",").map(Number);
  const [fb, cb] = b.split(",").map(Number);
  return fa - fb || ca - cb;
};

function mcd(a, b) {
  a = Math.abs(a); b = Math.abs(b);
  while (b) [a, b] = [b, a % b];
  return a;
}

// Puntos de la cuadricula DENTRO del tramo a-b (sin extremos), en orden.
export function puntosInteriores(a, b) {
  const df = b[0] - a[0], dc = b[1] - a[1];
  const pasos = mcd(df, dc);
  if (pasos <= 1) return [];
  const out = [];
  for (let k = 1; k < pasos; k++) out.push([a[0] + (df * k) / pasos, a[1] + (dc * k) / pasos]);
  return out;
}

// Corta cada tramo de cable donde otro cable termina (o dobla) o hay un borne.
export function dividirEnUniones(segmentos, otrosPuntos = []) {
  const importantes = new Set();
  for (const [a, b] of segmentos) { importantes.add(clave(a)); importantes.add(clave(b)); }
  for (const p of otrosPuntos) importantes.add(clave(p));
  const resultado = [];
  for (const [a, b] of segmentos) {
    const cadena = [a, ...puntosInteriores(a, b).filter((p) => importantes.has(clave(p))), b];
    for (let i = 0; i < cadena.length - 1; i++) resultado.push([cadena[i], cadena[i + 1]]);
  }
  return resultado;
}

// ---- Union-Find sobre claves de punto ----
class UnionFind {
  constructor() {
    this.padre = new Map();
  }
  encontrar(k) {
    if (!this.padre.has(k)) {
      this.padre.set(k, k);
      return k;
    }
    let raiz = k;
    while (this.padre.get(raiz) !== raiz) raiz = this.padre.get(raiz);
    while (this.padre.get(k) !== raiz) {
      const sig = this.padre.get(k);
      this.padre.set(k, raiz);
      k = sig;
    }
    return raiz;
  }
  unir(a, b) {
    const ra = this.encontrar(a);
    const rb = this.encontrar(b);
    if (ra !== rb) this.padre.set(ra, rb);
  }
}

// Devuelve funcion punto -> clave canonica del nodo electrico.
export function construirNodos(cables, resistencias, bateria) {
  const uf = new UnionFind();
  for (const [a, b] of cables) {
    uf.encontrar(clave(a));
    uf.encontrar(clave(b));
    uf.unir(clave(a), clave(b));
  }
  for (const [a, b] of resistencias) {
    uf.encontrar(clave(a));
    uf.encontrar(clave(b));
  }
  uf.encontrar(clave(bateria[0]));
  uf.encontrar(clave(bateria[1]));
  return (p) => uf.encontrar(clave(p));
}

// Resuelve G x = rhs (eliminacion gaussiana con pivoteo parcial).
// Devuelve null si la matriz es singular.
export function resolverLineal(G, rhs) {
  const n = rhs.length;
  const A = G.map((fila, i) => [...fila, rhs[i]]);
  for (let c = 0; c < n; c++) {
    let piv = c;
    for (let f = c + 1; f < n; f++) {
      if (Math.abs(A[f][c]) > Math.abs(A[piv][c])) piv = f;
    }
    if (Math.abs(A[piv][c]) < 1e-14) return null;
    [A[c], A[piv]] = [A[piv], A[c]];
    for (let f = c + 1; f < n; f++) {
      const factor = A[f][c] / A[c][c];
      for (let k = c; k <= n; k++) A[f][k] -= factor * A[c][k];
    }
  }
  const x = new Array(n).fill(0);
  for (let i = n - 1; i >= 0; i--) {
    let s = A[i][n];
    for (let k = i + 1; k < n; k++) s -= A[i][k] * x[k];
    x[i] = s / A[i][i];
  }
  return x;
}

export function resolverCircuito(cables, resistencias, bateria) {
  if (!resistencias.length) {
    throw new ErrorCircuito("Agrega al menos una resistencia al circuito.");
  }
  for (const [, , valor] of resistencias) {
    if (!(valor > 0) || !Number.isFinite(valor)) {
      throw new ErrorCircuito(`Una resistencia tiene un valor invalido: ${valor}`);
    }
  }
  const [puntoPos, puntoNeg, voltaje] = bateria;
  if (!Number.isFinite(voltaje) || voltaje < 0) {
    throw new ErrorCircuito("El voltaje de la fuente no es valido.");
  }

  const nodoDe = construirNodos(cables, resistencias, bateria);
  const nodoPos = nodoDe(puntoPos);
  const nodoNeg = nodoDe(puntoNeg);

  if (nodoPos === nodoNeg) {
    throw new ErrorCircuito(
      "Cortocircuito: los dos bornes de la fuente estan conectados directamente " +
        "por un cable, sin pasar por ninguna resistencia."
    );
  }

  const ramas = resistencias.map(([a, b, r], i) => ({
    na: nodoDe(a),
    nb: nodoDe(b),
    r,
    i,
  }));

  // Conectividad desde el borne positivo
  const ady = new Map();
  const agregar = (x, y) => {
    if (!ady.has(x)) ady.set(x, []);
    ady.get(x).push(y);
  };
  for (const { na, nb } of ramas) {
    agregar(na, nb);
    agregar(nb, na);
  }
  const alcanzables = new Set([nodoPos]);
  const pend = [nodoPos];
  while (pend.length) {
    const actual = pend.pop();
    for (const v of ady.get(actual) || []) {
      if (!alcanzables.has(v)) {
        alcanzables.add(v);
        pend.push(v);
      }
    }
  }
  const conectadas = ramas.filter((r) => alcanzables.has(r.na) && alcanzables.has(r.nb));
  const desconectadas = ramas
    .filter((r) => !(alcanzables.has(r.na) && alcanzables.has(r.nb)))
    .map((r) => r.i);

  if (!conectadas.length) {
    throw new ErrorCircuito("Ninguna resistencia esta conectada a la fuente. Revisa los cables.");
  }

  // Sistema nodal
  const todos = [...new Set(conectadas.flatMap((r) => [r.na, r.nb]))].sort();
  const incognitas = todos.filter((n) => n !== nodoPos && n !== nodoNeg);
  const indiceDe = new Map(incognitas.map((n, i) => [n, i]));
  const m = incognitas.length;

  const conocido = (n) => (n === nodoNeg ? 0 : n === nodoPos ? voltaje : null);

  const voltajesNodo = new Map([
    [nodoPos, voltaje],
    [nodoNeg, 0],
  ]);

  if (m > 0) {
    const G = Array.from({ length: m }, () => new Array(m).fill(0));
    const rhs = new Array(m).fill(0);
    for (const { na, nb, r } of conectadas) {
      const g = 1 / r;
      const va = conocido(na);
      const vb = conocido(nb);
      if (va === null && vb === null) {
        const ia = indiceDe.get(na);
        const ib = indiceDe.get(nb);
        G[ia][ia] += g;
        G[ib][ib] += g;
        G[ia][ib] -= g;
        G[ib][ia] -= g;
      } else if (va === null) {
        const ia = indiceDe.get(na);
        G[ia][ia] += g;
        rhs[ia] += g * vb;
      } else if (vb === null) {
        const ib = indiceDe.get(nb);
        G[ib][ib] += g;
        rhs[ib] += g * va;
      }
    }
    const sol = resolverLineal(G, rhs);
    if (!sol) {
      throw new ErrorCircuito(
        "El circuito tiene una parte que no esta conectada a tierra de forma valida " +
          "(nodo flotante). Revisa que todos los cables lleguen a la fuente."
      );
    }
    for (const [n, i] of indiceDe) voltajesNodo.set(n, sol[i]);
  }

  // Resultados por resistencia
  const resultadoResistencias = resistencias.map(([a, b, r]) => {
    const na = nodoDe(a);
    const nb = nodoDe(b);
    if (!voltajesNodo.has(na) || !voltajesNodo.has(nb)) {
      return { a, b, valor: r, voltaje: 0, corriente: 0, potencia: 0 };
    }
    const v = voltajesNodo.get(na) - voltajesNodo.get(nb);
    const i = v / r;
    return { a, b, valor: r, voltaje: Math.abs(v), corriente: Math.abs(i), potencia: Math.abs(v * i) };
  });

  // Corriente total (KCL en el nodo positivo)
  let corrienteTotal = 0;
  for (const { na, nb, r } of conectadas) {
    if (na === nodoPos) corrienteTotal += (voltajesNodo.get(na) - voltajesNodo.get(nb)) / r;
    else if (nb === nodoPos) corrienteTotal += (voltajesNodo.get(nb) - voltajesNodo.get(na)) / r;
  }
  corrienteTotal = Math.abs(corrienteTotal);

  if (corrienteTotal < 1e-12) {
    throw new ErrorCircuito(
      "No circula corriente: el circuito esta abierto en algun punto entre la fuente y las resistencias."
    );
  }

  return {
    voltajesNodo, // Map clave-de-nodo -> voltios
    nodoDe,
    resistencias: resultadoResistencias,
    corrienteTotal,
    resistenciaEquivalente: voltaje / corrienteTotal,
    potenciaTotal: voltaje * corrienteTotal,
    desconectadas,
  };
}

// ---- Clasificacion de topologia (reduccion serie-paralelo) ----
export function clasificarTopologia(cables, resistencias, bateria) {
  const validas = resistencias.filter(([a, b]) => clave(a) !== clave(b));
  if (!validas.length) {
    return { tipo: "vacio", descripcion: "No hay resistencias en el circuito." };
  }

  const nodoDe = construirNodos(cables, validas, bateria);
  const termA = nodoDe(bateria[0]);
  const termB = nodoDe(bateria[1]);

  let aristas = validas.map(([a, b]) => [nodoDe(a), nodoDe(b)]).filter(([x, y]) => x !== y);
  if (!aristas.length) {
    return { tipo: "vacio", descripcion: "No hay resistencias válidas en el circuito." };
  }

  const esBornes = (e) =>
    (e[0] === termA && e[1] === termB) || (e[0] === termB && e[1] === termA);

  if (aristas.length === 1 && esBornes(aristas[0])) {
    return { tipo: "unico", descripcion: "Un solo componente conectado directamente a la fuente." };
  }

  let huboSerie = false;
  let huboParalelo = false;
  let cambiado = true;

  while (cambiado && aristas.length > 1) {
    cambiado = false;

    // (a) paralelo: aristas con el mismo par de nodos
    const conteo = new Map();
    for (const [x, y] of aristas) {
      const k = x < y ? `${x}|${y}` : `${y}|${x}`;
      if (!conteo.has(k)) conteo.set(k, { par: [x, y], n: 0 });
      conteo.get(k).n += 1;
    }
    if ([...conteo.values()].some((c) => c.n > 1)) {
      huboParalelo = true;
      aristas = [...conteo.values()].map((c) => c.par);
      cambiado = true;
      continue;
    }

    // (b) serie: nodo de grado 2 que no es borne de la fuente
    const grados = new Map();
    for (const [x, y] of aristas) {
      grados.set(x, (grados.get(x) || 0) + 1);
      grados.set(y, (grados.get(y) || 0) + 1);
    }
    let nodoSerie = null;
    for (const [nodo, g] of grados) {
      if (g === 2 && nodo !== termA && nodo !== termB) {
        nodoSerie = nodo;
        break;
      }
    }
    if (nodoSerie !== null) {
      const idx = [];
      aristas.forEach((e, i) => {
        if (e[0] === nodoSerie || e[1] === nodoSerie) idx.push(i);
      });
      const [e1, e2] = [aristas[idx[0]], aristas[idx[1]]];
      const otro1 = e1[0] === nodoSerie ? e1[1] : e1[0];
      const otro2 = e2[0] === nodoSerie ? e2[1] : e2[0];
      aristas = aristas.filter((_, i) => !idx.includes(i));
      aristas.push([otro1, otro2]);
      huboSerie = true;
      cambiado = true;
    }
  }

  if (aristas.length === 1 && esBornes(aristas[0])) {
    if (huboSerie && huboParalelo) {
      return { tipo: "mixto", descripcion: "Combinación de conexiones en serie y en paralelo." };
    }
    if (huboParalelo) {
      return { tipo: "paralelo", descripcion: "Todas las resistencias están conectadas en paralelo." };
    }
    if (huboSerie) {
      return { tipo: "serie", descripcion: "Todas las resistencias están conectadas en serie, una tras otra." };
    }
    return { tipo: "unico", descripcion: "Un solo componente." };
  }

  return {
    tipo: "compleja",
    descripcion:
      "Esta red no se puede reducir a serie ni paralelo (por ejemplo, un puente). " +
      "Se resuelve igual con análisis nodal, pero no encaja en esas dos categorías clásicas.",
  };
}
