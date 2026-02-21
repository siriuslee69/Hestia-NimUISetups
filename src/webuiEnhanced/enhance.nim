# ==================================================================
# | webui enhance                                                   |
# |-----------------------------------------------------------------|
# | WebUI-specific enhancement config defaults and parser binding   |
# ==================================================================

import std/[strutils]
import lib/level0/config_source_parser

type
  WebUiEnhanceConfig* = object
    disableTitlebar*: bool
    disablePasswordPopup*: bool
    disableTranslationPopup*: bool
    favoriteBrowsers*: seq[string]
    forceWebView*: bool
    connectTimeoutSeconds*: int
    bindWindowButtons*: bool

proc defaultWebUiEnhanceConfig*(): WebUiEnhanceConfig =
  ## Returns framework defaults used when config file is missing or incomplete.
  result.disableTitlebar = false
  result.disablePasswordPopup = true
  result.disableTranslationPopup = true
  result.favoriteBrowsers = @[
    "webview",
    "edge",
    "chrome",
    "firefox",
    "chromium",
    "brave",
    "vivaldi",
    "opera",
    "yandex",
    "epic",
    "chromiumBased",
    "any"
  ]
  result.forceWebView = false
  result.connectTimeoutSeconds = 3
  result.bindWindowButtons = true

proc normalizeBrowsers(a: seq[string]): seq[string] =
  ## a: parsed browser names from config.
  for t0 in a:
    let t1 = t0.strip()
    if t1.len > 0:
      result.add(t1)

proc enhance*(pathOfConfig: string): WebUiEnhanceConfig =
  ## pathOfConfig: path to config.md (or config.json fallback) for webui examples.
  ## Parses UI-enhancer settings and returns WebUI-ready config values.
  var
    cfg: WebUiEnhanceConfig = defaultWebUiEnhanceConfig()
    n = loadConfigNode(pathOfConfig)

  cfg.disableTitlebar = asBoolOr(
    pickNode(n, [
      "disable_titlebar",
      "disableTitlebar",
      "disable titlebar"
    ]),
    cfg.disableTitlebar
  )

  cfg.disablePasswordPopup = asBoolOr(
    pickNode(n, [
      "disable_password_popup",
      "disablePasswordPopup",
      "disable password popup"
    ]),
    cfg.disablePasswordPopup
  )

  cfg.disableTranslationPopup = asBoolOr(
    pickNode(n, [
      "disable_translation_popup",
      "disableTranslationPopup",
      "disable translation popup"
    ]),
    cfg.disableTranslationPopup
  )

  cfg.favoriteBrowsers = normalizeBrowsers(asStringSeqOr(
    pickNode(n, [
      "favorite_browsers",
      "favoriteBrowsers",
      "favorite browsers"
    ]),
    cfg.favoriteBrowsers
  ))

  cfg.forceWebView = asBoolOr(
    pickNode(n, [
      "force_webview",
      "forceWebView",
      "force webview"
    ]),
    cfg.forceWebView
  )

  cfg.connectTimeoutSeconds = asIntOr(
    pickNode(n, [
      "connect_timeout_seconds",
      "connectTimeoutSeconds",
      "connect timeout seconds"
    ]),
    cfg.connectTimeoutSeconds
  )
  if cfg.connectTimeoutSeconds < 1:
    cfg.connectTimeoutSeconds = 1
  if cfg.connectTimeoutSeconds > 30:
    cfg.connectTimeoutSeconds = 30

  cfg.bindWindowButtons = asBoolOr(
    pickNode(n, [
      "bind_window_buttons",
      "bindWindowButtons",
      "bind window buttons"
    ]),
    cfg.bindWindowButtons
  )

  result = cfg
