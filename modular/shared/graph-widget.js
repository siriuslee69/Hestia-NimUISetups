(() => {
  if (window.HestiaGraphWidgets) {
    return;
  }

  let tooltip = null;
  const widgetObservers = new WeakMap();
  const widgetBoxSignatures = new WeakMap();

  function parsePayload(widget) {
    try {
      const raw = widget.dataset.graphPayload || '{}';
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch (err) {
      return {};
    }
  }

  function widgetKind(widget, options = {}) {
    return `${options.kind || widget.dataset.graphKind || 'bar'}`;
  }

  function widgetTitle(widget, options = {}) {
    return `${options.title || widget.dataset.graphTitle || 'Graph'}`;
  }

  function widgetDisplay(widget, options = {}) {
    return `${options.display || widget.dataset.graphDisplay || 'default'}`;
  }

  function widgetPayload(widget, options = {}) {
    return options.payload && typeof options.payload === 'object'
      ? options.payload
      : parsePayload(widget);
  }

  function showsGraphChrome(display) {
    return display !== 'background';
  }

  function ensureTooltip() {
    if (tooltip) {
      return tooltip;
    }

    tooltip = document.createElement('div');
    tooltip.className = 'mod-graph-widget-tooltip';
    tooltip.hidden = true;
    document.body.appendChild(tooltip);
    return tooltip;
  }

  function rawBox(node) {
    const rect = node?.getBoundingClientRect?.();
    return {
      width: Math.round(rect?.width || node?.clientWidth || 0),
      height: Math.round(rect?.height || node?.clientHeight || 0)
    };
  }

  function measuredBox(node, fallbackWidth = 200, fallbackHeight = 120) {
    const box = rawBox(node);
    return {
      width: Math.max(24, box.width || fallbackWidth),
      height: Math.max(24, box.height || fallbackHeight)
    };
  }

  function svgNode(width, height) {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
    svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
    svg.setAttribute('aria-hidden', 'true');
    return svg;
  }

  function svgLine(svg, x1, y1, x2, y2, options = {}) {
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', `${x1}`);
    line.setAttribute('y1', `${y1}`);
    line.setAttribute('x2', `${x2}`);
    line.setAttribute('y2', `${y2}`);
    line.setAttribute('stroke', options.stroke || 'rgba(31,46,78,0.18)');
    line.setAttribute('stroke-width', `${options.width || 1}`);
    if (options.dash) {
      line.setAttribute('stroke-dasharray', `${options.dash}`);
    }
    if (options.opacity !== undefined) {
      line.setAttribute('opacity', `${options.opacity}`);
    }
    svg.appendChild(line);
  }

  function svgText(svg, x, y, text, options = {}) {
    const node = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    node.setAttribute('x', `${x}`);
    node.setAttribute('y', `${y}`);
    node.setAttribute('fill', options.fill || 'rgba(96,112,141,0.88)');
    node.setAttribute('font-size', `${options.size || 10}`);
    node.setAttribute('font-family', '"Bahnschrift", "Segoe UI Variable", sans-serif');
    node.setAttribute('text-anchor', options.anchor || 'start');
    node.textContent = `${text}`;
    svg.appendChild(node);
  }

  function clampPercent(value) {
    return Math.max(0, Math.min(100, Number(value || '0') || 0));
  }

  function renderBar(svg, payload, width, height, options = {}) {
    const showAxes = showsGraphChrome(options.display);
    const series = Array.isArray(payload.series) ? payload.series : [];
    const values = series.map(item => Number(item?.value || '0') || 0);
    const maxValue = Math.max(1, ...values);
    const gap = showAxes ? 8 : 6;
    const padLeft = showAxes ? 28 : 10;
    const padRight = 10;
    const padTop = 10;
    const padBottom = showAxes ? 20 : 10;
    const innerWidth = Math.max(12, width - padLeft - padRight);
    const innerHeight = Math.max(12, height - padTop - padBottom);
    const count = Math.max(1, series.length);
    const barWidth = Math.max(8, (innerWidth - gap * (count - 1)) / count);

    if (showAxes) {
      svgLine(svg, padLeft, padTop, padLeft, padTop + innerHeight, { opacity: 0.42 });
      svgLine(svg, padLeft, padTop + innerHeight, padLeft + innerWidth, padTop + innerHeight, { opacity: 0.42 });
      [0, 0.5, 1].forEach((ratio, index) => {
        const y = padTop + innerHeight - innerHeight * ratio;
        if (index < 2) {
          svgLine(svg, padLeft, y, padLeft + innerWidth, y, {
            opacity: 0.18,
            dash: '4 4'
          });
        }
        svgText(svg, padLeft - 6, y + 3, Math.round(maxValue * ratio), {
          anchor: 'end'
        });
      });
    }

    series.forEach((item, index) => {
      const value = Number(item?.value || '0') || 0;
      const barHeight = innerHeight * (value / maxValue);
      const x = padLeft + index * (barWidth + gap);
      const y = padTop + innerHeight - barHeight;
      const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      rect.setAttribute('x', `${x}`);
      rect.setAttribute('y', `${y}`);
      rect.setAttribute('width', `${barWidth}`);
      rect.setAttribute('height', `${barHeight}`);
      rect.setAttribute('rx', showAxes ? '4' : '5');
      rect.setAttribute('fill', item?.color || `hsl(${(index * 74) % 360} 74% 62%)`);
      rect.setAttribute('opacity', showAxes ? '0.92' : '0.8');
      svg.appendChild(rect);

      if (showAxes && count <= 5) {
        svgText(svg, x + barWidth / 2, height - 6, item?.label || `S${index + 1}`, {
          anchor: 'middle'
        });
      }
    });
  }

  function polarPoint(cx, cy, radius, angle) {
    return {
      x: cx + radius * Math.cos(angle),
      y: cy + radius * Math.sin(angle)
    };
  }

  function renderPie(svg, payload, width, height, options = {}) {
    const showAxes = showsGraphChrome(options.display);
    const segments = Array.isArray(payload.segments) ? payload.segments : [];
    const total = Math.max(1, segments.reduce((sum, item) => sum + (Number(item?.value || '0') || 0), 0));
    const radius = Math.max(14, Math.min(width, height) * (showAxes ? 0.34 : 0.42));
    const cx = width / 2;
    const cy = height / 2;
    let angle = -Math.PI / 2;

    segments.forEach((item, index) => {
      const portion = (Number(item?.value || '0') || 0) / total;
      const nextAngle = angle + portion * Math.PI * 2;
      const start = polarPoint(cx, cy, radius, angle);
      const end = polarPoint(cx, cy, radius, nextAngle);
      const largeArc = nextAngle - angle > Math.PI ? '1' : '0';
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute(
        'd',
        [
          `M ${cx} ${cy}`,
          `L ${start.x} ${start.y}`,
          `A ${radius} ${radius} 0 ${largeArc} 1 ${end.x} ${end.y}`,
          'Z'
        ].join(' ')
      );
      path.setAttribute('fill', item?.color || `hsl(${(index * 87) % 360} 72% 60%)`);
      path.setAttribute('opacity', showAxes ? '0.92' : '0.8');
      svg.appendChild(path);
      angle = nextAngle;
    });

    const inner = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    inner.setAttribute('cx', `${cx}`);
    inner.setAttribute('cy', `${cy}`);
    inner.setAttribute('r', `${radius * (showAxes ? 0.48 : 0.36)}`);
    inner.setAttribute('fill', showAxes ? 'rgba(255,255,255,0.88)' : 'rgba(255,255,255,0.62)');
    svg.appendChild(inner);
  }

  function renderPointCloud(svg, payload, width, height, options = {}) {
    const showAxes = showsGraphChrome(options.display);
    const points = Array.isArray(payload.points) ? payload.points : [];
    const padLeft = showAxes ? 24 : 10;
    const padRight = 10;
    const padTop = 10;
    const padBottom = showAxes ? 18 : 10;
    const innerWidth = Math.max(12, width - padLeft - padRight);
    const innerHeight = Math.max(12, height - padTop - padBottom);
    const guide = document.createElementNS('http://www.w3.org/2000/svg', 'rect');

    guide.setAttribute('x', `${padLeft}`);
    guide.setAttribute('y', `${padTop}`);
    guide.setAttribute('width', `${innerWidth}`);
    guide.setAttribute('height', `${innerHeight}`);
    guide.setAttribute('rx', '8');
    guide.setAttribute('fill', showAxes ? 'rgba(255,255,255,0.14)' : 'rgba(255,255,255,0.08)');
    guide.setAttribute('stroke', 'rgba(31,46,78,0.08)');
    svg.appendChild(guide);

    if (showAxes) {
      svgLine(svg, padLeft, padTop + innerHeight, padLeft + innerWidth, padTop + innerHeight, { opacity: 0.42 });
      svgLine(svg, padLeft, padTop, padLeft, padTop + innerHeight, { opacity: 0.42 });
      svgText(svg, padLeft - 6, padTop + 4, '100', { anchor: 'end' });
      svgText(svg, padLeft - 6, padTop + innerHeight + 3, '0', { anchor: 'end' });
      svgText(svg, padLeft, height - 4, '0');
      svgText(svg, padLeft + innerWidth, height - 4, '100', { anchor: 'end' });
    }

    points.forEach((item, index) => {
      const point = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      const x = padLeft + (clampPercent(item?.x) / 100) * innerWidth;
      const y = padTop + innerHeight - (clampPercent(item?.y) / 100) * innerHeight;
      point.setAttribute('cx', `${x}`);
      point.setAttribute('cy', `${y}`);
      point.setAttribute('r', `${Math.max(2, Number(item?.r || '0') || 3)}`);
      point.setAttribute('fill', item?.color || `hsl(${(index * 31) % 360} 82% 62%)`);
      point.setAttribute('opacity', `${showAxes ? item?.opacity || 0.82 : item?.opacity || 0.7}`);
      svg.appendChild(point);
    });
  }

  function buildLegend(kind, payload) {
    const list = kind === 'pie'
      ? payload.segments
      : kind === 'pointcloud'
        ? payload.points?.slice(0, 4)?.map((point, index) => ({
          label: point?.label || `Point ${index + 1}`,
          color: point?.color || `hsl(${(index * 31) % 360} 82% 62%)`
        }))
        : payload.series;

    if (!Array.isArray(list) || list.length === 0) {
      return null;
    }

    const legend = document.createElement('div');
    legend.className = 'mod-graph-widget-legend';
    list.slice(0, 4).forEach((item, index) => {
      const row = document.createElement('span');
      const dot = document.createElement('span');
      const text = document.createElement('span');

      row.className = 'mod-graph-widget-legend-item';
      dot.className = 'mod-graph-widget-legend-dot';
      dot.style.background = item?.color || `hsl(${(index * 71) % 360} 72% 60%)`;
      text.textContent = `${item?.label || item?.name || `Series ${index + 1}`}`;
      row.appendChild(dot);
      row.appendChild(text);
      legend.appendChild(row);
    });
    return legend;
  }

  function createWidgetShell(widget, options = {}) {
    const kind = widgetKind(widget, options);
    const payload = widgetPayload(widget, options);
    const display = widgetDisplay(widget, options);
    const shell = document.createElement('div');
    const chart = document.createElement('div');

    shell.className = `mod-graph-widget-shell is-${kind}`;
    shell.dataset.graphKind = kind;
    shell.dataset.graphDisplay = display;
    if (options.width) {
      shell.style.width = `${options.width}px`;
    }
    if (options.height) {
      shell.style.height = `${options.height}px`;
    }

    if (showsGraphChrome(display)) {
      const title = document.createElement('div');
      title.className = 'mod-graph-widget-title';
      title.textContent = widgetTitle(widget, options);
      shell.appendChild(title);
    }

    chart.className = 'mod-graph-widget-chart';
    shell.appendChild(chart);

    if (showsGraphChrome(display)) {
      const legend = buildLegend(kind, payload);
      if (legend) {
        shell.appendChild(legend);
      }
    }

    return {
      chart,
      display,
      kind,
      payload,
      shell,
      width: Number(options.width || '0') || 0,
      height: Number(options.height || '0') || 0
    };
  }

  function drawWidgetShell(meta) {
    if (!meta?.chart) {
      return;
    }

    const box = measuredBox(meta.chart, meta.width || 200, meta.height || 120);
    const svg = svgNode(box.width, box.height);
    meta.chart.replaceChildren(svg);

    if (meta.kind === 'pie') {
      renderPie(svg, meta.payload, box.width, box.height, meta);
      return;
    }
    if (meta.kind === 'pointcloud') {
      renderPointCloud(svg, meta.payload, box.width, box.height, meta);
      return;
    }
    renderBar(svg, meta.payload, box.width, box.height, meta);
  }

  function scheduleWidgetDraw(meta) {
    if (!meta?.shell) {
      return;
    }

    if (meta.shell._graphRenderFrame) {
      window.cancelAnimationFrame(meta.shell._graphRenderFrame);
    }

    meta.shell._graphRenderFrame = window.requestAnimationFrame(() => {
      meta.shell._graphRenderFrame = 0;
      drawWidgetShell(meta);
    });
  }

  function renderWidget(widget, options = {}) {
    const meta = createWidgetShell(widget, options);
    scheduleWidgetDraw(meta);
    return meta.shell;
  }

  function mountWidget(widget) {
    const meta = createWidgetShell(widget);
    widget.innerHTML = '';
    widget.appendChild(meta.shell);
    widget._graphRenderMeta = meta;
    scheduleWidgetDraw(meta);
  }

  function refreshWidget(widget) {
    if (!widget) {
      return;
    }

    const meta = widget._graphRenderMeta;
    if (!meta) {
      mountWidget(widget);
      return;
    }

    const nextKind = widgetKind(widget);
    const nextDisplay = widgetDisplay(widget);
    if (meta.kind !== nextKind || meta.display !== nextDisplay) {
      mountWidget(widget);
      return;
    }

    meta.kind = nextKind;
    meta.payload = widgetPayload(widget);
    meta.display = nextDisplay;
    meta.shell.className = `mod-graph-widget-shell is-${meta.kind}`;
    meta.shell.dataset.graphKind = meta.kind;
    meta.shell.dataset.graphDisplay = meta.display;
    scheduleWidgetDraw(meta);
  }

  function positionTooltip(target, node) {
    const rect = target.getBoundingClientRect();
    const margin = 10;
    node.style.left = `${Math.round(rect.right + 10)}px`;
    node.style.top = `${Math.round(rect.top)}px`;
    const tipRect = node.getBoundingClientRect();
    let left = rect.right + 10;
    let top = rect.top;

    if (left + tipRect.width > window.innerWidth - margin) {
      left = rect.left - tipRect.width - 10;
    }
    if (top + tipRect.height > window.innerHeight - margin) {
      top = window.innerHeight - tipRect.height - margin;
    }

    node.style.left = `${Math.round(Math.max(margin, left))}px`;
    node.style.top = `${Math.round(Math.max(margin, top))}px`;
  }

  function showTooltip(widget) {
    const node = ensureTooltip();
    node.innerHTML = '';
    node.appendChild(renderWidget(widget, {
      display: 'tooltip',
      height: 160,
      width: 280
    }));
    node.hidden = false;
    positionTooltip(widget, node);
    window.requestAnimationFrame(() => {
      positionTooltip(widget, node);
    });
  }

  function hideTooltip() {
    const node = ensureTooltip();
    node.hidden = true;
    node.innerHTML = '';
  }

  function bindTooltip(widget) {
    if (widget.dataset.graphTooltipBound === 'true' || widget.dataset.graphTooltip !== 'true') {
      return;
    }

    widget.dataset.graphTooltipBound = 'true';
    widget.tabIndex = widget.tabIndex >= 0 ? widget.tabIndex : 0;

    widget.addEventListener('mouseenter', () => {
      showTooltip(widget);
    });
    widget.addEventListener('mouseleave', () => {
      hideTooltip();
    });
    widget.addEventListener('focusin', () => {
      showTooltip(widget);
    });
    widget.addEventListener('focusout', () => {
      window.requestAnimationFrame(() => {
        if (!widget.matches(':focus-within')) {
          hideTooltip();
        }
      });
    });
  }

  function observeWidget(widget) {
    if (widgetObservers.has(widget) || typeof ResizeObserver !== 'function') {
      return;
    }

    const observer = new ResizeObserver(entries => {
      const entry = entries[0];
      const width = Math.round(entry?.contentRect?.width || widget.clientWidth || 0);
      const height = Math.round(entry?.contentRect?.height || widget.clientHeight || 0);
      const nextSignature = `${width}x${height}`;

      if (widgetBoxSignatures.get(widget) === nextSignature) {
        return;
      }

      widgetBoxSignatures.set(widget, nextSignature);
      if (width < 8 || height < 8) {
        return;
      }
      refreshWidget(widget);
    });

    observer.observe(widget);
    widgetObservers.set(widget, observer);
    const initialBox = rawBox(widget);
    widgetBoxSignatures.set(widget, `${initialBox.width}x${initialBox.height}`);
  }

  function init(root = document) {
    root.querySelectorAll('[data-graph-widget]').forEach(widget => {
      mountWidget(widget);
      bindTooltip(widget);
      observeWidget(widget);
    });
  }

  window.HestiaGraphWidgets = {
    init,
    refresh: refreshWidget,
    renderWidget
  };
})();
