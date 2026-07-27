import React, { useState, useEffect, useCallback, useRef } from "react";
import { Plus, X, Trash2, ChevronDown, ChevronLeft, ChevronRight, Copy, Check, Loader2 } from "lucide-react";

const STORAGE_KEY = "thought-records";
const WEEKLY_KEY = "weekly-logs";
const DAY_NAMES = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
const MONTH_ABBR = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

let idCounter = 0;
const makeId = () => `${Date.now()}-${(idCounter++).toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

const emptyEmotion = () => ({ id: makeId(), nombre: "", antes: 50, despues: 50 });

const emptyDraft = () => ({
  id: null,
  fecha: new Date().toISOString().slice(0, 10),
  situacion: "",
  emociones: [emptyEmotion()],
  pensamiento: "",
  evidenciaFavor: "",
  evidenciaContra: "",
  alterno: "",
});

function fmtFecha(iso) {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

function toISO(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function getMonday(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d;
}

function addDaysISO(iso, n) {
  const d = new Date(iso + "T00:00:00");
  d.setDate(d.getDate() + n);
  return toISO(d);
}

function fmtShort(iso) {
  const d = new Date(iso + "T00:00:00");
  return `${d.getDate()} ${MONTH_ABBR[d.getMonth()]}`;
}

function emptyDay() {
  return { situacion: "", intensidad: "", estrategia: "", ayudo: "" };
}

export default function App() {
  const [view, setView] = useState("diario");

  // --- registro diario ---
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [openId, setOpenId] = useState(null);
  const [draft, setDraft] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [copiedId, setCopiedId] = useState(null);
  const [saving, setSaving] = useState(false);

  // --- registro semanal ---
  const [weeklyLogs, setWeeklyLogs] = useState({});
  const [weeklyLoading, setWeeklyLoading] = useState(true);
  const [weekStart, setWeekStart] = useState(() => toISO(getMonday(new Date())));
  const [weekCopied, setWeekCopied] = useState(false);
  const weeklyRef = useRef(weeklyLogs);
  useEffect(() => { weeklyRef.current = weeklyLogs; }, [weeklyLogs]);

  useEffect(() => {
    (async () => {
      try {
        const res = await window.storage.get(STORAGE_KEY, false);
        if (res && res.value) setEntries(JSON.parse(res.value));
      } catch (e) {
        // key doesn't exist yet on first use — not a real error
      } finally {
        setLoading(false);
      }
      try {
        const resW = await window.storage.get(WEEKLY_KEY, false);
        if (resW && resW.value) setWeeklyLogs(JSON.parse(resW.value));
      } catch (e) {
        // key doesn't exist yet on first use — not a real error
      } finally {
        setWeeklyLoading(false);
      }
    })();
  }, []);

  const persist = useCallback(async (next) => {
    setEntries(next);
    setSaving(true);
    try {
      const ok = await window.storage.set(STORAGE_KEY, JSON.stringify(next), false);
      if (!ok) setLoadError(true);
    } catch (e) {
      setLoadError(true);
    } finally {
      setSaving(false);
    }
  }, []);

  const saveWeekly = useCallback(async () => {
    try {
      await window.storage.set(WEEKLY_KEY, JSON.stringify(weeklyRef.current), false);
    } catch (e) {
      // best-effort autosave
    }
  }, []);

  const startNew = () => {
    setDraft(emptyDraft());
    setOpenId(null);
  };

  const startEdit = (entry) => {
    setDraft(JSON.parse(JSON.stringify(entry)));
  };

  const closeDraft = () => setDraft(null);

  const saveDraft = () => {
    if (!draft.situacion.trim()) return;
    const clean = {
      ...draft,
      emociones: draft.emociones.filter((e) => e.nombre.trim()),
    };
    let next;
    if (draft.id) {
      next = entries.map((e) => (e.id === draft.id ? clean : e));
    } else {
      clean.id = makeId();
      clean.createdAt = new Date().toISOString();
      next = [clean, ...entries];
    }
    next.sort((a, b) => (a.fecha < b.fecha ? 1 : -1));
    persist(next);
    setDraft(null);
  };

  const deleteEntry = (id) => {
    persist(entries.filter((e) => e.id !== id));
    setConfirmDelete(null);
    if (openId === id) setOpenId(null);
  };

  const updateDraftField = (field, value) => setDraft((d) => ({ ...d, [field]: value }));

  const updateEmotion = (id, field, value) =>
    setDraft((d) => ({
      ...d,
      emociones: d.emociones.map((e) => (e.id === id ? { ...e, [field]: value } : e)),
    }));

  const addEmotion = () => setDraft((d) => ({ ...d, emociones: [...d.emociones, emptyEmotion()] }));
  const removeEmotion = (id) =>
    setDraft((d) => ({ ...d, emociones: d.emociones.filter((e) => e.id !== id) }));

  const copyForSession = async (entry) => {
    const lines = [
      `Registro del ${fmtFecha(entry.fecha)}`,
      "",
      `Situación: ${entry.situacion}`,
      "",
      "Emociones:",
      ...entry.emociones.map((e) => `  - ${e.nombre}: ${e.antes}% → ${e.despues}%`),
      "",
      `Pensamiento automático: ${entry.pensamiento || "—"}`,
      "",
      `Evidencia a favor: ${entry.evidenciaFavor || "—"}`,
      "",
      `Evidencia en contra: ${entry.evidenciaContra || "—"}`,
      "",
      `Pensamiento alternativo: ${entry.alterno || "—"}`,
    ];
    try {
      await navigator.clipboard.writeText(lines.join("\n"));
      setCopiedId(entry.id);
      setTimeout(() => setCopiedId(null), 1800);
    } catch (e) {
      /* clipboard unavailable — silently ignore */
    }
  };

  // --- helpers semana ---
  const weekDates = Array.from({ length: 7 }, (_, i) => addDaysISO(weekStart, i));
  const currentWeek = weeklyLogs[weekStart] || { reflexion: "", days: {} };
  const isCurrentWeek = weekStart === toISO(getMonday(new Date()));

  const updateDayField = (dateISO, field, value) => {
    setWeeklyLogs((prev) => {
      const week = prev[weekStart] || { reflexion: "", days: {} };
      const day = week.days[dateISO] || emptyDay();
      const newWeek = { ...week, days: { ...week.days, [dateISO]: { ...day, [field]: value } } };
      return { ...prev, [weekStart]: newWeek };
    });
  };

  const updateReflexion = (value) => {
    setWeeklyLogs((prev) => {
      const week = prev[weekStart] || { reflexion: "", days: {} };
      return { ...prev, [weekStart]: { ...week, reflexion: value } };
    });
  };

  const goWeek = (n) => setWeekStart((ws) => addDaysISO(ws, n * 7));
  const goToday = () => setWeekStart(toISO(getMonday(new Date())));

  const copyWeek = async () => {
    const lines = [
      `Episodios de ansiedad — semana del ${fmtShort(weekDates[0])} al ${fmtShort(weekDates[6])}`,
      "",
      ...weekDates.flatMap((iso, i) => {
        const day = currentWeek.days[iso];
        if (!day || (!day.situacion && !day.estrategia && day.intensidad === "" && !day.ayudo)) return [];
        return [
          `${DAY_NAMES[i]} (${fmtShort(iso)})`,
          `  Situación: ${day.situacion || "—"}`,
          `  Intensidad: ${day.intensidad !== "" ? `${day.intensidad}/10` : "—"}`,
          `  Estrategia usada: ${day.estrategia || "—"}`,
          `  ¿Ayudó?: ${day.ayudo || "—"}`,
          "",
        ];
      }),
      `Reflexión de la semana: ${currentWeek.reflexion || "—"}`,
    ];
    try {
      await navigator.clipboard.writeText(lines.join("\n"));
      setWeekCopied(true);
      setTimeout(() => setWeekCopied(false), 1800);
    } catch (e) {
      /* clipboard unavailable */
    }
  };

  return (
    <div className="wrap">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600&family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap');

        :root {
          --lino: #EDEAE2;
          --lino-alt: #E4E0D5;
          --tinta: #24322E;
          --tinta-suave: #5B6560;
          --musgo: #5C7A63;
          --musgo-suave: #E4EBE4;
          --ciruela: #8B5A6B;
          --ciruela-suave: #F1E4E7;
          --arena: #D3CCBC;
          --sello: #3D5A50;
          --blanco: #FBFAF7;
        }
        * { box-sizing: border-box; }
        .wrap {
          font-family: 'IBM Plex Sans', sans-serif;
          background: var(--lino);
          color: var(--tinta);
          min-height: 100vh;
          max-width: 560px;
          margin: 0 auto;
          padding-bottom: 96px;
          position: relative;
        }
        .header {
          position: sticky;
          top: 0;
          z-index: 10;
          background: var(--lino);
          padding: 22px 20px 0;
          border-bottom: 1px solid var(--arena);
        }
        .eyebrow {
          font-family: 'IBM Plex Mono', monospace;
          font-size: 11px;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: var(--tinta-suave);
        }
        .title {
          font-family: 'Fraunces', serif;
          font-size: 26px;
          font-weight: 500;
          margin: 2px 0 0;
        }
        .subtitle {
          font-family: 'IBM Plex Sans', sans-serif;
          font-size: 13px;
          color: var(--tinta-suave);
          margin: 2px 0 14px;
        }
        .tabs { display: flex; gap: 22px; }
        .tab {
          background: none; border: none; cursor: pointer;
          font-family: 'IBM Plex Sans', sans-serif;
          font-size: 14px; font-weight: 500;
          color: var(--tinta-suave);
          padding: 0 0 10px;
          border-bottom: 2px solid transparent;
        }
        .tab.active { color: var(--tinta); border-bottom-color: var(--sello); }
        .empty {
          text-align: center;
          padding: 60px 24px;
          color: var(--tinta-suave);
        }
        .empty-title {
          font-family: 'Fraunces', serif;
          font-size: 19px;
          color: var(--tinta);
          margin-bottom: 6px;
        }
        .list { padding: 16px 16px 8px; display: flex; flex-direction: column; gap: 12px; }
        .card {
          background: var(--blanco);
          border: 1px solid var(--arena);
          border-radius: 10px;
          overflow: hidden;
        }
        .card-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 14px 16px;
          cursor: pointer;
          gap: 12px;
        }
        .card-head-text { min-width: 0; flex: 1; }
        .card-date {
          font-family: 'IBM Plex Mono', monospace;
          font-size: 11px;
          color: var(--tinta-suave);
        }
        .card-situ {
          font-family: 'Fraunces', serif;
          font-size: 16px;
          margin-top: 2px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .chevron { transition: transform 0.2s ease; flex-shrink: 0; color: var(--tinta-suave); }
        .chevron.open { transform: rotate(180deg); }
        .card-body { padding: 0 16px 18px; border-top: 1px solid var(--arena); }
        .section { margin-top: 16px; }
        .label {
          font-family: 'IBM Plex Mono', monospace;
          font-size: 10.5px;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: var(--tinta-suave);
          margin-bottom: 6px;
        }
        .text { font-size: 14.5px; line-height: 1.5; white-space: pre-wrap; }
        .emo-row { margin-bottom: 14px; }
        .emo-name { font-size: 14px; font-weight: 500; margin-bottom: 6px; }
        .emo-track {
          position: relative;
          height: 6px;
          background: var(--lino-alt);
          border-radius: 3px;
          margin: 14px 2px 4px;
        }
        .emo-fill {
          position: absolute;
          top: 0; left: 0; height: 6px;
          border-radius: 3px;
          background: var(--arena);
        }
        .emo-dot {
          position: absolute;
          top: -5px;
          width: 16px; height: 16px;
          border-radius: 50%;
          border: 2px solid var(--blanco);
          transform: translateX(-50%);
        }
        .emo-dot.antes { background: var(--ciruela); z-index: 1; }
        .emo-dot.despues { background: var(--musgo); z-index: 2; }
        .emo-labels {
          display: flex;
          justify-content: space-between;
          font-family: 'IBM Plex Mono', monospace;
          font-size: 11px;
          color: var(--tinta-suave);
        }
        .emo-delta { font-weight: 500; }
        .emo-delta.down { color: var(--musgo); }
        .emo-delta.up { color: var(--ciruela); }
        .card-actions {
          display: flex; gap: 8px; margin-top: 18px;
        }
        .btn {
          font-family: 'IBM Plex Sans', sans-serif;
          font-size: 13px;
          font-weight: 500;
          border: 1px solid var(--arena);
          background: var(--blanco);
          color: var(--tinta);
          border-radius: 7px;
          padding: 9px 12px;
          display: flex; align-items: center; gap: 6px;
          cursor: pointer;
        }
        .btn:active { transform: scale(0.97); }
        .btn.danger { color: var(--ciruela); }
        .confirm-row {
          display: flex; align-items: center; gap: 10px; margin-top: 18px;
          font-size: 13.5px;
        }
        .confirm-row .btn.danger { background: var(--ciruela-suave); border-color: var(--ciruela); }

        .fab {
          position: fixed;
          bottom: 24px;
          right: 20px;
          width: 56px; height: 56px;
          border-radius: 50%;
          background: var(--sello);
          color: var(--blanco);
          border: none;
          display: flex; align-items: center; justify-content: center;
          box-shadow: 0 6px 18px rgba(36,50,46,0.28);
          cursor: pointer;
          z-index: 20;
        }
        .fab:active { transform: scale(0.94); }

        .sheet-backdrop {
          position: fixed; inset: 0;
          background: rgba(36,50,46,0.35);
          z-index: 30;
          display: flex;
          align-items: flex-end;
        }
        .sheet {
          background: var(--lino);
          width: 100%;
          max-width: 560px;
          margin: 0 auto;
          max-height: 92vh;
          border-radius: 18px 18px 0 0;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }
        .sheet-head {
          display: flex; align-items: center; justify-content: space-between;
          padding: 16px 18px;
          border-bottom: 1px solid var(--arena);
          flex-shrink: 0;
        }
        .sheet-title { font-family: 'Fraunces', serif; font-size: 18px; }
        .sheet-body { overflow-y: auto; padding: 16px 18px 24px; }
        .field { margin-bottom: 18px; }
        .input, .textarea, .date-input {
          width: 100%;
          font-family: 'IBM Plex Sans', sans-serif;
          font-size: 14.5px;
          border: 1px solid var(--arena);
          background: var(--blanco);
          border-radius: 8px;
          padding: 10px 12px;
          color: var(--tinta);
        }
        .textarea { resize: vertical; min-height: 64px; line-height: 1.5; }
        .input:focus, .textarea:focus, .date-input:focus {
          outline: 2px solid var(--sello);
          outline-offset: 1px;
        }
        .emo-edit-row {
          display: flex; align-items: center; gap: 8px; margin-bottom: 10px;
        }
        .emo-edit-row .input { flex: 1; }
        .num-input {
          width: 56px;
          font-family: 'IBM Plex Mono', monospace;
          font-size: 13px;
          text-align: center;
          border: 1px solid var(--arena);
          background: var(--blanco);
          border-radius: 7px;
          padding: 8px 4px;
        }
        .num-wrap { display: flex; flex-direction: column; align-items: center; gap: 2px; }
        .num-tag { font-size: 9.5px; font-family: 'IBM Plex Mono', monospace; color: var(--tinta-suave); }
        .icon-btn {
          border: none; background: transparent; color: var(--tinta-suave);
          cursor: pointer; padding: 6px; display: flex;
        }
        .add-emo {
          font-family: 'IBM Plex Mono', monospace;
          font-size: 12.5px;
          color: var(--sello);
          background: none; border: none;
          cursor: pointer;
          padding: 4px 0;
        }
        .sheet-foot {
          padding: 14px 18px;
          border-top: 1px solid var(--arena);
          display: flex; gap: 10px;
          flex-shrink: 0;
          background: var(--lino);
        }
        .btn.primary {
          flex: 1;
          background: var(--sello);
          color: var(--blanco);
          border: none;
          justify-content: center;
          padding: 12px;
          font-size: 14px;
        }
        .loading-wrap {
          display: flex; align-items: center; justify-content: center;
          min-height: 60vh; color: var(--tinta-suave); gap: 8px; font-size: 13.5px;
        }
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .foot-note {
          text-align: center;
          font-size: 11.5px;
          color: var(--tinta-suave);
          padding: 18px 30px 8px;
          line-height: 1.5;
        }
        .toast {
          font-family: 'IBM Plex Mono', monospace;
          font-size: 12px;
          color: var(--musgo);
          display: flex; align-items: center; gap: 4px;
        }

        .week-nav {
          display: flex; align-items: center; justify-content: space-between;
          padding: 16px 16px 4px;
        }
        .week-nav-mid { display: flex; flex-direction: column; align-items: center; gap: 2px; }
        .week-range {
          font-family: 'Fraunces', serif;
          font-size: 15px;
        }
        .week-today {
          font-family: 'IBM Plex Mono', monospace;
          font-size: 10.5px;
          color: var(--sello);
          background: none; border: none; cursor: pointer;
          text-decoration: underline;
        }
        .week-nav-btn {
          border: 1px solid var(--arena);
          background: var(--blanco);
          border-radius: 50%;
          width: 34px; height: 34px;
          display: flex; align-items: center; justify-content: center;
          color: var(--tinta);
          cursor: pointer;
        }
        .week-nav-btn:active { transform: scale(0.95); }
        .week-copy-row { padding: 4px 16px 4px; display: flex; justify-content: flex-end; }
        .week-list { padding: 8px 16px 8px; display: flex; flex-direction: column; gap: 10px; }
        .day-card {
          background: var(--blanco);
          border: 1px solid var(--arena);
          border-radius: 10px;
          padding: 14px 16px 16px;
        }
        .day-card-head {
          display: flex; align-items: baseline; justify-content: space-between;
          margin-bottom: 10px;
        }
        .day-name { font-family: 'Fraunces', serif; font-size: 15.5px; }
        .day-date { font-family: 'IBM Plex Mono', monospace; font-size: 11px; color: var(--tinta-suave); }
        .day-field { margin-bottom: 10px; }
        .day-field:last-child { margin-bottom: 0; }
        .day-row { display: flex; gap: 10px; align-items: flex-start; }
        .day-row .day-field { flex: 1; }
        .ayudo-group { display: flex; gap: 6px; margin-top: 6px; }
        .ayudo-pill {
          flex: 1;
          font-family: 'IBM Plex Sans', sans-serif;
          font-size: 12px;
          font-weight: 500;
          border: 1px solid var(--arena);
          background: var(--blanco);
          color: var(--tinta-suave);
          border-radius: 7px;
          padding: 7px 4px;
          cursor: pointer;
          text-align: center;
        }
        .ayudo-pill.active { background: var(--musgo-suave); border-color: var(--musgo); color: var(--musgo); }
        .reflexion-box { padding: 8px 16px 4px; }
      `}</style>

      <div className="header">
        <div className="eyebrow">{loading ? "cargando…" : saving ? "guardando…" : entries.length ? `${entries.length} registro${entries.length === 1 ? "" : "s"}` : "cuaderno personal"}</div>
        <div className="title">Amiga date cuenta</div>
        <div className="subtitle">{view === "diario" ? "Registro de pensamientos" : "Episodios de ansiedad"}</div>
        <div className="tabs">
          <button className={`tab ${view === "diario" ? "active" : ""}`} onClick={() => setView("diario")}>Pensamientos</button>
          <button className={`tab ${view === "semana" ? "active" : ""}`} onClick={() => setView("semana")}>Episodios ansiosos</button>
        </div>
      </div>

      {view === "diario" && (
        <>
          {loading ? (
            <div className="loading-wrap"><Loader2 size={16} className="spin" /> Cargando tus registros…</div>
          ) : entries.length === 0 ? (
            <div className="empty">
              <div className="empty-title">Aún no hay registros</div>
              <div>Toca el botón + para dejar tu primera situación, pensamiento y evidencia.</div>
            </div>
          ) : (
            <div className="list">
              {entries.map((entry) => {
                const open = openId === entry.id;
                return (
                  <div className="card" key={entry.id}>
                    <div className="card-head" onClick={() => setOpenId(open ? null : entry.id)}>
                      <div className="card-head-text">
                        <div className="card-date">{fmtFecha(entry.fecha)}</div>
                        <div className="card-situ">{entry.situacion}</div>
                      </div>
                      <ChevronDown size={18} className={`chevron ${open ? "open" : ""}`} />
                    </div>
                    {open && (
                      <div className="card-body">
                        {entry.emociones?.length > 0 && (
                          <div className="section">
                            <div className="label">Emociones</div>
                            {entry.emociones.map((e) => {
                              const delta = e.despues - e.antes;
                              return (
                                <div className="emo-row" key={e.id}>
                                  <div className="emo-name">{e.nombre}</div>
                                  <div className="emo-track">
                                    <div
                                      className="emo-fill"
                                      style={{
                                        left: `${Math.min(e.antes, e.despues)}%`,
                                        width: `${Math.abs(e.despues - e.antes)}%`,
                                      }}
                                    />
                                    <div className="emo-dot antes" style={{ left: `${e.antes}%` }} />
                                    <div className="emo-dot despues" style={{ left: `${e.despues}%` }} />
                                  </div>
                                  <div className="emo-labels">
                                    <span>{e.antes}% antes</span>
                                    <span className={`emo-delta ${delta < 0 ? "down" : delta > 0 ? "up" : ""}`}>
                                      {delta === 0 ? "sin cambio" : `${delta > 0 ? "+" : ""}${delta}%`}
                                    </span>
                                    <span>{e.despues}% después</span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                        {entry.pensamiento && (
                          <div className="section">
                            <div className="label">Pensamiento automático</div>
                            <div className="text">{entry.pensamiento}</div>
                          </div>
                        )}
                        {entry.evidenciaFavor && (
                          <div className="section">
                            <div className="label">Evidencia a favor</div>
                            <div className="text">{entry.evidenciaFavor}</div>
                          </div>
                        )}
                        {entry.evidenciaContra && (
                          <div className="section">
                            <div className="label">Evidencia en contra</div>
                            <div className="text">{entry.evidenciaContra}</div>
                          </div>
                        )}
                        {entry.alterno && (
                          <div className="section">
                            <div className="label">Pensamiento alternativo</div>
                            <div className="text">{entry.alterno}</div>
                          </div>
                        )}

                        {confirmDelete === entry.id ? (
                          <div className="confirm-row">
                            <span>¿Eliminar este registro?</span>
                            <button className="btn danger" onClick={() => deleteEntry(entry.id)}>Sí, eliminar</button>
                            <button className="btn" onClick={() => setConfirmDelete(null)}>Cancelar</button>
                          </div>
                        ) : (
                          <div className="card-actions">
                            <button className="btn" onClick={() => startEdit(entry)}>Editar</button>
                            <button className="btn" onClick={() => copyForSession(entry)}>
                              {copiedId === entry.id ? (
                                <span className="toast"><Check size={13} /> Copiado</span>
                              ) : (
                                <><Copy size={13} /> Copiar para terapia</>
                              )}
                            </button>
                            <button className="btn danger" onClick={() => setConfirmDelete(entry.id)}><Trash2 size={13} /></button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {!loading && (
            <div className="foot-note">
              Este cuaderno es un apoyo de autoobservación para llevar a tu proceso terapéutico — no lo reemplaza.
            </div>
          )}

          {!draft && (
            <button className="fab" onClick={startNew} aria-label="Nuevo registro">
              <Plus size={24} />
            </button>
          )}

          {draft && (
            <div className="sheet-backdrop" onClick={closeDraft}>
              <div className="sheet" onClick={(e) => e.stopPropagation()}>
                <div className="sheet-head">
                  <div className="sheet-title">{draft.id ? "Editar registro" : "Nuevo registro"}</div>
                  <button className="icon-btn" onClick={closeDraft}><X size={20} /></button>
                </div>
                <div className="sheet-body">
                  <div className="field">
                    <div className="label">Fecha</div>
                    <input
                      type="date"
                      className="date-input"
                      value={draft.fecha}
                      onChange={(e) => updateDraftField("fecha", e.target.value)}
                    />
                  </div>

                  <div className="field">
                    <div className="label">Situación</div>
                    <textarea
                      className="textarea"
                      placeholder="¿Qué pasó? ¿Dónde, cuándo, con quién?"
                      value={draft.situacion}
                      onChange={(e) => updateDraftField("situacion", e.target.value)}
                    />
                  </div>

                  <div className="field">
                    <div className="label">Emociones (antes → después)</div>
                    {draft.emociones.map((e) => (
                      <div className="emo-edit-row" key={e.id}>
                        <input
                          className="input"
                          placeholder="Nombre de la emoción"
                          value={e.nombre}
                          onChange={(ev) => updateEmotion(e.id, "nombre", ev.target.value)}
                        />
                        <div className="num-wrap">
                          <span className="num-tag">antes</span>
                          <input
                            type="number" min="0" max="100"
                            className="num-input"
                            value={e.antes}
                            onChange={(ev) => updateEmotion(e.id, "antes", Math.max(0, Math.min(100, Number(ev.target.value))))}
                          />
                        </div>
                        <div className="num-wrap">
                          <span className="num-tag">después</span>
                          <input
                            type="number" min="0" max="100"
                            className="num-input"
                            value={e.despues}
                            onChange={(ev) => updateEmotion(e.id, "despues", Math.max(0, Math.min(100, Number(ev.target.value))))}
                          />
                        </div>
                        <button className="icon-btn" onClick={() => removeEmotion(e.id)}><X size={16} /></button>
                      </div>
                    ))}
                    <button className="add-emo" onClick={addEmotion}>+ añadir otra emoción</button>
                  </div>

                  <div className="field">
                    <div className="label">Pensamiento automático</div>
                    <textarea
                      className="textarea"
                      placeholder="¿Qué pasó por tu mente en ese momento?"
                      value={draft.pensamiento}
                      onChange={(e) => updateDraftField("pensamiento", e.target.value)}
                    />
                  </div>

                  <div className="field">
                    <div className="label">Evidencia a favor</div>
                    <textarea
                      className="textarea"
                      placeholder="¿Qué hechos apoyan ese pensamiento?"
                      value={draft.evidenciaFavor}
                      onChange={(e) => updateDraftField("evidenciaFavor", e.target.value)}
                    />
                  </div>

                  <div className="field">
                    <div className="label">Evidencia en contra</div>
                    <textarea
                      className="textarea"
                      placeholder="¿Qué hechos lo contradicen?"
                      value={draft.evidenciaContra}
                      onChange={(e) => updateDraftField("evidenciaContra", e.target.value)}
                    />
                  </div>

                  <div className="field">
                    <div className="label">Pensamiento alternativo</div>
                    <textarea
                      className="textarea"
                      placeholder="Con la evidencia en mano, ¿qué pensamiento es más equilibrado?"
                      value={draft.alterno}
                      onChange={(e) => updateDraftField("alterno", e.target.value)}
                    />
                  </div>
                </div>
                <div className="sheet-foot">
                  <button className="btn" onClick={closeDraft}>Cancelar</button>
                  <button className="btn primary" onClick={saveDraft} disabled={!draft.situacion.trim()}>
                    Guardar registro
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {view === "semana" && (
        <>
          {weeklyLoading ? (
            <div className="loading-wrap"><Loader2 size={16} className="spin" /> Cargando tu semana…</div>
          ) : (
            <>
              <div className="week-nav">
                <button className="week-nav-btn" onClick={() => goWeek(-1)} aria-label="Semana anterior"><ChevronLeft size={16} /></button>
                <div className="week-nav-mid">
                  <div className="week-range">{fmtShort(weekDates[0])} – {fmtShort(weekDates[6])}</div>
                  {!isCurrentWeek && <button className="week-today" onClick={goToday}>ir a hoy</button>}
                </div>
                <button className="week-nav-btn" onClick={() => goWeek(1)} aria-label="Semana siguiente"><ChevronRight size={16} /></button>
              </div>

              <div className="week-copy-row">
                <button className="btn" onClick={copyWeek}>
                  {weekCopied ? (
                    <span className="toast"><Check size={13} /> Copiado</span>
                  ) : (
                    <><Copy size={13} /> Copiar semana</>
                  )}
                </button>
              </div>

              <div className="week-list">
                {weekDates.map((iso, i) => {
                  const day = currentWeek.days[iso] || emptyDay();
                  const isToday = iso === toISO(new Date());
                  return (
                    <div className="day-card" key={iso} style={isToday ? { borderColor: "var(--sello)" } : undefined}>
                      <div className="day-card-head">
                        <div className="day-name">{DAY_NAMES[i]}</div>
                        <div className="day-date">{fmtShort(iso)}</div>
                      </div>

                      <div className="day-field">
                        <div className="label">Situación / desencadenante</div>
                        <textarea
                          className="textarea"
                          style={{ minHeight: 40 }}
                          placeholder="¿Qué disparó el episodio ansioso?"
                          value={day.situacion}
                          onChange={(e) => updateDayField(iso, "situacion", e.target.value)}
                          onBlur={saveWeekly}
                        />
                      </div>

                      <div className="day-row">
                        <div className="day-field" style={{ maxWidth: 96 }}>
                          <div className="label">Intensidad ansiedad</div>
                          <input
                            type="number" min="0" max="10"
                            className="num-input"
                            style={{ width: "100%" }}
                            placeholder="0-10"
                            value={day.intensidad}
                            onChange={(e) => {
                              const v = e.target.value === "" ? "" : Math.max(0, Math.min(10, Number(e.target.value)));
                              updateDayField(iso, "intensidad", v);
                            }}
                            onBlur={saveWeekly}
                          />
                        </div>
                        <div className="day-field">
                          <div className="label">Estrategia usada</div>
                          <input
                            className="input"
                            placeholder="¿Qué hiciste para calmarte?"
                            value={day.estrategia}
                            onChange={(e) => updateDayField(iso, "estrategia", e.target.value)}
                            onBlur={saveWeekly}
                          />
                        </div>
                      </div>

                      <div className="day-field">
                        <div className="label">¿Ayudó?</div>
                        <div className="ayudo-group">
                          {["Sí", "A veces", "No"].map((opt) => (
                            <button
                              key={opt}
                              className={`ayudo-pill ${day.ayudo === opt ? "active" : ""}`}
                              onClick={() => {
                                updateDayField(iso, "ayudo", day.ayudo === opt ? "" : opt);
                                setTimeout(saveWeekly, 0);
                              }}
                            >
                              {opt}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="reflexion-box">
                <div className="label">Reflexión de la semana — ¿qué patrones notás en tus episodios? ¿qué querés cambiar?</div>
                <textarea
                  className="textarea"
                  placeholder="Escribí lo que notes al mirar la semana completa…"
                  value={currentWeek.reflexion}
                  onChange={(e) => updateReflexion(e.target.value)}
                  onBlur={saveWeekly}
                />
              </div>

              <div className="foot-note">
                Usá este registro durante la semana para identificar los detonantes de tus episodios de ansiedad. Calificá la intensidad de 0 (ninguna) a 10 (máxima).
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
