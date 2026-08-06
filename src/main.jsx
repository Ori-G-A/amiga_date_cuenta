import React from "react";
import { createRoot } from "react-dom/client";
import { supabase } from "./storage.js";
import Sesion from "./Sesion.jsx";
import App from "./App.jsx";

// Sin credenciales de Supabase todo vive en localStorage y no hay a quién autenticar.
createRoot(document.getElementById("root")).render(
  supabase ? <Sesion><App /></Sesion> : <App />
);
