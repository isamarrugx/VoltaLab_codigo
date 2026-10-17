export default function Acerca({ ir }) {
  return (
    <div className="pantalla" style={{ alignItems: "center", textAlign: "center", padding: "24px 20px" }}>
      <h2 style={{ fontSize: 28, margin: "0 0 4px" }}>VOLTA</h2>
      <div style={{ color: "var(--texto2)", fontSize: 15, marginBottom: 24 }}>Simulador interactivo de circuitos eléctricos</div>
      <div style={{ fontSize: 13, lineHeight: 1.6, margin: "10px 0" }}>
        Asignatura: Física – Electricidad<br />
        Integrantes: Santiago Barrios Guerrero, Isabel Marrugo Jurado,<br />
        Valentina Niño Solano, David Alvarez Villalobos<br />
        Tecnologías: React, Vite y HTML Canvas (versión web del proyecto en Python y CustomTkinter)
      </div>
      <div style={{ marginTop: "auto" }}><button className="btn" onClick={() => ir("Inicio")} style={{ height: 34, padding: "0 18px", color: "var(--texto)" }}>Volver al inicio</button></div>
    </div>
  );
}
