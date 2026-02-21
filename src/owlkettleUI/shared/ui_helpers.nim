# =================================================================
# | owlkettle ui helpers                                           |
# |----------------------------------------------------------------|
# | Shared state helper functions and stylesheet path resolution    |
# =================================================================

import std/[os]

const
  OwlPageNames* = ["Overview", "Workspace", "Metrics", "Docs / Notes"]
  OwlDefaultPageTaglines* = [
    "Atlas-style multi-column workspace layout.",
    "Wide canvas + side inspector and queues.",
    "Operational metrics and slider controls.",
    "Implementation notes and page wiring."
  ]
  OwlCustomPageTaglines* = [
    "Custom-titlebar dashboard with Atlas-like grid.",
    "Board + properties + split queues.",
    "Operational performance and controls.",
    "Implementation notes and file structure."
  ]

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

proc pageTitle*(i: int): string =
  ## i: selected page index.
  if i >= 0 and i < OwlPageNames.len:
    result = OwlPageNames[i]
  else:
    result = OwlPageNames[^1]

proc pageTaglineDefault*(i: int): string =
  ## i: selected page index.
  if i >= 0 and i < OwlDefaultPageTaglines.len:
    result = OwlDefaultPageTaglines[i]
  else:
    result = OwlDefaultPageTaglines[^1]

proc pageTaglineCustom*(i: int): string =
  ## i: selected page index.
  if i >= 0 and i < OwlCustomPageTaglines.len:
    result = OwlCustomPageTaglines[i]
  else:
    result = OwlCustomPageTaglines[^1]
