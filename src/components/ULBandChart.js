import React from 'react';
import { Line } from 'react-chartjs-2';

const ULBandChart = ({ data }) => {
    if (!data) return null;

    // 計算合適的時間單位
    const calculateTimeUnit = () => {
        if (!data.dates || data.dates.length === 0) return 'week';
        
        const firstDate = new Date(data.dates[0]);
        const lastDate = new Date(data.dates[data.dates.length - 1]);
        const daysDiff = (lastDate - firstDate) / (1000 * 60 * 60 * 24);

        if (daysDiff > 365 * 2) return 'year';      // 超過2年顯示年
        if (daysDiff > 365) return 'quarter';       // 1-2年顯示季
        if (daysDiff > 180) return 'month';         // 180天-1年顯示月
        if (daysDiff > 90) return 'week';           // 90-180天顯示週
        return 'day';                               // 少於90天顯示日
    };

    const timeUnit = calculateTimeUnit();

    const chartData = {
        labels: data.dates,
        datasets: [
            {
                label: '上軌',
                data: data.upperBand,
                borderColor: 'red',
                borderWidth: 1,
                fill: false,
                pointRadius: 0
            },
            {
                label: 'MA20',
                data: data.ma20,
                borderColor: 'blue',
                borderWidth: 1,
                fill: false,
                pointRadius: 0
            },
            {
                label: '價格',
                data: data.prices,
                borderColor: 'gray',
                borderWidth: 1,
                fill: false,
                pointRadius: 0
            },
            {
                label: '下軌',
                data: data.lowerBand,
                borderColor: 'green',
                borderWidth: 1,
                fill: false,
                pointRadius: 0
            }
        ]
    };

    const options = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: false },
            tooltip: {
                enabled: false,
                mode: 'index',
                intersect: false,
                external: function(context) {
                    const tooltipModel = context.tooltip;
                    let tooltipEl = document.getElementById('chartjs-tooltip-ulband');

                    if (!tooltipEl) {
                        tooltipEl = document.createElement('div');
                        tooltipEl.id = 'chartjs-tooltip-ulband';
                        document.body.appendChild(tooltipEl);
                    }

                    if (tooltipModel.opacity === 0) {
                        tooltipEl.style.opacity = 0;
                        return;
                    }

                    if (tooltipModel.body) {
                        const titleLines = tooltipModel.title || [];

                        // 定義想要顯示的數據集標籤順序
                        const desiredLabels = ['上軌', 'MA20', '價格', '下軌'];

                        // 過濾並排序數據點
                        const sortedItems = tooltipModel.dataPoints
                            .filter(item => desiredLabels.includes(item.dataset.label))
                            .sort((a, b) => b.raw - a.raw);

                        let innerHtml = `<div class="custom-tooltip">`;
                        innerHtml += `<div class="tooltip-title">${titleLines[0]}</div>`;

                        sortedItems.forEach(item => {
                            const label = item.dataset.label;
                            const value = item.raw.toFixed(2);
                            const color = item.dataset.borderColor;
                            innerHtml += `
                                <div class="tooltip-item" style="display: flex; align-items: center;">
                                    <div style="width: 10px; height: 10px; background-color: ${color}; margin-right: 5px;"></div>
                                    <span>${label}: ${value}</span>
                                </div>
                            `;
                        });

                        innerHtml += `</div>`;
                        tooltipEl.innerHTML = innerHtml;
                    }

                    const position = context.chart.canvas.getBoundingClientRect();
                    const bodyWidth = document.body.clientWidth;
                    const tooltipWidth = Math.min(200, bodyWidth * 0.8);
                    let left = position.left + window.pageXOffset + tooltipModel.caretX;

                    if (left + tooltipWidth > bodyWidth) {
                        left = bodyWidth - tooltipWidth;
                    }
                    if (left < 0) {
                        left = 0;
                    }

                    tooltipEl.style.opacity = 1;
                    tooltipEl.style.position = 'absolute';
                    tooltipEl.style.left = left + 'px';
                    tooltipEl.style.top = position.top + window.pageYOffset + tooltipModel.caretY + 'px';
                    tooltipEl.style.font = tooltipModel.options.bodyFont.string;
                    tooltipEl.style.padding = tooltipModel.options.padding + 'px ' + tooltipModel.options.padding + 'px';
                    tooltipEl.style.pointerEvents = 'none';
                    tooltipEl.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
                    tooltipEl.style.color = 'white';
                    tooltipEl.style.borderRadius = '3px';
                    tooltipEl.style.zIndex = 1000;
                    tooltipEl.style.maxWidth = tooltipWidth + 'px';
                    tooltipEl.style.width = 'auto';
                }
            },
            crosshair: {
                line: {
                    color: '#F66',
                    width: 1,
                    dashPattern: [5, 5]
                },
                sync: {
                    enabled: false
                },
                zoom: {
                    enabled: false
                }
            }
        },
        hover: {
            mode: 'index',
            intersect: false
        },
        scales: {
            x: {
                type: 'time',
                time: {
                    unit: timeUnit,
                    displayFormats: {
                        day: 'MM/dd',
                        week: 'MM/dd',
                        month: 'yyyy/MM',
                        quarter: 'yyyy/[Q]Q',
                        year: 'yyyy'
                    },
                    tooltipFormat: 'yyyy/MM/dd'
                },
                ticks: {
                    maxTicksLimit: 6,
                    autoSkip: true,
                    maxRotation: 0,
                    minRotation: 0
                },
                grid: {
                    drawBorder: true
                }
            },
            y: {
                position: 'right',
                grid: {
                    drawBorder: true
                }
            }
        },
        layout: {
            padding: {
                left: 10,
                right: 30,
                top: 20,
                bottom: 25  // 增加底部邊距，確保 x 軸標籤完全可見
            }
        }
    };

    return (
        <div className="chart-container" style={{ 
            height: '400px',  // 增加容器高度
            marginBottom: '0'  // 移除底部邊距
        }}>
            <Line data={chartData} options={options} />
        </div>
    );
};

export default ULBandChart;
