import std/[os, strutils]

version       = "0.1.0"
author        = "siriuslee69"
description   = "Prototype repository comparing viable Nim UI approaches"
license       = "UNLICENSED"
srcDir        = "src"

requires "nim >= 1.6.0", "owlkettle >= 3.0.0", "illwill >= 0.4.0", "webui >= 2.4.0"

proc runWithOwlNixShell(cmd: string) =
  let shellFile = "nix/owlkettle-shell.nix"
  if fileExists(shellFile) and findExe("nix-shell").len > 0:
    exec "nix-shell " & shellFile & " --run \"" & cmd & "\""
  else:
    exec cmd

proc runCmd(srcPath, outStem: string): string =
  when defined(windows):
    var
      idx = 0
      outPath = ".nimcache/" & outStem & "_0.exe"
    while fileExists(outPath):
      idx.inc
      outPath = ".nimcache/" & outStem & "_" & $idx & ".exe"
    result = "nim c --out:" & outPath & " -r " & srcPath
  else:
    result = "nim c -r " & srcPath

task test, "Run smoke tests":
  exec "nim c -r tests/test_smoke.nim"

task autopush, "Add, commit, and push with message from progress.md":
  let path = "progress.md"
  var msg = ""
  if fileExists(path):
    let content = readFile(path)
    for line in content.splitLines:
      if line.startsWith("Commit Message:"):
        msg = line["Commit Message:".len .. ^1].strip()
        break
  if msg.len == 0:
    msg = "No specific commit message given."

  let safeMsg = msg.replace("\"", "\\\"")
  exec "git add -A ."
  exec "git commit -m \"" & safeMsg & "\""
  exec "git push"

task runWebDefault, "Run web UI (default titlebar variant)":
  exec runCmd("examples/webuiEnhanced/defaultTitlebar/app.nim", "runWebDefault")

task runWebCustom, "Run web UI (custom titlebar variant)":
  exec runCmd("examples/webuiEnhanced/customTitlebar/app.nim", "runWebCustom")

task runOwlDefault, "Run owlkettle UI (default titlebar variant)":
  runWithOwlNixShell(runCmd("examples/owlkettleEnhanced/defaultTitlebar/app.nim", "runOwlDefault"))

task runOwlCustom, "Run owlkettle UI (custom titlebar variant)":
  runWithOwlNixShell(runCmd("examples/owlkettleEnhanced/customTitlebar/app.nim", "runOwlCustom"))

task runOwlCustomDebugBar, "Run owlkettle UI (custom titlebar debug bar only)":
  runWithOwlNixShell(runCmd("examples/owlkettleEnhanced/customTitlebar/app_debug_bar_only.nim", "runOwlCustomDebugBar"))

task runIllwill, "Run illwill UI":
  exec runCmd("examples/illwillEnhanced/app.nim", "runIllwill")

task setupGtkWin, "Install GTK dependencies via MSYS2 (inside an MSYS2 shell)":
  exec "nim c -r tools/windows/gtk_builder_msys2.nim install"

task copyGtkDlls, "Copy GTK runtime DLLs from MSYS2 into dist/win64/gtk/bin":
  exec "nim c -r tools/windows/gtk_builder_msys2.nim copydlls"

task bundleDir, "Bundle the assets folder into one binary":
  exec "nim c -r tools/bundler/directory_bundler.nim bundle assets dist/assets.bundle"

task unbundleDir, "Extract the generated bundle binary":
  exec "nim c -r tools/bundler/directory_bundler.nim extract dist/assets.bundle dist/assets_unpacked"
