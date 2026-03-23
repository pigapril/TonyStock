import zoomPlugin from 'chartjs-plugin-zoom';
import { Chart as ChartJS } from 'chart.js';

import { ensureHomeChartsRegistered } from './homeChartRegistry';

let isZoomRegistered = false;

export function ensureChartZoomRegistered() {
  ensureHomeChartsRegistered();

  if (isZoomRegistered) {
    return;
  }

  ChartJS.register(zoomPlugin);
  isZoomRegistered = true;
}
