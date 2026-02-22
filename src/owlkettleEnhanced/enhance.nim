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
    windowsUseExperimentalCustomTitlebar*: bool
    windowsSnapPreviewExperimental*: bool
    windowsUseHybridTopBar*: bool
    windowsNativeTitlebarColor*: string
    windowsNativeTitlebarTextColor*: string

proc defaultOwlkettleEnhanceConfig*(): OwlkettleEnhanceConfig =
  ## Returns framework defaults used when config file is missing or incomplete.
  result.disableTitlebar = false
  result.useThemeStylesheet = true
  result.disableStretchingBoxes = true
  result.windowsUseExperimentalCustomTitlebar = false
  result.windowsSnapPreviewExperimental = false
  result.windowsUseHybridTopBar = true
  result.windowsNativeTitlebarColor = ""
  result.windowsNativeTitlebarTextColor = ""

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

  cfg.windowsUseExperimentalCustomTitlebar = asBoolOr(
    pickNode(n, [
      "windows_use_experimental_custom_titlebar",
      "windowsUseExperimentalCustomTitlebar",
      "windows experimental custom titlebar",
      "experimental_custom_titlebar_windows",
      "experimentalCustomTitlebarWindows"
    ]),
    cfg.windowsUseExperimentalCustomTitlebar
  )

  cfg.windowsSnapPreviewExperimental = asBoolOr(
    pickNode(n, [
      "windows_snap_preview_experimental",
      "windowsSnapPreviewExperimental",
      "windows snap preview experimental",
      "windows_enable_snap_preview_experimental",
      "windowsEnableSnapPreviewExperimental"
    ]),
    cfg.windowsSnapPreviewExperimental
  )

  cfg.windowsUseHybridTopBar = asBoolOr(
    pickNode(n, [
      "windows_use_hybrid_top_bar",
      "windowsUseHybridTopBar",
      "windows hybrid top bar",
      "windows_native_overlay_topbar",
      "windowsNativeOverlayTopbar"
    ]),
    cfg.windowsUseHybridTopBar
  )

  cfg.windowsNativeTitlebarColor = asStringOr(
    pickNode(n, [
      "windows_native_titlebar_color",
      "windowsNativeTitlebarColor",
      "windows titlebar color"
    ]),
    cfg.windowsNativeTitlebarColor
  )

  cfg.windowsNativeTitlebarTextColor = asStringOr(
    pickNode(n, [
      "windows_native_titlebar_text_color",
      "windowsNativeTitlebarTextColor",
      "windows titlebar text color"
    ]),
    cfg.windowsNativeTitlebarTextColor
  )

  result = cfg
