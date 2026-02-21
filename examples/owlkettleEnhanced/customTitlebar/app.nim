# =================================================================================
# | owlkettle custom titlebar app                                                  |
# |--------------------------------------------------------------------------------|
# | Atlas-like dashboard copy with custom HeaderBar and 1:1 page/card composition |
# =================================================================================

import std/os
import owlkettle
import lib/level0/auth
import owlkettleEnhanced/shared/ui_helpers
import owlkettleEnhanced/shared/window_titlebar
import owlkettleEnhanced

const
  AppName = "Hestia-NimUISetups - Owlkettle (Custom Titlebar)"
  CardMinWidth = 220
  CardMinHeight = 110
  CardLargeMinHeight = 180
  LoginCardWidth = 460
  UseWindowHandle = defined(windows)

var
  WindowTitleText = AppName
  UseCustomTitlebar = true
  EnableStretchLayout = false

viewable OwlCustomApp:
  loginName: string = ""
  loginPassword: string = ""
  loginError: string = ""
  loggedIn: bool = false

  pageIndex: int = 0
  sliderValue: float = 42.0
  sliderPresetIndex: int = 1
  sliderPresets: seq[string] = @[
    "Low (15)",
    "Medium (50)",
    "High (85)"
  ]

proc buildTitlebar(): Widget =
  ## builds custom native-draggable titlebar.
  var
    titleWidget: Widget
  titleWidget = gui:
    Box:
      orient = OrientY

      Label:
        text = WindowTitleText
        xAlign = 0

      Label:
        text = "Custom-titlebar dashboard with Atlas-like grid."
        xAlign = 0

  result = gui:
    HeaderBar:
      showTitleButtons = true
      if UseWindowHandle:
        insert(wrapWindowHandle(titleWidget)) {.addTitle.}
      else:
        insert(titleWidget) {.addTitle.}

proc buildStatCard(t, v: string): Widget =
  ## t: card title.
  ## v: card value text.
  result = gui:
    Frame:
      sizeRequest = (CardMinWidth, CardMinHeight)

      Box:
        orient = OrientY
        spacing = 6
        margin = 12

        Label {.expand: false.}:
          text = t
          xAlign = 0

        Label {.expand: false.}:
          text = v
          xAlign = 0

proc buildTextCard(t, d: string; mh: int = CardMinHeight): Widget =
  ## t: card title.
  ## d: card body detail.
  ## mh: minimum card height.
  result = gui:
    Frame:
      sizeRequest = (CardMinWidth, mh)

      Box:
        orient = OrientY
        spacing = 6
        margin = 12

        Label {.expand: false.}:
          text = t
          xAlign = 0

        Label {.expand: false.}:
          text = d
          xAlign = 0
          wrap = true

proc buildRowsCard(t: string; rs: seq[string]; mh: int = CardMinHeight): Widget =
  ## t: card title.
  ## rs: rows rendered as single-line labels.
  ## mh: minimum card height.
  result = gui:
    Frame:
      sizeRequest = (CardMinWidth, mh)

      Box:
        orient = OrientY
        spacing = 6
        margin = 12

        Label {.expand: false.}:
          text = t
          xAlign = 0

        for i in 0 ..< rs.len:
          Label {.expand: false.}:
            text = rs[i]
            xAlign = 0
            wrap = true

proc renderOverviewPage(): Widget =
  ## builds overview page grid.
  result = gui:
    Grid:
      columnSpacing = 12
      rowSpacing = 12
      columnHomogeneous = EnableStretchLayout
      insert(buildStatCard("Shards", "32")) {.x: 0, y: 0, width: 3, hExpand: EnableStretchLayout, vAlign: AlignStart.}
      insert(buildStatCard("Replicas", "64")) {.x: 3, y: 0, width: 3, hExpand: EnableStretchLayout, vAlign: AlignStart.}
      insert(buildStatCard("Incidents", "1")) {.x: 6, y: 0, width: 3, hExpand: EnableStretchLayout, vAlign: AlignStart.}
      insert(buildStatCard("SLA", "99.4%")) {.x: 9, y: 0, width: 3, hExpand: EnableStretchLayout, vAlign: AlignStart.}

      insert(buildTextCard("Flow Map", "Big center area placeholder for graph/canvas.", CardLargeMinHeight)) {.x: 0, y: 1, width: 8, hExpand: EnableStretchLayout, vAlign: AlignStart.}
      insert(buildRowsCard("Quick Ops", @[
        "Drain",
        "Shift",
        "Repair"
      ])) {.x: 8, y: 1, width: 4, hExpand: EnableStretchLayout, vAlign: AlignStart.}

      insert(buildRowsCard("Notifications", @[
        "11:01 - maintenance window set",
        "10:54 - routing recalculated",
        "10:43 - cluster policy updated"
      ])) {.x: 0, y: 2, width: 12, hExpand: EnableStretchLayout, vAlign: AlignStart.}

proc renderWorkspacePage(): Widget =
  ## builds workspace page grid.
  result = gui:
    Grid:
      columnSpacing = 12
      rowSpacing = 12
      columnHomogeneous = EnableStretchLayout

      insert(buildTextCard("Workspace Board", "Main board area.", CardLargeMinHeight)) {.x: 0, y: 0, width: 9, hExpand: EnableStretchLayout, vAlign: AlignStart.}
      insert(buildTextCard("Properties", "Selected object properties.")) {.x: 9, y: 0, width: 3, hExpand: EnableStretchLayout, vAlign: AlignStart.}

      insert(buildRowsCard("Left Queue", @[
        "L-100",
        "L-101",
        "L-102"
      ])) {.x: 0, y: 1, width: 6, hExpand: EnableStretchLayout, vAlign: AlignStart.}

      insert(buildRowsCard("Right Queue", @[
        "R-201",
        "R-202",
        "R-203"
      ])) {.x: 6, y: 1, width: 6, hExpand: EnableStretchLayout, vAlign: AlignStart.}

proc renderMetricsPage(s: OwlCustomAppState): Widget =
  ## s: state to update slider controls.
  result = gui:
    Grid:
      columnSpacing = 12
      rowSpacing = 12
      columnHomogeneous = EnableStretchLayout

      insert(buildTextCard("Performance Matrix", "Large metric matrix area.", CardLargeMinHeight)) {.x: 0, y: 0, width: 8, hExpand: EnableStretchLayout, vAlign: AlignStart.}
      insert(buildRowsCard("Error Budget", @[
        "Used: 37%",
        "Burn: 4/h",
        "Remaining: 63%"
      ])) {.x: 8, y: 0, width: 4, hExpand: EnableStretchLayout, vAlign: AlignStart.}

      Frame {.x: 0, y: 1, width: 12, hExpand: EnableStretchLayout, vAlign: AlignStart.}:
        sizeRequest = (CardMinWidth, CardMinHeight)
        Box:
          orient = OrientY
          spacing = 8
          margin = 12

          Label {.expand: false.}:
            text = "Controls (Slider)"
            xAlign = 0

          Scale {.expand: false.}:
            min = 0
            max = 100
            value = s.sliderValue
            stepSize = 1
            pageSize = 10
            precision = 0

            proc valueChanged(v: float) =
              s.sliderValue = v

          ProgressBar {.expand: false.}:
            fraction = s.sliderValue / 100.0
            text = "Slider value: " & $int(s.sliderValue)
            showText = true

          DropDown {.expand: false.}:
            items = s.sliderPresets
            selected = s.sliderPresetIndex

            proc select(i: int) =
              s.sliderPresetIndex = i
              s.sliderValue = presetToSliderValue(i)

proc renderDocsPage(): Widget =
  ## builds docs page grid.
  result = gui:
    Grid:
      columnSpacing = 12
      rowSpacing = 12
      columnHomogeneous = EnableStretchLayout

      insert(buildTextCard("How This Was Written",
        "Files are native and local to this UI variant: examples/owlkettleEnhanced/customTitlebar/app.nim plus shared helpers in src/owlkettleEnhanced/shared/ui_helpers.nim. Navigation and login follow the same page routing as webui.")) {.x: 0, y: 0, width: 12, hExpand: EnableStretchLayout, vAlign: AlignStart.}

proc renderPage(s: OwlCustomAppState): Widget =
  ## s: state used for page routing.
  case s.pageIndex
  of 0:
    result = renderOverviewPage()
  of 1:
    result = renderWorkspacePage()
  of 2:
    result = renderMetricsPage(s)
  else:
    result = renderDocsPage()

proc renderMainHeader(s: OwlCustomAppState): Widget =
  ## s: state used for page title and active user.
  result = gui:
    Frame:
      Grid:
        columnSpacing = 12
        margin = 12

        Box {.x: 0, y: 0, hExpand: true.}:
          orient = OrientY
          spacing = 4

          Label {.expand: false.}:
            text = pageTitle(s.pageIndex)
            xAlign = 0

          Label {.expand: false.}:
            text = pageTaglineCustom(s.pageIndex)
            xAlign = 0

        Label {.x: 1, y: 0, hAlign: AlignEnd.}:
          text = "Active user: " & s.loginName
          xAlign = 1

proc renderSidebar(s: OwlCustomAppState): Widget =
  ## s: state used for sidebar actions.
  result = gui:
    Frame:
      Box:
        orient = OrientY
        spacing = 8
        margin = 12
        sizeRequest = (260, -1)

        for i in 0 ..< OwlPageNames.len:
          Button {.expand: false.}:
            text = OwlPageNames[i]

            proc clicked() =
              s.pageIndex = i

        Button {.expand: false.}:
          text = "Logout"

          proc clicked() =
            s.loggedIn = false
            s.loginPassword = ""
            s.loginError = ""

proc renderMain(s: OwlCustomAppState): Widget =
  ## s: state used to render main dashboard.
  result = gui:
    Grid:
      columnSpacing = 14
      rowSpacing = 0
      margin = 14

      insert(renderSidebar(s)) {.x: 0, y: 0, vExpand: true.}

      Box {.x: 1, y: 0, hExpand: true, vExpand: true.}:
        orient = OrientY
        spacing = 12
        insert(renderMainHeader(s)) {.expand: false, hAlign: AlignFill, vAlign: AlignStart.}

        ScrolledWindow:
          Box:
            orient = OrientY
            insert(renderPage(s)) {.expand: false, hAlign: AlignFill, vAlign: AlignStart.}

proc renderLogin(s: OwlCustomAppState): Widget =
  ## s: state to update while user logs in.
  result = gui:
    Box:
      orient = OrientY
      margin = Margin(top: 64, bottom: 16, left: 16, right: 16)

      Frame {.expand: false, hAlign: AlignCenter, vAlign: AlignStart.}:
        sizeRequest = (LoginCardWidth, -1)

        Box:
          orient = OrientY
          spacing = 10
          margin = 16

          Label {.expand: false.}:
            text = "Login"
            xAlign = 0

          Label {.expand: false.}:
            text = "Use test / test"
            xAlign = 0

          Entry {.expand: false.}:
            text = s.loginName
            placeholder = "Name"

            proc changed(v: string) =
              s.loginName = v

          PasswordEntry {.expand: false.}:
            text = s.loginPassword
            placeholderText = "Password"

            proc changed(v: string) =
              s.loginPassword = v

          Button {.expand: false.}:
            text = "Sign in"

            proc clicked() =
              if isValidLogin(s.loginName, s.loginPassword):
                s.loggedIn = true
                s.pageIndex = 0
                s.loginError = ""
              else:
                s.loginError = "invalid credentials"

          Label {.expand: false.}:
            text = s.loginError
            xAlign = 0

method view(s: OwlCustomAppState): Widget =
  ## s: app state to render.
  result = gui:
    Window:
      title = WindowTitleText
      defaultSize = (1360, 900)
      if UseCustomTitlebar:
        titlebar = buildTitlebar()
      if s.loggedIn:
        insert(renderMain(s))
      else:
        insert(renderLogin(s))

proc resolveConfigPath(): string =
  ## resolves local path to markdown config for this example variant.
  result = joinPath(currentSourcePath().splitFile.dir, "config.md")

proc resolveDebugStylesheetPath(): string =
  ## resolves local path to debug overlay stylesheet for hitbox inspection.
  result = joinPath(currentSourcePath().splitFile.dir, "debug_layout.css")

when isMainModule:
  let cfg = enhance(resolveConfigPath())
  let p = resolveStylesheetPath()
  let dp = resolveDebugStylesheetPath()
  var ss: seq[Stylesheet] = @[]
  if cfg.useThemeStylesheet and p.len > 0:
    ss.add(loadStylesheet(p))
  if fileExists(dp):
    ss.add(loadStylesheet(dp))
  EnableStretchLayout = not cfg.disableStretchingBoxes
  WindowTitleText = AppName
  UseCustomTitlebar = not cfg.disableTitlebar
  brew(gui(OwlCustomApp()), stylesheets = ss)

