(() => {
  const core = window.HestiaVerticalCore;
  if (!core) {
    return;
  }

  const DATASETS = {
    throughput: {
      copy: 'Throughput shows the lane balance between regional queues and active routing load.',
      charts: {
        bar: {
          title: 'Regional throughput',
          payload: {
            series: [
              { label: 'North', value: 14, color: '#5fd0ff' },
              { label: 'East', value: 11, color: '#81d97a' },
              { label: 'South', value: 6, color: '#ffbe56' },
              { label: 'West', value: 9, color: '#b990ff' }
            ]
          }
        },
        pie: {
          title: 'Throughput share',
          payload: {
            segments: [
              { label: 'Queued', value: 9, color: '#5fd0ff' },
              { label: 'Live', value: 7, color: '#81d97a' },
              { label: 'Held', value: 4, color: '#ffbe56' }
            ]
          }
        },
        pointcloud: {
          title: 'Throughput spread',
          payload: {
            points: [
              { label: 'North', x: 16, y: 30, r: 3, color: '#5fd0ff' },
              { label: 'East', x: 28, y: 64, r: 4, color: '#81d97a' },
              { label: 'South', x: 52, y: 20, r: 3, color: '#ffbe56' },
              { label: 'West', x: 74, y: 50, r: 5, color: '#b990ff' },
              { label: 'Ops', x: 62, y: 34, r: 3, color: '#ff7c6b' }
            ]
          }
        }
      }
    },
    coverage: {
      copy: 'Coverage highlights how clustered the selected feed is across the monitored space.',
      charts: {
        bar: {
          title: 'Zone coverage',
          payload: {
            series: [
              { label: 'Dock', value: 8, color: '#5fd0ff' },
              { label: 'Lane', value: 12, color: '#81d97a' },
              { label: 'Gate', value: 5, color: '#ffbe56' }
            ]
          }
        },
        pie: {
          title: 'Coverage ratio',
          payload: {
            segments: [
              { label: 'Visible', value: 11, color: '#81d97a' },
              { label: 'Shadow', value: 4, color: '#ffbe56' },
              { label: 'Offline', value: 2, color: '#ff7c6b' }
            ]
          }
        },
        pointcloud: {
          title: 'Coverage map',
          payload: {
            points: [
              { label: 'West', x: 12, y: 24, r: 4, color: '#5fd0ff' },
              { label: 'Gate', x: 32, y: 42, r: 3, color: '#81d97a' },
              { label: 'Dock', x: 48, y: 60, r: 5, color: '#ffbe56' },
              { label: 'Lane', x: 68, y: 26, r: 4, color: '#b990ff' },
              { label: 'Ops', x: 82, y: 52, r: 3, color: '#ff7c6b' }
            ]
          }
        }
      }
    },
    allocation: {
      copy: 'Allocation shows how owners and priorities are distributed in the current slice.',
      charts: {
        bar: {
          title: 'Assignment load',
          payload: {
            series: [
              { label: 'Lina', value: 7, color: '#5fd0ff' },
              { label: 'Rhea', value: 10, color: '#81d97a' },
              { label: 'Kai', value: 6, color: '#ffbe56' },
              { label: 'Jun', value: 4, color: '#b990ff' }
            ]
          }
        },
        pie: {
          title: 'Priority split',
          payload: {
            segments: [
              { label: 'Critical', value: 5, color: '#ff7c6b' },
              { label: 'High', value: 8, color: '#ffbe56' },
              { label: 'Normal', value: 10, color: '#5fd0ff' }
            ]
          }
        },
        pointcloud: {
          title: 'Assignment spread',
          payload: {
            points: [
              { label: 'Lina', x: 18, y: 28, r: 3, color: '#5fd0ff' },
              { label: 'Rhea', x: 36, y: 58, r: 4, color: '#81d97a' },
              { label: 'Kai', x: 58, y: 18, r: 5, color: '#ffbe56' },
              { label: 'Jun', x: 78, y: 46, r: 3, color: '#b990ff' }
            ]
          }
        }
      }
    }
  };

  function graphWidgetModules(root = document) {
    return [...root.querySelectorAll('[data-graph-widget-module]')];
  }

  function updateGraphWidgetModule(module) {
    const kindSelect = module.querySelector('[data-graph-widget-kind]');
    const datasetSelect = module.querySelector('[data-graph-widget-dataset]');
    const widget = module.querySelector('[data-graph-widget]');
    const copy = module.querySelector('[data-graph-widget-copy]');
    if (!kindSelect || !datasetSelect || !widget) {
      return;
    }

    const datasetKey = datasetSelect.value || 'throughput';
    const chartKind = kindSelect.value || 'bar';
    const dataset = DATASETS[datasetKey] || DATASETS.throughput;
    const chart = dataset.charts[chartKind] || dataset.charts.bar;

    widget.dataset.graphKind = chartKind;
    widget.dataset.graphTitle = chart.title;
    widget.dataset.graphPayload = JSON.stringify(chart.payload);
    if (copy) {
      copy.textContent = dataset.copy;
    }
    window.HestiaGraphWidgets?.init?.(module);
  }

  function bindGraphWidgetModule(module) {
    if (module.dataset.graphWidgetBound === 'true') {
      updateGraphWidgetModule(module);
      return;
    }

    module.dataset.graphWidgetBound = 'true';
    const kindSelect = module.querySelector('[data-graph-widget-kind]');
    const datasetSelect = module.querySelector('[data-graph-widget-dataset]');

    kindSelect?.addEventListener('change', () => {
      updateGraphWidgetModule(module);
    });
    datasetSelect?.addEventListener('change', () => {
      updateGraphWidgetModule(module);
    });

    updateGraphWidgetModule(module);
  }

  core.modules['graph-widget'] = {
    init(root = document) {
      graphWidgetModules(root).forEach(module => {
        bindGraphWidgetModule(module);
      });
    },
    serializeFrame(frame) {
      return {
        chartKind: frame.querySelector('[data-graph-widget-kind]')?.value || 'bar',
        datasetKey: frame.querySelector('[data-graph-widget-dataset]')?.value || 'throughput'
      };
    },
    restoreFrame(frame, state, options = {}) {
      if (options.phase === 'after-init') {
        const module = frame.querySelector('[data-graph-widget-module]');
        if (module) {
          updateGraphWidgetModule(module);
        }
        return;
      }

      const kindSelect = frame.querySelector('[data-graph-widget-kind]');
      const datasetSelect = frame.querySelector('[data-graph-widget-dataset]');
      if (kindSelect) {
        kindSelect.value = `${state?.chartKind || 'bar'}`;
      }
      if (datasetSelect) {
        datasetSelect.value = `${state?.datasetKey || 'throughput'}`;
      }
    }
  };
})();
