import { Chart as ChartJS } from 'chart.js';

/**
 * 讓上下並排的兩張圖共用一條垂直標線。
 *
 * 兩張圖的資料粒度不同（五線譜是日線、樂活通道是週線），所以不能用 index 對應，
 * 必須用「時間值」對應：把游標所在的時間換算成另一張圖的像素位置。
 *
 * 只有在 chart.$crosshairX 有值時才畫，對其他圖表沒有影響。
 */
const CROSSHAIR_PLUGIN_ID = 'linkedCrosshair';

const crosshairPlugin = {
  id: CROSSHAIR_PLUGIN_ID,
  afterDatasetsDraw(chart) {
    const x = chart.$crosshairX;
    const area = chart.chartArea;
    if (x == null || !area || x < area.left || x > area.right) {
      return;
    }

    const { ctx } = chart;
    ctx.save();
    ctx.beginPath();
    ctx.setLineDash([4, 4]);
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(90, 101, 114, 0.55)';
    ctx.moveTo(x, area.top);
    ctx.lineTo(x, area.bottom);
    ctx.stroke();
    ctx.restore();
  }
};

let registered = false;

export function ensureCrosshairRegistered() {
  if (registered) {
    return;
  }
  ChartJS.register(crosshairPlugin);
  registered = true;
}

function isAttached(chart) {
  const canvas = chart?.canvas;
  return Boolean(canvas && canvas.ownerDocument?.contains(canvas));
}

/** 找出 labels 中時間最接近 value 的索引。labels 是日期字串。 */
function nearestIndex(chart, value) {
  const labels = chart?.data?.labels;
  if (!labels?.length) {
    return -1;
  }

  let best = -1;
  let bestGap = Infinity;
  for (let i = 0; i < labels.length; i += 1) {
    const gap = Math.abs(new Date(labels[i]).getTime() - value);
    if (gap < bestGap) {
      bestGap = gap;
      best = i;
    }
  }
  return best;
}

function clearChart(chart) {
  if (!isAttached(chart)) {
    return;
  }
  chart.$crosshairX = null;
  chart.setActiveElements([]);
  chart.tooltip?.setActiveElements([], { x: 0, y: 0 });
  chart.render();
}

/** 把 time 對應到 target 上：畫標線並打開 tooltip。 */
function applyToTarget(target, time) {
  if (!isAttached(target) || !target.chartArea) {
    return;
  }

  const px = target.scales?.x?.getPixelForValue(time);
  if (!Number.isFinite(px)) {
    return;
  }
  target.$crosshairX = px;

  const index = nearestIndex(target, time);
  if (index >= 0) {
    const elements = target.data.datasets.map((dataset, datasetIndex) => ({
      datasetIndex,
      index
    }));
    target.setActiveElements(elements);
    target.tooltip?.setActiveElements(elements, { x: px, y: target.chartArea.top });
  }
  target.render();
}

/**
 * 綁定兩張圖的滑鼠連動。回傳解除綁定的函式。
 * getCharts 每次呼叫時重新取得圖表實例，避免抓到已被換掉的舊實例。
 */
export function linkCharts(getCharts) {
  const handlers = [];

  const bind = (selfIndex) => {
    const charts = getCharts();
    const self = charts[selfIndex];
    if (!isAttached(self)) {
      return;
    }

    const onMove = (event) => {
      const [main, band] = getCharts();
      const source = selfIndex === 0 ? main : band;
      const other = selfIndex === 0 ? band : main;
      if (!isAttached(source) || !source.chartArea) {
        return;
      }

      // 手機沒有 mousemove。通道帶在 follower 模式關掉了浮動 tooltip，
      // 若不接 touchmove，手機使用者就完全看不到通道的數值。
      const point = event.touches?.[0] || event;
      if (point.clientX == null) {
        return;
      }

      const rect = source.canvas.getBoundingClientRect();
      const px = point.clientX - rect.left;
      if (px < source.chartArea.left || px > source.chartArea.right) {
        clearChart(source);
        clearChart(other);
        return;
      }

      const time = source.scales?.x?.getValueForPixel(px);
      if (!Number.isFinite(time)) {
        return;
      }

      source.$crosshairX = px;
      source.render();
      applyToTarget(other, time);
    };

    const onLeave = () => {
      const [main, band] = getCharts();
      clearChart(main);
      clearChart(band);
    };

    // 先把 canvas 抓在區域變數裡：解除監聽時圖表可能已經被銷毀，
    // 那時 chart.canvas 已是 null，再去讀就會噴 removeEventListener of null。
    const canvas = self.canvas;
    canvas.addEventListener('mousemove', onMove);
    canvas.addEventListener('mouseleave', onLeave);
    // passive：只讀座標、不阻止捲動
    canvas.addEventListener('touchstart', onMove, { passive: true });
    canvas.addEventListener('touchmove', onMove, { passive: true });
    canvas.addEventListener('touchend', onLeave, { passive: true });
    handlers.push(() => {
      canvas.removeEventListener('mousemove', onMove);
      canvas.removeEventListener('mouseleave', onLeave);
      canvas.removeEventListener('touchstart', onMove);
      canvas.removeEventListener('touchmove', onMove);
      canvas.removeEventListener('touchend', onLeave);
    });
  };

  bind(0);
  bind(1);

  return () => {
    handlers.forEach((off) => off());
    const [main, band] = getCharts();
    clearChart(main);
    clearChart(band);
  };
}
