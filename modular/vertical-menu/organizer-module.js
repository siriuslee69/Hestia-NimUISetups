(() => {
  const core = window.HestiaVerticalCore;
  if (!core) {
    return;
  }

  const parseJsonObject = core.helpers.parseJsonObject;

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
      core.state.organizerCardCounter += 1;
      card.dataset.organizerCardId = `organizer-card-${core.state.organizerCardCounter}`;
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
      core.state.activeOrganizerMenu = menu;
      return;
    }
    if (core.state.activeOrganizerMenu === menu) {
      core.state.activeOrganizerMenu = null;
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

  core.modules.organizer = {
    init: initOrganizerBoards,
    closeMenus: closeOrganizerMenus,
    cleanupFrame(frame) {
      closeOrganizerMenus(frame);
      frame?.querySelectorAll?.('[data-organizer-item]').forEach(card => {
        const menu = card._organizerMenu || card.querySelector('[data-organizer-menu]');
        if (menu && menu.parentElement === document.body) {
          menu.remove();
        }
      });
    }
  };
})();
