# =================================================================
# | owlkettle ui helpers                                           |
# |----------------------------------------------------------------|
# | Shared state helper functions and stylesheet path resolution    |
# =================================================================

import std/[os]

const
  OwlPageNames* = ["Overview", "Controls", "Docs"]

proc resolveStylesheetPath*(): string =
  ## resolves local path to copied Maya white GTK stylesheet.
  var
    t0: string = getAppDir()
    ts: seq[string] = @[
      "assets/themes/theme_white.css",
      "../assets/themes/theme_white.css",
      "../../assets/themes/theme_white.css",
      "../../../assets/themes/theme_white.css",
      joinPath(t0, "assets", "themes", "theme_white.css"),
      joinPath(t0, "..", "assets", "themes", "theme_white.css"),
      joinPath(t0, "..", "..", "assets", "themes", "theme_white.css"),
      joinPath(t0, "..", "..", "..", "assets", "themes", "theme_white.css")
    ]
    t: string
  for t in ts:
    if fileExists(t):
      return t
  result = ""

proc presetToSliderValue*(i: int): float =
  ## i: preset index coming from DropDown selection.
  case i
  of 0:
    result = 15.0
  of 1:
    result = 50.0
  of 2:
    result = 85.0
  else:
    result = 42.0
