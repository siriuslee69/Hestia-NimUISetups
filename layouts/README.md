# Hestia Standalone Layouts

This folder is intentionally separate from `src/`.

- `src/` contains runnable enhancer code for Nim UI libraries.
- `layouts/` contains standalone HTML layout studies only.

Each layout folder is self-contained:

- `index.html`
- `style.css`
- `app.js`

Shared widgets live in `layouts/shared/` and are reused by all layouts:

- hover tooltips
- demo toasts
- panel toggle wiring

Current layout set:

1. `atlas-control-hub`
2. `dual-workbench`
3. `mail-triage`
4. `chat-mission-control`
5. `kanban-flight-deck`
6. `media-review-studio`
7. `analyst-cockpit`
8. `android-ops-tablet`
9. `font-gallery`

Open any `index.html` directly in a browser or inside a WebView shell.
