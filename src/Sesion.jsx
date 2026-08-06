import React, { useState, useEffect } from "react";
import { supabase } from "./storage.js";

// Puerta de entrada cuando hay Supabase configurado. Sin sesión no se monta App,
// así que ni siquiera se pide el diario a la base.
// Solo se usa si hay credenciales: en modo localStorage main.jsx renderiza App directo.
export default function Sesion({ children }) {
  const [session, setSession] = useState(undefined); // undefined = todavía leyendo
  const [email, setEmail] = useState("");
  const [enviado, setEnviado] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((_evento, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);

  async function enviarLink(e) {
    e.preventDefault();
    if (!email.trim()) return;
    setEnviando(true);
    setError("");
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: window.location.origin },
    });
    setEnviando(false);
    if (error) setError(error.message);
    else setEnviado(true);
  }

  if (session === undefined) return null;
  if (session) return children;

  const campo = {
    width: "100%", fontFamily: "'Inter',sans-serif", fontSize: 15, border: "none",
    borderBottom: "1px solid var(--line)", background: "transparent", padding: "10px 2px", color: "var(--ink)",
  };

  return (
    <div style={{ minHeight: "100vh", background: "var(--paper)", color: "var(--ink)", fontFamily: "'Inter',sans-serif", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ width: "min(380px, 100%)" }}>
        <img src="/amiga/curiosa.png" alt="" style={{ width: 132, height: "auto", display: "block", marginBottom: 8 }} />
        <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--ink-soft)", marginBottom: 10 }}>Amiga, date cuenta</div>

        {enviado ? (
          <>
            <h1 style={{ fontFamily: "'Fraunces',serif", fontWeight: 500, fontSize: 30, lineHeight: 1.1, margin: "0 0 12px", letterSpacing: "-0.01em" }}>Te mandé el enlace.</h1>
            <p style={{ fontSize: 14.5, color: "var(--ink-soft)", lineHeight: 1.6, margin: 0 }}>
              Está en <strong style={{ color: "var(--ink)", fontWeight: 500 }}>{email.trim()}</strong>. Abrilo desde este mismo dispositivo y entrás sola.
            </p>
            <button onClick={() => { setEnviado(false); setEmail(""); }}
              style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 11.5, color: "var(--accent)", background: "none", border: "none", cursor: "pointer", padding: "18px 0 0", textDecoration: "underline" }}>
              usar otro correo
            </button>
          </>
        ) : (
          <form onSubmit={enviarLink}>
            <h1 style={{ fontFamily: "'Fraunces',serif", fontWeight: 500, fontSize: 30, lineHeight: 1.1, margin: "0 0 12px", letterSpacing: "-0.01em" }}>Este cuaderno es tuyo.</h1>
            <p style={{ fontSize: 14.5, color: "var(--ink-soft)", lineHeight: 1.6, margin: "0 0 26px" }}>Dejá tu correo y te mando un enlace para entrar. Sin contraseña que recordar.</p>
            <input type="email" required autoComplete="email" placeholder="tu@correo.com" style={campo}
              value={email} onChange={(e) => setEmail(e.target.value)} />
            {error && <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 11.5, color: "var(--danger)", marginTop: 10, lineHeight: 1.5 }}>{error}</div>}
            <button type="submit" disabled={enviando}
              style={{ width: "100%", marginTop: 22, background: "var(--ink)", color: "var(--paper)", border: "none", borderRadius: 8, padding: 13, fontFamily: "'Inter',sans-serif", fontSize: 14, fontWeight: 500, cursor: enviando ? "default" : "pointer", opacity: enviando ? 0.5 : 1 }}>
              {enviando ? "Enviando…" : "Mandame el enlace"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
