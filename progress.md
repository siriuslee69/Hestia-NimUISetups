Commit Message: copy webui dashboard layout 1:1 into owlkettle default and custom apps

0. Current commit message
- copy webui dashboard layout 1:1 into owlkettle default and custom apps

1. Features to implement (total)
- [x] repository skeleton and nimble tasks
- [x] webuiEnhanced demo (default/custom titlebar)
- [x] owlkettleEnhanced demo (default/custom titlebar)
- [x] illwillEnhanced demo
- [x] windows gtk builder + dll helper
- [x] nix env for owlkettle
- [x] directory bundler tool + smoke tests
- [x] docs for framework differences and setup

2. Features already implemented
- complete scaffold and UI demos
- copied white theme assets from Maya-Themes

3. Features in progress
- verify owlkettle dashboard parity and compile checks

Last big change or problem encountered
- user requested a 1:1 owlkettle copy of the large grid/page-routed web dashboard layout.

Fix attempt and outcome
- rewrote both owlkettle variants with matching login/sidebar/header and 12-column card pages; kept custom titlebar variant using HeaderBar while preserving layout parity.
