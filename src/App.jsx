import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  EMOCIONES, EMO_COLOR, ABSOLUTOS, REACTIONS, WEEK_REACTIONS, FRASES_ANCLA,
  GESTO_SPRITE, sugerirPara, pickLine, patronesSinResolver,
} from "./amiga.js";
import { fetchSemana, evaluar } from "./becario.js";

const ENTRIES_KEY = "thought-records";
const WEEKLY_KEY = "weekly-logs";
const BOOKS_KEY = "reading-log";

// ponytail: eran props del Design Component; acá no hay panel de props.
const TONO = "mixto";
const MOSTRAR_REACCIONES = true;
const ALERTAS_BECARIO = true;

const DAY_NAMES = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
const MONTH_ABBR = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const MONTH_FULL = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const STAR_ON = "oklch(60% 0.13 70)";

let idCounter = 0;
const makeId = () => `${Date.now()}-${(idCounter++).toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
const emptyEmotion = (nombre) => ({ id: makeId(), nombre: nombre || "", antes: 50, despues: 50 });
const emptyDraft = () => ({ id: null, fecha: new Date().toISOString().slice(0, 10), situacion: "", emociones: [], pensamiento: "", evidenciaFavor: "", evidenciaContra: "", alterno: "" });
const emptyDay = () => ({ situacion: "", intensidad: "", estrategia: "", ayudo: "" });

const fmtFecha = (iso) => { const [y, m, d] = iso.split("-"); return `${d}/${m}/${y}`; };
const toISO = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
function getMonday(date) { const d = new Date(date); const day = d.getDay(); d.setDate(d.getDate() + (day === 0 ? -6 : 1 - day)); return d; }
const addDaysISO = (iso, n) => { const d = new Date(iso + "T00:00:00"); d.setDate(d.getDate() + n); return toISO(d); };
const fmtShort = (iso) => { const d = new Date(iso + "T00:00:00"); return `${d.getDate()} ${MONTH_ABBR[d.getMonth()]}`; };

const IMG = (n) => `/amiga/${n}.png`;
const SHEET_COLS = { gestos: 4, tonos: 6 };
// una imagen suelta o una celda de sprite, según el nombre
const SHEET_OF = { asisehace: ["gestos", 2], modoseria: ["gestos", 3] };

function spriteStyle(sheet, i, w, h) {
  return {
    width: w, height: h, flexShrink: 0,
    backgroundImage: `url(${IMG(sheet)})`,
    backgroundRepeat: "no-repeat",
    backgroundSize: `${SHEET_COLS[sheet] * w}px ${h}px`,
    backgroundPosition: `-${i * w}px 0`,
  };
}

const rootVars = {
  "--paper": "oklch(97% 0.013 85)", "--paper-deep": "oklch(93% 0.016 80)", "--card": "oklch(99% 0.007 85)",
  "--ink": "oklch(22% 0.02 150)", "--ink-soft": "oklch(48% 0.02 150)", "--line": "oklch(86% 0.02 80)",
  "--accent": "oklch(48% 0.11 340)", "--accent-soft": "oklch(93% 0.035 340)",
  "--moss": "oklch(50% 0.09 150)", "--moss-soft": "oklch(93% 0.03 150)",
  "--danger": "oklch(50% 0.12 30)", "--danger-soft": "oklch(93% 0.035 30)",
  fontFamily: "'Inter',sans-serif", background: "var(--paper)", color: "var(--ink)",
  minHeight: "100vh", position: "relative",
};

const mono = { fontFamily: "'IBM Plex Mono',monospace" };
const serif = { fontFamily: "'Fraunces',serif" };
const label = (ls = "0.08em") => ({ ...mono, fontSize: 10.5, letterSpacing: ls, textTransform: "uppercase", color: "var(--ink-soft)", marginBottom: 8 });
const field = { width: "100%", fontFamily: "'Inter',sans-serif", fontSize: 14.5, border: "none", borderBottom: "1px solid var(--line)", background: "transparent", padding: "8px 2px", color: "var(--ink)" };
const area = { ...field, resize: "vertical", lineHeight: 1.5 };
const roundBtn = { border: "1px solid var(--line)", background: "var(--card)", borderRadius: "50%", width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "var(--ink)" };
const linkBtn = { background: "none", border: "none", cursor: "pointer", fontSize: 13, fontWeight: 500, color: "var(--ink)", padding: 0 };

const Chevron = () => <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>;
const Cross = ({ s = 16 }) => <svg width={s} height={s} viewBox="0 0 16 16" fill="none"><path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>;
const Arrow = ({ dir }) => <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d={dir === "left" ? "M10 3L5 8l5 5" : "M6 3l5 5-5 5"} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>;

function Amiga({ name, width, height }) {
  const cell = SHEET_OF[name];
  if (cell) return <div style={{ ...spriteStyle(cell[0], cell[1], width, height), marginBottom: -4 }} />;
  return <img src={IMG(name)} alt="" style={{ width, height: "auto", flexShrink: 0, marginBottom: -4 }} />;
}

function Stars({ value, onSet, size }) {
  return (
    <div style={{ display: "flex", gap: size > 15 ? 3 : 2 }}>
      {Array.from({ length: 5 }, (_, i) => (
        <button key={i} onClick={() => onSet(i + 1 === value ? 0 : i + 1)}
          style={{ background: "none", border: "none", cursor: "pointer", padding: 0, fontSize: size, lineHeight: 1, color: i < value ? STAR_ON : "var(--line)" }}>★</button>
      ))}
    </div>
  );
}

export default function App() {
  const [view, setView] = useState("diario");
  const [entries, setEntries] = useState([]);
  const [weeklyLogs, setWeeklyLogs] = useState({});
  const [books, setBooks] = useState([]);
  const [openId, setOpenId] = useState(null);
  const [draft, setDraft] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [copiedId, setCopiedId] = useState(null);
  const [weekStart, setWeekStart] = useState(() => toISO(getMonday(new Date())));
  const [weekCopied, setWeekCopied] = useState(false);
  const [reaction, setReaction] = useState(null);
  const [sugPasosOpen, setSugPasosOpen] = useState(false);
  const [becario, setBecario] = useState(null);
  const [becarioEval, setBecarioEval] = useState(null);
  const [bookYear, setBookYear] = useState(() => new Date().getFullYear());
  const [newBook, setNewBook] = useState({ titulo: "", autor: "", rating: 0 });
  const [contactoInput, setContactoInput] = useState("");

  const lastReaction = useRef({ key: null, text: null });
  const reactionTimer = useRef(null);

  useEffect(() => {
    (async () => {
      for (const [key, set] of [[ENTRIES_KEY, setEntries], [WEEKLY_KEY, setWeeklyLogs], [BOOKS_KEY, setBooks]]) {
        try {
          const res = await window.storage.get(key);
          if (res && res.value) set(JSON.parse(res.value));
        } catch (e) {
          // la clave todavía no existe: primera vez, no es error
        }
      }
    })();
    return () => clearTimeout(reactionTimer.current);
  }, []);

  useEffect(() => {
    let vigente = true;
    setBecario(null); setBecarioEval(null);
    fetchSemana(weekStart).then((data) => {
      if (!vigente) return;
      setBecario(data); setBecarioEval(evaluar(data));
    }).catch(() => {});
    return () => { vigente = false; };
  }, [weekStart]);

  const persist = useCallback((key, set, next) => {
    set(next);
    Promise.resolve(window.storage.set(key, JSON.stringify(next))).catch(() => {});
  }, []);
  const persistEntries = (next) => persist(ENTRIES_KEY, setEntries, next);
  const persistWeekly = (next) => persist(WEEKLY_KEY, setWeeklyLogs, next);
  const persistBooks = (next) => persist(BOOKS_KEY, setBooks, next);

  // ---- reacción de la amiga al guardar ----
  function showReaction(entry, allEntries) {
    if (!MOSTRAR_REACCIONES) return;
    const emociones = entry.emociones || [];
    const deltas = emociones.map((e) => Number(e.despues) - Number(e.antes));
    const avgDelta = deltas.length ? deltas.reduce((a, b) => a + b, 0) / deltas.length : null;
    const maxAntes = emociones.length ? Math.max(...emociones.map((e) => Number(e.antes))) : 0;
    const texto = `${entry.pensamiento || ""} ${entry.situacion || ""}`.toLowerCase();
    const recientes = allEntries.filter((e) => {
      const diff = (new Date(entry.fecha) - new Date(e.fecha)) / 86400000;
      return diff >= 0 && diff <= 7;
    }).length;

    const hits = [];
    const add = (key, hint) => hits.push({ key, hint });
    if (allEntries.length === 1) add("primera");
    if (maxAntes >= 85) add("intensaAlta", `pico de ${maxAntes}% antes`);
    if (entry.evidenciaFavor && entry.evidenciaFavor.trim() && !(entry.evidenciaContra || "").trim()) add("faltaContra");
    if (ABSOLUTOS.some((w) => texto.includes(w))) add("absolutos");
    if (recientes >= 3) add("patron", `${recientes} registros en 7 días`);
    if (avgDelta !== null && avgDelta >= 6) add("subio", `+${Math.round(avgDelta)}% en promedio`);
    if (avgDelta !== null && Math.abs(avgDelta) <= 5 && emociones.length) add("sinCambio", "sin cambio medible");
    if (avgDelta !== null && avgDelta <= -25) add("bajaMucho", `${Math.round(avgDelta)}% en promedio`);
    if (entry.situacion && entry.pensamiento && entry.evidenciaFavor && entry.evidenciaContra && entry.alterno && emociones.length) add("completo", "6 de 6 campos");
    if (!(entry.alterno || "").trim()) add("faltaAlterno");
    if (avgDelta !== null && avgDelta < -5 && avgDelta > -25) add("bajaPoco", `${Math.round(avgDelta)}% en promedio`);
    if (allEntries.length >= 10) add("constancia", `${allEntries.length} registros`);
    const dom = emociones.slice().sort((a, b) => Number(b.antes) - Number(a.antes))[0];
    const patDom = dom ? patronesSinResolver(allEntries).find((p) => p.nombre === dom.nombre) : null;
    if (patDom) add("patronEmo", `${patDom.nombre} ×${patDom.veces} en 21 días`);
    if (dom && REACTIONS[`emo:${dom.nombre}`]) add(`emo:${dom.nombre}`, `${dom.nombre} al ${dom.antes}%`);
    add("base");

    hits.sort((a, b) => REACTIONS[b.key].prio - REACTIONS[a.key].prio);
    const chosen = (hits.length > 1 && hits[0].key === lastReaction.current.key) ? hits[1] : hits[0];
    const pool = REACTIONS[chosen.key];
    const text = pickLine(pool, TONO, lastReaction.current.text);
    lastReaction.current = { key: chosen.key, text };

    clearTimeout(reactionTimer.current);
    setReaction({ name: pool.img, text, hint: chosen.hint || "" });
    reactionTimer.current = setTimeout(() => setReaction(null), 9000);
  }

  const dismissReaction = () => { clearTimeout(reactionTimer.current); setReaction(null); };

  // ---- registros ----
  const updateDraftField = (f, v) => setDraft((d) => ({ ...d, [f]: v }));
  const updateEmotion = (id, f, v) => setDraft((d) => ({ ...d, emociones: d.emociones.map((e) => (e.id === id ? { ...e, [f]: v } : e)) }));
  const removeEmotion = (id) => setDraft((d) => ({ ...d, emociones: d.emociones.filter((e) => e.id !== id) }));
  const toggleEmotion = (nombre) => setDraft((d) => {
    const has = d.emociones.some((e) => e.nombre === nombre);
    return { ...d, emociones: has ? d.emociones.filter((e) => e.nombre !== nombre) : [...d.emociones, emptyEmotion(nombre)] };
  });

  function saveDraft() {
    if (!draft || !draft.situacion.trim()) return;
    const clean = { ...draft, emociones: draft.emociones.filter((e) => e.nombre.trim()) };
    let next;
    if (draft.id) {
      next = entries.map((e) => (e.id === draft.id ? clean : e));
    } else {
      clean.id = makeId();
      clean.createdAt = new Date().toISOString();
      next = [clean, ...entries];
    }
    next.sort((a, b) => (a.fecha < b.fecha ? 1 : -1));
    persistEntries(next);
    setDraft(null); setSugPasosOpen(false);
    showReaction(clean, next);
  }

  function deleteEntry(id) {
    persistEntries(entries.filter((e) => e.id !== id));
    setConfirmDeleteId(null);
    if (openId === id) setOpenId(null);
  }

  async function copyForSession(entry) {
    const lines = [
      `Registro del ${fmtFecha(entry.fecha)}`, "", `Situación: ${entry.situacion}`, "", "Emociones:",
      ...entry.emociones.map((e) => `  - ${e.nombre}: ${e.antes}% → ${e.despues}%`), "",
      `Pensamiento automático: ${entry.pensamiento || "—"}`, "",
      `Evidencia a favor: ${entry.evidenciaFavor || "—"}`, "",
      `Evidencia en contra: ${entry.evidenciaContra || "—"}`, "",
      `Pensamiento alternativo: ${entry.alterno || "—"}`,
    ];
    try {
      await navigator.clipboard.writeText(lines.join("\n"));
      setCopiedId(entry.id);
      setTimeout(() => setCopiedId((c) => (c === entry.id ? null : c)), 1800);
    } catch (e) {}
  }

  // ---- semana ----
  const currentWeek = weeklyLogs[weekStart] || { reflexion: "", days: {} };
  const weekDates = Array.from({ length: 7 }, (_, i) => addDaysISO(weekStart, i));

  const patchWeek = (patch) => persistWeekly({ ...weeklyLogs, [weekStart]: { ...currentWeek, ...patch } });
  const updateDayField = (iso, f, v) => patchWeek({ days: { ...currentWeek.days, [iso]: { ...(currentWeek.days[iso] || emptyDay()), [f]: v } } });

  function addContacto() {
    const nombre = contactoInput.trim();
    if (!nombre) return;
    const list = currentWeek.contactos || [];
    if (!list.some((c) => c.toLowerCase() === nombre.toLowerCase())) patchWeek({ contactos: [...list, nombre] });
    setContactoInput("");
  }

  async function copyWeek() {
    const lines = [
      `Episodios de ansiedad — semana del ${fmtShort(weekDates[0])} al ${fmtShort(weekDates[6])}`, "",
      ...weekDates.flatMap((iso, i) => {
        const day = currentWeek.days[iso];
        if (!day || (!day.situacion && !day.estrategia && day.intensidad === "" && !day.ayudo)) return [];
        return [`${DAY_NAMES[i]} (${fmtShort(iso)})`, `  Situación: ${day.situacion || "—"}`, `  Intensidad: ${day.intensidad !== "" ? `${day.intensidad}/10` : "—"}`, `  Estrategia usada: ${day.estrategia || "—"}`, `  ¿Ayudó?: ${day.ayudo || "—"}`, ""];
      }),
      `Obsesión de la semana: ${currentWeek.obsesion || "—"}`,
      `Contacté a: ${(currentWeek.contactos || []).length ? currentWeek.contactos.join(", ") : "—"}`, "",
      `Reflexión de la semana: ${currentWeek.reflexion || "—"}`,
    ];
    try {
      await navigator.clipboard.writeText(lines.join("\n"));
      setWeekCopied(true);
      setTimeout(() => setWeekCopied(false), 1800);
    } catch (e) {}
  }

  // ---- lecturas ----
  function addBook() {
    if (!newBook.titulo.trim()) return;
    persistBooks([{ id: makeId(), titulo: newBook.titulo.trim(), autor: newBook.autor.trim(), rating: newBook.rating, cover: "", year: bookYear }, ...books]);
    setNewBook({ titulo: "", autor: "", rating: 0 });
  }

  function setBookCover(id, input) {
    const file = input.files && input.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        // redimensiona a 320px de ancho para no reventar la cuota de storage
        const w = 320;
        const h = Math.max(1, Math.round((img.height / img.width) * w));
        const canvas = document.createElement("canvas");
        canvas.width = w; canvas.height = h;
        canvas.getContext("2d").drawImage(img, 0, 0, w, h);
        let cover = reader.result;
        try { cover = canvas.toDataURL("image/jpeg", 0.72); } catch (e) {}
        persistBooks(books.map((b) => (b.id === id ? { ...b, cover } : b)));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
    input.value = "";
  }

  // ---- valores derivados ----
  const isDiario = view === "diario", isSemana = view === "semana", isLecturas = view === "lecturas";

  const monthGroups = [];
  const groupMap = {};
  for (const entry of entries) {
    const [y, m] = entry.fecha.split("-");
    const key = `${y}-${m}`;
    if (!groupMap[key]) {
      const l = `${MONTH_FULL[Number(m) - 1]} ${y}`;
      groupMap[key] = { key, label: l.charAt(0).toUpperCase() + l.slice(1), items: [] };
      monthGroups.push(groupMap[key]);
    }
    groupMap[key].items.push(entry);
  }

  const filled = weekDates.map((iso) => currentWeek.days[iso]).filter((d) => d && (d.situacion || d.estrategia || d.intensidad !== "" || d.ayudo));
  const intensidades = filled.filter((d) => d.intensidad !== "" && d.intensidad != null).map((d) => Number(d.intensidad));
  const avgInt = intensidades.length ? intensidades.reduce((a, b) => a + b, 0) / intensidades.length : null;
  const noes = filled.filter((d) => d.ayudo === "No").length;
  const sies = filled.filter((d) => d.ayudo === "Sí").length;
  const diasRojos = intensidades.filter((n) => n >= 7).length;
  const conDelta = entries.filter((e) => (e.emociones || []).length);
  const bajaron = conDelta.filter((e) => {
    const ds = e.emociones.map((x) => Number(x.despues) - Number(x.antes));
    return ds.reduce((a, b) => a + b, 0) / ds.length < -5;
  }).length;

  let weekKey;
  if (diasRojos >= 2) weekKey = "bio";
  else if (!filled.length && conDelta.length >= 3 && bajaron > conDelta.length / 2) weekKey = "unoPorCiento";
  else if (!filled.length) weekKey = "vacia";
  else if (noes >= 2) weekKey = "noAyudo";
  else if (avgInt !== null && avgInt >= 7) weekKey = "intensa";
  else if (sies >= 2) weekKey = "siAyudo";
  else if (avgInt !== null && avgInt <= 3 && intensidades.length >= 2) weekKey = "suave";
  else if (conDelta.length >= 3 && bajaron > conDelta.length / 2) weekKey = "unoPorCiento";
  else weekKey = "enCurso";

  const wPool = WEEK_REACTIONS[weekKey];
  let wLines = wPool.lines.filter(([t]) => TONO === "mixto" || t === (TONO === "filoso" ? "s" : "w"));
  if (!wLines.length) wLines = wPool.lines;
  // hash determinista: la nota no parpadea mientras se tipea
  let hash = 0;
  for (const ch of weekStart + weekKey) hash = (hash * 31 + ch.charCodeAt(0)) % 9973;
  const weekNoteText = wLines[hash % wLines.length][1];

  const hoy = new Date();
  const diaDelAno = Math.floor((hoy - new Date(hoy.getFullYear(), 0, 0)) / 86400000);
  const sug = draft ? sugerirPara(draft.emociones) : null;
  const alerta = becarioEval && becarioEval.principal;
  const alertaSprite = alerta ? (GESTO_SPRITE[alerta.gesto] || GESTO_SPRITE.modoseria) : null;

  const patrones = patronesSinResolver(entries);
  const pat = patrones[0];
  const chosenEmos = draft ? draft.emociones.map((e) => e.nombre) : [];
  const contactos = currentWeek.contactos || [];
  const isCurrentWeek = weekStart === toISO(getMonday(new Date()));
  const todayISO = toISO(new Date());

  const yearBooks = books.filter((b) => Number(b.year) === Number(bookYear));
  const rated = yearBooks.filter((b) => Number(b.rating) > 0);
  const promedio = rated.length ? (rated.reduce((a, b) => a + Number(b.rating), 0) / rated.length).toFixed(1) : null;
  const plural = yearBooks.length === 1 ? "" : "s";

  const tabs = [["diario", "Pensamientos"], ["semana", "Episodios ansiosos"], ["lecturas", "Lecturas"]];

  return (
    <div style={rootVars}>
      <header style={{ position: "sticky", top: 0, zIndex: 20, background: "color-mix(in oklch, var(--paper) 88%, transparent)", backdropFilter: "blur(10px)", borderBottom: "1px solid var(--line)" }}>
        <div style={{ maxWidth: 680, margin: "0 auto", padding: "16px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
          <div style={{ ...serif, fontStyle: "italic", fontSize: 19, fontWeight: 600, letterSpacing: "-0.01em" }}>Amiga, date cuenta</div>
          <nav style={{ display: "flex", position: "relative" }}>
            {tabs.map(([id, text]) => (
              <button key={id} onClick={() => setView(id)}
                style={{ background: "none", border: "none", cursor: "pointer", fontFamily: "'Inter',sans-serif", fontSize: 13.5, fontWeight: 500, color: view === id ? "var(--ink)" : "var(--ink-soft)", padding: "6px 14px", position: "relative" }}>
                {text}
                {view === id && <span style={{ position: "absolute", left: 14, right: 14, bottom: -1, height: 2, background: "var(--accent)", animation: "underlineDraw 0.3s ease" }} />}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <main style={{ maxWidth: 680, margin: "0 auto", padding: "0 24px 120px" }}>
        <section style={{ padding: "56px 0 32px", borderBottom: "1px solid var(--line)" }}>
          <div style={{ ...mono, fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--ink-soft)", marginBottom: 10 }}>
            {isLecturas ? "control anual de lectura" : isDiario ? (entries.length ? `${entries.length} registro${entries.length === 1 ? "" : "s"}` : "cuaderno personal") : "seguimiento semanal"}
          </div>
          <h1 style={{ ...serif, fontWeight: 500, fontSize: 44, lineHeight: 1.05, margin: "0 0 14px", maxWidth: 520, letterSpacing: "-0.01em" }}>
            {isLecturas ? "Un año de lecturas, con nombre y apellido." : isDiario ? "Notar el patrón antes de que el patrón te note." : "Una bitácora para tus días difíciles."}
          </h1>
          <p style={{ fontSize: 15, color: "var(--ink-soft)", lineHeight: 1.6, maxWidth: 440, margin: 0 }}>
            {isLecturas ? "Libro, autor, calificación y portada. Un registro, no una lista de deseos." : isDiario ? "Situación, pensamiento y evidencia — para llevar a terapia." : "Registrá qué dispara tu ansiedad y qué te ayuda a bajarla."}
          </p>
          <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginTop: 26, maxWidth: 520 }}>
            <span style={{ ...mono, fontSize: 9.5, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--ink-soft)", flexShrink: 0, paddingTop: 3 }}>Hoy</span>
            <span style={{ ...serif, fontStyle: "italic", fontSize: 15, lineHeight: 1.45 }}>{FRASES_ANCLA[diaDelAno % FRASES_ANCLA.length]}</span>
          </div>
        </section>

        {isDiario && (
          <div>
            {pat && (
              <div style={{ display: "flex", gap: 10, alignItems: "flex-end", border: "1px solid var(--danger-soft)", background: "color-mix(in oklch, var(--danger-soft) 40%, var(--card))", borderRadius: 12, padding: "14px 18px 0 8px", marginTop: 28, overflow: "hidden", animation: "amigaIn 0.6s cubic-bezier(0.16,1,0.3,1) both" }}>
                <div style={spriteStyle("gestos", 3, 104, 132)} />
                <div style={{ flex: 1, minWidth: 0, paddingBottom: 16 }}>
                  <div style={{ ...mono, fontSize: 9.5, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--danger)", marginBottom: 6 }}>
                    {pat.nombre} · {pat.veces} veces en 21 días · {pat.avg >= 0 ? "+" : ""}{pat.avg}% al escribir
                  </div>
                  <div style={{ ...serif, fontStyle: "italic", fontSize: 16, lineHeight: 1.45 }}>
                    «{pat.nombre}» vuelve y no baja cuando la escribís. Eso ya no es un registro suelto: es el tema de la próxima sesión.
                  </div>
                  {patrones.length > 1 && (
                    <div style={{ ...mono, fontSize: 10, color: "var(--ink-soft)", marginTop: 8 }}>
                      También sin resolver: {patrones.slice(1).map((p) => p.nombre.toLowerCase()).join(", ")}.
                    </div>
                  )}
                </div>
              </div>
            )}

            {entries.length === 0 && (
              <div style={{ textAlign: "center", padding: "56px 20px 40px" }}>
                <img src={IMG("curiosa")} alt="" style={{ width: 186, height: "auto", display: "block", margin: "0 auto 10px" }} />
                <div style={{ ...serif, fontStyle: "italic", fontSize: 21, marginBottom: 8 }}>Aún no hay registros</div>
                <div style={{ color: "var(--ink-soft)", fontSize: 14, maxWidth: 330, margin: "0 auto", lineHeight: 1.6 }}>Empezá tu primera entrada: qué pasó, qué sentiste, qué pensaste. Yo espero acá con el café.</div>
              </div>
            )}

            {monthGroups.map((group) => (
              <div key={group.key} style={{ marginTop: 36 }}>
                <div style={{ ...serif, fontStyle: "italic", fontSize: 17, color: "var(--ink-soft)", marginBottom: 14 }}>{group.label}</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  {group.items.map((entry) => {
                    const open = openId === entry.id;
                    return (
                      <article key={entry.id} className="adc-row" style={{ borderTop: "1px solid var(--line)", padding: "20px 0", animation: "fadeUp 0.5s ease both" }}>
                        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, cursor: "pointer" }} onClick={() => setOpenId(open ? null : entry.id)}>
                          <div style={{ minWidth: 0, flex: 1 }}>
                            <div style={{ ...mono, fontSize: 11, color: "var(--ink-soft)", marginBottom: 4 }}>{fmtFecha(entry.fecha)}</div>
                            <div style={{ ...serif, fontSize: 19, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: open ? "normal" : "nowrap" }}>{entry.situacion}</div>
                          </div>
                          <div style={{ flexShrink: 0, color: "var(--ink-soft)", transform: open ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.25s ease", marginTop: 6 }}><Chevron /></div>
                        </div>

                        <div style={{ display: "grid", gridTemplateRows: open ? "1fr" : "0fr", transition: "grid-template-rows 0.4s ease" }}>
                          <div style={{ overflow: "hidden" }}>
                            <div style={{ paddingTop: 18 }}>
                              {(entry.emociones || []).length > 0 && (
                                <div style={{ marginBottom: 18 }}>
                                  <div style={{ ...label(), marginBottom: 10 }}>Emociones</div>
                                  {entry.emociones.map((e) => {
                                    const delta = e.despues - e.antes;
                                    return (
                                      <div key={e.id} style={{ marginBottom: 16 }}>
                                        <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 8 }}>
                                          <span style={{ width: 8, height: 8, borderRadius: "50%", background: EMO_COLOR[e.nombre] || "var(--ink-soft)" }} />
                                          <span style={{ fontSize: 14, fontWeight: 500 }}>{e.nombre}</span>
                                        </div>
                                        <div style={{ position: "relative", height: 5, background: "var(--paper-deep)", borderRadius: 3, margin: "14px 2px 6px" }}>
                                          <div style={{ position: "absolute", top: 0, height: 5, borderRadius: 3, background: "var(--line)", left: `${Math.min(e.antes, e.despues)}%`, width: `${Math.abs(e.despues - e.antes)}%` }} />
                                          <div style={{ position: "absolute", top: -5, width: 15, height: 15, borderRadius: "50%", border: "2px solid var(--card)", background: "var(--accent)", transform: "translateX(-50%)", left: `${e.antes}%` }} />
                                          <div style={{ position: "absolute", top: -5, width: 15, height: 15, borderRadius: "50%", border: "2px solid var(--card)", background: "var(--moss)", transform: "translateX(-50%)", left: `${e.despues}%`, zIndex: 1 }} />
                                        </div>
                                        <div style={{ display: "flex", justifyContent: "space-between", ...mono, fontSize: 11, color: "var(--ink-soft)" }}>
                                          <span>{e.antes}% antes</span>
                                          <span style={{ fontWeight: 500, color: delta < 0 ? "var(--moss)" : delta > 0 ? "var(--accent)" : "var(--ink-soft)" }}>
                                            {delta === 0 ? "sin cambio" : `${delta > 0 ? "+" : ""}${delta}%`}
                                          </span>
                                          <span>{e.despues}% después</span>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}

                              {[["Pensamiento automático", entry.pensamiento], ["Evidencia a favor", entry.evidenciaFavor], ["Evidencia en contra", entry.evidenciaContra], ["Pensamiento alternativo", entry.alterno]]
                                .filter(([, v]) => v)
                                .map(([t, v]) => (
                                  <div key={t} style={{ marginBottom: 16 }}>
                                    <div style={{ ...label(), marginBottom: 6 }}>{t}</div>
                                    <div style={{ fontSize: 14.5, lineHeight: 1.55, whiteSpace: "pre-wrap" }}>{v}</div>
                                  </div>
                                ))}

                              {confirmDeleteId === entry.id ? (
                                <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 6, fontSize: 13.5 }}>
                                  <span style={{ color: "var(--ink-soft)" }}>¿Eliminar este registro?</span>
                                  <button onClick={() => deleteEntry(entry.id)} style={{ background: "var(--danger-soft)", color: "var(--danger)", border: "none", borderRadius: 6, padding: "7px 12px", fontSize: 13, fontWeight: 500, cursor: "pointer" }}>Sí, eliminar</button>
                                  <button onClick={() => setConfirmDeleteId(null)} style={{ background: "none", border: "none", color: "var(--ink-soft)", fontSize: 13, cursor: "pointer", textDecoration: "underline" }}>Cancelar</button>
                                </div>
                              ) : (
                                <div style={{ display: "flex", gap: 18, marginTop: 6, alignItems: "center" }}>
                                  <button className="adc-link" style={linkBtn} onClick={() => setDraft(JSON.parse(JSON.stringify(entry)))}>Editar</button>
                                  <button className="adc-link" style={{ ...linkBtn, display: "flex", alignItems: "center", gap: 5 }} onClick={() => copyForSession(entry)}>
                                    {copiedId === entry.id ? <span style={{ color: "var(--moss)" }}>Copiado ✓</span> : <span>Copiar para terapia</span>}
                                  </button>
                                  <button onClick={() => setConfirmDeleteId(entry.id)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 13, color: "var(--danger)", padding: 0, marginLeft: "auto" }}>Eliminar</button>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </div>
            ))}

            <div style={{ textAlign: "center", fontSize: 11.5, color: "var(--ink-soft)", lineHeight: 1.6, padding: "40px 20px 0" }}>Este cuaderno es un apoyo de autoobservación para tu proceso terapéutico — no lo reemplaza.</div>
          </div>
        )}

        {isSemana && (
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "32px 0 8px" }}>
              <button style={roundBtn} onClick={() => setWeekStart(addDaysISO(weekStart, -7))}><Arrow dir="left" /></button>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
                <div style={{ ...serif, fontStyle: "italic", fontSize: 16 }}>{fmtShort(weekDates[0])} – {fmtShort(weekDates[6])}</div>
                {!isCurrentWeek && <button style={{ ...mono, fontSize: 10.5, color: "var(--accent)", background: "none", border: "none", cursor: "pointer", textDecoration: "underline" }} onClick={() => setWeekStart(toISO(getMonday(new Date())))}>ir a hoy</button>}
              </div>
              <button style={roundBtn} onClick={() => setWeekStart(addDaysISO(weekStart, 7))}><Arrow dir="right" /></button>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", padding: "8px 0 20px" }}>
              <button className="adc-link" style={{ ...linkBtn, display: "flex", alignItems: "center", gap: 5 }} onClick={copyWeek}>
                {weekCopied ? <span style={{ color: "var(--moss)" }}>Copiado ✓</span> : <span>Copiar semana</span>}
              </button>
            </div>

            {becarioEval && (
              <div style={{ border: "1px solid var(--line)", background: "var(--card)", borderRadius: 10, padding: "15px 18px 16px", marginBottom: 16 }}>
                <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12, marginBottom: 11 }}>
                  <div style={{ ...mono, fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--ink-soft)" }}>
                    Parte del becario · {becario && becario.fuente === "becario" ? "datos en vivo" : "serie simulada"}
                  </div>
                  <div style={{ ...mono, fontSize: 10, color: "var(--ink-soft)" }}>{becarioEval.libre} h libres de 168</div>
                </div>
                <div style={{ display: "flex", height: 9, borderRadius: 5, overflow: "hidden", background: "var(--paper-deep)" }}>
                  {becarioEval.segments.map((seg) => <div key={seg.key} title={`${seg.label}: ${seg.horas} h`} style={{ width: seg.width, background: seg.color }} />)}
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "7px 15px", marginTop: 11 }}>
                  {becarioEval.segments.map((seg) => (
                    <div key={seg.key} style={{ display: "flex", alignItems: "center", gap: 6, ...mono, fontSize: 10, color: "var(--ink-soft)" }}>
                      <span style={{ width: 7, height: 7, borderRadius: 2, background: seg.color }} />
                      <span>{seg.label} {seg.horas} h</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {alerta && ALERTAS_BECARIO && (
              <div style={{ display: "flex", gap: 10, alignItems: "flex-end", border: "1px solid var(--accent-soft)", background: "color-mix(in oklch, var(--accent-soft) 45%, var(--card))", borderRadius: 12, padding: "14px 18px 0 8px", marginBottom: 18, overflow: "hidden", animation: "amigaIn 0.6s cubic-bezier(0.16,1,0.3,1) both" }}>
                <div style={alertaSprite[0] === "gestos" ? spriteStyle("gestos", alertaSprite[1], 104, 132) : spriteStyle("tonos", alertaSprite[1], 108, 92)} />
                <div style={{ flex: 1, minWidth: 0, paddingBottom: 16 }}>
                  <div style={{ ...mono, fontSize: 9.5, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--accent)", marginBottom: 6 }}>{alerta.dato}</div>
                  <div style={{ ...serif, fontStyle: "italic", fontSize: 16, lineHeight: 1.45 }}>{alerta.texto}</div>
                  {becarioEval.extra > 0 && (
                    <div style={{ ...mono, fontSize: 10, color: "var(--ink-soft)", marginTop: 8 }}>+ {becarioEval.extra} desvío{becarioEval.extra === 1 ? "" : "s"} más en el parte de esta semana</div>
                  )}
                </div>
              </div>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {weekDates.map((iso, i) => {
                const day = currentWeek.days[iso] || emptyDay();
                return (
                  <div key={iso} style={{ background: "var(--card)", border: `1px solid ${iso === todayISO ? "var(--accent)" : "var(--line)"}`, borderRadius: 8, padding: "16px 18px 18px" }}>
                    <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 12 }}>
                      <div style={{ ...serif, fontSize: 16 }}>{DAY_NAMES[i]}</div>
                      <div style={{ ...mono, fontSize: 11, color: "var(--ink-soft)" }}>{fmtShort(iso)}</div>
                    </div>
                    <div style={{ marginBottom: 12 }}>
                      <div style={{ ...label("0.06em"), marginBottom: 6 }}>Situación / desencadenante</div>
                      <textarea style={{ ...area, fontSize: 14, minHeight: 36, padding: "6px 2px" }} placeholder="¿Qué disparó el episodio ansioso?"
                        value={day.situacion} onChange={(e) => updateDayField(iso, "situacion", e.target.value)} />
                    </div>
                    <div style={{ display: "flex", gap: 16, marginBottom: 12 }}>
                      <div style={{ width: 76, flexShrink: 0 }}>
                        <div style={{ ...label("0.06em"), marginBottom: 6 }}>Intensidad</div>
                        <input type="number" min="0" max="10" placeholder="0-10"
                          style={{ ...field, ...mono, fontSize: 14, textAlign: "center", padding: "6px 2px" }}
                          value={day.intensidad}
                          onChange={(e) => updateDayField(iso, "intensidad", e.target.value === "" ? "" : Math.max(0, Math.min(10, Number(e.target.value))))} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ ...label("0.06em"), marginBottom: 6 }}>Estrategia usada</div>
                        <input style={{ ...field, fontSize: 14, padding: "6px 2px" }} placeholder="¿Qué hiciste para calmarte?"
                          value={day.estrategia} onChange={(e) => updateDayField(iso, "estrategia", e.target.value)} />
                      </div>
                    </div>
                    <div>
                      <div style={{ ...label("0.06em"), marginBottom: 6 }}>¿Ayudó?</div>
                      <div style={{ display: "flex", gap: 6 }}>
                        {["Sí", "A veces", "No"].map((opt) => {
                          const on = day.ayudo === opt;
                          return (
                            <button key={opt} onClick={() => updateDayField(iso, "ayudo", on ? "" : opt)}
                              style={{ flex: 1, fontSize: 12, fontWeight: 500, border: `1px solid ${on ? "var(--moss)" : "var(--line)"}`, background: on ? "var(--moss-soft)" : "var(--card)", color: on ? "var(--moss)" : "var(--ink-soft)", borderRadius: 6, padding: "7px 4px", cursor: "pointer", textAlign: "center" }}>{opt}</button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 8, padding: "16px 18px 18px", marginTop: 20 }}>
              <div style={{ marginBottom: 18 }}>
                <div style={{ ...label("0.06em"), marginBottom: 6 }}>Obsesión de la semana</div>
                <input style={{ ...field, fontSize: 14, padding: "6px 2px" }} placeholder="¿Qué te ocupó la cabeza esta semana?"
                  value={currentWeek.obsesion || ""} onChange={(e) => patchWeek({ obsesion: e.target.value })} />
              </div>
              <div>
                <div style={{ ...label("0.06em") }}>Contacté a alguien que no veo a diario</div>
                {contactos.length > 0 && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
                    {contactos.map((nombre) => (
                      <span key={nombre} style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12.5, background: "var(--moss-soft)", color: "var(--moss)", borderRadius: 20, padding: "5px 9px 5px 12px" }}>
                        {nombre}
                        <button onClick={() => patchWeek({ contactos: contactos.filter((c) => c !== nombre) })}
                          style={{ background: "none", border: "none", cursor: "pointer", padding: 0, color: "var(--moss)", display: "flex", alignItems: "center" }}><Cross s={10} /></button>
                      </span>
                    ))}
                  </div>
                )}
                <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                  <input style={{ ...field, flex: 1, fontSize: 14, padding: "6px 2px" }} placeholder="Nombre — enter para agregar"
                    value={contactoInput} onChange={(e) => setContactoInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addContacto(); } }} />
                  <button onClick={addContacto} style={{ ...mono, fontSize: 12, color: "var(--accent)", background: "none", border: "none", cursor: "pointer", padding: "4px 0", whiteSpace: "nowrap" }}>+ agregar</button>
                </div>
              </div>
            </div>

            <div style={{ marginTop: 24 }}>
              <div style={{ ...label("0.06em") }}>Reflexión de la semana</div>
              <textarea style={{ ...area, minHeight: 64 }} placeholder="¿Qué patrones notás? ¿Qué querés cambiar?"
                value={currentWeek.reflexion || ""} onChange={(e) => patchWeek({ reflexion: e.target.value })} />
            </div>

            {MOSTRAR_REACCIONES && (
              <div style={{ display: "flex", alignItems: "flex-end", marginTop: 32, animation: "amigaIn 0.6s cubic-bezier(0.16,1,0.3,1) both" }}>
                <Amiga name={wPool.img} width={118} height={149} />
                <div style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: "16px 16px 16px 4px", padding: "14px 18px", marginLeft: -8, marginBottom: 22, boxShadow: "0 8px 24px oklch(22% 0.02 150 / 0.08)" }}>
                  <div style={{ ...mono, fontSize: 9.5, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--ink-soft)", marginBottom: 5 }}>Nota de la amiga</div>
                  <div style={{ ...serif, fontStyle: "italic", fontSize: 15.5, lineHeight: 1.5 }}>{weekNoteText}</div>
                </div>
              </div>
            )}

            <div style={{ textAlign: "center", fontSize: 11.5, color: "var(--ink-soft)", lineHeight: 1.6, padding: "40px 20px 0" }}>Usá este registro durante la semana para identificar detonantes. Calificá la intensidad de 0 a 10.</div>
          </div>
        )}

        {isLecturas && (
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "32px 0 22px" }}>
              <button style={roundBtn} onClick={() => setBookYear((y) => y - 1)}><Arrow dir="left" /></button>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
                <div style={{ ...serif, fontSize: 22, fontWeight: 500 }}>{bookYear}</div>
                <div style={{ ...mono, fontSize: 10.5, color: "var(--ink-soft)" }}>
                  {yearBooks.length ? (promedio ? `${yearBooks.length} libro${plural} · promedio ${promedio} de 5` : `${yearBooks.length} libro${plural} · sin calificar`) : "sin libros todavía"}
                </div>
              </div>
              <button style={roundBtn} onClick={() => setBookYear((y) => y + 1)}><Arrow dir="right" /></button>
            </div>

            <div style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 8, padding: "16px 18px 18px", marginBottom: 28 }}>
              <div style={{ ...label("0.06em"), marginBottom: 12 }}>Añadir libro</div>
              <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
                <input style={{ ...field, flex: 2, minWidth: 170, fontSize: 14, padding: "6px 2px" }} placeholder="Título"
                  value={newBook.titulo} onChange={(e) => setNewBook((b) => ({ ...b, titulo: e.target.value }))} />
                <input style={{ ...field, flex: 1, minWidth: 130, fontSize: 14, padding: "6px 2px" }} placeholder="Autor"
                  value={newBook.autor} onChange={(e) => setNewBook((b) => ({ ...b, autor: e.target.value }))} />
              </div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, marginTop: 18, flexWrap: "wrap" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ ...mono, fontSize: 10.5, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--ink-soft)" }}>Calificación</span>
                  <Stars value={newBook.rating} size={19} onSet={(n) => setNewBook((b) => ({ ...b, rating: n }))} />
                </div>
                <button onClick={addBook} style={{ background: "var(--ink)", color: "var(--paper)", border: "none", borderRadius: 8, padding: "10px 18px", fontFamily: "'Inter',sans-serif", fontSize: 13.5, fontWeight: 500, cursor: "pointer" }}>Añadir al año</button>
              </div>
            </div>

            {yearBooks.length === 0 && (
              <div style={{ textAlign: "center", padding: "12px 20px 40px" }}>
                <img src={IMG("averaver")} alt="" style={{ width: 170, height: "auto", display: "block", margin: "0 auto 8px" }} />
                <div style={{ ...serif, fontStyle: "italic", fontSize: 20, marginBottom: 8 }}>Todavía no hay libros en este año</div>
                <div style={{ color: "var(--ink-soft)", fontSize: 14, maxWidth: 340, margin: "0 auto", lineHeight: 1.6 }}>Anotá el último que terminaste. El que abandonaste a la mitad también es un dato.</div>
              </div>
            )}

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(148px, 1fr))", gap: "26px 18px" }}>
              {yearBooks.map((b) => (
                <div key={b.id} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <label style={{ position: "relative", display: "block", aspectRatio: "2 / 3", borderRadius: 3, overflow: "hidden", cursor: "pointer", background: "var(--paper-deep)", border: "1px solid var(--line)", boxShadow: "0 8px 20px oklch(22% 0.02 150 / 0.12)" }}>
                    {b.cover ? (
                      <span style={{ position: "absolute", inset: 0, display: "block", backgroundImage: `url(${b.cover})`, backgroundSize: "cover", backgroundPosition: "center" }} />
                    ) : (
                      <span style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, padding: 14, textAlign: "center", ...mono, fontSize: 9, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--ink-soft)" }}>
                        <svg width="20" height="20" viewBox="0 0 16 16" fill="none"><path d="M8 11V3m0 0L5 6m3-3l3 3M3 12v1h10v-1" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" /></svg>
                        Cargar portada
                      </span>
                    )}
                    <input type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => setBookCover(b.id, e.target)} />
                  </label>
                  <div style={{ ...serif, fontSize: 15, fontWeight: 500, lineHeight: 1.25 }}>{b.titulo}</div>
                  <div style={{ fontSize: 12, color: "var(--ink-soft)", lineHeight: 1.35 }}>{b.autor || "autor sin anotar"}</div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 2 }}>
                    <Stars value={Number(b.rating) || 0} size={14} onSet={(n) => persistBooks(books.map((x) => (x.id === b.id ? { ...x, rating: n } : x)))} />
                    <button className="adc-danger" onClick={() => persistBooks(books.filter((x) => x.id !== b.id))}
                      style={{ background: "none", border: "none", cursor: "pointer", padding: 0, color: "var(--ink-soft)", fontSize: 11 }}>quitar</button>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ textAlign: "center", fontSize: 11.5, color: "var(--ink-soft)", lineHeight: 1.6, padding: "44px 20px 0" }}>Control anual de lectura: título, autor, calificación y portada. Sin metas redondas.</div>
          </div>
        )}
      </main>

      {isDiario && (
        <button onClick={() => setDraft(emptyDraft())}
          style={{ position: "fixed", bottom: 28, right: 24, background: "var(--ink)", color: "var(--paper)", border: "none", borderRadius: 24, padding: "14px 20px", fontFamily: "'Inter',sans-serif", fontSize: 14, fontWeight: 500, display: "flex", alignItems: "center", gap: 8, cursor: "pointer", boxShadow: "0 8px 24px oklch(22% 0.02 150 / 0.25)", zIndex: 25 }}>
          <svg width="15" height="15" viewBox="0 0 16 16" fill="none"><path d="M8 2v12M2 8h12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>
          Nuevo registro
        </button>
      )}

      {reaction && (
        <div onClick={dismissReaction}
          style={{ position: "fixed", left: 24, bottom: 20, zIndex: 30, width: "min(384px, calc(100vw - 190px))", display: "flex", alignItems: "flex-end", cursor: "pointer", animation: "amigaIn 0.55s cubic-bezier(0.16,1,0.3,1) both" }}>
          <img src={IMG(reaction.name)} alt="" style={{ width: 138, height: "auto", flexShrink: 0, marginBottom: -6 }} />
          <div style={{ position: "relative", background: "var(--card)", border: "1px solid var(--line)", borderRadius: "16px 16px 16px 4px", padding: "14px 18px 15px", marginLeft: -10, marginBottom: 26, boxShadow: "0 12px 32px oklch(22% 0.02 150 / 0.16)", animation: "bubbleIn 0.45s 0.15s cubic-bezier(0.16,1,0.3,1) both" }}>
            <div style={{ ...serif, fontStyle: "italic", fontSize: 15.5, lineHeight: 1.5 }}>{reaction.text}</div>
            {reaction.hint && <div style={{ ...mono, fontSize: 10, letterSpacing: "0.06em", color: "var(--ink-soft)", marginTop: 8 }}>{reaction.hint}</div>}
          </div>
        </div>
      )}

      {draft && (
        <div onClick={() => { setDraft(null); setSugPasosOpen(false); }}
          style={{ position: "fixed", inset: 0, background: "oklch(22% 0.02 150 / 0.38)", zIndex: 40, display: "flex", justifyContent: "flex-end", animation: "backdropIn 0.25s ease" }}>
          <div onClick={(e) => e.stopPropagation()}
            style={{ background: "var(--paper)", width: "min(480px, 100%)", height: "100%", overflowY: "auto", boxShadow: "-16px 0 40px oklch(22% 0.02 150 / 0.15)", animation: "panelIn 0.35s cubic-bezier(0.16,1,0.3,1)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "24px 28px", borderBottom: "1px solid var(--line)", position: "sticky", top: 0, background: "var(--paper)", zIndex: 1 }}>
              <div style={{ ...serif, fontStyle: "italic", fontSize: 19 }}>{draft.id ? "Editar registro" : "Nuevo registro"}</div>
              <button onClick={() => { setDraft(null); setSugPasosOpen(false); }} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--ink-soft)", padding: 4 }}><Cross s={18} /></button>
            </div>

            <div style={{ padding: "24px 28px 32px" }}>
              <div style={{ marginBottom: 20 }}>
                <div style={label()}>Fecha</div>
                <input type="date" style={field} value={draft.fecha} onChange={(e) => updateDraftField("fecha", e.target.value)} />
              </div>
              <div style={{ marginBottom: 20 }}>
                <div style={label()}>Situación</div>
                <textarea style={{ ...area, minHeight: 64 }} placeholder="¿Qué pasó? ¿Dónde, cuándo, con quién?"
                  value={draft.situacion} onChange={(e) => updateDraftField("situacion", e.target.value)} />
              </div>

              <div style={{ marginBottom: 20 }}>
                <div style={{ ...label(), marginBottom: 10 }}>Emociones · elegí de la lista</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 16 }}>
                  {EMOCIONES.map((e) => {
                    const on = chosenEmos.includes(e.nombre);
                    return (
                      <button key={e.nombre} onClick={() => toggleEmotion(e.nombre)}
                        style={{ fontFamily: "'Inter',sans-serif", fontSize: 13, fontWeight: 500, border: `1px solid ${on ? e.color : "var(--line)"}`, background: on ? e.soft : "var(--card)", color: on ? e.color : "var(--ink-soft)", borderRadius: 20, padding: "7px 14px", cursor: "pointer" }}>{e.nombre}</button>
                    );
                  })}
                </div>

                {draft.emociones.map((emo) => (
                  <div key={emo.id} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                    <div style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ width: 9, height: 9, borderRadius: "50%", background: EMO_COLOR[emo.nombre] || "var(--ink-soft)", flexShrink: 0 }} />
                      <span style={{ fontSize: 14, fontWeight: 500 }}>{emo.nombre}</span>
                    </div>
                    {[["antes", "antes"], ["después", "despues"]].map(([txt, f]) => (
                      <div key={f} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
                        <span style={{ fontSize: 9.5, ...mono, color: "var(--ink-soft)" }}>{txt}</span>
                        <input type="number" min="0" max="100" value={emo[f]}
                          onChange={(ev) => updateEmotion(emo.id, f, Math.max(0, Math.min(100, Number(ev.target.value))))}
                          style={{ width: 52, ...mono, fontSize: 13, textAlign: "center", border: "1px solid var(--line)", background: "var(--card)", borderRadius: 6, padding: "6px 2px", color: "var(--ink)" }} />
                      </div>
                    ))}
                    <button onClick={() => removeEmotion(emo.id)} style={{ background: "none", border: "none", color: "var(--ink-soft)", cursor: "pointer", padding: 4 }}><Cross s={14} /></button>
                  </div>
                ))}
                <div style={{ ...mono, fontSize: 11, color: "var(--ink-soft)", lineHeight: 1.5 }}>Tocá una emoción para sumarla o quitarla. Después ajustá la intensidad antes y después de escribir.</div>

                {sug && (
                  <div style={{ marginTop: 16, display: "flex", gap: 10, background: "var(--card)", border: "1px solid var(--line)", borderRadius: 12, padding: "14px 16px 0 10px", overflow: "hidden", animation: "bubbleIn 0.4s ease both" }}>
                    <div style={{ ...(sug.sprite === "gestos" ? spriteStyle("gestos", sug.i, 96, 121) : spriteStyle("tonos", sug.i, 100, 85)), alignSelf: "flex-end" }} />
                    <div style={{ flex: 1, minWidth: 0, paddingBottom: 14 }}>
                      <div style={{ ...mono, fontSize: 9.5, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--ink-soft)", marginBottom: 6 }}>{sug.etiqueta}</div>
                      <div style={{ ...serif, fontStyle: "italic", fontSize: 15, lineHeight: 1.48 }}>{sug.texto}</div>
                      {sug.pasos && (
                        <button onClick={() => setSugPasosOpen((o) => !o)}
                          style={{ ...mono, fontSize: 11, color: "var(--accent)", background: "none", border: "none", cursor: "pointer", padding: "8px 0 0", textDecoration: "underline" }}>
                          {sugPasosOpen ? "ocultar los pasos" : "ver los cinco pasos"}
                        </button>
                      )}
                      {sug.pasos && sugPasosOpen && (
                        <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 10 }}>
                          {sug.pasos.map((texto, i) => (
                            <div key={i} style={{ display: "flex", gap: 8, fontSize: 13, lineHeight: 1.45, color: "var(--ink-soft)" }}>
                              <span style={{ ...mono, fontSize: 11, color: "var(--accent)", paddingTop: 1 }}>0{i + 1}</span>
                              <span>{texto}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {[["Pensamiento automático", "pensamiento", "¿Qué pasó por tu mente en ese momento?"],
                ["Evidencia a favor", "evidenciaFavor", "¿Qué hechos apoyan ese pensamiento?"],
                ["Evidencia en contra", "evidenciaContra", "¿Qué hechos lo contradicen?"],
                ["Pensamiento alternativo", "alterno", "Con la evidencia en mano, ¿qué pensamiento es más equilibrado?"]].map(([t, f, ph], i, arr) => (
                <div key={f} style={{ marginBottom: i === arr.length - 1 ? 8 : 20 }}>
                  <div style={label()}>{t}</div>
                  <textarea style={{ ...area, minHeight: 56 }} placeholder={ph} value={draft[f]} onChange={(e) => updateDraftField(f, e.target.value)} />
                </div>
              ))}
            </div>

            <div style={{ padding: "16px 28px 28px", display: "flex", gap: 10, position: "sticky", bottom: 0, background: "var(--paper)", borderTop: "1px solid var(--line)" }}>
              <button onClick={() => { setDraft(null); setSugPasosOpen(false); }}
                style={{ flex: 1, background: "none", border: "1px solid var(--line)", borderRadius: 8, padding: 12, fontSize: 14, fontWeight: 500, color: "var(--ink)", cursor: "pointer" }}>Cancelar</button>
              <button onClick={saveDraft}
                style={{ flex: 2, background: "var(--ink)", color: "var(--paper)", border: "none", borderRadius: 8, padding: 12, fontSize: 14, fontWeight: 500, cursor: "pointer", opacity: draft.situacion.trim() ? 1 : 0.5 }}>Guardar registro</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
