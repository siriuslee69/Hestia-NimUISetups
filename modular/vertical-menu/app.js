(() => {
  const core = window.HestiaVerticalCore;
  if (!core?.workspace) {
    return;
  }

  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    core.workspace.bootstrap();
    return;
  }

  document.addEventListener('DOMContentLoaded', () => {
    core.workspace.bootstrap();
  }, { once: true });
})();
