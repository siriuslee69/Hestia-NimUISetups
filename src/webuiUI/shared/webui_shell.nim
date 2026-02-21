# ===============================================================
# | webui desktop shell                                          |
# |--------------------------------------------------------------|
# | Runs nim-webui using external per-variant HTML/CSS/JS files  |
# ===============================================================

import std/[os, strutils]
import webui

type
  WebUiConfig* = object
    appName*: string
    webRoot*: string

proc parseBrowserName(a: string): Browsers =
  ## a: optional browser name from environment variable.
  let t = a.toLowerAscii()
  case t
  of "chrome":
    result = Browsers.Chrome
  of "edge":
    result = Browsers.Edge
  of "firefox":
    result = Browsers.Firefox
  of "chromium":
    result = Browsers.Chromium
  of "brave":
    result = Browsers.Brave
  of "vivaldi":
    result = Browsers.Vivaldi
  of "chromiumbased", "chromium_based", "chromium-based":
    result = Browsers.ChromiumBased
  of "any", "":
    result = Browsers.Any
  else:
    result = Browsers.ChromiumBased

proc runWebUi*(c: WebUiConfig) =
  ## c: webui app configuration.
  var
    w: Window
    ok: bool
    rootOk: bool
    b: Browsers

  if not dirExists(c.webRoot):
    raise newException(IOError, "web root does not exist: " & c.webRoot)

  w = newWindow()
  w.size = (1360, 900)
  setTimeout(0)

  rootOk = (w.rootFolder = c.webRoot)
  if not rootOk:
    raise newException(IOError, "unable to set web root: " & c.webRoot)

  b = parseBrowserName(getEnv("VNIM_WEBUI_BROWSER", "chromiumBased"))
  ok = w.show("index.html", b)

  if not ok:
    echo "Unable to open a browser via nim-webui for: ", c.appName
    echo "Browser target: ", $b
    echo "Web root: ", c.webRoot
    echo "Set VNIM_WEBUI_BROWSER to one of: chromiumBased, chrome, edge, firefox, chromium, brave, vivaldi, any"
    clean()
    return

  wait()
  clean()
