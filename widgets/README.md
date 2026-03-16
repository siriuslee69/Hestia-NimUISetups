# Hestia Widgets

This folder is separate from `src/`, `layouts/`, and `modular/`.

- `src/` contains runnable Nim enhancer code.
- `layouts/` contains standalone fixed layout studies.
- `modular/` contains reusable adaptive menu modules.
- `widgets/` contains standalone widget galleries and creative menu explorations.

Current widget set:

1. `gallery`

Open `gallery/index.html` directly in a browser or inside a WebView shell.

## Common GTK/OwlKettle Issues

- Taskbar popovers can look attached to or partly inside the trigger widget if their offset only uses a tiny fixed gap.
  Reuse the `Atlas-Taskbar` rule of thumb: start from about half the taskbar height plus a visual gap, then tune the `PopoverTop` `y` offset from there.
- Owlkettle boxes are prone to stretching unexpectedly.
  Keep `box { border-spacing: 0 0; min-width: 0; }` in the theme baseline and be explicit about `.expand: false` versus `.expand: true`.
