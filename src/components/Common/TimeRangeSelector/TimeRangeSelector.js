import React from 'react';
import './TimeRangeSelector.css';

// 時間範圍選項
export const TIME_RANGES = [
  { value: '1M', label: '最近1個月' },
  { value: '3M', label: '最近3個月' },
  { value: '6M', label: '最近6個月' },
  { value: '1Y', label: '最近1年' },
  { value: '5Y', label: '最近5年' },
  { value: 'ALL', label: '全部' },
];

function TimeRangeSelector({ selectedTimeRange, handleTimeRangeChange }) {
  return (
    <div className="time-range-selector">
      <select id="timeRange" value={selectedTimeRange} onChange={handleTimeRangeChange}>
        {TIME_RANGES.map((range) => (
          <option key={range.value} value={range.value}>
            {range.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export default TimeRangeSelector; 