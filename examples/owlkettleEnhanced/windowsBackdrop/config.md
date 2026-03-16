# WindowsBackdrop Config

The Windows backdrop demo reuses the standard Owlkettle enhancement config.

```jsonc
{
  // Optional: load the shared Maya white theme first.
  // The local style.css is applied after it.
  "use_theme_stylesheet": false,

  // The demo intentionally stays on the native frame on Windows
  // because the DWM backdrop is applied to the real HWND.
  "disable_titlebar": false
}
```

Notes:

- `GTK_CSD=0` is forced on Windows by the example app.
- The actual backdrop effect is provided by DWM, not GTK.
- Non-Windows platforms still run the example, but the backdrop calls are no-ops.
