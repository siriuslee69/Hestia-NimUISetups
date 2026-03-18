(() => {
  const core = window.HestiaVerticalCore;
  if (!core) {
    return;
  }

  function settingsGrid(frame) {
    return frame?.querySelector('.mod-settings-grid') || null;
  }

  function settingsControls(frame) {
    return [...frame.querySelectorAll('input, select, textarea')];
  }

  core.modules.settings = {
    init() {},
    serializeFrame(frame) {
      const grid = settingsGrid(frame);
      return {
        orientation: grid?.dataset?.orientation || 'vertical',
        view: grid?.dataset?.view || 'details',
        controls: settingsControls(frame).map(control => ({
          id: control.id || '',
          type: control.type || control.tagName.toLowerCase(),
          value: control.type === 'checkbox' ? control.checked : control.value
        }))
      };
    },
    restoreFrame(frame, state, options = {}) {
      if (options.phase === 'after-init') {
        return;
      }

      const grid = settingsGrid(frame);
      if (grid) {
        grid.dataset.orientation = `${state?.orientation || grid.dataset.orientation || 'vertical'}`;
        grid.dataset.view = `${state?.view || grid.dataset.view || 'details'}`;
      }

      if (!Array.isArray(state?.controls)) {
        return;
      }

      state.controls.forEach(controlState => {
        const id = `${controlState?.id || ''}`;
        if (!id) {
          return;
        }
        const control = document.getElementById(id);
        if (!control) {
          return;
        }
        if (control.type === 'checkbox') {
          control.checked = controlState.value === true;
          return;
        }
        control.value = `${controlState?.value ?? ''}`;
      });
    }
  };
})();
