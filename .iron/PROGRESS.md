Commit Message: refine modular card graph slots and pinned tooltips

0. Current commit message
- refine modular card graph slots and pinned tooltips

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
- moved integrated card graphs into dedicated metadata/tag slots instead of card backgrounds
- added combined rotating card tooltips that cycle between card info and graph previews
- added hold-to-pin behavior with progress-fill feedback and outside-click / close-button dismissal for larger modular tooltips

3. Features in progress
- define follow-up conversion layers for HTML/CSS/JS export and OwlKettle translation
- recreate the modular modules against the saved JSON contract in OwlKettle
- add the later hit-test/debugger tooling for HTML vs OwlKettle parity checks
- connect the standalone graph widget to live cross-module selection rather than preset datasets

Last big change or problem encountered
- card-level graph previews and card tooltips needed to coexist without fighting hover regions, and the shared graph resolver was keeping stale fallback graph state around for some cards.

Fix attempt and outcome
- moved integrated card graphs into their own metadata slot, replaced separate card/graph hover behavior with one rotating tooltip, added hold-to-pin handling for larger tooltips, and removed the stale graph-config persistence path so card previews follow live organizer/data state again.
