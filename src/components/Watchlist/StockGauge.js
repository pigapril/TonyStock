import React from 'react';
import { RadialBarChart, RadialBar, PolarAngleAxis } from 'recharts';

export const StockGauge = ({ price, support, resistance }) => {
    const COLORS = {
        veryLow: 'rgba(34, 197, 94, 0.3)',      // green-500 (支撐線以下)
        low: 'rgba(59, 130, 246, 0.3)',         // blue-500 (支撐線到趨勢線)
        medium: 'rgba(234, 179, 8, 0.3)',       // yellow-500 (趨勢線到壓力線)
        high: 'rgba(239, 68, 68, 0.3)',         // red-500 (壓力線以上)
        background: 'rgba(226, 232, 240, 0.3)'   // slate-200
    };

    // 計算百分比
    const calculatePercent = () => {
        if (price <= support) return 0;
        if (price >= resistance) return 100;
        return ((price - support) / (resistance - support)) * 100;
    };

    // 決定顏色
    const getColor = (percent) => {
        if (percent <= 25) return COLORS.veryLow;      // 
        if (percent <= 50) return COLORS.low;          // 藍色區間
        if (percent <= 75) return COLORS.medium;       // 黃色區間
        return COLORS.high;                            // 紅色區間
    };

    const percent = calculatePercent();
    
    // 判斷是否接近端點
    const isNearUpperEdge = percent >= 90;
    const isNearLowerEdge = percent <= 10;

    const data = [
        {
            name: 'Price',
            value: percent,
            fill: getColor(percent)
        }
    ];

    return (
        <div className="watchlist-stock-gauge">
            <RadialBarChart
                width={100}
                height={52}
                cx={50}
                cy={50}
                innerRadius={25}
                outerRadius={45}
                barSize={8}
                data={data}
                startAngle={180}
                endAngle={0}
            >
                <PolarAngleAxis
                    type="number"
                    domain={[0, 100]}
                    angleAxisId={0}
                    tick={false}
                />
                
                <RadialBar
                    background={{ 
                        fill: COLORS.background,
                    }}
                    dataKey="value"
                    cornerRadius={30}
                    fill={getColor(percent)}
                    style={{
                        filter: 'drop-shadow(0 2px 2px rgba(0,0,0,0.03))',
                        transition: 'all 0.3s ease'
                    }}
                />
            </RadialBarChart>
            <div className={`gauge-values ${isNearUpperEdge ? 'near-upper-edge' : ''} ${isNearLowerEdge ? 'near-lower-edge' : ''}`}>
                <span className={`gauge-support ${isNearLowerEdge ? 'pulse' : ''}`}>
                    {support.toFixed(2)}
                </span>
                <span className={`gauge-resistance ${isNearUpperEdge ? 'pulse' : ''}`}>
                    {resistance.toFixed(2)}
                </span>
            </div>
        </div>
    );
};
