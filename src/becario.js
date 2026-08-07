// Fuente de datos del becario: distribución del tiempo de la semana.
// Contrato de lectura: se lee SOLO la vista uso_del_tiempo, nunca las tablas
// crudas. La vista ya resolvió tiempo real vs planeado, el área de cada bloque y
// los bloques no cumplidos; y no expone títulos, que están cifrados con el PIN.
// Orden de preferencia:
//   1. Supabase — misma sesión, mismo auth.uid() que el becario.
//   2. VITE_BECARIO_URL — endpoint HTTP (GET ?semana=YYYY-MM-DD), por si se separan.
//   3. Serie determinista simulada, para desarrollo sin nada conectado.
// Import diferido a propósito: storage.js lee import.meta.env al cargarse, que
// fuera de Vite no existe. Así becario.test.mjs puede importar agregar/evaluar
// con node pelado. No cuesta un chunk aparte: main.jsx ya importa storage.js.
const cliente = () => import("./storage.js").then((m) => m.supabase);

export const OBJETIVOS = { suenoDia: 7.5, focoDia: 1.5, ejercicioSemana: 3, sinRegistrarSemana: 46, azucarDias: 0 };

// La taxonomía de categoria_vida, tal cual la nombra el becario: son ocho valores
// fijos y sus nombres no cambian (si cambiaran, la serie histórica dejaría de ser
// comparable). Sin traducción de por medio: la clave ES la categoría.
// El orden acá es el orden de la barra.
const CATEGORIAS = {
  sueno: ["Sueño", "oklch(52% 0.085 150)"],
  trabajo: ["Trabajo", "oklch(28% 0.02 150)"],
  foco_profundo: ["Foco profundo", "oklch(48% 0.11 340)"],
  ejercicio: ["Ejercicio", "oklch(62% 0.10 55)"],
  cuidado_personal: ["Cuidado personal", "oklch(80% 0.03 80)"],
  comida: ["Comida", "oklch(86% 0.035 60)"],
  traslado: ["Traslado", "oklch(72% 0.02 80)"],
  libre: ["Libre agendado", "oklch(88% 0.045 140)"],
};
// Bloque de autocuidado suelto, sin tarea ni iniciativa: tiempo real sin etiquetar.
// Se reporta, no se descarta — que haya horas sin clasificar es un hallazgo.
const SIN_CLASIFICAR = ["Sin clasificar", "oklch(78% 0.015 80)"];
const SIN_REGISTRAR = ["Sin registrar", "oklch(94% 0.012 80)"];

// Bogotá es UTC-5 fijo, sin horario de verano. Sin el offset explícito el rango se
// corre cinco horas y los bloques de la madrugada caen en la semana equivocada.
const TZ = "-05:00";
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
    horas: {
      sueno: +(36 + r() * 21).toFixed(1),
      trabajo: Math.round(30 + r() * 12),
      foco_profundo: +(r() * 15).toFixed(1),
      ejercicio: +(r() * 4.2).toFixed(1),
      cuidado_personal: +(3 + r() * 4).toFixed(1),
      comida: +(5 + r() * 4).toFixed(1),
      traslado: +(2.5 + r() * 4).toFixed(1),
      libre: +(r() * 6).toFixed(1),
      sin_clasificar: +(r() * 3).toFixed(1),
    },
    // azucarDias no va acá: el becario mide tiempo, no ingestas. Lo inyecta App
    // desde lo que marcaste en la ficha de cada día.
  };
}

export function agregar(filas) {
  const min = {};
  const sinMapear = new Set();
  for (const f of filas) {
    // Una fila por bloque, área ya resuelta: sumar minutos nunca cuenta doble.
    if (f.categoria == null) { min.sin_clasificar = (min.sin_clasificar || 0) + (f.minutos || 0); continue; }
    if (!CATEGORIAS[f.categoria]) { sinMapear.add(f.categoria); continue; }
    min[f.categoria] = (min[f.categoria] || 0) + (f.minutos || 0);
  }
  if (sinMapear.size) {
    console.warn("becario: categorías fuera del contrato (esas horas no se cuentan):", [...sinMapear]);
  }
  const horas = {};
  for (const k of Object.keys(min)) horas[k] = min[k] / 60;
  return horas;
}

async function desdeSupabase(supabase, weekStart) {
  const { data: ses } = await supabase.auth.getSession();
  if (!ses.session?.user?.id) { console.warn("becario: hay Supabase pero no hay sesión iniciada."); return null; }
  // La vista tiene security_invoker: la RLS de bloque se evalúa con esta sesión,
  // así que no hace falta filtrar por user_id. Sin sesión devuelve cero filas.
  const { data, error } = await supabase
    .from("uso_del_tiempo")
    .select("categoria, minutos")
    .gte("inicio", `${weekStart}T00:00:00${TZ}`)
    .lt("inicio", `${addDays(weekStart, 7)}T00:00:00${TZ}`);
  if (error) { console.warn("becario: falló la consulta a uso_del_tiempo:", error.message); return null; }
  if (!data.length) { console.warn(`becario: cero bloques en la semana del ${weekStart}.`); return null; }
  return { semana: weekStart, fuente: "becario", horas: agregar(data) };
}

export async function fetchSemana(weekStart) {
  const supabase = await cliente();
  if (supabase) {
    const desde = await desdeSupabase(supabase, weekStart);
    if (desde) return desde;
  } else {
    // Sin esto el síntoma es una consola vacía: parece que Supabase falló cuando
    // en realidad nunca se configuró. Nombra la que falta: adivinar cuál de las
    // dos era costó una tarde.
    const falta = [
      !import.meta.env.VITE_SUPABASE_URL && "VITE_SUPABASE_URL",
      !(import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY) && "VITE_SUPABASE_PUBLISHABLE_KEY",
    ].filter(Boolean);
    console.warn(`becario: no se consultó Supabase, falta ${falta.join(" y ")} en el build.`);
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
  const h = d.horas || {};
  const bruto = Object.entries(CATEGORIAS)
    .map(([key, [label, color]]) => [key, label, color, h[key] || 0])
    .concat([["sin_clasificar", ...SIN_CLASIFICAR, h.sin_clasificar || 0]])
    .filter(([, , , horas]) => horas > 0);

  const usado = bruto.reduce((a, b) => a + b[3], 0);
  // Lo que sobra de las 168 h no es tiempo libre: es tiempo que no quedó agendado
  // en ningún bloque. "libre" a secas ya existe como categoría y significa otra cosa.
  const sinRegistrar = Math.max(0, 168 - usado);
  const segments = [...bruto, ["sin_registrar", ...SIN_REGISTRAR, sinRegistrar]].map(([key, label, color, horas]) => ({
    key, label, horas: Math.round(horas),
    width: `${((horas / 168) * 100).toFixed(2)}%`,
    color,
  }));

  const suenoDia = (h.sueno || 0) / 7;
  const focoSemana = h.foco_profundo || 0;
  const alertas = [];
  if (suenoDia < 5) alertas.push({ sev: 5, gesto: "modoseria", texto: "Dormiste 5 horas o menos por noche. Con eso rendís un tercio menos y no es tema de actitud.", dato: `${suenoDia.toFixed(1)} h promedio` });
  else if (suenoDia < OBJETIVOS.suenoDia) alertas.push({ sev: 3, gesto: "modoseria", texto: "Te faltó sueño casi toda la semana. Antes de tocar cualquier otra cosa, esto.", dato: `${suenoDia.toFixed(1)} h de ${OBJETIVOS.suenoDia}` });
  if (focoSemana < OBJETIVOS.focoDia * 7) alertas.push({ sev: 4, gesto: "modoseria", texto: "Ni un bloque de 90 minutos para lo que de verdad importa. Y libre tenés tiempo.", dato: `${focoSemana.toFixed(1)} h de foco · ${Math.round(sinRegistrar)} h sin agendar` });
  if ((h.ejercicio || 0) < OBJETIVOS.ejercicioSemana) alertas.push({ sev: 2, gesto: "protectora", texto: "El cuerpo es la mente y esta semana quedó afuera del reparto.", dato: `${(h.ejercicio || 0).toFixed(1)} h de ${OBJETIVOS.ejercicioSemana}` });
  if (d.azucarDias >= 4) alertas.push({ sev: 1.5, gesto: "condescendiente", texto: "Azúcar casi todos los días. No te voy a dar el discurso; ya lo sabés.", dato: `${d.azucarDias} de 7 días` });
  // Horas registradas sin etiqueta: no se descartan en silencio, se preguntan.
  if ((h.sin_clasificar || 0) >= 2) alertas.push({ sev: 1.8, gesto: "chismosa2", texto: "Hay horas registradas que no le reportan a ninguna iniciativa. ¿En qué se te fueron?", dato: `${h.sin_clasificar.toFixed(1)} h sin clasificar` });
  if (sinRegistrar > OBJETIVOS.sinRegistrarSemana && focoSemana >= OBJETIVOS.focoDia * 7) alertas.push({ sev: 1, gesto: "complice", texto: "Sobran horas sin agendar y encima aparecieron bloques de foco. Aprovechá la racha.", dato: `${Math.round(sinRegistrar)} h sin agendar` });
  alertas.sort((a, b) => b.sev - a.sev);

  return { segments, libre: Math.round(sinRegistrar), alertas, principal: alertas[0] || null, extra: Math.max(0, alertas.length - 1) };
}
