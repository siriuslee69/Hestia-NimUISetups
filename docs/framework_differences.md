# Framework Differences

## webuiEnhanced (nim-webui)
- Renders HTML/CSS/JS inside a native window launched by WebUI.
- Fast layout iteration due to regular web flexbox/grid behavior.
- "Custom titlebar" here is HTML-level styling, not GTK window decoration.
- Login/menu/slider logic can live fully in frontend JS.

## owlkettleEnhanced (GTK4)
- Declarative Nim widget tree; state mutations redraw GTK widgets.
- Spacing and flex are not CSS: you use `Box` orientation, `spacing`, `margin`, `hexpand`, and `vexpand`.
- Some visual spacing/flex behavior differs from web flexbox, especially when distributing free space.
- Real desktop titlebar control is available (`Window.titlebar = HeaderBar`).

## illwillEnhanced (TUI)
- Character-grid rendering in terminal; no pixel layout.
- "Flex/spacing" is manual cursor positioning and text clipping.
- Slider behavior is represented as key-controlled numeric value + ASCII bar.
- Best for keyboard-first tooling and low-dependency environments.
