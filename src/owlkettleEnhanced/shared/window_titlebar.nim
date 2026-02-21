# ============================================================
# | Tungsten Window Helpers                                 |
# |---------------------------------------------------------|
# | Windows titlebar helpers for GTK/owkettle applications. |
# ============================================================

import owlkettle
import owlkettle/widgetdef
import owlkettle/widgetutils
import owlkettle/bindings/gtk
import std/[os, tables]

const
  LeftMouseButton = 1'u
  DragThreshold = 4.0
  DoubleClickThresholdMs = 500'u32
  DoubleClickDistancePx = 6.0
  DefaultRightNoDragPx = 192

type
  GdkSurface = distinct pointer
  GdkDevice = distinct pointer
  GdkToplevel = distinct pointer

  GtkPropagationPhase = enum
    GTK_PHASE_NONE,
    GTK_PHASE_CAPTURE,
    GTK_PHASE_BUBBLE,
    GTK_PHASE_TARGET

  WindowDragStateObj = object
    pressed: bool
    dragStarted: bool
    pressButton: cuint
    pressX: cdouble
    pressY: cdouble
    pressScreenValid: bool
    pressScreenX: cint
    pressScreenY: cint
    pressMaxRectValid: bool
    pressMaxLeft: cint
    pressMaxTop: cint
    pressMaxWidth: cint
    pressMaxHeight: cint
    pressStartedMaximized: bool
    restoreWidth: cint
    restoreHeight: cint
    nativeHookEnabled: bool
    rightNoDragPx: cint
    lastPressTime: uint32
    lastPressX: cdouble
    lastPressY: cdouble

  WindowDragState = ref WindowDragStateObj

proc isNil(obj: GdkSurface): bool {.borrow.}
proc isNil(obj: GdkDevice): bool {.borrow.}

proc gtk_window_handle_new*(): GtkWidget {.cdecl, importc.}
proc gtk_window_handle_set_child*(h: GtkWidget; c: GtkWidget) {.cdecl, importc.}
proc gtk_native_get_surface(native: GtkWidget): GdkSurface {.cdecl, importc.}
proc gdk_surface_get_width(surface: GdkSurface): cint {.cdecl, importc.}
proc gtk_window_is_maximized(window: GtkWidget): cbool {.cdecl, importc.}
proc gtk_window_maximize(window: GtkWidget) {.cdecl, importc.}
proc gtk_window_unmaximize(window: GtkWidget) {.cdecl, importc.}
proc gtk_window_get_default_size(window: GtkWidget; width, height: ptr cint) {.cdecl, importc.}
proc gtk_widget_get_parent(widget: GtkWidget): GtkWidget {.cdecl, importc.}
proc gtk_event_controller_set_propagation_phase(cont: GtkEventController;
                                                phase: GtkPropagationPhase) {.cdecl, importc.}
proc gtk_event_controller_reset(cont: GtkEventController) {.cdecl, importc.}
proc gdk_event_get_device(event: GdkEvent): GdkDevice {.cdecl, importc.}
proc gdk_toplevel_begin_move(toplevel: GdkToplevel;
                             device: GdkDevice;
                             button: cint;
                             x, y: cdouble;
                             timestamp: uint32) {.cdecl, importc.}

when defined(windows):
  type
    Hwnd = pointer
    Hmonitor = pointer

    WinPoint = object
      x: cint
      y: cint

    WinRect = object
      left: cint
      top: cint
      right: cint
      bottom: cint

    WinMonitorInfo = object
      cbSize: uint32
      rcMonitor: WinRect
      rcWork: WinRect
      dwFlags: uint32

    WinWindowPlacement = object
      length: uint32
      flags: uint32
      showCmd: uint32
      ptMinPosition: WinPoint
      ptMaxPosition: WinPoint
      rcNormalPosition: WinRect

  const
    WM_NCHITTEST = 0x0084'u32
    WM_NCDESTROY = 0x0082'u32
    WM_NCLBUTTONDOWN = 0x00A1'u32
    HTCLIENT = 1
    HTCAPTION = 2'u
    GWLP_WNDPROC = -4
    NativeTitleButtonsReservePx = DefaultRightNoDragPx
    NativeTitleMinHeightPx = 52
    NativeTopBorderGuardPx = 16
    SWP_NOZORDER = 0x0004'u32
    SWP_NOACTIVATE = 0x0010'u32
    MONITOR_DEFAULTTONEAREST = 0x00000002'u32
    SW_SHOWMAXIMIZED = 3'u32
    SW_RESTORE = 9'i32

  proc gdk_win32_surface_get_handle(surface: GdkSurface): Hwnd {.cdecl, importc.}
  proc gdk_win32_surface_get_impl_hwnd(surface: GdkSurface): Hwnd {.cdecl, importc.}
  proc GetCursorPos(p: ptr WinPoint): int32 {.stdcall, dynlib: "user32", importc.}
  proc GetClientRect(wnd: Hwnd; rect: ptr WinRect): int32 {.stdcall, dynlib: "user32", importc.}
  proc ScreenToClient(wnd: Hwnd; p: ptr WinPoint): int32 {.stdcall, dynlib: "user32", importc.}
  proc GetWindowRect(wnd: Hwnd; rect: ptr WinRect): int32 {.stdcall, dynlib: "user32", importc.}
  proc GetWindowPlacement(wnd: Hwnd; placement: ptr WinWindowPlacement): int32 {.stdcall, dynlib: "user32", importc.}
  proc DefWindowProcW(wnd: Hwnd; msg: uint32; wParam: uint; lParam: int): int {.stdcall, dynlib: "user32", importc.}
  proc SetWindowLongPtrW(wnd: Hwnd; index: cint; newLong: int): int {.stdcall, dynlib: "user32", importc.}
  proc CallWindowProcW(prev: pointer; wnd: Hwnd; msg: uint32; wParam: uint; lParam: int): int {.stdcall, dynlib: "user32", importc.}
  proc ShowWindow(wnd: Hwnd; showCmd: cint): int32 {.stdcall, dynlib: "user32", importc.}
  proc SendMessageW(wnd: Hwnd; msg: uint32; wParam: uint; lParam: int): int {.stdcall, dynlib: "user32", importc.}
  proc MonitorFromWindow(wnd: Hwnd; flags: uint32): Hmonitor {.stdcall, dynlib: "user32", importc.}
  proc GetMonitorInfoW(mon: Hmonitor; info: ptr WinMonitorInfo): int32 {.
      stdcall, dynlib: "user32", importc: "GetMonitorInfoW".}
  proc SetWindowPos(wnd, insertAfter: Hwnd;
                    x, y, cx, cy: cint;
                    flags: uint32): int32 {.stdcall, dynlib: "user32", importc.}
  proc ReleaseCapture(): int32 {.stdcall, dynlib: "user32", importc.}

  type
    NativeCaptionHookState = ref object
      oldProc: pointer
      titleHeight: cint
      rightNoDragPx: cint

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

  proc installNativeCaptionHook(hwnd: Hwnd; titleHeightPx, rightNoDragPx: cint): bool =
    ## Installs (or updates) a Win32 WNDPROC hook that returns HTCAPTION for top-strip hit tests.
    if hwnd == nil:
      return false
    let key = hwndKey(hwnd)
    if key in nativeCaptionHooks:
      let st = nativeCaptionHooks[key]
      st.titleHeight = max(NativeTitleMinHeightPx, titleHeightPx)
      st.rightNoDragPx = max(0, rightNoDragPx)
      return true

    let oldLong = SetWindowLongPtrW(hwnd, GWLP_WNDPROC, cast[int](cast[pointer](nativeCaptionWndProc)))
    if oldLong == 0:
      return false

    nativeCaptionHooks[key] = NativeCaptionHookState(
      oldProc: cast[pointer](oldLong),
      titleHeight: max(NativeTitleMinHeightPx, titleHeightPx),
      rightNoDragPx: max(0, rightNoDragPx)
    )
    result = true

  proc nativeCaptionWndProc(hwnd: Hwnd; msg: uint32; wParam: uint; lParam: int): int {.stdcall.} =
    ## Handles WM_NCHITTEST for custom titlebar drag, while delegating everything else to previous proc.
    let key = hwndKey(hwnd)
    if key notin nativeCaptionHooks:
      return DefWindowProcW(hwnd, msg, wParam, lParam)

    let st = nativeCaptionHooks[key]
    case msg
    of WM_NCHITTEST:
      var
        p: WinPoint
        cr: WinRect
        cw: cint
        capRight: cint
        capTopMin: cint
      p.x = signedLowWord(lParam)
      p.y = signedHighWord(lParam)
      if ScreenToClient(hwnd, p.addr) != 0'i32 and GetClientRect(hwnd, cr.addr) != 0'i32:
        cw = max(0, cr.right - cr.left)
        capRight = max(0, cw - st.rightNoDragPx)
        capTopMin = -max(NativeTopBorderGuardPx, st.titleHeight)
        # Fully own top-strip hit testing to avoid HTTOP*/HTTOPRIGHT resize jitter.
        if p.y >= capTopMin and p.y < st.titleHeight and
           p.x >= -NativeTopBorderGuardPx and p.x <= cw + NativeTopBorderGuardPx:
          if p.x < capRight:
            return HTCAPTION.int
          return HTCLIENT
      let baseHit = CallWindowProcW(st.oldProc, hwnd, msg, wParam, lParam)
      return baseHit
    of WM_NCDESTROY:
      let oldProc = st.oldProc
      nativeCaptionHooks.del(key)
      return CallWindowProcW(oldProc, hwnd, msg, wParam, lParam)
    else:
      return CallWindowProcW(st.oldProc, hwnd, msg, wParam, lParam)

  proc ensureNativeCaptionHookForWidget(w: GtkWidget; st: WindowDragState): bool =
    ## Ensures the top-level Win32 window is hooked and updates draggable strip dimensions.
    var
      root: GtkWidget
      parent: GtkWidget
      surface: GdkSurface
      hwnd: Hwnd
      h: cint
      hParent: cint
    if st.isNil or w.isNil:
      return false
    root = gtk_widget_get_root(w)
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
    parent = gtk_widget_get_parent(w)
    h = gtk_widget_get_allocated_height(w)
    hParent = if parent.isNil: 0 else: gtk_widget_get_allocated_height(parent)
    h = max(h, hParent)
    h = max(h, NativeTitleMinHeightPx)
    result = installNativeCaptionHook(hwnd, h, max(0, st.rightNoDragPx))
    st.nativeHookEnabled = result

  proc ensureNativeCaptionHookForController(cont: GtkEventController; st: WindowDragState): bool =
    ## Ensures Win32 hit-test hook using the widget attached to this controller.
    let w = gtk_event_controller_get_widget(cont)
    result = ensureNativeCaptionHookForWidget(w, st)

  proc dragDebugEnabled(): bool =
    ## Enables verbose drag diagnostics when HESTIA_OWL_DRAG_DEBUG is set.
    result = getEnv("HESTIA_OWL_DRAG_DEBUG", "").len > 0

  proc dragDebugLog(msg: string) =
    ## Logs drag diagnostics only when explicitly enabled.
    if dragDebugEnabled():
      echo "[owl-drag] ", msg

  proc queryCursorPos(x, y: var cint): bool =
    ## x/y: receive current cursor position in virtual-screen coordinates.
    var p: WinPoint
    if GetCursorPos(p.addr) == 0'i32:
      return false
    x = p.x
    y = p.y
    result = true

  proc makeMouseLParam(x, y: cint): int =
    ## Packs signed screen coordinates into LPARAM format.
    var
      lx: uint32 = cast[uint32](x) and 0xFFFF'u32
      ly: uint32 = cast[uint32](y) and 0xFFFF'u32
    result = int(lx or (ly shl 16))

  proc clampInt(v, lo, hi: cint): cint =
    ## Clamps v to inclusive [lo..hi].
    if v < lo:
      return lo
    if v > hi:
      return hi
    result = v

  proc clamp01(v: cdouble): cdouble =
    ## Clamps floating point ratio into [0.0 .. 1.0].
    if v < 0.0:
      return 0.0
    if v > 1.0:
      return 1.0
    result = v

  proc getWorkArea(hwnd: Hwnd; r: var WinRect): bool =
    ## r: receives nearest monitor work area for hwnd.
    var
      mon: Hmonitor = MonitorFromWindow(hwnd, MONITOR_DEFAULTTONEAREST)
      mi: WinMonitorInfo
    if mon == nil:
      return false
    mi.cbSize = uint32(sizeof(mi))
    if GetMonitorInfoW(mon, mi.addr) == 0'i32:
      return false
    r = mi.rcWork
    result = true

  proc getWindowRectSafe(hwnd: Hwnd; r: var WinRect): bool =
    ## r: receives current top-level window rectangle.
    if hwnd == nil:
      return false
    result = (GetWindowRect(hwnd, r.addr) != 0'i32)

  proc queryWindowPlacement(hwnd: Hwnd; wp: var WinWindowPlacement): bool =
    ## wp: receives current window placement and normal/restored rectangle.
    if hwnd == nil:
      return false
    wp = WinWindowPlacement()
    wp.length = uint32(sizeof(wp))
    result = (GetWindowPlacement(hwnd, wp.addr) != 0'i32)

  proc getNormalRectFromPlacement(hwnd: Hwnd; r: var WinRect): bool =
    ## r: receives placement normal rect (restored size/position).
    var wp: WinWindowPlacement
    if not queryWindowPlacement(hwnd, wp):
      return false
    r = wp.rcNormalPosition
    result = true

  proc windowIsMaximized(hwnd: Hwnd): bool =
    ## True when native placement reports a maximized top-level window.
    var wp: WinWindowPlacement
    if not queryWindowPlacement(hwnd, wp):
      return false
    result = (wp.showCmd == SW_SHOWMAXIMIZED)

  proc clampRestoreTopLeft(hwnd: Hwnd; x, y, w, h: var cint) =
    ## Clamps restore top-left so restored window remains inside monitor work area.
    var
      wr: WinRect
      maxX: cint
      maxY: cint
      ww: cint = max(w, 1)
      hh: cint = max(h, 1)
    if not getWorkArea(hwnd, wr):
      return
    maxX = wr.right - ww
    maxY = wr.bottom - hh
    if maxX < wr.left:
      maxX = wr.left
    if maxY < wr.top:
      maxY = wr.top
    x = clampInt(x, wr.left, maxX)
    y = clampInt(y, wr.top, maxY)
    dragDebugLog("clamp workArea=[" & $wr.left & "," & $wr.top & " -> " &
      $wr.right & "," & $wr.bottom & "] size=(" & $w & "," & $h &
      ") result=(" & $x & "," & $y & ")")

  proc sizeLooksMaximizedLike(w, h, maxW, maxH: cint): bool =
    ## True when candidate size is effectively the maximized monitor size.
    let
      cw = max(w, 1)
      ch = max(h, 1)
      mw = max(maxW, 1)
      mh = max(maxH, 1)
    result = (cw >= mw - 8) and (ch >= mh - 8)

  proc chooseRestoreSize(st: WindowDragState; hwnd: Hwnd; fallbackGtkWindow: GtkWidget;
                         maxW, maxH: cint; restoreW, restoreH: var cint) =
    ## Chooses a non-maximized restore size with Win32-first fallbacks.
    var
      wr: WinRect
      gw: cint = 0
      gh: cint = 0

    # 1) Use last known non-maximized size from state when available.
    if st.restoreWidth > 0 and st.restoreHeight > 0 and
       (not sizeLooksMaximizedLike(st.restoreWidth, st.restoreHeight, maxW, maxH)):
      restoreW = st.restoreWidth
      restoreH = st.restoreHeight
      return

    # 2) Use native normal placement size.
    if getNormalRectFromPlacement(hwnd, wr):
      let
        pw = max(1, wr.right - wr.left)
        ph = max(1, wr.bottom - wr.top)
      if not sizeLooksMaximizedLike(pw, ph, maxW, maxH):
        restoreW = pw
        restoreH = ph
        return

    # 3) Use GTK default window size (app-provided defaultSize).
    gtk_window_get_default_size(fallbackGtkWindow, gw.addr, gh.addr)
    if gw > 0 and gh > 0:
      restoreW = gw
      restoreH = gh

    # 4) Last resort: use a reduced percentage of monitor size.
    if restoreW <= 0 or sizeLooksMaximizedLike(restoreW, max(restoreH, 1), maxW, maxH):
      restoreW = max(640, (maxW * 80) div 100)
    if restoreH <= 0 or sizeLooksMaximizedLike(max(restoreW, 1), restoreH, maxW, maxH):
      restoreH = max(420, (maxH * 80) div 100)

  proc anchoredRestoreXByRatio(cursorX: cint; st: WindowDragState;
                               maxLeft, maxWidth, restoreWidth: cint): cint =
    ## Keeps the press-time cursor-width ratio fixed after restore.
    var ratio: cdouble = 0.5
    let
      mw = max(maxWidth, 1)
      rw = max(restoreWidth, 1)
    if st.pressScreenValid and st.pressMaxRectValid and mw > 0:
      ratio = clamp01(cdouble(st.pressScreenX - maxLeft) / cdouble(mw))
    elif mw > 0:
      ratio = clamp01(st.pressX / cdouble(mw))
    result = cursorX - cint(ratio * cdouble(rw))

proc handleWindowHandleRealize(widget: GtkWidget; data: pointer) {.cdecl.} =
  ## Installs native Win32 caption hit-test hook once the widget is realized.
  when defined(windows):
    let st = cast[WindowDragState](data)
    discard ensureNativeCaptionHookForWidget(widget, st)

proc absDiff(a, b: cdouble): cdouble =
  ## Computes absolute delta without extra dependencies.
  if a >= b:
    result = a - b
  else:
    result = b - a

proc toggleWindowMaximizeForController(cont: GtkEventController): bool =
  ## Toggles maximize/restored state for the window attached to this controller.
  var
    w0: GtkWidget = gtk_event_controller_get_widget(cont)
    w1: GtkWidget
  if w0.isNil:
    return false
  w1 = gtk_widget_get_root(w0)
  if w1.isNil:
    return false
  when defined(windows):
    var
      s0: GdkSurface
      hwnd: Hwnd
    s0 = gtk_native_get_surface(w1)
    if not s0.isNil:
      hwnd = gdk_win32_surface_get_impl_hwnd(s0)
      if hwnd == nil:
        hwnd = gdk_win32_surface_get_handle(s0)
      if hwnd != nil:
        if windowIsMaximized(hwnd):
          discard ShowWindow(hwnd, SW_RESTORE.cint)
        else:
          discard ShowWindow(hwnd, SW_SHOWMAXIMIZED.cint)
        return true
  if gtk_window_is_maximized(w1) != 0:
    gtk_window_unmaximize(w1)
  else:
    gtk_window_maximize(w1)
  result = true

proc maybeHandleTitlebarDoubleClick(cont: GtkEventController; ev: GdkEvent;
                                    st: WindowDragState): bool =
  ## Handles double-click maximize toggle on the custom titlebar area.
  var
    x0: cdouble = 0.0
    y0: cdouble = 0.0
    clickTime: uint32
    dt: uint32
    isDouble: bool = false
  if st.isNil:
    return false
  if gdk_event_get_position(ev, x0.addr, y0.addr) == 0:
    return false
  clickTime = gdk_event_get_time(ev)
  if st.lastPressTime != 0'u32:
    if clickTime >= st.lastPressTime:
      dt = clickTime - st.lastPressTime
    else:
      dt = (high(uint32) - st.lastPressTime) + clickTime + 1'u32
    if dt <= DoubleClickThresholdMs and
       absDiff(x0, st.lastPressX) <= DoubleClickDistancePx and
       absDiff(y0, st.lastPressY) <= DoubleClickDistancePx:
      isDouble = true
  st.lastPressTime = clickTime
  st.lastPressX = x0
  st.lastPressY = y0
  if not isDouble:
    return false
  result = toggleWindowMaximizeForController(cont)
  if result:
    st.pressed = false
    st.dragStarted = false
    st.lastPressTime = 0'u32
    gtk_event_controller_reset(cont)

proc beginCenteredRestoreDrag(cont: GtkEventController; ev: GdkEvent; st: WindowDragState): bool =
  ## Starts drag from titlebar; on Windows uses native caption-drag for shell snap UX.
  var
    w0: GtkWidget = gtk_event_controller_get_widget(cont)
    w1: GtkWidget
    s0: GdkSurface
    x0: cdouble = 0.0
    y0: cdouble = 0.0
    restoreW: cint = st.restoreWidth
    restoreH: cint = st.restoreHeight
  if w0.isNil:
    return false
  w1 = gtk_widget_get_root(w0)
  if w1.isNil:
    return false
  if gdk_event_get_position(ev, x0.addr, y0.addr) == 0:
    return false
  s0 = gtk_native_get_surface(w1)
  if s0.isNil:
    return false

  when defined(windows):
    var
      hwnd: Hwnd = gdk_win32_surface_get_impl_hwnd(s0)
      cx: cint = 0
      cy: cint = 0
      dragLp: int = 0
      d0: GdkDevice
      maxRect: WinRect
      wa: WinRect
      maxW: cint = 0
      maxH: cint = 0
      anchorLeft: cint = 0
      anchorW: cint = 0
      tx: cint
      ty: cint
      isMaxNative: bool = false
      lx: cint
      ly: cint
    if hwnd == nil:
      hwnd = gdk_win32_surface_get_handle(s0)
      if hwnd == nil:
        return false
    if not queryCursorPos(cx, cy):
      return false
    if getWindowRectSafe(hwnd, maxRect):
      maxW = max(1, maxRect.right - maxRect.left)
      maxH = max(1, maxRect.bottom - maxRect.top)
    else:
      maxW = max(1, gdk_surface_get_width(s0))
      maxH = max(1, gtk_widget_get_allocated_height(w1))
    isMaxNative = windowIsMaximized(hwnd)
    dragLp = makeMouseLParam(cx, cy)
    if isMaxNative:
      chooseRestoreSize(st, hwnd, w1, maxW, maxH, restoreW, restoreH)
      anchorLeft = maxRect.left
      anchorW = maxW
      if st.pressMaxRectValid and st.pressMaxWidth > 0:
        anchorLeft = st.pressMaxLeft
        anchorW = st.pressMaxWidth
      tx = anchoredRestoreXByRatio(cx, st, anchorLeft, anchorW, restoreW)
      ty = cy - cint(st.pressY)
      if getWorkArea(hwnd, wa):
        let minTop = wa.top + 48
        if ty < minTop:
          ty = minTop
      clampRestoreTopLeft(hwnd, tx, ty, restoreW, restoreH)
      dragDebugLog("restore ratio cursor=(" & $cx & "," & $cy &
        ") pressScreen=(" & $st.pressScreenX & "," & $st.pressScreenY &
        ") max=(" & $anchorLeft & "," & $anchorW & ") restore=(" &
        $restoreW & "," & $restoreH & ") final=(" & $tx & "," & $ty & ")")
      discard ShowWindow(hwnd, SW_RESTORE.cint)
      discard SetWindowPos(hwnd, nil, tx, ty, restoreW, restoreH, SWP_NOZORDER or SWP_NOACTIVATE)
      d0 = gdk_event_get_device(ev)
      if not d0.isNil:
        lx = clampInt(cx - tx, 0, max(restoreW - 1, 0))
        ly = clampInt(cy - ty, 0, max(restoreH - 1, 0))
        gdk_toplevel_begin_move(cast[GdkToplevel](s0), d0, cint(st.pressButton),
          cdouble(lx), cdouble(ly), gdk_event_get_time(ev))
      else:
        discard ReleaseCapture()
        discard SendMessageW(hwnd, WM_NCLBUTTONDOWN, HTCAPTION, dragLp)
    else:
      discard ReleaseCapture()
      discard SendMessageW(hwnd, WM_NCLBUTTONDOWN, HTCAPTION, dragLp)
    # Reset local GTK drag/controller state so hover transitions recover immediately.
    st.pressed = false
    st.dragStarted = false
    gtk_event_controller_reset(cont)
    result = true
  else:
    var
      d0: GdkDevice
      x1: cdouble = x0
    if gtk_window_is_maximized(w1) != 0:
      if restoreW <= 0 or restoreH <= 0:
        gtk_window_get_default_size(w1, restoreW.addr, restoreH.addr)
      if restoreW <= 0:
        restoreW = gdk_surface_get_width(s0)
      if restoreW > 0:
        x1 = cdouble(restoreW) / 2.0
      gtk_window_unmaximize(w1)
    d0 = gdk_event_get_device(ev)
    if d0.isNil:
      return false
    gdk_toplevel_begin_move(cast[GdkToplevel](s0), d0, cint(st.pressButton), x1, y0, gdk_event_get_time(ev))
    result = true

proc handleWindowHandleEvent(cont: GtkEventController; ev: GdkEvent; data: pointer): cbool {.cdecl.} =
  ## Intercepts titlebar drag start to run custom maximize-restore anchoring.
  var
    st: WindowDragState = cast[WindowDragState](data)
    t0: GdkEventType
    x0: cdouble = 0.0
    y0: cdouble = 0.0
    handled: bool = false
    w0: GtkWidget
    w1: GtkWidget
    s0: GdkSurface
  if st.isNil:
    return 0
  t0 = gdk_event_get_event_type(ev)
  when defined(windows):
    discard ensureNativeCaptionHookForController(cont, st)
    if st.nativeHookEnabled:
      if t0 == GDK_BUTTON_PRESS and gdk_button_event_get_button(ev) == LeftMouseButton:
        if maybeHandleTitlebarDoubleClick(cont, ev, st):
          return 1
      return 0
  case t0
  of GDK_BUTTON_PRESS:
    st.pressButton = gdk_button_event_get_button(ev)
    if st.pressButton == LeftMouseButton:
      if maybeHandleTitlebarDoubleClick(cont, ev, st):
        return 1
      w0 = gtk_event_controller_get_widget(cont)
      if not w0.isNil:
        w1 = gtk_widget_get_root(w0)
        if not w1.isNil:
          let isMaxGtk = (gtk_window_is_maximized(w1) != 0)
          st.pressStartedMaximized = isMaxGtk
          s0 = gtk_native_get_surface(w1)
          if not s0.isNil:
            when defined(windows):
              var
                hwnd: Hwnd = gdk_win32_surface_get_impl_hwnd(s0)
                cx: cint = 0
                cy: cint = 0
                wr: WinRect
                nr: WinRect
                isMaxNative: bool = false
              if hwnd == nil:
                hwnd = gdk_win32_surface_get_handle(s0)
              if not hwnd.isNil:
                isMaxNative = windowIsMaximized(hwnd)
                st.pressStartedMaximized = isMaxNative
                if isMaxNative:
                  if getNormalRectFromPlacement(hwnd, nr):
                    st.restoreWidth = max(1, nr.right - nr.left)
                    st.restoreHeight = max(1, nr.bottom - nr.top)
                else:
                  if getWindowRectSafe(hwnd, wr):
                    let
                      cw = max(1, wr.right - wr.left)
                      ch = max(1, wr.bottom - wr.top)
                    if getWorkArea(hwnd, nr):
                      let
                        mw = max(1, nr.right - nr.left)
                        mh = max(1, nr.bottom - nr.top)
                      if not sizeLooksMaximizedLike(cw, ch, mw, mh):
                        st.restoreWidth = cw
                        st.restoreHeight = ch
                    else:
                      st.restoreWidth = cw
                      st.restoreHeight = ch
                  elif getNormalRectFromPlacement(hwnd, nr):
                    st.restoreWidth = max(1, nr.right - nr.left)
                    st.restoreHeight = max(1, nr.bottom - nr.top)
                  else:
                    st.restoreWidth = max(1, gdk_surface_get_width(s0))
                    st.restoreHeight = max(1, gtk_widget_get_allocated_height(w1))
                if queryCursorPos(cx, cy):
                  st.pressScreenX = cx
                  st.pressScreenY = cy
                  st.pressScreenValid = true
                else:
                  st.pressScreenX = 0
                  st.pressScreenY = 0
                  st.pressScreenValid = false
                if getWindowRectSafe(hwnd, wr):
                  st.pressMaxLeft = wr.left
                  st.pressMaxTop = wr.top
                  st.pressMaxWidth = max(1, wr.right - wr.left)
                  st.pressMaxHeight = max(1, wr.bottom - wr.top)
                  st.pressMaxRectValid = true
                else:
                  st.pressMaxLeft = 0
                  st.pressMaxTop = 0
                  st.pressMaxWidth = 0
                  st.pressMaxHeight = 0
                  st.pressMaxRectValid = false
              else:
                st.pressScreenX = 0
                st.pressScreenY = 0
                st.pressScreenValid = false
                st.pressMaxLeft = 0
                st.pressMaxTop = 0
                st.pressMaxWidth = 0
                st.pressMaxHeight = 0
                st.pressMaxRectValid = false
              dragDebugLog("press maxGtk=" & $isMaxGtk &
                " maxNative=" & $st.pressStartedMaximized & " pressScreen=(" &
                $st.pressScreenX & "," & $st.pressScreenY & ") maxRect=(" &
                $st.pressMaxLeft & "," & $st.pressMaxTop & " " &
                $st.pressMaxWidth & "x" & $st.pressMaxHeight & ") restore=(" &
                $st.restoreWidth & "," & $st.restoreHeight & ")")
            else:
              if not isMaxGtk:
                st.restoreWidth = gdk_surface_get_width(s0)
                st.restoreHeight = gtk_widget_get_allocated_height(w1)
      st.pressed = true
      st.dragStarted = false
      if gdk_event_get_position(ev, x0.addr, y0.addr) != 0:
        st.pressX = x0
        st.pressY = y0
  of GDK_BUTTON_RELEASE:
    when defined(windows):
      discard ReleaseCapture()
    st.pressed = false
    st.dragStarted = false
  of GDK_MOTION_NOTIFY:
    if st.pressed and st.pressButton == LeftMouseButton and not st.dragStarted:
      if gdk_event_get_position(ev, x0.addr, y0.addr) != 0:
        if absDiff(x0, st.pressX) >= DragThreshold or absDiff(y0, st.pressY) >= DragThreshold:
          handled = beginCenteredRestoreDrag(cont, ev, st)
          st.dragStarted = handled
  else:
    discard
  result = cbool(ord(handled))

renderable WindowHandle of BaseWidget:
  child: Widget
  rightNoDragPx: int = DefaultRightNoDragPx
  controller: GtkEventController = GtkEventController(nil)
  dragState {.private, onlyState.}: WindowDragState

  hooks:
    beforeBuild:
      var
        c0: GtkEventController
      state.internalWidget = gtk_window_handle_new()
      if state.dragState.isNil:
        state.dragState = WindowDragState()
      if widget.hasRightNoDragPx:
        state.dragState.rightNoDragPx = cint(max(0, widget.valRightNoDragPx))
      else:
        state.dragState.rightNoDragPx = DefaultRightNoDragPx.cint
      discard g_signal_connect(state.internalWidget, "realize",
        handleWindowHandleRealize, cast[pointer](state.dragState))
      if state.controller.isNil:
        c0 = gtk_event_controller_legacy_new()
        gtk_event_controller_set_propagation_phase(c0, GTK_PHASE_CAPTURE)
        discard g_signal_connect(c0, "event", handleWindowHandleEvent, cast[pointer](state.dragState))
        gtk_widget_add_controller(state.internalWidget, c0)
        state.controller = c0

  hooks child:
    (build, update):
      state.updateChild(state.child, widget.valChild, gtk_window_handle_set_child)

  adder add:
    if widget.hasChild:
      raise newException(ValueError, "Unable to add multiple children to a WindowHandle.")
    widget.hasChild = true
    widget.valChild = child

proc wrapWindowHandle*(w: Widget; rightNoDragPx: int): Widget =
  ## w: widget to wrap in a draggable window handle.
  ## rightNoDragPx: right-side width excluded from native caption drag hit-testing.
  result = gui:
    WindowHandle:
      rightNoDragPx = max(0, rightNoDragPx)
      insert w

proc wrapWindowHandle*(w: Widget): Widget =
  ## w: widget to wrap in a draggable window handle using default right no-drag reserve.
  result = gui:
    WindowHandle:
      rightNoDragPx = DefaultRightNoDragPx
      insert w

proc buildHeaderBarTitle*(ti: string): Widget =
  ## ti: title text to show in the header bar.
  result = gui:
    HeaderBar:
      showTitleButtons = true
      Box {.addTitle.}:
        orient = OrientY
        Label:
          text = ti
          xAlign = 0

proc buildWindowTitlebar*(ti: string): Widget =
  ## ti: title text for the window titlebar.
  var
    w0: Widget
  w0 = buildHeaderBarTitle(ti)
  when defined(windows):
    result = wrapWindowHandle(w0)
  else:
    result = w0
