# =================================================================================
# | owlkettle Windows backdrop demo                                                |
# |--------------------------------------------------------------------------------|
# | Demonstrates Win11 DWM Mica/Acrylic-style backdrops on a GTK/Owlkettle window. |
# =================================================================================

import std/os
import owlkettle
import owlkettle/bindings/gtk
import owlkettleEnhanced
import owlkettleEnhanced/shared/ui_helpers
import owlkettleEnhanced/shared/windows_backdrop

const
  AppName = "Hestia-NimUISetups - Owlkettle (Windows Backdrop Demo)"
  DemoCssFile = "style.css"
  BackdropNames = @[
    "Auto",
    "None",
    "Mica",
    "Acrylic",
    "Tabbed",
    "Legacy blur"
  ]

proc gtk_widget_set_opacity(widget: GtkWidget; opacity: cdouble) {.cdecl, importc.}

type
  BackdropProbeState = ref object
    kind: WindowsBackdropKind
    immersiveDark: bool
    windowOpacity: cdouble

proc clampOpacity(v: float): cdouble =
  ## v: desired opacity in [0..1].
  if v < 0.2:
    return 0.2
  if v > 1.0:
    return 1.0
  result = cdouble(v)

proc backdropFromIndex(i: int): WindowsBackdropKind =
  ## i: selected dropdown index.
  case i
  of 0:
    result = wbkAuto
  of 1:
    result = wbkNone
  of 2:
    result = wbkMica
  of 3:
    result = wbkAcrylic
  of 4:
    result = wbkTabbed
  else:
    result = wbkLegacyBlur

proc backdropSummary(kind: WindowsBackdropKind): string =
  ## kind: current DWM backdrop selection.
  case kind
  of wbkAuto:
    result = "Lets Windows choose the most suitable system backdrop."
  of wbkNone:
    result = "Clears the system backdrop and leaves only GTK translucency."
  of wbkMica:
    result = "Maps to DWMSBT_MAINWINDOW and is the closest fit for Win11 Mica."
  of wbkAcrylic:
    result = "Maps to DWMSBT_TRANSIENTWINDOW for a more acrylic-like transient blur."
  of wbkTabbed:
    result = "Maps to DWMSBT_TABBEDWINDOW, which is stronger and cooler-toned."
  of wbkLegacyBlur:
    result = "Calls DwmEnableBlurBehindWindow. On modern Windows this usually does not produce the old Aero blur."

proc platformSummary(): string =
  ## Returns platform-specific explainer text for the demo.
  when defined(windows):
    let info = currentWindowsVersion()
    result = "GTK4 does not integrate Win11 Mica/Acrylic directly. " &
      "This demo resolves the HWND and asks DWM for a system backdrop. " &
      "Detected Windows version: " & windowsVersionLabel(info) & ". "
    if supportsSystemBackdrop(info):
      result.add("The documented DWM system-backdrop API should be available.")
    else:
      result.add("The documented DWM system-backdrop API is not available on this build, so the demo falls back to the undocumented accent-policy blur path.")
  else:
    result = "This demo compiles cross-platform, but the actual backdrop calls are Windows-only."

proc applyProbe(widget: GtkWidget; st: BackdropProbeState) =
  ## widget: zero-size probe widget attached to the window.
  ## st: current backdrop state.
  var root: GtkWidget
  if st.isNil or widget.isNil:
    return
  root = gtk_widget_get_root(widget)
  if not root.isNil:
    gtk_widget_set_opacity(root, st.windowOpacity)
  discard applyWindowsBackdropFromWidget(widget, st.kind, st.immersiveDark)

proc onBackdropProbeRealize(widget: GtkWidget; data: pointer) {.cdecl.} =
  ## Applies backdrop once the probe is realized/mapped inside a window.
  let st = cast[BackdropProbeState](data)
  applyProbe(widget, st)

renderable WindowsBackdropProbe of BaseWidget:
  kind: WindowsBackdropKind = wbkMica
  immersiveDark: bool = true
  windowOpacity: float = 0.96
  probe {.private, onlyState.}: BackdropProbeState

  hooks:
    beforeBuild:
      state.internalWidget = gtk_box_new(GTK_ORIENTATION_HORIZONTAL, 0)
      gtk_widget_set_size_request(state.internalWidget, 0, 0)
      if state.probe.isNil:
        state.probe = BackdropProbeState()
      state.probe.kind = state.kind
      state.probe.immersiveDark = state.immersiveDark
      state.probe.windowOpacity = clampOpacity(state.windowOpacity)
      discard g_signal_connect(state.internalWidget, "realize",
        onBackdropProbeRealize, cast[pointer](state.probe))
      discard g_signal_connect(state.internalWidget, "map",
        onBackdropProbeRealize, cast[pointer](state.probe))

  hooks kind:
    property:
      state.probe.kind = state.kind
      applyProbe(state.internalWidget, state.probe)

  hooks immersiveDark:
    property:
      state.probe.immersiveDark = state.immersiveDark
      applyProbe(state.internalWidget, state.probe)

  hooks windowOpacity:
    property:
      state.probe.windowOpacity = clampOpacity(state.windowOpacity)
      applyProbe(state.internalWidget, state.probe)

viewable BackdropDemoApp:
  backdropIndex: int = 2
  immersiveDark: bool = true
  windowOpacity: float = 0.96

proc buildCard(title, body: string): Widget =
  ## title: card heading.
  ## body: explanatory text.
  result = gui:
    Frame:
      Box:
        orient = OrientY
        spacing = 8
        margin = 18

        Label:
          text = title
          xAlign = 0

        Label:
          text = body
          xAlign = 0
          wrap = true

proc buildControls(s: BackdropDemoAppState): Widget =
  ## s: mutable app state.
  let activeKind = backdropFromIndex(s.backdropIndex)
  result = gui:
    Frame:
      Box:
        orient = OrientY
        spacing = 10
        margin = 18

        Label:
          text = "Backdrop mode"
          xAlign = 0

        DropDown:
          items = BackdropNames
          selected = s.backdropIndex

          proc select(i: int) =
            s.backdropIndex = i

        Label:
          text = "Opacity"
          xAlign = 0

        Scale:
          min = 0
          max = 30
          value = (s.windowOpacity * 100.0) - 70.0
          stepSize = 1
          pageSize = 5
          precision = 0

          proc valueChanged(v: float) =
            s.windowOpacity = (70.0 + v) / 100.0

        ProgressBar:
          fraction = s.windowOpacity
          text = "Window opacity: " & $int(s.windowOpacity * 100.0) & "%"
          showText = true

        Button:
          text = if s.immersiveDark: "Immersive dark frame: on" else: "Immersive dark frame: off"

          proc clicked() =
            s.immersiveDark = not s.immersiveDark

        Label:
          text = "Active: " & backdropLabel(activeKind)
          xAlign = 0

        Label:
          text = backdropSummary(activeKind)
          xAlign = 0
          wrap = true

proc buildHero(s: BackdropDemoAppState): Widget =
  ## s: current app state.
  let activeKind = backdropFromIndex(s.backdropIndex)
  result = gui:
    Frame:
      Box:
        orient = OrientY
        spacing = 10
        margin = 22

        Label:
          text = "Windows backdrop bridge"
          xAlign = 0

        Label:
          text = platformSummary()
          xAlign = 0
          wrap = true

        Label:
          text = "Selected mode: " & backdropLabel(activeKind) &
            " | opacity " & $int(s.windowOpacity * 100.0) & "%"
          xAlign = 0

proc buildNotes(): Widget =
  ## Build the small research/limitations notes card.
  result = gui:
    Frame:
      Box:
        orient = OrientY
        spacing = 8
        margin = 18

        Label:
          text = "What this demo does"
          xAlign = 0

        Label:
          text = "1. Uses GTK to obtain the native GdkSurface / HWND.\n" &
            "2. Uses DwmSetWindowAttribute(DWMWA_SYSTEMBACKDROP_TYPE, ...).\n" &
            "3. Uses GTK window opacity plus translucent CSS so the DWM material is actually visible.\n" &
            "4. Avoids screen capture; Windows owns the blur."
          xAlign = 0
          wrap = true

proc buildPreviewTiles(): Widget =
  ## Builds a few translucent cards so the backdrop is easy to inspect.
  result = gui:
    Grid:
      columnSpacing = 14
      rowSpacing = 14

      insert(buildCard("Telemetry", "Packet flow 128/s\nCPU 14%\nGPU 4%")) {.x: 0, y: 0.}
      insert(buildCard("Routing", "North edge stable.\nTwo passive links warming.\nOne failover path idle.")) {.x: 1, y: 0.}
      insert(buildCard("Notes", "Move the window across bright and dark desktop regions to see how the Windows backdrop reacts.")) {.x: 2, y: 0.}

method view(s: BackdropDemoAppState): Widget =
  ## s: demo state to render.
  result = gui:
    Window:
      title = AppName
      defaultSize = (1140, 760)
      Box:
        orient = OrientY

        WindowsBackdropProbe:
          kind = backdropFromIndex(s.backdropIndex)
          immersiveDark = s.immersiveDark
          windowOpacity = s.windowOpacity

        ScrolledWindow {.expand: true.}:
          Box:
            orient = OrientY
            spacing = 16
            margin = 18

            insert(buildHero(s)) {.expand: false.}

            Grid:
              columnSpacing = 16
              rowSpacing = 16

              insert(buildControls(s)) {.x: 0, y: 0, width: 1, hExpand: true, vAlign: AlignStart.}
              insert(buildNotes()) {.x: 1, y: 0, width: 2, hExpand: true, vAlign: AlignStart.}

            insert(buildPreviewTiles()) {.expand: false.}

proc resolveConfigPath(): string =
  ## Resolves local path to markdown config for this example variant.
  result = joinPath(currentSourcePath().splitFile.dir, "config.md")

proc resolveDemoStylesheetPath(): string =
  ## Resolves local path to the demo-specific stylesheet.
  result = joinPath(currentSourcePath().splitFile.dir, DemoCssFile)

proc enforceNativeWindowsTitlebar() =
  ## Keeps the demo on the native Win32 frame for cleaner DWM behavior.
  when defined(windows):
    putEnv("GTK_CSD", "0")

when isMainModule:
  enforceNativeWindowsTitlebar()
  let cfg = enhance(resolveConfigPath())
  let themeCss = resolveStylesheetPath()
  let demoCss = resolveDemoStylesheetPath()
  var ss: seq[Stylesheet] = @[]
  if cfg.useThemeStylesheet and themeCss.len > 0:
    ss.add(loadStylesheet(themeCss))
  if fileExists(demoCss):
    ss.add(loadStylesheet(demoCss))
  brew(gui(BackdropDemoApp()), stylesheets = ss)
