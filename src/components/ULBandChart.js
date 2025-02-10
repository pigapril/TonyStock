import React from 'react';
import { Line } from 'react-chartjs-2';
import { formatPrice } from './Common/priceUtils';

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
                label: '上緣',
                data: data.upperBand,
                borderColor: '#A0361B',  // 極度貪婪 - 深紅褐色
                borderWidth: 1,
                fill: false,
                pointRadius: 0
            },
            {
                label: 'MA20',
                data: data.ma20,
                borderColor: '#E9972D',  // 中性 - 橙黃色
                borderWidth: 1,
                fill: false,
                pointRadius: 0
            },
            {
                label: '價格',
                data: data.prices,
                borderColor: 'blue',     // 保持與標準差分析相同的藍色
                borderWidth: 1,
                fill: false,
                pointRadius: 0
            },
            {
                label: '下緣',
                data: data.lowerBand,
                borderColor: '#143829',  // 極度恐懼 - 深墨綠色
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

    return (
        <div className="chart-content">
            <Line data={chartData} options={options} />
        </div>
    );
};

export default ULBandChart;
