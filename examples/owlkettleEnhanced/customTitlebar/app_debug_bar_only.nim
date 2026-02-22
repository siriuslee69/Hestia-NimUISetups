# ============================================================================
# | owlkettle custom titlebar debug (minimal + nativecustom hook)            |
# |----------------------------------------------------------------------------|
# | Frameless GTK window with a tiny custom top strip.                        |
# | Win32 non-client behavior is provided by shared/nativecustom.nim.         |
# ============================================================================

import owlkettle
import owlkettle/widgetdef
import owlkettle/widgetutils
import owlkettle/bindings/gtk
import owlkettleEnhanced/shared/nativecustom

proc gtk_window_set_decorated(window: GtkWidget; setting: cbool) {.cdecl, importc.}

const
  AppName = ""
  DebugBarHeight = 40
  DebugButtonWidth = 46

proc installNativeCustomForWindow(window: GtkWidget) =
  ## Installs Electron-like native custom-titlebar behavior on Windows.
  when defined(windows):
    var cfg = defaultNativeCustomConfig()
    cfg.overlayEnabled = true
    cfg.removeNcArea = true
    cfg.titleHeight = DebugBarHeight
    cfg.resizeBorder = 5
    cfg.buttonWidth = DebugButtonWidth
    cfg.buttonSpacing = 0
    cfg.buttonRightPadding = 0
    cfg.leftCaptionInset = 0
    cfg.preferDwmCaptionBounds = true
    cfg.canResize = true
    cfg.minimizable = true
    cfg.maximizable = true
    cfg.includeSystemMenu = true
    discard installNativeCustomHookForGtkWindow(window, cfg)
  else:
    discard window

proc onFramelessRealize(widget: GtkWidget; data: pointer) {.cdecl.} =
  ## Installs hook when top-level window is realized.
  discard data
  installNativeCustomForWindow(widget)

proc onFramelessMap(widget: GtkWidget; data: pointer) {.cdecl.} =
  ## Retries install when top-level window is mapped.
  discard data
  installNativeCustomForWindow(widget)

renderable FramelessWindow of BaseWindow:
  ## Minimal undecorated top-level window for custom in-window titlebar layout.
  title: string
  child: Widget
  decorated: bool = false

  hooks:
    beforeBuild:
      state.internalWidget = gtk_window_new(GTK_WINDOW_TOPLEVEL)
      when defined(windows):
        discard g_signal_connect(state.internalWidget, "realize", onFramelessRealize, nil)
        discard g_signal_connect(state.internalWidget, "map", onFramelessMap, nil)

  hooks title:
    property:
      gtk_window_set_title(state.internalWidget, state.title.cstring)

  hooks decorated:
    property:
      gtk_window_set_decorated(state.internalWidget, cbool(ord(state.decorated)))
      installNativeCustomForWindow(state.internalWidget)

  hooks child:
    (build, update):
      state.updateChild(state.child, widget.valChild, gtk_window_set_child)
      installNativeCustomForWindow(state.internalWidget)

  adder add:
    if widget.hasChild:
      raise newException(ValueError, "Unable to add multiple children to a FramelessWindow.")
    widget.hasChild = true
    widget.valChild = child

viewable OwlCustomBarDebugApp:
  dummy: bool = false

proc buildDebugTitlebar(): Widget =
  ## Tiny custom titlebar surface.
  result = gui:
    Box:
      orient = OrientX
      sizeRequest = (-1, DebugBarHeight)
      margin = Margin(top: 0, bottom: 0, left: 8, right: 0)

      Label {.expand: true.}:
        text = "Minimal custom titlebar (nativecustom hook active)"
        xAlign = 0

      Box {.expand: false.}:
        orient = OrientX
        spacing = 0

        Label {.expand: false.}:
          text = "_"
          xAlign = 0.5
          sizeRequest = (DebugButtonWidth, -1)

        Label {.expand: false.}:
          text = "[ ]"
          xAlign = 0.5
          sizeRequest = (DebugButtonWidth, -1)

        Label {.expand: false.}:
          text = "X"
          xAlign = 0.5
          sizeRequest = (DebugButtonWidth, -1)

proc buildDebugContent(): Widget =
  ## Minimal body content.
  result = gui:
    Box:
      orient = OrientY
      spacing = 8
      margin = 12

      Label {.expand: false.}:
        text = "Drag from top strip. Resize from edges/corners."
        xAlign = 0

      Label {.expand: false.}:
        text = "Task: nimble runOwlCustomDebugBar"
        xAlign = 0

method view(s: OwlCustomBarDebugAppState): Widget =
  ## s: app state to render.
  discard s
  result = gui:
    FramelessWindow:
      title = AppName
      defaultSize = (1360, 900)
      decorated = false

      Box:
        orient = OrientY
        insert(buildDebugTitlebar()) {.expand: false, hAlign: AlignFill, vAlign: AlignStart.}
        insert(buildDebugContent()) {.expand: true, hAlign: AlignFill, vAlign: AlignFill.}

when isMainModule:
  echo "[owl-bar] custom titlebar debug: using shared/nativecustom hook"
  brew(gui(OwlCustomBarDebugApp()))
