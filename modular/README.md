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
