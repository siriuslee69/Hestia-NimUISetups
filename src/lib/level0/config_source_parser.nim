# ======================================================================
# | config source parser                                                |
# |---------------------------------------------------------------------|
# | Small helpers to read JSON/JSONC config from a markdown code block  |
# ======================================================================

import std/[json, os, strutils]

proc stripJsonLineComments(a: string): string =
  ## a: JSON or JSONC text.
  ## Removes `//` comments while preserving content inside strings.
  var
    inString: bool = false
    escaped: bool = false
    i: int = 0
    line: string = ""

  while i < a.len:
    let c = a[i]

    if c == '\n':
      result.add(line)
      result.add('\n')
      line.setLen(0)
      escaped = false
      i.inc
      continue

    if inString:
      line.add(c)
      if escaped:
        escaped = false
      elif c == '\\':
        escaped = true
      elif c == '"':
        inString = false
      i.inc
      continue

    if c == '"':
      inString = true
      line.add(c)
      i.inc
      continue

    if c == '/' and i + 1 < a.len and a[i + 1] == '/':
      while i < a.len and a[i] != '\n':
        i.inc
      continue

    line.add(c)
    i.inc

  result.add(line)

proc parseJsonOrEmpty(a: string): JsonNode =
  ## a: JSON content string that may be invalid.
  try:
    result = parseJson(stripJsonLineComments(a))
  except JsonParsingError:
    result = newJObject()

proc extractJsonCodeBlock*(a: string): string =
  ## a: markdown text that may contain a ```json fenced code block.
  var
    inFence: bool = false
    isJsonFence: bool = false
    ts: seq[string] = @[]

  for t0 in a.splitLines():
    let t1 = t0.strip()
    if t1.startsWith("```"):
      if not inFence:
        inFence = true
        let lang = t1[3 .. ^1].strip().toLowerAscii()
        isJsonFence = (lang == "json" or lang == "jsonc")
        ts.setLen(0)
      else:
        if isJsonFence and ts.len > 0:
          return ts.join("\n")
        inFence = false
        isJsonFence = false
        ts.setLen(0)
      continue

    if inFence and isJsonFence:
      ts.add(t0)

  result = ""

proc loadConfigNode*(pathOfConfig: string): JsonNode =
  ## pathOfConfig: absolute or relative path to config.md.
  ## Returns an empty JSON object on missing file or parse failure.
  if not fileExists(pathOfConfig):
    return newJObject()

  let
    ext = splitFile(pathOfConfig).ext.toLowerAscii()
    raw = readFile(pathOfConfig)
    trimmed = raw.strip()

  if ext == ".md":
    let jsonBlock = extractJsonCodeBlock(raw)
    if jsonBlock.len > 0:
      return parseJsonOrEmpty(jsonBlock)
    if trimmed.len > 0 and (trimmed[0] == '{' or trimmed[0] == '['):
      return parseJsonOrEmpty(trimmed)
    return newJObject()

  result = parseJsonOrEmpty(raw)

proc pickNode*(n: JsonNode; keys: openArray[string]): JsonNode =
  ## n: root JSON object.
  ## keys: prioritized key aliases to probe.
  if n.kind != JObject:
    return nil
  for k in keys:
    if n.hasKey(k):
      return n[k]
  result = nil

proc asBoolOr*(n: JsonNode; d: bool): bool =
  ## n: JSON node to read as bool.
  ## d: default value.
  if n.isNil:
    return d
  case n.kind
  of JBool:
    result = n.getBool()
  of JString:
    let t0 = n.getStr().strip().toLowerAscii()
    if t0 in ["1", "true", "yes", "on"]:
      result = true
    elif t0 in ["0", "false", "no", "off"]:
      result = false
    else:
      result = d
  of JInt:
    result = n.getInt() != 0
  else:
    result = d

proc asIntOr*(n: JsonNode; d: int): int =
  ## n: JSON node to read as int.
  ## d: default value.
  if n.isNil:
    return d
  case n.kind
  of JInt:
    result = n.getInt()
  of JString:
    try:
      result = parseInt(n.getStr().strip())
    except ValueError:
      result = d
  else:
    result = d

proc asStringSeqOr*(n: JsonNode; d: seq[string]): seq[string] =
  ## n: JSON node to read as string list.
  ## d: default value.
  if n.isNil:
    return d

  case n.kind
  of JArray:
    for x in n.elems:
      case x.kind
      of JString:
        let t0 = x.getStr().strip()
        if t0.len > 0:
          result.add(t0)
      else:
        discard
  of JString:
    for t0 in n.getStr().split(','):
      let t1 = t0.strip()
      if t1.len > 0:
        result.add(t1)
  else:
    discard

  if result.len == 0:
    result = d

proc asStringOr*(n: JsonNode; d: string): string =
  ## n: JSON node to read as string.
  ## d: default value.
  if n.isNil:
    return d
  case n.kind
  of JString:
    let t0 = n.getStr().strip()
    if t0.len > 0:
      result = t0
    else:
      result = d
  else:
    result = d
