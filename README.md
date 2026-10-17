# VOLTA — Laboratorio eléctrico

Aplicación educativa interactiva para explorar circuitos eléctricos. Construida con React, Vite y Canvas.

## Ejecutar en local

1. Instala Node.js LTS si aún no está instalado.
2. Abre una terminal en esta carpeta (la carpeta que contiene `package.json`).
3. Ejecuta `npm install`.
4. Ejecuta `npm run dev` y abre la URL local que indique Vite.

## Pruebas

`npm test` ejecuta las pruebas del motor eléctrico.

## Compilación

`npm run build` compila la aplicación en `dist/`.
`npm run build:single` intenta generar una versión HTML autocontenida con Vite.

## Identidad visual

VOLTA utiliza una estética retrofuturista de laboratorio: azul tinta (#172B49), azul eléctrico (#3B82F6), amarillo energía (#F9C74F), crema papel (#F8F1E6) y verde circuito (#10B981). Se conserva el degradado cálido y se aplica un sistema común de nodos, líneas y superficies.

## Problemas aplicados

Los problemas viven en `src/datos/problemas.js`. Cada uno tiene `calc()` (calcula los números), `pasos(v)` (los pasos, con su pregunta y el procedimiento) y una `figura` dibujada en `src/componentes/FiguraProblema.jsx`. Para agregar uno: copia un problema existente, cambia los datos y añade su figura. Los tests de `src/lib/problemas.test.js` comprueban cada resultado (`npm test`).
