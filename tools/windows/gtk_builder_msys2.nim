# ======================================================================
# | windows gtk builder (msys2)                                         |
# |---------------------------------------------------------------------|
# | Installs GTK toolchain packages and copies required runtime DLLs     |
# ======================================================================

import std/[os, strutils]

const
  Packages = [
    "mingw-w64-ucrt-x86_64-gcc",
    "mingw-w64-ucrt-x86_64-gtk4",
    "mingw-w64-ucrt-x86_64-glib2",
    "mingw-w64-ucrt-x86_64-gdk-pixbuf2",
    "mingw-w64-ucrt-x86_64-pango",
    "mingw-w64-ucrt-x86_64-cairo",
    "mingw-w64-ucrt-x86_64-graphene",
    "mingw-w64-ucrt-x86_64-pkgconf",
    "mingw-w64-ucrt-x86_64-nim"
  ]

  Dlls = [
    "libgtk-4-1.dll",
    "libgdk-4-1.dll",
    "libglib-2.0-0.dll",
    "libgobject-2.0-0.dll",
    "libgio-2.0-0.dll",
    "libgmodule-2.0-0.dll",
    "libpango-1.0-0.dll",
    "libpangocairo-1.0-0.dll",
    "libharfbuzz-0.dll",
    "libcairo-2.dll",
    "libgraphene-1.0-0.dll",
    "libgdk_pixbuf-2.0-0.dll",
    "libintl-8.dll",
    "libiconv-2.dll",
    "zlib1.dll"
  ]

proc printUsage() =
  echo "Usage: nim c -r tools/windows/gtk_builder_msys2.nim <install|copydlls|list>"

proc findMsysBin(): string =
  var
    t0: string = getEnv("MSYS2_ROOT", "")
    ts: seq[string] = @[]
    t: string
  if t0.len > 0:
    ts.add(joinPath(t0, "ucrt64", "bin"))
    ts.add(joinPath(t0, "mingw64", "bin"))
  ts.add("C:\\msys64\\ucrt64\\bin")
  ts.add("C:\\msys64\\mingw64\\bin")
  for t in ts:
    if dirExists(t):
      return t
  result = ""

proc listData() =
  var
    p: string
    d: string
  echo "MSYS2 packages:"
  for p in Packages:
    echo "  - ", p
  echo ""
  echo "Expected runtime DLLs:"
  for d in Dlls:
    echo "  - ", d

proc installGtkPackages() =
  var
    c: string
    code: int
  if findExe("pacman").len == 0:
    echo "pacman not found. Run this tool from an MSYS2 UCRT64 shell."
    quit(1)
  c = "pacman -S --needed --noconfirm " & Packages.join(" ")
  echo "Running: ", c
  code = execShellCmd(c)
  if code != 0:
    quit(code)

proc copyDlls() =
  var
    b: string = findMsysBin()
    d: string = joinPath("dist", "win64", "gtk", "bin")
    n: string
    s: string
    missing: seq[string] = @[]
  if b.len == 0:
    echo "Unable to locate MSYS2 bin folder."
    echo "Set MSYS2_ROOT or install to C:\\msys64."
    quit(1)

  createDir(d)
  for n in Dlls:
    s = joinPath(b, n)
    if fileExists(s):
      copyFile(s, joinPath(d, n))
    else:
      missing.add(n)

  echo "Copied GTK DLLs into: ", d
  if missing.len > 0:
    echo "Missing DLLs (install package set first):"
    for n in missing:
      echo "  - ", n

when isMainModule:
  let args = commandLineParams()
  if args.len == 0:
    printUsage()
    quit(1)

  case args[0].toLowerAscii()
  of "install":
    installGtkPackages()
  of "copydlls":
    copyDlls()
  of "list":
    listData()
  else:
    printUsage()
    quit(1)
