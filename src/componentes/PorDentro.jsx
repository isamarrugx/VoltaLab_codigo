import { useEffect, useRef, useState } from "react";
import { movimientoReducido } from "../lib/animaciones.js";

// «Por dentro»: una animación que muestra lo que no se ve, ligada en vivo al circuito de la lección.
//   agua       → la batería es una bomba, la corriente es el caudal y la resistencia un tubo estrecho.
//   electrones → los electrones avanzan por el cable y chocan con los átomos de la resistencia.
//   filamento  → el hilo del bombillo se calienta con la potencia y se corta si pasa su límite.
// Todos los valores salen de la medición real (`datos`); la animación solo los dibuja.

const W = 300, H = 168;
const lim = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const logN = (x, a, b) => lim(Math.log10(Math.max(x, a) / a) / Math.log10(b / a));
const TINTA = "#172B49", SUAVE = "#58677C", AZUL = "#3B82F6", AGUA = "#5BA8E8";

const TITULOS = { agua: "Por dentro · como agua en tubos", electrones: "Por dentro · los electrones", filamento: "Por dentro · el filamento" };

function texto(ctx, t, x, y, { color = SUAVE, peso = 600, tam = 11, ancla = "left" } = {}) {
  ctx.font = `${peso} ${tam}px "Avenir Next", Avenir, system-ui, sans-serif`;
  ctx.fillStyle = color; ctx.textAlign = ancla; ctx.textBaseline = "middle"; ctx.fillText(t, x, y);
}

// ---------- agua ----------
// Circuito como un circuito de tubos: bomba a la izquierda, tubo estrecho arriba.
function dibujarAgua(ctx, d, tiempo, est) {
  const x0 = 46, x1 = 270, y0 = 46, y1 = 130, grosor = 14;
  const abierto = d.abierto;
  const rapidez = abierto ? 0 : 25 + 150 * logN(d.I * 1000, 1, 2000);           // caudal = corriente
  const estrecho = d.R === Infinity ? 1 : 0.2 + 0.7 * logN(d.R, 5, 2000);         // estrechez = resistencia
  const altura = lim(d.V / 12);                                                    // presión = voltaje
  // tubos
  ctx.lineCap = "round"; ctx.lineJoin = "round";
  ctx.strokeStyle = "#C9D6E4"; ctx.lineWidth = grosor + 4;
  ctx.strokeRect(x0, y0, x1 - x0, y1 - y0);
  ctx.strokeStyle = abierto ? "#EEF2F6" : "#DCEBF8"; ctx.lineWidth = grosor;
  ctx.strokeRect(x0, y0, x1 - x0, y1 - y0);
  // tramo estrecho (la resistencia), arriba al centro
  const cx = (x0 + x1) / 2, largo = 64, hueco = grosor * (1 - estrecho);
  ctx.fillStyle = "#E6D5B0";
  ctx.fillRect(cx - largo / 2, y0 - grosor / 2 - 2, largo, (grosor - hueco) / 2 + 2);
  ctx.fillRect(cx - largo / 2, y0 + hueco / 2, largo, (grosor - hueco) / 2 + 2);
  ctx.strokeStyle = "#B39A68"; ctx.lineWidth = 1; ctx.strokeRect(cx - largo / 2, y0 - grosor / 2 - 2, largo, grosor + 4);
  // partículas de agua recorriendo el lazo (más despacio donde no hay caudal)
  const per = 2 * ((x1 - x0) + (y1 - y0)), n = 26;
  est.fase = (est.fase + rapidez * est.dt) % per;
  for (let k = 0; k < n; k++) {
    const s = (k * per / n + est.fase) % per;
    let x, y;
    if (s < x1 - x0) { x = x0 + s; y = y0; }
    else if (s < (x1 - x0) + (y1 - y0)) { x = x1; y = y0 + (s - (x1 - x0)); }
    else if (s < 2 * (x1 - x0) + (y1 - y0)) { x = x1 - (s - (x1 - x0) - (y1 - y0)); y = y1; }
    else { x = x0; y = y1 - (s - 2 * (x1 - x0) - (y1 - y0)); }
    const enEstrecho = y === y0 && Math.abs(x - cx) < largo / 2;
    ctx.beginPath(); ctx.arc(x, y, enEstrecho ? Math.max(1.5, hueco / 3) : 3.2, 0, Math.PI * 2);
    ctx.fillStyle = abierto ? "#B9C9D8" : AGUA; ctx.fill();
  }
  // bomba (la batería): rueda que gira y columna de presión
  ctx.beginPath(); ctx.arc(x0, (y0 + y1) / 2, 15, 0, Math.PI * 2); ctx.fillStyle = "#FFFCF6"; ctx.fill();
  ctx.strokeStyle = TINTA; ctx.lineWidth = 2; ctx.stroke();
  const giro = est.giro = (est.giro + (abierto ? 0.4 : 1.5 + altura * 5) * est.dt) % (Math.PI * 2);
  for (let k = 0; k < 4; k++) {
    const a = giro + k * Math.PI / 2;
    ctx.beginPath(); ctx.moveTo(x0, (y0 + y1) / 2); ctx.lineTo(x0 + Math.cos(a) * 11, (y0 + y1) / 2 + Math.sin(a) * 11);
    ctx.strokeStyle = AZUL; ctx.lineWidth = 2.5; ctx.stroke();
  }
  ctx.fillStyle = "#E8EEF5"; ctx.fillRect(10, 40, 10, 96);
  ctx.fillStyle = AZUL; ctx.fillRect(10, 40 + 96 * (1 - altura), 10, 96 * altura);
  ctx.strokeStyle = "#9FB3C8"; ctx.lineWidth = 1; ctx.strokeRect(10, 40, 10, 96);
  // rótulos con los valores reales
  texto(ctx, `Empuje (V): ${+d.V.toPrecision(3)} V`, 6, 14, { color: AZUL, peso: 800 });
  texto(ctx, `Estrechez (R): ${d.R === Infinity ? "cerrado" : `${+d.R.toPrecision(3)} Ω`}`, cx + 20, 30, { ancla: "center", color: "#8A6A2A", peso: 800 });
  texto(ctx, abierto ? "Camino cortado: el agua no circula" : `Caudal (I): ${d.I < 1 ? `${(d.I * 1000).toFixed(0)} mA` : `${d.I.toFixed(2)} A`}`, cx + 8, 152, { ancla: "center", color: abierto ? "#C7473D" : TINTA, peso: 800 });
}

// ---------- electrones ----------
function dibujarElectrones(ctx, d, tiempo, est) {
  const y0 = 54, y1 = 118, rx0 = 104, rx1 = 196;
  const abierto = d.abierto;
  const deriva = abierto ? 0 : 10 + 120 * logN(d.I * 1000, 1, 2000);
  const choque = abierto ? 0 : lim(0.25 + 0.75 * logN(d.R, 5, 2000));
  const calor = abierto ? 0 : lim(logN(d.P * 1000, 1, 20000));
  // cable (cobre) y resistencia
  ctx.fillStyle = "#F4E2CC"; ctx.fillRect(8, y0 + 12, W - 16, y1 - y0 - 24);
  const tinte = `rgba(240,110,50,${0.12 + 0.45 * calor})`;
  ctx.fillStyle = "#EFE5D2"; ctx.fillRect(rx0, y0, rx1 - rx0, y1 - y0);
  ctx.fillStyle = tinte; ctx.fillRect(rx0, y0, rx1 - rx0, y1 - y0);
  ctx.strokeStyle = "#B39A68"; ctx.lineWidth = 1; ctx.strokeRect(rx0, y0, rx1 - rx0, y1 - y0);
  // átomos de la resistencia: vibran más cuanto más se calientan
  for (let fx = 0; fx < 5; fx++) for (let fy = 0; fy < 3; fy++) {
    const ax = rx0 + 12 + fx * 17 + Math.sin(tiempo * 30 + fx * 3 + fy) * 2.5 * calor, ay = y0 + 13 + fy * 19 + Math.cos(tiempo * 27 + fy * 5 + fx) * 2.5 * calor;
    ctx.beginPath(); ctx.arc(ax, ay, 5, 0, Math.PI * 2); ctx.fillStyle = calor > 0.5 ? "#E39A6A" : "#B9B2A6"; ctx.fill();
  }
  // electrones: avanzan del − al + (al revés que la corriente convencional) y zigzaguean al chocar
  if (!est.e) est.e = Array.from({ length: 30 }, (_, k) => ({ x: (k * 37) % (W - 16) + 8, y: y0 + 18 + ((k * 13) % (y1 - y0 - 36)), f: k * 1.7 }));
  for (const e of est.e) {
    const dentro = e.x > rx0 && e.x < rx1;
    e.x -= deriva * est.dt * (dentro ? 1 - 0.55 * choque : 1);
    if (e.x < 8) e.x = W - 8;
    const temblor = dentro ? Math.sin(tiempo * 40 + e.f) * 6 * choque : Math.sin(tiempo * 6 + e.f) * 1.5;
    ctx.beginPath(); ctx.arc(e.x, e.y + temblor, 3, 0, Math.PI * 2); ctx.fillStyle = AZUL; ctx.fill();
  }
  // flecha de la corriente convencional
  ctx.strokeStyle = TINTA; ctx.fillStyle = TINTA; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(20, 140); ctx.lineTo(70, 140); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(70, 140); ctx.lineTo(64, 136); ctx.lineTo(64, 144); ctx.closePath(); ctx.fill();
  texto(ctx, "corriente", 76, 140, { color: TINTA });
  texto(ctx, "● electrones: van al revés", 160, 140, { color: AZUL });
  texto(ctx, abierto ? "Sin camino cerrado no avanzan" : `${d.I < 1 ? `${(d.I * 1000).toFixed(0)} mA` : `${d.I.toFixed(2)} A`} · más resistencia, más choques`, 8, 24, { color: TINTA, peso: 800 });
  texto(ctx, "cable", 30, y0 + 4, { tam: 10 }); texto(ctx, "resistencia", (rx0 + rx1) / 2, y0 - 8, { tam: 10, ancla: "center" });
}

// ---------- filamento ----------
function colorFilamento(t) {
  // frío → rojo apagado → naranja → amarillo blanco
  const paradas = [[0, [96, 90, 82]], [0.25, [150, 40, 25]], [0.55, [235, 100, 20]], [0.85, [255, 200, 70]], [1.1, [255, 248, 225]]];
  for (let i = 1; i < paradas.length; i++) if (t <= paradas[i][0] || i === paradas.length - 1) {
    const [a, ca] = paradas[i - 1], [b, cb] = paradas[i], f = lim((t - a) / (b - a));
    return `rgb(${ca.map((v, k) => Math.round(v + (cb[k] - v) * f)).join(",")})`;
  }
  return "rgb(255,248,225)";
}
function dibujarFilamento(ctx, d, tiempo, est) {
  const cx = 92, cy = 82, r = 52;
  const carga = d.pmax ? d.P / d.pmax : lim(logN(d.P * 1000, 5, 40000)); // fracción de su potencia máxima
  const temp = d.danado ? 0 : lim(carga, 0, 1.4);
  // resplandor
  if (temp > 0.15 && !d.danado) {
    const gr = ctx.createRadialGradient(cx, cy, 4, cx, cy, r + 26 * temp);
    gr.addColorStop(0, `rgba(255,220,120,${0.55 * lim(temp)})`); gr.addColorStop(1, "rgba(255,220,120,0)");
    ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(cx, cy, r + 26 * temp, 0, Math.PI * 2); ctx.fill();
  }
  // vidrio
  ctx.beginPath(); ctx.arc(cx, cy - 6, r - 8, Math.PI * 0.78, Math.PI * 2.22); ctx.lineTo(cx + 14, cy + r - 6); ctx.lineTo(cx - 14, cy + r - 6); ctx.closePath();
  ctx.fillStyle = d.danado ? "rgba(120,110,100,.22)" : "rgba(220,235,250,.35)"; ctx.fill();
  ctx.strokeStyle = d.danado ? "#7A7268" : "#9FB3C8"; ctx.lineWidth = 1.5; ctx.stroke();
  ctx.fillStyle = "#AEB6BF"; ctx.fillRect(cx - 14, cy + r - 6, 28, 12);
  // soportes y espiral del filamento
  ctx.strokeStyle = "#7C8792"; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(cx - 10, cy + r - 6); ctx.lineTo(cx - 22, cy - 6); ctx.moveTo(cx + 10, cy + r - 6); ctx.lineTo(cx + 22, cy - 6); ctx.stroke();
  const tit = temp > 1 && !movimientoReducido() ? 0.85 + 0.3 * Math.random() : 1;
  ctx.strokeStyle = colorFilamento(temp * tit); ctx.lineWidth = 2.2 + (temp > 0.5 ? 0.8 : 0);
  // espiral; si está dañado, falta un trozo en el medio (el hilo se cortó)
  const tramos = d.danado ? [[0, 0.5], [0.62, 1]] : [[0, 1]];
  for (const [a, b] of tramos) {
    ctx.beginPath();
    for (let k = 0; k <= 60; k++) {
      const f = a + (b - a) * (k / 60), x = cx - 22 + 44 * f, y = cy - 6 + Math.sin(f * Math.PI * 10) * 5;
      if (k === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  // ondas de calor cuando pasa su límite
  if (temp > 1 && !d.danado) for (let k = 0; k < 3; k++) {
    const y = cy - r + 4 - ((tiempo * 30 + k * 12) % 34);
    ctx.beginPath(); ctx.moveTo(cx - 16 + k * 14, y + 10);
    ctx.quadraticCurveTo(cx - 12 + k * 14, y + 4, cx - 16 + k * 14, y - 2);
    ctx.strokeStyle = "rgba(217,56,30,.55)"; ctx.lineWidth = 1.5; ctx.stroke();
  }
  // lectura
  const x = 168;
  texto(ctx, d.danado ? "Filamento cortado" : temp < 0.1 ? "Frío: no brilla" : temp < 0.45 ? "Rojo apagado" : temp < 0.9 ? "Naranja: brilla" : temp <= 1 ? "Blanco: al máximo" : "¡Pasó su límite!", x, 36, { color: d.danado || temp > 1 ? "#C7473D" : TINTA, peso: 800, tam: 12 });
  texto(ctx, `Recibe ${d.P < 1 ? `${(d.P * 1000).toFixed(0)} mW` : `${d.P.toFixed(1)} W`}`, x, 60);
  if (d.pmax) {
    texto(ctx, `Soporta ${d.pmax} W`, x, 78);
    ctx.fillStyle = "#E8E1D2"; ctx.fillRect(x, 94, 116, 9);
    ctx.fillStyle = carga > 1 ? "#D9381E" : carga > 0.85 ? "#F08C3A" : "#168B78";
    ctx.fillRect(x, 94, 116 * lim(carga / 1.5), 9);
    ctx.fillStyle = TINTA; ctx.fillRect(x + 116 / 1.5, 90, 2, 17);
    texto(ctx, "límite", x + 116 / 1.5 + 4, 116, { tam: 10 });
  }
  texto(ctx, "Más potencia → más calor", x, 142, { tam: 10 });
}

const DIBUJAR = { agua: dibujarAgua, electrones: dibujarElectrones, filamento: dibujarFilamento };

export default function PorDentro({ tipo, datos }) {
  const ref = useRef(null), datosRef = useRef(datos);
  const [abierto, setAbierto] = useState(true);
  datosRef.current = datos;
  useEffect(() => {
    if (!abierto) return undefined;
    const c = ref.current, dpr = window.devicePixelRatio || 1;
    c.width = W * dpr; c.height = H * dpr;
    const ctx = c.getContext("2d");
    const est = { fase: 0, giro: 0, dt: 0 };
    let raf, ult = performance.now();
    const cuadro = (ahora) => {
      est.dt = movimientoReducido() ? 0 : Math.min(0.05, (ahora - ult) / 1000); ult = ahora;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H);
      const d = datosRef.current;
      if (d) DIBUJAR[tipo](ctx, d, ahora / 1000, est);
      raf = requestAnimationFrame(cuadro);
    };
    raf = requestAnimationFrame(cuadro);
    return () => cancelAnimationFrame(raf);
  }, [tipo, abierto]);
  return (
    <div className={`por-dentro ${abierto ? "" : "cerrado"}`}>
      <button className="pd-cab" onClick={() => setAbierto((v) => !v)} aria-expanded={abierto}>
        <span>{TITULOS[tipo]}</span><i aria-hidden="true">{abierto ? "−" : "+"}</i>
      </button>
      {abierto ? <canvas ref={ref} style={{ width: W, height: H }} aria-label={TITULOS[tipo]} role="img" /> : null}
    </div>
  );
}
