# ===================================================================
# | illwill enhance                                                  |
# |------------------------------------------------------------------|
# | Illwill-specific enhancement config defaults and parser binding  |
# ===================================================================

import lib/level0/config_source_parser

type
  IllwillEnhanceConfig* = object
    disableTitlebar*: bool
    fullScreen*: bool

proc defaultIllwillEnhanceConfig*(): IllwillEnhanceConfig =
  ## Returns framework defaults used when config file is missing or incomplete.
  result.disableTitlebar = false
  result.fullScreen = true

proc enhance*(pathOfConfig: string): IllwillEnhanceConfig =
  ## pathOfConfig: path to config.md (or config.json fallback) for illwill examples.
  ## Parses UI-enhancer settings and returns Illwill-ready config values.
  var
    cfg: IllwillEnhanceConfig = defaultIllwillEnhanceConfig()
    n = loadConfigNode(pathOfConfig)

  cfg.disableTitlebar = asBoolOr(
    pickNode(n, [
      "disable_titlebar",
      "disableTitlebar",
      "disable titlebar"
    ]),
    cfg.disableTitlebar
  )

  cfg.fullScreen = asBoolOr(
    pickNode(n, [
      "full_screen",
      "fullScreen",
      "full screen"
    ]),
    cfg.fullScreen
  )

  result = cfg
