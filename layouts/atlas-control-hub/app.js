(() => {
  const viewMeta = {
    overview: 'Classic left nav plus top command bar with a wide center dashboard.',
    fleet: 'Fleet health favors quick metrics, alert scanning, and one-click export actions.',
    policies: 'Policy mode can swap the center grid for rule compare tables and approval flow.',
    notes: 'Notes mode keeps the same shell but uses the center grid for docs and runbooks.'
  };

  const title = document.getElementById('atlas-title');
  const copy = document.getElementById('atlas-copy');
  const alertPanel = document.getElementById('atlas-alert-panel');

  window.HestiaWidgets.boot({
    welcomeMessage: 'Atlas Control Hub ready.'
  });

  document.querySelectorAll('[data-view]').forEach(button => {
    button.addEventListener('click', () => {
      document.querySelectorAll('[data-view]').forEach(item => item.classList.remove('is-active'));
      button.classList.add('is-active');
      title.textContent = button.textContent;
      copy.textContent = viewMeta[button.dataset.view] || viewMeta.overview;
    });
  });

  document.querySelectorAll('[data-alert]').forEach(button => {
    button.addEventListener('click', () => {
      const text = button.dataset.alert;
      alertPanel.textContent = text;
      window.HestiaWidgets.showToast('Pinned alert: ' + text);
    });
  });
})();
