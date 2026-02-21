# =====================================================================
# | owlkettle enhance                                                  |
# |--------------------------------------------------------------------|
# | Owlkettle-specific enhancement config defaults and parser binding  |
# =====================================================================

import lib/level0/config_source_parser

type
  OwlkettleEnhanceConfig* = object
    disableTitlebar*: bool
    useThemeStylesheet*: bool
    disableStretchingBoxes*: bool

proc defaultOwlkettleEnhanceConfig*(): OwlkettleEnhanceConfig =
  ## Returns framework defaults used when config file is missing or incomplete.
  result.disableTitlebar = false
  result.useThemeStylesheet = true
  result.disableStretchingBoxes = true

proc enhance*(pathOfConfig: string): OwlkettleEnhanceConfig =
  ## pathOfConfig: path to config.md (or config.json fallback) for owlkettle examples.
  ## Parses UI-enhancer settings and returns Owlkettle-ready config values.
  var
    cfg: OwlkettleEnhanceConfig = defaultOwlkettleEnhanceConfig()
    n = loadConfigNode(pathOfConfig)

  cfg.disableTitlebar = asBoolOr(
    pickNode(n, [
      "disable_titlebar",
      "disableTitlebar",
      "disable titlebar"
    ]),
    cfg.disableTitlebar
  )

  cfg.useThemeStylesheet = asBoolOr(
    pickNode(n, [
      "use_theme_stylesheet",
      "useThemeStylesheet",
      "use theme stylesheet"
    ]),
    cfg.useThemeStylesheet
  )

  cfg.disableStretchingBoxes = asBoolOr(
    pickNode(n, [
      "disable_stretching_boxes",
      "disableStretchingBoxes",
      "disable stretching boxes",
      "disable_stretch_layout",
      "disableStretchLayout"
    ]),
    cfg.disableStretchingBoxes
  )

  result = cfg
