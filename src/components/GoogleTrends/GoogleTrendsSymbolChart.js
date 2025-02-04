import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import PropTypes from 'prop-types';
import { formatPrice } from '../Common/priceUtils';
import './GoogleTrendsSymbolChart.css';  // 引入 Chart 樣式

const GoogleTrendsSymbolChart = ({ data }) => {
    if (!data || data.length === 0) {
        return <div className="no-data-message">無可顯示的數據</div>;
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
                    <p>{`日期: ${new Date(label).toLocaleDateString()}`}</p>
                    {payload.map((entry, index) => (
                        <p key={`tooltip-${index}`}>
                            {entry.name}: {entry.name === '股價' ? formatPrice(entry.value) : entry.value}
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
                    tickFormatter={(tick) => new Date(tick).toLocaleDateString()} 
                />
                <YAxis 
                    yAxisId="left" 
                    domain={[0, 100]}
                    label={{ value: 'Google 搜尋熱度 (0-100)', angle: -90, position: 'insideLeft' }} 
                />
                <YAxis 
                    yAxisId="right" 
                    orientation="right"
                    domain={['auto', 'auto']}
                    tickFormatter={formatPrice}
                    label={{ value: '股價 ($)', angle: 90, position: 'insideRight' }} 
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                {/* 動態產生每個搜尋主題的趨勢折線 */}
                {trendKeys.map((trendKey, index) => (
                    <Line 
                        key={trendKey}
                        yAxisId="left"
                        type="monotone"
                        dataKey={trendKey}
                        stroke={trendColors[index % trendColors.length]}
                        name={trendKey.replace('trend_', '').replace(/_/g, ' ')}
                        dot={false}
                    />
                ))}
                {/* 繪製 SPY 股價折線，修改為醒目的特殊樣式 */}
                <Line 
                    yAxisId="right"
                    type="monotone"
                    dataKey="price"
                    // 將線條顏色改為鮮豔的橘紅色，設定較粗且使用虛線模式
                    stroke="#FF4500"
                    strokeWidth={4}
                    dot={false}
                    strokeDasharray="5 5"
                    name="SPY股價"
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
};

export default GoogleTrendsSymbolChart; 