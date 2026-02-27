(() => {
  const title = document.getElementById('android-title');
  const copy = document.getElementById('android-copy');
  const screenMeta = {
    home: 'A tablet-first shell with side drawer, content cards, and bottom nav.',
    tasks: 'Tasks mode can prioritize larger cards and quick completion actions.',
    sync: 'Sync mode can highlight background jobs, retries, and device handoffs.',
    settings: 'Settings mode can swap the card grid for grouped preference panels.'
  };

  window.HestiaWidgets.boot({
    welcomeMessage: 'Android Ops Tablet ready.'
  });

  function setScreen(screen) {
    title.textContent = screen.charAt(0).toUpperCase() + screen.slice(1) + ' overview';
    copy.textContent = screenMeta[screen] || screenMeta.home;
    document.querySelectorAll('[data-screen]').forEach(item => {
      item.classList.toggle('is-active', item.dataset.screen === screen);
    });
  }

  document.querySelectorAll('[data-screen]').forEach(button => {
    button.addEventListener('click', () => {
      setScreen(button.dataset.screen);
      window.HestiaWidgets.showToast('Opened ' + button.dataset.screen + '.');
    });
  });
})();
