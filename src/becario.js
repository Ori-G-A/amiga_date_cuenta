// Fuente de datos del becario: distribución del tiempo de la semana.
// Endpoint en VITE_BECARIO_URL (GET ?semana=YYYY-MM-DD); window.BECARIO_URL
// lo pisa desde la consola para probar. Sin endpoint: serie determinista + overrides locales.

export const OBJETIVOS = { suenoDia: 7.5, focoDia: 1.5, ejercicioSemana: 3, libresSemana: 46, azucarDias: 0 };

const COLORS = {
  trabajo: "oklch(28% 0.02 150)",
  sueno: "oklch(52% 0.085 150)",
  foco: "oklch(48% 0.11 340)",
  ejercicio: "oklch(62% 0.10 55)",
  cuidado: "oklch(80% 0.03 80)",
  comida: "oklch(86% 0.035 60)",
  traslado: "oklch(72% 0.02 80)",
  libre: "oklch(92% 0.02 80)",
};

function seeded(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return () => { h ^= h << 13; h ^= h >>> 17; h ^= h << 5; return ((h >>> 0) % 10000) / 10000; };
}

function mock(weekStart) {
  const r = seeded(weekStart);
  const sueno = +(5.2 + r() * 3.1).toFixed(1);
  const foco = +(r() * 2.2).toFixed(1);
  return {
    semana: weekStart,
    fuente: "simulada",
    suenoDia: sueno,
    focoDia: foco,
    trabajoSemana: Math.round(36 + r() * 12),
    trasladoSemana: +(2.5 + r() * 4).toFixed(1),
    cuidadoDia: +(1 + r() * 1).toFixed(1),
    comidaDia: +(0.7 + r() * 0.8).toFixed(1),
    ejercicioSemana: +(r() * 4.2).toFixed(1),
    azucarDias: Math.round(r() * 7),
  };
}

export async function fetchSemana(weekStart) {
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
  const trabajo = d.trabajoSemana;
  const sueno = d.suenoDia * 7;
  const foco = d.focoDia * 7;
  const cuidado = d.cuidadoDia * 7;
  const comida = d.comidaDia * 7;
  const bruto = [
    ["trabajo", "Trabajo", trabajo],
    ["sueno", "Sueño", sueno],
    ["foco", "Foco profundo", foco],
    ["ejercicio", "Ejercicio", d.ejercicioSemana],
    ["cuidado", "Cuidado personal", cuidado],
    ["comida", "Comida", comida],
    ["traslado", "Traslado", d.trasladoSemana],
  ];
  const usado = bruto.reduce((a, b) => a + b[2], 0);
  const libre = Math.max(0, 168 - usado);
  const segments = [...bruto, ["libre", "Libre", libre]].map(([key, label, horas]) => ({
    key, label, horas: Math.round(horas),
    width: `${((horas / 168) * 100).toFixed(2)}%`,
    color: COLORS[key],
  }));

  const alertas = [];
  if (d.suenoDia < 5) alertas.push({ sev: 5, gesto: "modoseria", texto: "Dormiste 5 horas o menos por noche. Con eso rendís un tercio menos y no es tema de actitud.", dato: `${d.suenoDia} h promedio` });
  else if (d.suenoDia < OBJETIVOS.suenoDia) alertas.push({ sev: 3, gesto: "modoseria", texto: "Te faltó sueño casi toda la semana. Antes de tocar cualquier otra cosa, esto.", dato: `${d.suenoDia} h de ${OBJETIVOS.suenoDia}` });
  if (foco < 7) alertas.push({ sev: 4, gesto: "modoseria", texto: "Ni un bloque de 90 minutos para lo que de verdad importa. Y libre tenés tiempo.", dato: `${Math.round(foco)} h de foco · ${Math.round(libre)} h libres` });
  if (d.ejercicioSemana < OBJETIVOS.ejercicioSemana) alertas.push({ sev: 2, gesto: "protectora", texto: "El cuerpo es la mente y esta semana quedó afuera del reparto.", dato: `${d.ejercicioSemana} h de ${OBJETIVOS.ejercicioSemana}` });
  if (d.azucarDias >= 4) alertas.push({ sev: 1.5, gesto: "condescendiente", texto: "Azúcar casi todos los días. No te voy a dar el discurso; ya lo sabés.", dato: `${d.azucarDias} de 7 días` });
  if (libre > 45 && foco >= 7) alertas.push({ sev: 1, gesto: "complice", texto: "Sobran horas libres y encima aparecieron bloques de foco. Aprovechá la racha.", dato: `${Math.round(libre)} h libres` });
  alertas.sort((a, b) => b.sev - a.sev);

  return { segments, libre: Math.round(libre), alertas, principal: alertas[0] || null, extra: Math.max(0, alertas.length - 1) };
}
