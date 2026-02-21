# =======================================================================
# | owlkettle default titlebar app                                       |
# |----------------------------------------------------------------------|
# | GTK4 desktop UI with login gate, left menu navigation, and controls  |
# =======================================================================

import owlkettle
import ../../lib/level0/auth
import ../shared/ui_helpers

const
  AppName = "ViableNimUIs - Owlkettle (Default Titlebar)"

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

proc renderLogin(s: OwlDefaultAppState): Widget =
  ## s: app state to update while user logs in.
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

proc renderOverviewPage(s: OwlDefaultAppState): Widget =
  ## s: app state used for rendering labels.
  result = gui:
    Box:
      orient = OrientY
      spacing = 8
      margin = 16

      Label:
        text = "Overview"
        xAlign = 0

      Label:
        text = "Signed in as: " & s.loginName
        xAlign = 0

      Label:
        text = "Layout: left menu + content panel."
        xAlign = 0

proc renderControlsPage(s: OwlDefaultAppState): Widget =
  ## s: app state used by slider and dropdown controls.
  result = gui:
    Box:
      orient = OrientY
      spacing = 10
      margin = 16

      Label:
        text = "Controls"
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
  ## returns static docs/info page widget.
  result = gui:
    Box:
      orient = OrientY
      spacing = 8
      margin = 16

      Label:
        text = "Docs"
        xAlign = 0

      Label:
        text = "This UI is written in owlkettle widgets with explicit state fields."
        xAlign = 0
        wrap = true

      Label:
        text = "Page switching is a simple int index controlled by sidebar buttons."
        xAlign = 0
        wrap = true

proc renderContent(s: OwlDefaultAppState): Widget =
  ## s: app state used to route active page rendering.
  case s.pageIndex
  of 0:
    result = renderOverviewPage(s)
  of 1:
    result = renderControlsPage(s)
  else:
    result = renderDocsPage()

proc renderMain(s: OwlDefaultAppState): Widget =
  ## s: app state used for menu routing and logout.
  var
    i: int
  result = gui:
    Box:
      spacing = 0
      orient = OrientX

      Box:
        orient = OrientY
        spacing = 8
        margin = 10
        sizeRequest = (220, -1)

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

      Separator:
        orient = OrientY

      Box:
        orient = OrientY
        insert(renderContent(s))

method view(s: OwlDefaultAppState): Widget =
  ## s: app state to render.
  result = gui:
    Window:
      title = AppName
      defaultSize = (1200, 820)
      if s.loggedIn:
        insert(renderMain(s))
      else:
        insert(renderLogin(s))

when isMainModule:
  let p = resolveStylesheetPath()
  let ss = if p.len > 0: @[loadStylesheet(p)] else: @[]
  brew(gui(OwlDefaultApp()), stylesheets = ss)
