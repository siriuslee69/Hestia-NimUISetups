(() => {
  const modeMeta = {
    compare: 'Two center panes stay live while both side menus remain retractable.',
    compose: 'Use the left rail for snippets and the right rail for publish checks.',
    simulate: 'Map one pane to controls and the other to result traces.',
    review: 'Keep references on the left and review notes or diffs on the right.'
  };

  const label = document.getElementById('workbench-mode-label');
  const title = document.getElementById('scenario-title');
  const copy = document.getElementById('scenario-copy');

  window.HestiaWidgets.boot({
    welcomeMessage: 'Dual Workbench ready.'
  });

  document.querySelectorAll('[data-mode]').forEach(button => {
    button.addEventListener('click', () => {
      document.querySelectorAll('[data-mode]').forEach(item => item.classList.remove('is-active'));
      button.classList.add('is-active');
      label.textContent = 'Mode: ' + button.dataset.mode;
      title.textContent = button.textContent + ' state';
      copy.textContent = modeMeta[button.dataset.mode] || modeMeta.compare;
      window.HestiaWidgets.showToast('Switched to ' + button.dataset.mode + ' mode.');
    });
  });
})();
