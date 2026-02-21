# ==================================================================
# | webui custom titlebar app                                       |
# |-----------------------------------------------------------------|
# | nim-webui window with custom HTML titlebar variant and login UI |
# ==================================================================

import ../shared/webui_shell

const
  AppName = "ViableNimUIs - WebUI (Custom Titlebar)"

when isMainModule:
  runWebUi(WebUiConfig(appName: AppName, useCustomTitlebar: true))
