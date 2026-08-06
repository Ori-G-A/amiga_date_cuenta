// Fuente de datos del becario: distribución del tiempo de la semana.
// Orden de preferencia:
//   1. Supabase — lee la vista uso_del_tiempo del proyecto del becario (mismo auth.uid()).
//   2. VITE_BECARIO_URL — endpoint HTTP (GET ?semana=YYYY-MM-DD), por si algún día se separan.
//   3. Serie determinista simulada, para desarrollo sin nada conectado.
import { supabase } from "./storage.js";

export const OBJETIVOS = { suenoDia: 7.5, focoDia: 1.5, ejercicioSemana: 3, libresSemana: 46, azucarDias: 0 };

const COLORS = {
  trabajo: "oklch(28% 0.02 150)",
  sueno: "oklch(52% 0.085 150)",
  foco: "oklch(48% 0.11 340)",
  ejercicio: "oklch(62% 0.10 55)",
  cuidado: "oklch(80% 0.03 80)",
  comida: "oklch(86% 0.035 60)",
  traslado: "oklch(72% 0.02 80)",
  sinCategoria: "oklch(78% 0.015 80)",
  libre: "oklch(92% 0.02 80)",
};

// categoria_vida (enum del becario) → clave del reparto.
// Solo lo confirmado: las tres primeras salen de la definición de la vista.
// El becario no separa ejercicio ni dormir: ambos caen dentro de autocuidado.
// Lo que llegue y no esté acá se avisa por consola; no se inventan números.
const CATEGORIA = {
  sueno: "sueno",
  foco_profundo: "foco",
  trabajo: "trabajo",
  autocuidado: "cuidado",
};

// Lo que el becario puede medir. Una clave fuera de acá vale null ("no lo sé"),
// que no es lo mismo que 0 ("cero horas") — si no, sus alertas saltarían siempre.
const MEDIBLES = new Set(Object.values(CATEGORIA));
const medida = (clave, horas) => (MEDIBLES.has(clave) ? horas : null);

const addDays = (iso, n) => { const d = new Date(iso + "T00:00:00"); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };

function seeded(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return () => { h ^= h << 13; h ^= h >>> 17; h ^= h << 5; return ((h >>> 0) % 10000) / 10000; };
}

function mock(weekStart) {
  const r = seeded(weekStart);
  return {
    semana: weekStart,
    fuente: "simulada",
    suenoDia: +(5.2 + r() * 3.1).toFixed(1),
    focoDia: +(r() * 2.2).toFixed(1),
    trabajoSemana: Math.round(36 + r() * 12),
    trasladoSemana: +(2.5 + r() * 4).toFixed(1),
    cuidadoDia: +(1 + r() * 1).toFixed(1),
    comidaDia: +(0.7 + r() * 0.8).toFixed(1),
    ejercicioSemana: +(r() * 4.2).toFixed(1),
    // azucarDias no va acá: el becario mide tiempo, no ingestas. Lo inyecta App
    // desde lo que marcaste en la ficha de cada día.
  };
}

function agregar(filas, weekStart) {
  const min = {};
  const sinMapear = new Set();
  for (const f of filas) {
    if (f.categoria == null) { min.sinCategoria = (min.sinCategoria || 0) + (f.minutos || 0); continue; }
    const clave = CATEGORIA[f.categoria];
    if (!clave) { sinMapear.add(f.categoria); continue; }
    min[clave] = (min[clave] || 0) + (f.minutos || 0);
  }
  if (sinMapear.size) {
    console.warn("becario: categorías sin mapear en CATEGORIA (esas horas no se cuentan):", [...sinMapear]);
  }
  // ponytail: diagnóstico temporal. Muestra las combinaciones tipo × categoría reales
  // para terminar de armar el mapa sin correr SQL. Borrar cuando CATEGORIA esté completo.
  const desglose = {};
  for (const f of filas) {
    const k = `${f.tipo ?? "—"} × ${f.categoria ?? "sin categoría"}`;
    desglose[k] = (desglose[k] || 0) + (f.minutos || 0);
  }
  console.table(Object.entries(desglose)
    .sort((a, b) => b[1] - a[1])
    .map(([combo, m]) => ({ "tipo × categoria": combo, horas: +(m / 60).toFixed(1) })));
  const h = (k) => (min[k] || 0) / 60;
  return {
    semana: weekStart,
    fuente: "becario",
    suenoDia: medida("sueno", +(h("sueno") / 7).toFixed(1)),
    focoDia: medida("foco", +(h("foco") / 7).toFixed(1)),
    trabajoSemana: medida("trabajo", Math.round(h("trabajo"))),
    cuidadoDia: medida("cuidado", +(h("cuidado") / 7).toFixed(1)),
    trasladoSemana: medida("traslado", +h("traslado").toFixed(1)),
    comidaDia: medida("comida", +h("comida").toFixed(1)),
    ejercicioSemana: medida("ejercicio", +h("ejercicio").toFixed(1)),
    sinCategoriaSemana: +h("sinCategoria").toFixed(1),
  };
}

async function desdeSupabase(weekStart) {
  const { data: ses } = await supabase.auth.getSession();
  const uid = ses.session?.user?.id;
  if (!uid) { console.warn("becario: hay Supabase pero no hay sesión iniciada."); return null; }
  // El filtro por user_id es explícito a propósito: si uso_del_tiempo quedó sin
  // security_invoker, la RLS de bloque no se evalúa y la vista devolvería filas ajenas.
  const { data, error } = await supabase
    .from("uso_del_tiempo")
    .select("categoria, tipo, minutos")
    .eq("user_id", uid)
    .gte("inicio", `${weekStart}T00:00:00`)
    .lt("inicio", `${addDays(weekStart, 7)}T00:00:00`);
  if (error) { console.warn("becario: falló la consulta a uso_del_tiempo:", error.message); return null; }
  if (!data.length) { console.warn(`becario: cero bloques en la semana del ${weekStart} para el usuario ${uid}`); return null; }
  return agregar(data, weekStart);
}

export async function fetchSemana(weekStart) {
  if (supabase) {
    const desde = await desdeSupabase(weekStart);
    if (desde) return desde;
  } else {
    // Sin esto el síntoma es una consola vacía: parece que Supabase falló cuando
    // en realidad nunca se configuró (nombres de variables mal en Vercel).
    console.warn("becario: falta VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY, no se consultó Supabase.");
  }
  const url = (typeof window !== "undefined" && window.BECARIO_URL) || import.meta.env.VITE_BECARIO_URL;
  if (url) {
    try {
      const res = await fetch(`${url}?semana=${weekStart}`);
      if (res.ok) return { ...(await res.json()), fuente: "becario" };
      console.warn("becario respondió", res.status, res.statusText);
    } catch (e) {
      // sin esto el fallo es invisible: la UI cae a "serie simulada" sin decir por qué
      console.warn("becario no respondió:", e.message);
    }
  }
  let local = null;
  try { local = JSON.parse(localStorage.getItem("adc_becario_v1") || "{}")[weekStart] || null; } catch (e) {}
  return { ...mock(weekStart), ...(local || {}) };
}

export function evaluar(d) {
  const sem = (v, factor = 1) => (v == null ? null : v * factor); // null = no medido
  const sueno = sem(d.suenoDia, 7);
  const foco = sem(d.focoDia, 7);
  const bruto = [
    ["trabajo", "Trabajo", d.trabajoSemana],
    ["sueno", "Sueño", sueno],
    ["foco", "Foco profundo", foco],
    ["ejercicio", "Ejercicio", d.ejercicioSemana],
    ["cuidado", "Cuidado personal", sem(d.cuidadoDia, 7)],
    ["comida", "Comida", sem(d.comidaDia, 7)],
    ["traslado", "Traslado", d.trasladoSemana],
    // Horas registradas que el becario no supo clasificar. Sin esto engordarían
    // el "libre" y el reparto mentiría.
    ["sinCategoria", "Sin categoría", d.sinCategoriaSemana],
  ].filter(([, , horas]) => horas != null && horas > 0);

  const usado = bruto.reduce((a, b) => a + b[2], 0);
  const libre = Math.max(0, 168 - usado);
  const segments = [...bruto, ["libre", "Libre", libre]].map(([key, label, horas]) => ({
    key, label, horas: Math.round(horas),
    width: `${((horas / 168) * 100).toFixed(2)}%`,
    color: COLORS[key],
  }));

  // Cada alerta se calla si su dato no se mide: acusar por un null sería inventar.
  const alertas = [];
  if (d.suenoDia != null) {
    if (d.suenoDia < 5) alertas.push({ sev: 5, gesto: "modoseria", texto: "Dormiste 5 horas o menos por noche. Con eso rendís un tercio menos y no es tema de actitud.", dato: `${d.suenoDia} h promedio` });
    else if (d.suenoDia < OBJETIVOS.suenoDia) alertas.push({ sev: 3, gesto: "modoseria", texto: "Te faltó sueño casi toda la semana. Antes de tocar cualquier otra cosa, esto.", dato: `${d.suenoDia} h de ${OBJETIVOS.suenoDia}` });
  }
  if (foco != null && foco < 7) alertas.push({ sev: 4, gesto: "modoseria", texto: "Ni un bloque de 90 minutos para lo que de verdad importa. Y libre tenés tiempo.", dato: `${Math.round(foco)} h de foco · ${Math.round(libre)} h libres` });
  if (d.ejercicioSemana != null && d.ejercicioSemana < OBJETIVOS.ejercicioSemana) alertas.push({ sev: 2, gesto: "protectora", texto: "El cuerpo es la mente y esta semana quedó afuera del reparto.", dato: `${d.ejercicioSemana} h de ${OBJETIVOS.ejercicioSemana}` });
  if (d.azucarDias >= 4) alertas.push({ sev: 1.5, gesto: "condescendiente", texto: "Azúcar casi todos los días. No te voy a dar el discurso; ya lo sabés.", dato: `${d.azucarDias} de 7 días` });
  if (foco != null && libre > 45 && foco >= 7) alertas.push({ sev: 1, gesto: "complice", texto: "Sobran horas libres y encima aparecieron bloques de foco. Aprovechá la racha.", dato: `${Math.round(libre)} h libres` });
  alertas.sort((a, b) => b.sev - a.sev);

  return { segments, libre: Math.round(libre), alertas, principal: alertas[0] || null, extra: Math.max(0, alertas.length - 1) };
}
