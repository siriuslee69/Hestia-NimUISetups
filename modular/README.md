# Hestia Modular Widgets

This folder is separate from both `src/` and `layouts/`.

- `src/` contains runnable Nim enhancer code.
- `layouts/` contains standalone fixed layout studies.
- `modular/` contains reusable rearrangeable UI modules.

Current shared module:

- adaptive menu buttons with three modes:
  - `extended`
  - `collapsed`
  - `auto`
- organizer kanban cards with:
  - manual drag-and-drop ordering
  - fixed post-drop order (no automatic sorting)
  - per-item assignment menus with selects and checkboxes

Rules:

- every button always shows a symbol
- collapsed buttons become square
- extended buttons show symbol plus label
- auto buttons expand when space allows and collapse when the parent menu becomes too narrow
- buttons can be drag-reordered inside the menu

Examples:

1. `vertical-menu`
2. organizer kanban frame inside `vertical-menu`

Metadata:

- See `METADATA_UI_GUIDE.md` for metadata schema rules and menu mapping behavior.

## Common GTK/OwlKettle Issues

- Popovers used as taskbar/start-menu panels can hover partly over their trigger button if the offset is too small.
  In `Atlas-Taskbar`, the reliable fix was to offset by about half the taskbar height plus an extra gap, and for `PopoverTop` the upward movement came from increasing the positive `y` offset on that setup.
- Owlkettle `Box` layout tends to auto-extend more than HTML flexbox.
  Keep `box { border-spacing: 0 0; min-width: 0; }` in the shared GTK CSS and use `.expand: false` for content-sized rows/cards unless a region is intentionally meant to fill space.
