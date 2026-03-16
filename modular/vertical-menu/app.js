(() => {
  const MODULE_DEFINITIONS = [
    { kind: 'search', label: 'Search' },
    { kind: 'navigation', label: 'Navigation' },
    { kind: 'data', label: 'Data' },
    { kind: 'text', label: 'Text' },
    { kind: 'graph', label: 'Graph' },
    { kind: 'organizer', label: 'Organizer' },
    { kind: 'settings', label: 'Settings' },
    { kind: 'chat-history', label: 'Chat History' },
    { kind: 'chat-compose', label: 'Chat Input' }
  ];
  const MODULE_BY_KIND = new Map(MODULE_DEFINITIONS.map(def => [def.kind, def]));
  const moduleTemplates = new Map();
  let moduleInstanceCounter = 0;
  let chatEntryCounter = 0;
  let activeOrganizerMenu = null;
  let organizerCardCounter = 0;
  let graphNodeCounter = 0;
  let graphConnectionCounter = 0;
  const CONTENT_STACK_KINDS = new Set([
    'data',
    'text',
    'graph',
    'settings',
    'organizer',
    'chat-history',
    'chat-compose'
  ]);
  const MENU_STACK_KINDS = new Set(['navigation']);
  let stackGroupCounter = 0;
  let menuButtonCounter = 0;
  const stackGroups = new Map();
  const frameToStackGroupId = new WeakMap();
  const contentTabWires = new Map();
  const menuTabTargets = new Map();
  let activeContentGroupId = '';
  let stackContextMenu = null;
  let contentStackSeeded = false;
  const GRAPH_NODE_TEMPLATES = [
    {
      kind: 'number',
      label: 'Number',
      subtitle: 'Numeric source',
      inputs: [],
      outputs: [{ key: 'value', label: 'Value', type: 'number' }]
    },
    {
      kind: 'boolean',
      label: 'Boolean',
      subtitle: 'True / false source',
      inputs: [],
      outputs: [{ key: 'value', label: 'Value', type: 'boolean' }]
    },
    {
      kind: 'text-value',
      label: 'Text',
      subtitle: 'String source',
      inputs: [],
      outputs: [{ key: 'value', label: 'Value', type: 'string' }]
    },
    {
      kind: 'add',
      label: 'Add',
      subtitle: 'Number + number',
      inputs: [
        { key: 'a', label: 'A', type: 'number' },
        { key: 'b', label: 'B', type: 'number' }
      ],
      outputs: [{ key: 'sum', label: 'Result', type: 'number' }]
    },
    {
      kind: 'subtract',
      label: 'Subtract',
      subtitle: 'Number - number',
      inputs: [
        { key: 'a', label: 'A', type: 'number' },
        { key: 'b', label: 'B', type: 'number' }
      ],
      outputs: [{ key: 'result', label: 'Result', type: 'number' }]
    },
    {
      kind: 'if',
      label: 'If',
      subtitle: 'Boolean branch',
      inputs: [
        { key: 'condition', label: 'Condition', type: 'boolean' },
        { key: 'yes', label: 'Then', type: 'number' },
        { key: 'no', label: 'Else', type: 'number' }
      ],
      outputs: [{ key: 'result', label: 'Result', type: 'number' }]
    },
    {
      kind: 'trigger',
      label: 'Trigger',
      subtitle: 'Flow source',
      inputs: [],
      outputs: [{ key: 'flow', label: 'Flow', type: 'flow' }]
    },
    {
      kind: 'log',
      label: 'Log',
      subtitle: 'Flow + text sink',
      inputs: [
        { key: 'flow', label: 'Flow', type: 'flow' },
        { key: 'message', label: 'Message', type: 'string' }
      ],
      outputs: []
    }
  ];
  const GRAPH_TEMPLATE_BY_KIND = new Map(GRAPH_NODE_TEMPLATES.map(template => [template.kind, template]));

  function moduleFrames(root = document) {
    return [...root.querySelectorAll('.demo-shell > [data-module-kind]')];
  }

  function demoShell(root = document) {
    return root.querySelector('.demo-shell');
  }

  function moduleLabel(kind) {
    return MODULE_BY_KIND.get(kind)?.label || kind;
  }

  function parseJsonObject(raw) {
    if (typeof raw !== 'string' || raw.trim().length === 0) {
      return {};
    }

    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return parsed;
      }
    } catch (err) {
      /* fall back to an empty object for malformed demo payloads */
    }

    return {};
  }

  function collectModuleTemplates(root = document) {
    moduleFrames(root).forEach(frame => {
      const kind = frame.dataset.moduleKind;
      if (!kind || moduleTemplates.has(kind)) {
        return;
      }
      moduleTemplates.set(kind, frame.cloneNode(true));
    });
  }

  function registerExistingModuleInstances(root = document) {
    moduleFrames(root).forEach(frame => {
      const existing = Number(frame.dataset.moduleInstance || '0');
      if (existing > 0) {
        moduleInstanceCounter = Math.max(moduleInstanceCounter, existing);
        return;
      }
      moduleInstanceCounter += 1;
      frame.dataset.moduleInstance = String(moduleInstanceCounter);
    });
  }

  function nextModuleInstance() {
    moduleInstanceCounter += 1;
    return moduleInstanceCounter;
  }

  function getChatHistory(root = document) {
    return root.querySelector('[data-chat-history]') || root.querySelector('.mod-chat-history');
  }

  function nextChatEntryId() {
    chatEntryCounter += 1;
    return `chat-entry-${chatEntryCounter}`;
  }

  function ensureChatEntryId(entry) {
    const existing = entry.dataset.chatEntryId || '';
    if (existing) {
      const match = existing.match(/(\d+)$/);
      if (match) {
        chatEntryCounter = Math.max(chatEntryCounter, Number(match[1]) || 0);
      }
      return existing;
    }

    const nextId = nextChatEntryId();
    entry.dataset.chatEntryId = nextId;
    return nextId;
  }

  function excerpt(text, maxLength = 96) {
    const normalized = (text || '').replace(/\s+/g, ' ').trim();
    if (normalized.length <= maxLength) {
      return normalized;
    }
    return normalized.slice(0, Math.max(0, maxLength - 3)).trimEnd() + '...';
  }

  function historyEntryText(entry) {
    const bubble = entry.querySelector('.mod-chat-bubble');
    const bubbleText = bubble ? bubble.querySelector('.mod-chat-bubble-text') : null;
    const source = bubbleText ? bubbleText.textContent : bubble ? bubble.textContent : '';
    return (source || '').replace(/\s+/g, ' ').trim();
  }

  function ensureBubbleText(entry) {
    const bubble = entry.querySelector('.mod-chat-bubble');
    if (!bubble) {
      return null;
    }

    let textBlock = bubble.querySelector('.mod-chat-bubble-text');
    if (textBlock) {
      return textBlock;
    }

    let text = '';
    [...bubble.childNodes].forEach(node => {
      if (node.nodeType === Node.ELEMENT_NODE && node.classList?.contains('mod-chat-quote-link')) {
        return;
      }

      text += node.textContent || '';
      bubble.removeChild(node);
    });

    textBlock = document.createElement('div');
    textBlock.className = 'mod-chat-bubble-text';
    textBlock.textContent = text.trim();
    bubble.appendChild(textBlock);
    return textBlock;
  }

  function ensureQuoteAction(entry) {
    const head = entry.querySelector('.mod-chat-entry-head');
    if (!head) {
      return null;
    }

    let button = head.querySelector('[data-chat-quote-trigger]');
    if (!button) {
      button = document.createElement('button');
      button.type = 'button';
      button.className = 'mod-chat-quote-action';
      button.textContent = 'Quote';
      button.title = 'Quote message';
      head.appendChild(button);
    }

    button.dataset.chatQuoteTrigger = ensureChatEntryId(entry);
    return button;
  }

  function ensureHistoryEntry(entry) {
    ensureChatEntryId(entry);
    ensureBubbleText(entry);
    ensureQuoteAction(entry);
  }

  function closeHistoryMenus(root = document) {
    root.querySelectorAll('[data-chat-options-menu].is-open').forEach(menu => {
      menu.classList.remove('is-open');
    });
    root.querySelectorAll('[data-chat-options-toggle].is-open').forEach(button => {
      button.classList.remove('is-open');
    });
  }

  function closeTagMenus(root = document) {
    root.querySelectorAll('[data-chat-toolbar-shell].is-tag-open').forEach(shell => {
      shell.classList.remove('is-tag-open');
    });
  }

  function closeModuleAddMenu(manager = document.querySelector('[data-module-manager]')) {
    if (!manager) {
      return;
    }

    const addToggle = manager.querySelector('[data-module-add-toggle]');
    const addMenu = manager.querySelector('[data-module-add-menu]');
    if (!addToggle || !addMenu) {
      return;
    }

    addToggle.classList.remove('is-open');
    addMenu.classList.remove('is-open');
    addMenu.hidden = true;
  }

  function frameInstanceId(frame) {
    return frame?.dataset?.moduleInstance || '';
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
    const label = moduleLabel(kind);
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

  function initStackGroups(root = document) {
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
    seedInitialContentStack(root);
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

  function organizerBoards(root = document) {
    return [...root.querySelectorAll('[data-organizer-board]')];
  }

  function organizerLists(board) {
    return [...board.querySelectorAll('[data-organizer-list]')];
  }

  function organizerCards(scope) {
    return [...scope.querySelectorAll('[data-organizer-item]')];
  }

  function humanizeOrganizerKey(key) {
    const spaced = (key || '')
      .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
      .replace(/[_-]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    if (spaced.length === 0) {
      return 'Option';
    }
    return spaced.charAt(0).toUpperCase() + spaced.slice(1);
  }

  function organizerPrimitiveEntries(card) {
    const metadata = parseJsonObject(card.dataset.metadata);
    return Object.entries(metadata).filter(([, value]) =>
      value === null || ['string', 'number', 'boolean'].includes(typeof value)
    );
  }

  function normalizeOrganizerOption(key, value) {
    const label = typeof value?.label === 'string' && value.label.trim().length > 0
      ? value.label.trim()
      : humanizeOrganizerKey(key);
    if (value?.type === 'checkbox') {
      return {
        type: 'checkbox',
        label,
        checked: value.checked === true
      };
    }

    const choices = Array.isArray(value?.choices) ? value.choices.map(choice => String(choice)) : [];
    const fallbackValue = choices[0] || '';
    const rawValue = value?.value === undefined || value?.value === null ? fallbackValue : String(value.value);
    return {
      type: 'select',
      label,
      choices,
      value: choices.length > 0 && !choices.includes(rawValue) ? fallbackValue : rawValue
    };
  }

  function organizerOptionState(card) {
    const parsed = parseJsonObject(card.dataset.organizerOptions);
    const normalized = {};
    Object.entries(parsed).forEach(([key, value]) => {
      normalized[key] = normalizeOrganizerOption(key, value);
    });
    return normalized;
  }

  function writeOrganizerOptionState(card, state) {
    card.dataset.organizerOptions = JSON.stringify(state);
  }

  function organizerPill(text, active = true) {
    const pill = document.createElement('span');
    pill.className = 'mod-meta-pill mod-organizer-pill';
    if (!active) {
      pill.classList.add('is-inactive');
    }
    pill.textContent = text;
    return pill;
  }

  function organizerFieldText(key, value, includeLabel = false) {
    if (!includeLabel) {
      return String(value);
    }
    return `${humanizeOrganizerKey(key)} ${value}`;
  }

  function organizerOptionText(option) {
    if (option.type === 'checkbox') {
      return `${option.label} ${option.checked ? 'on' : 'off'}`;
    }
    return `${option.label} ${option.value || 'unassigned'}`;
  }

  function ensureOrganizerCardId(card) {
    if (!card.dataset.organizerCardId) {
      organizerCardCounter += 1;
      card.dataset.organizerCardId = `organizer-card-${organizerCardCounter}`;
    }
    return card.dataset.organizerCardId;
  }

  function ensureOrganizerChrome(board) {
    const clip = board.closest('.mod-content-clip');
    const frame = board.closest('.mod-content-frame');
    if (!clip || !frame) {
      return {
        frame: null,
        shell: null,
        switcher: null,
        panel: null
      };
    }

    let shell = clip.querySelector('[data-organizer-shell]');
    if (!shell) {
      shell = document.createElement('div');
      shell.className = 'mod-organizer-shell';
      shell.dataset.organizerShell = '';
      board.replaceWith(shell);
      shell.appendChild(board);
    } else if (!shell.contains(board)) {
      shell.prepend(board);
    }

    let panel = shell.querySelector('[data-organizer-detail-panel]');
    if (!panel) {
      panel = document.createElement('section');
      panel.className = 'mod-organizer-detail-panel';
      panel.dataset.organizerDetailPanel = '';
      panel.innerHTML = `
        <div class="mod-organizer-detail-empty" data-organizer-detail-empty>Select an item to inspect its tags and assignments.</div>
        <div class="mod-organizer-detail-card" data-organizer-detail-card hidden>
          <div class="mod-organizer-detail-sections">
            <section class="mod-organizer-detail-section">
              <h4>Data</h4>
              <div class="mod-organizer-detail-row" data-organizer-detail-fields></div>
            </section>
            <section class="mod-organizer-detail-section">
              <h4>Tags</h4>
              <div class="mod-organizer-detail-row" data-organizer-detail-summary></div>
            </section>
          </div>
        </div>
      `;
      shell.appendChild(panel);
    }

    panel.querySelector('.mod-organizer-detail-head')?.remove();

    let switcher = frame.querySelector('[data-organizer-view-switcher]');
    if (!switcher) {
      switcher = document.createElement('div');
      switcher.className = 'mod-view-switcher mod-view-switcher-simple';
      switcher.dataset.organizerViewSwitcher = '';
      switcher.style.position = 'relative';
      switcher.innerHTML = `
        <button class="mod-view-btn" type="button" data-view="details"><span class="mod-view-icon">:</span>Details</button>
        <button class="mod-view-btn" type="button" data-view="cards"><span class="mod-view-icon">#</span>Cards</button>
        <button class="mod-view-btn" type="button" data-view="list"><span class="mod-view-icon">≡</span>List</button>
      `;
      frame.appendChild(switcher);
    }

    if (switcher.dataset.bound !== 'true') {
      switcher.dataset.bound = 'true';
      switcher.querySelectorAll('.mod-view-btn').forEach(button => {
        button.addEventListener('click', () => {
          board.dataset.view = button.dataset.view || 'cards';
          syncOrganizerBoard(board);
        });
      });
    }

    return {
      frame,
      shell,
      switcher,
      panel,
      emptyState: panel.querySelector('[data-organizer-detail-empty]'),
      detailCard: panel.querySelector('[data-organizer-detail-card]'),
      detailFields: panel.querySelector('[data-organizer-detail-fields]'),
      detailSummary: panel.querySelector('[data-organizer-detail-summary]')
    };
  }

  function organizerSelectedCard(board) {
    const cards = organizerCards(board);
    if (cards.length === 0) {
      delete board.dataset.organizerSelectedCardId;
      return null;
    }

    const selectedId = board.dataset.organizerSelectedCardId || '';
    const selected = cards.find(card => ensureOrganizerCardId(card) === selectedId);
    if (selected) {
      return selected;
    }

    const fallback = cards[0];
    board.dataset.organizerSelectedCardId = ensureOrganizerCardId(fallback);
    return fallback;
  }

  function renderOrganizerDetailPanel(board) {
    const chrome = ensureOrganizerChrome(board);
    if (!chrome.panel || board.dataset.view !== 'details') {
      return;
    }

    const selected = organizerSelectedCard(board);
    if (!selected) {
      chrome.emptyState.hidden = false;
      chrome.detailCard.hidden = true;
      return;
    }

    chrome.emptyState.hidden = true;
    chrome.detailCard.hidden = false;
    chrome.detailFields.innerHTML = '';
    chrome.detailSummary.innerHTML = '';

    organizerPrimitiveEntries(selected).forEach(([key, value]) => {
      chrome.detailFields.appendChild(organizerPill(organizerFieldText(key, value, true)));
    });

    Object.values(organizerOptionState(selected)).forEach(option => {
      chrome.detailSummary.appendChild(
        organizerPill(
          organizerOptionText(option),
          option.type !== 'checkbox' || option.checked
        )
      );
    });

    if (chrome.detailFields.childElementCount === 0) {
      chrome.detailFields.appendChild(organizerPill('No data', false));
    }
    if (chrome.detailSummary.childElementCount === 0) {
      chrome.detailSummary.appendChild(organizerPill('No tags', false));
    }
  }

  function syncOrganizerBoard(board) {
    const chrome = ensureOrganizerChrome(board);
    const requestedView = board.dataset.view || 'cards';
    const view = requestedView === 'details' || requestedView === 'list'
      ? requestedView
      : 'cards';
    const selected = organizerSelectedCard(board);

    board.dataset.view = view;
    if (chrome.shell) {
      chrome.shell.dataset.view = view;
    }
    if (chrome.switcher) {
      chrome.switcher.querySelectorAll('.mod-view-btn').forEach(button => {
        button.classList.toggle('is-active', button.dataset.view === view);
      });
    }
    if (chrome.panel) {
      chrome.panel.hidden = view !== 'details';
    }

    organizerCards(board).forEach(card => {
      ensureOrganizerCardId(card);
      const isSelected = view === 'details' && card === selected;
      card.classList.toggle('is-selected', isSelected);
      card.tabIndex = view === 'details' ? 0 : -1;
      if (view === 'details') {
        card.setAttribute('role', 'button');
        card.setAttribute('aria-pressed', isSelected ? 'true' : 'false');
      } else {
        card.removeAttribute('role');
        card.removeAttribute('aria-pressed');
      }
    });

    renderOrganizerDetailPanel(board);
  }

  function setOrganizerSelectedCard(board, card) {
    if (!board || !card) {
      return;
    }
    board.dataset.organizerSelectedCardId = ensureOrganizerCardId(card);
    syncOrganizerBoard(board);
  }

  function ensureOrganizerHeadActions(card) {
    const head = card.querySelector('.mod-organizer-card-head');
    if (!head) {
      return {
        fieldsToggle: null,
        summaryToggle: null,
        optionsToggle: null
      };
    }

    let actions = head.querySelector('.mod-organizer-head-actions');
    if (!actions) {
      actions = document.createElement('div');
      actions.className = 'mod-organizer-head-actions';
      head.appendChild(actions);
    }

    actions.querySelector('[data-organizer-fields-toggle]')?.remove();
    actions.querySelector('[data-organizer-summary-toggle]')?.remove();

    let optionsToggle = actions.querySelector('[data-organizer-options-toggle]');
    if (!optionsToggle) {
      optionsToggle = head.querySelector('[data-organizer-options-toggle]');
      if (optionsToggle) {
        actions.appendChild(optionsToggle);
      }
    }

    if (optionsToggle) {
      optionsToggle.draggable = false;
    }

    return {
      fieldsToggle: null,
      summaryToggle: null,
      optionsToggle
    };
  }

  function ensureOrganizerFieldRow(card) {
    let row = card.querySelector('[data-organizer-fields]');
    if (row) {
      return row;
    }

    row = document.createElement('div');
    row.className = 'mod-organizer-field-row';
    row.dataset.organizerFields = '';
    const summary = card.querySelector('[data-organizer-summary]');
    if (summary) {
      summary.before(row);
      return row;
    }

    card.querySelector('.mod-data-main')?.appendChild(row);
    return row;
  }

  function ensureOrganizerSummaryRow(card) {
    let row = card.querySelector('[data-organizer-summary]');
    if (row) {
      return row;
    }

    row = document.createElement('div');
    row.className = 'mod-organizer-option-row';
    row.dataset.organizerSummary = '';
    const menu = card.querySelector('[data-organizer-menu]');
    if (menu) {
      menu.before(row);
      return row;
    }

    card.querySelector('.mod-data-main')?.appendChild(row);
    return row;
  }

  function organizerMenuForCard(card) {
    let menu = card?._organizerMenu || card?.querySelector('[data-organizer-menu]') || null;
    if (!menu) {
      return null;
    }

    card._organizerMenu = menu;
    menu._organizerOwnerCard = card;
    if (menu.parentElement !== document.body) {
      document.body.appendChild(menu);
    }
    return menu;
  }

  function positionOrganizerMenu(menu, pageX, pageY) {
    if (!menu) {
      return;
    }

    const scrollX = window.scrollX || window.pageXOffset || 0;
    const scrollY = window.scrollY || window.pageYOffset || 0;
    const clientX = pageX - scrollX;
    const clientY = pageY - scrollY;
    const gap = 12;
    const margin = 8;

    menu.style.left = `${Math.round(pageX + gap)}px`;
    menu.style.top = `${Math.round(pageY)}px`;

    const rect = menu.getBoundingClientRect();
    let left = clientX + gap;
    if (left + rect.width > window.innerWidth - margin) {
      left = clientX - rect.width - gap;
    }
    left = Math.max(margin, Math.min(left, window.innerWidth - rect.width - margin));

    let top = clientY;
    if (top + rect.height > window.innerHeight - margin) {
      top = window.innerHeight - rect.height - margin;
    }
    top = Math.max(margin, top);

    menu.style.left = `${Math.round(left + scrollX)}px`;
    menu.style.top = `${Math.round(top + scrollY)}px`;
  }

  function organizerMenuAnchor(card, anchorEvent) {
    if (anchorEvent && typeof anchorEvent.pageX === 'number' && typeof anchorEvent.pageY === 'number') {
      return { pageX: anchorEvent.pageX, pageY: anchorEvent.pageY };
    }

    const toggle = ensureOrganizerHeadActions(card).optionsToggle;
    const rect = toggle?.getBoundingClientRect();
    const scrollX = window.scrollX || window.pageXOffset || 0;
    const scrollY = window.scrollY || window.pageYOffset || 0;
    return {
      pageX: (rect ? rect.right : 0) + scrollX,
      pageY: (rect ? rect.top + rect.height / 2 : 0) + scrollY
    };
  }

  function setOrganizerMenuState(card, open, anchorEvent = null) {
    const menu = organizerMenuForCard(card);
    const { optionsToggle: toggle } = ensureOrganizerHeadActions(card);
    if (!menu || !toggle) {
      return;
    }

    card.classList.toggle('is-menu-open', open);
    toggle.classList.toggle('is-open', open);
    menu.classList.toggle('is-open', open);
    menu.hidden = !open;
    if (open) {
      const anchor = organizerMenuAnchor(card, anchorEvent);
      positionOrganizerMenu(menu, anchor.pageX, anchor.pageY);
      activeOrganizerMenu = menu;
      return;
    }
    if (activeOrganizerMenu === menu) {
      activeOrganizerMenu = null;
    }
  }

  function setOrganizerFieldState(card, expanded) {
    const row = ensureOrganizerFieldRow(card);
    const hasItems = row.childElementCount > 0;
    const isExpanded = expanded && hasItems;

    card.dataset.organizerFieldsExpanded = isExpanded ? 'true' : 'false';
    row.hidden = !hasItems;
    row.classList.toggle('is-expanded', isExpanded);
    row.classList.toggle('is-collapsed', !isExpanded && hasItems);
    row.tabIndex = hasItems ? 0 : -1;
    row.setAttribute('role', hasItems ? 'button' : 'presentation');
    row.setAttribute('aria-expanded', isExpanded ? 'true' : 'false');
  }

  function setOrganizerSummaryState(card, open) {
    const row = ensureOrganizerSummaryRow(card);
    const hasItems = row.childElementCount > 0;
    const isOpen = open && hasItems;

    card.dataset.organizerSummaryExpanded = isOpen ? 'true' : 'false';
    row.hidden = !hasItems;
    row.classList.toggle('is-open', isOpen);
    row.classList.toggle('is-expanded', isOpen);
    row.classList.toggle('is-collapsed', !isOpen && hasItems);
    row.tabIndex = hasItems ? 0 : -1;
    row.setAttribute('role', hasItems ? 'button' : 'presentation');
    row.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
  }

  function closeOrganizerMenus(root = document) {
    const cards = root === document
      ? organizerCards(document)
      : organizerCards(root);
    cards.forEach(card => {
      setOrganizerMenuState(card, false);
    });
  }

  function renderOrganizerFields(card) {
    const row = ensureOrganizerFieldRow(card);
    row.innerHTML = '';

    organizerPrimitiveEntries(card).forEach(([key, value]) => {
      row.appendChild(organizerPill(organizerFieldText(key, value)));
    });

    setOrganizerFieldState(card, card.dataset.organizerFieldsExpanded === 'true');
  }

  function renderOrganizerSummary(card, state) {
    const row = ensureOrganizerSummaryRow(card);
    row.innerHTML = '';

    Object.values(state).forEach(option => {
      row.appendChild(
        organizerPill(
          organizerOptionText(option),
          option.type !== 'checkbox' || option.checked
        )
      );
    });

    setOrganizerSummaryState(card, card.dataset.organizerSummaryExpanded === 'true');
  }

  function renderOrganizerMenu(card, state) {
    const menu = organizerMenuForCard(card);
    if (!menu) {
      return;
    }

    const isOpen = card.classList.contains('is-menu-open');
    menu.innerHTML = '';

    Object.entries(state).forEach(([key, option]) => {
      if (option.type === 'checkbox') {
        const row = document.createElement('label');
        row.className = 'mod-organizer-menu-row mod-organizer-menu-check';

        const input = document.createElement('input');
        input.type = 'checkbox';
        input.checked = option.checked;

        const label = document.createElement('span');
        label.className = 'mod-organizer-menu-label';
        label.textContent = option.label;

        input.addEventListener('change', () => {
          const next = organizerOptionState(card);
          if (!next[key]) {
            return;
          }
          next[key].checked = input.checked;
          writeOrganizerOptionState(card, next);
          syncOrganizerCard(card);
        });

        row.appendChild(input);
        row.appendChild(label);
        menu.appendChild(row);
        return;
      }

      const row = document.createElement('div');
      row.className = 'mod-organizer-menu-row';

      const label = document.createElement('span');
      label.className = 'mod-organizer-menu-label';
      label.textContent = option.label;

      const select = document.createElement('select');
      option.choices.forEach(choice => {
        const entry = document.createElement('option');
        entry.value = choice;
        entry.textContent = choice;
        select.appendChild(entry);
      });
      select.value = option.value;
      select.addEventListener('change', () => {
        const next = organizerOptionState(card);
        if (!next[key]) {
          return;
        }
        next[key].value = select.value;
        writeOrganizerOptionState(card, next);
        syncOrganizerCard(card);
      });

      row.appendChild(label);
      row.appendChild(select);
      menu.appendChild(row);
    });

    setOrganizerMenuState(card, isOpen);
  }

  function syncOrganizerCard(card) {
    ensureOrganizerHeadActions(card);
    const state = organizerOptionState(card);
    renderOrganizerFields(card);
    renderOrganizerSummary(card, state);
    renderOrganizerMenu(card, state);
    const board = card.closest('[data-organizer-board]');
    if (board) {
      renderOrganizerDetailPanel(board);
    }
  }

  function organizerDropTarget(list, clientY, dragged) {
    const cards = organizerCards(list).filter(card => card !== dragged);
    let nextCard = null;
    let nearestOffset = Number.NEGATIVE_INFINITY;

    cards.forEach(card => {
      const rect = card.getBoundingClientRect();
      const offset = clientY - rect.top - rect.height / 2;
      if (offset < 0 && offset > nearestOffset) {
        nearestOffset = offset;
        nextCard = card;
      }
    });

    return nextCard;
  }

  function updateOrganizerLaneCounts(board) {
    board.querySelectorAll('[data-organizer-lane]').forEach(lane => {
      const count = lane.querySelector('[data-organizer-count]');
      const list = lane.querySelector('[data-organizer-list]');
      if (!count || !list) {
        return;
      }
      count.textContent = String(organizerCards(list).length);
    });
  }

  function clearOrganizerDropTargets(board) {
    organizerLists(board).forEach(list => {
      list.classList.remove('is-drop-target');
    });
  }

  function bindOrganizerCard(card, board) {
    syncOrganizerCard(card);

    if (card.dataset.organizerBound === 'true') {
      return;
    }

    card.dataset.organizerBound = 'true';
    card.draggable = true;
    ensureOrganizerCardId(card);

    const { optionsToggle: toggle } = ensureOrganizerHeadActions(card);
    const fieldsRow = ensureOrganizerFieldRow(card);
    const summaryRow = ensureOrganizerSummaryRow(card);
    const menu = organizerMenuForCard(card);

    fieldsRow.addEventListener('click', event => {
      event.preventDefault();
      event.stopPropagation();
      const shouldExpand = card.dataset.organizerFieldsExpanded !== 'true';
      setOrganizerFieldState(card, shouldExpand);
    });

    fieldsRow.addEventListener('keydown', event => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        event.stopPropagation();
        const shouldExpand = card.dataset.organizerFieldsExpanded !== 'true';
        setOrganizerFieldState(card, shouldExpand);
      }
    });

    summaryRow.addEventListener('click', event => {
      event.preventDefault();
      event.stopPropagation();
      const shouldOpen = card.dataset.organizerSummaryExpanded !== 'true';
      setOrganizerSummaryState(card, shouldOpen);
    });

    summaryRow.addEventListener('keydown', event => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        event.stopPropagation();
        const shouldOpen = card.dataset.organizerSummaryExpanded !== 'true';
        setOrganizerSummaryState(card, shouldOpen);
      }
    });

    if (toggle) {
      toggle.addEventListener('click', event => {
        event.preventDefault();
        event.stopPropagation();
        if (board.dataset.view === 'details') {
          setOrganizerSelectedCard(board, card);
        }
        const shouldOpen = !card.classList.contains('is-menu-open');
        closeOrganizerMenus();
        setOrganizerMenuState(card, shouldOpen, event);
      });
    }

    if (menu) {
      menu.addEventListener('click', event => {
        event.stopPropagation();
      });
    }

    card.addEventListener('click', event => {
      if (board.dataset.view !== 'details') {
        return;
      }
      if (event.target.closest('[data-organizer-options-toggle]') ||
          event.target.closest('[data-organizer-menu]')) {
        return;
      }
      setOrganizerSelectedCard(board, card);
    });

    card.addEventListener('keydown', event => {
      if (board.dataset.view !== 'details') {
        return;
      }
      if (event.key !== 'Enter' && event.key !== ' ') {
        return;
      }
      if (event.target.closest('[data-organizer-options-toggle]') ||
          event.target.closest('[data-organizer-menu]')) {
        return;
      }
      event.preventDefault();
      setOrganizerSelectedCard(board, card);
    });

    card.addEventListener('dragstart', event => {
      if (board.dataset.view === 'details') {
        setOrganizerSelectedCard(board, card);
      }
      board._organizerDragCard = card;
      card.classList.add('is-dragging');
      closeOrganizerMenus();
      if (event.dataTransfer) {
        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.setData('text/plain', card.querySelector('h3')?.textContent || 'organizer-card');
      }
    });

    card.addEventListener('dragend', () => {
      card.classList.remove('is-dragging');
      board._organizerDragCard = null;
      clearOrganizerDropTargets(board);
      updateOrganizerLaneCounts(board);
      syncOrganizerBoard(board);
    });
  }

  function bindOrganizerList(list, board) {
    if (list.dataset.organizerListBound === 'true') {
      return;
    }

    list.dataset.organizerListBound = 'true';

    list.addEventListener('dragover', event => {
      const dragged = board._organizerDragCard;
      if (!dragged) {
        return;
      }

      event.preventDefault();
      clearOrganizerDropTargets(board);
      list.classList.add('is-drop-target');

      const target = organizerDropTarget(list, event.clientY, dragged);
      if (target) {
        list.insertBefore(dragged, target);
      } else {
        list.appendChild(dragged);
      }
      updateOrganizerLaneCounts(board);
    });

    list.addEventListener('drop', event => {
      if (!board._organizerDragCard) {
        return;
      }
      event.preventDefault();
      clearOrganizerDropTargets(board);
      updateOrganizerLaneCounts(board);
    });
  }

  function initOrganizerBoards(root = document) {
    organizerBoards(root).forEach(board => {
      ensureOrganizerChrome(board);
      organizerLists(board).forEach(list => {
        bindOrganizerList(list, board);
      });
      organizerCards(board).forEach(card => {
        bindOrganizerCard(card, board);
      });
      updateOrganizerLaneCounts(board);
      syncOrganizerBoard(board);
    });

    if (document.body.dataset.organizerUiBound === 'true') {
      return;
    }

    document.body.dataset.organizerUiBound = 'true';
    document.addEventListener('click', event => {
      if (!event.target.closest('[data-organizer-menu]') &&
          !event.target.closest('[data-organizer-options-toggle]')) {
        closeOrganizerMenus();
      }
    });
    window.addEventListener('keydown', event => {
      if (event.key === 'Escape') {
        closeOrganizerMenus();
      }
    });
  }

  function graphModules(root = document) {
    return [...root.querySelectorAll('[data-graph-module]')];
  }

  function nextGraphNodeId() {
    graphNodeCounter += 1;
    return `graph-node-${graphNodeCounter}`;
  }

  function nextGraphConnectionId() {
    graphConnectionCounter += 1;
    return `graph-connection-${graphConnectionCounter}`;
  }

  function graphTemplate(kind) {
    return GRAPH_TEMPLATE_BY_KIND.get(kind) || GRAPH_NODE_TEMPLATES[0];
  }

  function createGraphNode(kind, x, y) {
    const template = graphTemplate(kind);
    return {
      id: nextGraphNodeId(),
      kind: template.kind,
      x,
      y
    };
  }

  function createDefaultGraphState() {
    const numberA = createGraphNode('number', 56, 72);
    const numberB = createGraphNode('number', 56, 216);
    const add = createGraphNode('add', 332, 108);
    const subtract = createGraphNode('subtract', 332, 288);
    const condition = createGraphNode('boolean', 632, 52);
    const branch = createGraphNode('if', 632, 196);
    const trigger = createGraphNode('trigger', 52, 432);
    const text = createGraphNode('text-value', 324, 444);
    const log = createGraphNode('log', 632, 424);

    return {
      nodes: [numberA, numberB, add, subtract, condition, branch, trigger, text, log],
      connections: [
        {
          id: nextGraphConnectionId(),
          fromNodeId: numberA.id,
          fromSocket: 'value',
          toNodeId: add.id,
          toSocket: 'a',
          type: 'number'
        },
        {
          id: nextGraphConnectionId(),
          fromNodeId: numberB.id,
          fromSocket: 'value',
          toNodeId: add.id,
          toSocket: 'b',
          type: 'number'
        },
        {
          id: nextGraphConnectionId(),
          fromNodeId: numberA.id,
          fromSocket: 'value',
          toNodeId: subtract.id,
          toSocket: 'a',
          type: 'number'
        },
        {
          id: nextGraphConnectionId(),
          fromNodeId: add.id,
          fromSocket: 'sum',
          toNodeId: branch.id,
          toSocket: 'yes',
          type: 'number'
        },
        {
          id: nextGraphConnectionId(),
          fromNodeId: subtract.id,
          fromSocket: 'result',
          toNodeId: branch.id,
          toSocket: 'no',
          type: 'number'
        },
        {
          id: nextGraphConnectionId(),
          fromNodeId: condition.id,
          fromSocket: 'value',
          toNodeId: branch.id,
          toSocket: 'condition',
          type: 'boolean'
        },
        {
          id: nextGraphConnectionId(),
          fromNodeId: trigger.id,
          fromSocket: 'flow',
          toNodeId: log.id,
          toSocket: 'flow',
          type: 'flow'
        },
        {
          id: nextGraphConnectionId(),
          fromNodeId: text.id,
          fromSocket: 'value',
          toNodeId: log.id,
          toSocket: 'message',
          type: 'string'
        }
      ],
      pendingSocket: null,
      pendingPoint: null,
      nodeElements: new Map(),
      socketElements: new Map(),
      spawnCount: 0
    };
  }

  function ensureGraphState(module) {
    if (!module._graphState) {
      module._graphState = createDefaultGraphState();
    }
    return module._graphState;
  }

  function graphSocketKey(nodeId, direction, socketKey) {
    return `${nodeId}:${direction}:${socketKey}`;
  }

  function socketTypeMatches(a, b) {
    return a && b && a === b;
  }

  function graphConnectionExists(state, fromNodeId, fromSocket, toNodeId, toSocket) {
    return state.connections.some(connection =>
      connection.fromNodeId === fromNodeId &&
      connection.fromSocket === fromSocket &&
      connection.toNodeId === toNodeId &&
      connection.toSocket === toSocket
    );
  }

  function graphCanvasParts(module) {
    return {
      canvas: module.querySelector('[data-graph-canvas]'),
      surface: module.querySelector('[data-graph-surface]'),
      wires: module.querySelector('[data-graph-wires]'),
      searchMenu: module.querySelector('[data-graph-search-menu]'),
      searchInput: module.querySelector('[data-graph-search-input]'),
      searchResults: module.querySelector('[data-graph-search-results]')
    };
  }

  function graphViewportSpawn(module, state) {
    const { canvas } = graphCanvasParts(module);
    const scrollLeft = canvas?.scrollLeft || 0;
    const scrollTop = canvas?.scrollTop || 0;
    const width = canvas?.clientWidth || 640;
    const height = canvas?.clientHeight || 420;
    const offset = state.spawnCount * 22;
    state.spawnCount += 1;
    return {
      x: Math.round(scrollLeft + width * 0.32 + offset),
      y: Math.round(scrollTop + height * 0.24 + offset)
    };
  }

  function renderGraphSearchResults(module) {
    const { searchInput, searchResults } = graphCanvasParts(module);
    if (!searchResults) {
      return;
    }

    const query = (searchInput?.value || '').trim().toLowerCase();
    searchResults.innerHTML = '';

    GRAPH_NODE_TEMPLATES
      .filter(template => {
        if (query.length === 0) {
          return true;
        }
        return template.label.toLowerCase().includes(query) ||
          template.subtitle.toLowerCase().includes(query) ||
          template.kind.toLowerCase().includes(query);
      })
      .forEach(template => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'mod-graph-search-item';
        button.dataset.graphNodeKind = template.kind;
        button.innerHTML = `
          <span class="mod-graph-search-item-name">${template.label}</span>
          <span class="mod-graph-search-item-copy">${template.subtitle}</span>
        `;
        searchResults.appendChild(button);
      });
  }

  function setGraphSearchMenuState(module, open) {
    const { searchMenu, searchInput } = graphCanvasParts(module);
    if (!searchMenu) {
      return;
    }
    searchMenu.hidden = !open;
    searchMenu.classList.toggle('is-open', open);
    module.classList.toggle('is-search-open', open);
    if (open && searchInput) {
      renderGraphSearchResults(module);
      searchInput.focus({ preventScroll: true });
      searchInput.select();
    }
  }

  function removeGraphNode(module, nodeId) {
    const state = ensureGraphState(module);
    state.nodes = state.nodes.filter(node => node.id !== nodeId);
    state.connections = state.connections.filter(connection =>
      connection.fromNodeId !== nodeId && connection.toNodeId !== nodeId
    );
    if (state.pendingSocket?.nodeId === nodeId) {
      state.pendingSocket = null;
      state.pendingPoint = null;
    }
    renderGraphModule(module);
  }

  function connectGraphSockets(module, outputSocket, inputSocket) {
    if (!outputSocket || !inputSocket) {
      return;
    }
    if (!socketTypeMatches(outputSocket.type, inputSocket.type)) {
      return;
    }

    const state = ensureGraphState(module);
    state.connections = state.connections.filter(connection =>
      !(connection.toNodeId === inputSocket.nodeId && connection.toSocket === inputSocket.socketKey)
    );

    if (!graphConnectionExists(
      state,
      outputSocket.nodeId,
      outputSocket.socketKey,
      inputSocket.nodeId,
      inputSocket.socketKey
    )) {
      state.connections.push({
        id: nextGraphConnectionId(),
        fromNodeId: outputSocket.nodeId,
        fromSocket: outputSocket.socketKey,
        toNodeId: inputSocket.nodeId,
        toSocket: inputSocket.socketKey,
        type: outputSocket.type
      });
    }

    state.pendingSocket = null;
    state.pendingPoint = null;
    renderGraphModule(module);
  }

  function graphCanvasPointFromClient(module, clientX, clientY) {
    const { canvas } = graphCanvasParts(module);
    const canvasRect = canvas.getBoundingClientRect();
    return {
      x: clientX - canvasRect.left + (canvas?.scrollLeft || 0),
      y: clientY - canvasRect.top + (canvas?.scrollTop || 0)
    };
  }

  function graphSocketCenter(module, socket) {
    const { canvas } = graphCanvasParts(module);
    const rect = socket.getBoundingClientRect();
    const canvasRect = canvas.getBoundingClientRect();
    return {
      x: rect.left - canvasRect.left + (canvas?.scrollLeft || 0) + rect.width / 2,
      y: rect.top - canvasRect.top + (canvas?.scrollTop || 0) + rect.height / 2
    };
  }

  function renderGraphConnections(module) {
    const state = ensureGraphState(module);
    const { wires } = graphCanvasParts(module);
    if (!wires) {
      return;
    }

    wires.innerHTML = '';
    state.connections.forEach(connection => {
      const fromSocket = state.socketElements.get(graphSocketKey(connection.fromNodeId, 'output', connection.fromSocket));
      const toSocket = state.socketElements.get(graphSocketKey(connection.toNodeId, 'input', connection.toSocket));
      if (!fromSocket || !toSocket) {
        return;
      }

      const start = graphSocketCenter(module, fromSocket);
      const end = graphSocketCenter(module, toSocket);
      const delta = Math.max(48, Math.abs(end.x - start.x) * 0.5);

      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute(
        'd',
        `M ${start.x} ${start.y} C ${start.x + delta} ${start.y}, ${end.x - delta} ${end.y}, ${end.x} ${end.y}`
      );
      path.setAttribute('class', `mod-graph-wire type-${connection.type}`);
      wires.appendChild(path);
    });

    if (state.pendingSocket && state.pendingPoint) {
      const anchor = state.socketElements.get(
        graphSocketKey(state.pendingSocket.nodeId, state.pendingSocket.direction, state.pendingSocket.socketKey)
      );
      if (anchor) {
        const anchorPoint = graphSocketCenter(module, anchor);
        const start = state.pendingSocket.direction === 'output' ? anchorPoint : state.pendingPoint;
        const end = state.pendingSocket.direction === 'output' ? state.pendingPoint : anchorPoint;
        const delta = Math.max(48, Math.abs(end.x - start.x) * 0.5);

        const preview = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        preview.setAttribute(
          'd',
          `M ${start.x} ${start.y} C ${start.x + delta} ${start.y}, ${end.x - delta} ${end.y}, ${end.x} ${end.y}`
        );
        preview.setAttribute('class', `mod-graph-wire is-preview type-${state.pendingSocket.type}`);
        wires.appendChild(preview);
      }
    }
  }

  function updateGraphNodePosition(module, node) {
    const state = ensureGraphState(module);
    const element = state.nodeElements.get(node.id);
    if (element) {
      element.style.transform = `translate(${node.x}px, ${node.y}px)`;
    }
    renderGraphConnections(module);
  }

  function bindGraphNodeDrag(module, node, nodeElement, handle) {
    handle.addEventListener('pointerdown', event => {
      if (event.target.closest('[data-graph-node-delete]')) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      nodeElement.setPointerCapture(event.pointerId);
      const startX = event.clientX;
      const startY = event.clientY;
      const baseX = node.x;
      const baseY = node.y;

      nodeElement.classList.add('is-dragging');

      function onMove(moveEvent) {
        node.x = Math.max(12, Math.round(baseX + moveEvent.clientX - startX));
        node.y = Math.max(12, Math.round(baseY + moveEvent.clientY - startY));
        updateGraphNodePosition(module, node);
      }

      function onUp(upEvent) {
        nodeElement.classList.remove('is-dragging');
        if (nodeElement.hasPointerCapture(upEvent.pointerId)) {
          nodeElement.releasePointerCapture(upEvent.pointerId);
        }
        nodeElement.removeEventListener('pointermove', onMove);
        nodeElement.removeEventListener('pointerup', onUp);
        nodeElement.removeEventListener('pointercancel', onUp);
      }

      nodeElement.addEventListener('pointermove', onMove);
      nodeElement.addEventListener('pointerup', onUp);
      nodeElement.addEventListener('pointercancel', onUp);
    });
  }

  function graphSocketDescriptor(socketButton) {
    if (!socketButton) {
      return null;
    }
    return {
      nodeId: socketButton.dataset.nodeId || '',
      socketKey: socketButton.dataset.socketKey || '',
      direction: socketButton.dataset.socketDirection || '',
      type: socketButton.dataset.socketType || ''
    };
  }

  function graphConnectionForInput(state, inputSocket) {
    return state.connections.find(connection =>
      connection.toNodeId === inputSocket.nodeId &&
      connection.toSocket === inputSocket.socketKey
    ) || null;
  }

  function clearGraphSocketDrag(module) {
    const state = ensureGraphState(module);
    if (!state.pendingSocket && !state.pendingPoint) {
      return;
    }
    state.pendingSocket = null;
    state.pendingPoint = null;
    renderGraphModule(module);
  }

  function completeGraphSocketDrag(module, dropSocket) {
    const state = ensureGraphState(module);
    const next = graphSocketDescriptor(dropSocket);
    if (!state.pendingSocket || !next) {
      clearGraphSocketDrag(module);
      return;
    }

    if (
      state.pendingSocket.nodeId === next.nodeId &&
      state.pendingSocket.socketKey === next.socketKey &&
      state.pendingSocket.direction === next.direction
    ) {
      clearGraphSocketDrag(module);
      return;
    }

    let outputSocket = null;
    let inputSocket = null;
    if (state.pendingSocket.direction === 'output' && next.direction === 'input') {
      outputSocket = state.pendingSocket;
      inputSocket = next;
    } else if (state.pendingSocket.direction === 'input' && next.direction === 'output') {
      outputSocket = next;
      inputSocket = state.pendingSocket;
    }

    if (!outputSocket || !inputSocket) {
      clearGraphSocketDrag(module);
      return;
    }

    connectGraphSockets(module, outputSocket, inputSocket);
  }

  function beginGraphSocketDrag(module, socketButton, event) {
    const state = ensureGraphState(module);
    const next = graphSocketDescriptor(socketButton);
    if (!next || event.button !== 0) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    if (next.direction === 'input') {
      const existing = graphConnectionForInput(state, next);
      if (existing) {
        state.connections = state.connections.filter(connection => connection.id !== existing.id);
        state.pendingSocket = {
          nodeId: existing.fromNodeId,
          socketKey: existing.fromSocket,
          direction: 'output',
          type: existing.type
        };
      } else {
        state.pendingSocket = next;
      }
    } else {
      state.pendingSocket = next;
    }

    state.pendingPoint = graphCanvasPointFromClient(module, event.clientX, event.clientY);
    renderGraphModule(module);

    function onMove(moveEvent) {
      state.pendingPoint = graphCanvasPointFromClient(module, moveEvent.clientX, moveEvent.clientY);
      renderGraphConnections(module);
    }

    function onUp(upEvent) {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp, true);
      window.removeEventListener('pointercancel', onUp, true);

      const dropSocket = document.elementFromPoint(upEvent.clientX, upEvent.clientY)?.closest('.mod-graph-socket');
      if (dropSocket) {
        completeGraphSocketDrag(module, dropSocket);
        return;
      }
      clearGraphSocketDrag(module);
    }

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp, true);
    window.addEventListener('pointercancel', onUp, true);
  }

  function renderGraphModule(module) {
    const state = ensureGraphState(module);
    const { surface, wires } = graphCanvasParts(module);
    if (!surface || !wires) {
      return;
    }

    surface.innerHTML = '';
    state.nodeElements = new Map();
    state.socketElements = new Map();

    state.nodes.forEach(node => {
      const template = graphTemplate(node.kind);
      const article = document.createElement('article');
      article.className = 'mod-graph-node';
      article.dataset.graphNodeId = node.id;
      article.dataset.graphNodeKind = node.kind;
      article.style.transform = `translate(${node.x}px, ${node.y}px)`;

      const header = document.createElement('header');
      header.className = 'mod-graph-node-head';
      header.innerHTML = `
        <div class="mod-graph-node-head-copy">
          <h3>${template.label}</h3>
          <p>${template.subtitle}</p>
        </div>
        <button class="mod-graph-node-delete" type="button" data-graph-node-delete aria-label="Delete node">x</button>
      `;
      article.appendChild(header);

      const body = document.createElement('div');
      body.className = 'mod-graph-node-body';

      const inputs = document.createElement('div');
      inputs.className = 'mod-graph-node-column';
      template.inputs.forEach(socket => {
        const row = document.createElement('div');
        row.className = 'mod-graph-socket-row';

        const button = document.createElement('button');
        button.type = 'button';
        button.className = `mod-graph-socket is-input type-${socket.type}`;
        button.dataset.nodeId = node.id;
        button.dataset.socketKey = socket.key;
        button.dataset.socketDirection = 'input';
        button.dataset.socketType = socket.type;
        button.title = `${socket.label} (${socket.type})`;
        if (
          state.pendingSocket &&
          state.pendingSocket.nodeId === node.id &&
          state.pendingSocket.socketKey === socket.key &&
          state.pendingSocket.direction === 'input'
        ) {
          button.classList.add('is-active');
        }

        const label = document.createElement('span');
        label.className = 'mod-graph-socket-label';
        label.textContent = socket.label;

        row.appendChild(button);
        row.appendChild(label);
        inputs.appendChild(row);
        state.socketElements.set(graphSocketKey(node.id, 'input', socket.key), button);
      });

      const outputs = document.createElement('div');
      outputs.className = 'mod-graph-node-column mod-graph-node-column-output';
      template.outputs.forEach(socket => {
        const row = document.createElement('div');
        row.className = 'mod-graph-socket-row mod-graph-socket-row-output';

        const label = document.createElement('span');
        label.className = 'mod-graph-socket-label';
        label.textContent = socket.label;

        const button = document.createElement('button');
        button.type = 'button';
        button.className = `mod-graph-socket is-output type-${socket.type}`;
        button.dataset.nodeId = node.id;
        button.dataset.socketKey = socket.key;
        button.dataset.socketDirection = 'output';
        button.dataset.socketType = socket.type;
        button.title = `${socket.label} (${socket.type})`;
        if (
          state.pendingSocket &&
          state.pendingSocket.nodeId === node.id &&
          state.pendingSocket.socketKey === socket.key &&
          state.pendingSocket.direction === 'output'
        ) {
          button.classList.add('is-active');
        }

        row.appendChild(label);
        row.appendChild(button);
        outputs.appendChild(row);
        state.socketElements.set(graphSocketKey(node.id, 'output', socket.key), button);
      });

      body.appendChild(inputs);
      body.appendChild(outputs);
      article.appendChild(body);
      surface.appendChild(article);
      state.nodeElements.set(node.id, article);

      bindGraphNodeDrag(module, node, article, header);

      article.querySelectorAll('.mod-graph-socket').forEach(socketButton => {
        socketButton.addEventListener('pointerdown', event => {
          beginGraphSocketDrag(module, socketButton, event);
        });
      });

      article.querySelector('[data-graph-node-delete]')?.addEventListener('click', event => {
        event.preventDefault();
        event.stopPropagation();
        removeGraphNode(module, node.id);
      });
    });

    renderGraphConnections(module);
  }

  function addGraphNode(module, kind) {
    const state = ensureGraphState(module);
    const spawn = graphViewportSpawn(module, state);
    state.nodes.push(createGraphNode(kind, spawn.x, spawn.y));
    state.pendingSocket = null;
    state.pendingPoint = null;
    setGraphSearchMenuState(module, false);
    renderGraphModule(module);
  }

  function bindGraphModule(module) {
    if (module.dataset.graphBound === 'true') {
      renderGraphSearchResults(module);
      renderGraphModule(module);
      return;
    }

    module.dataset.graphBound = 'true';
    const { canvas, searchInput, searchResults } = graphCanvasParts(module);
    const addButton = module.querySelector('[data-graph-add-node]');
    const searchToggle = module.querySelector('[data-graph-search-toggle]');

    addButton?.addEventListener('click', event => {
      event.preventDefault();
      event.stopPropagation();
      const isOpen = !module.querySelector('[data-graph-search-menu]')?.hidden;
      setGraphSearchMenuState(module, !isOpen);
    });

    searchToggle?.addEventListener('click', event => {
      event.preventDefault();
      event.stopPropagation();
      const isOpen = !module.querySelector('[data-graph-search-menu]')?.hidden;
      setGraphSearchMenuState(module, !isOpen);
    });

    searchInput?.addEventListener('input', () => {
      renderGraphSearchResults(module);
    });

    searchResults?.addEventListener('click', event => {
      const button = event.target.closest('[data-graph-node-kind]');
      if (!button) {
        return;
      }
      addGraphNode(module, button.dataset.graphNodeKind || 'number');
    });

    canvas?.addEventListener('scroll', () => {
      renderGraphConnections(module);
    });

    canvas?.addEventListener('click', event => {
      if (event.target.closest('.mod-graph-node') || event.target.closest('[data-graph-search-menu]')) {
        return;
      }
      clearGraphSocketDrag(module);
    });

    renderGraphSearchResults(module);
    renderGraphModule(module);
  }

  function initGraphModules(root = document) {
    graphModules(root).forEach(module => {
      bindGraphModule(module);
    });

    if (document.body.dataset.graphUiBound === 'true') {
      return;
    }

    document.body.dataset.graphUiBound = 'true';
    document.addEventListener('click', event => {
      if (!event.target.closest('[data-graph-module]')) {
        graphModules().forEach(module => {
          setGraphSearchMenuState(module, false);
          clearGraphSocketDrag(module);
        });
      }
    });

    window.addEventListener('resize', () => {
      graphModules().forEach(module => {
        renderGraphConnections(module);
      });
    });

    window.addEventListener('keydown', event => {
      if (event.key !== 'Escape') {
        return;
      }
      graphModules().forEach(module => {
        setGraphSearchMenuState(module, false);
        clearGraphSocketDrag(module);
      });
    });
  }

  function syncToolbarScrollButton(shell) {
    const scrollport = shell.querySelector('[data-chat-toolbar-scrollport]');
    const button = shell.querySelector('[data-chat-toolbar-scroll]');
    if (!scrollport || !button) {
      return;
    }

    const maxScroll = Math.max(0, scrollport.scrollWidth - scrollport.clientWidth);
    const atEnd = scrollport.scrollLeft >= maxScroll - 4;
    button.hidden = maxScroll <= 4;
    button.classList.toggle('is-reset', maxScroll > 4 && atEnd);
    button.textContent = atEnd ? '<' : '>';
    button.setAttribute('aria-label', atEnd ? 'Reset toolbar scroll' : 'Scroll toolbar');
  }

  function totalModuleCounts() {
    const totals = new Map();
    moduleFrames().forEach(frame => {
      const kind = frame.dataset.moduleKind;
      totals.set(kind, (totals.get(kind) || 0) + 1);
    });
    return totals;
  }

  function renderModuleManager(root = document) {
    const manager = root.querySelector('[data-module-manager]');
    if (!manager) {
      return;
    }

    const addMenu = manager.querySelector('[data-module-add-menu]');
    const activeList = manager.querySelector('[data-module-active-list]');
    if (!addMenu || !activeList) {
      return;
    }

    addMenu.innerHTML = '';
    MODULE_DEFINITIONS.forEach(def => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'mod-module-add-item';
      button.dataset.moduleAddKind = def.kind;
      button.textContent = def.label;
      addMenu.appendChild(button);
    });

    activeList.innerHTML = '';
    const totals = totalModuleCounts();
    const seen = new Map();

    moduleFrames(root).forEach(frame => {
      const kind = frame.dataset.moduleKind;
      const index = (seen.get(kind) || 0) + 1;
      seen.set(kind, index);

      const row = document.createElement('div');
      row.className = 'mod-module-row';

      const name = document.createElement('span');
      name.className = 'mod-module-row-name';
      name.textContent = totals.get(kind) > 1 ? `${moduleLabel(kind)} ${index}` : moduleLabel(kind);

      const remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'mod-module-row-remove';
      remove.dataset.moduleRemove = frame.dataset.moduleInstance || '';
      remove.textContent = 'Remove';

      row.appendChild(name);
      row.appendChild(remove);
      activeList.appendChild(row);
    });

    if (activeList.childElementCount === 0) {
      const empty = document.createElement('p');
      empty.className = 'mod-module-empty';
      empty.textContent = 'No active modules. Use Add to create one.';
      activeList.appendChild(empty);
    }
  }

  function rewriteIds(frame, suffix) {
    const idMap = new Map();
    const withIds = [frame, ...frame.querySelectorAll('[id]')].filter(el => typeof el.id === 'string' && el.id.length > 0);

    withIds.forEach(el => {
      const oldId = el.id;
      const newId = `${oldId}-${suffix}`;
      idMap.set(oldId, newId);
      el.id = newId;
    });

    [frame, ...frame.querySelectorAll('*')].forEach(el => {
      ['for', 'data-drag-target', 'data-resize-target', 'data-orientation-target'].forEach(attr => {
        const raw = el.getAttribute(attr);
        if (!raw) {
          return;
        }

        let next = raw;
        idMap.forEach((newId, oldId) => {
          if (next === oldId) {
            next = newId;
          } else if (next === `#${oldId}`) {
            next = `#${newId}`;
          }
        });

        if (next !== raw) {
          el.setAttribute(attr, next);
        }
      });
    });
  }

  function offsetModuleClone(frame, kind) {
    const siblingCount = moduleFrames().filter(existing => existing.dataset.moduleKind === kind).length;
    const baseCol = parseFloat(frame.dataset.gridCol || '0') || 0;
    const baseRow = parseFloat(frame.dataset.gridRow || '0') || 0;
    const offset = siblingCount * 2;
    frame.dataset.gridCol = String(baseCol + offset);
    frame.dataset.gridRow = String(baseRow + offset);
  }

  function cleanupModuleFrame(frame) {
    closeAllMenuGroupLists();
    closeStackContextMenu();
    closeOrganizerMenus(frame);
    closeHistoryMenus(frame);
    closeTagMenus(frame);

    const history = getChatHistory(frame);
    if (history && history._chatListTimer) {
      window.clearInterval(history._chatListTimer);
      history._chatListTimer = null;
    }
  }

  function cloneModuleFrame(kind) {
    const template = moduleTemplates.get(kind);
    if (!template) {
      return null;
    }

    const frame = template.cloneNode(true);
    const instance = nextModuleInstance();
    frame.dataset.moduleInstance = String(instance);
    rewriteIds(frame, instance);
    offsetModuleClone(frame, kind);
    return frame;
  }

  function addModule(kind) {
    const shell = demoShell();
    const frame = cloneModuleFrame(kind);
    if (!shell || !frame) {
      return;
    }

    shell.appendChild(frame);
    window.HestiaModularMenus.init();
    initOrganizerBoards(document);
    initGraphModules(document);
    initChatFrame(document);
    initStackGroups(document);
    if (frameStackCategory(frame) === 'content') {
      stackContentFrameIntoPreferredGroup(frame, { activate: true });
    }
    renderModuleManager();
  }

  function removeModule(instance) {
    if (!instance) {
      return;
    }

    const frame = document.querySelector(`.demo-shell > [data-module-instance="${instance}"]`);
    if (!frame) {
      return;
    }

    unregisterFrameFromStacking(frame);
    cleanupModuleFrame(frame);
    frame.remove();
    initStackGroups(document);
    renderModuleManager();
  }

  function initModuleManager(root = document) {
    const manager = root.querySelector('[data-module-manager]');
    if (!manager) {
      return;
    }

    if (manager.dataset.bound === 'true') {
      renderModuleManager(root);
      return;
    }

    manager.dataset.bound = 'true';
    const addToggle = manager.querySelector('[data-module-add-toggle]');
    const addMenu = manager.querySelector('[data-module-add-menu]');
    const activeList = manager.querySelector('[data-module-active-list]');

    if (addToggle && addMenu) {
      addToggle.addEventListener('click', event => {
        event.stopPropagation();
        const isOpen = addMenu.classList.contains('is-open');
        closeModuleAddMenu(manager);
        if (isOpen) {
          return;
        }
        addToggle.classList.add('is-open');
        addMenu.hidden = false;
        addMenu.classList.add('is-open');
      });

      addMenu.addEventListener('click', event => {
        const button = event.target.closest('[data-module-add-kind]');
        if (!button) {
          return;
        }
        addModule(button.dataset.moduleAddKind || '');
        closeModuleAddMenu(manager);
      });
    }

    if (activeList) {
      activeList.addEventListener('click', event => {
        const button = event.target.closest('[data-module-remove]');
        if (!button) {
          return;
        }
        removeModule(button.dataset.moduleRemove || '');
      });
    }

    document.addEventListener('click', event => {
      if (!manager.contains(event.target)) {
        closeModuleAddMenu(manager);
      }
    });

    renderModuleManager(root);
  }

  function syncHistoryViewButtons(history) {
    const frame = history.closest('[data-module-kind="chat-history"]');
    if (!frame) {
      return;
    }
    frame.querySelectorAll('[data-chat-history-menu] .mod-view-btn').forEach(button => {
      button.classList.toggle('is-active', button.dataset.view === history.dataset.chatView);
    });
  }

  function syncHistoryListTag(entry) {
    const head = entry.querySelector('.mod-chat-entry-head');
    const meta = entry.querySelector('.mod-chat-meta-row');
    if (!head || !meta) {
      return;
    }

    let rotor = head.querySelector('.mod-chat-list-tag');
    if (!rotor) {
      rotor = document.createElement('span');
      rotor.className = 'mod-chat-list-tag';
      head.appendChild(rotor);
    }

    const tags = [...meta.querySelectorAll('.mod-meta-pill')]
      .map(pill => (pill.textContent || '').trim())
      .filter(Boolean);

    entry._chatListTags = tags;
    if (tags.length === 0) {
      rotor.hidden = true;
      rotor.textContent = '';
      return;
    }

    const index = Number(entry.dataset.chatListTagIndex || '0') % tags.length;
    entry.dataset.chatListTagIndex = String(index);
    rotor.hidden = false;
    rotor.textContent = tags[index];
  }

  function syncHistoryEntries(history) {
    history.querySelectorAll('.mod-chat-entry').forEach(entry => {
      ensureHistoryEntry(entry);
      syncHistoryListTag(entry);
    });
  }

  function rotateHistoryListTags(history) {
    history.querySelectorAll('.mod-chat-entry').forEach(entry => {
      const tags = entry._chatListTags || [];
      if (tags.length <= 1) {
        syncHistoryListTag(entry);
        return;
      }

      const next = (Number(entry.dataset.chatListTagIndex || '0') + 1) % tags.length;
      entry.dataset.chatListTagIndex = String(next);
      syncHistoryListTag(entry);
    });
  }

  function syncHistorySettings(history) {
    const frame = history.closest('[data-module-kind="chat-history"]');
    if (!frame) {
      return;
    }
    frame.querySelectorAll('[data-chat-setting]').forEach(select => {
      const key = select.dataset.chatSetting;
      const value = history.dataset['chat' + key.charAt(0).toUpperCase() + key.slice(1)];
      if (value) {
        select.value = value;
      }
    });
    syncHistoryViewButtons(history);
  }

  function syncComposerHeight(panel) {
    const select = panel.querySelector('[data-chat-compose-setting="lines"]');
    if (!select) {
      return;
    }
    panel.dataset.chatLines = select.value === '1' ? '1' : '2';
  }

  function selectedTags(panel) {
    return [...panel.querySelectorAll('[data-chat-tag].is-active')].map(button => button.dataset.chatTag);
  }

  function nearestModuleFrame(frame, kind) {
    const matches = moduleFrames().filter(candidate => candidate.dataset.moduleKind === kind);
    if (matches.length === 0) {
      return null;
    }
    if (!frame) {
      return matches[0];
    }

    const sourceRect = frame.getBoundingClientRect();
    const sourceX = sourceRect.left + sourceRect.width / 2;
    const sourceY = sourceRect.top + sourceRect.height / 2;

    matches.sort((a, b) => {
      const aRect = a.getBoundingClientRect();
      const bRect = b.getBoundingClientRect();
      const aDx = aRect.left + aRect.width / 2 - sourceX;
      const aDy = aRect.top + aRect.height / 2 - sourceY;
      const bDx = bRect.left + bRect.width / 2 - sourceX;
      const bDy = bRect.top + bRect.height / 2 - sourceY;
      return aDx * aDx + aDy * aDy - (bDx * bDx + bDy * bDy);
    });

    return matches[0];
  }

  function nearestHistory(frame) {
    const historyFrame = nearestModuleFrame(frame, 'chat-history');
    return historyFrame ? getChatHistory(historyFrame) : null;
  }

  function nearestComposer(frame) {
    return nearestModuleFrame(frame, 'chat-compose');
  }

  function chatQuoteData(entry) {
    return {
      entryId: ensureChatEntryId(entry),
      author: (entry.querySelector('.mod-chat-author')?.textContent || '').trim(),
      stamp: (entry.querySelector('.mod-chat-stamp')?.textContent || '').trim(),
      text: excerpt(historyEntryText(entry))
    };
  }

  function focusChatEntry(entryId) {
    if (!entryId) {
      return;
    }

    const entry = document.querySelector(`.mod-chat-entry[data-chat-entry-id="${entryId}"]`);
    if (!entry) {
      return;
    }

    entry.scrollIntoView({ block: 'center', behavior: 'smooth' });
    entry.classList.add('is-quote-target');
    window.clearTimeout(entry._chatQuoteFlashTimer);
    entry._chatQuoteFlashTimer = window.setTimeout(() => {
      entry.classList.remove('is-quote-target');
    }, 1400);
  }

  function currentComposerQuote(frame) {
    const panel = frame.querySelector('.mod-chat-composer-panel');
    if (!panel || !panel.dataset.chatQuoteEntryId) {
      return null;
    }

    return {
      entryId: panel.dataset.chatQuoteEntryId,
      author: panel.dataset.chatQuoteAuthor || '',
      stamp: panel.dataset.chatQuoteStamp || '',
      text: panel.dataset.chatQuoteText || ''
    };
  }

  function clearComposerQuote(frame) {
    const panel = frame.querySelector('.mod-chat-composer-panel');
    const preview = frame.querySelector('[data-chat-quote-preview]');
    if (!panel || !preview) {
      return;
    }

    delete panel.dataset.chatQuoteEntryId;
    delete panel.dataset.chatQuoteAuthor;
    delete panel.dataset.chatQuoteStamp;
    delete panel.dataset.chatQuoteText;
    preview.hidden = true;
  }

  function setComposerQuote(frame, entry) {
    const panel = frame.querySelector('.mod-chat-composer-panel');
    const preview = frame.querySelector('[data-chat-quote-preview]');
    const source = frame.querySelector('[data-chat-quote-preview-source]');
    const text = frame.querySelector('[data-chat-quote-preview-text]');
    const textarea = frame.querySelector('.mod-chat-textarea');
    if (!panel || !preview || !source || !text) {
      return;
    }

    const quote = chatQuoteData(entry);
    panel.dataset.chatQuoteEntryId = quote.entryId;
    panel.dataset.chatQuoteAuthor = quote.author;
    panel.dataset.chatQuoteStamp = quote.stamp;
    panel.dataset.chatQuoteText = quote.text;
    source.textContent = quote.stamp ? `${quote.author} ${quote.stamp}` : quote.author;
    text.textContent = quote.text;
    preview.hidden = false;

    if (textarea) {
      textarea.focus();
    }
  }

  function appendChatEntry(frame, text) {
    const history = nearestHistory(frame);
    const panel = frame.querySelector('.mod-chat-composer-panel');
    const model = panel ? panel.querySelector('[data-chat-compose-setting="model"]') : null;
    const channel = panel ? panel.querySelector('[data-chat-compose-setting="channel"]') : null;
    const article = document.createElement('article');
    const head = document.createElement('div');
    const author = document.createElement('span');
    const stamp = document.createElement('span');
    const bubble = document.createElement('div');
    const bubbleText = document.createElement('div');
    const meta = document.createElement('div');
    const tags = selectedTags(panel || frame);
    const values = tags.length > 0 ? tags : ['draft'];
    const quote = currentComposerQuote(frame);

    if (!history || text.trim().length === 0) {
      return;
    }

    article.className = 'mod-chat-entry is-participant-b';
    article.dataset.chatEntryId = nextChatEntryId();
    head.className = 'mod-chat-entry-head';
    author.className = 'mod-chat-author';
    stamp.className = 'mod-chat-stamp';
    bubble.className = 'mod-chat-bubble';
    bubbleText.className = 'mod-chat-bubble-text';
    meta.className = 'mod-chat-meta-row';

    author.textContent = (model ? model.value : 'Atlas Fast') + ' / ' + (channel ? channel.value : 'Ops');
    stamp.textContent = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    bubbleText.textContent = text;

    if (quote) {
      const quoteLink = document.createElement('button');
      const quoteLabel = document.createElement('span');
      const quoteSource = document.createElement('span');
      const quoteText = document.createElement('span');

      article.dataset.chatQuoteRef = quote.entryId;
      quoteLink.type = 'button';
      quoteLink.className = 'mod-chat-quote-link';
      quoteLink.dataset.chatQuoteJump = quote.entryId;
      quoteLabel.className = 'mod-chat-quote-label';
      quoteLabel.textContent = 'Quoted message';
      quoteSource.className = 'mod-chat-quote-source';
      quoteSource.textContent = quote.stamp ? `${quote.author} ${quote.stamp}` : quote.author;
      quoteText.className = 'mod-chat-quote-text';
      quoteText.textContent = quote.text;
      quoteLink.appendChild(quoteLabel);
      quoteLink.appendChild(quoteSource);
      quoteLink.appendChild(quoteText);
      bubble.appendChild(quoteLink);
    }

    bubble.appendChild(bubbleText);

    values.forEach(value => {
      const pill = document.createElement('span');
      pill.className = 'mod-meta-pill';
      pill.textContent = value;
      meta.appendChild(pill);
    });

    head.appendChild(author);
    head.appendChild(stamp);
    article.appendChild(head);
    article.appendChild(bubble);
    article.appendChild(meta);
    ensureQuoteAction(article);
    syncHistoryListTag(article);
    history.appendChild(article);
    history.scrollTop = history.scrollHeight;
    clearComposerQuote(frame);
  }

  function bindHistoryModule(frame) {
    const history = getChatHistory(frame);
    const historyMenu = frame.querySelector('[data-chat-history-menu]');
    const optionsToggle = frame.querySelector('[data-chat-options-toggle]');
    const optionsMenu = frame.querySelector('[data-chat-options-menu]');

    if (!history) {
      return;
    }

    if (frame.dataset.chatHistoryBound === 'true') {
      syncHistoryEntries(history);
      syncHistorySettings(history);
      return;
    }

    frame.dataset.chatHistoryBound = 'true';
    syncHistoryEntries(history);
    if (!history._chatListTimer) {
      history._chatListTimer = window.setInterval(() => {
        rotateHistoryListTags(history);
      }, 2600);
    }

    syncHistorySettings(history);

    history.addEventListener('click', event => {
      const quoteTrigger = event.target.closest('[data-chat-quote-trigger]');
      if (quoteTrigger) {
        const entry = quoteTrigger.closest('.mod-chat-entry');
        const composeFrame = nearestComposer(frame);
        if (entry && composeFrame) {
          event.preventDefault();
          setComposerQuote(composeFrame, entry);
        }
        return;
      }

      const quoteJump = event.target.closest('[data-chat-quote-jump]');
      if (quoteJump) {
        event.preventDefault();
        focusChatEntry(quoteJump.dataset.chatQuoteJump || '');
      }
    });

    if (historyMenu) {
      historyMenu.querySelectorAll('.mod-view-btn').forEach(button => {
        button.addEventListener('click', () => {
          historyMenu.querySelectorAll('.mod-view-btn').forEach(candidate => {
            candidate.classList.remove('is-active');
          });
          button.classList.add('is-active');
          history.dataset.chatView = button.dataset.view || 'details';
          syncHistoryEntries(history);
        });
      });
    }

    frame.querySelectorAll('[data-chat-setting]').forEach(select => {
      select.addEventListener('change', () => {
        const key = select.dataset.chatSetting;
        history.dataset['chat' + key.charAt(0).toUpperCase() + key.slice(1)] = select.value;
        syncHistoryEntries(history);
      });
    });

    if (optionsToggle && optionsMenu) {
      optionsToggle.addEventListener('click', event => {
        const isOpen = optionsMenu.classList.contains('is-open');
        event.stopPropagation();
        closeHistoryMenus(frame);
        optionsMenu.classList.toggle('is-open', !isOpen);
        optionsToggle.classList.toggle('is-open', !isOpen);
      });

      optionsMenu.addEventListener('click', event => {
        event.stopPropagation();
      });
    }
  }

  function bindComposer(frame) {
    const panel = frame.querySelector('.mod-chat-composer-panel');
    const textarea = frame.querySelector('.mod-chat-textarea');
    const send = frame.querySelector('[data-chat-send]');
    const lineSelect = frame.querySelector('[data-chat-compose-setting="lines"]');
    const enterSend = frame.querySelector('[data-chat-compose-setting="enter-send"]');
    const toolbarShell = frame.querySelector('[data-chat-toolbar-shell]');
    const toolbarScrollport = frame.querySelector('[data-chat-toolbar-scrollport]');
    const toolbarScroll = frame.querySelector('[data-chat-toolbar-scroll]');
    const tagToggle = frame.querySelector('[data-chat-tag-toggle]');
    const tagMenu = frame.querySelector('[data-chat-tag-menu]');
    const quotePreviewJump = frame.querySelector('[data-chat-quote-preview-jump]');
    const quoteClear = frame.querySelector('[data-chat-quote-clear]');

    if (!panel || !textarea || !send) {
      return;
    }

    syncComposerHeight(panel);
    if (toolbarShell) {
      requestAnimationFrame(() => syncToolbarScrollButton(toolbarShell));
    }

    if (panel.dataset.chatComposeBound === 'true') {
      return;
    }

    panel.dataset.chatComposeBound = 'true';

    if (lineSelect) {
      lineSelect.addEventListener('change', () => {
        syncComposerHeight(panel);
      });
    }

    if (toolbarShell && toolbarScrollport && toolbarScroll) {
      const step = () => Math.max(160, Math.round(toolbarScrollport.clientWidth * 0.72));
      const sync = () => syncToolbarScrollButton(toolbarShell);

      toolbarScroll.addEventListener('click', () => {
        const maxScroll = Math.max(0, toolbarScrollport.scrollWidth - toolbarScrollport.clientWidth);
        if (maxScroll <= 4) {
          return;
        }

        if (toolbarScrollport.scrollLeft >= maxScroll - 4) {
          toolbarScrollport.scrollTo({ left: 0, behavior: 'smooth' });
        } else {
          toolbarScrollport.scrollBy({ left: step(), behavior: 'smooth' });
        }
      });

      toolbarScrollport.addEventListener('scroll', sync, { passive: true });
      window.addEventListener('resize', sync);

      if (window.ResizeObserver) {
        const observer = new ResizeObserver(sync);
        observer.observe(toolbarShell);
        observer.observe(toolbarScrollport);
      }

      requestAnimationFrame(sync);
    }

    if (tagToggle && toolbarShell && tagMenu) {
      tagToggle.addEventListener('click', event => {
        const isOpen = toolbarShell.classList.contains('is-tag-open');
        event.stopPropagation();
        closeTagMenus(frame);
        toolbarShell.classList.toggle('is-tag-open', !isOpen);
      });

      tagMenu.addEventListener('click', event => {
        event.stopPropagation();
      });
    }

    frame.querySelectorAll('[data-chat-tag]').forEach(button => {
      button.addEventListener('click', () => {
        button.classList.toggle('is-active');
      });
    });

    if (quotePreviewJump) {
      quotePreviewJump.addEventListener('click', () => {
        focusChatEntry(panel.dataset.chatQuoteEntryId || '');
      });
    }

    if (quoteClear) {
      quoteClear.addEventListener('click', () => {
        clearComposerQuote(frame);
        textarea.focus();
      });
    }

    send.addEventListener('click', () => {
      appendChatEntry(frame, textarea.value);
      textarea.value = '';
      textarea.focus();
    });

    textarea.addEventListener('keydown', event => {
      const canSend = enterSend ? enterSend.checked : true;
      if (event.key === 'Enter' && !event.shiftKey && canSend) {
        event.preventDefault();
        send.click();
      }
    });
  }

  function initChatFrame(root = document) {
    root.querySelectorAll('[data-module-kind="chat-history"]').forEach(frame => {
      bindHistoryModule(frame);
    });
    root.querySelectorAll('[data-module-kind="chat-compose"]').forEach(frame => {
      bindComposer(frame);
    });

    if (document.body.dataset.chatUiBound === 'true') {
      return;
    }

    document.body.dataset.chatUiBound = 'true';
    document.addEventListener('click', event => {
      if (!event.target.closest('[data-module-kind="chat-history"]') &&
          !event.target.closest('[data-module-kind="chat-compose"]')) {
        closeHistoryMenus(root);
        closeTagMenus(root);
        return;
      }

      if (!event.target.closest('[data-chat-options-menu]') && !event.target.closest('[data-chat-options-toggle]')) {
        closeHistoryMenus(root);
      }

      if (!event.target.closest('[data-chat-toolbar-shell]')) {
        closeTagMenus(root);
      }
    });
  }

  collectModuleTemplates();
  registerExistingModuleInstances();
  window.HestiaModularMenus.init();
  initModuleManager();
  initOrganizerBoards();
  initGraphModules();
  initChatFrame();
  bindStackUi();
  initStackGroups();
})();
