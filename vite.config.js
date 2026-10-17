import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// base "./" para que funcione en cualquier hosting estatico (Netlify, Vercel, GitHub Pages).
export default defineConfig({ base: "./", plugins: [react()] });
