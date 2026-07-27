import { createClient } from "@supabase/supabase-js";

// Shim de window.storage: Supabase si hay credenciales, localStorage si no.
// API esperada por App.jsx: get(key) -> { value } | null, set(key, value) -> boolean
const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (url && anonKey) {
  const supabase = createClient(url, anonKey);
  window.storage = {
    async get(key) {
      const { data, error } = await supabase.from("kv").select("value").eq("key", key).maybeSingle();
      if (error) throw error;
      return data ? { value: data.value } : null;
    },
    async set(key, value) {
      const { error } = await supabase.from("kv").upsert({ key, value });
      return !error;
    },
  };
} else {
  // ponytail: fallback localStorage para desarrollo sin Supabase
  window.storage = {
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
