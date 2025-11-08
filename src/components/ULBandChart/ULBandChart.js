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

    // 計算 x 軸的最大值，在最後一個數據點後增加 5% 的空間
    let xAxisMax = undefined;
    if (data.dates && data.dates.length > 0) {
        const lastDate = new Date(data.dates[data.dates.length - 1]);
        const firstDate = new Date(data.dates[0]);
        const timeRange = lastDate - firstDate;
        // 在右側增加 5% 的時間範圍作為空白
        xAxisMax = new Date(lastDate.getTime() + timeRange * 0.05);
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
                enabled: true,
                mode: 'index',
                intersect: false,
                usePointStyle: true,
                position: 'nearest',
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
                        
                        // 為所有線條添加虛線
                        chartData.datasets.forEach((dataset, index) => {
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
                                
                                // 只為價格線（index === 2）添加標籤
                                if (index === 2) {
                                    annotations['price-label'] = {
                                        type: 'label',
                                        drawTime: 'afterDraw',
                                        xScaleID: 'x',
                                        yScaleID: 'y',
                                        xValue: xAxisMax || lastDate,
                                        yValue: lastValue,
                                        backgroundColor: dataset.borderColor || '#000000',
                                        color: '#fff',
                                        content: `$${formatPrice(lastValue)}`,
                                        font: {
                                            size: 11,
                                            weight: 'bold'
                                        },
                                        padding: {
                                            top: 3,
                                            bottom: 3,
                                            left: 6,
                                            right: 6
                                        },
                                        borderRadius: 3,
                                        position: {
                                            x: 'end',
                                            y: 'center'
                                        },
                                        xAdjust: 35,
                                        yAdjust: 0
                                    };
                                }
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
                },
                ...(xAxisMax && { max: xAxisMax }) // 動態設置 x 軸最大值
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
                right: 25,
                top: 20,
                bottom: 25
            }
        },
        clip: false
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
    }, [data]);

    // 提前返回，但在所有 Hooks 之後
    if (!data) return null;

    return (
        <Line ref={chartRef} data={chartData} options={options} />
    );
};

export default ULBandChart;
