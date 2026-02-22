# ==============================================================
# | Native Custom (Windows)                                   |
# |------------------------------------------------------------|
# | Minimal Electron-like custom titlebar primitives:         |
# | 1) caption button hit-test mapping                        |
# | 2) delegated non-client hit-test flow                     |
# | 3) frame style-bit setup for frameless-like windows       |
# ==============================================================

import std/tables
import owlkettle/bindings/gtk

type
  GdkSurface = distinct pointer

proc isNil(obj: GdkSurface): bool {.borrow.}
proc gtk_native_get_surface(native: GtkWidget): GdkSurface {.cdecl, importc.}

when defined(windows):
  type
    Hwnd* = pointer

    WinPoint* = object
      x*: cint
      y*: cint

    WinRect* = object
      left*: cint
      top*: cint
      right*: cint
      bottom*: cint

    NativeCaptionButtons* = object
      minButton*: WinRect
      maxButton*: WinRect
      restoreButton*: WinRect
      closeButton*: WinRect
      container*: WinRect

    NativeCustomConfig* = object
      overlayEnabled*: bool
      removeNcArea*: bool
      titleHeight*: cint
      resizeBorder*: cint
      resizeCornerWidth*: cint
      buttonWidth*: cint
      buttonSpacing*: cint
      buttonRightPadding*: cint
      leftCaptionInset*: cint
      captionButtonTopInset*: cint
      preventTopResizeOverButtons*: bool
      preferDwmCaptionBounds*: bool
      canResize*: bool
      minimizable*: bool
      maximizable*: bool
      includeSystemMenu*: bool

    NativeCustomHookState = ref object
      oldProc: pointer
      cfg: NativeCustomConfig

  const
    WM_NCCALCSIZE* = 0x0083'u32
    WM_NCHITTEST* = 0x0084'u32
    WM_NCMOUSEMOVE* = 0x00A0'u32
    WM_NCLBUTTONDOWN* = 0x00A1'u32
    WM_NCLBUTTONUP* = 0x00A2'u32
    WM_NCLBUTTONDBLCLK* = 0x00A3'u32
    WM_NCUAHDRAWCAPTION* = 0x00AE'u32
    WM_NCUAHDRAWFRAME* = 0x00AF'u32
    WM_SYSCOMMAND* = 0x0112'u32
    WM_NCPAINT* = 0x0085'u32
    WM_NCACTIVATE* = 0x0086'u32
    WM_NCDESTROY* = 0x0082'u32
    DWMWA_CAPTION_BUTTON_BOUNDS* = 5'u32
    HTNOWHERE* = 0
    HTCLIENT* = 1
    HTCAPTION* = 2
    HTMINBUTTON* = 8
    HTMAXBUTTON* = 9
    HTCLOSE* = 20
    HTLEFT* = 10
    HTRIGHT* = 11
    HTTOP* = 12
    HTTOPLEFT* = 13
    HTTOPRIGHT* = 14
    HTBOTTOM* = 15
    HTBOTTOMLEFT* = 16
    HTBOTTOMRIGHT* = 17
    SC_MINIMIZE = 0xF020'u
    SC_MAXIMIZE = 0xF030'u
    SC_CLOSE = 0xF060'u
    SC_RESTORE = 0xF120'u

    GWLP_WNDPROC = -4
    GWL_STYLE* = -16
    WS_OVERLAPPED* = 0x00000000'i32
    WS_CAPTION* = 0x00C00000
    WS_THICKFRAME* = 0x00040000
    WS_MINIMIZEBOX* = 0x00020000
    WS_MAXIMIZEBOX* = 0x00010000
    WS_SYSMENU* = 0x00080000
    SWP_NOSIZE = 0x0001'u32
    SWP_NOMOVE = 0x0002'u32
    SWP_NOZORDER = 0x0004'u32
    SWP_NOACTIVATE = 0x0010'u32
    SWP_FRAMECHANGED = 0x0020'u32

  proc gdk_win32_surface_get_impl_hwnd(surface: GdkSurface): Hwnd {.cdecl, importc.}
  proc gdk_win32_surface_get_handle(surface: GdkSurface): Hwnd {.cdecl, importc.}
  proc GetClientRect(wnd: Hwnd; rect: ptr WinRect): int32 {.stdcall, dynlib: "user32", importc.}
  proc ScreenToClient(wnd: Hwnd; p: ptr WinPoint): int32 {.stdcall, dynlib: "user32", importc.}
  proc DefWindowProcW(wnd: Hwnd; msg: uint32; wParam: uint; lParam: int): int {.stdcall, dynlib: "user32", importc.}
  proc SendMessageW(wnd: Hwnd; msg: uint32; wParam: uint; lParam: int): int {.stdcall, dynlib: "user32", importc.}
  proc SetWindowLongPtrW(wnd: Hwnd; index: cint; newLong: int): int {.stdcall, dynlib: "user32", importc.}
  proc CallWindowProcW(prev: pointer; wnd: Hwnd; msg: uint32; wParam: uint; lParam: int): int {.stdcall, dynlib: "user32", importc.}
  proc SetWindowPos(wnd, insertAfter: Hwnd;
                    x, y, cx, cy: cint;
                    flags: uint32): int32 {.stdcall, dynlib: "user32", importc.}
  proc IsZoomed(wnd: Hwnd): int32 {.stdcall, dynlib: "user32", importc.}
  proc DwmGetWindowAttribute(hwnd: Hwnd; dwAttribute: uint32; pvAttribute: pointer; cbAttribute: uint32): int32 {.stdcall, dynlib: "dwmapi", importc.}

  var nativeCustomHooks: Table[uint, NativeCustomHookState]

  proc defaultNativeCustomConfig*(): NativeCustomConfig =
    ## Returns defaults for Electron-like custom titlebar behavior.
    result.overlayEnabled = true
    result.removeNcArea = true
    result.titleHeight = 40
    result.resizeBorder = 5
    result.resizeCornerWidth = 16
    result.buttonWidth = 46
    result.buttonSpacing = 0
    result.buttonRightPadding = 0
    result.leftCaptionInset = 0
    result.captionButtonTopInset = 1
    result.preventTopResizeOverButtons = true
    result.preferDwmCaptionBounds = true
    result.canResize = true
    result.minimizable = true
    result.maximizable = true
    result.includeSystemMenu = false

  proc hwndKey(hwnd: Hwnd): uint =
    ## Returns stable integer key for HWND map lookups.
    result = cast[uint](hwnd)

  proc signedLowWord(lp: int): cint =
    ## Extracts signed LOWORD from LPARAM.
    result = cast[cshort](lp and 0xFFFF).cint

  proc signedHighWord(lp: int): cint =
    ## Extracts signed HIWORD from LPARAM.
    result = cast[cshort]((lp shr 16) and 0xFFFF).cint

  proc pointInRect(p: WinPoint; r: WinRect): bool =
    ## Returns true when point lies inside rectangle.
    result = p.x >= r.left and p.x < r.right and p.y >= r.top and p.y < r.bottom

  proc rectValid(r: WinRect): bool =
    ## Returns true when rectangle has positive area.
    result = r.right > r.left and r.bottom > r.top

  proc ncHitFromWparam(wParam: uint): cint =
    ## Returns non-client hit code from wParam low word.
    result = cast[cint](wParam and 0xFFFF'u)

  proc getDwmCaptionButtons(hwnd: Hwnd; titleHeight, minButtonWidth: cint;
                           hasMin, hasMax, isMaximized: bool): tuple[ok: bool, buttons: NativeCaptionButtons] =
    ## Uses DWMWA_CAPTION_BUTTON_BOUNDS when available and splits into min/max/close segments.
    var r: WinRect
    let hr = DwmGetWindowAttribute(hwnd, DWMWA_CAPTION_BUTTON_BOUNDS, r.addr, sizeof(r).uint32)
    if hr < 0 or r.right <= r.left or r.bottom <= r.top:
      return (false, NativeCaptionButtons())

    let
      buttonCount = 1 + (if hasMin: 1 else: 0) + (if hasMax: 1 else: 0)
      rawWidth = r.right - r.left
      segmentWidth = max(minButtonWidth, (rawWidth div max(1, buttonCount)).cint)
      rightEdge = r.right
      closeLeft = max(r.left, rightEdge - segmentWidth)
      topEdge = r.top
      bottomEdge = max(r.bottom, topEdge + max(1, titleHeight))
    var cursorLeft: cint = closeLeft

    result.ok = true
    result.buttons.closeButton = WinRect(left: closeLeft, top: topEdge, right: rightEdge, bottom: bottomEdge)
    if hasMax:
      let slot = WinRect(left: max(r.left, cursorLeft - segmentWidth), top: topEdge, right: cursorLeft, bottom: bottomEdge)
      if isMaximized:
        result.buttons.restoreButton = slot
      else:
        result.buttons.maxButton = slot
      cursorLeft = slot.left
    if hasMin:
      let slot = WinRect(left: max(r.left, cursorLeft - segmentWidth), top: topEdge, right: cursorLeft, bottom: bottomEdge)
      result.buttons.minButton = slot
      cursorLeft = slot.left
    result.buttons.container = WinRect(left: cursorLeft, top: topEdge, right: rightEdge, bottom: bottomEdge)

  proc applyElectronLikeFrameStyle*(hwnd: Hwnd; cfg: NativeCustomConfig): bool =
    ## Applies Electron-like frame style bits for custom-titlebar windows.
    var frameStyle: int = WS_CAPTION or WS_OVERLAPPED
    if hwnd == nil:
      return false
    if cfg.canResize:
      frameStyle = frameStyle or WS_THICKFRAME
    if cfg.minimizable:
      frameStyle = frameStyle or WS_MINIMIZEBOX
    if cfg.maximizable and cfg.canResize:
      frameStyle = frameStyle or WS_MAXIMIZEBOX
    if cfg.includeSystemMenu:
      frameStyle = frameStyle or WS_SYSMENU
    discard SetWindowLongPtrW(hwnd, GWL_STYLE, frameStyle)
    discard SetWindowPos(hwnd, nil, 0, 0, 0, 0,
      SWP_NOMOVE or SWP_NOSIZE or SWP_NOZORDER or SWP_NOACTIVATE or SWP_FRAMECHANGED)
    result = true

  proc resolveCaptionButtons*(clientWidth, titleHeight, buttonWidth, spacing, rightPadding: cint;
                              hasMin, hasMax, isMaximized: bool): NativeCaptionButtons =
    ## Resolves caption-button rectangles anchored to the right edge.
    let rightEdge = max(0, clientWidth - rightPadding)
    let closeLeft = rightEdge - buttonWidth
    var cursorLeft = closeLeft
    result.closeButton = WinRect(left: max(0, closeLeft), top: 0, right: max(0, rightEdge), bottom: max(1, titleHeight))
    if hasMax:
      let slotRight = cursorLeft - spacing
      let slotLeft = slotRight - buttonWidth
      if isMaximized:
        result.restoreButton = WinRect(left: max(0, slotLeft), top: 0, right: max(0, slotRight), bottom: max(1, titleHeight))
      else:
        result.maxButton = WinRect(left: max(0, slotLeft), top: 0, right: max(0, slotRight), bottom: max(1, titleHeight))
      cursorLeft = slotLeft
    if hasMin:
      let slotRight = cursorLeft - spacing
      let slotLeft = slotRight - buttonWidth
      result.minButton = WinRect(left: max(0, slotLeft), top: 0, right: max(0, slotRight), bottom: max(1, titleHeight))
      cursorLeft = slotLeft
    result.container = WinRect(
      left: max(0, cursorLeft),
      top: 0,
      right: result.closeButton.right,
      bottom: max(1, titleHeight)
    )

  proc captionButtonsNonClientHitTest*(buttons: NativeCaptionButtons; point: WinPoint): cint =
    ## Electron-like caption hit-test mapping.
    if rectValid(buttons.minButton) and pointInRect(point, buttons.minButton):
      return HTMINBUTTON
    if rectValid(buttons.maxButton) and pointInRect(point, buttons.maxButton):
      return HTMAXBUTTON
    if rectValid(buttons.restoreButton) and pointInRect(point, buttons.restoreButton):
      return HTMAXBUTTON
    if rectValid(buttons.closeButton) and pointInRect(point, buttons.closeButton):
      return HTCLOSE
    result = HTCAPTION

  proc fallbackFramelessHitTest*(point: WinPoint; clientRect: WinRect; cfg: NativeCustomConfig): cint =
    ## Fallback hit-testing (resize + caption + client).
    let
      cw = max(0, clientRect.right - clientRect.left)
      ch = max(0, clientRect.bottom - clientRect.top)
      b = max(0, cfg.resizeBorder)
      corner = max(b, cfg.resizeCornerWidth)
      nearLeft = cfg.canResize and point.x < b
      nearRight = cfg.canResize and point.x >= cw - b
      nearTop = cfg.canResize and point.y < b
      nearBottom = cfg.canResize and point.y >= ch - b
      topLeftCorner = cfg.canResize and point.x < corner and point.y < corner
      topRightCorner = cfg.canResize and point.x >= cw - corner and point.y < corner
      bottomLeftCorner = cfg.canResize and point.x < corner and point.y >= ch - corner
      bottomRightCorner = cfg.canResize and point.x >= cw - corner and point.y >= ch - corner
    if topLeftCorner:
      return HTTOPLEFT
    if topRightCorner:
      return HTTOPRIGHT
    if bottomLeftCorner:
      return HTBOTTOMLEFT
    if bottomRightCorner:
      return HTBOTTOMRIGHT
    if nearLeft:
      return HTLEFT
    if nearRight:
      return HTRIGHT
    if nearTop:
      return HTTOP
    if nearBottom:
      return HTBOTTOM
    if point.y >= 0 and point.y < cfg.titleHeight and point.x >= cfg.leftCaptionInset and point.x < cw:
      return HTCAPTION
    result = HTCLIENT

  proc delegatedNonClientHitTest*(hwnd: Hwnd; point: WinPoint; clientRect: WinRect; cfg: NativeCustomConfig): cint =
    ## Delegates to caption-button mapping first, then falls back to frameless logic.
    let
      cw = max(0, clientRect.right - clientRect.left)
      hasMin = cfg.minimizable
      hasMax = cfg.maximizable and cfg.canResize
      isMaximized = IsZoomed(hwnd) != 0'i32
      fallbackButtons = resolveCaptionButtons(
        clientWidth = cw,
        titleHeight = max(1, cfg.titleHeight),
        buttonWidth = max(1, cfg.buttonWidth),
        spacing = max(0, cfg.buttonSpacing),
        rightPadding = max(0, cfg.buttonRightPadding),
        hasMin = hasMin,
        hasMax = hasMax,
        isMaximized = isMaximized
      )
      dwmButtons = if cfg.preferDwmCaptionBounds:
        getDwmCaptionButtons(hwnd, max(1, cfg.titleHeight), max(1, cfg.buttonWidth), hasMin, hasMax, isMaximized)
      else:
        (false, NativeCaptionButtons())
      buttons = if dwmButtons.ok: dwmButtons.buttons else: fallbackButtons
    if cfg.overlayEnabled and point.y >= 0 and point.y < max(cfg.titleHeight, buttons.container.bottom):
      if pointInRect(point, buttons.container):
        let r = captionButtonsNonClientHitTest(buttons, point)
        if r != HTNOWHERE:
          return r
    if cfg.overlayEnabled and cfg.preventTopResizeOverButtons and cfg.canResize:
      if point.x >= buttons.container.left + max(0, cfg.captionButtonTopInset) and
         point.x < buttons.container.right and
         point.y >= buttons.container.top and point.y < buttons.container.bottom:
        return HTNOWHERE
    result = fallbackFramelessHitTest(point, clientRect, cfg)

  proc nativeCustomWndProc(hwnd: Hwnd; msg: uint32; wParam: uint; lParam: int): int {.stdcall.}

  proc installNativeCustomHook*(hwnd: Hwnd; cfg: NativeCustomConfig = defaultNativeCustomConfig()): bool =
    ## Installs (or updates) WNDPROC for Electron-like custom titlebar hit-testing.
    if hwnd == nil:
      return false
    discard applyElectronLikeFrameStyle(hwnd, cfg)
    let key = hwndKey(hwnd)
    if key in nativeCustomHooks:
      nativeCustomHooks[key].cfg = cfg
      return true
    let oldLong = SetWindowLongPtrW(hwnd, GWLP_WNDPROC, cast[int](cast[pointer](nativeCustomWndProc)))
    if oldLong == 0:
      return false
    nativeCustomHooks[key] = NativeCustomHookState(oldProc: cast[pointer](oldLong), cfg: cfg)
    result = true

  proc removeNativeCustomHook*(hwnd: Hwnd): bool =
    ## Removes tracked hook state when needed by caller.
    let key = hwndKey(hwnd)
    if key notin nativeCustomHooks:
      return false
    let st = nativeCustomHooks[key]
    discard SetWindowLongPtrW(hwnd, GWLP_WNDPROC, cast[int](st.oldProc))
    nativeCustomHooks.del(key)
    result = true

  proc nativeCustomWndProc(hwnd: Hwnd; msg: uint32; wParam: uint; lParam: int): int {.stdcall.} =
    ## WNDPROC implementing A/B/C Electron-like logic.
    let key = hwndKey(hwnd)
    if key notin nativeCustomHooks:
      return DefWindowProcW(hwnd, msg, wParam, lParam)
    let st = nativeCustomHooks[key]
    case msg
    of WM_NCCALCSIZE:
      if st.cfg.removeNcArea:
        return 0
      return CallWindowProcW(st.oldProc, hwnd, msg, wParam, lParam)
    of WM_NCACTIVATE:
      if st.cfg.removeNcArea:
        return 1
      return CallWindowProcW(st.oldProc, hwnd, msg, wParam, lParam)
    of WM_NCPAINT:
      if st.cfg.removeNcArea:
        return 0
      return CallWindowProcW(st.oldProc, hwnd, msg, wParam, lParam)
    of WM_NCUAHDRAWCAPTION, WM_NCUAHDRAWFRAME:
      if st.cfg.removeNcArea:
        return 0
      return CallWindowProcW(st.oldProc, hwnd, msg, wParam, lParam)
    of WM_NCHITTEST:
      var
        p: WinPoint
        cr: WinRect
      p.x = signedLowWord(lParam)
      p.y = signedHighWord(lParam)
      if ScreenToClient(hwnd, p.addr) != 0'i32 and GetClientRect(hwnd, cr.addr) != 0'i32:
        return delegatedNonClientHitTest(hwnd, p, cr, st.cfg).int
      return CallWindowProcW(st.oldProc, hwnd, msg, wParam, lParam)
    of WM_NCMOUSEMOVE:
      if st.cfg.overlayEnabled:
        return DefWindowProcW(hwnd, msg, wParam, lParam)
      return CallWindowProcW(st.oldProc, hwnd, msg, wParam, lParam)
    of WM_NCLBUTTONDOWN:
      if st.cfg.overlayEnabled:
        let hit = ncHitFromWparam(wParam)
        case hit
        of HTMINBUTTON:
          discard SendMessageW(hwnd, WM_SYSCOMMAND, SC_MINIMIZE, 0)
          return 0
        of HTMAXBUTTON:
          if IsZoomed(hwnd) != 0'i32:
            discard SendMessageW(hwnd, WM_SYSCOMMAND, SC_RESTORE, 0)
          else:
            discard SendMessageW(hwnd, WM_SYSCOMMAND, SC_MAXIMIZE, 0)
          return 0
        of HTCLOSE:
          discard SendMessageW(hwnd, WM_SYSCOMMAND, SC_CLOSE, 0)
          return 0
        of HTCAPTION:
          return DefWindowProcW(hwnd, msg, wParam, lParam)
        else:
          return DefWindowProcW(hwnd, msg, wParam, lParam)
      return CallWindowProcW(st.oldProc, hwnd, msg, wParam, lParam)
    of WM_NCLBUTTONDBLCLK:
      if st.cfg.overlayEnabled:
        let hit = ncHitFromWparam(wParam)
        if hit == HTCAPTION or hit == HTMAXBUTTON:
          if IsZoomed(hwnd) != 0'i32:
            discard SendMessageW(hwnd, WM_SYSCOMMAND, SC_RESTORE, 0)
          else:
            discard SendMessageW(hwnd, WM_SYSCOMMAND, SC_MAXIMIZE, 0)
          return 0
        return DefWindowProcW(hwnd, msg, wParam, lParam)
      return CallWindowProcW(st.oldProc, hwnd, msg, wParam, lParam)
    of WM_NCLBUTTONUP:
      if st.cfg.overlayEnabled:
        return DefWindowProcW(hwnd, msg, wParam, lParam)
      return CallWindowProcW(st.oldProc, hwnd, msg, wParam, lParam)
    of WM_NCDESTROY:
      let oldProc = st.oldProc
      nativeCustomHooks.del(key)
      return CallWindowProcW(oldProc, hwnd, msg, wParam, lParam)
    else:
      return CallWindowProcW(st.oldProc, hwnd, msg, wParam, lParam)

  proc installNativeCustomHookForGtkWindow*(window: GtkWidget;
                                           cfg: NativeCustomConfig = defaultNativeCustomConfig()): bool =
    ## Resolves HWND from GtkWindow and installs native custom hook.
    var
      surface: GdkSurface
      hwnd: Hwnd
    if window.isNil:
      return false
    surface = gtk_native_get_surface(window)
    if surface.isNil:
      return false
    hwnd = gdk_win32_surface_get_impl_hwnd(surface)
    if hwnd == nil:
      hwnd = gdk_win32_surface_get_handle(surface)
    if hwnd == nil:
      return false
    result = installNativeCustomHook(hwnd, cfg)

else:
  type
    Hwnd* = pointer
    WinPoint* = object
      x*: cint
      y*: cint
    WinRect* = object
      left*: cint
      top*: cint
      right*: cint
      bottom*: cint
    NativeCaptionButtons* = object
    NativeCustomConfig* = object

  const
    HTNOWHERE* = 0
    HTCLIENT* = 1
    HTCAPTION* = 2
    HTMINBUTTON* = 8
    HTMAXBUTTON* = 9
    HTCLOSE* = 20

  proc defaultNativeCustomConfig*(): NativeCustomConfig =
    ## Non-Windows stub.
    result = NativeCustomConfig()

  proc applyElectronLikeFrameStyle*(hwnd: Hwnd; cfg: NativeCustomConfig): bool =
    ## Non-Windows stub.
    discard hwnd
    discard cfg
    result = false

  proc resolveCaptionButtons*(clientWidth, titleHeight, buttonWidth, spacing, rightPadding: cint;
                              hasMin, hasMax, isMaximized: bool): NativeCaptionButtons =
    ## Non-Windows stub.
    discard clientWidth
    discard titleHeight
    discard buttonWidth
    discard spacing
    discard rightPadding
    discard hasMin
    discard hasMax
    discard isMaximized
    result = NativeCaptionButtons()

  proc captionButtonsNonClientHitTest*(buttons: NativeCaptionButtons; point: WinPoint): cint =
    ## Non-Windows stub.
    discard buttons
    discard point
    result = HTNOWHERE

  proc fallbackFramelessHitTest*(point: WinPoint; clientRect: WinRect; cfg: NativeCustomConfig): cint =
    ## Non-Windows stub.
    discard point
    discard clientRect
    discard cfg
    result = HTCLIENT

  proc delegatedNonClientHitTest*(hwnd: Hwnd; point: WinPoint; clientRect: WinRect; cfg: NativeCustomConfig): cint =
    ## Non-Windows stub.
    discard hwnd
    discard point
    discard clientRect
    discard cfg
    result = HTCLIENT

  proc installNativeCustomHook*(hwnd: Hwnd; cfg: NativeCustomConfig = defaultNativeCustomConfig()): bool =
    ## Non-Windows stub.
    discard hwnd
    discard cfg
    result = false

  proc removeNativeCustomHook*(hwnd: Hwnd): bool =
    ## Non-Windows stub.
    discard hwnd
    result = false

  proc installNativeCustomHookForGtkWindow*(window: GtkWidget;
                                           cfg: NativeCustomConfig = defaultNativeCustomConfig()): bool =
    ## Non-Windows stub.
    discard window
    discard cfg
    result = false
