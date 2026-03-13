(() => {
  const MODULE_DEFINITIONS = [
    { kind: 'search', label: 'Search' },
    { kind: 'navigation', label: 'Navigation' },
    { kind: 'data', label: 'Data' },
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
    const view = board.dataset.view === 'details' ? 'details' : 'cards';
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

  function setOrganizerMenuState(card, open) {
    const menu = card.querySelector('[data-organizer-menu]');
    const { optionsToggle: toggle } = ensureOrganizerHeadActions(card);
    if (!menu || !toggle) {
      return;
    }

    card.classList.toggle('is-menu-open', open);
    toggle.classList.toggle('is-open', open);
    menu.classList.toggle('is-open', open);
    menu.hidden = !open;
    if (open) {
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
    const menu = card.querySelector('[data-organizer-menu]');
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
    const menu = card.querySelector('[data-organizer-menu]');

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
        setOrganizerMenuState(card, shouldOpen);
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
    initChatFrame(document);
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

    cleanupModuleFrame(frame);
    frame.remove();
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
  initChatFrame();
})();
