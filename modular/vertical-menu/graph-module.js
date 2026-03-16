(() => {
  const core = window.HestiaVerticalCore;
  if (!core) {
    return;
  }

  const NODE_TEMPLATES = [
    {
      kind: 'number',
      label: 'Number',
      subtitle: 'Numeric input',
      inputs: [],
      outputs: [{ key: 'value', label: 'Value', type: 'number' }],
      controls: [{ key: 'value', label: 'Value', type: 'number', value: 12, step: 'any' }]
    },
    {
      kind: 'boolean',
      label: 'Boolean',
      subtitle: 'True or false toggle',
      inputs: [],
      outputs: [{ key: 'value', label: 'Value', type: 'boolean' }],
      controls: [{ key: 'value', label: 'Enabled', type: 'checkbox', checked: true }]
    },
    {
      kind: 'string',
      label: 'String',
      subtitle: 'Text input',
      inputs: [],
      outputs: [{ key: 'value', label: 'Value', type: 'string' }],
      controls: [{ key: 'value', label: 'Text', type: 'text', value: 'Atlas summary', placeholder: 'Enter text' }]
    },
    {
      kind: 'url',
      label: 'URL',
      subtitle: 'Link input',
      inputs: [],
      outputs: [{ key: 'value', label: 'Value', type: 'string' }],
      controls: [{ key: 'value', label: 'URL', type: 'url', value: 'https://example.com', placeholder: 'https://...' }]
    },
    {
      kind: 'file',
      label: 'File',
      subtitle: 'File picker',
      inputs: [],
      outputs: [{ key: 'value', label: 'Name', type: 'string' }],
      controls: [{ key: 'value', label: 'Select file', type: 'file', value: '' }]
    },
    {
      kind: 'add',
      label: 'Add',
      subtitle: 'Number + number',
      inputs: [
        { key: 'a', label: 'A', type: 'number' },
        { key: 'b', label: 'B', type: 'number' }
      ],
      outputs: [{ key: 'sum', label: 'Sum', type: 'number' }],
      controls: []
    },
    {
      kind: 'subtract',
      label: 'Subtract',
      subtitle: 'Number - number',
      inputs: [
        { key: 'a', label: 'A', type: 'number' },
        { key: 'b', label: 'B', type: 'number' }
      ],
      outputs: [{ key: 'result', label: 'Result', type: 'number' }],
      controls: []
    },
    {
      kind: 'multiply',
      label: 'Multiply',
      subtitle: 'Number * number',
      inputs: [
        { key: 'a', label: 'A', type: 'number' },
        { key: 'b', label: 'B', type: 'number' }
      ],
      outputs: [{ key: 'product', label: 'Product', type: 'number' }],
      controls: []
    },
    {
      kind: 'divide',
      label: 'Divide',
      subtitle: 'Number / number',
      inputs: [
        { key: 'a', label: 'A', type: 'number' },
        { key: 'b', label: 'B', type: 'number' }
      ],
      outputs: [{ key: 'quotient', label: 'Quotient', type: 'number' }],
      controls: []
    },
    {
      kind: 'compare',
      label: 'Greater Than',
      subtitle: 'Number > number',
      inputs: [
        { key: 'a', label: 'A', type: 'number' },
        { key: 'b', label: 'B', type: 'number' }
      ],
      outputs: [{ key: 'value', label: 'Match', type: 'boolean' }],
      controls: []
    },
    {
      kind: 'equals',
      label: 'Equals',
      subtitle: 'String == string',
      inputs: [
        { key: 'a', label: 'A', type: 'string' },
        { key: 'b', label: 'B', type: 'string' }
      ],
      outputs: [{ key: 'value', label: 'Match', type: 'boolean' }],
      controls: []
    },
    {
      kind: 'concat',
      label: 'Concat',
      subtitle: 'String + string',
      inputs: [
        { key: 'a', label: 'A', type: 'string' },
        { key: 'b', label: 'B', type: 'string' }
      ],
      outputs: [{ key: 'result', label: 'Text', type: 'string' }],
      controls: []
    },
    {
      kind: 'switch-number',
      label: 'Switch Number',
      subtitle: 'Choose between two numbers',
      inputs: [
        { key: 'selector', label: 'Use B', type: 'boolean' },
        { key: 'a', label: 'A', type: 'number' },
        { key: 'b', label: 'B', type: 'number' }
      ],
      outputs: [{ key: 'value', label: 'Value', type: 'number' }],
      controls: []
    },
    {
      kind: 'switch-string',
      label: 'Switch String',
      subtitle: 'Choose between two strings',
      inputs: [
        { key: 'selector', label: 'Use B', type: 'boolean' },
        { key: 'a', label: 'A', type: 'string' },
        { key: 'b', label: 'B', type: 'string' }
      ],
      outputs: [{ key: 'value', label: 'Value', type: 'string' }],
      controls: []
    },
    {
      kind: 'if',
      label: 'If',
      subtitle: 'Branch by condition',
      inputs: [
        { key: 'condition', label: 'Condition', type: 'boolean' },
        { key: 'yes', label: 'Yes', type: 'number' },
        { key: 'no', label: 'No', type: 'number' }
      ],
      outputs: [{ key: 'result', label: 'Result', type: 'number' }],
      controls: []
    },
    {
      kind: 'trigger',
      label: 'Trigger',
      subtitle: 'Flow source',
      inputs: [],
      outputs: [{ key: 'flow', label: 'Flow', type: 'flow' }],
      controls: []
    },
    {
      kind: 'log',
      label: 'Log',
      subtitle: 'Flow + message sink',
      inputs: [
        { key: 'flow', label: 'Flow', type: 'flow' },
        { key: 'message', label: 'Message', type: 'string' }
      ],
      outputs: [],
      controls: []
    }
  ];

  const TEMPLATE_BY_KIND = new Map(NODE_TEMPLATES.map(template => [template.kind, template]));

  function graphModules(root = document) {
    return [...root.querySelectorAll('[data-graph-module]')];
  }

  function nextGraphNodeId() {
    core.state.graphNodeCounter += 1;
    return `graph-node-${core.state.graphNodeCounter}`;
  }

  function nextGraphConnectionId() {
    core.state.graphConnectionCounter += 1;
    return `graph-connection-${core.state.graphConnectionCounter}`;
  }

  function graphTemplate(kind) {
    if (kind === 'text-value') {
      return TEMPLATE_BY_KIND.get('string') || NODE_TEMPLATES[0];
    }
    return TEMPLATE_BY_KIND.get(kind) || NODE_TEMPLATES[0];
  }

  function defaultControlValue(control) {
    if (control.type === 'checkbox') {
      return control.checked === true;
    }
    return control.value === undefined || control.value === null ? '' : control.value;
  }

  function ensureNodeValues(node, template) {
    if (!node.values || typeof node.values !== 'object') {
      node.values = {};
    }

    template.controls.forEach(control => {
      if (!(control.key in node.values)) {
        node.values[control.key] = defaultControlValue(control);
      }
    });

    return node.values;
  }

  function createGraphNode(kind, x, y) {
    const template = graphTemplate(kind);
    const node = {
      id: nextGraphNodeId(),
      kind: template.kind,
      x,
      y,
      values: {}
    };
    ensureNodeValues(node, template);
    return node;
  }

  function createDefaultGraphState() {
    const numberA = createGraphNode('number', 56, 72);
    const numberB = createGraphNode('number', 56, 228);
    const multiply = createGraphNode('multiply', 332, 120);
    const selector = createGraphNode('boolean', 332, 302);
    const switchNumber = createGraphNode('switch-number', 622, 186);
    const stringValue = createGraphNode('string', 62, 470);
    const urlValue = createGraphNode('url', 62, 624);
    const concat = createGraphNode('concat', 348, 548);
    const trigger = createGraphNode('trigger', 642, 452);
    const log = createGraphNode('log', 906, 482);

    return {
      nodes: [numberA, numberB, multiply, selector, switchNumber, stringValue, urlValue, concat, trigger, log],
      connections: [
        {
          id: nextGraphConnectionId(),
          fromNodeId: numberA.id,
          fromSocket: 'value',
          toNodeId: multiply.id,
          toSocket: 'a',
          type: 'number'
        },
        {
          id: nextGraphConnectionId(),
          fromNodeId: numberB.id,
          fromSocket: 'value',
          toNodeId: multiply.id,
          toSocket: 'b',
          type: 'number'
        },
        {
          id: nextGraphConnectionId(),
          fromNodeId: selector.id,
          fromSocket: 'value',
          toNodeId: switchNumber.id,
          toSocket: 'selector',
          type: 'boolean'
        },
        {
          id: nextGraphConnectionId(),
          fromNodeId: numberA.id,
          fromSocket: 'value',
          toNodeId: switchNumber.id,
          toSocket: 'a',
          type: 'number'
        },
        {
          id: nextGraphConnectionId(),
          fromNodeId: multiply.id,
          fromSocket: 'product',
          toNodeId: switchNumber.id,
          toSocket: 'b',
          type: 'number'
        },
        {
          id: nextGraphConnectionId(),
          fromNodeId: stringValue.id,
          fromSocket: 'value',
          toNodeId: concat.id,
          toSocket: 'a',
          type: 'string'
        },
        {
          id: nextGraphConnectionId(),
          fromNodeId: urlValue.id,
          fromSocket: 'value',
          toNodeId: concat.id,
          toSocket: 'b',
          type: 'string'
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
          fromNodeId: concat.id,
          fromSocket: 'result',
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
    const offset = state.spawnCount * 24;
    state.spawnCount += 1;
    return {
      x: Math.round(scrollLeft + width * 0.28 + offset),
      y: Math.round(scrollTop + height * 0.2 + offset)
    };
  }

  function renderGraphSearchResults(module) {
    const { searchInput, searchResults } = graphCanvasParts(module);
    if (!searchResults) {
      return;
    }

    const query = (searchInput?.value || '').trim().toLowerCase();
    searchResults.innerHTML = '';

    NODE_TEMPLATES
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
    if (!outputSocket || !inputSocket || !socketTypeMatches(outputSocket.type, inputSocket.type)) {
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
      if (
        event.target.closest('[data-graph-node-delete]') ||
        event.target.closest('.mod-graph-node-controls') ||
        event.target.closest('input, textarea, select, button')
      ) {
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

  function renderGraphControls(node, template) {
    const values = ensureNodeValues(node, template);
    const controls = document.createElement('div');
    controls.className = 'mod-graph-node-controls';

    template.controls.forEach(control => {
      const row = document.createElement('label');
      row.className = `mod-graph-control-row type-${control.type}`;

      const label = document.createElement('span');
      label.className = 'mod-graph-control-label';
      label.textContent = control.label;
      row.appendChild(label);

      let input = null;
      let note = null;
      if (control.type === 'checkbox') {
        input = document.createElement('input');
        input.type = 'checkbox';
        input.checked = values[control.key] === true;
        input.addEventListener('change', () => {
          values[control.key] = input.checked;
        });
      } else if (control.type === 'file') {
        input = document.createElement('input');
        input.type = 'file';
        input.className = 'mod-graph-control-file';
        input.addEventListener('change', () => {
          values[control.key] = input.files?.[0]?.name || '';
          note.textContent = values[control.key] || 'No file selected';
        });
        note = document.createElement('span');
        note.className = 'mod-graph-control-note';
        note.textContent = values[control.key] || 'No file selected';
      } else {
        input = document.createElement(control.type === 'text' && String(values[control.key] || '').length > 36 ? 'textarea' : 'input');
        if (input.tagName === 'TEXTAREA') {
          input.rows = 2;
        } else {
          input.type = control.type === 'number' || control.type === 'url' ? control.type : 'text';
        }
        input.value = String(values[control.key] ?? '');
        if (control.placeholder) {
          input.placeholder = control.placeholder;
        }
        if (control.step && input.tagName === 'INPUT') {
          input.step = control.step;
        }
        input.addEventListener('input', () => {
          values[control.key] = control.type === 'number'
            ? Number(input.value || 0)
            : input.value;
        });
      }

      input.classList.add('mod-graph-control');
      row.appendChild(input);
      if (note) {
        row.appendChild(note);
      }
      controls.appendChild(row);
    });

    return controls;
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
      ensureNodeValues(node, template);

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

      const controls = renderGraphControls(node, template);

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
      body.appendChild(controls);
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

  core.modules.graph = {
    init: initGraphModules,
    cleanupFrame(frame) {
      frame?.querySelectorAll?.('[data-graph-module]').forEach(module => {
        module._graphState = null;
      });
    }
  };
})();