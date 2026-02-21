# =====================================================================
# | directory bundle format                                             |
# |---------------------------------------------------------------------|
# | Collects files into one binary blob and restores them from that blob |
# =====================================================================

import std/[algorithm, os, strutils]

const
  BundleMagic = "VNBU"

type
  BundleEntry* = object
    rPath*: string
    bs*: seq[byte]

proc bytesFromString(a: string): seq[byte] =
  ## a: string payload to convert to bytes.
  var
    bs: seq[byte] = newSeq[byte](a.len)
    i: int = 0
  while i < a.len:
    bs[i] = byte(ord(a[i]))
    i.inc
  result = bs

proc stringFromBytes(bs: openArray[byte]): string =
  ## bs: bytes to re-interpret as a string payload.
  var
    a: string = newString(bs.len)
    i: int = 0
  while i < bs.len:
    a[i] = char(bs[i])
    i.inc
  result = a

proc writeExact(f: File; bs: openArray[byte]) =
  ## f: output file handle.
  ## bs: byte span to write fully.
  var
    wrote: int
  if bs.len == 0:
    return
  wrote = f.writeBuffer(unsafeAddr bs[0], bs.len)
  if wrote != bs.len:
    raise newException(IOError, "failed to write full buffer")

proc readExact(f: File; bs: var seq[byte]) =
  ## f: input file handle.
  ## bs: destination buffer that must be fully read.
  var
    readLen: int
  if bs.len == 0:
    return
  readLen = f.readBuffer(addr bs[0], bs.len)
  if readLen != bs.len:
    raise newException(IOError, "failed to read full buffer")

proc writeU32(f: File; x: uint32) =
  ## f: output file handle.
  ## x: value to serialize in little-endian order.
  var
    bs: array[4, byte]
  bs[0] = byte(x and 0xFF'u32)
  bs[1] = byte((x shr 8) and 0xFF'u32)
  bs[2] = byte((x shr 16) and 0xFF'u32)
  bs[3] = byte((x shr 24) and 0xFF'u32)
  discard f.writeBuffer(addr bs[0], 4)

proc writeU64(f: File; x: uint64) =
  ## f: output file handle.
  ## x: value to serialize in little-endian order.
  var
    bs: array[8, byte]
    i: int = 0
  while i < 8:
    bs[i] = byte((x shr (8 * i.uint64)) and 0xFF'u64)
    i.inc
  discard f.writeBuffer(addr bs[0], 8)

proc readU32(f: File): uint32 =
  ## f: input file handle.
  var
    bs: array[4, byte]
    got: int
  got = f.readBuffer(addr bs[0], 4)
  if got != 4:
    raise newException(IOError, "failed to read u32")
  result = uint32(bs[0]) or
    (uint32(bs[1]) shl 8) or
    (uint32(bs[2]) shl 16) or
    (uint32(bs[3]) shl 24)

proc readU64(f: File): uint64 =
  ## f: input file handle.
  var
    bs: array[8, byte]
    got: int
    i: int = 0
    x: uint64 = 0
  got = f.readBuffer(addr bs[0], 8)
  if got != 8:
    raise newException(IOError, "failed to read u64")
  while i < 8:
    x = x or (uint64(bs[i]) shl (8 * i).uint64)
    i.inc
  result = x

proc collectBundleEntries*(d: string): seq[BundleEntry] =
  ## d: directory to walk recursively.
  var
    ps: seq[string] = @[]
    rs: seq[BundleEntry] = @[]
    p: string
    r: string
    a: string
  if not dirExists(d):
    raise newException(IOError, "directory does not exist: " & d)
  for p in walkDirRec(d):
    if fileExists(p):
      ps.add(p)
  ps.sort(system.cmp[string])
  for p in ps:
    r = relativePath(p, d).replace('\\', '/')
    a = readFile(p)
    rs.add(BundleEntry(rPath: r, bs: bytesFromString(a)))
  result = rs

proc writeBundle*(o: string; es: openArray[BundleEntry]) =
  ## o: output bundle path.
  ## es: entries to serialize.
  var
    f: File
    i: int = 0
    ps: seq[byte]
  createDir(parentDir(o))
  if not open(f, o, fmWrite):
    raise newException(IOError, "unable to open output: " & o)
  defer: f.close()

  f.write(BundleMagic)
  writeU32(f, uint32(es.len))

  while i < es.len:
    ps = bytesFromString(es[i].rPath)
    writeU32(f, uint32(ps.len))
    writeU64(f, uint64(es[i].bs.len))
    writeExact(f, ps)
    writeExact(f, es[i].bs)
    i.inc

proc readBundle*(b: string): seq[BundleEntry] =
  ## b: bundle file to deserialize.
  var
    f: File
    m: string = newString(BundleMagic.len)
    l: uint32
    i: uint32 = 0
    pLen: uint32
    bLen: uint64
    ps: seq[byte]
    bs: seq[byte]
    rs: seq[BundleEntry] = @[]
  if not fileExists(b):
    raise newException(IOError, "bundle does not exist: " & b)
  if not open(f, b, fmRead):
    raise newException(IOError, "unable to open bundle: " & b)
  defer: f.close()

  if f.readBuffer(addr m[0], BundleMagic.len) != BundleMagic.len:
    raise newException(IOError, "bundle header too short")
  if m != BundleMagic:
    raise newException(IOError, "invalid bundle magic")

  l = readU32(f)
  while i < l:
    pLen = readU32(f)
    bLen = readU64(f)

    ps = newSeq[byte](int(pLen))
    bs = newSeq[byte](int(bLen))
    readExact(f, ps)
    readExact(f, bs)

    rs.add(BundleEntry(rPath: stringFromBytes(ps), bs: bs))
    i.inc
  result = rs

proc extractBundle*(b, o: string) =
  ## b: bundle file path.
  ## o: output directory.
  var
    es: seq[BundleEntry] = readBundle(b)
    i: int = 0
    p: string
    d: string
  createDir(o)
  while i < es.len:
    p = joinPath(o, es[i].rPath.replace('/', DirSep))
    d = parentDir(p)
    if d.len > 0:
      createDir(d)
    writeFile(p, stringFromBytes(es[i].bs))
    i.inc
