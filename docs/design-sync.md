# Sync con Claude Design

Proyecto: **Amiga_date_cuenta rediseño editorial**
`https://claude.ai/design/p/c2d29b97-3e48-43d0-9b06-86d92eb207df`

## Última importación
fecha: 2026-08-05 — origen: `Amiga Date Cuenta.dc.html`

### Qué trajo esta importación
- Rediseño editorial completo (Fraunces + Inter + IBM Plex Mono, paleta oklch papel/tinta) portado a React.
- Personaje ilustrado: 12 reacciones sueltas + sprite `gestos.png` (4 celdas) y `tonos.png` (6 celdas).
- `control-acciones-insights.md` desarmado en reglas con gatillo: sugerencia por emoción, nota semanal por patrón, frase ancla diaria.
- `becario.js`: fuente de tiempo semanal (endpoint `window.BECARIO_URL` o serie simulada) + evaluación contra objetivos → alerta modo-seria.
- Vista nueva "Lecturas": control anual de libros con portada, autor y calificación.

## Mapa de pantallas
| Pantalla | Archivos |
|---|---|
| "Pensamientos" (diario + panel nuevo/editar + sugerencia por emoción) | `src/App.jsx` |
| "Episodios ansiosos" (semanal + parte del becario + nota de la amiga) | `src/App.jsx`, `src/becario.js` |
| "Lecturas" (control anual) | `src/App.jsx` |
| Guión de la amiga (reacciones, sugerencias, frases) | `src/amiga.js` |
| Persistencia | `src/storage.js` (Supabase si hay credenciales, si no localStorage), `supabase.sql` |
| Reglas de contenido | `docs/control-acciones-insights.md` |
| Sprites | `public/amiga/*.png` |

## No importado
- `support.js` — runtime de Claude Design (`dc-runtime`), no aplica a una app Vite/React.
- `uploads/*.png` — arte fuente del personaje; los sprites derivados ya están en `public/amiga/`.
