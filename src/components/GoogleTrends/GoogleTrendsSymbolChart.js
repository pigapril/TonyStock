import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import PropTypes from 'prop-types';
import './GoogleTrendsSymbolChart.css';  // 引入 Chart 樣式

const GoogleTrendsSymbolChart = ({ data }) => {
    if (!data || data.length === 0) {
        return <div className="no-data-message">無可顯示的數據</div>;
    }

    // 確保數據格式正確
    const formattedData = data.map(item => ({
        ...item,
        date: new Date(item.date).toISOString(),
        trend_index: Number(item.trend_index),
        price: Number(item.price)
    }));

    // 新增：記錄格式化後的數據樣本
    if (formattedData && formattedData.length > 0) {
        console.log('Formatted data sample:', formattedData[0]);
    }

    const CustomTooltip = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
            return (
                <div className="google-trends-tooltip">
                    <p>{`日期: ${new Date(label).toLocaleDateString()}`}</p>
                    <p>{`搜尋熱度: ${payload[0].value}`}</p>
                    <p>{`股價: $${payload[1].value.toFixed(2)}`}</p>
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
                    label={{ value: '股價 ($)', angle: 90, position: 'insideRight' }} 
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Line 
                    yAxisId="left" 
                    type="monotone" 
                    dataKey="trend_index" 
                    stroke="#8884d8" 
                    name="搜尋熱度"
                    dot={false}
                />
                <Line 
                    yAxisId="right" 
                    type="monotone" 
                    dataKey="price" 
                    stroke="#82ca9d" 
                    name="股價"
                    dot={false}
                />
            </LineChart>
        </ResponsiveContainer>
    );
};

GoogleTrendsSymbolChart.propTypes = {
    data: PropTypes.arrayOf(
        PropTypes.shape({
            date: PropTypes.string.isRequired,
            trend_index: PropTypes.number,
            price: PropTypes.number,
        })
    ).isRequired,
};

export default GoogleTrendsSymbolChart; 