# WebUI Enhance Config (Default Titlebar)

The parser reads the first `jsonc` fenced block.

```jsonc
{
  // Keep native window title bar.
  "disable_titlebar": false,

  // Best-effort browser prompt suppression.
  "disable_password_popup": true,
  "disable_translation_popup": true,

  // Launch order. "webview" is attempted first.
  "favorite_browsers": [
    "webview",
    "edge",
    "chrome",
    "firefox",
    "chromium",
    "brave",
    "vivaldi",
    "opera",
    "any"
  ],

  // If true, only embedded webview is used.
  "force_webview": false,

  // Seconds to wait for frontend/backend connection.
  "connect_timeout_seconds": 3,

  // Applies only when custom titlebar mode is active.
  "bind_window_buttons": true
}
```
