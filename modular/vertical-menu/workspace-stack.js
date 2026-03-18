(() => {
  const core = window.HestiaVerticalCore;
  if (!core?.workspace) {
    return;
  }

  const workspace = core.workspace;
  const CONTENT_STACK_KINDS = new Set([
    'data',
    'text',
    'graph',
    'graph-widget',
    'settings',
    'organizer',
    'chat-history',
    'chat-compose'
  ]);
  const MENU_STACK_KINDS = new Set(['navigation']);
  let stackGroupCounter = 0;
  let menuButtonCounter = 0;
  let stackGroups = new Map();
  let frameToStackGroupId = new WeakMap();
  let contentTabWires = new Map();
  let menuTabTargets = new Map();
  let activeContentGroupId = '';
  let stackContextMenu = null;
  let contentStackSeeded = false;

  function moduleFrames(root = document) {
    return workspace.moduleFrames(root);
  }

  function frameInstanceId(frame) {
    return workspace.frameInstanceId(frame);
  }

  function frameStackCategory(frameOrKind) {
    const kind = typeof frameOrKind === 'string'
      ? frameOrKind
      : frameOrKind?.dataset?.moduleKind || '';
    if (CONTENT_STACK_KINDS.has(kind)) {
      return 'content';
    }
    if (MENU_STACK_KINDS.has(kind)) {
      return 'menu';
    }
    return '';
  }

  function frameTabKey(frame) {
    return frameInstanceId(frame);
  }

  function stackGroupForFrame(frame) {
    if (!frame) {
      return null;
    }
    const groupId = frameToStackGroupId.get(frame) || frame.dataset.stackGroupId || '';
    if (!groupId) {
      return null;
    }
    return stackGroups.get(groupId) || null;
  }

  function ensureMenuButtonId(button) {
    const existing = button?.dataset?.menuButtonId || '';
    if (existing) {
      const match = existing.match(/(\d+)$/);
      if (match) {
        menuButtonCounter = Math.max(menuButtonCounter, Number(match[1]) || 0);
      }
      return existing;
    }

    menuButtonCounter += 1;
    const next = `menu-button-${menuButtonCounter}`;
    button.dataset.menuButtonId = next;
    return next;
  }

  function registerMenuButtonIds(root = document) {
    root.querySelectorAll('[data-module-kind="navigation"] .mod-button').forEach(button => {
      ensureMenuButtonId(button);
    });
  }

  function copyFrameGeometry(sourceFrame, targetFrame) {
    if (!sourceFrame || !targetFrame || sourceFrame === targetFrame) {
      return;
    }

    targetFrame.style.left = sourceFrame.style.left;
    targetFrame.style.top = sourceFrame.style.top;
    targetFrame.style.width = sourceFrame.style.width;
    targetFrame.style.height = sourceFrame.style.height;

    ['gridCol', 'gridRow', 'gridWidth', 'gridHeight'].forEach(key => {
      if (sourceFrame.dataset[key] !== undefined) {
        targetFrame.dataset[key] = sourceFrame.dataset[key];
      }
    });
  }

  function setStackFrameVisibility(frame, visible) {
    if (!frame) {
      return;
    }
    frame.dataset.stackHidden = visible ? 'false' : 'true';
    frame.hidden = !visible;
    frame.style.display = visible ? '' : 'none';
  }

  function createStackGroup(frame, category) {
    stackGroupCounter += 1;
    const group = {
      id: `stack-group-${stackGroupCounter}`,
      category,
      frames: [frame],
      activeFrame: frame,
      header: null
    };
    stackGroups.set(group.id, group);
    frame.dataset.stackGroupId = group.id;
    frameToStackGroupId.set(frame, group.id);
    return group;
  }

  function ensureStackGroup(frame) {
    if (!frame) {
      return null;
    }
    const category = frameStackCategory(frame);
    if (!category) {
      return null;
    }
    const existing = stackGroupForFrame(frame);
    if (existing) {
      return existing;
    }
    return createStackGroup(frame, category);
  }

  function removeStackGroup(group) {
    if (!group) {
      return;
    }
    if (group.header) {
      group.header.remove();
      group.header = null;
    }
    group.frames.forEach(frame => {
      frameToStackGroupId.delete(frame);
      delete frame.dataset.stackGroupId;
      delete frame.dataset.stackHidden;
      frame.classList.remove('mod-has-stack-header');
      frame.hidden = false;
      frame.style.display = '';
    });
    stackGroups.delete(group.id);
  }

  function syncStackGroupGeometry(group, sourceFrame = group?.activeFrame) {
    if (!group || !sourceFrame) {
      return;
    }
    group.frames.forEach(frame => {
      if (frame !== sourceFrame) {
        copyFrameGeometry(sourceFrame, frame);
      }
    });
  }

  function attachStackHeaderToActiveFrame(group) {
    if (!group || !group.header || !group.activeFrame) {
      return;
    }
    group.frames.forEach(frame => {
      if (frame !== group.activeFrame) {
        frame.classList.remove('mod-has-stack-header');
      }
    });
    group.activeFrame.classList.add('mod-has-stack-header');
    group.activeFrame.appendChild(group.header);
  }

  function syncStackGroupVisibility(group) {
    if (!group) {
      return;
    }
    group.frames.forEach(frame => {
      setStackFrameVisibility(frame, frame === group.activeFrame);
    });
    attachStackHeaderToActiveFrame(group);
  }

  function frameOverlapScore(source, target) {
    const a = source.getBoundingClientRect();
    const b = target.getBoundingClientRect();
    const left = Math.max(a.left, b.left);
    const right = Math.min(a.right, b.right);
    const top = Math.max(a.top, b.top);
    const bottom = Math.min(a.bottom, b.bottom);
    if (right <= left || bottom <= top) {
      return 0;
    }
    const overlap = (right - left) * (bottom - top);
    const area = Math.max(1, Math.min(a.width * a.height, b.width * b.height));
    return overlap / area;
  }

  function mergeStackGroups(targetGroup, sourceGroup) {
    if (!targetGroup || !sourceGroup || targetGroup === sourceGroup) {
      return targetGroup;
    }

    sourceGroup.frames.forEach(frame => {
      if (targetGroup.frames.includes(frame)) {
        return;
      }
      targetGroup.frames.push(frame);
      frame.dataset.stackGroupId = targetGroup.id;
      frameToStackGroupId.set(frame, targetGroup.id);
    });

    if (sourceGroup.header) {
      sourceGroup.header.remove();
      sourceGroup.header = null;
    }

    if (activeContentGroupId === sourceGroup.id) {
      activeContentGroupId = targetGroup.id;
    }

    stackGroups.delete(sourceGroup.id);
    return targetGroup;
  }

  function firstContentGroup() {
    return [...stackGroups.values()].find(group => group.category === 'content' && group.frames.length > 0) || null;
  }

  function preferredContentGroup(excludeFrame = null) {
    const activeGroup = activeContentGroupId ? stackGroups.get(activeContentGroupId) || null : null;
    if (
      activeGroup &&
      activeGroup.category === 'content' &&
      activeGroup.frames.length > 0 &&
      !activeGroup.frames.includes(excludeFrame)
    ) {
      return activeGroup;
    }

    return [...stackGroups.values()].find(group =>
      group.category === 'content' &&
      group.frames.length > 0 &&
      !group.frames.includes(excludeFrame)
    ) || null;
  }

  function positionFrameNearPointer(frame, clientX, clientY, options = {}) {
    if (!frame) {
      return;
    }

    const width = parseFloat(frame.style.width || '0') || frame.getBoundingClientRect().width || 320;
    const height = parseFloat(frame.style.height || '0') || frame.getBoundingClientRect().height || 220;
    const margin = 8;
    const offsetX = options.offsetX ?? Math.min(96, width * 0.3);
    const offsetY = options.offsetY ?? 14;

    let left = clientX - offsetX;
    let top = clientY - offsetY;
    left = Math.max(margin, Math.min(left, window.innerWidth - width - margin));
    top = Math.max(margin, Math.min(top, window.innerHeight - height - margin));

    frame.style.left = `${Math.round(left)}px`;
    frame.style.top = `${Math.round(top)}px`;
  }

  function detachFrameFromStackGroup(frame, options = {}) {
    if (!frame) {
      return null;
    }

    const category = frameStackCategory(frame);
    const group = stackGroupForFrame(frame);
    if (!category || !group || group.frames.length <= 1) {
      return group;
    }

    const wasActive = group.activeFrame === frame;
    group.frames = group.frames.filter(member => member !== frame);
    frameToStackGroupId.delete(frame);
    delete frame.dataset.stackGroupId;
    delete frame.dataset.stackHidden;
    frame.classList.remove('mod-has-stack-header');
    frame.hidden = false;
    frame.style.display = '';

    const nextGroup = createStackGroup(frame, category);

    if (typeof options.left === 'number') {
      frame.style.left = `${Math.round(options.left)}px`;
    }
    if (typeof options.top === 'number') {
      frame.style.top = `${Math.round(options.top)}px`;
    }

    if (group.frames.length === 0) {
      removeStackGroup(group);
    } else {
      if (wasActive) {
        group.activeFrame = group.frames[0];
      }
      syncStackGroupGeometry(group, group.activeFrame);
      syncStackGroupVisibility(group);
      renderStackGroupHeader(group);
    }

    syncStackGroupGeometry(nextGroup, frame);
    syncStackGroupVisibility(nextGroup);
    renderStackGroupHeader(nextGroup);

    if (category === 'content') {
      activeContentGroupId = nextGroup.id;
      syncMenuGroupsForActiveContent();
    }

    renderAllStackGroupHeaders();
    return nextGroup;
  }

  function stackContentFrameIntoPreferredGroup(frame, options = {}) {
    if (!frame || frameStackCategory(frame) !== 'content') {
      return null;
    }

    const targetGroup = preferredContentGroup(frame);
    const sourceGroup = ensureStackGroup(frame);
    if (!targetGroup || !sourceGroup || targetGroup === sourceGroup) {
      if (sourceGroup && options.activate === true) {
        setStackGroupActiveFrame(sourceGroup, frame);
      }
      return sourceGroup;
    }

    mergeStackGroups(targetGroup, sourceGroup);
    setStackGroupActiveFrame(targetGroup, frame, { skipContentSync: false });
    renderAllStackGroupHeaders();
    return targetGroup;
  }

  function seedInitialContentStack(root = document) {
    if (contentStackSeeded) {
      return;
    }

    const contentFrames = moduleFrames(root).filter(frame => frameStackCategory(frame) === 'content');
    if (contentFrames.length === 0) {
      contentStackSeeded = true;
      return;
    }

    const primaryGroup = ensureStackGroup(contentFrames[0]);
    contentFrames.slice(1).forEach(frame => {
      const sourceGroup = ensureStackGroup(frame);
      if (sourceGroup && sourceGroup !== primaryGroup) {
        mergeStackGroups(primaryGroup, sourceGroup);
      }
    });

    syncStackGroupGeometry(primaryGroup, primaryGroup.activeFrame);
    syncStackGroupVisibility(primaryGroup);
    renderStackGroupHeader(primaryGroup);
    activeContentGroupId = primaryGroup.id;
    syncMenuGroupsForActiveContent();
    renderAllStackGroupHeaders();
    contentStackSeeded = true;
  }

  function buttonDisplayText(button) {
    const label = button.querySelector('.mod-label')?.textContent?.trim();
    if (label) {
      return label;
    }
    return button.querySelector('.mod-symbol')?.textContent?.trim() || 'Button';
  }

  function frameTabName(frame, group) {
    const kind = frame?.dataset?.moduleKind || '';
    const label = workspace.moduleLabel(kind);
    if (!group) {
      return label;
    }
    const sameKind = group.frames.filter(candidate => candidate.dataset.moduleKind === kind);
    if (sameKind.length <= 1) {
      return label;
    }
    const index = sameKind.indexOf(frame) + 1;
    return `${label} ${index}`;
  }

  function contentGroupName(group) {
    if (!group || group.frames.length === 0) {
      return 'Content';
    }
    if (group.frames.length === 1) {
      return frameTabName(group.frames[0], group);
    }
    return `${frameTabName(group.activeFrame || group.frames[0], group)} stack`;
  }

  function menuGroupName(group) {
    if (!group || group.frames.length === 0) {
      return 'Menu';
    }
    const frame = group.activeFrame || group.frames[0];
    const base = frameTabName(frame, group);
    return group.frames.length > 1 ? `${base} set` : base;
  }

  function closeStackContextMenu() {
    if (!stackContextMenu) {
      return;
    }
    stackContextMenu.hidden = true;
    stackContextMenu.innerHTML = '';
  }

  function ensureStackContextMenu() {
    if (stackContextMenu) {
      return stackContextMenu;
    }
    stackContextMenu = document.createElement('div');
    stackContextMenu.className = 'mod-stack-context-menu';
    stackContextMenu.dataset.stackContextMenu = 'true';
    stackContextMenu.hidden = true;
    document.body.appendChild(stackContextMenu);
    return stackContextMenu;
  }

  function openStackContextMenu(event, title, options, onPick) {
    const menu = ensureStackContextMenu();
    menu.innerHTML = '';

    if (title) {
      const heading = document.createElement('p');
      heading.className = 'mod-stack-context-title';
      heading.textContent = title;
      menu.appendChild(heading);
    }

    options.forEach(option => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'mod-stack-context-option';
      if (option.active) {
        button.classList.add('is-active');
      }
      button.textContent = option.label;
      button.addEventListener('click', eventClick => {
        eventClick.preventDefault();
        onPick(option.value);
        closeStackContextMenu();
      });
      menu.appendChild(button);
    });

    const margin = 8;
    menu.hidden = false;
    menu.style.left = `${Math.round(event.clientX + 8)}px`;
    menu.style.top = `${Math.round(event.clientY + 8)}px`;
    const rect = menu.getBoundingClientRect();
    const left = Math.min(Math.max(margin, event.clientX + 8), Math.max(margin, window.innerWidth - rect.width - margin));
    const top = Math.min(Math.max(margin, event.clientY + 8), Math.max(margin, window.innerHeight - rect.height - margin));
    menu.style.left = `${Math.round(left)}px`;
    menu.style.top = `${Math.round(top)}px`;
  }

  function activeMenuButtonTargets() {
    const targets = [];
    moduleFrames().forEach(frame => {
      if (frame.dataset.moduleKind !== 'navigation' || frame.dataset.stackHidden === 'true') {
        return;
      }
      const group = stackGroupForFrame(frame);
      const menuName = frameTabName(frame, group);
      frame.querySelectorAll('.mod-button').forEach(button => {
        const id = ensureMenuButtonId(button);
        targets.push({
          value: id,
          label: `${menuName}: ${buttonDisplayText(button)}`
        });
      });
    });
    return targets;
  }

  function contentGroupTargets() {
    return [...stackGroups.values()]
      .filter(group => group.category === 'content' && group.frames.length > 0)
      .map(group => ({
        value: group.id,
        label: contentGroupName(group)
      }));
  }

  function wireLabelForButtonId(buttonId) {
    const button = document.querySelector(`.mod-button[data-menu-button-id="${buttonId}"]`);
    if (!button) {
      return 'missing menu button';
    }
    const frame = button.closest('[data-module-kind="navigation"]');
    const group = stackGroupForFrame(frame);
    const menuName = frameTabName(frame, group);
    return `${menuName}: ${buttonDisplayText(button)}`;
  }

  function wireLabelForContentGroupId(groupId) {
    const group = stackGroups.get(groupId);
    return group ? contentGroupName(group) : 'missing content target';
  }

  function openContentWirePicker(event, frame) {
    event.preventDefault();
    const tabKey = frameTabKey(frame);
    const current = contentTabWires.get(tabKey) || '';
    const targets = activeMenuButtonTargets();
    const options = [
      { value: '', label: 'No wire', active: current === '' },
      ...targets.map(target => ({
        value: target.value,
        label: target.label,
        active: target.value === current
      }))
    ];

    openStackContextMenu(event, 'Connect tab to menu button', options, nextValue => {
      if (!nextValue) {
        contentTabWires.delete(tabKey);
      } else {
        contentTabWires.set(tabKey, nextValue);
      }
      renderAllStackGroupHeaders();
    });
  }

  function openMenuTargetPicker(event, frame) {
    event.preventDefault();
    const tabKey = frameTabKey(frame);
    const current = menuTabTargets.get(tabKey) || '';
    const targets = contentGroupTargets();
    const options = [
      { value: '', label: 'No dependency', active: current === '' },
      ...targets.map(target => ({
        value: target.value,
        label: target.label,
        active: target.value === current
      }))
    ];

    openStackContextMenu(event, 'Connect menu tab to content window', options, nextValue => {
      if (!nextValue) {
        menuTabTargets.delete(tabKey);
      } else {
        menuTabTargets.set(tabKey, nextValue);
      }
      syncMenuGroupsForActiveContent();
      renderAllStackGroupHeaders();
    });
  }

  function closeAllMenuGroupLists(exceptGroupId = '') {
    stackGroups.forEach(group => {
      if (group.category !== 'menu' || !group.header || group.id === exceptGroupId) {
        return;
      }
      const list = group.header.querySelector('[data-menu-group-list]');
      if (list) {
        list.hidden = true;
      }
    });
  }

  function menuForFrame(frame) {
    return frame?.querySelector('[data-modular-menu]') || null;
  }

  function nextMenuButtonSymbol(menu) {
    const index = menu.querySelectorAll('.mod-button').length;
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    return alphabet[index % alphabet.length];
  }

  function removeWiresForButtonId(buttonId) {
    if (!buttonId) {
      return;
    }
    [...contentTabWires.entries()].forEach(([tabKey, wiredButtonId]) => {
      if (wiredButtonId === buttonId) {
        contentTabWires.delete(tabKey);
      }
    });
  }

  function pruneContentWiresByExistingButtons() {
    const activeIds = new Set(
      [...document.querySelectorAll('.mod-button[data-menu-button-id]')]
        .map(button => button.dataset.menuButtonId)
    );
    [...contentTabWires.entries()].forEach(([tabKey, buttonId]) => {
      if (!activeIds.has(buttonId)) {
        contentTabWires.delete(tabKey);
      }
    });
  }

  function pruneMenuDependenciesByExistingGroups() {
    const activeGroups = new Set(
      [...stackGroups.values()]
        .filter(group => group.category === 'content' && group.frames.length > 0)
        .map(group => group.id)
    );
    [...menuTabTargets.entries()].forEach(([tabKey, groupId]) => {
      if (!activeGroups.has(groupId)) {
        menuTabTargets.delete(tabKey);
      }
    });
  }

  function addMenuButtonToFrame(frame) {
    const menu = menuForFrame(frame);
    if (!menu) {
      return;
    }

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'mod-button';
    button.dataset.buttonMode = 'auto';

    const symbol = document.createElement('span');
    symbol.className = 'mod-symbol';
    symbol.textContent = nextMenuButtonSymbol(menu);

    const label = document.createElement('span');
    label.className = 'mod-label';
    label.textContent = `Item ${menu.querySelectorAll('.mod-button').length + 1}`;

    button.appendChild(symbol);
    button.appendChild(label);
    menu.appendChild(button);
    ensureMenuButtonId(button);

    window.HestiaModularMenus.init(frame);
    renderAllStackGroupHeaders();
  }

  function removeMenuButtonFromFrame(frame) {
    const menu = menuForFrame(frame);
    if (!menu) {
      return;
    }
    const buttons = [...menu.querySelectorAll('.mod-button')];
    if (buttons.length <= 1) {
      return;
    }

    const last = buttons[buttons.length - 1];
    removeWiresForButtonId(last.dataset.menuButtonId || '');
    last.remove();
    window.HestiaModularMenus.init(frame);
    renderAllStackGroupHeaders();
  }

  function setStackGroupActiveFrame(group, nextFrame, options = {}) {
    if (!group || !nextFrame || !group.frames.includes(nextFrame)) {
      return;
    }

    const previous = group.activeFrame;
    if (previous && previous !== nextFrame) {
      copyFrameGeometry(previous, nextFrame);
    }

    group.activeFrame = nextFrame;
    syncStackGroupGeometry(group, nextFrame);
    syncStackGroupVisibility(group);
    renderStackGroupHeader(group);

    if (group.category === 'content' && options.skipContentSync !== true) {
      activeContentGroupId = group.id;
      syncMenuGroupsForActiveContent();
    }
  }

  function activateContentTabByKey(tabKey) {
    const frame = document.querySelector(`.demo-shell > [data-module-instance="${tabKey}"]`);
    if (!frame) {
      return false;
    }
    const group = ensureStackGroup(frame);
    if (!group || group.category !== 'content') {
      return false;
    }
    setStackGroupActiveFrame(group, frame);
    return true;
  }

  function activateContentForMenuButton(buttonId) {
    if (!buttonId) {
      return false;
    }
    const match = [...contentTabWires.entries()].find(([, wiredButtonId]) => wiredButtonId === buttonId);
    if (!match) {
      return false;
    }
    return activateContentTabByKey(match[0]);
  }

  function syncMenuGroupsForActiveContent() {
    if (!activeContentGroupId) {
      return;
    }
    stackGroups.forEach(group => {
      if (group.category !== 'menu') {
        return;
      }

      const nextFrame = group.frames.find(frame => {
        const tabKey = frameTabKey(frame);
        return menuTabTargets.get(tabKey) === activeContentGroupId;
      });

      if (nextFrame && nextFrame !== group.activeFrame) {
        setStackGroupActiveFrame(group, nextFrame, { skipContentSync: true });
      } else {
        renderStackGroupHeader(group);
      }
    });
  }

  function bindContentTabDetach(button, group, frame) {
    button.addEventListener('pointerdown', event => {
      if (event.button !== 0 || group.frames.length <= 1) {
        return;
      }

      const startX = event.clientX;
      const startY = event.clientY;
      let detached = false;

      function onMove(moveEvent) {
        const dx = moveEvent.clientX - startX;
        const dy = moveEvent.clientY - startY;
        if (!detached && Math.hypot(dx, dy) < 12) {
          return;
        }

        if (!detached) {
          detached = true;
          button.dataset.tabDetached = 'true';
          detachFrameFromStackGroup(frame);
        }

        positionFrameNearPointer(frame, moveEvent.clientX, moveEvent.clientY);
        const nextGroup = stackGroupForFrame(frame);
        if (nextGroup) {
          syncStackGroupGeometry(nextGroup, frame);
          syncStackGroupVisibility(nextGroup);
          renderStackGroupHeader(nextGroup);
        }
      }

      function onUp() {
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onUp, true);
        window.removeEventListener('pointercancel', onUp, true);
      }

      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp, true);
      window.addEventListener('pointercancel', onUp, true);
    });
  }

  function renderContentStackHeader(group) {
    if (!group) {
      return;
    }

    if (!group.header) {
      group.header = document.createElement('div');
      group.header.className = 'mod-stack-header mod-stack-header-content';
      group.header.dataset.stackHeader = group.id;
    }

    group.header.innerHTML = '';
    const row = document.createElement('div');
    row.className = 'mod-stack-tabs';

    group.frames.forEach(frame => {
      const tabKey = frameTabKey(frame);
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'mod-stack-tab';
      if (frame === group.activeFrame) {
        button.classList.add('is-active');
      }
      button.textContent = frameTabName(frame, group);

      const wiredButtonId = contentTabWires.get(tabKey) || '';
      if (wiredButtonId) {
        button.classList.add('is-wired');
        button.title = `wired to ${wireLabelForButtonId(wiredButtonId)}`;
      }

      button.addEventListener('click', event => {
        if (button.dataset.tabDetached === 'true') {
          delete button.dataset.tabDetached;
          event.preventDefault();
          event.stopPropagation();
          return;
        }
        setStackGroupActiveFrame(group, frame);
      });
      button.addEventListener('contextmenu', event => {
        openContentWirePicker(event, frame);
      });
      bindContentTabDetach(button, group, frame);
      row.appendChild(button);
    });

    group.header.appendChild(row);
    attachStackHeaderToActiveFrame(group);
  }

  function renderMenuStackHeader(group) {
    if (!group) {
      return;
    }

    if (!group.header) {
      group.header = document.createElement('div');
      group.header.className = 'mod-stack-header mod-stack-header-menu';
      group.header.dataset.stackHeader = group.id;
      group.header.dataset.menuGroupSwitcher = group.id;
    }

    group.header.innerHTML = '';

    const switcher = document.createElement('div');
    switcher.className = 'mod-stack-select';

    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'mod-stack-select-toggle';
    toggle.textContent = menuGroupName(group);

    const list = document.createElement('div');
    list.className = 'mod-stack-select-menu';
    list.dataset.menuGroupList = group.id;
    list.hidden = true;

    group.frames.forEach(frame => {
      const entry = document.createElement('button');
      entry.type = 'button';
      entry.className = 'mod-stack-select-item';
      if (frame === group.activeFrame) {
        entry.classList.add('is-active');
      }

      const title = document.createElement('span');
      title.className = 'mod-stack-select-item-title';
      title.textContent = frameTabName(frame, group);
      entry.appendChild(title);

      const targetGroupId = menuTabTargets.get(frameTabKey(frame)) || '';
      if (targetGroupId) {
        const target = document.createElement('span');
        target.className = 'mod-stack-select-item-target';
        target.textContent = wireLabelForContentGroupId(targetGroupId);
        entry.appendChild(target);
      }

      entry.addEventListener('click', event => {
        event.preventDefault();
        event.stopPropagation();
        list.hidden = true;
        setStackGroupActiveFrame(group, frame, { skipContentSync: true });
      });

      entry.addEventListener('contextmenu', event => {
        event.stopPropagation();
        list.hidden = true;
        openMenuTargetPicker(event, frame);
      });

      list.appendChild(entry);
    });

    toggle.addEventListener('click', event => {
      event.preventDefault();
      event.stopPropagation();
      const isOpen = !list.hidden;
      closeAllMenuGroupLists(group.id);
      list.hidden = isOpen;
    });

    switcher.appendChild(toggle);
    switcher.appendChild(list);

    const editor = document.createElement('div');
    editor.className = 'mod-stack-menu-editor';

    const addButton = document.createElement('button');
    addButton.type = 'button';
    addButton.className = 'mod-stack-mini-btn';
    addButton.textContent = '+';
    addButton.title = 'Add menu button';
    addButton.addEventListener('click', event => {
      event.preventDefault();
      event.stopPropagation();
      addMenuButtonToFrame(group.activeFrame);
    });

    const removeButton = document.createElement('button');
    removeButton.type = 'button';
    removeButton.className = 'mod-stack-mini-btn';
    removeButton.textContent = '-';
    removeButton.title = 'Remove menu button';
    removeButton.addEventListener('click', event => {
      event.preventDefault();
      event.stopPropagation();
      removeMenuButtonFromFrame(group.activeFrame);
    });

    editor.appendChild(addButton);
    editor.appendChild(removeButton);

    group.header.appendChild(editor);
    group.header.appendChild(switcher);
    attachStackHeaderToActiveFrame(group);
  }

  function renderStackGroupHeader(group) {
    if (!group || group.frames.length === 0) {
      return;
    }
    if (group.category === 'content') {
      renderContentStackHeader(group);
      return;
    }
    renderMenuStackHeader(group);
  }

  function renderAllStackGroupHeaders() {
    stackGroups.forEach(group => {
      renderStackGroupHeader(group);
    });
  }

  function stackFrameOntoGroup(targetFrame, sourceFrame) {
    if (!targetFrame || !sourceFrame || targetFrame === sourceFrame) {
      return;
    }

    const category = frameStackCategory(targetFrame);
    if (!category || frameStackCategory(sourceFrame) !== category) {
      return;
    }

    const targetGroup = ensureStackGroup(targetFrame);
    const sourceGroup = ensureStackGroup(sourceFrame);
    if (!targetGroup || !sourceGroup || targetGroup === sourceGroup) {
      return;
    }

    mergeStackGroups(targetGroup, sourceGroup);
    setStackGroupActiveFrame(targetGroup, targetFrame, { skipContentSync: category !== 'content' });
    if (category === 'content') {
      activeContentGroupId = targetGroup.id;
    }
    syncMenuGroupsForActiveContent();
    renderAllStackGroupHeaders();
  }

  function maybeStackFrameByOverlap(frame) {
    const category = frameStackCategory(frame);
    if (!category || frame.dataset.stackHidden === 'true') {
      return;
    }

    let bestTarget = null;
    let bestScore = 0;
    const frameGroup = stackGroupForFrame(frame);

    moduleFrames().forEach(candidate => {
      if (candidate === frame) {
        return;
      }
      if (candidate.dataset.stackHidden === 'true') {
        return;
      }
      if (frameStackCategory(candidate) !== category) {
        return;
      }
      if (stackGroupForFrame(candidate) === frameGroup) {
        return;
      }

      const score = frameOverlapScore(frame, candidate);
      if (score > bestScore) {
        bestScore = score;
        bestTarget = candidate;
      }
    });

    if (bestTarget && bestScore >= 0.34) {
      stackFrameOntoGroup(bestTarget, frame);
    }
  }

  function normalizeStackGroups() {
    [...stackGroups.values()].forEach(group => {
      group.frames = group.frames.filter(frame => document.body.contains(frame));
      if (group.frames.length === 0) {
        removeStackGroup(group);
        return;
      }
      if (!group.activeFrame || !group.frames.includes(group.activeFrame)) {
        group.activeFrame = group.frames[0];
      }
    });
  }

  function initStackGroups(root = document, options = {}) {
    moduleFrames(root).forEach(frame => {
      if (!frameStackCategory(frame)) {
        return;
      }
      ensureStackGroup(frame);
    });

    normalizeStackGroups();
    registerMenuButtonIds(root);
    pruneContentWiresByExistingButtons();
    pruneMenuDependenciesByExistingGroups();

    stackGroups.forEach(group => {
      syncStackGroupGeometry(group, group.activeFrame);
      syncStackGroupVisibility(group);
      renderStackGroupHeader(group);
    });

    if (!activeContentGroupId) {
      const first = firstContentGroup();
      if (first) {
        activeContentGroupId = first.id;
      }
    }

    syncMenuGroupsForActiveContent();
    renderAllStackGroupHeaders();

    if (options.seedContent !== false) {
      seedInitialContentStack(root);
    }
  }

  function unregisterFrameFromStacking(frame) {
    if (!frame) {
      return;
    }

    const category = frameStackCategory(frame);
    const tabKey = frameTabKey(frame);
    contentTabWires.delete(tabKey);
    menuTabTargets.delete(tabKey);

    if (category === 'menu') {
      frame.querySelectorAll('.mod-button').forEach(button => {
        removeWiresForButtonId(button.dataset.menuButtonId || '');
      });
    }

    const group = stackGroupForFrame(frame);
    if (!group) {
      return;
    }

    const wasActive = group.activeFrame === frame;
    group.frames = group.frames.filter(member => member !== frame);
    frameToStackGroupId.delete(frame);
    delete frame.dataset.stackGroupId;
    delete frame.dataset.stackHidden;
    frame.classList.remove('mod-has-stack-header');
    frame.hidden = false;
    frame.style.display = '';

    if (group.frames.length === 0) {
      removeStackGroup(group);
      if (activeContentGroupId === group.id) {
        activeContentGroupId = '';
      }
    } else {
      if (wasActive) {
        group.activeFrame = group.frames[0];
        copyFrameGeometry(frame, group.activeFrame);
      }
      syncStackGroupGeometry(group, group.activeFrame);
      syncStackGroupVisibility(group);
      renderStackGroupHeader(group);
    }

    pruneContentWiresByExistingButtons();
    pruneMenuDependenciesByExistingGroups();
    if (!activeContentGroupId) {
      const first = firstContentGroup();
      if (first) {
        activeContentGroupId = first.id;
      }
    }
    syncMenuGroupsForActiveContent();
  }

  function bindStackUi() {
    if (document.body.dataset.stackUiBound === 'true') {
      return;
    }
    document.body.dataset.stackUiBound = 'true';

    window.addEventListener('hestia:grid-drag-end', event => {
      const frame = event.detail?.target;
      if (!(frame instanceof HTMLElement) || !frame.matches('.demo-shell > [data-module-kind]')) {
        return;
      }
      const group = stackGroupForFrame(frame);
      if (group) {
        syncStackGroupGeometry(group, frame);
        syncStackGroupVisibility(group);
        renderStackGroupHeader(group);
      }
      maybeStackFrameByOverlap(frame);
    });

    window.addEventListener('hestia:grid-resize-end', event => {
      const frame = event.detail?.target;
      if (!(frame instanceof HTMLElement) || !frame.matches('.demo-shell > [data-module-kind]')) {
        return;
      }
      const group = stackGroupForFrame(frame);
      if (!group) {
        return;
      }
      syncStackGroupGeometry(group, frame);
      syncStackGroupVisibility(group);
      renderStackGroupHeader(group);
    });

    document.addEventListener('click', event => {
      if (!event.target.closest('[data-stack-context-menu]')) {
        closeStackContextMenu();
      }
      if (!event.target.closest('[data-menu-group-switcher]')) {
        closeAllMenuGroupLists();
      }

      const menuButton = event.target.closest('.mod-button');
      if (!menuButton || event.target.closest('.mod-mode-toggle')) {
        return;
      }
      const menuFrame = menuButton.closest('[data-module-kind="navigation"]');
      if (!menuFrame || menuFrame.dataset.stackHidden === 'true') {
        return;
      }
      activateContentForMenuButton(ensureMenuButtonId(menuButton));
    });

    window.addEventListener('keydown', event => {
      if (event.key === 'Escape') {
        closeStackContextMenu();
        closeAllMenuGroupLists();
      }
    });
  }

  function captureStackState() {
    const savedGroups = [];
    const runtimeToSaved = new Map();

    [...stackGroups.values()].forEach((group, index) => {
      if (!group || group.frames.length === 0) {
        return;
      }

      const savedId = `group-${index + 1}`;
      runtimeToSaved.set(group.id, savedId);
      savedGroups.push({
        id: savedId,
        category: group.category,
        frameIds: group.frames.map(frame => frameInstanceId(frame)).filter(Boolean),
        activeFrameId: frameInstanceId(group.activeFrame || group.frames[0])
      });
    });

    return {
      groups: savedGroups,
      activeContentGroupId: runtimeToSaved.get(activeContentGroupId) || '',
      contentTabWires: [...contentTabWires.entries()].map(([tabKey, buttonId]) => ({
        tabKey,
        buttonId
      })),
      menuTabTargets: [...menuTabTargets.entries()]
        .map(([tabKey, groupId]) => ({
          tabKey,
          targetGroupId: runtimeToSaved.get(groupId) || ''
        }))
        .filter(entry => entry.targetGroupId)
    };
  }

  function resetStackState() {
    closeAllMenuGroupLists();
    closeStackContextMenu();
    stackGroups.forEach(group => {
      if (group.header) {
        group.header.remove();
      }
      group.frames.forEach(frame => {
        delete frame.dataset.stackGroupId;
        delete frame.dataset.stackHidden;
        frame.classList.remove('mod-has-stack-header');
        frame.hidden = false;
        frame.style.display = '';
      });
    });

    stackGroups = new Map();
    frameToStackGroupId = new WeakMap();
    contentTabWires = new Map();
    menuTabTargets = new Map();
    stackGroupCounter = 0;
    menuButtonCounter = 0;
    activeContentGroupId = '';
    contentStackSeeded = false;
  }

  function restoreStackState(snapshot = {}) {
    const groups = Array.isArray(snapshot.groups) ? snapshot.groups : [];
    const frameMap = new Map(
      moduleFrames().map(frame => [frameInstanceId(frame), frame])
    );
    const savedToRuntime = new Map();

    contentTabWires.clear();
    menuTabTargets.clear();

    groups.forEach(groupSnapshot => {
      const frames = Array.isArray(groupSnapshot.frameIds)
        ? groupSnapshot.frameIds.map(id => frameMap.get(`${id}`)).filter(Boolean)
        : [];
      if (frames.length === 0) {
        return;
      }

      const leadFrame = frames[0];
      frames.slice(1).forEach(frame => {
        stackFrameOntoGroup(leadFrame, frame);
      });

      const runtimeGroup = stackGroupForFrame(leadFrame);
      if (!runtimeGroup) {
        return;
      }

      savedToRuntime.set(groupSnapshot.id, runtimeGroup.id);
      const activeFrame = frames.find(frame => frameInstanceId(frame) === `${groupSnapshot.activeFrameId || ''}`) || leadFrame;
      setStackGroupActiveFrame(runtimeGroup, activeFrame, {
        skipContentSync: runtimeGroup.category !== 'content'
      });
    });

    if (Array.isArray(snapshot.contentTabWires)) {
      snapshot.contentTabWires.forEach(entry => {
        const tabKey = `${entry?.tabKey || ''}`;
        const buttonId = `${entry?.buttonId || ''}`;
        if (tabKey && buttonId && frameMap.has(tabKey)) {
          contentTabWires.set(tabKey, buttonId);
        }
      });
    }

    if (Array.isArray(snapshot.menuTabTargets)) {
      snapshot.menuTabTargets.forEach(entry => {
        const tabKey = `${entry?.tabKey || ''}`;
        const savedGroupId = `${entry?.targetGroupId || ''}`;
        const runtimeGroupId = savedToRuntime.get(savedGroupId) || '';
        if (tabKey && runtimeGroupId && frameMap.has(tabKey)) {
          menuTabTargets.set(tabKey, runtimeGroupId);
        }
      });
    }

    pruneContentWiresByExistingButtons();
    pruneMenuDependenciesByExistingGroups();

    const nextActive = savedToRuntime.get(`${snapshot.activeContentGroupId || ''}`) || '';
    activeContentGroupId = nextActive;
    if (!activeContentGroupId) {
      const first = firstContentGroup();
      if (first) {
        activeContentGroupId = first.id;
      }
    }

    syncMenuGroupsForActiveContent();
    renderAllStackGroupHeaders();
    contentStackSeeded = true;
  }

  Object.assign(workspace, {
    frameStackCategory,
    stackGroupForFrame,
    ensureMenuButtonId,
    closeStackContextMenu,
    closeAllMenuGroupLists,
    initStackGroups,
    bindStackUi,
    unregisterFrameFromStacking,
    stackContentFrameIntoPreferredGroup,
    renderAllStackGroupHeaders,
    captureStackState,
    restoreStackState,
    resetStackState
  });
})();
