(() => {
  const MODULE_DEFINITIONS = [
    { kind: 'search', label: 'Search' },
    { kind: 'navigation', label: 'Navigation' },
    { kind: 'data', label: 'Data' },
    { kind: 'text', label: 'Text' },
    { kind: 'graph', label: 'Graph' },
    { kind: 'graph-widget', label: 'Graph Widget' },
    { kind: 'organizer', label: 'Organizer' },
    { kind: 'settings', label: 'Settings' },
    { kind: 'chat-history', label: 'Chat History' },
    { kind: 'chat-compose', label: 'Chat Input' }
  ];
  const MODULE_BY_KIND = new Map(MODULE_DEFINITIONS.map(def => [def.kind, def]));
  const DEFAULT_COUNTER_KEYS = [
    'chatEntryCounter',
    'organizerCardCounter',
    'graphNodeCounter',
    'graphConnectionCounter'
  ];
  const core = window.HestiaVerticalCore || (window.HestiaVerticalCore = {
    modules: {},
    state: {},
    helpers: {},
    workspace: {}
  });
  const workspace = core.workspace || (core.workspace = {});
  const moduleTemplates = workspace._moduleTemplates instanceof Map ? workspace._moduleTemplates : new Map();
  let moduleInstanceCounter = Number(workspace._moduleInstanceCounter || '0') || 0;

  Object.assign(core.state, {
    chatEntryCounter: Number(core.state.chatEntryCounter || '0') || 0,
    activeOrganizerMenu: core.state.activeOrganizerMenu || null,
    organizerCardCounter: Number(core.state.organizerCardCounter || '0') || 0,
    graphNodeCounter: Number(core.state.graphNodeCounter || '0') || 0,
    graphConnectionCounter: Number(core.state.graphConnectionCounter || '0') || 0
  });

  function updateModuleInstanceCounter(nextValue) {
    const value = Number(nextValue || '0') || 0;
    moduleInstanceCounter = Math.max(moduleInstanceCounter, value);
    workspace._moduleInstanceCounter = moduleInstanceCounter;
  }

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
      const kind = frame.dataset.moduleKind || '';
      if (!kind || moduleTemplates.has(kind)) {
        return;
      }
      moduleTemplates.set(kind, frame.cloneNode(true));
    });
    workspace._moduleTemplates = moduleTemplates;
  }

  function registerExistingModuleInstances(root = document) {
    moduleFrames(root).forEach(frame => {
      const existing = Number(frame.dataset.moduleInstance || '0') || 0;
      if (existing > 0) {
        updateModuleInstanceCounter(existing);
        return;
      }

      updateModuleInstanceCounter(moduleInstanceCounter + 1);
      frame.dataset.moduleInstance = String(moduleInstanceCounter);
    });
  }

  function nextModuleInstance() {
    updateModuleInstanceCounter(moduleInstanceCounter + 1);
    return moduleInstanceCounter;
  }

  function closeHistoryMenus(root = document) {
    core.modules.chat?.closeHistoryMenus?.(root);
  }

  function closeTagMenus(root = document) {
    core.modules.chat?.closeTagMenus?.(root);
  }

  function closeOrganizerMenus(root = document) {
    core.modules.organizer?.closeMenus?.(root);
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

  function closeTransientUi(root = document) {
    closeModuleAddMenu();
    workspace.closeStackContextMenu?.();
    workspace.closeAllMenuGroupLists?.();
    closeOrganizerMenus(root);
    closeHistoryMenus(root);
    closeTagMenus(root);
  }

  function frameInstanceId(frame) {
    return frame?.dataset?.moduleInstance || '';
  }

  function numberOrDefault(value, fallback = 0) {
    const parsed = parseFloat(`${value ?? ''}`);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  function captureFrameGeometry(frame) {
    return {
      gridCol: frame?.dataset?.gridCol || '0',
      gridRow: frame?.dataset?.gridRow || '0',
      gridWidth: frame?.dataset?.gridWidth || '0',
      gridHeight: frame?.dataset?.gridHeight || '0',
      left: frame?.style?.left || '',
      top: frame?.style?.top || '',
      width: frame?.style?.width || '',
      height: frame?.style?.height || ''
    };
  }

  function captureFramePresentation(frame) {
    return {
      mode: frame?.dataset?.moduleMode || 'extended',
      expandedWidth: frame?.dataset?.moduleExpandedWidth || frame?.style?.width || ''
    };
  }

  function applyFrameGeometry(frame, geometry = {}) {
    if (!frame || !geometry || typeof geometry !== 'object') {
      return;
    }

    ['gridCol', 'gridRow', 'gridWidth', 'gridHeight'].forEach(key => {
      if (geometry[key] !== undefined && geometry[key] !== null && `${geometry[key]}`.length > 0) {
        frame.dataset[key] = `${geometry[key]}`;
      }
    });

    ['left', 'top', 'width', 'height'].forEach(key => {
      if (geometry[key] === undefined || geometry[key] === null || `${geometry[key]}`.length === 0) {
        return;
      }
      frame.style[key] = `${geometry[key]}`;
    });
  }

  function applyFramePresentation(frame, presentation = {}) {
    if (!frame || !presentation || typeof presentation !== 'object') {
      return;
    }

    if (presentation.mode) {
      frame.dataset.moduleMode = `${presentation.mode}`;
    }
    if (presentation.expandedWidth) {
      frame.dataset.moduleExpandedWidth = `${presentation.expandedWidth}`;
    }
  }

  function rewriteIds(frame, suffix) {
    const idMap = new Map();
    const withIds = [frame, ...frame.querySelectorAll('[id]')]
      .filter(el => typeof el.id === 'string' && el.id.length > 0);

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
    const baseCol = numberOrDefault(frame.dataset.gridCol, 0);
    const baseRow = numberOrDefault(frame.dataset.gridRow, 0);
    const offset = siblingCount * 2;
    frame.dataset.gridCol = String(baseCol + offset);
    frame.dataset.gridRow = String(baseRow + offset);
  }

  function cloneModuleFrame(kind, options = {}) {
    const template = moduleTemplates.get(kind);
    if (!template) {
      return null;
    }

    const frame = template.cloneNode(true);
    const instance = options.instanceId ? String(options.instanceId) : String(nextModuleInstance());
    frame.dataset.moduleInstance = instance;
    updateModuleInstanceCounter(instance);
    rewriteIds(frame, instance);

    if (options.offset !== false) {
      offsetModuleClone(frame, kind);
    }

    return frame;
  }

  function initModuleScripts(root = document) {
    Object.values(core.modules).forEach(moduleApi => {
      moduleApi?.init?.(root);
    });
  }

  function cleanupModuleScripts(frame) {
    Object.values(core.modules).forEach(moduleApi => {
      moduleApi?.cleanupFrame?.(frame);
    });
  }

  function captureCoreState() {
    const snapshot = {};
    DEFAULT_COUNTER_KEYS.forEach(key => {
      snapshot[key] = Number(core.state[key] || '0') || 0;
    });
    return snapshot;
  }

  function restoreCoreState(snapshot = {}) {
    DEFAULT_COUNTER_KEYS.forEach(key => {
      if (snapshot[key] === undefined || snapshot[key] === null) {
        return;
      }
      core.state[key] = Number(snapshot[key] || '0') || 0;
    });
    core.state.activeOrganizerMenu = null;
  }

  function refreshMenus(root = document) {
    window.HestiaModularMenus?.init?.(root);
    window.HestiaGraphWidgets?.init?.(root);
  }

  function bootstrap() {
    collectModuleTemplates();
    registerExistingModuleInstances();
    refreshMenus();
    workspace.initModuleManager?.();
    workspace.initWorkspaceIo?.();
    initModuleScripts();
    workspace.bindStackUi?.();
    workspace.initStackGroups?.();
  }

  Object.assign(core.helpers, {
    moduleLabel,
    parseJsonObject,
    moduleFrames,
    demoShell,
    closeModuleAddMenu
  });

  Object.assign(workspace, {
    getModuleDefinitions() {
      return MODULE_DEFINITIONS.map(def => ({ ...def }));
    },
    moduleDefinitionByKind(kind) {
      return MODULE_BY_KIND.get(kind) || null;
    },
    moduleFrames,
    demoShell,
    moduleLabel,
    parseJsonObject,
    collectModuleTemplates,
    registerExistingModuleInstances,
    nextModuleInstance,
    closeModuleAddMenu,
    closeTransientUi,
    frameInstanceId,
    captureFrameGeometry,
    captureFramePresentation,
    applyFrameGeometry,
    applyFramePresentation,
    rewriteIds,
    cloneModuleFrame,
    initModuleScripts,
    cleanupModuleScripts,
    captureCoreState,
    restoreCoreState,
    refreshMenus,
    bootstrap
  });
})();
