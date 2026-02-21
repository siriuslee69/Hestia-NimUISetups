# ==================================================================
# | webui custom titlebar app                                       |
# |-----------------------------------------------------------------|
# | nim-webui window using local web files from customTitlebar/web  |
# ==================================================================

import std/os
import webuiEnhanced/shared/webui_shell
import webuiEnhanced

const
  AppName = "Hestia-NimUISetups - WebUI (Custom Titlebar)"

proc resolveWebRoot(): string =
  result = joinPath(currentSourcePath().splitFile.dir, "web")

proc resolveConfigPath(): string =
  ## resolves local path to markdown config for this example variant.
  result = joinPath(currentSourcePath().splitFile.dir, "config.md")

when isMainModule:
  let cfg = enhance(resolveConfigPath())
  runWebUi(WebUiConfig(
    appName: AppName,
    webRoot: resolveWebRoot(),
    forceWebView: cfg.forceWebView,
    frameless: cfg.disableTitlebar,
    transparent: cfg.disableTitlebar,
    bindWindowButtons: (cfg.bindWindowButtons and cfg.disableTitlebar),
    disableBrowserPrompts: (cfg.disablePasswordPopup or cfg.disableTranslationPopup),
    browserOrderNames: cfg.favoriteBrowsers,
    connectTimeoutSeconds: cfg.connectTimeoutSeconds
  ))

