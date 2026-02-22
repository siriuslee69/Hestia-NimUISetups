# Windows Custom Titlebar + Snap (Ground-Up Rethink)

## Scope

This document captures:

- what we already tried in `examples/owlkettleEnhanced/customTitlebar/app_debug_bar_only.nim`
- what worked vs failed
- how Electron/VSCode/Vivaldi handle Windows 11 Snap Layouts
- the best translation strategy for Nim/Owlkettle

Date: 2026-02-21

## Current Implementation Snapshot

Relevant file: `examples/owlkettleEnhanced/customTitlebar/app_debug_bar_only.nim`

Current approach (debug app):

- undecorated GTK window
- custom Win32 `WNDPROC` hook
- `WM_NCHITTEST` returns `HTCAPTION` + resize hit tests + synthetic `HTMINBUTTON`/`HTMAXBUTTON`/`HTCLOSE` zones
- style toggling helper `ensureNativeSnapStyles(...)` used during interaction

Key refs:

- `normalizeStyle(...)` at `examples/owlkettleEnhanced/customTitlebar/app_debug_bar_only.nim:142`
- `ensureNativeSnapStyles(...)` at `examples/owlkettleEnhanced/customTitlebar/app_debug_bar_only.nim:206`
- non-client event handling at `examples/owlkettleEnhanced/customTitlebar/app_debug_bar_only.nim:260`

## Experiment Log (What We Tried)

1. Native hit-test baseline (caption + resize + dblclick toggle)
- Result: drag-down from maximized became stable; dblclick maximize worked.
- Gap: Snap menu/tiling was missing.

2. Reapply style bits during `WM_NCHITTEST`
- Result: repeated frame churn; window instability/shrinking behavior.
- Verdict: failed (style writes in hit-test are unsafe).

3. Reapply style bits on `WM_NCLBUTTONDOWN` with frame changes
- Result: snap features appeared intermittently.
- Side effect: visible native frame flash + content shift.
- Verdict: partially works, UX unacceptable.

4. Intercept `WM_STYLECHANGING`/`WM_STYLECHANGED` and normalize styles
- Result: style fight loop with GTK and repeated layout warnings (`gdk-frame-clock`).
- Verdict: failed (infinite tug-of-war).

5. Delayed drag start with capture and manual threshold (`WM_NCMOUSEMOVE`)
- Result: dead/frozen interaction path in practice.
- Verdict: failed (non-client capture flow became brittle).

6. Borderless-default + temporary frame bits only around drag
- Result: reduced permanent frame presence but still flicker and sticky top snap UI in several runs.
- Verdict: unstable behavior.

## What Actually Worked Reliably

- Stable drag/down + dblclick maximize came from:
  - native `WM_NCHITTEST` caption/resize mapping
  - minimizing style churn during pointer event hot paths

What consistently caused regressions:

- style mutation loops and/or frequent style toggling during non-client mouse flow
- repeated `SWP_FRAMECHANGED` while interacting

## External Baseline: Electron / VSCode / Vivaldi

### Microsoft Guidance

Microsoft guidance for Win32 custom titlebars states that Snap Layout integration depends on non-client/titlebar semantics, especially maximize-button hit testing (`HTMAXBUTTON`) and proper titlebar behavior.

Source:
- https://learn.microsoft.com/en-us/windows/apps/desktop/modernize/ui/apply-snap-layout-menu

### Electron Pattern

Electron recommends keeping the native frame model and using titlebar overlay APIs (`titleBarStyle`, `titleBarOverlay`) for customization rather than building a fully frameless replacement on Windows.

Source:
- https://www.electronjs.org/docs/latest/tutorial/custom-title-bar

### VSCode Pattern

VSCode tracked missing Snap Layout support for custom titlebar on Windows (`#127449`) and fixed it via adoption of Window Controls Overlay (`#147947`) instead of per-event style mutation hacks.

Sources:
- https://github.com/microsoft/vscode/issues/127449
- https://github.com/microsoft/vscode/pull/147947

Related VSCode regression issue shows runtime style/frame mutations cause visible frame artifacts/flicker, which matches what we observed.

Source:
- https://github.com/microsoft/vscode/issues/158065

### Vivaldi Pattern

Vivaldi explicitly added Windows 11 Snap Layout support and also exposes a "Use Native Window" option, reinforcing the same principle: OS-native window controls are the stable path for platform behaviors.

Sources:
- https://vivaldi.com/blog/improved-tab-tiling-and-optional-inactive-tabs-in-two-level-tab-stacks-vivaldi-browser-snapshot-3344-3/
- https://help.vivaldi.com/desktop/appearance-customization/browser-appearance/

## Direct Comparison (Them vs Us)

1. Frame model
- Electron/VSCode/Vivaldi: keep native control model stable.
- Current debug Nim path: undecorated GTK + dynamic style reconstruction.

2. Style lifecycle
- Electron/VSCode/Vivaldi: no rapid style flipping on click/move paths.
- Current debug Nim path: style bits frequently toggled to recover snap behavior.

3. Snap entry path
- Electron/VSCode/Vivaldi: native maximize/control semantics are always available.
- Current debug Nim path: synthetic recreation of those semantics; fragile.

4. UX stability
- Electron/VSCode/Vivaldi: no frame flash during normal titlebar interaction.
- Current debug Nim path: frame flash/sticky snap menu/frozen states observed across attempts.

## Recommended Nim Strategy

### Recommendation A (Practical, Highest Reliability)

Adopt a native-frame-first Windows path for Owlkettle:

1. Keep `decorated=true` on Windows in production mode.
2. Do not simulate full non-client frame ownership in GTK.
3. Use custom UI below native caption row (visually cohesive theme, but native controls remain real).
4. Keep current full custom bar path as explicitly experimental/debug.

Expected outcome:

- Snap Layout/tiling behavior remains fully OS-native.
- no frame flicker from style mutation.
- no sticky snap menu from synthetic move loops.

### Recommendation B (Advanced, Not Quick)

If true fully-custom top bar with native-equal behavior is mandatory:

1. Move to a dedicated Win32 host-window approach for Windows.
2. Keep a true overlapped window and implement non-client calculations explicitly.
3. Embed GTK content as child area rather than owning the top-level frame entirely through GTK CSD.

This is a significantly larger architecture effort and should be treated as a separate milestone.

## Proposed Next Steps (No More Knee-Jerk Patches)

1. Freeze current debug experiment branch and stop further micro-fixes in `WNDPROC`.
2. Build a small A/B prototype:
- A: native-frame-first Windows mode (`decorated=true`, themed content below titlebar)
- B: current full-custom debug mode
3. Measure:
- snap menu reliability
- dblclick maximize reliability
- frame flash/jitter
- drag responsiveness
4. Promote A as default Windows behavior if reliability target is met.

## Status (Implemented)

Plan A is now wired as the default for the Owlkettle custom example:

- Windows uses native window frame by default.
- fully custom Windows titlebar path remains available as explicit opt-in config.

Relevant files:

- `src/owlkettleEnhanced/enhance.nim`
- `examples/owlkettleEnhanced/customTitlebar/app.nim`
- `examples/owlkettleEnhanced/customTitlebar/config.md`

## Status (Next Plan Attempt)

Implemented a "stable-style runtime" experiment in `app_debug_bar_only.nim`:

- keep one style profile for the full window lifetime (`includeCaption=false`, `includeFrameBits=true`)
- no per-click/per-drag style toggling in `WM_NCLBUTTONDOWN` / `WM_EXITSIZEMOVE`
- keep `WM_NCCALCSIZE` non-client removal
- remove synthetic `HTMINBUTTON`/`HTMAXBUTTON`/`HTCLOSE` hit zones in debug mode

Follow-up experimental toggle:

- `windows_snap_preview_experimental` adds only an invisible `HTMAXBUTTON` zone
  on the right side of the debug titlebar while keeping style handling stable.

Hybrid/native path added:

- `windows_use_hybrid_top_bar`: keep native Windows caption/buttons and render app quick-actions
  in a toolbar row directly below the native titlebar.
- `windows_native_titlebar_color` / `windows_native_titlebar_text_color`:
  optional DWM caption/text colors for the native titlebar in hybrid/native-frame mode.

Rationale:

- eliminate style churn as the primary source of frame flash/layout jitter loops
- validate whether top-edge snap behavior can remain without synthetic caption button zones
