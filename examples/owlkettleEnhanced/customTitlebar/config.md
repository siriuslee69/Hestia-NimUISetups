# CustomTitlebar Config

The debug custom-titlebar example now reads this file.

```jsonc
{
  // non-Windows fallback switch; Windows now follows the explicit
  // windows_use_experimental_custom_titlebar flag below
  "disable_titlebar": false,

  // enable Maya/Tungsten GTK theme stylesheet
  "use_theme_stylesheet": true,

  // Electron-like default on Windows:
  // false = keep native frame/caption/buttons (recommended)
  // true = use frameless + custom WM_NCHITTEST debug path
  "windows_use_experimental_custom_titlebar": false,

  // show a lightweight client-area strip under native caption in native mode
  "windows_use_hybrid_top_bar": true,

  // only used when windows_use_experimental_custom_titlebar=true
  // enables invisible HTMAXBUTTON zone in top-right hit-test area
  "windows_snap_preview_experimental": false
}
```

Notes:

- Electron-like/native mode relies on the real Windows caption buttons for snap flyout.
- Frameless experimental mode relies on WM_NCHITTEST + HTMAXBUTTON emulation.
- Windows 11 snap-layout hover preview may require a Win11-compatible app manifest.
