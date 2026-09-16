// La única comprobación del reparto semanal: node becario.test.mjs
// Cubre lo que se rompió de verdad — el mapa de categorías, los nulos que se
// descartaban en silencio, y el redondeo que borraba los bloques cortos.
import assert from "node:assert/strict";
import { agregar, evaluar, resumirSemana } from "./src/becario.js";

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
assert.ok(ev.alertas.some((a) => a.dato === "Sueño: sin datos confirmados"));

const noche = (inicio, fin, minutos = 480, real = true) => ({
  categoria: "sueno", inicio: `${inicio}-05:00`, fin: `${fin}-05:00`, minutos, con_registro_real: real,
});
const semana = resumirSemana([
  noche("2026-09-13T23:00:00", "2026-09-14T07:00:00"),
  noche("2026-09-14T23:00:00", "2026-09-15T07:00:00"),
  noche("2026-09-15T23:00:00", "2026-09-16T07:00:00", 480, false),
  noche("2026-09-20T23:00:00", "2026-09-21T07:00:00"),
], "2026-09-14", new Date("2026-09-15T20:00:00-05:00"));
assert.deepEqual(semana.suenoRegistrado, { noches: 2, horas: 16 });
assert.equal(semana.horas.sueno, 24, "el reparto conserva el plan; el promedio usa solo registros reales");
assert.ok(!evaluar(semana).alertas.some((a) => /sueño|descanso|dormiste/i.test(a.texto)), "dos noches de 8 h no son 2.3 h por noche");
const corta = resumirSemana([noche("2026-09-14T01:00:00", "2026-09-14T05:00:00", 240)], "2026-09-14");
assert.ok(evaluar(corta).alertas.some((a) => a.dato.startsWith("4.0 h promedio")));
const sinDatos = resumirSemana([], "2026-09-14");
assert.ok(!evaluar(sinDatos).alertas.some((a) => /menor de 5/.test(a.texto)));
const siesta = resumirSemana([
  noche("2026-09-13T23:00:00", "2026-09-14T07:00:00"),
  noche("2026-09-14T14:00:00", "2026-09-14T15:00:00", 60),
], "2026-09-14");
assert.deepEqual(siesta.suenoRegistrado, { noches: 1, horas: 9 });

console.log("ok — reparto:", ev.segments.map((s) => `${s.label} ${s.horas}h`).join(" · "));
