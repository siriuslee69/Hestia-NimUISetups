# ============================================================
# | Windows Backdrop Helpers                                |
# |---------------------------------------------------------|
# | DWM system-backdrop bridge for GTK/Owlkettle windows.   |
# ============================================================

import owlkettle/bindings/gtk

type
  GdkSurface = distinct pointer

  WindowsBackdropKind* = enum
    wbkAuto,
    wbkNone,
    wbkMica,
    wbkAcrylic,
    wbkTabbed,
    wbkLegacyBlur

  WindowsBackdropResult* = object
    ok*: bool
    detail*: string
    apiUsed*: string

  WindowsVersionInfo* = object
    major*: int32
    minor*: int32
    build*: int32

proc isNil(obj: GdkSurface): bool {.borrow.}
proc gtk_native_get_surface(native: GtkWidget): GdkSurface {.cdecl, importc.}
proc gtk_widget_get_root(widget: GtkWidget): GtkWidget {.cdecl, importc.}

proc backdropLabel*(kind: WindowsBackdropKind): string =
  ## kind: selected DWM backdrop mode.
  case kind
  of wbkAuto:
    result = "Auto"
  of wbkNone:
    result = "None"
  of wbkMica:
    result = "Mica"
  of wbkAcrylic:
    result = "Acrylic"
  of wbkTabbed:
    result = "Tabbed"
  of wbkLegacyBlur:
    result = "Legacy Blur"

when defined(windows):
  type
    Hwnd* = pointer

    OSVersionInfoExW = object
      dwOSVersionInfoSize: uint32
      dwMajorVersion: uint32
      dwMinorVersion: uint32
      dwBuildNumber: uint32
      dwPlatformId: uint32
      szCSDVersion: array[128, uint16]
      wServicePackMajor: uint16
      wServicePackMinor: uint16
      wSuiteMask: uint16
      wProductType: uint8
      wReserved: uint8

    DwmBlurBehind = object
      dwFlags: uint32
      fEnable: int32
      hRgnBlur: pointer
      fTransitionOnMaximized: int32

    AccentState = enum
      AccentDisabled = 0,
      AccentEnableGradient = 1,
      AccentEnableTransparentGradient = 2,
      AccentEnableBlurBehind = 3,
      AccentEnableAcrylicBlurBehind = 4,
      AccentEnableHostBackdrop = 5,
      AccentInvalidState = 6

    AccentPolicy = object
      accentState: uint32
      accentFlags: uint32
      gradientColor: uint32
      animationId: uint32

    WindowCompositionAttribData = object
      attrib: uint32
      pvData: pointer
      cbData: uint

  const
    DWMWA_USE_HOSTBACKDROPBRUSH = 17'u32
    DWMWA_USE_IMMERSIVE_DARK_MODE = 20'u32
    DWMWA_SYSTEMBACKDROP_TYPE = 38'u32
    DWM_BB_ENABLE = 0x00000001'u32
    WCA_ACCENT_POLICY = 19'u32

    DWMSBT_AUTO = 0'i32
    DWMSBT_NONE = 1'i32
    DWMSBT_MAINWINDOW = 2'i32
    DWMSBT_TRANSIENTWINDOW = 3'i32
    DWMSBT_TABBEDWINDOW = 4'i32

  proc gdk_win32_surface_get_impl_hwnd(surface: GdkSurface): Hwnd {.cdecl, importc.}
  proc gdk_win32_surface_get_handle(surface: GdkSurface): Hwnd {.cdecl, importc.}
  proc DwmSetWindowAttribute(hwnd: Hwnd;
                             attr: uint32;
                             val: pointer;
                             cb: uint32): int32 {.stdcall, dynlib: "dwmapi", importc.}
  proc DwmEnableBlurBehindWindow(hwnd: Hwnd;
                                 blurBehind: ptr DwmBlurBehind): int32 {.
      stdcall, dynlib: "dwmapi", importc.}
  proc RtlGetVersion(lpVersionInformation: ptr OSVersionInfoExW): int32 {.
      stdcall, dynlib: "ntdll", importc.}
  proc SetWindowCompositionAttribute(hwnd: Hwnd;
                                     data: ptr WindowCompositionAttribData): int32 {.
      stdcall, dynlib: "user32", importc.}

  proc currentWindowsVersion*(): WindowsVersionInfo =
    ## Returns the real Windows version/build via RtlGetVersion.
    var osv: OSVersionInfoExW
    osv.dwOSVersionInfoSize = uint32(sizeof(osv))
    if RtlGetVersion(osv.addr) == 0'i32:
      result.major = int32(osv.dwMajorVersion)
      result.minor = int32(osv.dwMinorVersion)
      result.build = int32(osv.dwBuildNumber)

  proc windowsVersionLabel*(info: WindowsVersionInfo): string =
    ## info: captured Windows version/build tuple.
    result = $info.major & "." & $info.minor & " build " & $info.build

  proc supportsSystemBackdrop*(info: WindowsVersionInfo): bool =
    ## info: captured Windows version/build tuple.
    result = info.build >= 22621

  proc colorAbgr(alpha, red, green, blue: uint32): uint32 =
    ## accent policy color format.
    result = (alpha shl 24) or (blue shl 16) or (green shl 8) or red

  proc applyAccentFallback(hwnd: Hwnd; kind: WindowsBackdropKind): WindowsBackdropResult =
    ## hwnd: target native window handle.
    ## kind: requested backdrop mode.
    var
      policy: AccentPolicy
      data: WindowCompositionAttribData
      status: int32
    if hwnd == nil:
      result.detail = "missing HWND"
      return
    case kind
    of wbkNone:
      policy.accentState = uint32(AccentDisabled)
      policy.gradientColor = 0'u32
    of wbkLegacyBlur:
      policy.accentState = uint32(AccentEnableBlurBehind)
      policy.gradientColor = colorAbgr(0x99'u32, 0x18'u32, 0x24'u32, 0x30'u32)
    of wbkAcrylic:
      policy.accentState = uint32(AccentEnableAcrylicBlurBehind)
      policy.gradientColor = colorAbgr(0xCC'u32, 0x18'u32, 0x24'u32, 0x30'u32)
    of wbkMica, wbkTabbed, wbkAuto:
      policy.accentState = uint32(AccentEnableBlurBehind)
      policy.gradientColor = colorAbgr(0x99'u32, 0x14'u32, 0x1c'u32, 0x26'u32)
    data.attrib = WCA_ACCENT_POLICY
    data.pvData = policy.addr
    data.cbData = uint(sizeof(policy))
    status = SetWindowCompositionAttribute(hwnd, data.addr)
    result.ok = status != 0
    result.apiUsed = "SetWindowCompositionAttribute"
    result.detail = if result.ok:
      "applied undocumented accent-policy fallback"
    else:
      "accent-policy fallback was rejected"

  proc resolveHwnd*(widget: GtkWidget): Hwnd =
    ## widget: any GTK widget inside the target window.
    var
      root: GtkWidget
      surface: GdkSurface
    if widget.isNil:
      return nil
    root = gtk_widget_get_root(widget)
    if root.isNil:
      return nil
    surface = gtk_native_get_surface(root)
    if surface.isNil:
      return nil
    result = gdk_win32_surface_get_impl_hwnd(surface)
    if result == nil:
      result = gdk_win32_surface_get_handle(surface)

  proc disableLegacyBlur(hwnd: Hwnd) =
    ## hwnd: native window handle.
    var bb: DwmBlurBehind
    if hwnd == nil:
      return
    bb.dwFlags = DWM_BB_ENABLE
    bb.fEnable = 0
    discard DwmEnableBlurBehindWindow(hwnd, bb.addr)

  proc applyWindowsBackdrop*(hwnd: Hwnd; kind: WindowsBackdropKind;
      immersiveDark: bool = true): WindowsBackdropResult =
    ## hwnd: target native window handle.
    ## kind: requested Windows backdrop mode.
    ## immersiveDark: toggles Windows immersive dark frame metrics.
    var
      darkValue: int32
      hostBackdrop: int32
      systemBackdrop: int32
      blurCfg: DwmBlurBehind
      hr: int32
      osInfo: WindowsVersionInfo
    if hwnd == nil:
      result.detail = "missing HWND"
      return

    osInfo = currentWindowsVersion()
    disableLegacyBlur(hwnd)
    darkValue = if immersiveDark: 1 else: 0
    discard DwmSetWindowAttribute(hwnd, DWMWA_USE_IMMERSIVE_DARK_MODE,
      darkValue.addr, uint32(sizeof(darkValue)))

    if kind == wbkLegacyBlur:
      blurCfg.dwFlags = DWM_BB_ENABLE
      blurCfg.fEnable = 1
      hr = DwmEnableBlurBehindWindow(hwnd, blurCfg.addr)
      result.ok = hr >= 0
      result.apiUsed = "DwmEnableBlurBehindWindow"
      result.detail = "requested legacy blur-behind on " & windowsVersionLabel(osInfo)
      return

    if not supportsSystemBackdrop(osInfo):
      result = applyAccentFallback(hwnd, kind)
      result.detail = result.detail & " | system backdrop requires Windows 11 build 22621+, found " &
        windowsVersionLabel(osInfo)
      return

    hostBackdrop = if kind in {wbkMica, wbkAcrylic, wbkTabbed}: 1 else: 0
    discard DwmSetWindowAttribute(hwnd, DWMWA_USE_HOSTBACKDROPBRUSH,
      hostBackdrop.addr, uint32(sizeof(hostBackdrop)))

    case kind
    of wbkAuto:
      systemBackdrop = DWMSBT_AUTO
    of wbkNone:
      systemBackdrop = DWMSBT_NONE
    of wbkMica:
      systemBackdrop = DWMSBT_MAINWINDOW
    of wbkAcrylic:
      systemBackdrop = DWMSBT_TRANSIENTWINDOW
    of wbkTabbed:
      systemBackdrop = DWMSBT_TABBEDWINDOW
    of wbkLegacyBlur:
      systemBackdrop = DWMSBT_NONE
    hr = DwmSetWindowAttribute(hwnd, DWMWA_SYSTEMBACKDROP_TYPE,
      systemBackdrop.addr, uint32(sizeof(systemBackdrop)))
    result.ok = hr >= 0
    result.apiUsed = "DwmSetWindowAttribute"
    result.detail = "requested " & backdropLabel(kind) & " on " & windowsVersionLabel(osInfo)
    if not result.ok:
      let fallback = applyAccentFallback(hwnd, kind)
      if fallback.ok:
        return WindowsBackdropResult(ok: true,
          apiUsed: fallback.apiUsed,
          detail: result.detail & " | primary API rejected, fallback succeeded")

  proc applyWindowsBackdropFromWidget*(widget: GtkWidget; kind: WindowsBackdropKind;
      immersiveDark: bool = true): WindowsBackdropResult =
    ## widget: any realized GTK widget inside the target window.
    ## kind: requested Windows backdrop mode.
    ## immersiveDark: toggles Windows immersive dark frame metrics.
    result = applyWindowsBackdrop(resolveHwnd(widget), kind, immersiveDark)

else:
  proc currentWindowsVersion*(): WindowsVersionInfo =
    ## Returns an empty version outside Windows.
    discard

  proc windowsVersionLabel*(info: WindowsVersionInfo): string =
    ## info: captured platform version tuple.
    discard info
    result = "non-Windows"

  proc supportsSystemBackdrop*(info: WindowsVersionInfo): bool =
    ## info: captured platform version tuple.
    discard info
    result = false

  proc resolveHwnd*(widget: GtkWidget): pointer =
    ## widget: any GTK widget.
    discard widget
    result = nil

  proc applyWindowsBackdrop*(hwnd: pointer; kind: WindowsBackdropKind;
      immersiveDark: bool = true): WindowsBackdropResult =
    ## hwnd: ignored on non-Windows platforms.
    discard hwnd
    discard kind
    discard immersiveDark
    result.detail = "Windows-only backdrop helper"

  proc applyWindowsBackdropFromWidget*(widget: GtkWidget; kind: WindowsBackdropKind;
      immersiveDark: bool = true): WindowsBackdropResult =
    ## widget: ignored on non-Windows platforms.
    discard widget
    discard kind
    discard immersiveDark
    result.detail = "Windows-only backdrop helper"
