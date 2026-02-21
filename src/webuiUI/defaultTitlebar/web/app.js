(() => {
  const pageMeta = {
    overview: {
      title: 'Overview',
      tagline: 'Atlas-style multi-column workspace layout.'
    },
    workspace: {
      title: 'Workspace',
      tagline: 'Wide canvas + side inspector and queues.'
    },
    metrics: {
      title: 'Metrics',
      tagline: 'Operational metrics and slider controls.'
    },
    docs: {
      title: 'Docs / Notes',
      tagline: 'Implementation notes and page wiring.'
    }
  };

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
  const pageTitle = document.getElementById('page-title');
  const pageTagline = document.getElementById('page-tagline');
  const slider = document.getElementById('app-slider');
  const sliderOut = document.getElementById('app-slider-out');

  let isLoggedIn = false;

  function getRoutePage() {
    const hash = (window.location.hash || '').replace('#', '').trim();
    if (pageMeta[hash]) {
      return hash;
    }
    return 'overview';
  }

  function showPage(id) {
    pages.forEach(p => p.classList.remove('active'));
    navBtns.forEach(b => b.classList.remove('active'));

    const page = document.getElementById('page-' + id);
    const nav = document.querySelector('[data-page="' + id + '"]');

    if (page) page.classList.add('active');
    if (nav) nav.classList.add('active');

    if (pageMeta[id]) {
      pageTitle.textContent = pageMeta[id].title;
      pageTagline.textContent = pageMeta[id].tagline;
    }
  }

  function routeToCurrentHash() {
    if (!isLoggedIn) return;
    const page = getRoutePage();
    showPage(page);
    if (window.location.hash.replace('#', '') !== page) {
      window.location.hash = page;
    }
  }

  function login() {
    const n = (nameInput.value || '').trim();
    const p = passInput.value || '';

    if (n !== 'test' || p !== 'test') {
      loginError.textContent = 'invalid credentials';
      return;
    }

    loginError.textContent = '';
    userLabel.textContent = n;
    isLoggedIn = true;
    loginWrap.style.display = 'none';
    appGrid.style.display = 'grid';
    routeToCurrentHash();
  }

  function logout() {
    isLoggedIn = false;
    passInput.value = '';
    loginWrap.style.display = 'block';
    appGrid.style.display = 'none';
  }

  navBtns.forEach(btn => {
    btn.addEventListener('click', e => {
      e.preventDefault();
      if (!isLoggedIn) return;
      window.location.hash = btn.dataset.page;
    });
  });

  loginBtn.addEventListener('click', login);
  logoutBtn.addEventListener('click', logout);
  passInput.addEventListener('keydown', e => {
    if (e.key === 'Enter') login();
  });

  window.addEventListener('hashchange', routeToCurrentHash);

  if (slider && sliderOut) {
    slider.addEventListener('input', () => {
      sliderOut.textContent = slider.value;
    });
  }
})();
