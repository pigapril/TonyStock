const mockRegister = jest.fn();

jest.mock('chart.js', () => ({
  Chart: {
    register: mockRegister
  },
  _adapters: {
    _date: {
      override: jest.fn()
    }
  },
  Filler: { id: 'Filler' },
  Legend: { id: 'Legend' },
  LineController: { id: 'LineController' },
  LineElement: { id: 'LineElement' },
  LinearScale: { id: 'LinearScale' },
  PointElement: { id: 'PointElement' },
  TimeScale: { id: 'TimeScale' },
  Title: { id: 'Title' },
  Tooltip: { id: 'Tooltip' }
}));

jest.mock('chartjs-plugin-annotation', () => ({ id: 'annotationPlugin' }));

describe('homeChartRegistry', () => {
  beforeEach(() => {
    jest.resetModules();
    mockRegister.mockClear();
  });

  it('registers only the explicitly required chart modules', () => {
    jest.isolateModules(() => {
      const { ensureHomeChartsRegistered, HOME_CHART_MODULES } = require('./homeChartRegistry');

      expect(HOME_CHART_MODULES.map((module) => module.id)).toEqual([
        'LineController',
        'LineElement',
        'PointElement',
        'LinearScale',
        'TimeScale',
        'Tooltip',
        'Legend',
        'Title',
        'Filler',
        'annotationPlugin'
      ]);

      ensureHomeChartsRegistered();
      ensureHomeChartsRegistered();
    });

    expect(mockRegister).toHaveBeenCalledTimes(1);
    expect(mockRegister.mock.calls[0]).toHaveLength(10);
  });
});
