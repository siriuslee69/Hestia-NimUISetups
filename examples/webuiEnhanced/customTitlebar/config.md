# WebUI Enhance Config (Custom Titlebar)

The parser reads the first `jsonc` fenced block.

```jsonc
{
  // Hide native window title bar and use custom CSS titlebar.
  "disable_titlebar": true,

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

  // Keep this true for titlebar behavior parity on Windows.
  "force_webview": true,

  // Seconds to wait for frontend/backend connection.
  "connect_timeout_seconds": 3,

  // Binds minimize/maximize/close handlers.
  "bind_window_buttons": true
}
```
