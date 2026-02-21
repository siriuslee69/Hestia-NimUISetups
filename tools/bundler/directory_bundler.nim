# ====================================================================
# | directory bundler cli                                              |
# |--------------------------------------------------------------------|
# | Bundles all files from a directory into one binary and can extract |
# ====================================================================

import std/[os, strutils]
import lib/level0/bundle_format

proc usage() =
  echo "Usage:"
  echo "  nim c -r tools/bundler/directory_bundler.nim bundle <inputDir> <bundleFile>"
  echo "  nim c -r tools/bundler/directory_bundler.nim extract <bundleFile> <outputDir>"
  echo "  nim c -r tools/bundler/directory_bundler.nim list <bundleFile>"

proc runBundle(d, b: string) =
  ## d: source directory.
  ## b: output bundle file.
  var
    es: seq[BundleEntry]
  es = collectBundleEntries(d)
  writeBundle(b, es)
  echo "bundled ", es.len, " files into ", b

proc runExtract(b, d: string) =
  ## b: bundle file to extract.
  ## d: output directory for extraction.
  extractBundle(b, d)
  echo "extracted bundle into ", d

proc runList(b: string) =
  ## b: bundle file to inspect.
  var
    es: seq[BundleEntry] = readBundle(b)
    i: int = 0
  echo "entries: ", es.len
  while i < es.len:
    echo "  - ", es[i].rPath, " (", es[i].bs.len, " bytes)"
    i.inc

when isMainModule:
  let args = commandLineParams()
  if args.len == 0:
    usage()
    quit(1)

  case args[0].toLowerAscii()
  of "bundle":
    if args.len != 3:
      usage()
      quit(1)
    runBundle(args[1], args[2])
  of "extract":
    if args.len != 3:
      usage()
      quit(1)
    runExtract(args[1], args[2])
  of "list":
    if args.len != 2:
      usage()
      quit(1)
    runList(args[1])
  else:
    usage()
    quit(1)
