# Hestia-NimUISetups

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
- Every example folder uses `config.md` as the single config source (JSONC in markdown fenced block).
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

## Issue Playbook (Keep Updated)

This section is the fast "symptom -> fix" log.  
Rule: when a new recurring issue is found and fixed, add it here with the file path.

1. `nimble runOwlCustom` / `runOwlDefault` fails with `ld.exe ... app.exe: Permission denied`
- Symptom: task fails to link on Windows after a previous run.
- Cause: old executable is still locked/running; fixed output path reuse.
- Fix:
  - tasks now compile to unique `.nimcache/<task>_<n>.exe` names on Windows.
  - file: `proto_viable_nim_uis.nimble` (`runCmd` helper and run tasks).

2. Owlkettle controls stretch to full width/height unexpectedly
- Symptom: login fields/cards fill whole area like flex-stretch.
- Cause: homogeneous grid + expand flags always enabled.
- Fix:
  - use `disable_stretching_boxes` config (default `true`).
  - wire expansion through `EnableStretchLayout`.
  - files:
    - `src/owlkettleEnhanced/enhance.nim`
    - `examples/owlkettleEnhanced/defaultTitlebar/app.nim`
    - `examples/owlkettleEnhanced/customTitlebar/app.nim`

3. Owlkettle custom titlebar drag from maximized jumps left of cursor (Windows)
- Symptom: dragging down from maximized restores window with left offset.
- Cause: mixed coordinate/restore-size sources (GTK values vs native Win32 placement) during maximize->restore drag.
- Fix:
  - use Maya-style `WindowHandle` drag interceptor.
  - on Windows, use direct Win32 placement APIs (`GetWindowPlacement`, `ShowWindow(SW_RESTORE)`) for restore rect/positioning before native drag message.
  - file: `src/owlkettleEnhanced/shared/window_titlebar.nim`
  - usage: `wrapWindowHandle(...)` in `examples/owlkettleEnhanced/customTitlebar/app.nim`.

4. Owlkettle titlebar button spacing/gaps or CSS parser warnings
- Symptom: button geometry wrong, or GTK theme parser errors.
- Cause: ad-hoc CSS overrides diverged from known-good Maya white theme.
- Fix:
  - keep `assets/themes/theme_white.css` synced with Maya white gallery baseline.
  - avoid unsupported/fragile GTK CSS tweaks unless validated at runtime.

5. WebUI custom titlebar click-through after maximize (Windows)
- Symptom: maximized custom window becomes click-through and clicks hit background windows.
- Cause: transparent + frameless WebView hit-testing instability on Windows.
- Fix:
  - disable transparent mode on Windows while keeping frameless.
  - file: `src/webuiEnhanced/shared/webui_shell.nim`.

6. WebUI minimize has no native animation (Windows)
- Symptom: minimize looks abrupt/non-native.
- Cause: WebUI minimize path bypassed native `ShowWindow` semantics.
- Fix:
  - use native `ShowWindow(..., SW_MINIMIZE)` path on Windows.
  - file: `src/webuiEnhanced/shared/webui_shell.nim` (`minimizeWindow`).

7. WebUI window spawns bottom-right instead of centered
- Symptom: start position is not centered on launch.
- Cause: no explicit pre-show centering.
- Fix:
  - call `set_center(...)` before show.
  - file: `src/webuiEnhanced/shared/webui_shell.nim`.

8. WebUI custom titlebar double-click maximize glitches
- Symptom: maximize/restore toggles inconsistently with drag/click gestures.
- Cause: pointer-up threshold logic conflicted with drag behavior.
- Fix:
  - use explicit `dblclick` on titlebar for maximize/restore.
  - file: `examples/webuiEnhanced/customTitlebar/web/app.js`.

9. Browser password/translation popups still appear sometimes
- Symptom: prompts still show in some browser builds.
- Cause: browser-side policies vary by channel/version; suppression is best-effort only.
- Fix:
  - keep suppression flags in WebUI shell params.
  - document behavior as non-guaranteed.
  - file: `src/webuiEnhanced/shared/webui_shell.nim`.

10. Owlkettle native custom titlebar (Windows) maximize/drag-down baseline
- Symptom: drag-down from maximized flickers/jumps or maximize/resize behavior regresses.
- Cause: mixed drag emulation and non-native hit-testing paths conflict with Win32 window manager behavior.
- Fix:
  - keep native-only `WM_NCHITTEST` + non-client dblclick handling as the current known-good baseline.
  - preserve edge hit-tests for resize and top-strip `HTCAPTION` hit-tests for drag.
  - enforce snap-eligible Win32 window styles on frameless windows:
    - clear `WS_POPUP`/`WS_CHILD` and `WS_EX_TOOLWINDOW`.
    - set `WS_CAPTION`/`WS_THICKFRAME`/`WS_MAXIMIZEBOX`/`WS_MINIMIZEBOX`/`WS_SYSMENU` and `WS_EX_APPWINDOW`.
    - apply `SetWindowPos(..., SWP_FRAMECHANGED)` after style updates.
  - in native hook mode, consume left-button drag events in `WindowHandle` so GTK `gtk_window_handle` drag logic does not override Win32 move behavior.
  - start move-loop via native system move (`WM_SYSCOMMAND` + `SC_MOVE|HTCAPTION`) for better snap integration.
  - debug app additionally routes `WM_NCLBUTTONDOWN(HTCAPTION)` into the same native system-move path.
  - file: `examples/owlkettleEnhanced/customTitlebar/app_debug_bar_only.nim`.
  - file: `src/owlkettleEnhanced/shared/window_titlebar.nim`.
  - status: maximize + drag-down currently behaves correctly.
  - TODO: implement native Windows snap affordances (top-edge snap/maximize + Win11 snap layouts preview).
  - deep-dive + strategy doc: `docs/windows_custom_titlebar_snap_rethink.md`.

11. Owlkettle Windows custom titlebar reliability/snap regressions
- Symptom: custom-titlebar Windows path regresses with flicker, sticky snap menu, or inconsistent maximize behavior.
- Cause: frameless + runtime style reconstruction is fragile under GTK + Win32 interaction.
- Fix:
  - default Windows behavior to native frame in custom example.
  - keep full custom Windows titlebar as explicit experimental opt-in.
  - config key: `windows_use_experimental_custom_titlebar` (default `false`).
  - files:
    - `src/owlkettleEnhanced/enhance.nim`
    - `examples/owlkettleEnhanced/customTitlebar/app.nim`
    - `examples/owlkettleEnhanced/customTitlebar/config.md`

## Upstream Backlog (GTK/Owlkettle/WebUI)

Potential upstream reports to open when we have minimal repros:

1. GTK/Owlkettle Windows maximize->restore drag cursor anchoring behavior for custom titlebars.
2. WebUI transparent frameless hit-test/click-through regression on Windows after maximize.
3. WebUI custom titlebar API ergonomics for reliable native window button + dblclick behavior.
4. Owlkettle/GTK native Windows snap affordances for custom titlebars (top-edge snap and Win11 snap layouts).

When filing upstream:
- include minimal repro app.
- include OS + versions (Windows build, Nim, Owlkettle/WebUI versions).
- include expected vs actual behavior and a short video if possible.
