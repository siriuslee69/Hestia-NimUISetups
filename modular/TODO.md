# Modular TODO

Scope: only `Hestia-NimUISetups/modular/`

## Active Milestone
- [x] add shared graph widgets for bar, pie, and point-cloud views
- [x] integrate graph widgets into data cards, organizer cards, and graph nodes
- [x] add a standalone modular graph-widget module
- [x] move integrated card graphs into dedicated metadata/tag slots instead of card backgrounds
- [x] replace split card/graph hovers with one rotating card tooltip that cycles info and graph every 2 seconds
- [x] add hold-to-pin behavior plus close/outside-click dismissal for larger modular tooltips
- [x] add per-module `extended` / `hover` / `collapsed` presentation modes with workspace persistence
- [x] split remaining bundled workspace logic out of `vertical-menu/app.js`
- [x] introduce a stable modular workspace JSON format
- [x] add save/load file support for modular workspace setups
- [ ] start the JSON conversion/export layer on top of the saved workspace contract
- [ ] connect the standalone graph widget to live selection from other modules instead of preset datasets

## Workspace JSON Format
- [x] define schema version and top-level workspace metadata
- [x] store module frame geometry
- [x] store per-module view/config state
- [x] store stack groups and tab wiring
- [x] store menu-to-content dependency wiring
- [ ] document the JSON contract separately so other exporters can consume it without reading the browser code

## Persistence
- [x] save current modular workspace JSON to file
- [x] load modular workspace JSON from file
- [x] add browser fallback behavior when File System Access API is unavailable
- [ ] add explicit import/export validation messages for unknown module kinds and partially-restored workspaces

## Conversion Layers
- [ ] JSON -> HTML/CSS/JS exporter
- [ ] HTML/CSS/JS -> JSON importer
- [ ] JSON -> OwlKettle layout translator
- [ ] OwlKettle layout -> JSON importer where feasible

## OwlKettle Parity Work
- [ ] recreate each modular module in OwlKettle
- [ ] apply saved geometry and per-module settings from workspace JSON
- [ ] define a shared intermediate representation so web and OwlKettle renderers use the same saved model

## Validation / Debugging
- [ ] build a coordinate-based hit-test debugger for modular modules
- [ ] compare HTML and OwlKettle module hit results at identical local coordinates
- [ ] support dual-window comparisons for one module at a time
- [ ] log mouse events and element/widget hits in a comparable format

## Notes
- Implemented first milestone: workspace split + JSON save/load.
- Implemented graph widget pass: preview + tooltip widgets now exist in cards, organizer items, graph nodes, and a standalone module.
- Implemented tooltip polish pass: cards now use a combined info+graph carousel tooltip, and larger tooltips can pin after a short hold with a visible progress fill.
- Conversion/export work should build on the JSON schema instead of ad-hoc DOM scraping.
