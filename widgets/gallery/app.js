(() => {
  function updateSelectedStone(buttons, activeButton, detail) {
    buttons.forEach(button => {
      const isActive = button === activeButton;
      button.classList.toggle('is-selected', isActive);
      button.setAttribute('aria-pressed', isActive ? 'true' : 'false');
      resetStonePose(button);
    });

    if (!detail) {
      return;
    }

    const title = activeButton.dataset.stoneTitle || activeButton.textContent || '';
    const meta = activeButton.dataset.stoneMeta || '';
    const note = activeButton.dataset.stoneNote || '';

    const titleNode = detail.querySelector('[data-stone-detail-title]');
    const metaNode = detail.querySelector('[data-stone-detail-meta]');
    const noteNode = detail.querySelector('[data-stone-detail-note]');

    if (titleNode) {
      titleNode.textContent = title;
    }
    if (metaNode) {
      metaNode.textContent = meta;
    }
    if (noteNode) {
      noteNode.textContent = note;
    }
  }

  function resetStonePose(button) {
    const baseTiltX = button.dataset.baseTiltX || '9';
    const baseTiltY = button.dataset.baseTiltY || '-8';
    button.style.setProperty('--selected-tilt-x', `${baseTiltX}deg`);
    button.style.setProperty('--selected-tilt-y', `${baseTiltY}deg`);
  }

  function bindFloatingStoneMenu(menu) {
    const buttons = [...menu.querySelectorAll('.stone-button')];
    if (buttons.length === 0) {
      return;
    }

    const detail = document.querySelector('[data-stone-detail]');
    const poses = [
      { x: 10, y: -9 },
      { x: 8, y: 7 },
      { x: 11, y: -5 },
      { x: 9, y: 10 },
      { x: 8, y: -11 },
      { x: 10, y: 6 }
    ];

    buttons.forEach((button, index) => {
      const pose = poses[index % poses.length];
      button.dataset.baseTiltX = String(pose.x);
      button.dataset.baseTiltY = String(pose.y);
      button.style.setProperty('--stone-tilt-x', `${(pose.x * 0.18).toFixed(2)}deg`);
      button.style.setProperty('--stone-tilt-y', `${(pose.y * 0.24).toFixed(2)}deg`);
      resetStonePose(button);

      button.addEventListener('click', () => {
        updateSelectedStone(buttons, button, detail);
      });

      button.addEventListener('pointermove', event => {
        if (!button.classList.contains('is-selected')) {
          return;
        }

        const rect = button.getBoundingClientRect();
        const x = (event.clientX - rect.left) / rect.width - 0.5;
        const y = (event.clientY - rect.top) / rect.height - 0.5;
        const tiltX = Number(button.dataset.baseTiltX || '9') + (-y * 8);
        const tiltY = Number(button.dataset.baseTiltY || '0') + (x * 14);
        button.style.setProperty('--selected-tilt-x', `${tiltX.toFixed(2)}deg`);
        button.style.setProperty('--selected-tilt-y', `${tiltY.toFixed(2)}deg`);
      });

      button.addEventListener('pointerleave', () => {
        resetStonePose(button);
      });
    });

    const initial = buttons.find(button => button.classList.contains('is-selected')) || buttons[0];
    updateSelectedStone(buttons, initial, detail);
  }

  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('[data-floating-stone-menu]').forEach(bindFloatingStoneMenu);
  });
})();
