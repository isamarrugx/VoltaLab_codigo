// Física en vivo sobre un tablero: resuelve el circuito, aplica el límite de la batería,
// calienta las piezas con el tiempo y avisa cuando una falla. La usan las sesiones de juego.
import { resolverCircuito, ErrorCircuito } from "./motor.js";
import { diagnosticar } from "./diagnostico.js";
import { Termico, limite, limitarResultado } from "./fallas.js";

export class Simulacion {
  constructor(lienzo, { onFalla = null } = {}) {
    this.l = lienzo; this.onFalla = onFalla;
    this.termico = new Termico(); this.encendida = false; this.med = null; this._chispa = 0;
  }
  encender() { this.encendida = true; this.recalcular(); }
  apagar() { this.encendida = false; this.termico.reiniciar(); this.med = null; this.l.fijarTermico({}, null); this.l.limpiarResultados(); }
  // Vuelve a resolver el circuito (después de cualquier cambio en el tablero).
  recalcular() {
    const l = this.l;
    if (!this.encendida) return null;
    const { cables, resistencias, bateria, tagsR } = l.exportarParaMotor();
    if (!bateria || !resistencias.length) { l.limpiarResultados(); return null; }
    try {
      const bat = Object.values(l.componentes).find((c) => c.tipo === "bateria");
      const { resultado } = limitarResultado(resolverCircuito(cables, resistencias, bateria), limite(bat));
      l.mostrarResultados(resultado, tagsR);
      return resultado;
    } catch (e) {
      if (!(e instanceof ErrorCircuito)) throw e;
      l.limpiarResultados();
      return null;
    }
  }
  // Un paso de tiempo: calor, protección de la batería y, si toca, una falla.
  paso(dt) {
    if (!this.encendida) return null;
    const l = this.l;
    const { med, falla } = this.termico.paso(l.componentes, l.cables, dt);
    this.med = med;
    l.fijarTermico({ ...this.termico.calor }, med);
    const ahora = performance.now();
    if (med.corto && ahora - this._chispa > 420) {
      // chispas solo sobre los cables del cortocircuito que encuentra el diagnóstico
      this._chispa = ahora;
      const d = diagnosticar(l.componentes, l.cables);
      const pts = (d.estado === "corto" ? d.tags : []).flatMap((t) => (l.cables[t] ? l.cables[t].puntos : [])).map((p) => l.pixel(p));
      l.chispas(pts.sort(() => Math.random() - 0.5).slice(0, 3));
    }
    // primero se avisa (quien escucha ya sabe de la falla cuando el tablero se recalcula)
    if (falla) { if (this.onFalla) this.onFalla(falla); l.marcarDanado(falla.tag); }
    return { med, falla };
  }
}
