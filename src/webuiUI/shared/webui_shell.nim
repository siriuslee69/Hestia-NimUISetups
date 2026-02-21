# ========================================================================
# | webui desktop shell                                                   |
# |-----------------------------------------------------------------------|
# | Runs nim-webui with embedded HTML/CSS/JS login and left-side page UI |
# ========================================================================

import std/[strformat]
import webui

const
  MayaGtkWhiteCss = staticRead("../../../assets/themes/theme_white.css")
  WebUiWhiteCss = staticRead("../../../assets/web/webui_white_theme.css")

type
  WebUiConfig* = object
    appName*: string
    useCustomTitlebar*: bool

proc buildHtml(c: WebUiConfig): string =
  ## c: webui app configuration.
  var
    t0: string
    t1: string
  if c.useCustomTitlebar:
    t0 = "topbar custom"
    t1 = "Custom titlebar variant (HTML-level titlebar)"
  else:
    t0 = "topbar"
    t1 = "Default titlebar variant"
  result = fmt"""
<!doctype html>
<html lang=\"en\">
<head>
  <meta charset=\"utf-8\" />
  <meta name=\"viewport\" content=\"width=device-width, initial-scale=1\" />
  <title>{c.appName}</title>
  <style>
{MayaGtkWhiteCss}

{WebUiWhiteCss}

.login-wrap, .app-grid {{
  max-width: 1200px;
  margin-left: auto;
  margin-right: auto;
}}
  </style>
</head>
<body>
  <div class=\"shell\">
    <header class=\"{t0}\">
      <strong>{c.appName}</strong>
      <small>{t1}</small>
    </header>

    <main class=\"login-wrap\" id=\"login-wrap\">
      <h1>Login</h1>
      <p>Use <code>test</code> / <code>test</code>.</p>
      <label for=\"name\">Name</label>
      <input id=\"name\" autocomplete=\"username\" />
      <label for=\"password\">Password</label>
      <input id=\"password\" type=\"password\" autocomplete=\"current-password\" />
      <button id=\"login-btn\" type=\"button\">Sign in</button>
      <div id=\"login-error\" class=\"error\"></div>
    </main>

    <div class=\"app-grid\" id=\"app-grid\" style=\"display:none;\">
      <aside class=\"sidebar\">
        <button data-page=\"overview\">Overview</button>
        <button data-page=\"controls\">Controls (Slider)</button>
        <button data-page=\"docs\">Docs / Notes</button>
        <button id=\"logout-btn\">Logout</button>
      </aside>

      <section class=\"content\">
        <div class=\"page active\" id=\"page-overview\">
          <div class=\"card\">
            <h2>Welcome</h2>
            <p>Active user: <strong id=\"active-user\">test</strong></p>
          </div>
          <div class=\"card\">
            <p>This window uses <code>nim-webui</code> (no self-hosted server in app code).</p>
          </div>
        </div>

        <div class=\"page\" id=\"page-controls\">
          <div class=\"card\">
            <h2>Slider Controls</h2>
            <div class=\"slider-line\">
              <input id=\"app-slider\" type=\"range\" min=\"0\" max=\"100\" value=\"42\" />
              <output id=\"app-slider-out\">42</output>
            </div>
          </div>
        </div>

        <div class=\"page\" id=\"page-docs\">
          <div class=\"card\">
            <h2>How This Was Written</h2>
            <pre>
- Nim module: src/webuiUI/shared/webui_shell.nim
- HTML/CSS/JS is embedded via static strings
- login check: name == \"test\" and password == \"test\"
- left menu switches page containers with tiny JS
            </pre>
          </div>
        </div>
      </section>
    </div>
  </div>

  <script>
  (() => {{
    const loginWrap = document.getElementById('login-wrap');
    const appGrid = document.getElementById('app-grid');
    const loginBtn = document.getElementById('login-btn');
    const logoutBtn = document.getElementById('logout-btn');
    const nameInput = document.getElementById('name');
    const passInput = document.getElementById('password');
    const loginError = document.getElementById('login-error');
    const userLabel = document.getElementById('active-user');
    const navBtns = document.querySelectorAll('[data-page]');
    const pages = document.querySelectorAll('.page');
    const slider = document.getElementById('app-slider');
    const sliderOut = document.getElementById('app-slider-out');

    function showPage(id) {{
      pages.forEach(p => p.classList.remove('active'));
      const p = document.getElementById('page-' + id);
      if (p) p.classList.add('active');
    }}

    function login() {{
      const n = (nameInput.value || '').trim();
      const p = passInput.value || '';
      if (n !== 'test' || p !== 'test') {{
        loginError.textContent = 'invalid credentials';
        return;
      }}
      loginError.textContent = '';
      userLabel.textContent = n;
      loginWrap.style.display = 'none';
      appGrid.style.display = 'flex';
      showPage('overview');
    }}

    function logout() {{
      passInput.value = '';
      loginWrap.style.display = 'block';
      appGrid.style.display = 'none';
    }}

    navBtns.forEach(btn => btn.addEventListener('click', () => showPage(btn.dataset.page)));
    loginBtn.addEventListener('click', login);
    logoutBtn.addEventListener('click', logout);
    passInput.addEventListener('keydown', e => {{
      if (e.key === 'Enter') login();
    }});
    slider.addEventListener('input', () => sliderOut.textContent = slider.value);
  }})();
  </script>
</body>
</html>
"""

proc runWebUi*(c: WebUiConfig) =
  ## c: webui app configuration.
  var
    w: Window
    ok: bool
  w = newWindow()
  w.size = (1200, 820)
  ok = w.show(buildHtml(c))
  if not ok:
    raise newException(IOError, "webui failed to open the window")
  wait()
  clean()
