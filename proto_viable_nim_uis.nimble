import std/[os]

version       = "0.1.0"
author        = "siriuslee69"
description   = "Prototype repository comparing viable Nim UI approaches"
license       = "UNLICENSED"
srcDir        = "src"

requires "nim >= 1.6.0", "owlkettle >= 3.0.0", "illwill >= 0.4.0", "webui >= 2.4.0"

task test, "Run smoke tests":
  exec "nim c -r tests/test_smoke.nim"

task runWebDefault, "Run web UI (default titlebar variant)":
  exec "nim c -r src/webuiUI/defaultTitlebar/app.nim"

task runWebCustom, "Run web UI (custom titlebar variant)":
  exec "nim c -r src/webuiUI/customTitlebar/app.nim"

task runOwlDefault, "Run owlkettle UI (default titlebar variant)":
  exec "nim c -r src/owlkettleUI/defaultTitlebar/app.nim"

task runOwlCustom, "Run owlkettle UI (custom titlebar variant)":
  exec "nim c -r src/owlkettleUI/customTitlebar/app.nim"

task runIllwill, "Run illwill UI":
  exec "nim c -r src/illwillUI/app.nim"

task setupGtkWin, "Install GTK dependencies via MSYS2 (inside an MSYS2 shell)":
  exec "nim c -r tools/windows/gtk_builder_msys2.nim install"

task copyGtkDlls, "Copy GTK runtime DLLs from MSYS2 into dist/win64/gtk/bin":
  exec "nim c -r tools/windows/gtk_builder_msys2.nim copydlls"

task bundleDir, "Bundle the assets folder into one binary":
  exec "nim c -r tools/bundler/directory_bundler.nim bundle assets dist/assets.bundle"

task unbundleDir, "Extract the generated bundle binary":
  exec "nim c -r tools/bundler/directory_bundler.nim extract dist/assets.bundle dist/assets_unpacked"
