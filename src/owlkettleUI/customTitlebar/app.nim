# =================================================================================
# | owlkettle custom titlebar app                                                  |
# |--------------------------------------------------------------------------------|
# | Atlas-like dashboard copy with custom HeaderBar and 1:1 page/card composition |
# =================================================================================

import owlkettle
import ../../lib/level0/auth
import ../shared/ui_helpers

const
  AppName = "ViableNimUIs - Owlkettle (Custom Titlebar)"

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

proc buildTitlebar(s: OwlCustomAppState): Widget =
  ## s: app state used by titlebar actions.
  result = gui:
    HeaderBar:
      showTitleButtons = true

      Label {.addTitle.}:
        text = AppName
        xAlign = 0

      Button {.addRight.}:
        text = (if s.loggedIn: "Logout" else: "Clear")

        proc clicked() =
          if s.loggedIn:
            s.loggedIn = false
            s.loginPassword = ""
            s.loginError = ""
          else:
            s.loginName = ""
            s.loginPassword = ""
            s.loginError = ""

proc buildStatCard(t, v: string): Widget =
  ## t: card title.
  ## v: card value text.
  result = gui:
    Frame:
      Box:
        orient = OrientY
        spacing = 6
        margin = 12

        Label:
          text = t
          xAlign = 0

        Label:
          text = v
          xAlign = 0

proc buildTextCard(t, d: string): Widget =
  ## t: card title.
  ## d: card body detail.
  result = gui:
    Frame:
      Box:
        orient = OrientY
        spacing = 6
        margin = 12

        Label:
          text = t
          xAlign = 0

        Label:
          text = d
          xAlign = 0
          wrap = true

proc buildRowsCard(t: string; rs: seq[string]): Widget =
  ## t: card title.
  ## rs: rows rendered as single-line labels.
  result = gui:
    Frame:
      Box:
        orient = OrientY
        spacing = 6
        margin = 12

        Label:
          text = t
          xAlign = 0

        for i in 0 ..< rs.len:
          Label:
            text = rs[i]
            xAlign = 0
            wrap = true

proc renderOverviewPage(): Widget =
  ## builds overview page grid.
  result = gui:
    Grid:
      columnSpacing = 12
      rowSpacing = 12
      columnHomogeneous = true
      insert(buildStatCard("Shards", "32")) {.x: 0, y: 0, width: 3, hExpand: true.}
      insert(buildStatCard("Replicas", "64")) {.x: 3, y: 0, width: 3, hExpand: true.}
      insert(buildStatCard("Incidents", "1")) {.x: 6, y: 0, width: 3, hExpand: true.}
      insert(buildStatCard("SLA", "99.4%")) {.x: 9, y: 0, width: 3, hExpand: true.}

      insert(buildTextCard("Flow Map", "Big center area placeholder for graph/canvas.")) {.x: 0, y: 1, width: 8, hExpand: true, vExpand: true.}
      insert(buildRowsCard("Quick Ops", @[
        "Drain",
        "Shift",
        "Repair"
      ])) {.x: 8, y: 1, width: 4, hExpand: true.}

      insert(buildRowsCard("Notifications", @[
        "11:01 - maintenance window set",
        "10:54 - routing recalculated",
        "10:43 - cluster policy updated"
      ])) {.x: 0, y: 2, width: 12, hExpand: true.}

proc renderWorkspacePage(): Widget =
  ## builds workspace page grid.
  result = gui:
    Grid:
      columnSpacing = 12
      rowSpacing = 12
      columnHomogeneous = true

      insert(buildTextCard("Workspace Board", "Main board area.")) {.x: 0, y: 0, width: 9, hExpand: true, vExpand: true.}
      insert(buildTextCard("Properties", "Selected object properties.")) {.x: 9, y: 0, width: 3, hExpand: true.}

      insert(buildRowsCard("Left Queue", @[
        "L-100",
        "L-101",
        "L-102"
      ])) {.x: 0, y: 1, width: 6, hExpand: true.}

      insert(buildRowsCard("Right Queue", @[
        "R-201",
        "R-202",
        "R-203"
      ])) {.x: 6, y: 1, width: 6, hExpand: true.}

proc renderMetricsPage(s: OwlCustomAppState): Widget =
  ## s: state to update slider controls.
  result = gui:
    Grid:
      columnSpacing = 12
      rowSpacing = 12
      columnHomogeneous = true

      insert(buildTextCard("Performance Matrix", "Large metric matrix area.")) {.x: 0, y: 0, width: 8, hExpand: true, vExpand: true.}
      insert(buildRowsCard("Error Budget", @[
        "Used: 37%",
        "Burn: 4/h",
        "Remaining: 63%"
      ])) {.x: 8, y: 0, width: 4, hExpand: true.}

      Frame {.x: 0, y: 1, width: 12, hExpand: true.}:
        Box:
          orient = OrientY
          spacing = 8
          margin = 12

          Label:
            text = "Controls (Slider)"
            xAlign = 0

          Scale:
            min = 0
            max = 100
            value = s.sliderValue
            stepSize = 1
            pageSize = 10
            precision = 0

            proc valueChanged(v: float) =
              s.sliderValue = v

          ProgressBar:
            fraction = s.sliderValue / 100.0
            text = "Slider value: " & $int(s.sliderValue)
            showText = true

          DropDown:
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
      columnHomogeneous = true

      insert(buildTextCard("How This Was Written",
        "Files are native and local to this UI variant: src/owlkettleUI/customTitlebar/app.nim plus shared helpers in src/owlkettleUI/shared/ui_helpers.nim. Navigation and login follow the same page routing as webui.")) {.x: 0, y: 0, width: 12, hExpand: true.}

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

          Label:
            text = pageTitle(s.pageIndex)
            xAlign = 0

          Label:
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
          Button:
            text = OwlPageNames[i]

            proc clicked() =
              s.pageIndex = i

        Button:
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
        insert(renderMainHeader(s))

        ScrolledWindow:
          insert(renderPage(s))

proc renderLogin(s: OwlCustomAppState): Widget =
  ## s: state to update while user logs in.
  result = gui:
    Box:
      orient = OrientY
      spacing = 10
      margin = 16

      Label:
        text = "Login"
        xAlign = 0

      Label:
        text = "Use test / test"
        xAlign = 0

      Entry:
        text = s.loginName
        placeholder = "Name"

        proc changed(v: string) =
          s.loginName = v

      PasswordEntry:
        text = s.loginPassword
        placeholderText = "Password"

        proc changed(v: string) =
          s.loginPassword = v

      Button:
        text = "Sign in"

        proc clicked() =
          if isValidLogin(s.loginName, s.loginPassword):
            s.loggedIn = true
            s.pageIndex = 0
            s.loginError = ""
          else:
            s.loginError = "invalid credentials"

      Label:
        text = s.loginError
        xAlign = 0

method view(s: OwlCustomAppState): Widget =
  ## s: app state to render.
  result = gui:
    Window:
      title = AppName
      defaultSize = (1360, 900)
      titlebar = buildTitlebar(s)
      if s.loggedIn:
        insert(renderMain(s))
      else:
        insert(renderLogin(s))

when isMainModule:
  let p = resolveStylesheetPath()
  let ss = if p.len > 0: @[loadStylesheet(p)] else: @[]
  brew(gui(OwlCustomApp()), stylesheets = ss)
