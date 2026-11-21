import { createLinkedChartsScheduler, linkCharts } from '../linkedCrosshair';

// 圖表面板未來會往下加（更多市場情緒資訊），所以連動不能寫死兩張。
// 這裡用假的 chart 物件驗證：任一張圖的游標事件都會傳到「其他所有」圖上。
function makeChart(labels) {
  const listeners = {};
  const canvas = {
    ownerDocument: { contains: () => true },
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 200, height: 100 }),
    addEventListener: (type, fn) => { (listeners[type] = listeners[type] || []).push(fn); },
    removeEventListener: (type, fn) => {
      listeners[type] = (listeners[type] || []).filter((item) => item !== fn);
    }
  };

  return {
    canvas,
    listeners,
    chartArea: { left: 0, right: 200, top: 0, bottom: 100 },
    data: { labels, datasets: [{}] },
    scales: {
      x: {
        getValueForPixel: (px) => px * 1000,
        getPixelForValue: (value) => value / 1000
      }
    },
    setActiveElements: jest.fn(),
    tooltip: { setActiveElements: jest.fn() },
    render: jest.fn(),
    $crosshairX: null
  };
}

const fire = (chart, type, clientX) => {
  chart.listeners[type].forEach((fn) => fn({ clientX, clientY: 10 }));
};

describe('linkCharts', () => {
  it('三張圖時，來源圖的游標會同步到另外兩張', () => {
    const charts = [
      makeChart(['2026-03-20']),
      makeChart(['2026-03-20']),
      makeChart(['2026-03-20'])
    ];
    const unlink = linkCharts(() => charts);

    fire(charts[0], 'mousemove', 40);

    expect(charts[0].$crosshairX).toBe(40);
    expect(charts[1].$crosshairX).toBe(40);
    expect(charts[2].$crosshairX).toBe(40);
    expect(charts[1].tooltip.setActiveElements).toHaveBeenCalled();
    expect(charts[2].tooltip.setActiveElements).toHaveBeenCalled();

    unlink();
  });

  it('中間那張圖也能當來源，往上下兩邊同步', () => {
    const charts = [makeChart(['2026-03-20']), makeChart(['2026-03-20']), makeChart(['2026-03-20'])];
    const unlink = linkCharts(() => charts);

    fire(charts[1], 'mousemove', 80);

    expect(charts[0].$crosshairX).toBe(80);
    expect(charts[2].$crosshairX).toBe(80);

    unlink();
  });

  it('游標離開時所有圖一起清掉標線', () => {
    const charts = [makeChart(['2026-03-20']), makeChart(['2026-03-20'])];
    const unlink = linkCharts(() => charts);

    fire(charts[0], 'mousemove', 40);
    charts[0].listeners.mouseleave.forEach((fn) => fn());

    expect(charts[0].$crosshairX).toBeNull();
    expect(charts[1].$crosshairX).toBeNull();

    unlink();
  });

  it('解除綁定後不再留下監聽器', () => {
    const charts = [makeChart(['2026-03-20']), makeChart(['2026-03-20'])];
    const unlink = linkCharts(() => charts);

    unlink();

    charts.forEach((chart) => {
      expect(chart.listeners.mousemove).toHaveLength(0);
      expect(chart.listeners.mouseleave).toHaveLength(0);
    });
  });
});

describe('createLinkedChartsScheduler', () => {
  let nextFrameId;
  let pendingFrames;
  let requestFrame;
  let cancelFrame;

  beforeEach(() => {
    nextFrameId = 1;
    pendingFrames = new Map();
    requestFrame = jest.fn((callback) => {
      const id = nextFrameId++;
      pendingFrames.set(id, callback);
      return id;
    });
    cancelFrame = jest.fn((id) => pendingFrames.delete(id));
  });

  const flushFrame = (id) => {
    const callback = pendingFrames.get(id);
    pendingFrames.delete(id);
    callback?.();
  };

  it('coalesces ready notifications and rebinds when a lazy chart mounts later', () => {
    const main = makeChart(['2026-03-20']);
    const band = makeChart(['2026-03-20']);
    const charts = [main, band, null];
    const scheduler = createLinkedChartsScheduler(() => charts, { requestFrame, cancelFrame });

    scheduler.schedule();
    scheduler.schedule();
    scheduler.schedule();

    expect(requestFrame).toHaveBeenCalledTimes(1);
    flushFrame(1);
    expect(main.listeners.mousemove).toHaveLength(1);
    expect(band.listeners.mousemove).toHaveLength(1);

    // Simulate the technical-indicator chunk resolving after the first bind.
    const indicator = makeChart(['2026-03-20']);
    charts[2] = indicator;
    scheduler.schedule();
    scheduler.schedule();

    expect(requestFrame).toHaveBeenCalledTimes(2);
    flushFrame(2);

    // The previous canvas listeners are removed before all three are rebound.
    expect(main.listeners.mousemove).toHaveLength(1);
    expect(band.listeners.mousemove).toHaveLength(1);
    expect(indicator.listeners.mousemove).toHaveLength(1);

    fire(indicator, 'mousemove', 65);
    expect(main.$crosshairX).toBe(65);
    expect(band.$crosshairX).toBe(65);
    expect(indicator.$crosshairX).toBe(65);

    scheduler.destroy();
    [main, band, indicator].forEach((chart) => {
      expect(chart.listeners.mousemove).toHaveLength(0);
      expect(chart.listeners.mouseleave).toHaveLength(0);
    });
  });

  it('cancels a pending frame and does not bind after destroy', () => {
    const chart = makeChart(['2026-03-20']);
    const scheduler = createLinkedChartsScheduler(() => [chart], { requestFrame, cancelFrame });

    scheduler.schedule();
    scheduler.destroy();

    expect(cancelFrame).toHaveBeenCalledWith(1);
    expect(pendingFrames.size).toBe(0);
    expect(chart.listeners.mousemove || []).toHaveLength(0);
  });
});
