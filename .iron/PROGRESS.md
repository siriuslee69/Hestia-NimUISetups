Commit Message: add modular graph widgets and frame collapse modes

0. Current commit message
- add modular graph widgets and frame collapse modes

1. Features to implement (total)
- [x] repository skeleton and nimble tasks
- [x] webuiEnhanced demo (default/custom titlebar)
- [x] owlkettleEnhanced demo (default/custom titlebar)
- [x] illwillEnhanced demo
- [x] windows gtk builder + dll helper
- [x] nix env for owlkettle
- [x] directory bundler tool + smoke tests
- [x] docs for framework differences and setup
- [x] standalone layout gallery separate from enhancer code
- [x] modular adaptive menu demos separate from layouts and src
- [x] standalone widget gallery area for creative menu experiments

2. Features already implemented
- complete scaffold and UI demos
- copied white theme assets from Maya-Themes
- added shared widget helpers plus 8 standalone HTML layout examples in `layouts/`
- added shared modular adaptive menu helpers plus vertical and horizontal demos in `modular/`
- added `widgets/gallery/` with a multi-column menu study page and a first floating-stones menu concept

3. Features in progress
- define follow-up conversion layers for HTML/CSS/JS export and OwlKettle translation
- recreate the modular modules against the saved JSON contract in OwlKettle
- add the later hit-test/debugger tooling for HTML vs OwlKettle parity checks
- connect the standalone graph widget to live cross-module selection rather than preset datasets

Last big change or problem encountered
- the next widget pass needed to stay reusable across cards, graph nodes, and standalone modules without creating separate rendering code paths.

Fix attempt and outcome
- added a shared graph-widget renderer for bar, pie, and point-cloud charts, reused it in cards/nodes/organizer items plus a standalone module, and added shared frame presentation modes that persist through workspace save/load.
