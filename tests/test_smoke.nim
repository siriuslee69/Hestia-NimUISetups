# ===============================================================
# | smoke tests                                                  |
# |--------------------------------------------------------------|
# | Basic checks for login helper and directory bundle roundtrip |
# ===============================================================

import std/[os, unittest]
import lib/level0/auth
import lib/level0/bundle_format

suite "proto viable nim uis smoke tests":
  test "login accepts test/test and rejects invalid pairs":
    check isValidLogin("test", "test")
    check not isValidLogin("test", "wrong")
    check not isValidLogin("wrong", "test")

  test "bundle format writes and extracts files":
    var
      t0: string = joinPath(getTempDir(), "proto_viable_nim_uis_bundle_test")
      t1: string = joinPath(t0, "input")
      t2: string = joinPath(t0, "bundle.bin")
      t3: string = joinPath(t0, "out")
      es: seq[BundleEntry]
    if dirExists(t0):
      removeDir(t0)
    createDir(t1)
    createDir(joinPath(t1, "nested"))
    writeFile(joinPath(t1, "a.txt"), "alpha")
    writeFile(joinPath(t1, "nested", "b.txt"), "beta")

    es = collectBundleEntries(t1)
    check es.len == 2

    writeBundle(t2, es)
    check fileExists(t2)

    extractBundle(t2, t3)
    check readFile(joinPath(t3, "a.txt")) == "alpha"
    check readFile(joinPath(t3, "nested", "b.txt")) == "beta"

    removeDir(t0)
