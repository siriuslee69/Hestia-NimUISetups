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
  let metaTooltip = null;
  let dataNameTooltip = null;
  let pinnedCarousel = null;
  let pinnedMetaField = null;
  let activeDataNameCard = null;
  let pinnedDataNameCard = null;
  let tagTooltipPinTimer = 0;
  let metaTooltipPinTimer = 0;
  let dataNameTooltipPinTimer = 0;
  let dataNameTooltipRotateTimer = 0;

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
    const sw = window.innerWidth || document.documentElement.clientWidth || window.screen?.availWidth || window.screen?.width;
    const sh = window.innerHeight || document.documentElement.clientHeight || window.screen?.availHeight || window.screen?.height;
    return {
      width: sw,
      height: sh
    };
  }

  function syncGridCssVars() {
    const root = document.documentElement;
    const styles = getComputedStyle(root);
    const desktop = getDesktopMetrics();
    const cols = parseFloat(styles.getPropertyValue('--mod-grid-cols')) || 40;
    const rows = parseFloat(styles.getPropertyValue('--mod-grid-rows')) || 20;
    const lockedWidth = parseFloat(styles.getPropertyValue('--mod-grid-cell-w-lock')) || 0;
    const lockedHeight = parseFloat(styles.getPropertyValue('--mod-grid-cell-h-lock')) || 0;
    const cellWidth = lockedWidth > 0 ? lockedWidth : desktop.width / cols;
    const cellHeight = lockedHeight > 0 ? lockedHeight : desktop.height / rows;
    const activeCols = lockedWidth > 0 ? Math.max(cols, Math.ceil(desktop.width / cellWidth)) : cols;
    const activeRows = lockedHeight > 0 ? Math.max(rows, Math.ceil(desktop.height / cellHeight)) : rows;
    root.style.setProperty('--mod-grid-cols-active', `${activeCols}`);
    root.style.setProperty('--mod-grid-rows-active', `${activeRows}`);
    root.style.setProperty('--mod-grid-cell-w', `${cellWidth}px`);
    root.style.setProperty('--mod-grid-cell-h', `${cellHeight}px`);
  }

  function getGridMetrics() {
    const styles = window.getComputedStyle(document.documentElement);
    return {
      cols: parseFloat(styles.getPropertyValue('--mod-grid-cols-active')) ||
        parseFloat(styles.getPropertyValue('--mod-grid-cols')) || 40,
      rows: parseFloat(styles.getPropertyValue('--mod-grid-rows-active')) ||
        parseFloat(styles.getPropertyValue('--mod-grid-rows')) || 20,
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

  function ensureMetaTooltip() {
    if (metaTooltip) {
      return metaTooltip;
    }
    metaTooltip = document.createElement('div');
    metaTooltip.className = 'mod-meta-tooltip';
    metaTooltip.hidden = true;
    document.body.appendChild(metaTooltip);

    if (ensureMetaTooltip.bound !== true) {
      document.addEventListener('click', event => {
        if (!pinnedMetaField) {
          return;
        }
        const tooltip = ensureMetaTooltip();
        if (tooltip.contains(event.target) || pinnedMetaField.contains(event.target)) {
          return;
        }
        hideMetaTooltip(true);
      });

      window.addEventListener('keydown', event => {
        if (event.key === 'Escape' && pinnedMetaField) {
          hideMetaTooltip(true);
        }
      });

      ensureMetaTooltip.bound = true;
    }

    return metaTooltip;
  }

  function ensureDataNameTooltip() {
    if (dataNameTooltip) {
      return dataNameTooltip;
    }

    dataNameTooltip = document.createElement('div');
    dataNameTooltip.className = 'mod-data-name-tooltip';
    dataNameTooltip.hidden = true;
    document.body.appendChild(dataNameTooltip);

    if (ensureDataNameTooltip.bound !== true) {
      window.addEventListener('resize', () => {
        hideDataNameTooltip(true);
      });

      window.addEventListener('scroll', () => {
        hideDataNameTooltip(true);
      }, true);

      document.addEventListener('click', event => {
        if (!pinnedDataNameCard) {
          return;
        }
        const tooltip = ensureDataNameTooltip();
        if (tooltip.contains(event.target) || pinnedDataNameCard.contains(event.target)) {
          return;
        }
        hideDataNameTooltip(true);
      });

      window.addEventListener('keydown', event => {
        if (event.key === 'Escape' && pinnedDataNameCard) {
          hideDataNameTooltip(true);
        }
      });

      ensureDataNameTooltip.bound = true;
    }

    return dataNameTooltip;
  }

  function positionFloatingTooltip(tooltip, clientX, clientY) {
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

  function positionTagTooltip(clientX, clientY) {
    const tooltip = ensureTagTooltip();
    positionFloatingTooltip(tooltip, clientX, clientY);
  }

  function positionMetaTooltip(clientX, clientY) {
    const tooltip = ensureMetaTooltip();
    positionFloatingTooltip(tooltip, clientX, clientY);
  }

  function positionDataNameTooltip(card) {
    const tooltip = ensureDataNameTooltip();
    const rect = card.getBoundingClientRect();
    const margin = 8;

    tooltip.style.left = `${Math.round(rect.right - 1)}px`;
    tooltip.style.top = `${Math.round(rect.top - 1)}px`;

    const tooltipRect = tooltip.getBoundingClientRect();
    let left = rect.right - 1;
    if (left + tooltipRect.width > window.innerWidth - margin) {
      left = rect.left - tooltipRect.width + 1;
    }
    left = clamp(left, margin, Math.max(margin, window.innerWidth - tooltipRect.width - margin));

    let top = rect.top - 1;
    top = clamp(top, margin, Math.max(margin, window.innerHeight - tooltipRect.height - margin));

    tooltip.style.left = `${Math.round(left)}px`;
    tooltip.style.top = `${Math.round(top)}px`;
  }

  function cardIndexInList(card) {
    const list = card?.closest('.mod-data-list');
    if (!list) {
      return 0;
    }
    return Math.max(0, [...list.querySelectorAll('.mod-data-card')].indexOf(card));
  }

  function clearDataNameTooltipTimers() {
    if (dataNameTooltipPinTimer) {
      window.clearTimeout(dataNameTooltipPinTimer);
      dataNameTooltipPinTimer = 0;
    }
    if (dataNameTooltipRotateTimer) {
      window.clearInterval(dataNameTooltipRotateTimer);
      dataNameTooltipRotateTimer = 0;
    }
  }

  function dataNameTooltipSlides() {
    const tooltip = ensureDataNameTooltip();
    return [...tooltip.querySelectorAll('[data-card-tooltip-slide]')];
  }

  function setDataNameTooltipSlide(index) {
    const tooltip = ensureDataNameTooltip();
    const slides = dataNameTooltipSlides();
    const dots = [...tooltip.querySelectorAll('[data-card-tooltip-dot]')];
    if (slides.length === 0) {
      return;
    }

    const next = ((index % slides.length) + slides.length) % slides.length;
    tooltip.dataset.slideIndex = `${next}`;
    slides.forEach((slide, slideIndex) => {
      slide.classList.toggle('is-active', slideIndex === next);
    });
    dots.forEach((dot, dotIndex) => {
      dot.classList.toggle('is-active', dotIndex === next);
    });
  }

  function startDataNameTooltipRotation() {
    clearDataNameTooltipTimers();
    const slides = dataNameTooltipSlides();
    if (slides.length <= 1) {
      return;
    }

    setDataNameTooltipSlide(0);
    dataNameTooltipRotateTimer = window.setInterval(() => {
      const tooltip = ensureDataNameTooltip();
      const current = parseInt(tooltip.dataset.slideIndex || '0', 10) || 0;
      setDataNameTooltipSlide(current + 1);
    }, 2000);
  }

  function beginDataNameTooltipPin(card) {
    const tooltip = ensureDataNameTooltip();
    if (pinnedDataNameCard || !card || tooltip.hidden) {
      return;
    }

    if (dataNameTooltipPinTimer) {
      return;
    }

    tooltip.classList.add('is-pin-pending');
    dataNameTooltipPinTimer = window.setTimeout(() => {
      dataNameTooltipPinTimer = 0;
      tooltip.classList.remove('is-pin-pending');
      pinnedDataNameCard = card;
      activeDataNameCard = card;
      tooltip.classList.add('is-pinned');
      positionDataNameTooltip(card);
    }, 1000);
  }

  function cancelDataNameTooltipPin() {
    if (!dataNameTooltip) {
      clearDataNameTooltipTimers();
      return;
    }
    if (dataNameTooltipPinTimer) {
      window.clearTimeout(dataNameTooltipPinTimer);
      dataNameTooltipPinTimer = 0;
    }
    dataNameTooltip.classList.remove('is-pin-pending');
  }

  function parseJsonObject(raw, fallback = {}) {
    if (typeof raw !== 'string' || raw.trim().length === 0) {
      return fallback;
    }
    try {
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === 'object' ? parsed : fallback;
    } catch (err) {
      return fallback;
    }
  }

  function normalizeGraphConfig(config, fallbackTitle = 'Graph') {
    if (!config || typeof config !== 'object') {
      return null;
    }

    const kind = `${config.kind || ''}`.trim();
    const payload = config.payload && typeof config.payload === 'object'
      ? config.payload
      : {};
    if (!kind) {
      return null;
    }

    return {
      kind,
      payload,
      title: `${config.title || fallbackTitle}`
    };
  }

  function graphConfigFromWidget(widget, fallbackTitle = 'Graph') {
    if (!(widget instanceof HTMLElement)) {
      return null;
    }

    return normalizeGraphConfig({
      kind: widget.dataset.graphKind || 'bar',
      payload: parseJsonObject(widget.dataset.graphPayload, {}),
      title: widget.dataset.graphTitle || fallbackTitle
    }, fallbackTitle);
  }

  function fallbackGraphConfig(card, cardIndex, metadata, fallbackTitle) {
    const graphKinds = ['bar', 'pie', 'pointcloud'];
    const kind = graphKinds[cardIndex % graphKinds.length];
    const tags = Array.isArray(metadata?.tags) ? metadata.tags : [];
    const checkpoints = Array.isArray(metadata?.checkpoints) ? metadata.checkpoints : [];
    const ownerCount = metadata?.owner && typeof metadata.owner === 'object'
      ? Object.keys(metadata.owner).length
      : 1;
    const statusLength = `${metadata?.status || ''}`.trim().length || 3;
    const priorityLength = `${metadata?.priority || ''}`.trim().length || 2;

    if (kind === 'pie') {
      return normalizeGraphConfig({
        kind,
        title: `${fallbackTitle} split`,
        payload: {
          segments: [
            { label: 'Status', value: Math.max(1, statusLength), color: '#5fd0ff' },
            { label: 'Priority', value: Math.max(1, priorityLength), color: '#ffbe56' },
            { label: 'Owners', value: Math.max(1, ownerCount), color: '#b990ff' }
          ]
        }
      }, fallbackTitle);
    }

    if (kind === 'pointcloud') {
      const values = (checkpoints.length > 0 ? checkpoints : tags).slice(0, 5);
      return normalizeGraphConfig({
        kind,
        title: `${fallbackTitle} spread`,
        payload: {
          points: values.map((value, index) => ({
            label: `${value || `Point ${index + 1}`}`,
            x: 14 + index * 17,
            y: 20 + ((index * 23) % 58),
            r: 3 + (index % 3),
            color: ['#5fd0ff', '#81d97a', '#ffbe56', '#b990ff', '#ff7c6b'][index % 5]
          }))
        }
      }, fallbackTitle);
    }

    return normalizeGraphConfig({
      kind: 'bar',
      title: `${fallbackTitle} load`,
      payload: {
        series: [
          { label: 'Tags', value: Math.max(1, tags.length), color: '#5fd0ff' },
          { label: 'Flow', value: Math.max(1, checkpoints.length), color: '#81d97a' },
          { label: 'Owners', value: Math.max(1, ownerCount), color: '#ffbe56' }
        ]
      }
    }, fallbackTitle);
  }

  function cardGraphConfig(card, cardIndex) {
    const fallbackTitle = resolveCardName(
      card,
      card?.querySelector('.mod-data-main') || document.createElement('div'),
      parseCardMetadata(card, cardIndex),
      cardIndex
    );
    const explicitConfig = normalizeGraphConfig(parseJsonObject(card?.dataset?.cardGraph, {}), fallbackTitle);
    const organizerConfig = normalizeGraphConfig(parseJsonObject(card?.dataset?.organizerVisual, {}), fallbackTitle);
    let config = card?.dataset?.cardGraphExplicit === 'true'
      ? explicitConfig
      : organizerConfig || explicitConfig;
    if (!config) {
      config = graphConfigFromWidget(
        card?.querySelector('.mod-card-graph-layer [data-graph-widget], .mod-preview [data-graph-widget]'),
        fallbackTitle
      );
    }
    if (!config) {
      config = fallbackGraphConfig(card, cardIndex, parseCardMetadata(card, cardIndex), fallbackTitle);
    }

    if (!config) {
      return null;
    }

    return config;
  }

  function buildCardTooltipGraph(config) {
    const host = document.createElement('div');
    host.className = 'mod-graph-widget mod-card-tooltip-graph';
    host.dataset.graphKind = config.kind;
    host.dataset.graphTitle = config.title;
    host.dataset.graphPayload = JSON.stringify(config.payload || {});
    const renderer = window.HestiaGraphWidgets?.renderWidget;
    if (typeof renderer === 'function') {
      host.appendChild(renderer(host, {
        display: 'tooltip',
        width: 280,
        height: 168
      }));
    }
    return host;
  }

  function buildDataNameTooltip(card) {
    const tooltip = ensureDataNameTooltip();
    const cardIndex = cardIndexInList(card);
    const main = card.querySelector('.mod-data-main');
    const config = cardGraphConfig(card, cardIndex);
    const slides = [];

    tooltip.innerHTML = '';
    tooltip.classList.remove('is-pinned', 'is-pin-pending');
    tooltip.dataset.slideIndex = '0';

    const progress = document.createElement('div');
    progress.className = 'mod-large-tooltip-progress';

    const close = document.createElement('button');
    close.type = 'button';
    close.className = 'mod-large-tooltip-close';
    close.setAttribute('aria-label', 'Close tooltip');
    close.textContent = 'x';
    close.addEventListener('click', event => {
      event.preventDefault();
      event.stopPropagation();
      hideDataNameTooltip(true);
    });

    const stack = document.createElement('div');
    stack.className = 'mod-card-tooltip-stack';

    const header = document.createElement('div');
    header.className = 'mod-card-tooltip-header';
    header.innerHTML = `
      <div>
        <div class="mod-card-tooltip-title">${resolveCardName(card, main || document.createElement('div'), parseCardMetadata(card, cardIndex), cardIndex)}</div>
        <div class="mod-card-tooltip-subtitle">Info and graph carousel</div>
      </div>
    `;

    const stage = document.createElement('div');
    stage.className = 'mod-card-tooltip-stage';

    if (main) {
      const infoSlide = document.createElement('section');
      const clone = main.cloneNode(true);
      infoSlide.className = 'mod-card-tooltip-slide mod-card-tooltip-info';
      infoSlide.dataset.cardTooltipSlide = 'info';
      clone.querySelector('.mod-card-graph-slot')?.remove();
      infoSlide.appendChild(clone);
      slides.push(infoSlide);
      stage.appendChild(infoSlide);
    }

    if (config) {
      const graphSlide = document.createElement('section');
      graphSlide.className = 'mod-card-tooltip-slide mod-card-tooltip-graph-wrap';
      graphSlide.dataset.cardTooltipSlide = 'graph';
      graphSlide.appendChild(buildCardTooltipGraph(config));
      slides.push(graphSlide);
      stage.appendChild(graphSlide);
    }

    const dots = document.createElement('div');
    dots.className = 'mod-card-tooltip-dots';
    slides.forEach((slide, index) => {
      const dot = document.createElement('span');
      dot.className = 'mod-card-tooltip-dot';
      dot.dataset.cardTooltipDot = `${index}`;
      dots.appendChild(dot);
    });

    stack.appendChild(header);
    stack.appendChild(stage);
    if (slides.length > 1) {
      stack.appendChild(dots);
    }

    tooltip.appendChild(progress);
    tooltip.appendChild(close);
    tooltip.appendChild(stack);
    tooltip.hidden = false;
    activeDataNameCard = card;
    setDataNameTooltipSlide(0);
    startDataNameTooltipRotation();
    positionDataNameTooltip(card);
  }

  function showDataNameTooltip(card) {
    if (card.dataset.dataNameFloat !== 'true') {
      return;
    }

    if (pinnedDataNameCard && pinnedDataNameCard !== card) {
      return;
    }

    if (pinnedDataNameCard === card && dataNameTooltip && dataNameTooltip.hidden !== true) {
      positionDataNameTooltip(card);
      return;
    }

    buildDataNameTooltip(card);
  }

  function hideDataNameTooltip(force) {
    if (!force && (activeDataNameCard?.matches(':hover, :focus-within') || pinnedDataNameCard)) {
      return;
    }

    clearDataNameTooltipTimers();
    if (!dataNameTooltip) {
      activeDataNameCard = null;
      pinnedDataNameCard = null;
      return;
    }

    const tooltip = dataNameTooltip;
    tooltip.hidden = true;
    tooltip.innerHTML = '';
    tooltip.classList.remove('is-pinned', 'is-pin-pending');
    activeDataNameCard = null;
    pinnedDataNameCard = null;
  }

  function fillTagTooltip(carousel, scrollable) {
    const tooltip = ensureTagTooltip();
    const pills = carouselPillsOf(carousel);
    tooltip.innerHTML = '';
    tooltip.classList.toggle('is-pinned', scrollable);
    tooltip.classList.remove('is-pin-pending');

    const progress = document.createElement('div');
    progress.className = 'mod-large-tooltip-progress';

    const close = document.createElement('button');
    close.type = 'button';
    close.className = 'mod-large-tooltip-close';
    close.setAttribute('aria-label', 'Close tooltip');
    close.textContent = 'x';
    close.addEventListener('click', event => {
      event.preventDefault();
      event.stopPropagation();
      hideTagTooltip(true);
    });

    const fieldTitle = document.createElement('div');
    fieldTitle.className = 'mod-tag-tooltip-title';
    fieldTitle.textContent = carousel.dataset.metaField || 'metadata';

    const list = document.createElement('div');
    list.className = 'mod-tag-tooltip-list';

    pills.forEach(pill => {
      const row = document.createElement('span');
      row.className = 'mod-meta-pill mod-tag-tooltip-pill';
      row.textContent = pill.textContent || '';
      list.appendChild(row);
    });

    tooltip.appendChild(progress);
    tooltip.appendChild(close);
    tooltip.appendChild(fieldTitle);
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
    if (tagTooltipPinTimer) {
      window.clearTimeout(tagTooltipPinTimer);
      tagTooltipPinTimer = 0;
    }
    const tooltip = ensureTagTooltip();
    tooltip.hidden = true;
    tooltip.classList.remove('is-pinned', 'is-pin-pending');
    tooltip.innerHTML = '';
    if (force) {
      if (pinnedCarousel) {
        pinnedCarousel.classList.remove('is-meta-active');
      }
      pinnedCarousel = null;
    }
  }

  function fillMetaTooltip(field, value, scrollable) {
    const tooltip = ensureMetaTooltip();
    tooltip.innerHTML = '';
    tooltip.classList.toggle('is-pinned', scrollable);
    tooltip.classList.remove('is-pin-pending');

    const progress = document.createElement('div');
    progress.className = 'mod-large-tooltip-progress';

    const close = document.createElement('button');
    close.type = 'button';
    close.className = 'mod-large-tooltip-close';
    close.setAttribute('aria-label', 'Close tooltip');
    close.textContent = 'x';
    close.addEventListener('click', event => {
      event.preventDefault();
      event.stopPropagation();
      hideMetaTooltip(true);
    });

    const name = document.createElement('div');
    name.className = 'mod-meta-tooltip-name';
    name.textContent = field;

    const text = document.createElement('div');
    text.className = 'mod-meta-tooltip-value';
    text.textContent = value;

    tooltip.appendChild(progress);
    tooltip.appendChild(close);
    tooltip.appendChild(name);
    tooltip.appendChild(text);
  }

  function showMetaTooltip(fieldEl, event, scrollable) {
    const field = fieldEl.dataset.metaField || 'metadata';
    const value = fieldEl.dataset.metaValue || fieldEl.textContent || '';
    fillMetaTooltip(field, value, scrollable);
    const tooltip = ensureMetaTooltip();
    tooltip.hidden = false;
    positionMetaTooltip(event.clientX, event.clientY);
  }

  function hideMetaTooltip(force) {
    if (!force && pinnedMetaField) {
      return;
    }
    if (metaTooltipPinTimer) {
      window.clearTimeout(metaTooltipPinTimer);
      metaTooltipPinTimer = 0;
    }
    const tooltip = ensureMetaTooltip();
    tooltip.hidden = true;
    tooltip.classList.remove('is-pinned', 'is-pin-pending');
    tooltip.innerHTML = '';
    if (force) {
      if (pinnedMetaField) {
        pinnedMetaField.classList.remove('is-meta-active');
      }
      pinnedMetaField = null;
    }
  }

  function attachMetaFieldHover(fieldEl) {
    if (fieldEl.dataset.metaHoverBound === 'true') {
      return;
    }
    fieldEl.dataset.metaHoverBound = 'true';

    fieldEl.addEventListener('mouseenter', event => {
      if (pinnedMetaField && pinnedMetaField !== fieldEl) {
        return;
      }
      showMetaTooltip(fieldEl, event, pinnedMetaField === fieldEl);
      beginMetaTooltipPin(fieldEl, event);
    });

    fieldEl.addEventListener('mousemove', event => {
      if (pinnedMetaField && pinnedMetaField !== fieldEl) {
        return;
      }
      if (pinnedMetaField === fieldEl) {
        showMetaTooltip(fieldEl, event, true);
        return;
      }
      positionMetaTooltip(event.clientX, event.clientY);
    });

    fieldEl.addEventListener('mouseleave', () => {
      cancelMetaTooltipPin();
      if (pinnedMetaField === fieldEl) {
        return;
      }
      hideMetaTooltip(false);
    });

    fieldEl.addEventListener('click', event => {
      event.preventDefault();
      event.stopPropagation();
      hideTagTooltip(true);

      if (pinnedMetaField === fieldEl) {
        hideMetaTooltip(true);
        return;
      }

      if (pinnedMetaField) {
        pinnedMetaField.classList.remove('is-meta-active');
      }
      pinnedMetaField = fieldEl;
      fieldEl.classList.add('is-meta-active');
      showMetaTooltip(fieldEl, event, true);
    });
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
    window.clearTimeout(hideModeTooltip.timer);
    showModeTooltip.timer = window.setTimeout(() => {
      hideModeTooltip(0);
    }, 520);
  }

  function hideModeTooltip(delay = 0) {
    window.clearTimeout(showModeTooltip.timer);
    window.clearTimeout(hideModeTooltip.timer);
    if (delay <= 0) {
      const tooltip = ensureModeTooltip();
      tooltip.hidden = true;
      return;
    }
    hideModeTooltip.timer = window.setTimeout(() => {
      const tooltip = ensureModeTooltip();
      tooltip.hidden = true;
    }, delay);
  }

  function attachHoverTooltip(element, text) {
    if (element.dataset.hoverTooltipBound === 'true') {
      return;
    }
    element.dataset.hoverTooltipBound = 'true';
    element.addEventListener('mouseenter', () => {
      showModeTooltip(element, text);
    });
    element.addEventListener('mouseleave', () => {
      hideModeTooltip(60);
    });
    element.addEventListener('blur', () => {
      hideModeTooltip(0);
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

  function normalizeFrameMode(mode) {
    switch (mode) {
    case 'hover':
    case 'collapsed':
      return mode;
    default:
      return 'extended';
    }
  }

  function beginTagTooltipPin(carousel, event) {
    const tooltip = ensureTagTooltip();
    if (pinnedCarousel || tooltip.hidden || tagTooltipPinTimer) {
      return;
    }

    tooltip.classList.add('is-pin-pending');
    tagTooltipPinTimer = window.setTimeout(() => {
      tagTooltipPinTimer = 0;
      if (pinnedCarousel) {
        return;
      }
      pinnedCarousel = carousel;
      carousel.classList.add('is-meta-active');
      showTagTooltip(carousel, event, true);
    }, 1000);
  }

  function cancelTagTooltipPin() {
    if (tagTooltipPinTimer) {
      window.clearTimeout(tagTooltipPinTimer);
      tagTooltipPinTimer = 0;
    }
    if (tagTooltip) {
      tagTooltip.classList.remove('is-pin-pending');
    }
  }

  function beginMetaTooltipPin(fieldEl, event) {
    const tooltip = ensureMetaTooltip();
    if (pinnedMetaField || tooltip.hidden || metaTooltipPinTimer) {
      return;
    }

    tooltip.classList.add('is-pin-pending');
    metaTooltipPinTimer = window.setTimeout(() => {
      metaTooltipPinTimer = 0;
      if (pinnedMetaField) {
        return;
      }
      pinnedMetaField = fieldEl;
      fieldEl.classList.add('is-meta-active');
      showMetaTooltip(fieldEl, event, true);
    }, 1000);
  }

  function cancelMetaTooltipPin() {
    if (metaTooltipPinTimer) {
      window.clearTimeout(metaTooltipPinTimer);
      metaTooltipPinTimer = 0;
    }
    if (metaTooltip) {
      metaTooltip.classList.remove('is-pin-pending');
    }
  }

  function nextFrameMode(mode) {
    switch (normalizeFrameMode(mode)) {
    case 'extended':
      return 'hover';
    case 'hover':
      return 'collapsed';
    default:
      return 'extended';
    }
  }

  function moduleFrameLabel(frame) {
    const kind = frame.dataset.moduleKind || 'module';
    const fromCore = window.HestiaVerticalCore?.workspace?.moduleLabel?.(kind);
    if (fromCore) {
      return fromCore;
    }

    return kind
      .replace(/[-_]+/g, ' ')
      .replace(/\b\w/g, char => char.toUpperCase());
  }

  function rememberFrameExpandedWidth(frame) {
    const current = parseFloat(frame.style.width || '0') || frame.getBoundingClientRect().width || 0;
    if (current > 72) {
      frame.dataset.moduleExpandedWidth = `${Math.round(current)}px`;
    }
  }

  function ensureFrameModeRail(frame) {
    let rail = frame.querySelector(':scope > .mod-frame-mode-rail');
    if (rail) {
      return rail;
    }

    rail = document.createElement('div');
    rail.className = 'mod-frame-mode-rail';
    rail.innerHTML = `
      <span class="mod-frame-mode-symbol"></span>
      <span class="mod-frame-mode-name"></span>
    `;
    frame.appendChild(rail);
    return rail;
  }

  function syncFrameModeRail(frame) {
    const rail = ensureFrameModeRail(frame);
    const name = moduleFrameLabel(frame);
    rail.querySelector('.mod-frame-mode-symbol').textContent = name.charAt(0) || '+';
    rail.querySelector('.mod-frame-mode-name').textContent = name;
  }

  function syncFrameMode(frame) {
    if (!(frame instanceof HTMLElement) || !frame.matches('[data-grid-box][data-module-kind]')) {
      return;
    }

    const mode = normalizeFrameMode(frame.dataset.moduleMode || 'extended');
    if (!frame.dataset.moduleExpandedWidth) {
      frame.dataset.moduleExpandedWidth = frame.style.width || `${Math.round(frame.getBoundingClientRect().width || 240)}px`;
    }
    if (mode === 'extended') {
      rememberFrameExpandedWidth(frame);
    }

    frame.dataset.moduleMode = mode;
    frame.style.setProperty('--mod-frame-expanded-width', frame.dataset.moduleExpandedWidth || frame.style.width || '240px');
    syncFrameModeRail(frame);

    const toggle = ensureFrameModeToggle(frame);
    toggle.dataset.mode = mode;
    toggle.title = modeText(mode);
    toggle.setAttribute('aria-label', modeText(mode));
  }

  function ensureFrameModeToggle(frame) {
    let toggle = frame.querySelector(':scope > .mod-frame-mode-toggle');
    if (toggle) {
      return toggle;
    }

    toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'mod-frame-mode-toggle mod-mode-toggle';
    toggle.draggable = false;
    frame.appendChild(toggle);

    toggle.addEventListener('pointerdown', event => {
      event.stopPropagation();
    });

    toggle.addEventListener('click', event => {
      event.preventDefault();
      event.stopPropagation();
      rememberFrameExpandedWidth(frame);
      const mode = nextFrameMode(frame.dataset.moduleMode || 'extended');
      frame.dataset.moduleMode = mode;
      syncFrameMode(frame);
      showModeTooltip(toggle, modeText(mode));
    });

    return toggle;
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

  function normalizeDataNameMode(mode) {
    switch (mode) {
    case 'hover':
    case 'extended':
      return mode;
    default:
      return 'auto';
    }
  }

  function getDataNameMode(dataList) {
    return normalizeDataNameMode(dataList?.dataset?.nameMode || 'auto');
  }

  function measureDataCardExpandedWidth(card, view) {
    const preview = card.querySelector('.mod-preview');
    const main = card.querySelector('.mod-data-main');
    const previewWidth = Math.ceil(preview?.getBoundingClientRect().width || 56);
    if (!main) {
      return previewWidth;
    }

    const mainWidth = Math.ceil(main.scrollWidth || main.getBoundingClientRect().width || 0);
    const gap = parseFloat(window.getComputedStyle(card).columnGap || window.getComputedStyle(card).gap || '0');

    if (view === 'cards') {
      return Math.max(160, mainWidth + 20);
    }

    return previewWidth + gap + mainWidth;
  }

  function bindDataNameHover(card) {
    if (card.dataset.dataNameHoverBound === 'true') {
      return;
    }

    card.dataset.dataNameHoverBound = 'true';

    card.addEventListener('mouseenter', () => {
      showDataNameTooltip(card);
      beginDataNameTooltipPin(card);
    });

    card.addEventListener('mouseleave', () => {
      cancelDataNameTooltipPin();
      if (pinnedDataNameCard === card) {
        return;
      }
      if (activeDataNameCard === card) {
        hideDataNameTooltip(true);
      }
    });

    card.addEventListener('focusin', () => {
      showDataNameTooltip(card);
    });

    card.addEventListener('focusout', () => {
      window.requestAnimationFrame(() => {
        if (pinnedDataNameCard === card) {
          return;
        }
        if (activeDataNameCard === card && !card.contains(document.activeElement)) {
          hideDataNameTooltip(true);
        }
      });
    });
  }

  function syncDataNameModePresentation(dataList) {
    if (!dataList) {
      return;
    }

    const view = dataList.dataset.view || 'details';
    const mode = getDataNameMode(dataList);
    dataList.dataset.nameMode = mode;

    const cards = [...dataList.querySelectorAll('.mod-data-card')];
    cards.forEach(card => {
      card.classList.remove('is-name-collapsed', 'is-name-extended');
      card.dataset.dataNameFloat = 'false';
      bindDataNameHover(card);
    });

    if (view === 'list') {
      hideDataNameTooltip(true);
      return;
    }

    cards.forEach(card => {
      let collapsed = false;
      if (mode === 'hover') {
        collapsed = true;
      } else if (mode === 'auto') {
        const availableWidth = view === 'cards'
          ? Math.ceil(card.getBoundingClientRect().width || card.clientWidth || 0)
          : Math.ceil(dataList.getBoundingClientRect().width || dataList.clientWidth || 0);
        const requiredWidth = measureDataCardExpandedWidth(card, view);
        collapsed = availableWidth > 0 && requiredWidth > availableWidth + 1;
      }

      card.classList.toggle('is-name-collapsed', collapsed);
      card.classList.toggle('is-name-extended', !collapsed);
      card.dataset.dataNameFloat = collapsed && view !== 'list' ? 'true' : 'false';
      bindDataNameHover(card);
    });

    if (activeDataNameCard && activeDataNameCard.dataset.dataNameFloat !== 'true') {
      hideDataNameTooltip(true);
    }
  }

  function syncSettingsCardTitles(settingsGrid) {
    if (!settingsGrid) {
      return;
    }

    const view = settingsGrid.dataset.view || 'details';
    settingsGrid.querySelectorAll('.mod-settings-card').forEach(card => {
      const heading = card.querySelector('h3')?.textContent?.trim() || card.dataset.settingsTitle || '';
      if (!heading) {
        card.removeAttribute('title');
        card.removeAttribute('aria-label');
        return;
      }

      card.dataset.settingsTitle = heading;
      if (view === 'details') {
        card.removeAttribute('title');
        card.removeAttribute('aria-label');
        return;
      }

      card.title = heading;
      card.setAttribute('aria-label', heading);
    });
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
    getButtons(menu).forEach(button => {
      if (button.dataset.dragBound === 'true') {
        return;
      }
      button.dataset.dragBound = 'true';
      button.draggable = true;
      button.addEventListener('dragstart', () => {
        menu._modDraggedButton = button;
        button.classList.add('is-dragging');
      });
      button.addEventListener('dragend', () => {
        button.classList.remove('is-dragging');
        menu._modDraggedButton = null;
        applyAutoStates(menu);
      });
    });

    if (menu.dataset.dragContainerBound !== 'true') {
      menu.dataset.dragContainerBound = 'true';
      menu.addEventListener('dragover', event => {
        const dragged = menu._modDraggedButton || null;
        if (!dragged) {
          return;
        }
        event.preventDefault();
        const target = getTargetButton(menu, event);
        if (!target || target === dragged) {
          return;
        }

        const rect = target.getBoundingClientRect();
        const orientation = menu.dataset.orientation || 'horizontal';
        const before = orientation === 'vertical'
          ? event.clientY < rect.top + rect.height / 2
          : event.clientX < rect.left + rect.width / 2;

        menu.insertBefore(dragged, before ? target : target.nextSibling);
      });
    }
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
      window.dispatchEvent(new CustomEvent('hestia:grid-drag-end', {
        detail: {
          target,
          handle,
          left: parseFloat(target.style.left || '0') || 0,
          top: parseFloat(target.style.top || '0') || 0
        }
      }));
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
      target.querySelectorAll('.mod-data-list').forEach(dataList => {
        updateMetadataPagers(dataList);
      });
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
      window.dispatchEvent(new CustomEvent('hestia:grid-resize-end', {
        detail: {
          target,
          handle,
          width: parseFloat(target.style.width || '0') || 0,
          height: parseFloat(target.style.height || '0') || 0
        }
      }));
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

  function applyOrientationTargetLayout(target) {
    const orientation = target.dataset.orientation || 'horizontal';
    if (!target.classList.contains('mod-data-list') && !target.classList.contains('mod-settings-grid')) {
      return;
    }

    target.style.flexDirection = orientation === 'horizontal' ? 'row' : 'column';
    target.style.flexWrap = orientation === 'horizontal' ? 'wrap' : 'nowrap';
    target.style.alignItems = orientation === 'horizontal' ? 'flex-start' : 'stretch';
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
      applyOrientationTargetLayout(menu);
      updateOrientationHandleLabel(handle, menu);
    }

    handle.addEventListener('click', toggleOrientation);
    attachHoverTooltip(handle, 'Toggle row/column');
    applyOrientationTargetLayout(menu);
    updateOrientationHandleLabel(handle, menu);
    orientationHandles.set(handle, { toggleOrientation });
  }

  function hydrateMenuButtons(menu) {
    getButtons(menu).forEach(button => {
      ensureLabelTrack(button);
      ensureModeToggle(button, menu);
    });
  }

  function initMenu(menu) {
    if (menus.has(menu)) {
      return menus.get(menu);
    }

    hydrateMenuButtons(menu);

    applyAutoStates(menu);
    attachDrag(menu);

    const observer = new ResizeObserver(() => {
      applyAutoStates(menu);
    });
    observer.observe(menu);

    const api = {
      refresh() {
        hydrateMenuButtons(menu);
        attachDrag(menu);
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
      beginTagTooltipPin(carousel, event);
    });

    carousel.addEventListener('mousemove', event => {
      if (pinnedCarousel && pinnedCarousel !== carousel) {
        return;
      }
      if (pinnedCarousel === carousel) {
        showTagTooltip(carousel, event, true);
        return;
      }
      positionTagTooltip(event.clientX, event.clientY);
    });

    carousel.addEventListener('mouseleave', () => {
      cancelTagTooltipPin();
      if (pinnedCarousel === carousel) {
        return;
      }
      hideTagTooltip(false);
    });

    carousel.addEventListener('click', event => {
      event.preventDefault();
      event.stopPropagation();
      hideMetaTooltip(true);

      if (pinnedCarousel === carousel) {
        hideTagTooltip(true);
        return;
      }

      if (pinnedCarousel) {
        pinnedCarousel.classList.remove('is-meta-active');
      }
      pinnedCarousel = carousel;
      carousel.classList.add('is-meta-active');
      showTagTooltip(carousel, event, true);
    });
  }

  const FAKE_META = [
    { created: 'Feb 27, 2026', edited: '4h ago' },
    { created: 'Feb 26, 2026', edited: '1 day ago' },
    { created: 'Mar 1, 2026', edited: '12 min ago' },
    { created: 'Jan 14, 2026', edited: '3 days ago' },
    { created: 'Feb 1, 2026', edited: '2h ago' },
    { created: 'Mar 1, 2026', edited: 'Just now' },
  ];

  const metadataStates = new WeakMap();
  const metadataPagers = new WeakMap();

  const DEMO_DATA = [
    {
      title: 'Northwind Parcel',
      description: 'Container preview with route and processing summary.',
      metadata: {
        created: 'Feb 27, 2026',
        lastEdited: '4h ago',
        status: 'Queued',
        priority: 'High',
        tags: ['Queued', '12 items', 'ETA 14m', 'Cold chain'],
        checkpoints: ['Dock A', 'Transit', 'Sorter', 'Outbound'],
        owner: { lead: 'Lina', reviewer: 'Maks' }
      }
    },
    {
      title: 'Atlas Field Notes',
      description: 'Snapshot card with preview block and metadata.',
      metadata: {
        created: 'Feb 23, 2026',
        lastEdited: '1 day ago',
        status: 'Draft',
        priority: 'Normal',
        tags: ['Draft', 'Owner Lina', 'v3', 'Survey'],
        checkpoints: ['Intake', 'Annotate', 'Review'],
        owner: { lead: 'Lina', reviewer: 'Noah' }
      }
    },
    {
      title: 'Ops Camera Feed',
      description: 'Visual item list entry with compact support metadata.',
      metadata: {
        created: 'Mar 1, 2026',
        lastEdited: '12 min ago',
        status: 'Live',
        priority: 'Critical',
        tags: ['Live', '4 alerts', 'West dock', 'Night shift'],
        checkpoints: ['Lens check', 'Signal', 'Archive'],
        owner: { lead: 'Rhea', reviewer: 'Kai' }
      }
    },
    {
      title: 'Beacon Relay Logs',
      description: 'Transmission diagnostics and packet integrity scores.',
      metadata: {
        created: 'Feb 20, 2026',
        lastEdited: '2h ago',
        status: 'Stable',
        priority: 'Normal',
        tags: ['Relay', 'Packet loss 0.2%', 'Sector 7'],
        checkpoints: ['Ingress', 'Normalize', 'Emit'],
        owner: { lead: 'Sora', reviewer: 'Tao' }
      }
    },
    {
      title: 'Harbor Shift Board',
      description: 'Shift assignments with role and handoff markers.',
      metadata: {
        created: 'Feb 22, 2026',
        lastEdited: '5h ago',
        status: 'Active',
        priority: 'High',
        tags: ['Shift', '26 staff', 'Dock cluster C'],
        checkpoints: ['Morning', 'Swing', 'Night'],
        owner: { lead: 'Anya', reviewer: 'Milo' }
      }
    },
    {
      title: 'Incident Bundle 42',
      description: 'Linked snapshots and timeline notes for triage.',
      metadata: {
        created: 'Feb 19, 2026',
        lastEdited: '3 days ago',
        status: 'Escalated',
        priority: 'Critical',
        tags: ['Escalated', '17 files', 'Tier 2'],
        checkpoints: ['Collect', 'Correlate', 'Assign'],
        owner: { lead: 'Vera', reviewer: 'Eli' }
      }
    },
    {
      title: 'Polar Route Map',
      description: 'Route alternatives scored by weather and congestion.',
      metadata: {
        created: 'Feb 11, 2026',
        lastEdited: '8h ago',
        status: 'Planning',
        priority: 'Normal',
        tags: ['Map', '6 options', 'Weather aware'],
        checkpoints: ['Forecast', 'Score', 'Select'],
        owner: { lead: 'Ari', reviewer: 'Nia' }
      }
    },
    {
      title: 'Audit Ledger Stream',
      description: 'Hash-linked entries with compliance annotations.',
      metadata: {
        created: 'Feb 5, 2026',
        lastEdited: '45 min ago',
        status: 'Live',
        priority: 'High',
        tags: ['Ledger', 'Signed', 'Immutable'],
        checkpoints: ['Write', 'Sign', 'Replicate'],
        owner: { lead: 'Jun', reviewer: 'Sara' }
      }
    },
    {
      title: 'Thermal Sensor Mesh',
      description: 'Edge node thermal readings and anomaly windows.',
      metadata: {
        created: 'Feb 16, 2026',
        lastEdited: '2 days ago',
        status: 'Monitoring',
        priority: 'Normal',
        tags: ['Sensors', '32 nodes', 'Anomaly x2'],
        checkpoints: ['Poll', 'Smooth', 'Alert'],
        owner: { lead: 'Uma', reviewer: 'Finn' }
      }
    },
    {
      title: 'Dockside Manifest',
      description: 'Manifest cards grouped by gate and vehicle class.',
      metadata: {
        created: 'Feb 9, 2026',
        lastEdited: '6h ago',
        status: 'Queued',
        priority: 'High',
        tags: ['Manifest', 'Gate 4', '11 trucks'],
        checkpoints: ['Check-in', 'Inspect', 'Dispatch'],
        owner: { lead: 'Ivo', reviewer: 'Bea' }
      }
    },
    {
      title: 'Signal Cleanup Batch',
      description: 'Noise suppression run with quality deltas.',
      metadata: {
        created: 'Feb 13, 2026',
        lastEdited: '30 min ago',
        status: 'Processing',
        priority: 'Normal',
        tags: ['DSP', 'Batch 9', 'Q +12%'],
        checkpoints: ['Capture', 'Filter', 'Merge'],
        owner: { lead: 'Yuri', reviewer: 'Pia' }
      }
    },
    {
      title: 'Route Closure Notices',
      description: 'Time-bounded closure notices with fallback lanes.',
      metadata: {
        created: 'Mar 2, 2026',
        lastEdited: 'Just now',
        status: 'Updated',
        priority: 'Critical',
        tags: ['Closure', 'North tunnel', 'Fallback live'],
        checkpoints: ['Detect', 'Publish', 'Notify'],
        owner: { lead: 'Zed', reviewer: 'Mara' }
      }
    },
  ];

  function metaText(value) {
    if (value === null || value === undefined) {
      return 'n/a';
    }
    if (typeof value === 'object') {
      return JSON.stringify(value);
    }
    return String(value);
  }

  function metaValueKind(value) {
    if (Array.isArray(value)) {
      return 'array';
    }
    if (value !== null && typeof value === 'object') {
      return 'object';
    }
    return 'single';
  }

  function parseCardMetadata(card, cardIndex) {
    const raw = card.dataset.metadata;
    if (typeof raw === 'string' && raw.trim().length > 0) {
      try {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          return parsed;
        }
      } catch (err) {
        /* keep fallback metadata for malformed card payloads */
      }
    }

    const fallback = FAKE_META[cardIndex % FAKE_META.length];
    const tags = [...card.querySelectorAll('.mod-meta-row .mod-meta-pill')].map(p => p.textContent || '');
    return {
      created: fallback.created,
      lastEdited: fallback.edited,
      tags
    };
  }

  function makeDataCard(entry) {
    const card = document.createElement('article');
    card.className = 'mod-data-card';
    card.dataset.metadata = JSON.stringify(entry.metadata);

    const preview = document.createElement('div');
    preview.className = 'mod-preview';

    const main = document.createElement('div');
    main.className = 'mod-data-main';

    const h3 = document.createElement('h3');
    h3.textContent = entry.title;

    const p = document.createElement('p');
    p.textContent = entry.description;

    const row = document.createElement('div');
    row.className = 'mod-meta-row';
    (entry.metadata.tags || []).slice(0, 3).forEach(tag => {
      const pill = document.createElement('span');
      pill.className = 'mod-meta-pill';
      pill.textContent = String(tag);
      row.appendChild(pill);
    });

    main.appendChild(h3);
    main.appendChild(p);
    main.appendChild(row);
    card.appendChild(preview);
    card.appendChild(main);
    return card;
  }

  function seedCardContent(card, entry) {
    card.dataset.metadata = JSON.stringify(entry.metadata);

    const h3 = card.querySelector('.mod-data-main h3');
    const p = card.querySelector('.mod-data-main p');
    if (h3) {
      h3.textContent = entry.title;
    }
    if (p) {
      p.textContent = entry.description;
    }

    let row = card.querySelector('.mod-meta-row');
    if (!row) {
      row = document.createElement('div');
      row.className = 'mod-meta-row';
      card.querySelector('.mod-data-main')?.appendChild(row);
    }
    row.innerHTML = '';
    (entry.metadata.tags || []).slice(0, 3).forEach(tag => {
      const pill = document.createElement('span');
      pill.className = 'mod-meta-pill';
      pill.textContent = String(tag);
      row.appendChild(pill);
    });
  }

  function ensureDemoData(dataList) {
    if (dataList.dataset.demoFilled === 'true') {
      return;
    }
    const cards = [...dataList.querySelectorAll('.mod-data-card')];
    cards.forEach((card, i) => {
      const entry = DEMO_DATA[i % DEMO_DATA.length];
      seedCardContent(card, entry);
    });

    for (let i = cards.length; i < DEMO_DATA.length; i++) {
      dataList.appendChild(makeDataCard(DEMO_DATA[i]));
    }

    dataList.dataset.demoFilled = 'true';
  }

  function collectMetadataSchema(dataList) {
    const schema = new Map();
    const cards = [...dataList.querySelectorAll('.mod-data-card')];

    cards.forEach((card, i) => {
      const metadata = parseCardMetadata(card, i);
      Object.entries(metadata).forEach(([field, value]) => {
        const kind = metaValueKind(value);
        if (!schema.has(field)) {
          schema.set(field, {
            field,
            kind,
            maxLength: kind === 'array' ? value.length : 0,
            objectKeys: kind === 'object' ? new Set(Object.keys(value)) : new Set()
          });
          return;
        }

        const descriptor = schema.get(field);
        if (!descriptor) {
          return;
        }
        if (descriptor.kind === 'array' && Array.isArray(value)) {
          descriptor.maxLength = Math.max(descriptor.maxLength, value.length);
        }
        if (descriptor.kind === 'object' && value && typeof value === 'object' && !Array.isArray(value)) {
          Object.keys(value).forEach(key => descriptor.objectKeys.add(key));
        }
      });
    });

    return schema;
  }

  function defaultMultiSelection(field, descriptor) {
    if (field === 'tags') {
      return 'carousel';
    }

    if (descriptor.kind === 'array') {
      return descriptor.maxLength > 0 ? 'index:0' : 'carousel';
    }

    if (descriptor.kind === 'object') {
      const keys = [...descriptor.objectKeys];
      return keys.length > 0 ? `field:${keys[0]}` : 'carousel';
    }

    return 'carousel';
  }

  function ensureMetadataState(dataList) {
    const previous = metadataStates.get(dataList);
    const schema = collectMetadataSchema(dataList);
    const state = {
      schema,
      singles: new Map(),
      multis: new Map(),
      multiEnabled: new Map()
    };

    schema.forEach((descriptor, field) => {
      if (descriptor.kind === 'single') {
        const prev = previous?.singles.get(field);
        state.singles.set(field, prev === undefined ? true : prev);
        return;
      }

      const prev = previous?.multis.get(field);
      const prevEnabled = previous?.multiEnabled?.get(field);
      state.multis.set(field, prev || defaultMultiSelection(field, descriptor));
      state.multiEnabled.set(field, prevEnabled === undefined ? true : prevEnabled);
    });

    metadataStates.set(dataList, state);
    return state;
  }

  function buildDateRow(metadata, cardIndex) {
    const fallback = FAKE_META[cardIndex % FAKE_META.length];
    const created = metadata.created || fallback.created;
    const edited = metadata.lastEdited || fallback.edited;
    const row = document.createElement('div');
    row.className = 'mod-date-row';
    row.innerHTML =
      `<span class="mod-date-item"><span class="mod-date-label">Created</span>${created}</span>` +
      `<span class="mod-date-item"><span class="mod-date-label">Edited</span>${edited}</span>`;
    return row;
  }

  function syncDateRow(main, metadata, cardIndex) {
    const existing = main.querySelector('.mod-date-row');
    const next = buildDateRow(metadata, cardIndex);
    if (!existing) {
      main.appendChild(next);
      return;
    }
    existing.innerHTML = next.innerHTML;
  }

  function carouselValuesOf(value) {
    if (Array.isArray(value)) {
      return value.map(item => metaText(item));
    }
    if (value && typeof value === 'object') {
      return Object.values(value).map(v => metaText(v));
    }
    return [metaText(value)];
  }

  function selectedValueOf(value, mode) {
    if (mode === 'carousel') {
      return null;
    }
    if (Array.isArray(value) && mode.startsWith('index:')) {
      const idx = parseInt(mode.slice('index:'.length), 10);
      if (Number.isNaN(idx) || idx < 0 || idx >= value.length) {
        return null;
      }
      return metaText(value[idx]);
    }
    if (value && typeof value === 'object' && !Array.isArray(value) && mode.startsWith('field:')) {
      const key = mode.slice('field:'.length);
      if (!(key in value)) {
        return null;
      }
      return metaText(value[key]);
    }
    return null;
  }

  function createMetaValueLabel(text) {
    const value = document.createElement('span');
    value.className = 'mod-meta-value';
    value.textContent = text;
    return value;
  }

  function createMetaPill(text, options = {}) {
    const pill = document.createElement('span');
    pill.className = 'mod-meta-pill';
    const field = options.field || 'metadata';
    if (options.role === 'name') {
      pill.classList.add('mod-meta-name-pill');
    }
    pill.dataset.metaField = field;
    pill.dataset.metaValue = text;
    pill.appendChild(createMetaValueLabel(text));
    pill.setAttribute('aria-label', `${field}: ${text}`);
    if (options.tooltip !== false) {
      attachMetaFieldHover(pill);
    }
    return pill;
  }

  function createEditedMetaItem(text) {
    const item = document.createElement('span');
    item.className = 'mod-date-item mod-hybrid-edited';
    item.dataset.metaField = 'lastEdited';
    item.dataset.metaValue = text;
    item.appendChild(createMetaValueLabel(text));
    item.setAttribute('aria-label', `lastEdited: ${text}`);
    attachMetaFieldHover(item);
    return item;
  }

  function createCardGraphSlot(card, cardIndex) {
    const config = cardGraphConfig(card, cardIndex);
    if (!config) {
      return null;
    }

    const slot = document.createElement('div');
    const widget = document.createElement('div');
    slot.className = 'mod-card-graph-slot';
    slot.dataset.metaField = 'graph';
    slot.dataset.metaValue = config.title;
    slot.setAttribute('aria-label', `${config.title} graph preview`);

    widget.className = 'mod-graph-widget mod-card-graph-widget';
    widget.dataset.graphWidget = '';
    widget.dataset.graphDisplay = 'background';
    widget.dataset.graphTooltip = 'false';
    widget.dataset.graphKind = config.kind;
    widget.dataset.graphTitle = config.title;
    widget.dataset.graphPayload = JSON.stringify(config.payload || {});
    slot.appendChild(widget);
    return slot;
  }

  function captureLegacyCardGraph(card, cardIndex) {
    const config = cardGraphConfig(card, cardIndex);
    const layer = card.querySelector('.mod-card-graph-layer');
    if (layer) {
      layer.innerHTML = '';
    }
    return config;
  }

  function stopOverflowTicker(valueTrack) {
    const cycle = valueTrack._overflowCycle;
    if (cycle) {
      if (cycle.timer) {
        window.clearTimeout(cycle.timer);
      }
      if (cycle.raf) {
        window.cancelAnimationFrame(cycle.raf);
      }
      if (cycle.onEnd) {
        valueTrack.removeEventListener('transitionend', cycle.onEnd);
      }
      valueTrack._overflowCycle = null;
    }

    valueTrack.classList.remove('is-overflow-rotating');
    valueTrack.style.transition = 'none';
    valueTrack.style.transform = 'translateX(0)';
  }

  function startOverflowTicker(valueTrack, distance, forwardMs) {
    const cycle = {
      distance,
      forwardMs,
      phase: 'idle',
      timer: 0,
      raf: 0,
      onEnd: null
    };
    valueTrack._overflowCycle = cycle;
    valueTrack.classList.add('is-overflow-rotating');

    function runForward() {
      if (valueTrack._overflowCycle !== cycle) {
        return;
      }
      valueTrack.style.transition = 'none';
      valueTrack.style.transform = 'translateX(0)';
      cycle.raf = window.requestAnimationFrame(() => {
        if (valueTrack._overflowCycle !== cycle) {
          return;
        }
        cycle.phase = 'forward';
        valueTrack.style.transition = `transform ${forwardMs}ms linear`;
        valueTrack.style.transform = `translateX(${-distance}px)`;
      });
    }

    cycle.onEnd = event => {
      if (event.target !== valueTrack || event.propertyName !== 'transform') {
        return;
      }
      if (valueTrack._overflowCycle !== cycle) {
        return;
      }

      if (cycle.phase === 'forward') {
        cycle.phase = 'return';
        valueTrack.style.transition = 'transform 200ms ease';
        valueTrack.style.transform = 'translateX(0)';
        return;
      }

      if (cycle.phase === 'return') {
        cycle.phase = 'idle';
        cycle.timer = window.setTimeout(runForward, 0);
      }
    };

    valueTrack.addEventListener('transitionend', cycle.onEnd);
    runForward();
  }

  function syncOverflowTicker(fieldEl) {
    const valueTrack = fieldEl.querySelector('.mod-meta-value');
    if (!valueTrack) {
      return;
    }

    const styles = window.getComputedStyle(fieldEl);
    const paddingLeft = parseFloat(styles.paddingLeft || '0') || 0;
    const paddingRight = parseFloat(styles.paddingRight || '0') || 0;
    const availableWidth = Math.max(0, fieldEl.clientWidth - paddingLeft - paddingRight);
    if (availableWidth <= 0) {
      stopOverflowTicker(valueTrack);
      return;
    }

    const contentWidth = Math.ceil(valueTrack.scrollWidth);
    const distance = Math.ceil(contentWidth - availableWidth);
    if (distance <= 1) {
      stopOverflowTicker(valueTrack);
      return;
    }

    const forwardMs = Math.round(Math.max(4000, Math.min(14000, (distance / 10) * 1000)));
    const running = valueTrack._overflowCycle;
    if (running && running.distance === distance && running.forwardMs === forwardMs) {
      return;
    }

    stopOverflowTicker(valueTrack);
    startOverflowTicker(valueTrack, distance, forwardMs);
  }

  function syncMetadataOverflow(dataList) {
    dataList.querySelectorAll('.mod-selected-meta-row .mod-meta-pill, .mod-selected-meta-row .mod-date-item').forEach(fieldEl => {
      syncOverflowTicker(fieldEl);
    });
  }

  function createMetaCarousel(field, values) {
    const carousel = document.createElement('div');
    carousel.className = 'mod-tag-carousel';
    carousel.dataset.metaField = field;

    const track = document.createElement('div');
    track.className = 'mod-carousel-track';
    values.forEach(value => {
      track.appendChild(createMetaPill(value, { field, tooltip: false }));
    });

    carousel.appendChild(track);
    attachCarouselHover(carousel);
    registerCarousel(carousel);
    return carousel;
  }

  function ensureSelectedMetaContainer(main) {
    let wrap = main.querySelector('.mod-selected-meta-wrap');
    if (!wrap) {
      wrap = document.createElement('div');
      wrap.className = 'mod-selected-meta-wrap';
      main.appendChild(wrap);
    }

    let row = wrap.querySelector('.mod-selected-meta-row');
    if (!row) {
      row = document.createElement('div');
      row.className = 'mod-selected-meta-row';
      wrap.appendChild(row);
    }

    let toggle = wrap.querySelector('.mod-meta-scroll-toggle');
    if (!toggle) {
      toggle = document.createElement('button');
      toggle.type = 'button';
      toggle.className = 'mod-meta-scroll-toggle';
      toggle.textContent = '>';
      wrap.appendChild(toggle);
    }

    if (toggle.dataset.bound !== 'true') {
      toggle.dataset.bound = 'true';
      toggle.addEventListener('click', () => {
        const card = toggle.closest('.mod-data-card');
        if (!card) {
          return;
        }
        const pager = metadataPagers.get(card);
        if (!pager || pager.pages.length <= 1) {
          return;
        }
        pager.index = (pager.index + 1) % pager.pages.length;
        applyMetadataPage(card, pager);
      });
    }

    return { wrap, row, toggle };
  }

  function metadataGap(row) {
    const styles = window.getComputedStyle(row);
    return parseFloat(styles.columnGap || styles.gap || '0');
  }

  function computeMetadataPagesHorizontal(row, items, reservedWidth = 0) {
    const width = Math.max(0, row.clientWidth - reservedWidth);
    if (items.length <= 1 || width <= 0) {
      return [items];
    }

    const pages = [];
    const gap = metadataGap(row);
    let page = [];
    let used = 0;

    items.forEach(item => {
      const itemWidth = Math.ceil(item.getBoundingClientRect().width);
      if (page.length === 0) {
        page = [item];
        used = itemWidth;
        return;
      }

      if (used + gap + itemWidth <= width + 1) {
        page.push(item);
        used += gap + itemWidth;
        return;
      }

      pages.push(page);
      page = [item];
      used = itemWidth;
    });

    if (page.length > 0) {
      pages.push(page);
    }
    return pages.length > 0 ? pages : [items];
  }

  function computeMetadataPagesVertical(row, items, reservedHeight = 0) {
    const height = Math.max(0, row.clientHeight - reservedHeight);
    if (items.length <= 1 || height <= 0) {
      return [items];
    }

    const pages = [];
    const gap = metadataGap(row);
    let page = [];
    let used = 0;

    items.forEach(item => {
      const itemHeight = Math.ceil(item.getBoundingClientRect().height);
      if (page.length === 0) {
        page = [item];
        used = itemHeight;
        return;
      }

      if (used + gap + itemHeight <= height + 1) {
        page.push(item);
        used += gap + itemHeight;
        return;
      }

      pages.push(page);
      page = [item];
      used = itemHeight;
    });

    if (page.length > 0) {
      pages.push(page);
    }
    return pages.length > 0 ? pages : [items];
  }

  function nameMetaCellOf(row) {
    return row.querySelector('.mod-meta-name-pill');
  }

  function applyMetadataPage(card, pager) {
    const row = card.querySelector('.mod-selected-meta-row');
    const toggle = card.querySelector('.mod-meta-scroll-toggle');
    if (!row || !toggle) {
      return;
    }

    const items = [...row.children];
    const pinnedName = nameMetaCellOf(row);
    items.forEach(item => item.classList.remove('is-meta-overflow-hidden'));

    if (pager.pages.length <= 1) {
      toggle.classList.remove('is-visible');
      toggle.title = 'More metadata';
      requestAnimationFrame(() => {
        items.forEach(item => syncOverflowTicker(item));
      });
      return;
    }

    const visible = new Set(pager.pages[pager.index] || []);
    if (pinnedName) {
      visible.add(pinnedName);
    }
    items.forEach(item => {
      if (!visible.has(item)) {
        item.classList.add('is-meta-overflow-hidden');
      }
    });

    toggle.classList.add('is-visible');
    toggle.title = `Metadata page ${pager.index + 1}/${pager.pages.length}`;
    requestAnimationFrame(() => {
      items.forEach(item => syncOverflowTicker(item));
    });
  }

  function updateMetadataPagerForCard(card, dataList) {
    const row = card.querySelector('.mod-selected-meta-row');
    const toggle = card.querySelector('.mod-meta-scroll-toggle');
    if (!row || !toggle) {
      return;
    }

    const view = dataList.dataset.view || 'details';
    row.querySelectorAll('.is-meta-overflow-hidden').forEach(item => {
      item.classList.remove('is-meta-overflow-hidden');
    });

    const items = [...row.children];
    const pinnedName = nameMetaCellOf(row);
    const pageableItems = items.filter(item => item !== pinnedName);
    if (pageableItems.length <= 1) {
      metadataPagers.delete(card);
      toggle.classList.remove('is-visible');
      return;
    }

    const isCardMode = view === 'cards';
    toggle.textContent = isCardMode ? 'v' : '>';

    let pages = [];
    if (isCardMode) {
      let reservedHeight = 0;
      if (pinnedName) {
        reservedHeight = Math.ceil(pinnedName.getBoundingClientRect().height) + metadataGap(row);
      }
      pages = computeMetadataPagesVertical(row, pageableItems, reservedHeight);
    } else {
      let reservedWidth = 0;
      if (pinnedName) {
        reservedWidth = Math.ceil(pinnedName.getBoundingClientRect().width) + metadataGap(row);
      }
      pages = computeMetadataPagesHorizontal(row, pageableItems, reservedWidth);
    }
    const pager = metadataPagers.get(card) || { index: 0, pages: [] };
    pager.pages = pages;
    if (pager.index >= pages.length) {
      pager.index = 0;
    }
    metadataPagers.set(card, pager);
    applyMetadataPage(card, pager);
  }

  function updateMetadataPagers(dataList) {
    dataList.querySelectorAll('.mod-data-card').forEach(card => {
      updateMetadataPagerForCard(card, dataList);
    });
    syncMetadataOverflow(dataList);
  }

  function resolveCardName(card, main, metadata, cardIndex) {
    const explicit = card.dataset.dataName;
    if (typeof explicit === 'string' && explicit.trim().length > 0) {
      return explicit.trim();
    }

    const heading = main.querySelector('h3')?.textContent?.trim();
    if (heading) {
      return heading;
    }

    const fallbackMeta = [metadata.filename, metadata.name, metadata.title]
      .find(value => typeof value === 'string' && value.trim().length > 0);
    if (fallbackMeta) {
      return fallbackMeta.trim();
    }

    return `Entry ${cardIndex + 1}`;
  }

  function syncMetadataPresentation(dataList) {
    const state = ensureMetadataState(dataList);
    const cards = [...dataList.querySelectorAll('.mod-data-card')];

    dataList.querySelectorAll('.mod-tag-carousel').forEach(unregisterCarousel);
    hideTagTooltip(true);
    hideMetaTooltip(true);

    cards.forEach((card, i) => {
      const main = card.querySelector('.mod-data-main');
      if (!main) {
        return;
      }
      const metadata = parseCardMetadata(card, i);
      captureLegacyCardGraph(card, i);
      const { wrap, row } = ensureSelectedMetaContainer(main);
      row.querySelectorAll('.mod-meta-value').forEach(stopOverflowTicker);
      row.innerHTML = '';

      const legacyDateRow = main.querySelector('.mod-date-row');
      const legacyMetaRow = main.querySelector('.mod-meta-row');
      const legacyHybridRow = main.querySelector('.mod-hybrid-row');
      if (legacyDateRow) {
        legacyDateRow.remove();
      }
      if (legacyMetaRow) {
        legacyMetaRow.remove();
      }
      if (legacyHybridRow) {
        legacyHybridRow.remove();
      }

      const cardName = resolveCardName(card, main, metadata, i);
      row.appendChild(createMetaPill(cardName, { field: 'name', role: 'name' }));

      const showEdited = state.singles.has('lastEdited') ? state.singles.get('lastEdited') : true;
      if (showEdited) {
        const edited = metadata.lastEdited || FAKE_META[i % FAKE_META.length].edited;
        row.appendChild(createEditedMetaItem(edited));
      }

      const graphSlot = createCardGraphSlot(card, i);
      if (graphSlot) {
        row.appendChild(graphSlot);
      }

      const orderedFields = [...state.schema.entries()].sort(([a], [b]) => {
        if (a === 'tags') {
          return -1;
        }
        if (b === 'tags') {
          return 1;
        }
        return 0;
      });

      orderedFields.forEach(([field, descriptor]) => {
        const value = metadata[field];
        if (value === undefined) {
          return;
        }
        if (field === 'lastEdited' || field === 'name' || field === 'title' || field === 'filename') {
          return;
        }

        if (descriptor.kind === 'single') {
          if (!state.singles.get(field)) {
            return;
          }
          row.appendChild(createMetaPill(metaText(value), { field }));
          return;
        }

        const isEnabled = state.multiEnabled.has(field) ? state.multiEnabled.get(field) : true;
        if (!isEnabled) {
          return;
        }

        const mode = state.multis.get(field) || defaultMultiSelection(field, descriptor);
        if (mode === 'carousel') {
          const values = carouselValuesOf(value);
          if (values.length > 0) {
            row.appendChild(createMetaCarousel(field, values));
          }
          return;
        }

        const selected = selectedValueOf(value, mode);
        if (selected !== null) {
          row.appendChild(createMetaPill(selected, { field }));
        }
      });

      wrap.hidden = row.childElementCount === 0;
    });

    requestAnimationFrame(() => {
      window.HestiaGraphWidgets?.init?.(dataList);
      syncDataNameModePresentation(dataList);
      updateMetadataPagers(dataList);
      syncMetadataOverflow(dataList);
    });
  }

  function applyMetaView(dataList, mode) {
    dataList.dataset.metaView = mode;
    syncMetadataPresentation(dataList);
    if (mode === 'hybrid') {
      dataList.querySelectorAll('.mod-selected-meta-row .mod-tag-carousel').forEach(registerCarousel);
      return;
    }
    dataList.querySelectorAll('.mod-tag-carousel').forEach(unregisterCarousel);
    hideTagTooltip(true);
  }

  function buildMetadataDropdown(switcher, dataList) {
    const dropdown = document.createElement('div');
    dropdown.className = 'mod-meta-dropdown mod-meta-field-dropdown';

    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'mod-meta-toggle';
    toggle.title = 'Metadata field display';
    toggle.innerHTML = '<span class="mod-view-icon">☷</span>';

    function closeDropdown() {
      dropdown.classList.remove('is-open');
      toggle.classList.remove('is-open');
    }

    function refreshData() {
      applyMetaView(dataList, dataList.dataset.metaView || 'hybrid');
    }

    function getLiveState() {
      return metadataStates.get(dataList) || ensureMetadataState(dataList);
    }

    function syncCarouselSelectState(select) {
      select.classList.toggle('is-carousel-selected', select.value === 'carousel');
    }

    function buildOptions(descriptor) {
      const opts = [{ value: 'carousel', label: 'Carousel' }];
      if (descriptor.kind === 'array') {
        for (let i = 0; i < descriptor.maxLength; i++) {
          opts.push({ value: `index:${i}`, label: `Index ${i}` });
        }
      }
      if (descriptor.kind === 'object') {
        [...descriptor.objectKeys].sort().forEach(key => {
          opts.push({ value: `field:${key}`, label: key });
        });
      }
      return opts;
    }

    function renderRows() {
      const state = getLiveState();
      dropdown.innerHTML = '';

      const nameModeRow = document.createElement('div');
      nameModeRow.className = 'mod-meta-field-row';

      const nameModeLabel = document.createElement('span');
      nameModeLabel.className = 'mod-meta-field-name';
      nameModeLabel.textContent = 'name mode';

      const nameModeSelect = document.createElement('select');
      nameModeSelect.className = 'mod-meta-field-select';
      [
        { value: 'auto', label: 'Auto' },
        { value: 'hover', label: 'Hover' },
        { value: 'extended', label: 'Extended' }
      ].forEach(opt => {
        const option = document.createElement('option');
        option.value = opt.value;
        option.textContent = opt.label;
        nameModeSelect.appendChild(option);
      });
      nameModeSelect.value = getDataNameMode(dataList);
      nameModeSelect.addEventListener('change', () => {
        dataList.dataset.nameMode = normalizeDataNameMode(nameModeSelect.value);
        refreshData();
      });

      nameModeRow.appendChild(nameModeLabel);
      nameModeRow.appendChild(nameModeSelect);
      dropdown.appendChild(nameModeRow);

      state.schema.forEach((descriptor, field) => {
        if (descriptor.kind === 'single') {
          const row = document.createElement('label');
          row.className = 'mod-meta-field-row mod-meta-field-check';

          const checkbox = document.createElement('input');
          checkbox.type = 'checkbox';
          checkbox.checked = state.singles.get(field) === true;
          checkbox.addEventListener('change', () => {
            const live = getLiveState();
            live.singles.set(field, checkbox.checked);
            refreshData();
          });

          const name = document.createElement('span');
          name.className = 'mod-meta-field-name';
          name.textContent = field;

          row.appendChild(checkbox);
          row.appendChild(name);
          dropdown.appendChild(row);
          return;
        }

        const row = document.createElement('div');
        row.className = 'mod-meta-field-row mod-meta-field-row-multi';

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.checked = state.multiEnabled.get(field) !== false;

        const name = document.createElement('span');
        name.className = 'mod-meta-field-name';
        name.textContent = field;

        const select = document.createElement('select');
        select.className = 'mod-meta-field-select';
        const options = buildOptions(descriptor);
        options.forEach(opt => {
          const option = document.createElement('option');
          option.value = opt.value;
          option.textContent = opt.label;
          if (opt.value === 'carousel') {
            option.classList.add('mod-meta-field-option-carousel');
            option.style.fontWeight = '700';
          }
          select.appendChild(option);
        });

        const current = state.multis.get(field) || defaultMultiSelection(field, descriptor);
        select.value = options.some(opt => opt.value === current) ? current : options[0].value;
        state.multis.set(field, select.value);
        syncCarouselSelectState(select);

        function syncMultiRowState() {
          row.classList.toggle('is-disabled', !checkbox.checked);
          select.disabled = !checkbox.checked;
        }

        checkbox.addEventListener('change', () => {
          const live = getLiveState();
          live.multiEnabled.set(field, checkbox.checked);
          syncMultiRowState();
          refreshData();
        });

        select.addEventListener('change', () => {
          const live = getLiveState();
          live.multis.set(field, select.value);
          syncCarouselSelectState(select);
          refreshData();
        });

        row.appendChild(checkbox);
        row.appendChild(name);
        row.appendChild(select);
        syncMultiRowState();
        dropdown.appendChild(row);
      });
    }

    toggle.addEventListener('click', e => {
      e.stopPropagation();
      renderRows();
      const isOpen = dropdown.classList.contains('is-open');
      dropdown.classList.toggle('is-open', !isOpen);
      toggle.classList.toggle('is-open', !isOpen);
    });

    document.addEventListener('click', () => closeDropdown(), { capture: false });
    dropdown.addEventListener('click', e => e.stopPropagation());

    renderRows();
    switcher.appendChild(toggle);
    switcher.appendChild(dropdown);
  }

  function initViewSwitchers(root) {
    const views = [
      { id: 'list', icon: '☰', label: 'List' },
      { id: 'details', icon: '▤', label: 'Details' },
      { id: 'cards', icon: '▦', label: 'Cards' }
    ];

    function syncSwitcher(switcher, targetList, dataList, settingsGrid) {
      const activeView = targetList.dataset.view || 'details';
      switcher.querySelectorAll('.mod-view-btn').forEach(button => {
        button.classList.toggle('is-active', button.dataset.view === activeView);
      });

      if (dataList) {
        applyMetaView(dataList, dataList.dataset.metaView || 'hybrid');
      } else if (settingsGrid) {
        syncSettingsCardTitles(settingsGrid);
      }
    }

    root.querySelectorAll('.mod-content-frame').forEach(frame => {
      if (frame.dataset.skipViewSwitcher === 'true') {
        return;
      }

      const dataList = frame.querySelector('.mod-data-list');
      const settingsGrid = frame.querySelector('.mod-settings-grid');
      const targetList = dataList || settingsGrid;
      if (!targetList) {
        return;
      }

      if (dataList) {
        ensureDemoData(dataList);
      }
      const existingSwitcher = frame.querySelector('.mod-view-switcher');
      if (existingSwitcher) {
        syncSwitcher(existingSwitcher, targetList, dataList, settingsGrid);
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
          targetList.dataset.view = view.id;
          if (dataList) {
            applyMetaView(dataList, dataList.dataset.metaView || 'hybrid');
          } else if (settingsGrid) {
            syncSettingsCardTitles(settingsGrid);
          }
        });

        switcher.appendChild(btn);
      });

      if (dataList) {
        switcher.style.position = 'relative';
        buildMetadataDropdown(switcher, dataList);
      } else {
        switcher.classList.add('mod-view-switcher-simple');
        switcher.style.position = 'relative';
      }

      targetList.dataset.view = targetList.dataset.view || 'details';
      if (dataList) {
        dataList.dataset.metaView = dataList.dataset.metaView || 'hybrid';
      }
      syncSwitcher(switcher, targetList, dataList, settingsGrid);
      frame.appendChild(switcher);
    });
  }

  function init(root = document) {
    syncGridCssVars();
    root.querySelectorAll('[data-grid-box]').forEach(target => {
      setGridBoxDefaults(target);
      syncFrameMode(target);
    });
    root.querySelectorAll('[data-mod-edit-toggle]').forEach(button => {
      bindEditToggle(button);
    });
    root.querySelectorAll('[data-modular-menu]').forEach(menu => {
      if (menus.has(menu)) {
        menus.get(menu).refresh();
        return;
      }
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

    if (init.resizeBound !== true) {
      window.addEventListener('resize', () => {
        syncGridCssVars();
        document.querySelectorAll('[data-grid-box][data-module-kind]').forEach(frame => {
          syncFrameMode(frame);
        });
        document.querySelectorAll('.mod-data-list').forEach(dataList => {
          syncDataNameModePresentation(dataList);
          updateMetadataPagers(dataList);
          syncMetadataOverflow(dataList);
        });
      });
      init.resizeBound = true;
    }

    if (init.frameModeBound !== true) {
      const syncFrameFromEvent = event => {
        const target = event.detail?.target;
        if (!(target instanceof HTMLElement)) {
          return;
        }
        rememberFrameExpandedWidth(target);
        syncFrameMode(target);
      };

      window.addEventListener('hestia:grid-resize-end', syncFrameFromEvent);
      window.addEventListener('hestia:grid-drag-end', syncFrameFromEvent);
      init.frameModeBound = true;
    }
  }

  window.HestiaModularMenus = {
    init
  };
})();
