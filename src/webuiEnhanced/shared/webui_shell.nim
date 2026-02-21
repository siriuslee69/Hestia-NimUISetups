# ===============================================================
# | webui desktop shell                                          |
# |--------------------------------------------------------------|
# | Runs nim-webui using external per-variant HTML/CSS/JS files  |
# ===============================================================

import std/[os, strutils]
import webui
from webui/bindings import
  set_custom_parameters,
  minimize,
  maximize,
  set_center,
  set_frameless,
  set_transparent,
  get_hwnd,
  win32_get_hwnd

type
  WebUiConfig* = object
    appName*: string
    webRoot*: string
    forceWebView*: bool = false
    frameless*: bool = false
    transparent*: bool = false
    bindWindowButtons*: bool = false
    disableBrowserPrompts*: bool = true
    browserOrderNames*: seq[string] = @[]
    connectTimeoutSeconds*: int = 0

const
  DefaultBrowserParams = "--disable-features=Translate,AutofillServerCommunication,PasswordManagerOnboarding --disable-save-password-bubble --disable-translate"

when defined(windows):
  type
    Hwnd = pointer

  const
    SwMinimize = 6.cint
    SwMaximize = 3.cint
    SwRestore = 9.cint
    DwmwaBorderColor = 34.cuint
    DwmColorNone = 0xFFFFFFFE'u32

  proc isZoomed(hwnd: Hwnd): int32 {.
      stdcall, dynlib: "user32", importc: "IsZoomed".}
  proc showWindowNative(hwnd: Hwnd; cmd: cint): cint {.
      stdcall, dynlib: "user32", importc: "ShowWindow".}
  proc dwmSetWindowAttribute(hwnd: Hwnd; attr: cuint; value: pointer; valueSize: cuint): int32 {.
      stdcall, dynlib: "dwmapi", importc: "DwmSetWindowAttribute".}

proc toggleWindowMaximize(w: Window): bool =
  ## w: webui window handle.
  when defined(windows):
    var hwnd = win32_get_hwnd(csize_t(w))
    if hwnd == nil:
      hwnd = get_hwnd(csize_t(w))
    if hwnd == nil:
      maximize(csize_t(w))
      return true
    if isZoomed(cast[Hwnd](hwnd)) != 0'i32:
      discard showWindowNative(cast[Hwnd](hwnd), SwRestore)
      return false
    discard showWindowNative(cast[Hwnd](hwnd), SwMaximize)
    return true
  else:
    maximize(csize_t(w))
    result = true

proc minimizeWindow(w: Window) =
  ## w: webui window handle.
  when defined(windows):
    var hwnd = win32_get_hwnd(csize_t(w))
    if hwnd == nil:
      hwnd = get_hwnd(csize_t(w))
    if hwnd == nil:
      minimize(csize_t(w))
      return
    discard showWindowNative(cast[Hwnd](hwnd), SwMinimize)
  else:
    minimize(csize_t(w))

when defined(windows):
  proc applyFramelessWindowsTweaks(w: Window; c: WebUiConfig) =
    ## w: webui window handle.
    ## c: window configuration.
    if not c.frameless:
      return

    var hwnd: pointer = nil
    for _ in 0 ..< 40:
      hwnd = win32_get_hwnd(csize_t(w))
      if hwnd == nil:
        hwnd = get_hwnd(csize_t(w))
      if hwnd != nil:
        break
      sleep(15)
    if hwnd == nil:
      return

    var borderColor: uint32 = DwmColorNone
    discard dwmSetWindowAttribute(
      cast[Hwnd](hwnd),
      DwmwaBorderColor,
      addr borderColor,
      cuint(sizeof(borderColor))
    )
else:
  proc applyFramelessWindowsTweaks(w: Window; c: WebUiConfig) =
    ## w: webui window handle.
    ## c: window configuration.
    discard

proc parseBrowserName(a: string): WebuiBrowser =
  ## a: optional browser name from environment variable.
  let t = a.toLowerAscii()
  case t
  of "chrome":
    result = WebuiBrowser.wbChrome
  of "edge":
    result = WebuiBrowser.wbEdge
  of "firefox":
    result = WebuiBrowser.wbFirefox
  of "chromium":
    result = WebuiBrowser.wbChromium
  of "brave":
    result = WebuiBrowser.wbBrave
  of "vivaldi":
    result = WebuiBrowser.wbVivaldi
  of "opera":
    result = WebuiBrowser.wbOpera
  of "yandex":
    result = WebuiBrowser.wbYandex
  of "epic":
    result = WebuiBrowser.wbEpic
  of "webview", "wv":
    result = WebuiBrowser.wbWebview
  of "chromiumbased", "chromium_based", "chromium-based":
    result = WebuiBrowser.wbChromiumBased
  of "any":
    result = WebuiBrowser.wbAnyBrowser
  of "":
    result = WebuiBrowser.wbNoBrowser
  else:
    result = WebuiBrowser.wbNoBrowser

proc addBrowserIfMissing(bs: var seq[WebuiBrowser], b: WebuiBrowser) =
  ## bs: browser fallback list to append to.
  ## b: browser value to add if not already present.
  for x in bs:
    if x == b:
      return
  bs.add(b)

proc resolveBrowserOrder(pref: string): seq[WebuiBrowser] =
  ## pref: optional preferred browser from environment variable.
  var
    bs: seq[WebuiBrowser] = @[]
    p: WebuiBrowser = parseBrowserName(pref)
    ts: seq[WebuiBrowser] = @[
      WebuiBrowser.wbWebview,
      WebuiBrowser.wbEdge,
      WebuiBrowser.wbChrome,
      WebuiBrowser.wbFirefox,
      WebuiBrowser.wbChromium,
      WebuiBrowser.wbBrave,
      WebuiBrowser.wbVivaldi,
      WebuiBrowser.wbOpera,
      WebuiBrowser.wbYandex,
      WebuiBrowser.wbEpic,
      WebuiBrowser.wbChromiumBased,
      WebuiBrowser.wbAnyBrowser
    ]

  addBrowserIfMissing(bs, WebuiBrowser.wbWebview)
  if p != WebuiBrowser.wbWebview and p != WebuiBrowser.wbNoBrowser:
    addBrowserIfMissing(bs, p)
  for b in ts:
    addBrowserIfMissing(bs, b)
  result = bs

proc resolveBrowserOrderFromNames(ns: seq[string]): seq[WebuiBrowser] =
  ## ns: browser names parsed from user config, kept in given order.
  var
    bs: seq[WebuiBrowser] = @[]
    ts: seq[WebuiBrowser] = @[
      WebuiBrowser.wbWebview,
      WebuiBrowser.wbEdge,
      WebuiBrowser.wbChrome,
      WebuiBrowser.wbFirefox,
      WebuiBrowser.wbChromium,
      WebuiBrowser.wbBrave,
      WebuiBrowser.wbVivaldi,
      WebuiBrowser.wbOpera,
      WebuiBrowser.wbYandex,
      WebuiBrowser.wbEpic,
      WebuiBrowser.wbChromiumBased,
      WebuiBrowser.wbAnyBrowser
    ]

  for n in ns:
    let b = parseBrowserName(n)
    if b != WebuiBrowser.wbNoBrowser:
      addBrowserIfMissing(bs, b)

  if bs.len == 0:
    return resolveBrowserOrder(getEnv("VNIM_WEBUI_BROWSER", ""))

  for b in ts:
    addBrowserIfMissing(bs, b)
  result = bs

proc parseConnectTimeoutSeconds(v: string): int =
  ## v: optional timeout value from environment variable.
  if v.len == 0:
    return 3
  try:
    result = parseInt(v)
  except ValueError:
    result = 3
  if result < 1:
    result = 1
  if result > 30:
    result = 30

proc hasAnyExe(ts: seq[string]): bool =
  ## ts: executable names to probe on PATH.
  for t in ts:
    if findExe(t).len > 0:
      return true
  result = false

proc browserAvailableByExe(b: WebuiBrowser): bool =
  ## b: browser enum to probe using local executable names.
  case b
  of WebuiBrowser.wbWebview:
    result = true
  of WebuiBrowser.wbEdge:
    result = hasAnyExe(@["msedge.exe", "msedge"])
  of WebuiBrowser.wbChrome:
    result = hasAnyExe(@["chrome.exe", "chrome", "google-chrome", "google-chrome-stable"])
  of WebuiBrowser.wbFirefox:
    result = hasAnyExe(@["firefox.exe", "firefox"])
  of WebuiBrowser.wbChromium:
    result = hasAnyExe(@["chromium.exe", "chromium", "chromium-browser"])
  of WebuiBrowser.wbBrave:
    result = hasAnyExe(@["brave.exe", "brave", "brave-browser"])
  of WebuiBrowser.wbVivaldi:
    result = hasAnyExe(@["vivaldi.exe", "vivaldi"])
  of WebuiBrowser.wbOpera:
    result = hasAnyExe(@["opera.exe", "opera"])
  of WebuiBrowser.wbYandex:
    result = hasAnyExe(@["yandex.exe", "yandex-browser"])
  of WebuiBrowser.wbEpic:
    result = hasAnyExe(@["epic.exe", "epic-browser"])
  of WebuiBrowser.wbAnyBrowser, WebuiBrowser.wbChromiumBased:
    result = true
  else:
    result = false

proc selectBrowserTarget(bs: seq[WebuiBrowser]): WebuiBrowser =
  ## bs: preferred browser order with webview first.
  var
    fallback: WebuiBrowser = WebuiBrowser.wbNoBrowser
  for b in bs:
    case b
    of WebuiBrowser.wbNoBrowser:
      discard
    of WebuiBrowser.wbAnyBrowser, WebuiBrowser.wbChromiumBased:
      if fallback == WebuiBrowser.wbNoBrowser:
        fallback = b
    else:
      if browserAvailableByExe(b):
        return b
  if fallback != WebuiBrowser.wbNoBrowser:
    return fallback
  result = WebuiBrowser.wbAnyBrowser

proc configureBrowserParams(w: Window; c: WebUiConfig) =
  ## w: window handle.
  ## c: shell configuration toggles.
  if not c.disableBrowserPrompts:
    return
  let p = getEnv("VNIM_WEBUI_BROWSER_PARAMS", "").strip()
  if p.len > 0:
    set_custom_parameters(csize_t(w), cstring(p))
  else:
    set_custom_parameters(csize_t(w), cstring(DefaultBrowserParams))

proc bindWindowControls(w: Window) =
  ## w: window handle for minimize/maximize/close callbacks.
  w.bind("win-min", proc() =
    minimizeWindow(w)
  )
  w.bind("win-max", proc() =
    discard toggleWindowMaximize(w)
  )
  w.bind("win-max-toggle", proc(): bool =
    toggleWindowMaximize(w)
  )
  w.bind("win-close", proc() =
    w.close()
  )

proc runWebUi*(c: WebUiConfig) =
  ## c: webui app configuration.
  var
    w: Window
    ok: bool
    rootOk: bool
    bs: seq[WebuiBrowser]
    selected: WebuiBrowser = WebuiBrowser.wbNoBrowser
    timeoutSec: int

  if not dirExists(c.webRoot):
    raise newException(IOError, "web root does not exist: " & c.webRoot)

  w = newWindow()
  w.setSize(1360, 900)
  set_center(csize_t(w))
  timeoutSec = c.connectTimeoutSeconds
  if timeoutSec <= 0:
    timeoutSec = parseConnectTimeoutSeconds(getEnv("VNIM_WEBUI_CONNECT_TIMEOUT", ""))
  else:
    timeoutSec = parseConnectTimeoutSeconds($timeoutSec)
  setTimeout(timeoutSec)
  configureBrowserParams(w, c)
  if c.bindWindowButtons:
    bindWindowControls(w)

  rootOk = (w.rootFolder = c.webRoot)
  if not rootOk:
    raise newException(IOError, "unable to set web root: " & c.webRoot)

  if c.forceWebView:
    selected = WebuiBrowser.wbWebview
  else:
    if c.browserOrderNames.len > 0:
      bs = resolveBrowserOrderFromNames(c.browserOrderNames)
    else:
      bs = resolveBrowserOrder(getEnv("VNIM_WEBUI_BROWSER", ""))
    selected = selectBrowserTarget(bs)

  if selected == WebuiBrowser.wbWebview:
    if c.frameless:
      set_frameless(csize_t(w), true)
    # Transparent frameless WebView can become click-through after maximize on Windows.
    when defined(windows):
      let useTransparent = c.transparent and false
    else:
      let useTransparent = c.transparent
    if useTransparent:
      set_transparent(csize_t(w), true)
    ok = w.showWv("index.html")
    if ok:
      applyFramelessWindowsTweaks(w, c)
  else:
    ok = w.show("index.html", selected)

  if not ok:
    echo "Unable to open a browser via nim-webui for: ", c.appName
    echo "Selected browser target: ", $selected
    echo "Connect timeout per attempt (seconds): ", $timeoutSec
    echo "Web root: ", c.webRoot
    echo "Set VNIM_WEBUI_BROWSER to one of: webview, edge, chrome, firefox, chromium, brave, vivaldi, opera, yandex, epic, chromiumBased, any"
    echo "Optional: set VNIM_WEBUI_CONNECT_TIMEOUT to tune per-attempt timeout."
    clean()
    return

  while w.shown():
    sleep(120)
  clean()
