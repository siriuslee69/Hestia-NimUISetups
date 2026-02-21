# ======================================================================
# | illwill tui app                                                     |
# |---------------------------------------------------------------------|
# | Terminal UI with login gate, left-side menu, slider page, and docs  |
# ======================================================================

import std/[strutils]
import illwill
import ../lib/level0/auth

const
  AppName = "ViableNimUIs - Illwill"

type
  UiPhase = enum
    upLoginName,
    upLoginPassword,
    upMain

  UiState = object
    phase: UiPhase
    loginName: string
    loginPassword: string
    loginError: string
    pageIndex: int
    sliderValue: int
    running: bool

proc initState(): UiState =
  result.phase = upLoginName
  result.loginName = ""
  result.loginPassword = ""
  result.loginError = ""
  result.pageIndex = 0
  result.sliderValue = 42
  result.running = true

proc keyToChar(k: Key): tuple[ok: bool, c: char] =
  ## k: illwill key event.
  var
    t0: string = $k
  if t0.len == 1 and t0[0].isAlphaNumeric:
    result.ok = true
    result.c = t0[0].toLowerAscii()
    return
  if k == Key.Space:
    result.ok = true
    result.c = ' '
    return
  result.ok = false

proc clipLine(a: string; l: int): string =
  ## a: line text to clip.
  ## l: max number of characters to keep.
  if l <= 0:
    return ""
  if a.len <= l:
    return a
  result = a[0 ..< l]

proc safeWrite(b: var TerminalBuffer; x, y: int; a: string) =
  ## b: terminal buffer to write into.
  ## x: x-axis write position.
  ## y: y-axis write position.
  ## a: line text to write.
  var
    w: int = int(b.width)
    h: int = int(b.height)
    t0: string
  if x < 0 or y < 0:
    return
  if x >= w or y >= h:
    return
  t0 = clipLine(a, w - x)
  b.write(x.Natural, y.Natural, t0)

proc popLast(a: var string) =
  ## a: string that loses one trailing rune-like byte.
  if a.len > 0:
    a.setLen(a.len - 1)

proc sliderBar(v, l: int): string =
  ## v: slider percentage [0..100].
  ## l: total bar slots.
  var
    f: int
    i: int = 0
    t0: string = "["
  f = (v * l) div 100
  while i < l:
    if i < f:
      t0.add("#")
    else:
      t0.add("-")
    i.inc
  t0.add("]")
  result = t0

proc drawLogin(b: var TerminalBuffer; s: UiState) =
  ## b: target terminal buffer.
  ## s: state to render.
  var
    pw: string = repeat('*', s.loginPassword.len)
    c0: string
    c1: string
  c0 = if s.phase == upLoginName: "<" else: " "
  c1 = if s.phase == upLoginPassword: "<" else: " "

  safeWrite(b, 2, 1, AppName)
  safeWrite(b, 2, 3, "Login (test / test)")
  safeWrite(b, 2, 5, c0 & " Name: " & s.loginName)
  safeWrite(b, 2, 6, c1 & " Pass: " & pw)
  safeWrite(b, 2, 8, "Enter: next/submit | Tab: switch input | Backspace: delete | Esc: quit")
  safeWrite(b, 2, 10, s.loginError)

proc drawOverviewPage(b: var TerminalBuffer; s: UiState) =
  ## b: target terminal buffer.
  ## s: state to render.
  safeWrite(b, 30, 4, "Overview")
  safeWrite(b, 30, 6, "Signed in as: " & s.loginName)
  safeWrite(b, 30, 7, "Use the left menu keys to switch pages.")

proc drawControlsPage(b: var TerminalBuffer; s: UiState) =
  ## b: target terminal buffer.
  ## s: state to render.
  safeWrite(b, 30, 4, "Controls")
  safeWrite(b, 30, 6, "Slider: " & $s.sliderValue)
  safeWrite(b, 30, 7, sliderBar(s.sliderValue, 30))
  safeWrite(b, 30, 9, "Left/Right arrows change slider value.")

proc drawDocsPage(b: var TerminalBuffer) =
  ## b: target terminal buffer.
  safeWrite(b, 30, 4, "Docs")
  safeWrite(b, 30, 6, "This TUI is state-driven with one render pass per key event.")
  safeWrite(b, 30, 7, "It mirrors the same login/menu/page concept as webui/owlkettle.")
  safeWrite(b, 30, 8, "Slider page uses ASCII bar rendering for terminal compatibility.")

proc drawMain(b: var TerminalBuffer; s: UiState) =
  ## b: target terminal buffer.
  ## s: state to render.
  safeWrite(b, 2, 1, AppName)
  safeWrite(b, 2, 3, "Menu")
  safeWrite(b, 2, 4, "1) Overview")
  safeWrite(b, 2, 5, "2) Controls")
  safeWrite(b, 2, 6, "3) Docs")
  safeWrite(b, 2, 8, "L: logout")
  safeWrite(b, 2, 9, "Q/Esc: quit")

  case s.pageIndex
  of 0:
    drawOverviewPage(b, s)
  of 1:
    drawControlsPage(b, s)
  else:
    drawDocsPage(b)

proc applyTextKey(a: var string; k: Key) =
  ## a: destination text buffer.
  ## k: illwill key event.
  var
    t0: tuple[ok: bool, c: char]
  t0 = keyToChar(k)
  if t0.ok:
    a.add(t0.c)

proc submitLogin(s: var UiState) =
  ## s: ui state being validated.
  if isValidLogin(s.loginName, s.loginPassword):
    s.phase = upMain
    s.pageIndex = 0
    s.loginError = ""
  else:
    s.loginError = "invalid credentials"
    s.loginPassword = ""
    s.phase = upLoginPassword

proc handleLoginKey(s: var UiState; k: Key) =
  ## s: ui state to mutate.
  ## k: illwill key event.
  if k == Key.Escape:
    s.running = false
    return

  if k == Key.Tab:
    if s.phase == upLoginName:
      s.phase = upLoginPassword
    else:
      s.phase = upLoginName
    return

  if k == Key.Enter:
    if s.phase == upLoginName:
      s.phase = upLoginPassword
    else:
      submitLogin(s)
    return

  if k == Key.Backspace:
    if s.phase == upLoginName:
      popLast(s.loginName)
    else:
      popLast(s.loginPassword)
    return

  if s.phase == upLoginName:
    applyTextKey(s.loginName, k)
  else:
    applyTextKey(s.loginPassword, k)

proc handleMainKey(s: var UiState; k: Key) =
  ## s: ui state to mutate.
  ## k: illwill key event.
  if k == Key.Escape or k == Key.Q:
    s.running = false
    return

  if k == Key.L:
    s.phase = upLoginName
    s.loginPassword = ""
    s.loginError = ""
    return

  if k == Key.One:
    s.pageIndex = 0
    return

  if k == Key.Two:
    s.pageIndex = 1
    return

  if k == Key.Three:
    s.pageIndex = 2
    return

  if s.pageIndex == 1 and k == Key.Left:
    s.sliderValue = max(0, s.sliderValue - 2)
    return

  if s.pageIndex == 1 and k == Key.Right:
    s.sliderValue = min(100, s.sliderValue + 2)

proc drawUi(b: var TerminalBuffer; s: UiState) =
  ## b: target terminal buffer.
  ## s: state to render.
  b.clear()
  if s.phase == upMain:
    drawMain(b, s)
  else:
    drawLogin(b, s)

proc ensureBufferSize(b: var TerminalBuffer) =
  ## b: terminal buffer resized to current terminal dimensions.
  var
    w: int = max(90, terminalWidth())
    h: int = max(30, terminalHeight())
  if w == int(b.width) and h == int(b.height):
    return
  b = newTerminalBuffer(w, h)

proc runApp() =
  var
    s: UiState = initState()
    b: TerminalBuffer = newTerminalBuffer(max(90, terminalWidth()), max(30, terminalHeight()))
    k: Key
  while s.running:
    ensureBufferSize(b)
    drawUi(b, s)
    display(b)
    k = getKey()
    if k == Key.None:
      continue
    if s.phase == upMain:
      handleMainKey(s, k)
    else:
      handleLoginKey(s, k)

proc main() =
  illwillInit(fullScreen = true)
  try:
    hideCursor()
    runApp()
  finally:
    showCursor()
    illwillDeinit()

when isMainModule:
  main()
