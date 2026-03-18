(() => {
  const core = window.HestiaVerticalCore;
  if (!core?.workspace) {
    return;
  }

  const workspace = core.workspace;
  const WORKSPACE_SCHEMA = 'hestia.modular.workspace';
  const WORKSPACE_VERSION = 1;
  let currentFileHandle = null;

  function moduleApiForKind(kind) {
    return core.modules[kind] || null;
  }

  function workspaceStatusNode(root = document) {
    return root.querySelector('[data-workspace-status]');
  }

  function workspaceLoadInput(root = document) {
    return root.querySelector('[data-workspace-load-input]');
  }

  function setWorkspaceStatus(message, options = {}) {
    const status = workspaceStatusNode();
    if (!status) {
      return;
    }

    status.textContent = message;
    status.dataset.state = options.error === true ? 'error' : 'idle';
  }

  function captureFrameSnapshot(frame) {
    const kind = frame.dataset.moduleKind || '';
    const moduleApi = moduleApiForKind(kind);
    return {
      kind,
      instanceId: workspace.frameInstanceId(frame),
      geometry: workspace.captureFrameGeometry(frame),
      presentation: workspace.captureFramePresentation?.(frame) || {},
      state: moduleApi?.serializeFrame?.(frame) || {}
    };
  }

  function captureWorkspace() {
    return {
      schema: WORKSPACE_SCHEMA,
      version: WORKSPACE_VERSION,
      view: 'vertical-menu',
      savedAt: new Date().toISOString(),
      coreState: workspace.captureCoreState(),
      frames: workspace.moduleFrames().map(frame => captureFrameSnapshot(frame)),
      stacks: workspace.captureStackState?.() || {}
    };
  }

  function applyModuleState(frameSnapshot, phase) {
    const kind = frameSnapshot?.kind || '';
    const instanceId = `${frameSnapshot?.instanceId || ''}`;
    if (!kind || !instanceId) {
      return;
    }

    const frame = document.querySelector(`.demo-shell > [data-module-instance="${instanceId}"]`);
    if (!frame) {
      return;
    }

    const moduleApi = moduleApiForKind(kind);
    moduleApi?.restoreFrame?.(frame, frameSnapshot.state || {}, { phase, snapshot: frameSnapshot });
  }

  function validateWorkspaceSnapshot(snapshot) {
    if (!snapshot || typeof snapshot !== 'object' || Array.isArray(snapshot)) {
      throw new Error('Workspace file is not a valid JSON object.');
    }
    if (snapshot.schema !== WORKSPACE_SCHEMA) {
      throw new Error('Workspace file uses an unsupported schema.');
    }
    if (Number(snapshot.version || '0') > WORKSPACE_VERSION) {
      throw new Error('Workspace file was created with a newer format version.');
    }
  }

  function restoreWorkspace(snapshot) {
    validateWorkspaceSnapshot(snapshot);

    const shell = workspace.demoShell();
    if (!shell) {
      throw new Error('Workspace shell is missing.');
    }

    const frames = Array.isArray(snapshot.frames) ? snapshot.frames : [];
    const stackSnapshot = snapshot.stacks && typeof snapshot.stacks === 'object' ? snapshot.stacks : {};
    const hasSavedGroups = Array.isArray(stackSnapshot.groups) && stackSnapshot.groups.length > 0;

    workspace.closeTransientUi(document);
    workspace.clearWorkspaceFrames?.();
    workspace.restoreCoreState(snapshot.coreState || {});

    frames.forEach(frameSnapshot => {
      const kind = `${frameSnapshot?.kind || ''}`;
      if (!kind) {
        return;
      }

      const frame = workspace.cloneModuleFrame(kind, {
        offset: false,
        instanceId: frameSnapshot.instanceId || ''
      });
      if (!frame) {
        return;
      }

      workspace.applyFrameGeometry(frame, frameSnapshot.geometry || {});
      workspace.applyFramePresentation?.(frame, frameSnapshot.presentation || {});
      shell.appendChild(frame);
      applyModuleState(frameSnapshot, 'before-init');
    });

    workspace.refreshMenus(document);
    workspace.initModuleScripts(document);
    frames.forEach(frameSnapshot => {
      applyModuleState(frameSnapshot, 'after-init');
    });

    workspace.initStackGroups(document, { seedContent: !hasSavedGroups });
    if (hasSavedGroups) {
      workspace.restoreStackState?.(stackSnapshot);
    }

    workspace.renderModuleManager?.();
    setWorkspaceStatus(`Loaded ${frames.length} modules from workspace JSON.`);
  }

  function workspaceFileName(snapshot) {
    const stamp = `${snapshot.savedAt || ''}`.slice(0, 19).replace(/[:T]/g, '-');
    return `hestia-modular-${stamp || 'workspace'}.json`;
  }

  async function saveWorkspaceToFile() {
    const snapshot = captureWorkspace();
    const payload = `${JSON.stringify(snapshot, null, 2)}\n`;

    if (typeof window.showSaveFilePicker === 'function') {
      const handle = currentFileHandle || await window.showSaveFilePicker({
        suggestedName: workspaceFileName(snapshot),
        types: [
          {
            description: 'JSON',
            accept: {
              'application/json': ['.json']
            }
          }
        ]
      });
      const writable = await handle.createWritable();
      await writable.write(payload);
      await writable.close();
      currentFileHandle = handle;
      setWorkspaceStatus(`Saved ${snapshot.frames.length} modules to ${handle.name || 'workspace file'}.`);
      return snapshot;
    }

    const blob = new Blob([payload], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = workspaceFileName(snapshot);
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
    setWorkspaceStatus(`Downloaded ${snapshot.frames.length} modules as workspace JSON.`);
    return snapshot;
  }

  async function readWorkspaceFile(file) {
    const raw = await file.text();
    const snapshot = JSON.parse(raw);
    restoreWorkspace(snapshot);
    return snapshot;
  }

  async function loadWorkspaceFromFile() {
    if (typeof window.showOpenFilePicker === 'function') {
      const [handle] = await window.showOpenFilePicker({
        multiple: false,
        types: [
          {
            description: 'JSON',
            accept: {
              'application/json': ['.json']
            }
          }
        ]
      });
      if (!handle) {
        return null;
      }

      const file = await handle.getFile();
      const snapshot = await readWorkspaceFile(file);
      currentFileHandle = handle;
      setWorkspaceStatus(`Loaded ${snapshot.frames?.length || 0} modules from ${file.name}.`);
      return snapshot;
    }

    const input = workspaceLoadInput();
    if (!input) {
      throw new Error('Workspace file picker is unavailable.');
    }

    input.value = '';
    input.click();
    return null;
  }

  function bindWorkspaceIo(root = document) {
    const actions = root.querySelector('[data-workspace-actions]');
    if (!actions || actions.dataset.bound === 'true') {
      return;
    }

    actions.dataset.bound = 'true';
    const saveButton = actions.querySelector('[data-workspace-save]');
    const loadButton = actions.querySelector('[data-workspace-load]');
    const input = workspaceLoadInput(root);

    saveButton?.addEventListener('click', async () => {
      try {
        await saveWorkspaceToFile();
      } catch (err) {
        setWorkspaceStatus(err?.message || 'Failed to save workspace.', { error: true });
      }
    });

    loadButton?.addEventListener('click', async () => {
      try {
        await loadWorkspaceFromFile();
      } catch (err) {
        setWorkspaceStatus(err?.message || 'Failed to load workspace.', { error: true });
      }
    });

    input?.addEventListener('change', async event => {
      const file = event.target.files?.[0];
      if (!file) {
        return;
      }

      try {
        const snapshot = await readWorkspaceFile(file);
        currentFileHandle = null;
        setWorkspaceStatus(`Loaded ${snapshot.frames?.length || 0} modules from ${file.name}.`);
      } catch (err) {
        setWorkspaceStatus(err?.message || 'Failed to load workspace.', { error: true });
      }
    });
  }

  function initWorkspaceIo(root = document) {
    bindWorkspaceIo(root);
    if (!workspaceStatusNode(root)?.textContent?.trim()) {
      setWorkspaceStatus('Workspace JSON save/load is ready.');
    }
  }

  Object.assign(workspace, {
    captureWorkspace,
    restoreWorkspace,
    saveWorkspaceToFile,
    loadWorkspaceFromFile,
    initWorkspaceIo
  });
})();
