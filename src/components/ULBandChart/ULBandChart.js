import React, { useRef, useEffect } from 'react';
import { Line } from 'react-chartjs-2';
import { formatPrice } from '../../utils/priceUtils';
import { useTranslation } from 'react-i18next';
import { useMediaQuery } from 'react-responsive';
import { useMobileTouchHandler } from './useMobileTouchHandler';
import { ensureHomeChartsRegistered } from '../../utils/homeChartRegistry';

ensureHomeChartsRegistered();

// follower：與五線譜上下並排時，通道圖只跟隨主圖的 x 範圍，自身不接受縮放/平移，
// 這樣兩張圖的時間軸不會各走各的。單獨使用時（沒傳 follower）行為與原本相同。
/**
 * follower 模式的 tooltip：改用 HTML 畫，因為 canvas 版的預設排版在只有約
 * 110px 高的通道帶裡一定會蓋住線。節點掛在 .chart-stack__band（position: relative）。
 * 位置就留在圖內、只避開當下的點：橫向擺在標線旁邊，縱向擺在離該點較遠的那一半。
 */
function renderExternalTooltip(context) {
    const { chart, tooltip } = context;
    const parent = chart.canvas?.parentElement;
    if (!parent) {
        return;
    }

    let el = parent.querySelector('.ulband-external-tooltip');
    if (!el) {
        el = document.createElement('div');
        el.className = 'ulband-external-tooltip';
        parent.appendChild(el);
    }

    if (!tooltip || tooltip.opacity === 0) {
        el.style.opacity = '0';
        return;
    }

    const title = tooltip.title?.[0] || '';
    const rows = (tooltip.body || []).map((item, index) => {
        const color = tooltip.labelColors?.[index]?.borderColor || '#999';
        return `<span class="ulband-external-tooltip__row">`
            + `<i style="background:${color}"></i>${item.lines?.[0] || ''}</span>`;
    }).join('');

    el.innerHTML = `<span class="ulband-external-tooltip__title">${title}</span>${rows}`;
    el.style.opacity = '1';

    const area = chart.chartArea;
    const width = el.offsetWidth || 160;
    const height = el.offsetHeight || 60;
    const GAP = 14;

    // 橫向：擺在標線旁邊，放不下就換另一邊
    let left = tooltip.caretX + GAP;
    if (left + width > parent.clientWidth - 4) {
        left = tooltip.caretX - GAP - width;
    }
    el.style.left = `${Math.min(Math.max(left, 4), Math.max(4, parent.clientWidth - width - 4))}px`;

    // 縱向：點在上半就擺下半，反之亦然，這樣不會壓到當下的點
    if (area) {
        const middle = (area.top + area.bottom) / 2;
        const top = tooltip.caretY < middle
            ? area.bottom - height - 2
            : area.top + 2;
        el.style.top = `${Math.max(2, top)}px`;
    }
}

const ULBandChart = ({ data, onChartReady, follower = false, xRange = null }) => {
    const { t } = useTranslation();
    const chartRef = useRef(null);
    const isMobile = useMediaQuery({ query: '(max-width: 768px)' });

    // 使用自定義 Hook 處理手機版觸控（follower 模式不攔截觸控，交給主圖）
    useMobileTouchHandler(chartRef, isMobile, !follower);

    // 當圖表準備好時，通知父組件
    useEffect(() => {
        if (chartRef.current && onChartReady) {
            onChartReady(chartRef.current);
        }
    }, [chartRef.current, onChartReady]);

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

    // 計算 x 軸的最大值，手機版增加更多空間
    let xAxisMax = undefined;
    if (data.dates && data.dates.length > 0) {
        const lastDate = new Date(data.dates[data.dates.length - 1]);
        const firstDate = new Date(data.dates[0]);
        const timeRange = lastDate - firstDate;
        // 手機版增加更多空間以容納標籤
        const spaceRatio = isMobile ? 0.15 : 0.1;
        xAxisMax = new Date(lastDate.getTime() + timeRange * spaceRatio);
    }

    const chartData = {
        labels: data.dates,
        datasets: [
            {
                label: t('ulBandChart.upperBandLabel'),
                data: data.upperBand,
                borderColor: '#D24A93',  // 極度貪婪 - 深紅褐色
                borderWidth: 2,
                fill: false,
                pointRadius: 0
            },
            {
                label: t('ulBandChart.ma20Label'),
                data: data.ma20,
                borderColor: '#708090',  // 中性 - 橙黃色
                borderWidth: 2,
                fill: false,
                pointRadius: 0
            },
            {
                label: t('ulBandChart.priceLabel'),
                data: data.prices,
                borderColor: '#000000',     // 保持與標準差分析相同的黑色
                borderWidth: 2,
                fill: false,
                pointRadius: 0
            },
            {
                label: t('ulBandChart.lowerBandLabel'),
                data: data.lowerBand,
                borderColor: '#0000FF',  // 極度恐懼 - 深墨綠色
                borderWidth: 2,
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
                // follower 是高度約 110px 的輔助帶，畫在 canvas 上的 tooltip 幾乎和它
                // 一樣高，一定會蓋住線。所以改用 external：內容一樣是 tooltip，
                // 但用 HTML 畫在通道帶「上方」，不佔用帶內空間。
                // external 要搭配 enabled:false，否則 canvas 版仍會照畫。
                enabled: !follower,
                ...(follower ? { external: renderExternalTooltip } : {}),
                mode: 'index',
                intersect: false,
                usePointStyle: true,
                position: 'nearest',
                backgroundColor: '#ffffff',
                titleColor: '#000000',
                bodyColor: '#000000',
                borderColor: '#cccccc',
                borderWidth: 1,
                yAlign: function(context) {
                    // 動態判斷 tooltip 應該顯示在上方還是下方
                    if (!context.tooltip || !context.tooltip.dataPoints || context.tooltip.dataPoints.length === 0) {
                        return 'top';
                    }
                    
                    // 找到價格線的數據點（datasetIndex = 2）
                    const pricePoint = context.tooltip.dataPoints.find(point => point.datasetIndex === 2);
                    if (!pricePoint || !pricePoint.element) return 'top';
                    
                    // 獲取圖表區域的高度
                    const chartArea = context.chart.chartArea;
                    if (!chartArea) return 'top';
                    
                    const chartHeight = chartArea.bottom - chartArea.top;
                    const chartMiddle = chartArea.top + (chartHeight / 2);
                    
                    // 使用價格點的 Y 座標來判斷（這個值對同一數據點是固定的）
                    const priceY = pricePoint.element.y;
                    
                    // 如果價格點在圖表上半部，tooltip 顯示在下方（yAlign: 'top'）
                    // 如果價格點在圖表下半部，tooltip 顯示在上方（yAlign: 'bottom'）
                    return priceY < chartMiddle ? 'top' : 'bottom';
                },
                xAlign: 'center',
                caretSize: 6,
                caretPadding: 35,
                displayColors: true,
                callbacks: {
                    labelColor: function(context) {
                        return {
                            backgroundColor: context.dataset.borderColor,
                            borderColor: context.dataset.borderColor,
                            borderWidth: 0
                        };
                    },
                    label: function(context) {
                        const label = context.dataset.label || '';
                        const value = context.parsed.y;
                        return `${label}: ${formatPrice(value)}`;
                    }
                },
                itemSort: (a, b) => b.parsed.y - a.parsed.y
            },

            annotation: {
                annotations: (() => {
                    const annotations = {};
                    
                    // 只在有數據時添加 annotations
                    if (data.dates && data.dates.length > 0) {
                        const lastIndex = data.dates.length - 1;
                        const lastDate = data.dates[lastIndex];
                        
                        // 為所有線條添加虛線。
                        // follower 是高度只有 100px 出頭的輔助帶，四組端點標籤會互相疊住、
                        // 右緣也放不下，所以只標價格線（index 2）。
                        chartData.datasets.forEach((dataset, index) => {
                            if (follower && index !== 2) {
                                return;
                            }
                            if (dataset.data && dataset.data.length > 0) {
                                const lastValue = dataset.data[lastIndex];
                                
                                annotations[`line-${index}`] = {
                                    type: 'line',
                                    yMin: lastValue,
                                    yMax: lastValue,
                                    xMin: lastDate,
                                    xMax: xAxisMax || lastDate,
                                    borderColor: dataset.borderColor || '#999',
                                    borderWidth: index === 2 ? 2 : 1, // 價格線（index=2）稍粗
                                    borderDash: [5, 5]
                                };
                                
                                // 為所有線條添加標籤
                                annotations[`label-${index}`] = {
                                    type: 'label',
                                    drawTime: 'afterDraw',
                                    xScaleID: 'x',
                                    yScaleID: 'y',
                                    xValue: xAxisMax || lastDate,
                                    yValue: lastValue,
                                    backgroundColor: dataset.borderColor || '#999',
                                    color: '#fff',
                                    content: `${formatPrice(lastValue)}`,
                                    font: {
                                        size: 12,
                                        weight: 'bold'
                                    },
                                    padding: {
                                        top: 2,
                                        bottom: 2,
                                        left: 5,
                                        right: 5
                                    },
                                    borderRadius: 3,
                                    position: {
                                        x: 'end',
                                        y: 'center'
                                    },
                                    xAdjust: index === 2 ? 2 : 35, // 價格線（index=2）更靠右
                                    yAdjust: 0
                                };
                            }
                        });
                    }
                    
                    return annotations;
                })()
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
                        quarter: "yyyy/'Q'Q",
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
                },
                ...(xAxisMax && { max: xAxisMax }), // 動態設置 x 軸最大值
                // 跟隨主圖的範圍。必須走 props 進到 options：只在 chart.options 上
                // 直接改，任何一次 React 重繪都會用 props 重建 options 把它沖掉，
                // 通道圖就會「跳回原狀」。
                ...(xRange && Number.isFinite(xRange.min) && Number.isFinite(xRange.max)
                    ? { min: xRange.min, max: xRange.max }
                    : {})
            },
            y: {
                position: 'right',
                grid: {
                    drawBorder: true
                },
                ticks: {
                    // 這裡的刻度不只是給人看的：右側 y 軸會佔掉固定寬度，
                    // 主圖也有一個。把它藏起來會讓通道圖的繪圖區變寬、
                    // 兩張圖的時間軸就對不齊了，所以一定要保留。
                    callback: function(value, index, ticks) {
                        // 獲取所有數據集的最後一個值
                        if (!data.dates || data.dates.length === 0) return value;
                        
                        const lastIndex = data.dates.length - 1;
                        const dataValues = [
                            data.upperBand?.[lastIndex],
                            data.ma20?.[lastIndex],
                            data.prices?.[lastIndex],
                            data.lowerBand?.[lastIndex]
                        ].filter(v => v !== undefined && v !== null)
                         .sort((a, b) => a - b); // 排序以找出最大最小值
                        
                        if (dataValues.length === 0) return value;
                        
                        const minDataValue = dataValues[0];
                        const maxDataValue = dataValues[dataValues.length - 1];
                        
                        // 如果刻度值在數據值範圍之間，則隱藏
                        if (value > minDataValue && value < maxDataValue) {
                            return '';
                        }
                        
                        return value;
                    }
                }
            }
        },
        layout: {
            // follower 模式是主圖下方的細長輔助帶，維持原本的內距會把線擠成一條、
            // 下面留一大塊空白，所以壓縮上下留白。
            padding: follower
                ? { left: 10, right: 15, top: 6, bottom: 2 }
                : { left: 10, right: 15, top: 20, bottom: 25 }
        },
        clip: false
    };

    // 在 options 定義完成後，添加 zoom 插件配置到 plugins
    options.plugins.zoom = follower ? {
        // follower 模式：完全交由主圖控制，避免兩張圖各自縮放後時間軸對不上
        pan: { enabled: false },
        zoom: { wheel: { enabled: false }, pinch: { enabled: false } }
    } : {
        pan: {
            enabled: !isMobile, // 手機版禁用 pan（由透明層處理）
            mode: 'x',
            modifierKey: undefined,
            onPanStart: () => true
        },
        zoom: {
            wheel: {
                enabled: !isMobile, // 手機版禁用滾輪縮放
                speed: 0.1
            },
            pinch: {
                enabled: isMobile // 只在手機版啟用雙指縮放
            },
            mode: 'x',
            onZoomStart: ({ chart, event }) => {
                // 手機版雙指縮放時，阻止預設的頁面縮放行為
                if (isMobile && event && event.touches && event.touches.length === 2) {
                    event.preventDefault();
                    return true;
                }
                return true;
            }
        },
        limits: {
            x: {
                min: 'original',
                max: 'original'
            }
        }
    };

    // 自動顯示最新數據點的 tooltip。
    // follower 模式下主圖已經有一組自動 tooltip，兩張同時彈會太吵，這裡不重複。
    useEffect(() => {
        if (data && chartRef.current && !follower) {
            // 使用 setTimeout 確保圖表已完全渲染
            const timer = setTimeout(() => {
                const chart = chartRef.current;
                // 檢查圖表是否存在、已掛載且有數據
                if (chart && chart.canvas && chart.canvas.parentNode && chart.data && chart.data.labels && chart.data.labels.length > 0) {
                    try {
                        const lastIndex = chart.data.labels.length - 1;
                        
                        // 設置活動元素為所有數據集的最後一個數據點
                        const activeElements = chart.data.datasets.map((dataset, datasetIndex) => ({
                            datasetIndex,
                            index: lastIndex
                        }));
                        
                        chart.setActiveElements(activeElements);
                        
                        // 獲取價格線（datasetIndex = 2）的最後一個數據點位置
                        const priceDatasetMeta = chart.getDatasetMeta(2);
                        if (priceDatasetMeta && priceDatasetMeta.data[lastIndex]) {
                            const priceElement = priceDatasetMeta.data[lastIndex];
                            // 使用價格點的實際位置來顯示 tooltip
                            chart.tooltip.setActiveElements(activeElements, { 
                                x: priceElement.x, 
                                y: priceElement.y 
                            });
                        } else {
                            // 如果找不到價格點，使用預設方式
                            chart.tooltip.setActiveElements(activeElements);
                        }
                        
                        // 更新圖表以顯示 tooltip
                        chart.update('none');
                    } catch (error) {
                        console.warn('Failed to show tooltip:', error);
                    }
                }
            }, 300);
            
            return () => clearTimeout(timer);
        }
    }, [data, follower]);

    // 提前返回，但在所有 Hooks 之後
    if (!data) return null;

    return (
        <Line ref={chartRef} data={chartData} options={options} />
    );
};

export default ULBandChart;
