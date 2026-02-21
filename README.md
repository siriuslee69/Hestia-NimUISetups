# proto-ViableNimUIs

Prototype repo comparing three Nim UI approaches with the same baseline flow:
- login page (`test` / `test`)
- left-side menu after login
- multiple pages (overview, controls/slider, docs)

The requested source split is implemented as:

```text
src/
  webuiUI/
    defaultTitlebar/
    customTitlebar/
    shared/
  owlkettleUI/
    defaultTitlebar/
    customTitlebar/
    shared/
  illwillUI/
  lib/level0/
```

## What Is Included

- `webuiUI`: uses the **nim-webui** library (embedded window UI, not a self-hosted app server).
- `owlkettleUI`: GTK4 desktop app variants (default titlebar + custom `HeaderBar` titlebar).
- `illwillUI`: terminal UI variant.
- White theme assets copied from `Maya-Themes` (`assets/themes/theme_white.css`) and adapted web CSS.
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
