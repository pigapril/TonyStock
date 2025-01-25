import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import PropTypes from 'prop-types';

const GoogleTrendsChart = ({ data }) => {
    if (!data || data.length === 0) {
        return <div>No data to display</div>; // 或顯示其他訊息
    }

    return (
        <ResponsiveContainer width="100%" height={400}>
            <LineChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tickFormatter={(tick) => new Date(tick).toLocaleDateString()} />
                <YAxis yAxisId="left" label={{ value: 'Google 搜尋熱度 (0-100)', angle: -90, position: 'left' }} />
                <YAxis yAxisId="right" orientation="right" label={{ value: '股價 ($)', angle: -90, position: 'right' }} />
                <Tooltip labelFormatter={(label) => new Date(label).toLocaleDateString()} />
                <Legend />
                <Line yAxisId="left" type="monotone" dataKey="trend_index" stroke="#8884d8" name="搜尋熱度" />
                <Line yAxisId="right" type="monotone" dataKey="price" stroke="#82ca9d" name="股價" />
            </LineChart>
        </ResponsiveContainer>
    );
};

GoogleTrendsChart.propTypes = {
    data: PropTypes.arrayOf(
        PropTypes.shape({
            date: PropTypes.string.isRequired,
            trend_index: PropTypes.number,
            price: PropTypes.number,
        })
    ).isRequired,
};

export default GoogleTrendsChart; 