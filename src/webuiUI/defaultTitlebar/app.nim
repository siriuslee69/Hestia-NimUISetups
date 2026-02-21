# ==================================================================
# | webui default titlebar app                                      |
# |-----------------------------------------------------------------|
# | nim-webui window using local web files from defaultTitlebar/web |
# ==================================================================

import std/os
import ../shared/webui_shell

const
  AppName = "ViableNimUIs - WebUI (Default Titlebar)"

proc resolveWebRoot(): string =
  result = joinPath(currentSourcePath().splitFile.dir, "web")

when isMainModule:
  runWebUi(WebUiConfig(appName: AppName, webRoot: resolveWebRoot()))
