(() => {
  const title = document.getElementById('cockpit-title');
  const focus = document.getElementById('cockpit-focus');

  window.HestiaWidgets.boot({
    welcomeMessage: 'Analyst Cockpit ready.'
  });

  document.querySelectorAll('.scenario-button').forEach(button => {
    button.addEventListener('click', () => {
      document.querySelectorAll('.scenario-button').forEach(item => item.classList.remove('is-active'));
      button.classList.add('is-active');
      title.textContent = button.dataset.scenario + ' dashboard';
    });
  });

  document.querySelectorAll('.focus-card').forEach(button => {
    button.addEventListener('click', () => {
      document.querySelectorAll('.focus-card').forEach(item => item.classList.remove('is-active'));
      button.classList.add('is-active');
      focus.textContent = button.dataset.focus;
      window.HestiaWidgets.showToast('Focus updated: ' + button.dataset.focus);
    });
  });
})();
