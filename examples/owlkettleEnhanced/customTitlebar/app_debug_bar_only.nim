# ============================================================================
# | owlkettle custom titlebar debug (bar-only, native hit-test)              |
# |---------------------------------------------------------------------------|
# | Frameless window with a top header box and content box below.            |
# | Drag/maximize are delegated to Windows via WM_NCHITTEST on top strip.    |
# ============================================================================

import std/[os, tables]
import owlkettle
import owlkettle/widgetdef
import owlkettle/widgetutils
import owlkettle/bindings/gtk
import owlkettleEnhanced/shared/ui_helpers
import owlkettleEnhanced

const
  AppName = "Hestia-NimUISetups - Owlkettle (Custom Titlebar Debug Bar)"
  DebugBarHeight = 56
  NativeTopBorderGuardPx = 16
  ResizeBorderPx = 8
  # NOTE (validated baseline):
  # Keep this native hit-test setup as-is for now. This configuration currently gives
  # correct maximize/restore and drag-down-from-maximized behavior on Windows.
  # Remaining known gap: Win11 snap layouts/snap-to-top affordances are not yet wired.

type
  GdkSurface = distinct pointer

proc isNil(obj: GdkSurface): bool {.borrow.}
proc gtk_native_get_surface(native: GtkWidget): GdkSurface {.cdecl, importc.}
proc gtk_window_set_decorated(window: GtkWidget; setting: cbool) {.cdecl, importc.}

proc barDebugEnabled(): bool =
  ## Enables debug logs when HESTIA_OWL_BAR_DEBUG is set.
  result = getEnv("HESTIA_OWL_BAR_DEBUG", "").len > 0

proc barDebugLog(msg: string) =
  ## Emits debug logs only when explicitly enabled.
  if barDebugEnabled():
    echo "[owl-bar] ", msg

when defined(windows):
  type
    Hwnd = pointer

    WinPoint = object
      x: cint
      y: cint

    WinRect = object
      left: cint
      top: cint
      right: cint
      bottom: cint

    WinWindowPlacement = object
      length: uint32
      flags: uint32
      showCmd: uint32
      ptMinPosition: WinPoint
      ptMaxPosition: WinPoint
      rcNormalPosition: WinRect

    NativeCaptionHookState = ref object
      oldProc: pointer
      titleHeight: cint

  const
    WM_NCHITTEST = 0x0084'u32
    WM_NCLBUTTONDBLCLK = 0x00A3'u32
    WM_NCDESTROY = 0x0082'u32
    HTCLIENT = 1
    HTCAPTION = 2'u
    HTLEFT = 10
    HTRIGHT = 11
    HTTOP = 12
    HTTOPLEFT = 13
    HTTOPRIGHT = 14
    HTBOTTOM = 15
    HTBOTTOMLEFT = 16
    HTBOTTOMRIGHT = 17
    GWLP_WNDPROC = -4
    GWL_STYLE = -16
    WS_THICKFRAME = 0x00040000
    WS_MAXIMIZEBOX = 0x00010000
    WS_MINIMIZEBOX = 0x00020000
    WS_SYSMENU = 0x00080000
    SW_SHOWMAXIMIZED = 3'u32
    SW_RESTORE = 9'i32
    SWP_NOSIZE = 0x0001'u32
    SWP_NOMOVE = 0x0002'u32
    SWP_NOZORDER = 0x0004'u32
    SWP_NOACTIVATE = 0x0010'u32
    SWP_FRAMECHANGED = 0x0020'u32

  proc gdk_win32_surface_get_impl_hwnd(surface: GdkSurface): Hwnd {.cdecl, importc.}
  proc gdk_win32_surface_get_handle(surface: GdkSurface): Hwnd {.cdecl, importc.}
  proc ScreenToClient(wnd: Hwnd; p: ptr WinPoint): int32 {.stdcall, dynlib: "user32", importc.}
  proc GetClientRect(wnd: Hwnd; rect: ptr WinRect): int32 {.stdcall, dynlib: "user32", importc.}
  proc GetWindowPlacement(wnd: Hwnd; placement: ptr WinWindowPlacement): int32 {.stdcall, dynlib: "user32", importc.}
  proc GetWindowLongPtrW(wnd: Hwnd; index: cint): int {.stdcall, dynlib: "user32", importc.}
  proc ShowWindow(wnd: Hwnd; showCmd: cint): int32 {.stdcall, dynlib: "user32", importc.}
  proc SetWindowPos(wnd, insertAfter: Hwnd;
                    x, y, cx, cy: cint;
                    flags: uint32): int32 {.stdcall, dynlib: "user32", importc.}
  proc DefWindowProcW(wnd: Hwnd; msg: uint32; wParam: uint; lParam: int): int {.stdcall, dynlib: "user32", importc.}
  proc SetWindowLongPtrW(wnd: Hwnd; index: cint; newLong: int): int {.stdcall, dynlib: "user32", importc.}
  proc CallWindowProcW(prev: pointer; wnd: Hwnd; msg: uint32; wParam: uint; lParam: int): int {.stdcall, dynlib: "user32", importc.}

  var nativeCaptionHooks: Table[uint, NativeCaptionHookState]

  proc hwndKey(hwnd: Hwnd): uint =
    ## Returns a stable integer key for hwnd lookup.
    result = cast[uint](hwnd)

  proc signedLowWord(lp: int): cint =
    ## Extracts signed LOWORD from LPARAM.
    result = cast[cshort](lp and 0xFFFF).cint

  proc signedHighWord(lp: int): cint =
    ## Extracts signed HIWORD from LPARAM.
    result = cast[cshort]((lp shr 16) and 0xFFFF).cint

  proc nativeCaptionWndProc(hwnd: Hwnd; msg: uint32; wParam: uint; lParam: int): int {.stdcall.}

  proc queryWindowPlacement(hwnd: Hwnd; wp: var WinWindowPlacement): bool =
    ## wp: receives current window placement.
    if hwnd == nil:
      return false
    wp = WinWindowPlacement()
    wp.length = uint32(sizeof(wp))
    result = (GetWindowPlacement(hwnd, wp.addr) != 0'i32)

  proc windowIsMaximized(hwnd: Hwnd): bool =
    ## True when native placement reports maximized state.
    var wp: WinWindowPlacement
    if not queryWindowPlacement(hwnd, wp):
      return false
    result = (wp.showCmd == SW_SHOWMAXIMIZED)

  proc toggleNativeMaximize(hwnd: Hwnd): bool =
    ## Toggles maximized/restored state for native window.
    if hwnd == nil:
      return false
    if windowIsMaximized(hwnd):
      discard ShowWindow(hwnd, SW_RESTORE.cint)
    else:
      discard ShowWindow(hwnd, SW_SHOWMAXIMIZED.cint)
    result = true

  proc ensureNativeSnapStyles(hwnd: Hwnd): bool =
    ## Ensures Win32 style flags required for native snap/tiling affordances.
    var
      style: int
      desired: int
      changed: bool = false
    if hwnd == nil:
      return false
    style = GetWindowLongPtrW(hwnd, GWL_STYLE)
    desired = style or WS_THICKFRAME or WS_MAXIMIZEBOX or WS_MINIMIZEBOX or WS_SYSMENU
    if desired != style:
      discard SetWindowLongPtrW(hwnd, GWL_STYLE, desired)
      discard SetWindowPos(hwnd, nil, 0, 0, 0, 0,
        SWP_NOMOVE or SWP_NOSIZE or SWP_NOZORDER or SWP_NOACTIVATE or SWP_FRAMECHANGED)
      changed = true
    if changed:
      barDebugLog("snapStyles applied")
    result = true

  proc installNativeCaptionHook(hwnd: Hwnd; titleHeightPx: cint): bool =
    ## Installs or updates Win32 WNDPROC hook that maps top strip hit-tests to HTCAPTION.
    if hwnd == nil:
      return false
    discard ensureNativeSnapStyles(hwnd)
    let key = hwndKey(hwnd)
    if key in nativeCaptionHooks:
      nativeCaptionHooks[key].titleHeight = max(1, titleHeightPx)
      return true

    let oldLong = SetWindowLongPtrW(hwnd, GWLP_WNDPROC, cast[int](cast[pointer](nativeCaptionWndProc)))
    if oldLong == 0:
      barDebugLog("installHook failed (SetWindowLongPtrW returned 0)")
      return false
    nativeCaptionHooks[key] = NativeCaptionHookState(
      oldProc: cast[pointer](oldLong),
      titleHeight: max(1, titleHeightPx)
    )
    barDebugLog("installHook success titleHeight=" & $titleHeightPx)
    result = true

  proc nativeCaptionWndProc(hwnd: Hwnd; msg: uint32; wParam: uint; lParam: int): int {.stdcall.} =
    ## Handles WM_NCHITTEST for the debug top strip, delegates all other messages.
    ## Baseline behavior here is currently the known-good maximize + drag-down path.
    let key = hwndKey(hwnd)
    if key notin nativeCaptionHooks:
      return DefWindowProcW(hwnd, msg, wParam, lParam)

    let st = nativeCaptionHooks[key]
    case msg
    of WM_NCLBUTTONDBLCLK:
      if wParam == HTCAPTION:
        if toggleNativeMaximize(hwnd):
          return 0
      return CallWindowProcW(st.oldProc, hwnd, msg, wParam, lParam)
    of WM_NCHITTEST:
      var
        p: WinPoint
        cr: WinRect
        cw: cint
        ch: cint
        nearLeft: bool
        nearRight: bool
        nearTop: bool
        nearBottom: bool
        isMax: bool
      p.x = signedLowWord(lParam)
      p.y = signedHighWord(lParam)
      if ScreenToClient(hwnd, p.addr) != 0'i32 and GetClientRect(hwnd, cr.addr) != 0'i32:
        cw = max(0, cr.right - cr.left)
        ch = max(0, cr.bottom - cr.top)
        isMax = windowIsMaximized(hwnd)
        if not isMax:
          nearLeft = p.x < ResizeBorderPx
          nearRight = p.x >= cw - ResizeBorderPx
          nearTop = p.y < ResizeBorderPx
          nearBottom = p.y >= ch - ResizeBorderPx
          if nearTop and nearLeft:
            return HTTOPLEFT
          if nearTop and nearRight:
            return HTTOPRIGHT
          if nearBottom and nearLeft:
            return HTBOTTOMLEFT
          if nearBottom and nearRight:
            return HTBOTTOMRIGHT
          if nearTop:
            return HTTOP
          if nearBottom:
            return HTBOTTOM
          if nearLeft:
            return HTLEFT
          if nearRight:
            return HTRIGHT
        if p.y >= -NativeTopBorderGuardPx and p.y < st.titleHeight and
           p.x >= -NativeTopBorderGuardPx and p.x <= cw + NativeTopBorderGuardPx:
          return HTCAPTION.int
        # TODO(windows-snap): integrate native snap affordances (top-edge maximize snap and
        # Win11 snap layouts preview) without regressing this hit-test baseline.
      return CallWindowProcW(st.oldProc, hwnd, msg, wParam, lParam)
    of WM_NCDESTROY:
      let oldProc = st.oldProc
      nativeCaptionHooks.del(key)
      return CallWindowProcW(oldProc, hwnd, msg, wParam, lParam)
    else:
      return CallWindowProcW(st.oldProc, hwnd, msg, wParam, lParam)

  proc installNativeCaptionHookForWindow(w: GtkWidget; titleHeightPx: cint): bool =
    ## Resolves HWND for GtkWindow and installs caption hit-test hook.
    var
      s0: GdkSurface
      hwnd: Hwnd
    if w.isNil:
      barDebugLog("installHook skipped: window is nil")
      return false
    s0 = gtk_native_get_surface(w)
    if s0.isNil:
      barDebugLog("installHook deferred: native surface is nil")
      return false
    hwnd = gdk_win32_surface_get_impl_hwnd(s0)
    if hwnd == nil:
      hwnd = gdk_win32_surface_get_handle(s0)
    if hwnd == nil:
      barDebugLog("installHook deferred: hwnd is nil")
      return false
    result = installNativeCaptionHook(hwnd, titleHeightPx)

  proc onFramelessRealize(widget: GtkWidget; data: pointer) {.cdecl.} =
    ## Installs the Win32 top-strip hit-test hook when window is realized.
    discard data
    let ok = installNativeCaptionHookForWindow(widget, DebugBarHeight)
    barDebugLog("realize hook install=" & $ok)

  proc onFramelessMap(widget: GtkWidget; data: pointer) {.cdecl.} =
    ## Retries hook install when window is mapped.
    discard data
    let ok = installNativeCaptionHookForWindow(widget, DebugBarHeight)
    barDebugLog("map hook install=" & $ok)

renderable NativeCaptionBar of BaseWidget:
  ## Top in-window caption bar used for debug hit-test strip visualization.
  barHeight: int = DebugBarHeight

  hooks:
    beforeBuild:
      state.internalWidget = gtk_box_new(GTK_ORIENTATION_HORIZONTAL, 0)

  hooks barHeight:
    property:
      gtk_widget_set_size_request(state.internalWidget, -1, cint(state.barHeight))

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
      when defined(windows):
        let ok = installNativeCaptionHookForWindow(state.internalWidget, DebugBarHeight)
        barDebugLog("decorated hook install=" & $ok)

  hooks child:
    (build, update):
      state.updateChild(state.child, widget.valChild, gtk_window_set_child)
      when defined(windows):
        let ok = installNativeCaptionHookForWindow(state.internalWidget, DebugBarHeight)
        barDebugLog("child hook install=" & $ok)

  adder add:
    if widget.hasChild:
      raise newException(ValueError, "Unable to add multiple children to a FramelessWindow.")
    widget.hasChild = true
    widget.valChild = child

var
  UseCustomTitlebar = true

viewable OwlCustomBarDebugApp:
  dummy: bool = true

method view(s: OwlCustomBarDebugAppState): Widget =
  ## s: app state to render.
  result = gui:
    FramelessWindow:
      title = AppName
      defaultSize = (1360, 900)
      decorated = not UseCustomTitlebar
      Box:
        orient = OrientY
        if UseCustomTitlebar:
          NativeCaptionBar {.expand: false.}:
            barHeight = DebugBarHeight
            style = StyleClass("debug-header")
        Box {.expand: true.}:
          orient = OrientY
          style = StyleClass("debug-content")

proc resolveConfigPath(): string =
  ## Resolves local path to markdown config for this example variant.
  result = joinPath(currentSourcePath().splitFile.dir, "config.md")

proc resolveDebugStylesheetPath(): string =
  ## Resolves local path to debug overlay stylesheet.
  result = joinPath(currentSourcePath().splitFile.dir, "debug_layout.css")

when isMainModule:
  putEnv("HESTIA_OWL_BAR_DEBUG", "1")
  let cfg = enhance(resolveConfigPath())
  let p = resolveStylesheetPath()
  let dp = resolveDebugStylesheetPath()
  var ss: seq[Stylesheet] = @[]
  if cfg.useThemeStylesheet and p.len > 0:
    ss.add(loadStylesheet(p))
  if fileExists(dp):
    ss.add(loadStylesheet(dp))
  UseCustomTitlebar = not cfg.disableTitlebar
  brew(gui(OwlCustomBarDebugApp()), stylesheets = ss)
