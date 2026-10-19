// Motor del tablero (port de lienzo.py): dibujo inmediato sobre <canvas>.
import { mezclarColor, suavizar, movimientoReducido } from "../lib/animaciones.js";
import * as cv from "../lib/cv.js";
import * as E from "../lib/estilos.js";
import { dividirEnUniones, clave, puntosInteriores } from "../lib/motor.js";
import { calcularTrayectos } from "../lib/flujo.js";
import { sinTramosTapados } from "../lib/guias.js";
import { ESPEC } from "../lib/fallas.js";

export const ESPACIADO = 40;
const VALORES_DEFECTO = { resistencia: 100, bombillo: 10, bateria: 12, fusible: 0.5 };
const PIEZAS = ["resistencia", "bombillo", "interruptor", "bateria", "fusible"];
const P_MIN = 0.001, P_MAX = 20, BRILLO_MIN = 0.12;
const SEPARACION = 24, RADIO_PART = 2.6, V_MIN = 18, V_MAX = 130, CONST_BRILLO = 0.16;
const SUAVE = { velocidad: 0.55, separacion: 36, radio: 2.0, ping: 0.6, periodo_resaltado: 2.8, constante_brillo: 0.3 };
const NOMBRE_PIEZA = { resistencia: "resistencia", bombillo: "bombillo", interruptor: "interruptor", bateria: "batería", fusible: "fusible" };

export function brilloPara(p) {
  if (p <= 0) return 0;
  const lo = Math.log10(P_MIN), hi = Math.log10(P_MAX);
  const n = Math.max(0, Math.min(1, (Math.log10(p) - lo) / (hi - lo)));
  return BRILLO_MIN + (1 - BRILLO_MIN) * n;
}
export function velocidadPara(i) {
  if (i <= 0) return 0;
  const n = Math.max(0, Math.min(1, (Math.log10(i) + 4) / 4));
  return V_MIN + (V_MAX - V_MIN) * n;
}
const fmtCorriente = (a) => (Math.abs(a) < 1 ? `${(a * 1000).toFixed(1)} mA` : `${a.toFixed(3)} A`);
const eq = (p, q) => p[0] === q[0] && p[1] === q[1];
const kp = (p) => `${p[0]},${p[1]}`;
// Tecla de los atajos: ⌘ en Mac, Ctrl en el resto.
export const TECLA = typeof navigator !== "undefined" && /Mac|iPhone|iPad/i.test(navigator.platform || navigator.userAgent) ? "⌘" : "Ctrl";
// Lo copiado se comparte entre tableros, así se puede pegar en otra pantalla.
let PORTAPAPELES = null;
const clonar = (o) => JSON.parse(JSON.stringify(o));

// ¿El segmento toca el rectángulo [x0, y0, x1, y1]? (recorte de Liang–Barsky)
function segEnRect(x1, y1, x2, y2, [rx0, ry0, rx1, ry1]) {
  let t0 = 0, t1 = 1;
  const dx = x2 - x1, dy = y2 - y1;
  for (const [p, q] of [[-dx, x1 - rx0], [dx, rx1 - x1], [-dy, y1 - ry0], [dy, ry1 - y1]]) {
    if (p === 0) { if (q < 0) return false; continue; }
    const t = q / p;
    if (p < 0) { if (t > t1) return false; if (t > t0) t0 = t; }
    else { if (t < t0) return false; if (t < t1) t1 = t; }
  }
  return true;
}

function rr(ctx, x0, y0, x1, y1, r = 8) {
  r = Math.min(r, (x1 - x0) / 2, (y1 - y0) / 2);
  ctx.beginPath();
  ctx.moveTo(x0 + r, y0); ctx.lineTo(x1 - r, y0); ctx.quadraticCurveTo(x1, y0, x1, y0 + r);
  ctx.lineTo(x1, y1 - r); ctx.quadraticCurveTo(x1, y1, x1 - r, y1); ctx.lineTo(x0 + r, y1);
  ctx.quadraticCurveTo(x0, y1, x0, y1 - r); ctx.lineTo(x0, y0 + r); ctx.quadraticCurveTo(x0, y0, x0 + r, y0);
  ctx.closePath();
}

export class Lienzo {
  constructor(canvas, opc = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.editable = opc.editable !== false;
    this.estatico = !!opc.estatico;   // sin zoom ni arrastre: la página sigue desplazándose
    this.modoEducativo = !!opc.modoEducativo;
    this.suave = !!opc.animacionSuave;
    this.onCambio = opc.onCambio || null;
    this.onSeleccion = opc.onSeleccion || null;
    this.onInterruptorBloqueado = null;
    this.permitirInterruptores = true;
    this.herramienta = "seleccionar";
    this.valoresNuevos = { ...VALORES_DEFECTO };
    // límites de las piezas nuevas (potencia máxima, corriente máxima de la batería)
    this.especNuevas = Object.fromEntries(Object.entries(ESPEC).map(([t, e]) => [t, e.def]));
    // estado físico que calcula el simulador: calor de cada pieza y lo que hace la batería
    this.calor = {}; this.fuente = null;
    this.componentes = {}; this.cables = {};
    this._sig = 0;
    this.seleccionado = null;   // la pieza seleccionada cuando hay exactamente una
    this.seleccion = new Set(); // todo lo seleccionado
    this._arrastre = null; this._marco = null; this._espacio = false;
    this._cableEnProgreso = [];
    this.colorCableActual = cv.COLOR_CABLE_DEFECTO;
    this._ultimoResultado = null;
    this._trayectos = []; this._fases = {}; this._brilloObjetivo = {};
    this._efectos = []; this._resaltado = null; this._guia = null; this._nombres = {};
    this._z = 1; this._origen = [0, 0]; this._encuadre = null; this._movido = false; this._pan = null;
    this._mouse = null; this._cursor = "default";
    this._t0 = performance.now() / 1000; this._tUltimo = this._t0;
    this._sucio = true; this._raf = null; this._vivo = true;
    this.ancho = 300; this.alto = 300;
    this._hist = []; this._futuro = []; this._restaurando = false;
    this.reiniciarHistorial();
    this._enlazar();
    this._observador = new ResizeObserver(() => this.redimensionar());
    this._observador.observe(canvas.parentElement || canvas);
    this.redimensionar();
  }

  // ---------- ciclo de vida ----------
  destruir() {
    this._vivo = false;
    if (this._raf) cancelAnimationFrame(this._raf);
    this._observador.disconnect();
    for (const [t, f] of this._escuchas) this.canvas.removeEventListener(t, f);
    for (const [t, f] of this._escuchasTeclado) this._destinoTeclado.removeEventListener(t, f);
  }
  redimensionar() {
    const caja = (this.canvas.parentElement || this.canvas).getBoundingClientRect();
    const ancho = Math.max(50, Math.floor(caja.width)), alto = Math.max(50, Math.floor(caja.height));
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = Math.round(ancho * dpr); this.canvas.height = Math.round(alto * dpr);
    this.canvas.style.width = `${ancho}px`; this.canvas.style.height = `${alto}px`;
    this.ancho = ancho; this.alto = alto; this._dpr = dpr;
    this._aplicarEncuadre();
    this.pedir();
  }
  pedir() {
    this._sucio = true;
    if (!this._raf && this._vivo) this._raf = requestAnimationFrame((t) => this._cuadro(t));
  }
  _hayAnimacion() {
    if (this._efectos.length || this._bombillosEnTransicion()) return true;
    if (movimientoReducido()) return false;
    // una pieza sobrecargada parpadea o humea: hay que seguir dibujando
    const caliente = Object.entries(this.calor).some(([t, k]) => k > 0.85 && this.componentes[t] && !this.componentes[t].danado);
    return this._trayectos.length > 0 || this._resaltado !== null || !!this._guia || caliente;
  }
  _cuadro() {
    this._raf = null;
    if (!this._vivo) return;
    const ahora = performance.now() / 1000;
    const dt = Math.min(0.1, ahora - this._tUltimo);
    this._tUltimo = ahora;
    this._avanzarParticulas(dt);
    this._avanzarBombillos(dt);
    this._efectos = this._efectos.filter((e) => (ahora - e.inicio) / e.duracion < 1);
    this._dibujar(ahora);
    this._sucio = false;
    if (this._hayAnimacion()) this._raf = requestAnimationFrame((t) => this._cuadro(t));
  }

  // ---------- coordenadas ----------
  pixel(p) { return [p[1] * ESPACIADO + this._origen[0], p[0] * ESPACIADO + this._origen[1]]; }
  punto(x, y) { return [Math.round((y - this._origen[1]) / ESPACIADO), Math.round((x - this._origen[0]) / ESPACIADO)]; }

  encuadrar(lim, recentrar = true) {
    this._encuadre = lim;
    if (recentrar) this._movido = false;
    this._aplicarEncuadre(); this.pedir();
  }
  _aplicarEncuadre() {
    if (!this._encuadre || this._movido) return;
    const [f0, f1, c0, c1] = this._encuadre;
    this._origen = [this.ancho / this._z / 2 - ((c0 + c1) / 2) * ESPACIADO, this.alto / this._z / 2 - ((f0 + f1) / 2) * ESPACIADO];
  }
  centrarVista() {
    if (!this._encuadre) {
      const pts = [...Object.values(this.componentes).flatMap((c) => [c.punto_a, c.punto_b]), ...Object.values(this.cables).flatMap((c) => c.puntos)];
      if (!pts.length) return;
      const fs = pts.map((p) => p[0]), cs = pts.map((p) => p[1]);
      this._encuadre = [Math.min(...fs) - 1, Math.max(...fs) + 1, Math.min(...cs), Math.max(...cs)];
    }
    this._movido = false; this._aplicarEncuadre(); this.pedir();
  }
  get zoom() { return this._z; }
  zoomarEn(factor, x = this.ancho / 2, y = this.alto / 2) {
    const z0 = this._z, z1 = Math.min(2.5, Math.max(0.35, z0 * factor));
    if (z1 === z0) return;
    const wx = x / z0 - this._origen[0], wy = y / z0 - this._origen[1];
    this._z = z1; this._origen = [x / z1 - wx, y / z1 - wy]; this._movido = true;
    if (this.onZoom) this.onZoom(z1);
    this.pedir();
  }
  // Ajusta el zoom para que todo el circuito quepa y lo centra.
  ajustar() {
    const pts = [...Object.values(this.componentes).flatMap((c) => [c.punto_a, c.punto_b]), ...Object.values(this.cables).flatMap((c) => c.puntos)];
    let z = 1;
    if (pts.length) {
      const fs = pts.map((p) => p[0]), cs = pts.map((p) => p[1]);
      const f0 = Math.min(...fs) - 1, f1 = Math.max(...fs) + 1, c0 = Math.min(...cs) - 1, c1 = Math.max(...cs) + 1;
      z = Math.min(this.ancho / ((c1 - c0) * ESPACIADO), this.alto / ((f1 - f0) * ESPACIADO));
      z = Math.min(1.6, Math.max(0.35, z));
      this._encuadre = [f0 + 0.5, f1 - 0.5, c0 + 1, c1 - 1];
    }
    this._z = z; if (this.onZoom) this.onZoom(z);
    this._movido = false; this._aplicarEncuadre(); this.pedir();
  }
  restablecerZoom() { this._z = 1; if (this.onZoom) this.onZoom(1); this.centrarVista(); }
  moverVista(dx, dy) {
    if (!dx && !dy) return;
    this._origen[0] += dx / this._z; this._origen[1] += dy / this._z; this._movido = true; this.pedir();
  }

  // ---------- herramientas ----------
  activarHerramienta(n) {
    this.herramienta = n; this._cableEnProgreso = [];
    if (n !== "seleccionar" && this.seleccion.size) this.cambiarSeleccion(null);
    this._cursor = { seleccionar: "default", cable: "crosshair" }[n] || "crosshair";
    this.canvas.style.cursor = this._cursor;
    this.pedir();
  }
  establecerColorCableActual(c) { this.colorCableActual = c; this.pedir(); }
  hayBateria() { return Object.values(this.componentes).some((c) => c.tipo === "bateria"); }
  _nuevoTag() { this._sig += 1; return `obj_${this._sig}`; }
  _notificarCambio() {
    this._registrar();
    this._ultimoResultado = null;
    this._apagarBombillos();
    this.detenerCorriente();
    this.pedir();
    if (this.onCambio) this.onCambio();
  }

  // ---------- deshacer / rehacer ----------
  // Cada cambio guarda una foto del circuito; deshacer vuelve a la anterior.
  _estado() {
    const c = {};
    for (const [t, k] of Object.entries(this.componentes)) { c[t] = { ...k }; delete c[t].brillo; }
    return JSON.stringify({ c, k: this.cables, s: this._sig });
  }
  _registrar() {
    if (!this.editable || this._restaurando) return;
    const e = this._estado();
    if (e === this._hist[this._hist.length - 1]) return;
    this._hist.push(e);
    if (this._hist.length > 100) this._hist.shift();
    this._futuro = [];
  }
  reiniciarHistorial() { this._hist = [this._estado()]; this._futuro = []; }
  puedeDeshacer() { return this.editable && this._hist.length > 1; }
  puedeRehacer() { return this.editable && this._futuro.length > 0; }
  deshacer() {
    if (!this.puedeDeshacer()) return;
    this._futuro.push(this._hist.pop());
    this._restaurar(this._hist[this._hist.length - 1]);
  }
  rehacer() {
    if (!this.puedeRehacer()) return;
    const e = this._futuro.pop();
    this._hist.push(e);
    this._restaurar(e);
  }
  _restaurar(e) {
    const d = JSON.parse(e);
    this.componentes = d.c; this.cables = d.k; this._sig = d.s;
    for (const c of Object.values(this.componentes)) if (c.tipo === "bombillo") c.brillo = null;
    this._brilloObjetivo = {}; this._cableEnProgreso = []; this._arrastre = null; this._marco = null;
    this.cambiarSeleccion(null);
    this._restaurando = true;
    try { this._notificarCambio(); } finally { this._restaurando = false; }
  }

  // ---------- colocar ----------
  _colocar(tipo, [f, c]) {
    if (tipo === "bateria" && this.hayBateria()) return;
    const tag = this._nuevoTag();
    const base = { tipo, punto_a: [f, c], punto_b: this._puntoB(tipo, [f, c]) };
    if (tipo === "interruptor") base.cerrado = true;
    else base.valor = this.valoresNuevos[tipo];
    if (ESPEC[tipo]) base[ESPEC[tipo].campo] = this.especNuevas[tipo];
    if (tipo === "bombillo") base.brillo = null;
    this.componentes[tag] = base;
    this._notificarCambio();
    // Como en la primera versión web: la pieza queda seleccionada y se vuelve a "Mover"
    // (con Shift se sigue colocando más piezas del mismo tipo).
    if (!this._shift) { this.activarHerramienta("seleccionar"); if (this.onHerramienta) this.onHerramienta("seleccionar"); }
    this.cambiarSeleccion(tag);
  }
  _puntoB(tipo, [f, c]) {
    const vertical = (tipo === "bateria") !== !!this.girarNuevo;
    return vertical ? [f + 2, c] : [f, c + 2];
  }
  // ¿Se puede terminar un cable aquí? En un borne, en un extremo o doblez de otro cable,
  // o en medio de un tramo de cable (el motor lo toma como una unión).
  _hayTerminal(p) {
    return Object.values(this.componentes).some((k) => eq(k.punto_a, p) || eq(k.punto_b, p))
      || Object.values(this.cables).some((k) => k.puntos.some((q) => eq(q, p))
        || k.puntos.some((q, i) => i > 0 && puntosInteriores(k.puntos[i - 1], q).some((m) => eq(m, p))));
  }
  _terminarCable(pts) {
    this._cableEnProgreso = [];
    if (pts.length >= 2) {
      const tag = this._nuevoTag();
      this.cables[tag] = { puntos: pts, color: this.colorCableActual };
      for (const ext of [pts[0], pts[pts.length - 1]]) this.ping(this.pixel(ext), E.COLOR_ACENTO);
      this._notificarCambio();
    } else this.pedir();
  }

  // ---------- eventos ----------
  _enlazar() {
    const cv_ = this.canvas;
    const pos = (e) => { const r = cv_.getBoundingClientRect(); return [(e.clientX - r.left) / this._z, (e.clientY - r.top) / this._z]; };
    const posPx = (e) => { const r = cv_.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
    const manejadores = {
      pointerdown: (e) => {
        if (e.button !== 0 && e.button !== 1) return;
        if (e.button === 1) e.preventDefault();
        this._shift = e.shiftKey; this._mod = e.shiftKey || e.ctrlKey || e.metaKey;
        // rueda presionada o barra espaciadora: mover la vista; con el dedo, arrastrar el fondo también la mueve
        this._panForzado = e.button === 1 || this._espacio; this._tactil = e.pointerType === "touch";
        cv_.focus(); try { cv_.setPointerCapture(e.pointerId); } catch { /* */ } this._alClick(...pos(e));
      },
      pointermove: (e) => { const [x, y] = pos(e); this._mouse = [x, y]; this._alMover(x, y); },
      pointerup: (e) => { try { cv_.releasePointerCapture(e.pointerId); } catch { /* */ } this._alSoltar(); },
      pointerleave: () => { this._mouse = null; this.pedir(); },
      dblclick: (e) => this._alDoble(...pos(e)),
      wheel: (e) => {
        if (this.estatico) return;
        e.preventDefault();
        const rueda = e.ctrlKey || e.metaKey || (e.deltaX === 0 && Math.abs(e.deltaY) >= 50 && Number.isInteger(e.deltaY));
        if (rueda) { const [x, y] = posPx(e); this.zoomarEn(Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.0015)), x, y); }
        else this.moverVista(-e.deltaX, -e.deltaY);
      },
    };
    this._escuchas = Object.entries(manejadores);
    for (const [t, f] of this._escuchas) cv_.addEventListener(t, f, { passive: t !== "wheel" });
    // Los atajos del tablero editable funcionan aunque el foco esté en un botón del panel.
    this._destinoTeclado = this.estatico ? cv_ : window;
    this._escuchasTeclado = [["keydown", (e) => this._alTecla(e)], ["keyup", (e) => this._alSoltarTecla(e)]];
    for (const [t, f] of this._escuchasTeclado) this._destinoTeclado.addEventListener(t, f);
    cv_.tabIndex = 0; cv_.style.outline = "none"; cv_.style.touchAction = this.estatico ? "pan-y" : "none";
  }
  _alTecla(e) {
    const t = e.target;
    if (t && t !== this.canvas && (/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) || t.isContentEditable)) return;
    const mod = e.ctrlKey || e.metaKey, k = e.key.toLowerCase();
    if (e.key === " ") {
      if (this.estatico || !this._mouse || mod || (t !== this.canvas && t !== document.body)) return;
      e.preventDefault();
      if (!this._espacio) { this._espacio = true; if (!this._pan) this.canvas.style.cursor = "grab"; }
      return;
    }
    if (mod) {
      if (!this.editable) {
        if (k === "a" && t === this.canvas) { e.preventDefault(); this._fijarSeleccion(Object.keys(this.componentes)); }
        return;
      }
      const textoMarcado = String(window.getSelection ? window.getSelection() : "") !== "";
      if (k === "z") { e.preventDefault(); if (e.shiftKey) this.rehacer(); else this.deshacer(); }
      else if (k === "y") { e.preventDefault(); this.rehacer(); }
      else if (k === "a") { e.preventDefault(); this.seleccionarTodo(); }
      else if ((k === "c" || k === "x") && this.seleccion.size && !textoMarcado) { e.preventDefault(); if (k === "c") this.copiar(); else this.cortar(); }
      else if (k === "v" && PORTAPAPELES) { e.preventDefault(); this.pegar(); }
      else if (k === "d" && this.seleccion.size) { e.preventDefault(); this.duplicar(); }
      return;
    }
    if (e.key === "Delete" || e.key === "Backspace") { if (this.editable && this.seleccion.size) { this.eliminarSeleccionado(); e.preventDefault(); } }
    else if (e.key === "Escape") this._cancelarODeseleccionar();
    else if (k === "r") {
      const c = this.componentes[this.seleccionado];
      if (this.editable && c && this.herramienta === "seleccionar") this.girar(this.seleccionado);
      else if (this._esPieza(this.herramienta)) { this.girarNuevo = !this.girarNuevo; this.pedir(); }
    }
  }
  _alSoltarTecla(e) {
    if (e.key !== " " || !this._espacio) return;
    this._espacio = false;
    if (!this._pan) this.canvas.style.cursor = this._cursor;
  }
  _cancelarODeseleccionar() {
    if (this._marco) { this._marco = null; this.pedir(); }
    if (this._cableEnProgreso.length) { this._cableEnProgreso = []; this.pedir(); }
    else if (this.seleccion.size) this.cambiarSeleccion(null);
    else { this.activarHerramienta("seleccionar"); if (this.onHerramienta) this.onHerramienta("seleccionar"); }
  }

  _alClick(x, y) {
    const punto = this.punto(x, y);
    this._pan = null;
    if (!this.editable) {
      if (this._panForzado && !this.estatico) { this._pan = [x, y]; this.canvas.style.cursor = "grabbing"; return; }
      const tag = this.tagEn(x, y);
      const comp = this.componentes[tag];
      // en las lecciones solo se eligen piezas (no cables): recuadro y Shift/Ctrl + clic como en el simulador
      if (!this.estatico && !comp && !this._tactil) {
        this._marco = { x0: x, y0: y, x1: x, y1: y, base: this._mod ? [...this.seleccion] : [] };
        if (!this._mod) this.cambiarSeleccion(null);
        this.pedir();
        return;
      }
      if (comp && this._mod && !this.estatico) {
        const sel = new Set(this.seleccion);
        if (sel.has(tag)) sel.delete(tag); else sel.add(tag);
        this._fijarSeleccion([...sel]);
        return;
      }
      if (comp && comp.tipo === "interruptor") {
        if (this.permitirInterruptores) this.establecerInterruptor(tag, !comp.cerrado);
        else {
          this._pingComponente(tag, E.COLOR_ADVERTENCIA);
          if (this.onInterruptorBloqueado) this.onInterruptorBloqueado(tag);
        }
      }
      this.cambiarSeleccion(comp ? tag : null);
      if (!comp && !this.estatico) this._pan = [x, y];
      return;
    }
    if (this._panForzado && !this.estatico) { this._pan = [x, y]; this.canvas.style.cursor = "grabbing"; return; }
    if (PIEZAS.includes(this.herramienta)) {
      this._colocar(this.herramienta, punto); return;
    }
    if (this.herramienta === "cable") {
      const c = this._cableEnProgreso;
      if (!c.length) { c.push(punto); this.pedir(); return; }
      if (eq(punto, c[c.length - 1])) return;
      if (this._hayTerminal(punto)) { this._terminarCable([...c, punto]); return; }  // termina solo al tocar una conexión
      c.push(punto); this.pedir();
      return;
    }
    const tag = this.tagEn(x, y);
    if (!tag) {
      if (this._tactil) { this._pan = [x, y]; return; }
      // arrastrar sobre el fondo dibuja un recuadro de selección (con Shift/Ctrl se suma a lo que ya había)
      this._marco = { x0: x, y0: y, x1: x, y1: y, base: this._mod ? [...this.seleccion] : [] };
      if (!this._mod) this.cambiarSeleccion(null);
      this.pedir();
      return;
    }
    if (this._mod) {
      const sel = new Set(this.seleccion);
      if (sel.has(tag)) sel.delete(tag); else sel.add(tag);
      this._fijarSeleccion([...sel]);
      return;
    }
    if (!this.seleccion.has(tag)) this.cambiarSeleccion(tag);
    // se arrastra desde una pieza; los cables seleccionados se mueven con ella
    this._arrastre = { tag, ultimo: this.componentes[tag] ? this.punto(x, y) : null, movido: false };
  }

  _alMover(x, y) {
    if (this._pan) {
      const [x0, y0] = this._pan;
      this._pan = [x, y];
      this.canvas.style.cursor = "grabbing";
      this.moverVista(x - x0, y - y0);
      return;
    }
    if (this._marco) {
      this._marco.x1 = x; this._marco.y1 = y;
      this._fijarSeleccion([...this._marco.base, ...this._tagsEnMarco()]);
      return;
    }
    const a = this._arrastre;
    if (this.editable && this.herramienta === "seleccionar" && a && a.ultimo) {
      const g = this.punto(x, y), df = g[0] - a.ultimo[0], dc = g[1] - a.ultimo[1];
      if (df || dc) { this._desplazar([...this.seleccion], df, dc); a.ultimo = g; a.movido = true; this.pedir(); }
      return;
    }
    if (this.herramienta === "seleccionar") {
      const c = this._interruptorEn(x, y) ? "pointer" : "default";
      if (this.canvas.style.cursor !== c) this.canvas.style.cursor = c;
    }
    if ((this.herramienta === "cable" && this._cableEnProgreso.length) || this._esPieza(this.herramienta)) this.pedir();
  }
  _esPieza(h) { return PIEZAS.includes(h); }
  _alSoltar() {
    if (this._pan) { this._pan = null; this.canvas.style.cursor = this._espacio ? "grab" : this._cursor; this.pedir(); }
    if (this._marco) { this._marco = null; this.pedir(); }
    const a = this._arrastre;
    this._arrastre = null;
    if (!a) return;
    if (a.movido) { this._notificarCambio(); return; }
    // un clic sin arrastrar: dentro de un grupo deja solo esa pieza; sobre un interruptor lo alterna
    if (this.seleccion.size > 1) { this.cambiarSeleccion(a.tag); return; }
    const comp = this.componentes[a.tag];
    if (comp && comp.tipo === "interruptor") {
      comp.cerrado = !comp.cerrado;
      this._pingComponente(a.tag, comp.cerrado ? E.COLOR_EXITO : E.COLOR_TEXTO_SECUNDARIO);
      this._notificarCambio();
    }
  }
  // Mueve las piezas y cables indicados; los cables sueltos conectados a ellas las siguen.
  _desplazar(tags, df, dc) {
    const sel = new Set(tags), mover = (p) => [p[0] + df, p[1] + dc], mapa = new Map();
    for (const t of tags) {
      const c = this.componentes[t]; if (!c) continue;
      mapa.set(kp(c.punto_a), mover(c.punto_a)); mapa.set(kp(c.punto_b), mover(c.punto_b));
      c.punto_a = mover(c.punto_a); c.punto_b = mover(c.punto_b);
    }
    for (const [t, k] of Object.entries(this.cables)) {
      const extremos = [k.puntos[0], k.puntos[k.puntos.length - 1]];
      if (sel.has(t) || extremos.every((p) => mapa.has(kp(p)))) k.puntos = k.puntos.map(mover);
      else k.puntos = k.puntos.map((q) => mapa.get(kp(q)) || q);
    }
  }
  _tagsEnMarco() {
    const m = this._marco;
    const r = [Math.min(m.x0, m.x1), Math.min(m.y0, m.y1), Math.max(m.x0, m.x1), Math.max(m.y0, m.y1)];
    if (r[2] - r[0] < 4 && r[3] - r[1] < 4) return [];
    const dentro = [];
    for (const [t, c] of Object.entries(this.componentes)) {
      const [x1, y1] = this.pixel(c.punto_a), [x2, y2] = this.pixel(c.punto_b);
      if (segEnRect(x1, y1, x2, y2, r)) dentro.push(t);
    }
    if (!this.editable) return dentro;
    for (const [t, k] of Object.entries(this.cables)) {
      const p = k.puntos.map((q) => this.pixel(q));
      for (let i = 0; i + 1 < p.length; i++) if (segEnRect(...p[i], ...p[i + 1], r)) { dentro.push(t); break; }
    }
    return dentro;
  }
  _alDoble(x, y) {
    if (this.herramienta === "cable" && this._cableEnProgreso.length) {
      const final = this.punto(x, y);
      const pts = [...this._cableEnProgreso];
      if (!eq(final, pts[pts.length - 1])) pts.push(final);
      this._terminarCable(pts);
    }
  }

  // ---------- seleccion ----------
  cambiarSeleccion(tag) { this._fijarSeleccion(tag ? [tag] : []); }
  _fijarSeleccion(tags) {
    const nueva = new Set(tags.filter((t) => this.componentes[t] || this.cables[t]));
    const igual = nueva.size === this.seleccion.size && [...nueva].every((t) => this.seleccion.has(t));
    const ant = this.seleccionado;
    this.seleccion = nueva;
    this.seleccionado = nueva.size === 1 ? [...nueva][0] : null;
    if (this.seleccionado && this.seleccionado !== ant && !this.suave && !this._marco) this._pingComponente(this.seleccionado, E.COLOR_CIAN);
    this.pedir();
    // mientras se dibuja el recuadro solo se avisa cuando la selección cambia
    if (this.onSeleccion && (!igual || !this._marco)) this.onSeleccion(this.seleccionado);
  }
  seleccionarTodo() {
    if (!this.editable) return;
    if (this.herramienta !== "seleccionar") { this.activarHerramienta("seleccionar"); if (this.onHerramienta) this.onHerramienta("seleccionar"); }
    this._fijarSeleccion([...Object.keys(this.componentes), ...Object.keys(this.cables)]);
  }
  eliminarSeleccionado() {
    if (!this.editable || !this.seleccion.size) return;
    for (const t of this.seleccion) { delete this.componentes[t]; delete this.cables[t]; }
    this.cambiarSeleccion(null);
    this._notificarCambio();
  }

  // ---------- copiar y pegar ----------
  copiar() {
    if (!this.seleccion.size) return;
    const comps = [], cables = [];
    for (const t of this.seleccion) {
      if (this.componentes[t]) { const c = clonar(this.componentes[t]); delete c.brillo; comps.push(c); }
      else if (this.cables[t]) cables.push(clonar(this.cables[t]));
    }
    PORTAPAPELES = { comps, cables, veces: 0 };
  }
  cortar() {
    if (!this.editable || !this.seleccion.size) return;
    this.copiar();
    PORTAPAPELES.veces = -1; // lo cortado se pega en su mismo lugar
    this.eliminarSeleccionado();
  }
  duplicar() { this.copiar(); this.pegar(); }
  // Pega a la derecha de lo copiado (cada pegado se corre un poco más) y deja lo pegado seleccionado.
  // Si ya hay una batería, la copiada no se pega: solo puede haber una.
  pegar() {
    const P = PORTAPAPELES;
    if (!this.editable || !P) return 0;
    const pts = [...P.comps.flatMap((c) => [c.punto_a, c.punto_b]), ...P.cables.flatMap((k) => k.puntos)];
    if (!pts.length) return 0;
    const cs = pts.map((p) => p[1]);
    P.veces += 1;
    const dc = (Math.max(...cs) - Math.min(...cs) + 2) * P.veces, mover = (p) => [p[0], p[1] + dc];
    if (this.herramienta !== "seleccionar") { this.activarHerramienta("seleccionar"); if (this.onHerramienta) this.onHerramienta("seleccionar"); }
    const nuevos = [];
    let hayBat = this.hayBateria();
    for (const c of P.comps) {
      if (c.tipo === "bateria") { if (hayBat) continue; hayBat = true; }
      const t = this._nuevoTag();
      this.componentes[t] = { ...clonar(c), punto_a: mover(c.punto_a), punto_b: mover(c.punto_b), ...(c.tipo === "bombillo" ? { brillo: null } : {}) };
      nuevos.push(t);
    }
    for (const k of P.cables) { const t = this._nuevoTag(); this.cables[t] = { color: k.color, puntos: k.puntos.map(mover) }; nuevos.push(t); }
    this._fijarSeleccion(nuevos);
    this._asegurarVisible(nuevos);
    this._notificarCambio();
    return nuevos.length;
  }
  hayParaPegar() { return !!PORTAPAPELES; }
  _asegurarVisible(tags) {
    const cajas = tags.map((t) => this.bbox(t)).filter(Boolean);
    if (!cajas.length) return;
    const x0 = Math.min(...cajas.map((b) => b[0])), y0 = Math.min(...cajas.map((b) => b[1]));
    const x1 = Math.max(...cajas.map((b) => b[2])), y1 = Math.max(...cajas.map((b) => b[3]));
    const W = this.ancho / this._z, H = this.alto / this._z, m = 30;
    let dx = 0, dy = 0;
    if (x1 > W - m) dx = W - m - x1;
    if (x0 + dx < m) dx = m - x0;
    if (y1 > H - m) dy = H - m - y1;
    if (y0 + dy < m) dy = m - y0;
    this.moverVista(dx * this._z, dy * this._z);
  }
  elemento(tag) { return this.componentes[tag] || this.cables[tag]; }

  // ---------- edicion desde el panel ----------
  establecerValor(tag, v) { const c = this.componentes[tag]; if (!c || !("valor" in c)) return; c.valor = v; this._notificarCambio(); }
  establecerColorCable(tag, col) { if (!this.cables[tag]) return; this.cables[tag].color = col; this._registrar(); this.pedir(); }
  establecerInterruptor(tag, cerrado) {
    const c = this.componentes[tag];
    if (!c || c.tipo !== "interruptor" || c.cerrado === cerrado) return;
    c.cerrado = cerrado;
    this._pingComponente(tag, cerrado ? E.COLOR_EXITO : E.COLOR_TEXTO_SECUNDARIO);
    this._notificarCambio();
  }
  girar(tag) {
    const c = this.componentes[tag]; if (!c) return;
    const [fa, ca] = c.punto_a, [fb, cb] = c.punto_b;
    const nb = [fa + (cb - ca), ca - (fb - fa)];
    for (const k of Object.values(this.cables)) k.puntos = k.puntos.map((q) => (eq(q, c.punto_b) ? nb : q));
    c.punto_b = nb;
    this._notificarCambio();
  }

  // ---------- exportar ----------
  exportarParaMotor() {
    let cables = [];
    for (const c of Object.values(this.cables)) for (let i = 0; i + 1 < c.puntos.length; i++) cables.push([c.puntos[i], c.puntos[i + 1]]);
    const bornes = Object.values(this.componentes).flatMap((c) => [c.punto_a, c.punto_b]);
    cables = dividirEnUniones(cables, bornes);
    const resistencias = [], tagsR = [];
    let bateria = null;
    for (const [tag, c] of Object.entries(this.componentes)) {
      if (c.danado) continue; // fundida, quemada o abierta: ya no conduce
      if (c.tipo === "resistencia" || c.tipo === "bombillo") { resistencias.push([c.punto_a, c.punto_b, c.valor]); tagsR.push(tag); }
      else if ((c.tipo === "interruptor" && c.cerrado) || c.tipo === "fusible") cables.push([c.punto_a, c.punto_b]);
      else if (c.tipo === "bateria") bateria = [c.punto_a, c.punto_b, c.valor];
    }
    return { cables, resistencias, bateria, tagsR };
  }

  // ---------- fallas ----------
  // `calor`: tag -> θ (o avance de fusión del fusible); `fuente`: medición física (fallas.medir).
  fijarTermico(calor, fuente) {
    this.calor = calor || {}; this.fuente = fuente || null;
    // una resistencia sobrecalentada echa hilos de humo antes de quemarse
    const ahora = performance.now() / 1000;
    this._humoT = this._humoT || {};
    for (const [tag, k] of Object.entries(this.calor)) {
      const c = this.componentes[tag];
      if (!c || c.danado || c.tipo !== "resistencia" || k < 0.85 || ahora - (this._humoT[tag] || 0) < 0.55) continue;
      this._humoT[tag] = ahora;
      const g = this._geom(c);
      this._efecto("humo", [g.mx + (Math.random() - 0.5) * 14, g.my - 6], 1.6, { suave: true });
    }
    // cortocircuito: el aviso aparece una vez cada vez que empieza
    const corto = !!(fuente && fuente.corto);
    if (corto && !this._enCorto) {
      const bat = Object.values(this.componentes).find((c) => c.tipo === "bateria");
      if (bat) { const g = this._geom(bat); this.sacudir(4, 0.35); this._efecto("onda", [g.mx, g.my], 0.5, { radio: 50 }); this._efecto("texto", [g.mx + 40, g.my - 34], 1.6, { texto: "¡CORTOCIRCUITO!", color: E.COLOR_ERROR }); this._efecto("arco", [g.x1, g.y1], 0.7, { hasta: [g.x2, g.y2] }); }
    }
    this._enCorto = corto;
    this.pedir();
  }
  hayDanados() { return Object.values(this.componentes).some((c) => c.danado); }
  marcarDanado(tag) {
    const c = this.componentes[tag]; if (!c || c.danado) return;
    c.danado = true;
    const g = this._geom(c), centro = [g.mx, g.my], arriba = [g.mx, g.my - 30];
    if (c.tipo === "bombillo") {
      // estalla: destello, vidrios que salen volando, chispas y una nube de humo
      c.brillo = null; this._brilloObjetivo[tag] = 0;
      this._efecto("destello", centro, 0.6, { grande: true });
      this._efecto("onda", centro, 0.55, { radio: 80 });
      this._efecto("chispero", centro, 1.1, { n: 18 });
      this._efecto("vidrios", centro, 1.1);
      this.sacudir(6, 0.4);
      this._efecto("chispa", centro, 0.55); this._efecto("chispa", centro, 0.75);
      this._efecto("humo", [g.mx, g.my - 8], 2.2);
      this._efecto("texto", arriba, 1.5, { texto: "¡FUNDIDO!", color: E.COLOR_ERROR });
    } else if (c.tipo === "resistencia") {
      // se quema: llama corta, humo espeso y chispas
      this._efecto("llama", centro, 1.6);
      this._efecto("chispero", centro, 0.9, { n: 10 });
      this.sacudir(3, 0.3);
      this._efecto("humo", [g.mx - 6, g.my - 6], 2.4); this._efecto("humo", [g.mx + 6, g.my - 4], 2.6);
      this._efecto("chispa", centro, 0.6);
      this._efecto("texto", arriba, 1.5, { texto: "¡QUEMADA!", color: E.COLOR_ERROR });
    } else if (c.tipo === "fusible") {
      // el hilo se abre con un arco brillante
      this._efecto("destello", centro, 0.35);
      this._efecto("onda", centro, 0.4, { radio: 40 });
      this._efecto("chispero", centro, 0.8, { n: 12 });
      this.sacudir(3, 0.25);
      this._efecto("arco", [g.mx - g.ux * 8, g.my - g.uy * 8], 0.45, { hasta: [g.mx + g.ux * 8, g.my + g.uy * 8] });
      this._efecto("chispa", centro, 0.5);
      this._efecto("texto", arriba, 1.5, { texto: "¡FUSIBLE ABIERTO!", color: E.COLOR_ADVERTENCIA });
    } else this._efecto("chispa", centro, 0.5);
    this._pingComponente(tag, E.COLOR_ERROR);
    this._notificarCambio();
  }
  reparar(tag) {
    const c = this.componentes[tag]; if (!c || !c.danado) return;
    delete c.danado; delete this.calor[tag];
    this._pingComponente(tag, E.COLOR_EXITO);
    this._notificarCambio();
  }
  repararTodo() {
    const tags = Object.keys(this.componentes).filter((t) => this.componentes[t].danado);
    if (!tags.length) return;
    for (const t of tags) { delete this.componentes[t].danado; delete this.calor[t]; }
    this.iluminar(tags, E.COLOR_EXITO);
    this._notificarCambio();
  }
  establecerEspec(tag, v) {
    const c = this.componentes[tag], e = c && ESPEC[c.tipo]; if (!e) return;
    c[e.campo] = v; this._notificarCambio();
  }
  // Chispas en un punto (en píxeles): solo se piden cuando el modelo indica un cortocircuito o una falla.
  chispas(puntos) {
    for (const p of puntos) { this._efecto("chispa", p, 0.4); if (Math.random() < 0.5) this._efecto("chispero", p, 0.7, { n: 6 }); }
  }
  sacudir(fuerza = 5, dur = 0.35) {
    if (movimientoReducido()) return;
    if (this.estatico) fuerza = Math.min(fuerza, 3); // en la portada, más discreto
    this._sacudida = { inicio: performance.now() / 1000, dur, fuerza }; this.pedir();
  }
  _efecto(tipo, centro, duracion, extra = {}) {
    // con movimiento reducido solo quedan el destello y el letrero (informan sin moverse)
    if (movimientoReducido() && tipo !== "destello" && tipo !== "texto") return;
    const e = { tipo, centro, duracion, inicio: performance.now() / 1000, semilla: Math.random() * 1000, ...extra };
    if (tipo === "chispero") e.trozos = Array.from({ length: extra.n || 16 }, () => {
      const a = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 1.6, v = 90 + Math.random() * 170;
      return { vx: Math.cos(a) * v, vy: Math.sin(a) * v, largo: 5 + Math.random() * 7 };
    });
    if (tipo === "vidrios") e.trozos = Array.from({ length: 11 }, (_, i) => {
      const a = (i / 11) * Math.PI * 2 + Math.random() * 0.5, v = 70 + Math.random() * 90;
      return { vx: Math.cos(a) * v, vy: Math.sin(a) * v - 60, giro: (Math.random() - 0.5) * 14, t: 3 + Math.random() * 4 };
    });
    this._efectos.push(e);
    this.pedir();
  }
  mostrarResultados(resultado, tagsR, animarCorriente = true) {
    this._ultimoResultado = [resultado, [...tagsR]];
    for (const [tag, d] of tagsR.map((t, i) => [t, resultado.resistencias[i]])) {
      const c = this.componentes[tag];
      if (c && c.tipo === "bombillo") this._fijarBrillo(tag, brilloPara(d.potencia));
    }
    if (animarCorriente) this.iniciarCorriente(resultado);
    this.pedir();
  }
  datosDe(tag) {
    if (!this._ultimoResultado) return null;
    const [r, tags] = this._ultimoResultado;
    const i = tags.indexOf(tag);
    return i >= 0 ? r.resistencias[i] : null;
  }
  limpiarResultados() { this._ultimoResultado = null; this._apagarBombillos(); this.detenerCorriente(); this.pedir(); }
  _apagarBombillos() {
    for (const [tag, c] of Object.entries(this.componentes)) {
      if (c.tipo === "bombillo" && (c.brillo || this._brilloObjetivo[tag])) this._fijarBrillo(tag, 0);
    }
  }
  limpiar() {
    this.componentes = {}; this.cables = {}; this._ultimoResultado = null; this._brilloObjetivo = {};
    this._fases = {}; this._resaltado = null; this._guia = null;
    this.cambiarSeleccion(null); this._notificarCambio();
  }
  cargarEjemplo(def) {
    this.componentes = {}; this.cables = {}; this._ultimoResultado = null; this._brilloObjetivo = {};
    this._fases = {}; this._resaltado = null; this._guia = null; this._sig = 0;
    this.cambiarSeleccion(null);
    if (def.bateria) { const [a, b, v, imax] = def.bateria; this.componentes[this._nuevoTag()] = { tipo: "bateria", punto_a: a, punto_b: b, valor: v, ...(imax ? { imax } : {}) }; }
    for (const [a, b, v] of def.resistencias || []) this.componentes[this._nuevoTag()] = { tipo: "resistencia", punto_a: a, punto_b: b, valor: v };
    // un 4.º dato opcional en bombillos/resistencias es su potencia máxima; en la batería, su corriente máxima
    for (const [a, b, v, pmax] of def.bombillos || []) this.componentes[this._nuevoTag()] = { tipo: "bombillo", punto_a: a, punto_b: b, valor: v, brillo: null, ...(pmax ? { pmax } : {}) };
    for (const [a, b, c] of def.interruptores || []) this.componentes[this._nuevoTag()] = { tipo: "interruptor", punto_a: a, punto_b: b, cerrado: c };
    for (const [a, b, v] of def.fusibles || []) this.componentes[this._nuevoTag()] = { tipo: "fusible", punto_a: a, punto_b: b, valor: v };
    for (const [a, b] of def.cables || []) this.cables[this._nuevoTag()] = { puntos: [a, b], color: cv.COLOR_CABLE_DEFECTO };
    this._notificarCambio();
    this.reiniciarHistorial(); // deshacer no regresa a lo que había antes de cargar el circuito
  }
  // Cambia el circuito desde fuera (la acción de un caso: cerrar un interruptor, subir el voltaje…).
  aplicar(fn) { fn(this.componentes, this.cables); this._notificarCambio(); }
  // Carga piezas ya armadas (con sus límites y estados), por ejemplo un reto.
  cargarPiezas(componentes, cables) {
    this.componentes = clonar(componentes); this.cables = clonar(cables);
    for (const c of Object.values(this.componentes)) if (c.tipo === "bombillo") c.brillo = null;
    this._ultimoResultado = null; this._brilloObjetivo = {}; this._fases = {}; this._resaltado = null; this._guia = null; this.calor = {};
    this._sig = Math.max(0, ...[...Object.keys(this.componentes), ...Object.keys(this.cables)].map((t) => parseInt(t.split("_").pop(), 10) || 0));
    this.cambiarSeleccion(null);
    this._notificarCambio();
    this.reiniciarHistorial();
  }
  tagsPorTipo(tipo) {
    const n = (t) => parseInt(t.split("_").pop(), 10) || 0;
    return Object.entries(this.componentes).filter(([, c]) => c.tipo === tipo).map(([t]) => t).sort((a, b) => n(a) - n(b));
  }
  mostrarNombres(nombres) { this._nombres = { ...nombres }; this.pedir(); }

  // ---------- geometria / hit-test ----------
  _geom(comp) {
    const [x1, y1] = this.pixel(comp.punto_a), [x2, y2] = this.pixel(comp.punto_b);
    const L = Math.hypot(x2 - x1, y2 - y1) || 1;
    const ux = (x2 - x1) / L, uy = (y2 - y1) / L;
    return { x1, y1, x2, y2, L, ux, uy, px: -uy, py: ux, mx: (x1 + x2) / 2, my: (y1 + y2) / 2 };
  }
  _distSeg(x, y, x1, y1, x2, y2) {
    const dx = x2 - x1, dy = y2 - y1, l2 = dx * dx + dy * dy;
    const t = l2 === 0 ? 0 : Math.max(0, Math.min(1, ((x - x1) * dx + (y - y1) * dy) / l2));
    return Math.hypot(x - (x1 + dx * t), y - (y1 + dy * t));
  }
  _interruptorEn(x, y, margen = 16) {
    let mejor = null, md = margen;
    for (const [tag, c] of Object.entries(this.componentes)) {
      if (c.tipo !== "interruptor") continue;
      const [x1, y1] = this.pixel(c.punto_a), [x2, y2] = this.pixel(c.punto_b);
      const d = this._distSeg(x, y, x1, y1, x2, y2);
      if (d <= md) { mejor = tag; md = d; }
    }
    return mejor;
  }
  tagEn(x, y) {
    const sw = this._interruptorEn(x, y);
    if (sw) return sw;
    let mejor = null, md = Infinity;
    for (const [tag, c] of Object.entries(this.componentes)) {
      const g = this._geom(c);
      const d = this._distSeg(x, y, g.x1, g.y1, g.x2, g.y2);
      const along = Math.abs((x - g.mx) * g.ux + (y - g.my) * g.uy);
      const cuerpo = c.tipo === "bateria" ? 12 : c.tipo === "bombillo" ? 19 : 12;
      const zona = along <= (c.tipo === "resistencia" ? Math.min(46, g.L * 0.6) / 2 : c.tipo === "bateria" ? 10 : 18) ? cuerpo : 4;
      if (d <= zona && d < md) { mejor = tag; md = d; }
    }
    if (mejor) return mejor;
    for (const [tag, c] of Object.entries(this.cables)) {
      for (let i = 0; i + 1 < c.puntos.length; i++) {
        const [x1, y1] = this.pixel(c.puntos[i]), [x2, y2] = this.pixel(c.puntos[i + 1]);
        if (this._distSeg(x, y, x1, y1, x2, y2) <= 6) return tag;
      }
    }
    return null;
  }
  // Caja aproximada de un elemento (incluye su etiqueta), como canvas.bbox en Tk.
  bbox(tag) {
    const c = this.componentes[tag];
    if (c) {
      const g = this._geom(c);
      const xs = [g.x1, g.x2], ys = [g.y1, g.y2];
      const h = c.tipo === "bateria" ? 18 : 12;
      xs.push(g.x1 + g.px * h, g.x1 - g.px * h, g.x2 + g.px * h, g.x2 - g.px * h);
      ys.push(g.y1 + g.py * h, g.y1 - g.py * h, g.y2 + g.py * h, g.y2 - g.py * h);
      const lx = g.mx - g.px * (c.tipo === "bateria" ? 30 : 23), ly = g.my - g.py * (c.tipo === "bateria" ? 30 : 23);
      xs.push(lx - 24, lx + 24); ys.push(ly - 7, ly + 7);
      return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)];
    }
    const k = this.cables[tag];
    if (k) {
      const p = k.puntos.map((q) => this.pixel(q));
      return [Math.min(...p.map((a) => a[0])), Math.min(...p.map((a) => a[1])), Math.max(...p.map((a) => a[0])), Math.max(...p.map((a) => a[1]))];
    }
    return null;
  }

  // ---------- animacion: corriente ----------
  iniciarCorriente(resultado) {
    const { cables, resistencias, bateria, tagsR } = this.exportarParaMotor();
    if (!bateria) { this.detenerCorriente(); return; }
    const tagBat = Object.keys(this.componentes).find((t) => this.componentes[t].tipo === "bateria") ?? null;
    const tr = calcularTrayectos(cables, resistencias, bateria, resultado, tagsR, tagBat);
    this._trayectos = [];
    for (const t of tr) {
      const [x1, y1] = this.pixel(t.desde), [x2, y2] = this.pixel(t.hasta);
      const largo = Math.hypot(x2 - x1, y2 - y1);
      if (largo < 1) continue;
      const k = `${clave(t.desde)}>${clave(t.hasta)}>${t.tipo}`;
      this._trayectos.push({
        desde: t.desde, hasta: t.hasta, clave: k, inicio: [x1, y1], fin: [x2, y2], largo,
        velocidad: velocidadPara(t.corriente) * (this.suave ? SUAVE.velocidad : 1), tipo: t.tipo,
        cantidad: Math.max(1, Math.floor(largo / (this.suave ? SUAVE.separacion : SEPARACION))),
      });
      if (!(k in this._fases)) this._fases[k] = 0;
    }
    this._tUltimo = performance.now() / 1000;
    this.pedir();
  }
  detenerCorriente() { this._trayectos = []; this.pedir(); }
  hayCorriente() { return this._trayectos.length > 0; }
  _avanzarParticulas(dt) {
    if (!this._trayectos.length || movimientoReducido()) return;
    for (const tr of this._trayectos) this._fases[tr.clave] = ((this._fases[tr.clave] || 0) + tr.velocidad * dt) % tr.largo;
  }

  // ---------- animacion: bombillos ----------
  _fijarBrillo(tag, obj) {
    const c = this.componentes[tag]; if (!c) return;
    this._brilloObjetivo[tag] = obj;
    if (movimientoReducido()) c.brillo = obj > 0.004 ? obj : null;
    this.pedir();
  }
  _bombillosEnTransicion() {
    for (const [tag, obj] of Object.entries(this._brilloObjetivo)) {
      const c = this.componentes[tag];
      if (c && Math.abs((c.brillo || 0) - obj) > 0.004) return true;
    }
    return false;
  }
  _avanzarBombillos(dt) {
    const k = this.suave ? SUAVE.constante_brillo : CONST_BRILLO;
    const f = dt > 0 ? 1 - Math.exp(-dt / k) : 0;
    for (const [tag, obj] of Object.entries(this._brilloObjetivo)) {
      const c = this.componentes[tag];
      if (!c) { delete this._brilloObjetivo[tag]; continue; }
      const a = c.brillo || 0;
      if (Math.abs(a - obj) <= 0.004) continue;
      let n = a + (obj - a) * f;
      if (Math.abs(n - obj) <= 0.004) n = obj;
      c.brillo = n > 0.004 ? n : null;
    }
  }

  // ---------- efectos ----------
  ping(centro, color, radioFinal = 24, duracion = 0.35) {
    if (movimientoReducido()) return;
    if (this.suave) { radioFinal *= SUAVE.ping; color = mezclarColor(color, cv.COLOR_FONDO_LIENZO, 0.35); }
    this._efectos.push({ tipo: "ping", centro, color, radioFinal, duracion, inicio: performance.now() / 1000 });
    this.pedir();
  }
  _pingComponente(tag, color) {
    const b = this.bbox(tag);
    if (b) this.ping([(b[0] + b[2]) / 2, (b[1] + b[3]) / 2], color, Math.max(22, (b[2] - b[0]) / 2 + 8));
  }
  iluminar(tags = null, color = null, duracion = 0.7) {
    if (movimientoReducido()) return;
    color = color || E.COLOR_CIAN;
    if (this.suave) { color = mezclarColor(color, cv.COLOR_FONDO_LIENZO, 0.45); duracion *= 0.8; }
    const lista = tags ? [...tags] : Object.keys(this.componentes);
    if (!lista.length) return;
    this._efectos.push({ tipo: "pulso", tags: lista, color, duracion, crecimiento: this.suave ? 2 : 5, inicio: performance.now() / 1000 });
    this.pedir();
  }
  cancelarEfectos() { this._efectos = []; this.pedir(); }
  resaltar(puntos = [], tags = [], color = null) { this._resaltado = { puntos: [...puntos], tags: [...tags], color: color || E.COLOR_ADVERTENCIA }; this.pedir(); }
  limpiarResaltado() { this._resaltado = null; this.pedir(); }
  mostrarGuia(g, color = null) {
    const vacia = !g || !["caminos", "puntos", "tags", "zonas", "cables_borrar"].some((k) => g[k] && g[k].length);
    if (vacia) { this.limpiarGuia(); return; }
    this._guia = { ...g, color: color || E.COLOR_ELECTRICIDAD_OSCURO }; this.pedir();
  }
  limpiarGuia() { this._guia = null; this.pedir(); }
  hayGuia() { return !!this._guia; }

  // ================= DIBUJO =================
  _dibujar(ahora) {
    const ctx = this.ctx;
    const z = this._z, wA = this.ancho / z, wH = this.alto / z;
    // sacudida breve cuando algo estalla (se desvanece en pocas décimas)
    let dx = 0, dy = 0;
    const sac = this._sacudida;
    if (sac) {
      const t = (ahora - sac.inicio) / sac.dur;
      if (t >= 1) this._sacudida = null;
      else { const f = sac.fuerza * (1 - t) ** 2; dx = Math.sin(ahora * 90) * f; dy = Math.cos(ahora * 77) * f; }
    }
    ctx.setTransform(this._dpr * z, 0, 0, this._dpr * z, dx * this._dpr, dy * this._dpr);
    ctx.fillStyle = cv.COLOR_FONDO_LIENZO; ctx.fillRect(-20, -20, wA + 40, wH + 40);
    cv.dibujarGrid(ctx, wA, wH, ESPACIADO, this._origen);
    // resplandor de bombillos
    for (const c of Object.values(this.componentes)) {
      if (c.tipo !== "bombillo" || !c.brillo) continue;
      const [x1, y1] = this.pixel(c.punto_a), [x2, y2] = this.pixel(c.punto_b);
      cv.dibujarResplandor(ctx, x1, y1, x2, y2, c.brillo);
    }
    // halo de calor de las resistencias que se están calentando
    for (const [tag, c] of Object.entries(this.componentes)) {
      if (c.tipo !== "resistencia" || c.danado || !(this.calor[tag] > 0.55)) continue;
      const [x1, y1] = this.pixel(c.punto_a), [x2, y2] = this.pixel(c.punto_b);
      cv.dibujarCalor(ctx, x1, y1, x2, y2, this.calor[tag]);
    }
    this._dibujarGuiaFondo();
    this._dibujarGuia(false); // caminos y recuadros por debajo: los cables quedan encima
    this._dibujarResaltadoLineas(ahora);
    for (const [tag, k] of Object.entries(this.cables)) this._dibujarCable(tag, k);
    this._dibujarParticulas();
    for (const [tag, c] of Object.entries(this.componentes)) this._dibujarComponente(tag, c);
    this._dibujarPrevisualizacion();
    this._dibujarFantasma();
    this._dibujarGuia(true); // textos y puntos de conexión siempre visibles
    this._dibujarNombres();
    this._dibujarResultados();
    this._dibujarResaltado(ahora);
    this._dibujarEfectos(ahora);
    this._dibujarMarco();
  }
  _dibujarMarco() {
    const m = this._marco; if (!m) return;
    const ctx = this.ctx;
    const x = Math.min(m.x0, m.x1), y = Math.min(m.y0, m.y1), w = Math.abs(m.x1 - m.x0), h = Math.abs(m.y1 - m.y0);
    ctx.save();
    ctx.globalAlpha = 0.1; ctx.fillStyle = E.COLOR_CIAN; ctx.fillRect(x, y, w, h);
    ctx.globalAlpha = 1; ctx.setLineDash([5, 4]); ctx.strokeStyle = E.COLOR_CIAN; ctx.lineWidth = 1.2; ctx.strokeRect(x, y, w, h);
    ctx.restore();
  }
  _dibujarCable(tag, k) {
    const ctx = this.ctx;
    const pts = k.puntos.map((p) => this.pixel(p));
    if (this.seleccion.has(tag)) {
      ctx.beginPath(); ctx.moveTo(...pts[0]); pts.slice(1).forEach((p) => ctx.lineTo(...p));
      ctx.strokeStyle = mezclarColor(cv.COLOR_FONDO_LIENZO, E.COLOR_CIAN, 0.35); ctx.lineWidth = 10;
      ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.stroke();
    }
    cv.dibujarCable(ctx, pts, k.color || cv.COLOR_CABLE_DEFECTO);
  }
  _dibujarComponente(tag, c) {
    const ctx = this.ctx;
    const [x1, y1] = this.pixel(c.punto_a), [x2, y2] = this.pixel(c.punto_b);
    const sel = this.seleccion.has(tag);
    const fis = { calor: this.calor[tag] || 0, danado: !!c.danado };
    if (c.tipo === "resistencia") cv.dibujarResistencia(ctx, x1, y1, x2, y2, c.valor, sel, true, fis);
    else if (c.tipo === "bombillo") {
      // por encima de su potencia máxima el filamento titila, a punto de cortarse
      const titila = fis.calor > 1 && c.brillo && !movimientoReducido() ? Math.min(1, c.brillo * (0.8 + 0.4 * Math.random())) : c.brillo;
      cv.dibujarBombillo(ctx, x1, y1, x2, y2, c.valor, titila, sel, true, fis);
    }
    else if (c.tipo === "interruptor") cv.dibujarInterruptor(ctx, x1, y1, x2, y2, c.cerrado, sel);
    else if (c.tipo === "fusible") cv.dibujarFusible(ctx, x1, y1, x2, y2, c.valor, sel, true, fis);
    else {
      cv.dibujarBateria(ctx, x1, y1, x2, y2, c.valor, sel);
      const f = this.fuente;
      if (f && f.limitando) {
        // la batería avisa cuando limita su corriente o entra en protección
        const g = this._geom(c);
        const t = f.corto ? "PROTECCIÓN · 0 V" : `LIMITA A ${+f.imax.toPrecision(3)} A · ${f.vSalida.toFixed(1)} V`;
        const col = f.corto ? E.COLOR_ERROR : E.COLOR_ADVERTENCIA;
        this._cajaTexto(t, g.mx - g.px * 30 + 4, g.my - g.py * 30 + 20, { fuente: cv.fuente(11, true), color: col, relleno: E.COLOR_FONDO_TARJETA, borde: col, ancla: "left" });
      }
    }
  }
  // La pieza que se va a colocar, semitransparente, en el punto de la cuadrícula bajo el mouse.
  _dibujarFantasma() {
    if (!this.editable || !this._esPieza(this.herramienta) || !this._mouse) return;
    const tipo = this.herramienta, ctx = this.ctx;
    const a = this.punto(...this._mouse), b = this._puntoB(tipo, a);
    const [x1, y1] = this.pixel(a), [x2, y2] = this.pixel(b);
    const invalido = tipo === "bateria" && this.hayBateria();
    ctx.save(); ctx.globalAlpha = invalido ? 0.25 : 0.5;
    const v = this.valoresNuevos[tipo];
    if (tipo === "resistencia") cv.dibujarResistencia(ctx, x1, y1, x2, y2, v, false, false);
    else if (tipo === "bombillo") cv.dibujarBombillo(ctx, x1, y1, x2, y2, v, null, false, false);
    else if (tipo === "interruptor") cv.dibujarInterruptor(ctx, x1, y1, x2, y2, true, false, false);
    else if (tipo === "fusible") cv.dibujarFusible(ctx, x1, y1, x2, y2, v, false, false);
    else cv.dibujarBateria(ctx, x1, y1, x2, y2, v, false, false);
    ctx.globalAlpha = 1;
    for (const [x, y] of [[x1, y1], [x2, y2]]) { ctx.beginPath(); ctx.arc(x, y, 4, 0, 6.2832); ctx.fillStyle = invalido ? E.COLOR_ERROR : E.COLOR_ACENTO; ctx.fill(); }
    ctx.restore();
  }
  _dibujarPrevisualizacion() {
    if (this.herramienta !== "cable" || !this._cableEnProgreso.length) return;
    const ctx = this.ctx;
    const pts = this._cableEnProgreso.map((p) => this.pixel(p));
    if (pts.length >= 2) {
      ctx.beginPath(); ctx.moveTo(...pts[0]); pts.slice(1).forEach((p) => ctx.lineTo(...p));
      ctx.strokeStyle = this.colorCableActual; ctx.lineWidth = 2.75; ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.stroke();
    }
    if (this._mouse) {
      const [x1, y1] = pts[pts.length - 1];
      const [x2, y2] = this.pixel(this.punto(...this._mouse));
      ctx.setLineDash([4, 3]); ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2);
      ctx.strokeStyle = E.COLOR_ACENTO; ctx.lineWidth = 2; ctx.stroke(); ctx.setLineDash([]);
    }
  }
  _radioPart(tr) { const b = this.suave ? SUAVE.radio : RADIO_PART; return tr.tipo === "cable" ? b : b - 0.4; }
  _dibujarParticulas() {
    if (!this._trayectos.length) return;
    const ctx = this.ctx;
    const estatico = movimientoReducido();
    for (const tr of this._trayectos) {
      tr.inicio = this.pixel(tr.desde); tr.fin = this.pixel(tr.hasta);
      const [x1, y1] = tr.inicio, [x2, y2] = tr.fin;
      if (estatico || (this.modoEducativo && tr.tipo === "cable" && tr.largo >= 70)) this._flecha(tr);
      if (estatico) continue;
      const fase = this._fases[tr.clave] || 0, paso = tr.largo / tr.cantidad, r = this._radioPart(tr);
      for (let k = 0; k < tr.cantidad; k++) {
        const d = (fase + k * paso) % tr.largo;
        const x = x1 + ((x2 - x1) * d) / tr.largo, y = y1 + ((y2 - y1) * d) / tr.largo;
        ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fillStyle = E.COLOR_ELECTRICIDAD; ctx.fill();
        ctx.strokeStyle = E.COLOR_ELECTRICIDAD_OSCURO; ctx.lineWidth = 1; ctx.stroke();
      }
    }
  }
  _flecha(tr) {
    const ctx = this.ctx;
    const [x1, y1] = tr.inicio, [x2, y2] = tr.fin;
    const ux = (x2 - x1) / tr.largo, uy = (y2 - y1) / tr.largo, px = -uy, py = ux;
    const t = tr.tipo === "cable" ? 0.5 : 0.18;
    const cx = x1 + (x2 - x1) * t, cy = y1 + (y2 - y1) * t;
    ctx.beginPath();
    ctx.moveTo(cx + ux * 6, cy + uy * 6);
    ctx.lineTo(cx - ux * 4 + px * 5, cy - uy * 4 + py * 5);
    ctx.lineTo(cx - ux * 4 - px * 5, cy - uy * 4 - py * 5);
    ctx.closePath();
    ctx.fillStyle = E.COLOR_ELECTRICIDAD; ctx.fill();
    ctx.strokeStyle = E.COLOR_ELECTRICIDAD_OSCURO; ctx.lineWidth = 1; ctx.stroke();
  }
  _cajaTexto(texto, cx, cy, { fuente, color, relleno, borde, pad = 3, ancla = "center", radio = 0, multilinea = false }) {
    const ctx = this.ctx;
    ctx.font = fuente;
    const lineas = texto.split("\n");
    const ancho = Math.max(...lineas.map((l) => ctx.measureText(l).width));
    const alto = 14 * lineas.length;
    let x0 = ancla === "center" ? cx - ancho / 2 : ancla === "right" ? cx - ancho : cx;
    const y0 = cy - alto / 2;
    rr(ctx, x0 - pad, y0 - pad, x0 + ancho + pad, y0 + alto + pad, radio);
    ctx.fillStyle = relleno; ctx.fill();
    ctx.strokeStyle = borde; ctx.lineWidth = 1; ctx.stroke();
    ctx.fillStyle = color; ctx.textBaseline = "middle"; ctx.textAlign = ancla === "center" ? "center" : ancla;
    const xt = ancla === "center" ? cx : ancla === "right" ? cx : cx;
    lineas.forEach((l, i) => ctx.fillText(l, xt, y0 + 7 + i * 14));
  }
  _dibujarResultados() {
    if (!this._ultimoResultado) return;
    const [res, tags] = this._ultimoResultado;
    tags.forEach((tag, i) => {
      const d = res.resistencias[i], c = this.componentes[tag];
      if (!c) return;
      if (c.tipo === "bombillo" && !this.modoEducativo) return;
      const g = this._geom(c);
      let t = `${d.voltaje.toFixed(2)} V  ·  ${fmtCorriente(d.corriente)}`;
      if (this.modoEducativo && c.tipo === "bombillo") t += `  ·  ${+d.potencia.toPrecision(3)} W`;
      const vertical = Math.abs(g.x2 - g.x1) < Math.abs(g.y2 - g.y1);
      const estilo = { fuente: cv.fuente(12, true), color: E.COLOR_ACENTO, relleno: E.COLOR_FONDO_TARJETA, borde: E.COLOR_ACENTO };
      if (vertical) this._cajaTexto(t.replace("  ·  ", "\n"), g.mx - 22, g.my + 26, { ...estilo, ancla: "right" });
      else this._cajaTexto(t, g.mx, g.my + 22 + (c.tipo === "bombillo" ? 6 : 0), estilo);
    });
  }
  _dibujarNombres() {
    for (const [tag, nombre] of Object.entries(this._nombres)) {
      const c = this.componentes[tag];
      if (!c || c.tipo === "bateria") continue;
      const g = this._geom(c);
      if (g.L < 1) continue;
      const cx = g.mx - g.px * 26 - g.ux * 38, cy = g.my - g.py * 26 - g.uy * 38;
      this._cajaTexto(nombre, cx, cy, { fuente: cv.fuente(12, true), color: E.COLOR_ACENTO, relleno: E.COLOR_ACENTO_SUAVE, borde: E.COLOR_ACENTO, radio: 8 });
    }
  }
  _caja(x0, y0, x1, y1, pad, color, ancho, dash = null, relleno = null) {
    const ctx = this.ctx;
    rr(ctx, x0 - pad, y0 - pad, x1 + pad, y1 + pad, 8);
    if (relleno) { ctx.fillStyle = relleno; ctx.fill(); }
    if (dash) ctx.setLineDash(dash);
    ctx.strokeStyle = color; ctx.lineWidth = ancho; ctx.stroke(); ctx.setLineDash([]);
  }
  _dibujarEfectos(ahora) {
    const ctx = this.ctx;
    for (const e of this._efectos) {
      const t = Math.min(1, (ahora - e.inicio) / e.duracion);
      if (e.tipo === "chispa") {
        // rayos cortos amarillos que salen del punto y se apagan
        const n = 7;
        for (let i = 0; i < n; i++) {
          const ang = e.semilla + i * (Math.PI * 2 / n) + Math.sin(e.semilla + i) * 0.5;
          const r0 = 3 + 10 * t, r1 = r0 + 6 + 5 * Math.abs(Math.sin(e.semilla * 3 + i)) * (1 - t);
          ctx.beginPath(); ctx.moveTo(e.centro[0] + Math.cos(ang) * r0, e.centro[1] + Math.sin(ang) * r0);
          ctx.lineTo(e.centro[0] + Math.cos(ang) * r1, e.centro[1] + Math.sin(ang) * r1);
          ctx.strokeStyle = mezclarColor(i % 2 ? "#FFF3B0" : "#FFB020", cv.COLOR_FONDO_LIENZO, t); ctx.lineWidth = 2; ctx.lineCap = "round"; ctx.stroke();
        }
        if (t < 0.4) { ctx.beginPath(); ctx.arc(e.centro[0], e.centro[1], 4 * (1 - t), 0, Math.PI * 2); ctx.fillStyle = "#FFFBEA"; ctx.fill(); }
      } else if (e.tipo === "humo") {
        const n = e.suave ? 2 : 4, alfa = e.suave ? 0.22 : 0.4;
        for (let i = 0; i < n; i++) {
          const ti = Math.min(1, Math.max(0, t * 1.4 - i * 0.16));
          if (ti <= 0 || ti >= 1) continue;
          ctx.beginPath(); ctx.arc(e.centro[0] + Math.sin(e.semilla + i * 2 + ti * 3) * 8, e.centro[1] - 8 - 46 * ti, (e.suave ? 3 : 5) + (e.suave ? 6 : 12) * ti, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(90,84,78,${alfa * (1 - ti)})`; ctx.fill();
        }
      } else if (e.tipo === "destello") {
        const r = e.grande ? 20 + 46 * suavizar(t) : 14 + 22 * suavizar(t);
        const gr = ctx.createRadialGradient(e.centro[0], e.centro[1], 0, e.centro[0], e.centro[1], r);
        gr.addColorStop(0, `rgba(255,255,255,${0.95 * (1 - t)})`); gr.addColorStop(0.45, `rgba(255,236,150,${0.7 * (1 - t)})`); gr.addColorStop(1, "rgba(255,236,150,0)");
        ctx.beginPath(); ctx.arc(e.centro[0], e.centro[1], r, 0, Math.PI * 2); ctx.fillStyle = gr; ctx.fill();
      } else if (e.tipo === "chispero") {
        // chispas que saltan y caen con gravedad, dejando una estela
        const s = t * e.duracion;
        for (const k of e.trozos) {
          const x = e.centro[0] + k.vx * s, y = e.centro[1] + k.vy * s + 300 * s * s;
          const vx = k.vx, vy = k.vy + 600 * s, v = Math.hypot(vx, vy) || 1;
          ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - (vx / v) * k.largo, y - (vy / v) * k.largo);
          ctx.strokeStyle = mezclarColor(t < 0.5 ? "#FFF6C2" : "#FFB020", "#E0631A", t); ctx.globalAlpha = 1 - t * t;
          ctx.lineWidth = 2; ctx.lineCap = "round"; ctx.stroke(); ctx.globalAlpha = 1;
        }
      } else if (e.tipo === "onda") {
        // onda expansiva: un anillo que crece y se desvanece
        const r = 10 + (e.radio || 70) * suavizar(t);
        ctx.beginPath(); ctx.arc(e.centro[0], e.centro[1], r, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(255,214,120,${0.8 * (1 - t)})`; ctx.lineWidth = 6 * (1 - t) + 1; ctx.stroke();
        ctx.beginPath(); ctx.arc(e.centro[0], e.centro[1], r * 0.7, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(255,255,255,${0.6 * (1 - t)})`; ctx.lineWidth = 2; ctx.stroke();
      } else if (e.tipo === "vidrios") {
        // trozos de vidrio con gravedad, girando y desvaneciéndose
        const s = t * e.duracion;
        for (const k of e.trozos) {
          const x = e.centro[0] + k.vx * s, y = e.centro[1] + k.vy * s + 260 * s * s;
          ctx.save(); ctx.translate(x, y); ctx.rotate(k.giro * s);
          ctx.globalAlpha = 1 - t;
          ctx.beginPath(); ctx.moveTo(-k.t, -k.t * 0.4); ctx.lineTo(k.t, -k.t * 0.7); ctx.lineTo(k.t * 0.3, k.t); ctx.closePath();
          ctx.fillStyle = "rgba(225,236,244,.95)"; ctx.fill(); ctx.strokeStyle = "rgba(120,140,160,.8)"; ctx.lineWidth = 0.8; ctx.stroke();
          ctx.restore();
        }
      } else if (e.tipo === "llama") {
        // lenguas de fuego que suben y se apagan
        const vida = 1 - t;
        for (let i = 0; i < 5; i++) {
          const fase = e.semilla + i * 1.7 + t * 18;
          const h = (16 + 10 * Math.sin(fase)) * vida, w = 6 + 2 * Math.sin(fase * 1.3);
          const x = e.centro[0] + (i - 2) * 6, y = e.centro[1] - 4;
          const gr = ctx.createLinearGradient(x, y, x, y - h);
          gr.addColorStop(0, `rgba(255,120,30,${0.9 * vida})`); gr.addColorStop(0.6, `rgba(255,200,60,${0.75 * vida})`); gr.addColorStop(1, "rgba(255,240,180,0)");
          ctx.beginPath(); ctx.moveTo(x - w / 2, y); ctx.quadraticCurveTo(x - w, y - h * 0.5, x, y - h); ctx.quadraticCurveTo(x + w, y - h * 0.5, x + w / 2, y); ctx.closePath();
          ctx.fillStyle = gr; ctx.fill();
        }
      } else if (e.tipo === "arco") {
        // arco eléctrico en zigzag que tiembla
        const [x1, y1] = e.centro, [x2, y2] = e.hasta;
        const L = Math.hypot(x2 - x1, y2 - y1) || 1, px = -(y2 - y1) / L, py = (x2 - x1) / L;
        for (const [ancho, col] of [[5, `rgba(120,190,255,${0.35 * (1 - t)})`], [1.8, `rgba(240,250,255,${1 - t})`]]) {
          ctx.beginPath(); ctx.moveTo(x1, y1);
          for (let k = 1; k < 8; k++) { const f = k / 8, d = Math.sin(e.semilla + k * 7 + t * 40) * 7; ctx.lineTo(x1 + (x2 - x1) * f + px * d, y1 + (y2 - y1) * f + py * d); }
          ctx.lineTo(x2, y2); ctx.strokeStyle = col; ctx.lineWidth = ancho; ctx.lineJoin = "round"; ctx.stroke();
        }
      } else if (e.tipo === "texto") {
        // letrero que salta y sube mientras se desvanece
        const esc = t < 0.15 ? 0.6 + 0.4 * (t / 0.15) * 1.15 : 1;
        ctx.save(); ctx.translate(e.centro[0], e.centro[1] - 18 * t); ctx.scale(esc, esc);
        ctx.globalAlpha = t > 0.7 ? (1 - t) / 0.3 : 1;
        ctx.font = cv.fuente(15, true); ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.lineWidth = 4; ctx.strokeStyle = cv.COLOR_FONDO_LIENZO; ctx.strokeText(e.texto, 0, 0);
        ctx.fillStyle = e.color; ctx.fillText(e.texto, 0, 0);
        ctx.restore();
      } else if (e.tipo === "ping") {
        const r = 5 + (e.radioFinal - 5) * suavizar(t);
        ctx.beginPath(); ctx.arc(e.centro[0], e.centro[1], r, 0, Math.PI * 2);
        ctx.strokeStyle = mezclarColor(e.color, cv.COLOR_FONDO_LIENZO, t); ctx.lineWidth = this.suave ? 1.5 : 2; ctx.stroke();
      } else {
        const col = mezclarColor(e.color, cv.COLOR_FONDO_LIENZO, t ** 1.5);
        for (const tag of e.tags) {
          const b = this.bbox(tag); if (!b) continue;
          this._caja(b[0], b[1], b[2], b[3], 6 + e.crecimiento * suavizar(t), col, this.suave ? 1 : 2);
        }
      }
    }
  }
  _dibujarResaltadoLineas() {
    if (!this._resaltado) return;
    const ctx = this.ctx, col = this._resaltado.color;
    const onda = this._onda(1.6);
    const halo = mezclarColor(col, cv.COLOR_FONDO_LIENZO, 0.45 + 0.4 * (1 - onda));
    for (const tag of this._resaltado.tags) {
      const k = this.cables[tag]; if (!k) continue;
      const pts = k.puntos.map((p) => this.pixel(p));
      ctx.beginPath(); ctx.moveTo(...pts[0]); pts.slice(1).forEach((p) => ctx.lineTo(...p));
      ctx.strokeStyle = halo; ctx.lineWidth = 11; ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.stroke();
    }
  }
  _onda(periodoBase) {
    if (movimientoReducido()) return 0.5;
    const periodo = this.suave && periodoBase === 1.6 ? SUAVE.periodo_resaltado : periodoBase;
    let onda = 0.5 + 0.5 * Math.sin(((performance.now() / 1000 - this._t0) * 2 * Math.PI) / periodo);
    if (this.suave && periodoBase === 1.6) onda = 0.3 + 0.4 * onda;
    return onda;
  }
  _dibujarResaltado() {
    if (!this._resaltado) return;
    const ctx = this.ctx, col = this._resaltado.color, onda = this._onda(1.6);
    const tenue = mezclarColor(col, cv.COLOR_FONDO_LIENZO, 0.55 * (1 - onda));
    for (const p of this._resaltado.puntos) {
      const [x, y] = this.pixel(p);
      ctx.beginPath(); ctx.arc(x, y, 9, 0, Math.PI * 2); ctx.strokeStyle = tenue; ctx.lineWidth = 2; ctx.stroke();
      const r = 13 + 4 * onda;
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.strokeStyle = mezclarColor(col, cv.COLOR_FONDO_LIENZO, 0.35 + 0.6 * onda); ctx.lineWidth = 1; ctx.stroke();
    }
    for (const tag of this._resaltado.tags) {
      if (this.cables[tag]) continue;
      const b = this.bbox(tag); if (b) this._caja(b[0], b[1], b[2], b[3], 7, tenue, 2);
    }
  }
  _dibujarGuiaFondo() {
    if (!this._guia) return;
    const ctx = this.ctx;
    for (const tag of this._guia.cables_borrar || []) {
      const k = this.cables[tag]; if (!k) continue;
      const pts = k.puntos.map((p) => this.pixel(p));
      ctx.beginPath(); ctx.moveTo(...pts[0]); pts.slice(1).forEach((p) => ctx.lineTo(...p));
      ctx.strokeStyle = mezclarColor(E.COLOR_ERROR, cv.COLOR_FONDO_LIENZO, 0.6); ctx.lineWidth = 12;
      ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.stroke();
    }
  }
  _dibujarGuia(frente) {
    if (!this._guia) return;
    const ctx = this.ctx, col = this._guia.color;
    const claro = mezclarColor(col, cv.COLOR_FONDO_LIENZO, 0.35);
    const onda = this._onda(1.2);
    if (frente) {
      for (const [tipo, a, b] of this._guia.zonas || []) {
        const [x1, y1] = this.pixel(a), [x2, y2] = this.pixel(b);
        cv.texto(ctx, `Coloca aquí: ${NOMBRE_PIEZA[tipo] || tipo}`, (x1 + x2) / 2, Math.min(y1, y2) - 24, col, cv.fuente(13, true));
      }
      for (const p of this._guia.puntos || []) {
        const [x, y] = this.pixel(p);
        ctx.beginPath(); ctx.arc(x, y, 6, 0, Math.PI * 2); ctx.fillStyle = col; ctx.fill();
        ctx.strokeStyle = "#FFFFFF"; ctx.lineWidth = 1.5; ctx.stroke();
        const r = 10 + 7 * onda;
        ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.strokeStyle = mezclarColor(col, cv.COLOR_FONDO_LIENZO, 0.15 + 0.8 * onda); ctx.lineWidth = 2; ctx.stroke();
      }
      return;
    }
    let caminos = this._guia.caminos || [];
    if (this._cableEnProgreso.length >= 2) {
      const enCurso = { en_curso: { puntos: this._cableEnProgreso } };
      caminos = caminos.flatMap((c) => sinTramosTapados(c, enCurso));
    }
    for (const camino of caminos) {
      const pts = camino.map((p) => this.pixel(p));
      if (pts.length < 2) continue;
      ctx.setLineDash([8, 6]); ctx.beginPath(); ctx.moveTo(...pts[0]); pts.slice(1).forEach((p) => ctx.lineTo(...p));
      ctx.strokeStyle = claro; ctx.lineWidth = 3; ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.stroke(); ctx.setLineDash([]);
      const [xa, ya] = pts[pts.length - 2], [xb, yb] = pts[pts.length - 1];
      const L = Math.hypot(xb - xa, yb - ya) || 1, ux = (xb - xa) / L, uy = (yb - ya) / L;
      ctx.beginPath(); ctx.moveTo(xb, yb);
      ctx.lineTo(xb - ux * 12 - uy * 5, yb - uy * 12 + ux * 5); ctx.lineTo(xb - ux * 12 + uy * 5, yb - uy * 12 - ux * 5);
      ctx.closePath(); ctx.fillStyle = claro; ctx.fill();
    }
    const colMarco = mezclarColor(col, cv.COLOR_FONDO_LIENZO, 0.5 * onda);
    for (const [, a, b] of this._guia.zonas || []) {
      const [x1, y1] = this.pixel(a), [x2, y2] = this.pixel(b);
      this._caja(Math.min(x1, x2), Math.min(y1, y2), Math.max(x1, x2), Math.max(y1, y2), 14, colMarco, 2, [6, 4], mezclarColor(col, cv.COLOR_FONDO_LIENZO, 0.88));
    }
    for (const tag of this._guia.tags || []) {
      const b = this.bbox(tag); if (b) this._caja(b[0], b[1], b[2], b[3], 9, colMarco, 2, [6, 4]);
    }
  }
}
