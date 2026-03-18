(() => {
  const core = window.HestiaVerticalCore;
  if (!core?.workspace) {
    return;
  }

  const workspace = core.workspace;

  function totalModuleCounts() {
    const totals = new Map();
    workspace.moduleFrames().forEach(frame => {
      const kind = frame.dataset.moduleKind || '';
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
    workspace.getModuleDefinitions().forEach(def => {
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

    workspace.moduleFrames(root).forEach(frame => {
      const kind = frame.dataset.moduleKind || '';
      const index = (seen.get(kind) || 0) + 1;
      seen.set(kind, index);

      const row = document.createElement('div');
      row.className = 'mod-module-row';

      const name = document.createElement('span');
      name.className = 'mod-module-row-name';
      name.textContent = totals.get(kind) > 1 ? `${workspace.moduleLabel(kind)} ${index}` : workspace.moduleLabel(kind);

      const remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'mod-module-row-remove';
      remove.dataset.moduleRemove = workspace.frameInstanceId(frame);
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

  function cleanupModuleFrame(frame) {
    workspace.closeAllMenuGroupLists?.();
    workspace.closeStackContextMenu?.();
    core.modules.organizer?.closeMenus?.(frame);
    core.modules.chat?.closeHistoryMenus?.(frame);
    core.modules.chat?.closeTagMenus?.(frame);
    workspace.cleanupModuleScripts(frame);
  }

  function clearWorkspaceFrames() {
    const shell = workspace.demoShell();
    if (!shell) {
      return;
    }

    workspace.closeTransientUi(document);
    workspace.moduleFrames().forEach(frame => {
      cleanupModuleFrame(frame);
    });
    workspace.resetStackState?.();
    shell.innerHTML = '';
    renderModuleManager();
  }

  function addModule(kind, options = {}) {
    const shell = workspace.demoShell();
    const frame = options.frame || workspace.cloneModuleFrame(kind, {
      offset: options.offset !== false,
      instanceId: options.instanceId || ''
    });

    if (!shell || !frame) {
      return null;
    }

    if (options.geometry) {
      workspace.applyFrameGeometry(frame, options.geometry);
    }

    shell.appendChild(frame);

    if (options.reinit !== false) {
      workspace.refreshMenus(document);
      workspace.initModuleScripts(document);
      workspace.initStackGroups(document);
      if (workspace.frameStackCategory(frame) === 'content') {
        workspace.stackContentFrameIntoPreferredGroup(frame, {
          activate: options.activate !== false
        });
      }
    }

    if (options.renderManager !== false) {
      renderModuleManager();
    }

    return frame;
  }

  function removeModule(instance, options = {}) {
    if (!instance) {
      return;
    }

    const frame = document.querySelector(`.demo-shell > [data-module-instance="${instance}"]`);
    if (!frame) {
      return;
    }

    workspace.unregisterFrameFromStacking?.(frame);
    cleanupModuleFrame(frame);
    frame.remove();

    if (options.reinit !== false) {
      workspace.initStackGroups(document);
    }
    if (options.renderManager !== false) {
      renderModuleManager();
    }
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
        workspace.closeModuleAddMenu(manager);
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
        workspace.closeModuleAddMenu(manager);
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
        workspace.closeModuleAddMenu(manager);
      }
    });

    renderModuleManager(root);
  }

  Object.assign(workspace, {
    totalModuleCounts,
    renderModuleManager,
    cleanupModuleFrame,
    clearWorkspaceFrames,
    addModule,
    removeModule,
    initModuleManager
  });
})();
