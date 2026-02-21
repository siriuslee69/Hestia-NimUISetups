# ==================================================================================
# | owlkettle default titlebar app                                                  |
# |----------------------------------------------------------------------------------|
# | Atlas-like dashboard copy: login gate, sidebar routing, header, and card grids  |
# ==================================================================================

import std/os
import owlkettle
import lib/level0/auth
import owlkettleEnhanced/shared/ui_helpers
import owlkettleEnhanced

const
  AppName = "Hestia-NimUISetups - Owlkettle (Default Titlebar)"
  CardMinWidth = 220
  CardMinHeight = 110
  CardLargeMinHeight = 180
  LoginCardWidth = 460

var
  WindowTitleText = AppName
  EnableStretchLayout = false

viewable OwlDefaultApp:
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
      insert(buildStatCard("Nodes", "128")) {.x: 0, y: 0, width: 3, hExpand: EnableStretchLayout, vAlign: AlignStart.}
      insert(buildStatCard("Pending Jobs", "17")) {.x: 3, y: 0, width: 3, hExpand: EnableStretchLayout, vAlign: AlignStart.}
      insert(buildStatCard("Warnings", "3")) {.x: 6, y: 0, width: 3, hExpand: EnableStretchLayout, vAlign: AlignStart.}
      insert(buildStatCard("Healthy Services", "94%")) {.x: 9, y: 0, width: 3, hExpand: EnableStretchLayout, vAlign: AlignStart.}

      insert(buildTextCard("Operations Timeline", "Large panel placeholder for timeline/graph content.", CardLargeMinHeight)) {.x: 0, y: 1, width: 8, hExpand: EnableStretchLayout, vAlign: AlignStart.}
      insert(buildRowsCard("Actions", @[
        "Reindex",
        "Reconcile",
        "Snapshot"
      ])) {.x: 8, y: 1, width: 4, hExpand: EnableStretchLayout, vAlign: AlignStart.}

      insert(buildRowsCard("Recent Events", @[
        "10:20 - pipeline sync completed",
        "10:17 - node health sweep finished",
        "10:11 - policy update queued"
      ])) {.x: 0, y: 2, width: 12, hExpand: EnableStretchLayout, vAlign: AlignStart.}

proc renderWorkspacePage(): Widget =
  ## builds workspace page grid.
  result = gui:
    Grid:
      columnSpacing = 12
      rowSpacing = 12
      columnHomogeneous = EnableStretchLayout

      insert(buildTextCard("Workspace Canvas", "Primary workspace card spanning most columns.", CardLargeMinHeight)) {.x: 0, y: 0, width: 9, hExpand: EnableStretchLayout, vAlign: AlignStart.}
      insert(buildTextCard("Inspector", "Selection details and edit controls.")) {.x: 9, y: 0, width: 3, hExpand: EnableStretchLayout, vAlign: AlignStart.}

      insert(buildRowsCard("Queue A", @[
        "Task A-101",
        "Task A-102",
        "Task A-103"
      ])) {.x: 0, y: 1, width: 6, hExpand: EnableStretchLayout, vAlign: AlignStart.}

      insert(buildRowsCard("Queue B", @[
        "Task B-201",
        "Task B-202",
        "Task B-203"
      ])) {.x: 6, y: 1, width: 6, hExpand: EnableStretchLayout, vAlign: AlignStart.}

proc renderMetricsPage(s: OwlDefaultAppState): Widget =
  ## s: state to update slider controls.
  result = gui:
    Grid:
      columnSpacing = 12
      rowSpacing = 12
      columnHomogeneous = EnableStretchLayout

      insert(buildTextCard("Throughput", "Placeholder chart region in a multi-column card.", CardLargeMinHeight)) {.x: 0, y: 0, width: 8, hExpand: EnableStretchLayout, vAlign: AlignStart.}
      insert(buildRowsCard("Latency Buckets", @[
        "P50: 38ms",
        "P90: 66ms",
        "P99: 112ms"
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
        "Files are native and local to this UI variant: examples/owlkettleEnhanced/defaultTitlebar/app.nim plus shared helpers in src/owlkettleEnhanced/shared/ui_helpers.nim. Navigation and login follow the same page routing as webui.")) {.x: 0, y: 0, width: 12, hExpand: EnableStretchLayout, vAlign: AlignStart.}

proc renderPage(s: OwlDefaultAppState): Widget =
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

proc renderMainHeader(s: OwlDefaultAppState): Widget =
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
            text = pageTaglineDefault(s.pageIndex)
            xAlign = 0

        Label {.x: 1, y: 0, hAlign: AlignEnd.}:
          text = "Active user: " & s.loginName
          xAlign = 1

proc renderSidebar(s: OwlDefaultAppState): Widget =
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

proc renderMain(s: OwlDefaultAppState): Widget =
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

proc renderLogin(s: OwlDefaultAppState): Widget =
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

method view(s: OwlDefaultAppState): Widget =
  ## s: app state to render.
  result = gui:
    Window:
      title = WindowTitleText
      defaultSize = (1360, 900)
      if s.loggedIn:
        insert(renderMain(s))
      else:
        insert(renderLogin(s))

proc resolveConfigPath(): string =
  ## resolves local path to markdown config for this example variant.
  result = joinPath(currentSourcePath().splitFile.dir, "config.md")

when isMainModule:
  let cfg = enhance(resolveConfigPath())
  let p = resolveStylesheetPath()
  let ss = if cfg.useThemeStylesheet and p.len > 0: @[loadStylesheet(p)] else: @[]
  let appTitle = if cfg.disableTitlebar: "" else: AppName
  EnableStretchLayout = not cfg.disableStretchingBoxes
  WindowTitleText = appTitle
  brew(gui(OwlDefaultApp()), stylesheets = ss)

