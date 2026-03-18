(() => {
  const core = window.HestiaVerticalCore;
  if (!core) {
    return;
  }

  function navigationMenu(frame) {
    return frame?.querySelector('[data-modular-menu]') || null;
  }

  function navigationButtons(frame) {
    return [...frame.querySelectorAll('.mod-button')];
  }

  function buildButton(snapshot) {
    const button = document.createElement('button');
    const symbol = document.createElement('span');
    const label = document.createElement('span');

    button.type = 'button';
    button.className = 'mod-button';
    button.dataset.buttonMode = `${snapshot?.mode || 'auto'}`;
    if (snapshot?.menuButtonId) {
      button.dataset.menuButtonId = `${snapshot.menuButtonId}`;
    }

    symbol.className = 'mod-symbol';
    symbol.textContent = `${snapshot?.symbol || '?'}`;

    label.className = 'mod-label';
    label.textContent = `${snapshot?.label || 'Item'}`;

    button.appendChild(symbol);
    button.appendChild(label);
    return button;
  }

  core.modules.navigation = {
    init() {},
    serializeFrame(frame) {
      const menu = navigationMenu(frame);
      return {
        orientation: menu?.dataset?.orientation || 'vertical',
        collapseWidth: menu?.dataset?.collapseWidth || '',
        buttons: navigationButtons(frame).map(button => ({
          symbol: button.querySelector('.mod-symbol')?.textContent?.trim() || '',
          label: button.querySelector('.mod-label')?.textContent?.trim() || '',
          mode: button.dataset.buttonMode || 'auto',
          menuButtonId: button.dataset.menuButtonId || ''
        }))
      };
    },
    restoreFrame(frame, state, options = {}) {
      if (options.phase === 'after-init') {
        return;
      }

      const menu = navigationMenu(frame);
      if (!menu) {
        return;
      }

      menu.dataset.orientation = `${state?.orientation || menu.dataset.orientation || 'vertical'}`;
      if (state?.collapseWidth) {
        menu.dataset.collapseWidth = `${state.collapseWidth}`;
      }

      if (Array.isArray(state?.buttons) && state.buttons.length > 0) {
        menu.innerHTML = '';
        state.buttons.forEach(buttonSnapshot => {
          menu.appendChild(buildButton(buttonSnapshot));
        });
      }
    }
  };
})();
