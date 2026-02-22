# =================================================================================
# | owlkettle custom titlebar app                                                  |
# |--------------------------------------------------------------------------------|
# | Atlas-like dashboard copy with custom HeaderBar and 1:1 page/card composition |
# =================================================================================

import std/[os, strutils]
import owlkettle
import owlkettle/bindings/gtk
import lib/level0/auth
import owlkettleEnhanced/shared/ui_helpers
import owlkettleEnhanced/shared/window_titlebar

const
  AppName = "Hestia-NimUISetups - Owlkettle (Custom Titlebar)"
  CardMinWidth = 220
  CardMinHeight = 110
  CardLargeMinHeight = 180
  LoginCardWidth = 460
  UseWindowHandle = defined(windows)
  WindowsPrefersNativeFrame = defined(windows)
  UseThemeStylesheet = true
  UseExperimentalCustomTitlebarOnWindows = false
  NativeTitlebarColorDefault = ""
  NativeTitlebarTextColorDefault = ""

var
  WindowTitleText = AppName
  UseCustomTitlebar = true
  EnableStretchLayout = false
  NativeTitlebarColorHex = ""
  NativeTitlebarTextColorHex = ""

when defined(windows):
  type
    GdkSurface = distinct pointer
    Hwnd = pointer

  const
    DWMWA_CAPTION_COLOR = 35'u32
    DWMWA_TEXT_COLOR = 36'u32

  proc isNil(obj: GdkSurface): bool {.borrow.}
  proc gtk_native_get_surface(native: GtkWidget): GdkSurface {.cdecl, importc.}
  proc gtk_widget_get_root(widget: GtkWidget): GtkWidget {.cdecl, importc.}
  proc gdk_win32_surface_get_impl_hwnd(surface: GdkSurface): Hwnd {.cdecl, importc.}
  proc gdk_win32_surface_get_handle(surface: GdkSurface): Hwnd {.cdecl, importc.}
  proc DwmSetWindowAttribute(hwnd: Hwnd;
                             attr: uint32;
                             val: pointer;
                             cb: uint32): int32 {.stdcall, dynlib: "dwmapi", importc.}

  proc parseRgbHexColor(hex: string; r, g, b: var uint32): bool =
    ## hex: color string in RRGGBB, #RRGGBB or 0xRRGGBB form.
    var t0 = hex.strip()
    if t0.len == 0:
      return false
    if t0.startsWith("#"):
      t0 = t0[1 .. ^1]
    elif t0.len > 2 and (t0.startsWith("0x") or t0.startsWith("0X")):
      t0 = t0[2 .. ^1]
    if t0.len != 6:
      return false
    try:
      let v = parseHexInt(t0)
      r = uint32((v shr 16) and 0xFF)
      g = uint32((v shr 8) and 0xFF)
      b = uint32(v and 0xFF)
      result = true
    except ValueError:
      result = false

  proc toColorRef(r, g, b: uint32): uint32 =
    ## Converts RGB to Win32 COLORREF (0x00bbggrr).
    result = (b shl 16) or (g shl 8) or r

  proc autoTextColorRef(r, g, b: uint32): uint32 =
    ## Chooses black/white text for best contrast against caption color.
    let lum = (299'u32 * r + 587'u32 * g + 114'u32 * b) div 1000'u32
    if lum < 140'u32:
      result = 0x00FFFFFF'u32
    else:
      result = 0x00000000'u32

  proc applyWindowsNativeCaptionThemeFromWidget(widget: GtkWidget): bool =
    ## Applies optional DWM caption/text colors to the top-level native window.
    var
      root: GtkWidget
      surface: GdkSurface
      hwnd: Hwnd
      r: uint32
      g: uint32
      b: uint32
      captionRef: uint32
      textRef: uint32
    if UseCustomTitlebar:
      return false
    if NativeTitlebarColorHex.strip().len == 0:
      return false
    root = gtk_widget_get_root(widget)
    if root.isNil:
      return false
    surface = gtk_native_get_surface(root)
    if surface.isNil:
      return false
    hwnd = gdk_win32_surface_get_impl_hwnd(surface)
    if hwnd == nil:
      hwnd = gdk_win32_surface_get_handle(surface)
    if hwnd == nil:
      return false
    if not parseRgbHexColor(NativeTitlebarColorHex, r, g, b):
      return false
    captionRef = toColorRef(r, g, b)
    discard DwmSetWindowAttribute(hwnd, DWMWA_CAPTION_COLOR, captionRef.addr, uint32(sizeof(captionRef)))
    if parseRgbHexColor(NativeTitlebarTextColorHex, r, g, b):
      textRef = toColorRef(r, g, b)
    else:
      textRef = autoTextColorRef(uint32((captionRef and 0xFF)), uint32((captionRef shr 8) and 0xFF), uint32((captionRef shr 16) and 0xFF))
    discard DwmSetWindowAttribute(hwnd, DWMWA_TEXT_COLOR, textRef.addr, uint32(sizeof(textRef)))
    result = true

proc onNativeTitleThemeRealize(widget: GtkWidget; data: pointer) {.cdecl.} =
  ## Applies native titlebar DWM colors when probe widget is realized/mapped.
  discard data
  when defined(windows):
    discard applyWindowsNativeCaptionThemeFromWidget(widget)

renderable NativeTitlebarThemeProbe of BaseWidget:
  ## Zero-size probe used to apply DWM native titlebar colors on Windows.
  hooks:
    beforeBuild:
      state.internalWidget = gtk_box_new(GTK_ORIENTATION_HORIZONTAL, 0)
      gtk_widget_set_size_request(state.internalWidget, 0, 0)
      when defined(windows):
        discard g_signal_connect(state.internalWidget, "realize", onNativeTitleThemeRealize, nil)
        discard g_signal_connect(state.internalWidget, "map", onNativeTitleThemeRealize, nil)

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

proc resolveUseCustomTitlebar(): bool =
  ## Returns whether app should use custom titlebar for this platform.
  if WindowsPrefersNativeFrame:
    return UseExperimentalCustomTitlebarOnWindows
  result = true

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

        Box {.x: 0, y: 0, hExpand: EnableStretchLayout.}:
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

      insert(renderSidebar(s)) {.x: 0, y: 0, vExpand: EnableStretchLayout.}

      Box {.x: 1, y: 0, hExpand: EnableStretchLayout, vExpand: EnableStretchLayout.}:
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
      Box:
        orient = OrientY
        if WindowsPrefersNativeFrame and not UseCustomTitlebar:
          NativeTitlebarThemeProbe {.expand: false.}
        if s.loggedIn:
          insert(renderMain(s))
        else:
          insert(renderLogin(s))

proc resolveDebugStylesheetPath(): string =
  ## resolves local path to debug overlay stylesheet for hitbox inspection.
  result = joinPath(currentSourcePath().splitFile.dir, "debug_layout.css")

when isMainModule:
  let p = resolveStylesheetPath()
  let dp = resolveDebugStylesheetPath()
  var ss: seq[Stylesheet] = @[]
  if UseThemeStylesheet and p.len > 0:
    ss.add(loadStylesheet(p))
  if fileExists(dp):
    ss.add(loadStylesheet(dp))
  EnableStretchLayout = false
  WindowTitleText = AppName
  UseCustomTitlebar = resolveUseCustomTitlebar()
  NativeTitlebarColorHex = NativeTitlebarColorDefault
  NativeTitlebarTextColorHex = NativeTitlebarTextColorDefault
  brew(gui(OwlCustomApp()), stylesheets = ss)

