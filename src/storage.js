import { createClient } from "@supabase/supabase-js";

// Shim de window.storage: Supabase si hay credenciales, localStorage si no.
// API esperada por App.jsx: get(key) -> { value } | null, set(key, value) -> boolean
const url = import.meta.env.VITE_SUPABASE_URL;
// Supabase renombró la anon key a "publishable key". Acepto los dos nombres
// porque el panel te ofrece uno y la documentación vieja el otro.
const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY;
const g = typeof window !== "undefined" ? window : globalThis;

export const supabase = url && anonKey ? createClient(url, anonKey) : null;

// getSession lee de memoria/localStorage, no pega a la red en cada guardado.
async function userId() {
  const { data } = await supabase.auth.getSession();
  return data.session?.user?.id ?? null;
}

if (supabase) {
  g.storage = {
    async get(key) {
      // la RLS ya filtra por dueño; no hace falta repetir el user_id acá
      const { data, error } = await supabase.from("kv").select("value").eq("key", key).maybeSingle();
      if (error) throw error;
      return data ? { value: data.value } : null;
    },
    async set(key, value) {
      const uid = await userId();
      if (!uid) return false; // sesión vencida: mejor devolver false que perder el dato en silencio
      const { error } = await supabase
        .from("kv")
        .upsert({ user_id: uid, key, value, updated_at: new Date().toISOString() }, { onConflict: "user_id,key" });
      return !error;
    },
  };
} else {
  // ponytail: fallback localStorage para desarrollo sin Supabase
  g.storage = {
    async get(key) {
      const value = localStorage.getItem(key);
      return value === null ? null : { value };
    },
    async set(key, value) {
      localStorage.setItem(key, value);
      return true;
    },
  };
}
