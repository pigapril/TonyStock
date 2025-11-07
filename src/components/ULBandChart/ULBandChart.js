import React, { useRef, useEffect } from 'react';
import { Line } from 'react-chartjs-2';
import { formatPrice } from '../../utils/priceUtils';
import { useTranslation } from 'react-i18next';

const ULBandChart = ({ data }) => {
    const { t } = useTranslation();
    const chartRef = useRef(null);

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
                borderColor: '787878',     // 保持與標準差分析相同的藍色
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
                mode: 'index',
                intersect: false,
                usePointStyle: true,
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
                bottom: 25
            }
        }
    };

    // 自動顯示最新數據點的 tooltip
    useEffect(() => {
        if (data && chartRef.current) {
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
                        
                        // 強制顯示 tooltip
                        chart.tooltip.setActiveElements(activeElements, { x: 0, y: 0 });
                        
                        // 更新圖表以顯示 tooltip
                        chart.update('none');
                    } catch (error) {
                        console.warn('Failed to show tooltip:', error);
                    }
                }
            }, 300);
            
            return () => clearTimeout(timer);
        }
    }, [data]);

    // 提前返回，但在所有 Hooks 之後
    if (!data) return null;

    return (
        <Line ref={chartRef} data={chartData} options={options} />
    );
};

export default ULBandChart;
