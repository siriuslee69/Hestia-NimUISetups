# Windows Setup

## 1. Install dependencies (MSYS2 UCRT64)
Open an **MSYS2 UCRT64** shell, then run:

```bash
nim c -r tools/windows/gtk_builder_msys2.nim install
```

This installs:
- mingw-w64-ucrt-x86_64-gcc
- mingw-w64-ucrt-x86_64-gtk4
- mingw-w64-ucrt-x86_64-glib2
- mingw-w64-ucrt-x86_64-gdk-pixbuf2
- mingw-w64-ucrt-x86_64-pango
- mingw-w64-ucrt-x86_64-cairo
- mingw-w64-ucrt-x86_64-graphene
- mingw-w64-ucrt-x86_64-pkgconf
- mingw-w64-ucrt-x86_64-nim

## 2. Copy runtime DLLs for distribution

```bash
nim c -r tools/windows/gtk_builder_msys2.nim copydlls
```

The tool copies DLLs into `dist/win64/gtk/bin`.

Expected core DLLs:
- libgtk-4-1.dll
- libgdk-4-1.dll
- libglib-2.0-0.dll
- libgobject-2.0-0.dll
- libgio-2.0-0.dll
- libgmodule-2.0-0.dll
- libpango-1.0-0.dll
- libpangocairo-1.0-0.dll
- libharfbuzz-0.dll
- libcairo-2.dll
- libgraphene-1.0-0.dll
- libgdk_pixbuf-2.0-0.dll
- libintl-8.dll
- libiconv-2.dll
- zlib1.dll

## 3. Run UI variants

```bash
nimble runWebDefault
nimble runWebCustom
nimble runOwlDefault
nimble runOwlCustom
nimble runIllwill
```

Note: `webuiEnhanced` uses the `webui` library and does not run a user-authored self-hosted HTTP server.
