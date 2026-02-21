# ==================================================================
# | webui default titlebar app                                      |
# |-----------------------------------------------------------------|
# | nim-webui window with default titlebar variant and login/menu   |
# ==================================================================

import ../shared/webui_shell

const
  AppName = "ViableNimUIs - WebUI (Default Titlebar)"

when isMainModule:
  runWebUi(WebUiConfig(appName: AppName, useCustomTitlebar: false))
