# proto-ViableNimUIs

Prototype repo comparing three Nim UI approaches with the same baseline flow:
- login page (`test` / `test`)
- left-side menu after login
- multiple pages (overview, controls/slider, docs)

The requested source split is implemented as:

```text
src/
  webuiEnhanced/
    enhance.nim
    shared/
  owlkettleEnhanced/
    enhance.nim
    shared/
  illwillEnhanced/
    enhance.nim
  lib/level0/

examples/
  webuiEnhanced/
    defaultTitlebar/
    customTitlebar/
  owlkettleEnhanced/
    defaultTitlebar/
    customTitlebar/
  illwillEnhanced/
```

## What Is Included

- `webuiEnhanced`: WebUI enhancement kit with its own `enhance(pathOfConfig)` entrypoint.
- `owlkettleEnhanced`: Owlkettle enhancement kit with its own `enhance(pathOfConfig)` entrypoint.
- `illwillEnhanced`: Illwill enhancement kit with its own `enhance(pathOfConfig)` entrypoint.
- Kit imports are available as `import webuiEnhanced`, `import owlkettleEnhanced`, and `import illwillEnhanced`.
- `examples/*Enhanced/*`: runnable app variants that call the relevant enhancer.
- White theme assets copied from `Maya-Themes` (`assets/themes/theme_white.css`) for GTK/Owlkettle.
- Every example folder contains both `config.md` (parsed first) and `config.json` (fallback option).
- WebUI frontend files are in:
  - `examples/webuiEnhanced/defaultTitlebar/web/index.html`, `app.js`, `style.css`
  - `examples/webuiEnhanced/customTitlebar/web/index.html`, `app.js`, `style.css`
- Windows GTK setup helper for MSYS2 + DLL copier (`tools/windows/gtk_builder_msys2.nim`).
- Nix shell for Owlkettle (`nix/owlkettle-shell.nix`).
- Directory bundler tool (`tools/bundler/directory_bundler.nim`).

## Quick Start

```bash
nimble test
nimble runWebDefault
nimble runWebCustom
nimble runOwlDefault
nimble runOwlCustom
nimble runIllwill
```

## Bundler

Bundle an entire directory into one binary:

```bash
nim c -r tools/bundler/directory_bundler.nim bundle <inputDir> <bundleFile>
```

Extract bundle:

```bash
nim c -r tools/bundler/directory_bundler.nim extract <bundleFile> <outputDir>
```

List bundle entries:

```bash
nim c -r tools/bundler/directory_bundler.nim list <bundleFile>
```

## Windows Setup

See `docs/windows_setup.md`.

## Framework Differences

See `docs/framework_differences.md`.

## Nix (Owlkettle)

```bash
nix-shell nix/owlkettle-shell.nix
```

## Conventions Summary

- Keep functions short and compose with helper procs.
- Prefer `func(a, b)` or method-call syntax; avoid unusual Nim call styles.
- Keep reusable helpers in low-level modules (`src/lib/level0`).
- Use clear state fields and explicit UI routing.
- Keep `valkyrie/` at repo root for repo coordination metadata.
- Update `progress.md` with major change tracking.
- Keep tests in `tests/` and run them after meaningful changes.
