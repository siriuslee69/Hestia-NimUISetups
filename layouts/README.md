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

## Common GTK/OwlKettle Issues

If you port one of these layouts into an Owlkettle shell:

- Taskbar/menu popovers may overlap their trigger if the offset is tuned like a simple CSS gap.
  Use roughly `TaskbarHeight div 2 + extraGap`, and note that on the Windows/GTK setup used in `Atlas-Taskbar`, increasing the positive `y` offset for `PopoverTop` lifted the popover further away from the taskbar.
- Owlkettle `Box` widgets can auto-expand more than expected.
  Keep `box { border-spacing: 0 0; min-width: 0; }` in the GTK theme and mark only the intended fill container with `.expand: true`.
- Parked `GtkRevealer` helper windows do not actually disappear if only the child revealer is collapsed.
  If you keep a start menu/sidebar window alive for animation, tie the open-state to both the revealer child and the top-level visibility, and keep hidden parked windows click-through with an empty GDK input region or equivalent.
