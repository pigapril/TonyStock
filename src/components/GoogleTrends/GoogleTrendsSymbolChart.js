import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next'; // 1. 引入 useTranslation
import { formatPrice } from '../../utils/priceUtils';
import './GoogleTrendsSymbolChart.css';  // 引入 Chart 樣式

const GoogleTrendsSymbolChart = ({ data, symbol = "股票" }) => {
    const { t } = useTranslation(); // 2. 使用 hook

    if (!data || data.length === 0) {
        // 3. 替換文字
        return <div className="no-data-message">{t('common.noData')}</div>;
    }

    // 格式化資料：日期轉 ISO 字串，股價及趨勢資料轉為數字
    const formattedData = data.map(item => {
        let formattedItem = {
            ...item,
            date: new Date(item.date).toISOString(),
            price: Number(item.price)
        };
        Object.keys(item).forEach(key => {
            if (key.startsWith('trend_')) {
                formattedItem[key] = Number(item[key]);
            }
        });
        return formattedItem;
    });

    // 修改這裡：從所有資料的 keys 裡取得以 "trend_" 為前綴的 key 的聯集
    const trendKeys = Array.from(
        formattedData.reduce((acc, item) => {
            Object.keys(item)
                .filter(key => key.startsWith('trend_'))
                .forEach(key => acc.add(key));
            return acc;
        }, new Set())
    );

    // 定義趨勢線的顏色（可依需求擴充）
    const trendColors = ['#8884d8', '#ff7300', '#82ca9d', '#888888'];

    const CustomTooltip = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
            return (
                <div className="google-trends-tooltip">
                    {/* 3. 替換文字 */}
                    <p>{`${t('googleTrendsChart.tooltipDate')}: ${new Date(label).toLocaleDateString()}`}</p>
                    {payload.map((entry, index) => (
                        <p key={`tooltip-${index}`}>
                            {/* 判斷是否為股價，使用翻譯後的名稱 */}
                            {entry.name === t('googleTrendsChart.priceLineName', { symbol }) ?
                                `${entry.name}: ${formatPrice(entry.value)}` :
                                `${entry.name}: ${entry.value}`
                            }
                        </p>
                    ))}
                </div>
            );
        }
        return null;
    };

    return (
        <ResponsiveContainer width="100%" height={400}>
            <LineChart 
                data={formattedData} 
                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
            >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                    dataKey="date" 
                    tickFormatter={(tick) => {
                        const date = new Date(tick);
                        return `${date.getMonth() + 1}/${date.getDate()}`;
                    }}
                    interval={1}
                    angle={-30}
                    textAnchor="end"
                    height={60}
                />
                <YAxis 
                    yAxisId="left" 
                    domain={[0, 100]}
                    label={{ 
                        value: t('googleTrendsChart.yAxisTrend'),
                        angle: -90, 
                        position: 'insideLeft',
                        offset: 10,  // 調整位置
                        style: { textAnchor: 'middle' }  // 設置為中間對齊
                    }} 
                />
                <YAxis 
                    yAxisId="right" 
                    orientation="right"
                    domain={['auto', 'auto']}
                    tickFormatter={formatPrice}
                    label={{ 
                        value: t('googleTrendsChart.yAxisPrice'),
                        angle: 90, 
                        position: 'insideRight',
                        offset: 10,  // 調整位置
                        style: { textAnchor: 'middle' }  // 設置為中間對齊
                    }} 
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                {/* 動態產生每個搜尋主題的趨勢折線 */}
                {trendKeys.map((trendKey, index) => {
                    // 從 trendKey 提取實際的關鍵詞名稱
                    // 例如從 "trend_short_interest_ratio" 提取為 "Short interest ratio"
                    const keyNameParts = trendKey.replace('trend_', '').split('_');
                    const keyName = keyNameParts.map(part => 
                        part.charAt(0).toUpperCase() + part.slice(1)
                    ).join(' ');
                    
                    return (
                        <Line 
                            key={trendKey}
                            yAxisId="left"
                            type="monotone"
                            dataKey={trendKey}
                            stroke={trendColors[index % trendColors.length]}
                            name={keyName} // 使用提取出的關鍵詞名稱
                            dot={false}
                        />
                    );
                })}
                {/* 繪製股價折線，使用傳入的 symbol 參數 */}
                <Line 
                    yAxisId="right"
                    type="monotone"
                    dataKey="price"
                    stroke="#FF4500"
                    strokeWidth={4}
                    dot={false}
                    strokeDasharray="5 5"
                    name={t('googleTrendsChart.priceLineName', { symbol })}
                />
            </LineChart>
        </ResponsiveContainer>
    );
};

GoogleTrendsSymbolChart.propTypes = {
    data: PropTypes.arrayOf(
        PropTypes.shape({
            date: PropTypes.string.isRequired,
            price: PropTypes.number,
            // 趨勢數據的 key 為動態產生
        })
    ).isRequired,
    symbol: PropTypes.string
};

export default GoogleTrendsSymbolChart; 