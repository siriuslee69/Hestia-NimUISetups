(() => {
  if (window.HestiaWidgets) {
    return;
  }

  const state = {
    tooltip: null,
    toastHost: null
  };

  function ensureTooltip() {
    if (state.tooltip) {
      return state.tooltip;
    }
    const tooltip = document.createElement('div');
    tooltip.className = 'widget-tooltip';
    document.body.appendChild(tooltip);
    state.tooltip = tooltip;
    return tooltip;
  }

  function ensureToastHost() {
    if (state.toastHost) {
      return state.toastHost;
    }
    const host = document.createElement('div');
    host.className = 'widget-toast-host';
    document.body.appendChild(host);
    state.toastHost = host;
    return host;
  }

  function placeTooltip(x, y) {
    const tooltip = ensureTooltip();
    const clampedX = Math.min(x + 16, window.innerWidth - tooltip.offsetWidth - 14);
    const clampedY = Math.min(y + 16, window.innerHeight - tooltip.offsetHeight - 14);
    tooltip.style.left = Math.max(14, clampedX) + 'px';
    tooltip.style.top = Math.max(14, clampedY) + 'px';
  }

  function showTooltip(event) {
    const text = event.currentTarget.getAttribute('data-tooltip');
    if (!text) {
      return;
    }
    const tooltip = ensureTooltip();
    tooltip.textContent = text;
    tooltip.classList.add('is-visible');
    placeTooltip(event.clientX, event.clientY);
  }

  function moveTooltip(event) {
    if (!state.tooltip || !state.tooltip.classList.contains('is-visible')) {
      return;
    }
    placeTooltip(event.clientX, event.clientY);
  }

  function hideTooltip() {
    if (state.tooltip) {
      state.tooltip.classList.remove('is-visible');
    }
  }

  function bindTooltips(scope) {
    scope.querySelectorAll('[data-tooltip]').forEach(element => {
      if (element.dataset.widgetsTooltipBound === 'true') {
        return;
      }
      element.dataset.widgetsTooltipBound = 'true';
      element.addEventListener('pointerenter', showTooltip);
      element.addEventListener('pointermove', moveTooltip);
      element.addEventListener('pointerleave', hideTooltip);
      element.addEventListener('blur', hideTooltip);
    });
  }

  function showToast(message) {
    const host = ensureToastHost();
    const toast = document.createElement('div');
    toast.className = 'widget-toast';
    toast.textContent = message;
    host.appendChild(toast);
    window.setTimeout(() => toast.remove(), 2800);
  }

  function bindPanelToggles(scope) {
    scope.querySelectorAll('[data-toggle-panel]').forEach(button => {
      if (button.dataset.widgetsToggleBound === 'true') {
        return;
      }
      button.dataset.widgetsToggleBound = 'true';
      button.addEventListener('click', () => {
        const selector = button.getAttribute('data-toggle-panel');
        const panel = selector ? document.querySelector(selector) : null;
        if (!panel) {
          return;
        }
        panel.classList.toggle('is-collapsed');
        const collapsed = panel.classList.contains('is-collapsed');
        const label = panel.getAttribute('data-panel-name') || selector;
        button.setAttribute('aria-pressed', String(collapsed));
        showToast((collapsed ? 'Collapsed ' : 'Expanded ') + label);
      });
    });
  }

  function bindToastButtons(scope) {
    scope.querySelectorAll('[data-demo-toast]').forEach(button => {
      if (button.dataset.widgetsToastBound === 'true') {
        return;
      }
      button.dataset.widgetsToastBound = 'true';
      button.addEventListener('click', () => {
        showToast(button.getAttribute('data-demo-toast'));
      });
    });
  }

  function boot(options = {}) {
    const scope = options.scope || document;
    bindTooltips(scope);
    bindPanelToggles(scope);
    bindToastButtons(scope);
    if (options.welcomeMessage) {
      showToast(options.welcomeMessage);
    }
  }

  window.HestiaWidgets = {
    boot,
    showToast
  };
})();
