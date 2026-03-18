(() => {
  const core = window.HestiaVerticalCore;
  if (!core) {
    return;
  }

  function textEditor(frame) {
    return frame?.querySelector('.mod-text-editor') || null;
  }

  core.modules.text = {
    init() {},
    serializeFrame(frame) {
      return {
        text: textEditor(frame)?.value || ''
      };
    },
    restoreFrame(frame, state, options = {}) {
      if (options.phase === 'after-init') {
        return;
      }
      const editor = textEditor(frame);
      if (editor) {
        editor.value = `${state?.text || ''}`;
      }
    }
  };
})();
