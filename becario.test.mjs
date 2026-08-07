// La única comprobación del reparto semanal: node becario.test.mjs
// Cubre lo que se rompió de verdad — el mapa de categorías, los nulos que se
// descartaban en silencio, y el redondeo que borraba los bloques cortos.
import assert from "node:assert/strict";
import { agregar, evaluar } from "./src/becario.js";

const horas = agregar([
  { categoria: "sueno", minutos: 480 },
  { categoria: "sueno", minutos: 60 },
  { categoria: "ejercicio", minutos: 45 },
  { categoria: null, minutos: 120 },
  { categoria: "autocuidado", minutos: 999 }, // es un tipo, no una categoria
]);

assert.equal(horas.sueno, 9);
assert.equal(horas.ejercicio, 0.75);
assert.equal(horas.sin_clasificar, 2, "los nulos se reportan, no se descartan");
assert.equal(horas.autocuidado, undefined, "fuera del contrato: no se inventa");

const ev = evaluar({ horas, azucarDias: 0 });
const suma = ev.segments.reduce((a, s) => a + s.horas, 0);
assert.ok(Math.abs(suma - 168) <= 2, `el reparto tiene que cerrar en 168, dio ${suma}`);
assert.ok(ev.segments.some((s) => s.key === "ejercicio"), "45 min no puede desaparecer del reparto");
assert.ok(ev.alertas.some((a) => a.dato.includes("sin clasificar")), "2 h sin etiquetar es un hallazgo");
assert.ok(ev.alertas.some((a) => a.gesto === "modoseria"), "1.3 h de sueño por noche tiene que gritar");

console.log("ok — reparto:", ev.segments.map((s) => `${s.label} ${s.horas}h`).join(" · "));
