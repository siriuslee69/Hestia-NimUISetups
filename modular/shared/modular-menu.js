(() => {
  if (window.HestiaModularMenus) {
    return;
  }

  const menus = new WeakMap();
  const dragHandles = new WeakMap();
  const resizeHandles = new WeakMap();
  const orientationHandles = new WeakMap();
  const overflowToggles = new WeakMap();
  let modeTooltip = null;
  let tagTooltip = null;
  let pinnedCarousel = null;

  function getButtons(menu) {
    return [...menu.querySelectorAll('.mod-button')];
  }

  function getClip(menu) {
    return menu.closest('.mod-menu-clip');
  }

  function setGridBoxDefaults(target) {
    const grid = getGridMetrics();
    const col = parseFloat(target.dataset.gridCol || '0') || 0;
    const row = parseFloat(target.dataset.gridRow || '0') || 0;
    const widthUnits = parseFloat(target.dataset.gridWidth || '6') || 6;
    const heightUnits = parseFloat(target.dataset.gridHeight || '1') || 1;

    target.style.position = 'fixed';
    target.style.left = `${Math.round(col * grid.cellWidth)}px`;
    target.style.top = `${Math.round(row * grid.cellHeight)}px`;
    target.style.width = `${Math.round(widthUnits * grid.cellWidth)}px`;
    target.style.height = `${Math.round(heightUnits * grid.cellHeight)}px`;
    target.style.margin = '0';
  }

  function getDesktopMetrics() {
    const sw = window.screen?.availWidth || window.screen?.width || window.innerWidth;
    const sh = window.screen?.availHeight || window.screen?.height || window.innerHeight;
    return {
      width: sw,
      height: sh
    };
  }

  function syncGridCssVars() {
    const root = document.documentElement;
    const desktop = getDesktopMetrics();
    const cols = parseFloat(getComputedStyle(root).getPropertyValue('--mod-grid-cols')) || 40;
    const rows = parseFloat(getComputedStyle(root).getPropertyValue('--mod-grid-rows')) || 20;
    root.style.setProperty('--mod-grid-cell-w', `${desktop.width / cols}px`);
    root.style.setProperty('--mod-grid-cell-h', `${desktop.height / rows}px`);
  }

  function getGridMetrics() {
    const styles = window.getComputedStyle(document.documentElement);
    return {
      cols: parseFloat(styles.getPropertyValue('--mod-grid-cols')) || 40,
      rows: parseFloat(styles.getPropertyValue('--mod-grid-rows')) || 20,
      cellWidth: parseFloat(styles.getPropertyValue('--mod-grid-cell-w')) || 32,
      cellHeight: parseFloat(styles.getPropertyValue('--mod-grid-cell-h')) || 40
    };
  }

  function ensureModeTooltip() {
    if (modeTooltip) {
      return modeTooltip;
    }
    modeTooltip = document.createElement('div');
    modeTooltip.className = 'mod-mini-tooltip';
    modeTooltip.hidden = true;
    document.body.appendChild(modeTooltip);
    return modeTooltip;
  }

  function ensureTagTooltip() {
    if (tagTooltip) {
      return tagTooltip;
    }
    tagTooltip = document.createElement('div');
    tagTooltip.className = 'mod-tag-tooltip';
    tagTooltip.hidden = true;
    document.body.appendChild(tagTooltip);

    if (ensureTagTooltip.bound !== true) {
      document.addEventListener('click', event => {
        if (!pinnedCarousel) {
          return;
        }
        const tooltip = ensureTagTooltip();
        if (tooltip.contains(event.target) || pinnedCarousel.contains(event.target)) {
          return;
        }
        hideTagTooltip(true);
      });

      window.addEventListener('keydown', event => {
        if (event.key === 'Escape' && pinnedCarousel) {
          hideTagTooltip(true);
        }
      });

      ensureTagTooltip.bound = true;
    }

    return tagTooltip;
  }

  function positionTagTooltip(clientX, clientY) {
    const tooltip = ensureTagTooltip();
    const margin = 8;
    const gap = 14;
    tooltip.style.left = `${Math.round(clientX + gap)}px`;
    tooltip.style.top = `${Math.round(clientY)}px`;

    const rect = tooltip.getBoundingClientRect();
    let left = clientX + gap;
    if (left + rect.width > window.innerWidth - margin) {
      left = clientX - rect.width - gap;
    }
    left = clamp(left, margin, Math.max(margin, window.innerWidth - rect.width - margin));

    let top = clientY - rect.height / 2;
    top = clamp(top, margin, Math.max(margin, window.innerHeight - rect.height - margin));

    tooltip.style.left = `${Math.round(left)}px`;
    tooltip.style.top = `${Math.round(top)}px`;
  }

  function fillTagTooltip(carousel, scrollable) {
    const tooltip = ensureTagTooltip();
    const pills = carouselPillsOf(carousel);
    tooltip.innerHTML = '';
    tooltip.classList.toggle('is-pinned', scrollable);
    const list = document.createElement('div');
    list.className = 'mod-tag-tooltip-list';

    pills.forEach(pill => {
      const row = document.createElement('span');
      row.className = 'mod-meta-pill mod-tag-tooltip-pill';
      row.textContent = pill.textContent || '';
      list.appendChild(row);
    });

    tooltip.appendChild(list);
  }

  function showTagTooltip(carousel, event, scrollable) {
    fillTagTooltip(carousel, scrollable);
    const tooltip = ensureTagTooltip();
    tooltip.hidden = false;
    positionTagTooltip(event.clientX, event.clientY);
  }

  function hideTagTooltip(force) {
    if (!force && pinnedCarousel) {
      return;
    }
    const tooltip = ensureTagTooltip();
    tooltip.hidden = true;
    tooltip.classList.remove('is-pinned');
    tooltip.innerHTML = '';
    if (force) {
      pinnedCarousel = null;
    }
  }

  function modeText(mode) {
    switch (mode) {
    case 'collapsed':
      return 'Collapsed always';
    case 'extended':
      return 'Extended always';
    case 'hover':
      return 'Extended on hover';
    default:
      return 'Collapsed auto';
    }
  }

  function setModeVisual(button, mode) {
    const toggle = button.querySelector('.mod-mode-toggle');
    if (!toggle) {
      return;
    }
    toggle.dataset.mode = mode;
    toggle.title = modeText(mode);
    toggle.setAttribute('aria-label', modeText(mode));
  }

  function showModeTooltip(toggle, text) {
    const tooltip = ensureModeTooltip();
    const rect = toggle.getBoundingClientRect();
    tooltip.textContent = text;
    tooltip.hidden = false;
    tooltip.style.left = `${Math.round(rect.left)}px`;
    tooltip.style.top = `${Math.round(rect.bottom + 8)}px`;
    window.clearTimeout(showModeTooltip.timer);
    showModeTooltip.timer = window.setTimeout(() => {
      tooltip.hidden = true;
    }, 1000);
  }

  function attachHoverTooltip(element, text) {
    element.addEventListener('mouseenter', () => {
      showModeTooltip(element, text);
    });
  }

  function bindEditToggle(button) {
    if (button.dataset.bound === 'true') {
      return;
    }

    button.dataset.bound = 'true';
    function refreshLabel() {
      const isOff = document.body.classList.contains('mod-edit-ui-off');
      button.textContent = isOff ? 'Enable edit dots' : 'Disable edit dots';
    }

    button.addEventListener('click', () => {
      document.body.classList.toggle('mod-edit-ui-off');
      refreshLabel();
    });

    refreshLabel();
  }

  function nextMode(mode) {
    switch (mode) {
    case 'collapsed':
      return 'extended';
    case 'extended':
      return 'auto';
    case 'auto':
      return 'hover';
    case 'hover':
      return 'collapsed';
    default:
      return 'collapsed';
    }
  }

  function setState(button, state) {
    button.dataset.renderState = state;
    button.classList.toggle('is-collapsed', state === 'collapsed');
    button.classList.toggle('is-extended', state === 'extended');
  }

  function ensureLabelTrack(button) {
    const label = button.querySelector('.mod-label');
    if (!label) {
      return null;
    }

    let track = label.querySelector('.mod-label-track');
    if (track) {
      return track;
    }

    track = document.createElement('span');
    track.className = 'mod-label-track';
    track.textContent = label.textContent || '';
    label.textContent = '';
    label.appendChild(track);
    return track;
  }

  function ensureModeToggle(button, menu) {
    let toggle = button.querySelector('.mod-mode-toggle');
    if (toggle) {
      return toggle;
    }

    toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'mod-mode-toggle';
    toggle.draggable = false;
    button.appendChild(toggle);
    setModeVisual(button, button.dataset.buttonMode || 'auto');

    toggle.addEventListener('pointerdown', event => {
      event.stopPropagation();
    });

    toggle.addEventListener('click', event => {
      event.preventDefault();
      event.stopPropagation();
      const mode = nextMode(button.dataset.buttonMode || 'auto');
      button.dataset.buttonMode = mode;
      setModeVisual(button, mode);
      applyAutoStates(menu);
      showModeTooltip(toggle, modeText(mode));
    });

    return toggle;
  }

  function clearOverflowScroll(button) {
    button.classList.remove('has-overflow-scroll');
    button.style.removeProperty('--mod-scroll-distance');
    button.style.removeProperty('--mod-scroll-duration');
  }

  function clearButtonSizing(button) {
    button.style.removeProperty('width');
    button.style.removeProperty('flex');
  }

  function clearOverflowHidden(menu) {
    getButtons(menu).forEach(button => {
      button.classList.remove('is-overflow-hidden');
    });
  }

  function updateExtendedLabelMotion(menu) {
    getButtons(menu).forEach(button => {
      clearOverflowScroll(button);

      if (button.dataset.renderState !== 'extended') {
        return;
      }

      const label = button.querySelector('.mod-label');
      const track = ensureLabelTrack(button);
      if (!label || !track) {
        return;
      }

      const availableWidth = label.clientWidth;
      const contentWidth = track.scrollWidth;
      const overflow = contentWidth - availableWidth;

      if (overflow <= 2) {
        return;
      }

      button.classList.add('has-overflow-scroll');
      button.style.setProperty('--mod-scroll-distance', `${Math.ceil(overflow)}px`);
      button.style.setProperty('--mod-scroll-duration', `${Math.max(3.5, overflow / 28)}s`);
    });
  }

  function resetStates(menu) {
    getButtons(menu).forEach(button => {
      const mode = button.dataset.buttonMode || 'auto';
      clearButtonSizing(button);
      setModeVisual(button, mode);
      if (mode === 'collapsed' || mode === 'hover') {
        setState(button, 'collapsed');
        return;
      }
      setState(button, 'extended');
    });
  }

  function measureNaturalExtendedWidth(button) {
    const symbol = button.querySelector('.mod-symbol');
    const label = button.querySelector('.mod-label');
    const track = button.querySelector('.mod-label-track');
    const styles = window.getComputedStyle(button);
    const symbolWidth = symbol ? symbol.getBoundingClientRect().width : 0;
    const labelWidth = label && track ? track.scrollWidth : 0;
    const paddingRight = parseFloat(styles.paddingRight || '0');
    const borderLeft = parseFloat(styles.borderLeftWidth || '0');
    const borderRight = parseFloat(styles.borderRightWidth || '0');
    const width = symbolWidth + labelWidth + paddingRight + borderLeft + borderRight;
    return Math.max(width, parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--mod-button-size')) || 44);
  }

  function getHorizontalUniformWidth(menu) {
    const availableWidth = menu.clientWidth;
    const widths = getButtons(menu)
      .filter(button => button.dataset.renderState === 'extended')
      .map(button => measureNaturalExtendedWidth(button))
      .filter(width => width <= availableWidth);

    if (widths.length === 0) {
      return availableWidth;
    }

    return Math.max(...widths);
  }

  function applyHorizontalUniformWidths(menu) {
    const uniformWidth = getHorizontalUniformWidth(menu);
    getButtons(menu).forEach(button => {
      clearButtonSizing(button);
      if (button.dataset.renderState !== 'extended') {
        return;
      }
      button.style.width = `${Math.floor(uniformWidth)}px`;
      button.style.flex = `0 0 ${Math.floor(uniformWidth)}px`;
    });
  }

  function ensureOverflowToggle(menu) {
    let toggle = overflowToggles.get(menu);
    if (toggle) {
      return toggle;
    }

    const frame = menu.closest('.mod-menu-frame');
    if (!frame) {
      return null;
    }

    toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'mod-overflow-toggle';
    toggle.textContent = '>';
    frame.appendChild(toggle);
    overflowToggles.set(menu, toggle);
    return toggle;
  }

  function updateOverflowPages(menu) {
    const clip = getClip(menu);
    const toggle = ensureOverflowToggle(menu);
    if (!clip || !toggle) {
      return;
    }

    clearOverflowHidden(menu);
    const buttons = getButtons(menu);
    if (buttons.length == 0) {
      toggle.classList.remove('is-visible');
      return;
    }

    const clipWidth = clip.clientWidth;
    const clipHeight = clip.clientHeight;
    const gap = getGap(menu);
    const orientation = menu.dataset.orientation || 'horizontal';

    let pageSize = 0;
    if (orientation === 'horizontal') {
      let rowWidth = 0;
      let usedHeight = 0;
      let rowHeight = 0;

      for (const button of buttons) {
        const rect = button.getBoundingClientRect();
        const buttonWidth = Math.ceil(rect.width);
        const buttonHeight = Math.ceil(rect.height);

        if (pageSize === 0) {
          rowWidth = buttonWidth;
          rowHeight = buttonHeight;
          usedHeight = buttonHeight;
          pageSize += 1;
          continue;
        }

        if (rowWidth + gap + buttonWidth <= clipWidth + 1) {
          rowWidth += gap + buttonWidth;
          rowHeight = Math.max(rowHeight, buttonHeight);
          pageSize += 1;
          continue;
        }

        if (usedHeight + gap + buttonHeight <= clipHeight + 1) {
          usedHeight += gap + buttonHeight;
          rowWidth = buttonWidth;
          rowHeight = buttonHeight;
          pageSize += 1;
          continue;
        }

        break;
      }
    } else {
      let usedHeight = 0;
      for (const button of buttons) {
        const rect = button.getBoundingClientRect();
        const buttonHeight = Math.ceil(rect.height);
        if (pageSize === 0) {
          usedHeight = buttonHeight;
          pageSize += 1;
          continue;
        }
        if (usedHeight + gap + buttonHeight <= clipHeight + 1) {
          usedHeight += gap + buttonHeight;
          pageSize += 1;
          continue;
        }
        break;
      }
    }

    pageSize = Math.max(1, pageSize);
    const pages = [];
    for (let i = 0; i < buttons.length; i += pageSize) {
      pages.push(buttons.slice(i, i + pageSize));
    }

    const hasOverflow = buttons.length > pageSize;
    menu.dataset.pageSize = String(pageSize);
    menu.dataset.pageCount = String(pages.length);
    if (!menu.dataset.pageIndex) {
      menu.dataset.pageIndex = '0';
    }

    const pageIndex = Math.min(parseInt(menu.dataset.pageIndex || '0', 10) || 0, pages.length - 1);
    for (const button of buttons) {
      if (!pages[pageIndex].includes(button)) {
        button.classList.add('is-overflow-hidden');
      }
    }

    toggle.classList.toggle('is-visible', hasOverflow);
    toggle.dataset.edge = (menu.dataset.orientation || 'horizontal') === 'horizontal' ? 'right' : 'bottom';
    toggle.textContent = (menu.dataset.orientation || 'horizontal') === 'horizontal' ? '>' : 'v';
  }

  function bindOverflowToggle(menu) {
    const toggle = ensureOverflowToggle(menu);
    const frame = menu.closest('.mod-menu-frame');
    if (!toggle || !frame || toggle.dataset.bound === 'true') {
      return;
    }

    toggle.dataset.bound = 'true';
    toggle.addEventListener('click', event => {
      event.preventDefault();
      const pageCount = parseInt(menu.dataset.pageCount || '1', 10) || 1;
      if (pageCount <= 1) {
        return;
      }
      const next = ((parseInt(menu.dataset.pageIndex || '0', 10) || 0) + 1) % pageCount;
      menu.dataset.pageIndex = String(next);
      updateOverflowPages(menu);
      updateExtendedLabelMotion(menu);
    });

    frame.addEventListener('mouseleave', () => {
      if ((parseInt(menu.dataset.pageIndex || '0', 10) || 0) === 0) {
        return;
      }
      menu.dataset.pageIndex = '0';
      updateOverflowPages(menu);
      updateExtendedLabelMotion(menu);
    });
  }

  function getGap(menu) {
    const styles = window.getComputedStyle(menu);
    return parseFloat(styles.columnGap || styles.gap || '0');
  }

  function getRequiredWidth(menu) {
    const buttons = getButtons(menu);
    const gap = getGap(menu);
    const totalWidth = buttons.reduce((sum, button) => sum + button.getBoundingClientRect().width, 0);
    return totalWidth + Math.max(0, buttons.length - 1) * gap;
  }

  function applyAutoStates(menu) {
    const orientation = menu.dataset.orientation || 'horizontal';
    const buttons = getButtons(menu);
    resetStates(menu);
    clearOverflowHidden(menu);

    if (orientation === 'vertical') {
      const collapseWidth = Number(menu.dataset.collapseWidth || 172);
      const state = menu.clientWidth >= collapseWidth ? 'extended' : 'collapsed';
      buttons.forEach(button => {
        if ((button.dataset.buttonMode || 'auto') === 'auto') {
          setState(button, state);
        }
      });
      bindOverflowToggle(menu);
      updateOverflowPages(menu);
      updateExtendedLabelMotion(menu);
      return;
    }

    const availableWidth = menu.clientWidth;
    buttons.forEach(button => {
      const mode = button.dataset.buttonMode || 'auto';
      if (mode !== 'auto') {
        return;
      }
      if (measureNaturalExtendedWidth(button) > availableWidth) {
        setState(button, 'collapsed');
      }
    });

    applyHorizontalUniformWidths(menu);
    bindOverflowToggle(menu);
    updateOverflowPages(menu);
    updateExtendedLabelMotion(menu);
  }

  function getTargetButton(menu, event) {
    return event.target.closest('.mod-button') && menu.contains(event.target.closest('.mod-button'))
      ? event.target.closest('.mod-button')
      : null;
  }

  function attachDrag(menu) {
    const orientation = menu.dataset.orientation || 'horizontal';
    let dragged = null;

    getButtons(menu).forEach(button => {
      button.draggable = true;
      button.addEventListener('dragstart', () => {
        dragged = button;
        button.classList.add('is-dragging');
      });
      button.addEventListener('dragend', () => {
        button.classList.remove('is-dragging');
        dragged = null;
        applyAutoStates(menu);
      });
    });

    menu.addEventListener('dragover', event => {
      if (!dragged) {
        return;
      }
      event.preventDefault();
      const target = getTargetButton(menu, event);
      if (!target || target === dragged) {
        return;
      }

      const rect = target.getBoundingClientRect();
      const before = orientation === 'vertical'
        ? event.clientY < rect.top + rect.height / 2
        : event.clientX < rect.left + rect.width / 2;

      menu.insertBefore(dragged, before ? target : target.nextSibling);
    });
  }

  function clamp(v, min, max) {
    return Math.min(Math.max(v, min), max);
  }

  function snapToGrid(value, cellSize) {
    return Math.round(value / cellSize) * cellSize;
  }

  function attachGridHandle(handle) {
    if (dragHandles.has(handle)) {
      return;
    }

    const targetSelector = handle.dataset.dragTarget;
    const target = targetSelector ? document.querySelector(targetSelector) : handle.parentElement;
    if (!target) {
      return;
    }

    let pointerId = null;
    let dragOffsetX = 0;
    let dragOffsetY = 0;
    let initialized = false;

    function clampAndSnap(rawLeft, rawTop) {
      const grid = getGridMetrics();
      const rect = target.getBoundingClientRect();
      const width = rect.width;
      const height = rect.height;
      const snappedLeft = snapToGrid(rawLeft, grid.cellWidth);
      const snappedTop = snapToGrid(rawTop, grid.cellHeight);
      return {
        left: clamp(snappedLeft, 0, Math.max(0, grid.cols * grid.cellWidth - width)),
        top: clamp(snappedTop, 0, Math.max(0, grid.rows * grid.cellHeight - height))
      };
    }

    function positionTarget(left, top) {
      target.style.left = `${Math.round(left)}px`;
      target.style.top = `${Math.round(top)}px`;
      const grid = getGridMetrics();
      target.dataset.gridCol = String(Math.round(left / grid.cellWidth));
      target.dataset.gridRow = String(Math.round(top / grid.cellHeight));
    }

    function moveTarget(clientX, clientY) {
      const pos = clampAndSnap(clientX - dragOffsetX, clientY - dragOffsetY);
      positionTarget(pos.left, pos.top);
    }

    function initializeTargetPosition() {
      if (initialized) {
        return;
      }
      const rect = target.getBoundingClientRect();
      setGridBoxDefaults(target);
      target.style.zIndex = '10';
      const pos = clampAndSnap(rect.left, rect.top);
      positionTarget(pos.left, pos.top);
      initialized = true;
    }

    handle.addEventListener('pointerdown', event => {
      initializeTargetPosition();
      pointerId = event.pointerId;
      handle.setPointerCapture(pointerId);
      handle.classList.add('is-dragging');
      const rect = target.getBoundingClientRect();
      dragOffsetX = event.clientX - rect.left;
      dragOffsetY = event.clientY - rect.top;
      event.preventDefault();
    });

    handle.addEventListener('pointermove', event => {
      if (pointerId !== event.pointerId) {
        return;
      }
      moveTarget(event.clientX, event.clientY);
    });

    function stopDrag(event) {
      if (pointerId !== event.pointerId) {
        return;
      }
      handle.classList.remove('is-dragging');
      handle.releasePointerCapture(pointerId);
      pointerId = null;
    }

    handle.addEventListener('pointerup', stopDrag);
    handle.addEventListener('pointercancel', stopDrag);
    attachHoverTooltip(handle, 'Drag frame');

    window.addEventListener('resize', () => {
      if (!initialized || pointerId != null) {
        return;
      }
      const grid = getGridMetrics();
      const left = (parseFloat(target.dataset.gridCol || '0') || 0) * grid.cellWidth;
      const top = (parseFloat(target.dataset.gridRow || '0') || 0) * grid.cellHeight;
      const pos = clampAndSnap(left, top);
      positionTarget(pos.left, pos.top);
    });

    dragHandles.set(handle, { initializeTargetPosition });
  }

  function attachResizeHandle(handle) {
    if (resizeHandles.has(handle)) {
      return;
    }

    const targetSelector = handle.dataset.resizeTarget;
    const target = targetSelector ? document.querySelector(targetSelector) : handle.parentElement;
    if (!target) {
      return;
    }

    const menu = target.querySelector('[data-modular-menu]');
    let pointerId = null;
    let startX = 0;
    let startY = 0;
    let startWidth = 0;
    let startHeight = 0;

    function snapSize(rawWidth, rawHeight, left = 0, top = 0) {
      const grid = getGridMetrics();
      const width = Math.max(grid.cellWidth, snapToGrid(rawWidth, grid.cellWidth));
      const height = Math.max(grid.cellHeight, snapToGrid(rawHeight, grid.cellHeight));
      return {
        width: Math.round(clamp(width, grid.cellWidth, grid.cols * grid.cellWidth - left)),
        height: Math.round(clamp(height, grid.cellHeight, grid.rows * grid.cellHeight - top))
      };
    }

    function applySize(width, height) {
      const left = parseFloat(target.style.left || '0') || 0;
      const top = parseFloat(target.style.top || '0') || 0;
      const size = snapSize(width, height, left, top);
      target.style.width = `${size.width}px`;
      target.style.height = `${size.height}px`;
      const grid = getGridMetrics();
      target.dataset.gridWidth = String(Math.round(size.width / grid.cellWidth));
      target.dataset.gridHeight = String(Math.round(size.height / grid.cellHeight));
      if (menu && menus.has(menu)) {
        menus.get(menu).refresh();
      }
    }

    function ensureInitialHeight() {
      setGridBoxDefaults(target);
    }

    handle.addEventListener('pointerdown', event => {
      ensureInitialHeight();
      const rect = target.getBoundingClientRect();
      pointerId = event.pointerId;
      startX = event.clientX;
      startY = event.clientY;
      startWidth = rect.width;
      startHeight = rect.height;
      handle.setPointerCapture(pointerId);
      handle.classList.add('is-dragging');
      event.preventDefault();
    });

    handle.addEventListener('pointermove', event => {
      if (pointerId !== event.pointerId) {
        return;
      }
      const width = startWidth + (event.clientX - startX);
      const height = startHeight + (event.clientY - startY);
      applySize(width, height);
    });

    function stopResize(event) {
      if (pointerId !== event.pointerId) {
        return;
      }
      handle.classList.remove('is-dragging');
      handle.releasePointerCapture(pointerId);
      pointerId = null;
    }

    handle.addEventListener('pointerup', stopResize);
    handle.addEventListener('pointercancel', stopResize);
    attachHoverTooltip(handle, 'Resize frame');

    window.addEventListener('resize', () => {
      const grid = getGridMetrics();
      const width = (parseFloat(target.dataset.gridWidth || '0') || 0) * grid.cellWidth;
      const height = (parseFloat(target.dataset.gridHeight || '0') || 0) * grid.cellHeight;
      if (width > 0 && height > 0) {
        applySize(width, height);
      }
    });

    ensureInitialHeight();
    resizeHandles.set(handle, { ensureInitialHeight });
  }

  function updateOrientationHandleLabel(handle, menu) {
    const orientation = menu.dataset.orientation || 'horizontal';
    handle.textContent = orientation === 'horizontal' ? '↕' : '↔';
    handle.setAttribute(
      'aria-label',
      orientation === 'horizontal'
        ? 'Switch menu to vertical layout'
        : 'Switch menu to horizontal layout'
    );
    handle.title = handle.getAttribute('aria-label');
  }

  function attachOrientationHandle(handle) {
    if (orientationHandles.has(handle)) {
      return;
    }

    const targetSelector = handle.dataset.orientationTarget;
    const menu = targetSelector ? document.querySelector(targetSelector) : null;
    if (!menu) {
      return;
    }

    function toggleOrientation() {
      const next = (menu.dataset.orientation || 'horizontal') === 'horizontal'
        ? 'vertical'
        : 'horizontal';
      menu.dataset.orientation = next;
      if (menus.has(menu)) {
        menus.get(menu).refresh();
      }
      updateOrientationHandleLabel(handle, menu);
    }

    handle.addEventListener('click', toggleOrientation);
    attachHoverTooltip(handle, 'Toggle row/column');
    updateOrientationHandleLabel(handle, menu);
    orientationHandles.set(handle, { toggleOrientation });
  }

  function initMenu(menu) {
    if (menus.has(menu)) {
      return menus.get(menu);
    }

    getButtons(menu).forEach(button => {
      ensureLabelTrack(button);
      ensureModeToggle(button, menu);
    });

    applyAutoStates(menu);
    attachDrag(menu);

    const observer = new ResizeObserver(() => {
      applyAutoStates(menu);
    });
    observer.observe(menu);

    const api = {
      refresh() {
        applyAutoStates(menu);
      }
    };

    menus.set(menu, api);
    return api;
  }

  let carouselTick = 0;
  let carouselTimer = null;
  const activeCarousels = new Set();

  function carouselPillsOf(carousel) {
    if (!carousel._pills) {
      carousel._pills = [...carousel.querySelectorAll('.mod-meta-pill')];
    }
    return carousel._pills;
  }

  function syncCarouselTick(carousel) {
    const pills = carouselPillsOf(carousel);
    if (pills.length === 0) {
      return;
    }
    pills.forEach(p => p.classList.remove('is-carousel-active'));
    pills[carouselTick % pills.length].classList.add('is-carousel-active');
  }

  function globalCarouselTick() {
    carouselTick++;
    activeCarousels.forEach(carousel => {
      syncCarouselTick(carousel);
    });
  }

  function ensureGlobalTicker() {
    if (carouselTimer !== null) {
      return;
    }
    carouselTimer = setInterval(globalCarouselTick, 3000);
  }

  function registerCarousel(carousel) {
    const pills = carouselPillsOf(carousel);
    if (pills.length === 0) {
      return;
    }
    activeCarousels.add(carousel);
    ensureGlobalTicker();
    syncCarouselTick(carousel);
  }

  function unregisterCarousel(carousel) {
    activeCarousels.delete(carousel);
    if (pinnedCarousel === carousel) {
      hideTagTooltip(true);
    }
  }

  function attachCarouselHover(carousel) {
    if (carousel.dataset.hoverBound === 'true') {
      return;
    }
    carousel.dataset.hoverBound = 'true';

    carousel.addEventListener('mouseenter', event => {
      if (pinnedCarousel && pinnedCarousel !== carousel) {
        return;
      }
      showTagTooltip(carousel, event, pinnedCarousel === carousel);
    });

    carousel.addEventListener('mousemove', event => {
      if (pinnedCarousel && pinnedCarousel !== carousel) {
        return;
      }
      showTagTooltip(carousel, event, pinnedCarousel === carousel);
    });

    carousel.addEventListener('mouseleave', () => {
      if (pinnedCarousel === carousel) {
        return;
      }
      hideTagTooltip(false);
    });

    carousel.addEventListener('click', event => {
      event.preventDefault();
      event.stopPropagation();

      if (pinnedCarousel === carousel) {
        hideTagTooltip(true);
        return;
      }

      pinnedCarousel = carousel;
      showTagTooltip(carousel, event, true);
    });
  }

  const FAKE_META = [
    { created: 'Feb 27, 2026', edited: '4h ago' },
    { created: '1 week ago', edited: '1 day ago' },
    { created: 'Mar 1, 2026', edited: '12 min ago' },
    { created: 'Jan 14, 2026', edited: '3 days ago' },
    { created: 'Feb 1, 2026', edited: '2h ago' },
    { created: 'Mar 1, 2026', edited: 'Just now' },
  ];

  function buildDateRow(card, cardIndex) {
    const m = FAKE_META[cardIndex % FAKE_META.length];
    const row = document.createElement('div');
    row.className = 'mod-date-row';
    row.innerHTML =
      `<span class="mod-date-item"><span class="mod-date-label">Created</span>${m.created}</span>` +
      `<span class="mod-date-item"><span class="mod-date-label">Edited</span>${m.edited}</span>`;
    return row;
  }

  function buildHybridRow(card, cardIndex) {
    const m = FAKE_META[cardIndex % FAKE_META.length];
    const row = document.createElement('div');
    row.className = 'mod-hybrid-row';

    const dateSpan = document.createElement('span');
    dateSpan.className = 'mod-date-item mod-hybrid-edited';
    dateSpan.textContent = m.edited;
    dateSpan.title = `Last edit: ${m.edited}`;
    dateSpan.setAttribute('aria-label', `Last edit: ${m.edited}`);
    row.appendChild(dateSpan);

    const srcPills = [...card.querySelectorAll('.mod-meta-row .mod-meta-pill')];
    if (srcPills.length > 0) {
      const carousel = document.createElement('div');
      carousel.className = 'mod-tag-carousel';
      const track = document.createElement('div');
      track.className = 'mod-carousel-track';
      srcPills.forEach(srcPill => {
        const pill = document.createElement('span');
        pill.className = 'mod-meta-pill';
        pill.textContent = srcPill.textContent;
        track.appendChild(pill);
      });
      carousel.appendChild(track);
      row.appendChild(carousel);
      attachCarouselHover(carousel);
    }

    return row;
  }

  function ensureInjectedRows(dataList) {
    [...dataList.querySelectorAll('.mod-data-card')].forEach((card, i) => {
      const main = card.querySelector('.mod-data-main');
      if (!main) {
        return;
      }

      if (!main.querySelector('.mod-date-row')) {
        main.appendChild(buildDateRow(card, i));
      }
      if (!main.querySelector('.mod-hybrid-row')) {
        main.appendChild(buildHybridRow(card, i));
      }
    });
  }

  function applyMetaView(dataList, mode) {
    dataList.dataset.metaView = mode;
    if (mode === 'dates' || mode === 'hybrid') {
      ensureInjectedRows(dataList);
    }
    if (mode === 'hybrid') {
      dataList.querySelectorAll('.mod-tag-carousel').forEach(registerCarousel);
    } else {
      dataList.querySelectorAll('.mod-tag-carousel').forEach(unregisterCarousel);
      hideTagTooltip(true);
    }
  }

  function initViewSwitchers(root) {
    const views = [
      { id: 'list', icon: '☰', label: 'List' },
      { id: 'details', icon: '▤', label: 'Details' },
      { id: 'cards', icon: '▦', label: 'Cards' }
    ];

    const metaOpts = [
      { id: 'tags', icon: '🏷', label: 'Tags' },
      { id: 'dates', icon: '📄', label: 'Dates' },
      { id: 'hybrid', icon: '◑', label: 'Hybrid' },
    ];

    root.querySelectorAll('.mod-content-frame').forEach(frame => {
      const dataList = frame.querySelector('.mod-data-list');
      if (!dataList) {
        return;
      }
      if (frame.querySelector('.mod-view-switcher')) {
        return;
      }

      const switcher = document.createElement('div');
      switcher.className = 'mod-view-switcher';

      views.forEach(view => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'mod-view-btn';
        btn.dataset.view = view.id;
        btn.innerHTML = `<span class="mod-view-icon">${view.icon}</span>${view.label}`;
        if (view.id === 'details') {
          btn.classList.add('is-active');
        }

        btn.addEventListener('click', () => {
          switcher.querySelectorAll('.mod-view-btn').forEach(b => b.classList.remove('is-active'));
          btn.classList.add('is-active');
          dataList.dataset.view = view.id;
        });

        switcher.appendChild(btn);
      });

      const dropdown = document.createElement('div');
      dropdown.className = 'mod-meta-dropdown';

      const toggle = document.createElement('button');
      toggle.type = 'button';
      toggle.className = 'mod-meta-toggle';
      toggle.title = 'Metadata display options';
      toggle.innerHTML = '<span class="mod-view-icon">⋯</span>';

      function closeDropdown() {
        dropdown.classList.remove('is-open');
        toggle.classList.remove('is-open');
      }

      toggle.addEventListener('click', e => {
        e.stopPropagation();
        const isOpen = dropdown.classList.contains('is-open');
        dropdown.classList.toggle('is-open', !isOpen);
        toggle.classList.toggle('is-open', !isOpen);
      });

      document.addEventListener('click', () => closeDropdown(), { capture: false });
      dropdown.addEventListener('click', e => e.stopPropagation());

      metaOpts.forEach(opt => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'mod-meta-opt';
        btn.dataset.metaOpt = opt.id;
        btn.innerHTML = `<span class="mod-meta-opt-icon">${opt.icon}</span>${opt.label}`;
        if (opt.id === 'tags') {
          btn.classList.add('is-active');
        }

        btn.addEventListener('click', () => {
          dropdown.querySelectorAll('.mod-meta-opt').forEach(b => b.classList.remove('is-active'));
          btn.classList.add('is-active');
          applyMetaView(dataList, opt.id);
          closeDropdown();
        });

        dropdown.appendChild(btn);
      });

      switcher.style.position = 'relative';
      switcher.appendChild(toggle);
      switcher.appendChild(dropdown);
      dataList.dataset.view = 'details';
      applyMetaView(dataList, 'tags');
      frame.appendChild(switcher);
    });
  }

  function init(root = document) {
    syncGridCssVars();
    root.querySelectorAll('[data-grid-box]').forEach(target => {
      setGridBoxDefaults(target);
    });
    root.querySelectorAll('[data-mod-edit-toggle]').forEach(button => {
      bindEditToggle(button);
    });
    root.querySelectorAll('[data-modular-menu]').forEach(menu => {
      initMenu(menu);
    });
    root.querySelectorAll('[data-grid-drag-handle]').forEach(handle => {
      attachGridHandle(handle);
    });
    root.querySelectorAll('[data-grid-resize-handle]').forEach(handle => {
      attachResizeHandle(handle);
    });
    root.querySelectorAll('[data-orientation-toggle-handle]').forEach(handle => {
      attachOrientationHandle(handle);
    });
    initViewSwitchers(root);

    window.addEventListener('resize', syncGridCssVars);
  }

  window.HestiaModularMenus = {
    init
  };
})();
