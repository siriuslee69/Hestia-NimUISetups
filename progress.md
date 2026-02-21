Commit Message: scaffold proto viable nim uis with webui/owlkettle/illwill demos, windows gtk builder, nix shell, and directory bundler

0. Current commit message
- scaffold proto viable nim uis with webui/owlkettle/illwill demos, windows gtk builder, nix shell, and directory bundler

1. Features to implement (total)
- [x] repository skeleton and nimble tasks
- [x] webuiUI demo (default/custom titlebar)
- [x] owlkettleUI demo (default/custom titlebar)
- [x] illwillUI demo
- [x] windows gtk builder + dll helper
- [x] nix env for owlkettle
- [x] directory bundler tool + smoke tests
- [x] docs for framework differences and setup

2. Features already implemented
- complete scaffold and UI demos
- copied white theme assets from Maya-Themes

3. Features in progress
- compile and smoke verification

Last big change or problem encountered
- webui implementation originally used an internal HTTP server, but requirement was nim-webui library usage.

Fix attempt and outcome
- replaced web server implementation with nim-webui embedded window and inlined UI assets.
