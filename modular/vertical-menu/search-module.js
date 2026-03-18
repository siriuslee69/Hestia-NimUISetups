(() => {
  const core = window.HestiaVerticalCore;
  if (!core) {
    return;
  }

  function searchInput(frame) {
    return frame?.querySelector('.mod-search-input') || null;
  }

  core.modules.search = {
    init() {},
    serializeFrame(frame) {
      return {
        query: searchInput(frame)?.value || ''
      };
    },
    restoreFrame(frame, state, options = {}) {
      if (options.phase === 'after-init') {
        return;
      }
      const input = searchInput(frame);
      if (input) {
        input.value = `${state?.query || ''}`;
      }
    }
  };
})();
