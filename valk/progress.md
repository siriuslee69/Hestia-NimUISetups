Commit Message: add modular adaptive menu demos and shared button system

0. Current commit message
- add modular adaptive menu demos and shared button system

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

2. Features already implemented
- complete scaffold and UI demos
- copied white theme assets from Maya-Themes
- added shared widget helpers plus 8 standalone HTML layout examples in `layouts/`
- added shared modular adaptive menu helpers plus vertical and horizontal demos in `modular/`

3. Features in progress
- verify modular button auto-collapse behavior and demo ergonomics

Last big change or problem encountered
- user requested a separate modular widget area with rearrangeable adaptive buttons.

Fix attempt and outcome
- added a new top-level `modular/` folder with shared adaptive menu CSS/JS plus vertical and horizontal demos using Art Of Creation symbols and drag-reordering.
