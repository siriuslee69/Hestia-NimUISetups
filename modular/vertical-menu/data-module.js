(() => {
  const core = window.HestiaVerticalCore;
  if (!core) {
    return;
  }

  function dataList(frame) {
    return frame?.querySelector('.mod-data-list') || null;
  }

  core.modules.data = {
    init() {},
    serializeFrame(frame) {
      const list = dataList(frame);
      return {
        orientation: list?.dataset?.orientation || 'vertical',
        view: list?.dataset?.view || 'details',
        metaView: list?.dataset?.metaView || 'hybrid'
      };
    },
    restoreFrame(frame, state, options = {}) {
      if (options.phase === 'after-init') {
        return;
      }

      const list = dataList(frame);
      if (!list) {
        return;
      }

      list.dataset.orientation = `${state?.orientation || list.dataset.orientation || 'vertical'}`;
      list.dataset.view = `${state?.view || list.dataset.view || 'details'}`;
      list.dataset.metaView = `${state?.metaView || list.dataset.metaView || 'hybrid'}`;
    }
  };
})();
