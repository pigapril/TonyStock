import React from 'react';
import { useTranslation } from 'react-i18next';
import './TimeRangeSelector.css';

// 2. Change TIME_RANGES to use keys instead of labels
const TIME_RANGE_KEYS = [
  { value: '1M', key: 'timeRangeSelector.month1' },
  { value: '3M', key: 'timeRangeSelector.month3' },
  { value: '6M', key: 'timeRangeSelector.month6' },
  { value: '1Y', key: 'timeRangeSelector.year1' },
  { value: '2Y', key: 'timeRangeSelector.year2' },
  { value: '3Y', key: 'timeRangeSelector.year3' },
  { value: '5Y', key: 'timeRangeSelector.year5' },
  { value: '10Y', key: 'timeRangeSelector.year10' },
  { value: '20Y', key: 'timeRangeSelector.year20' },
];

function TimeRangeSelector({ selectedTimeRange, handleTimeRangeChange }) {
  const { t } = useTranslation();

  return (
    <div className="time-range-selector">
      <select id="timeRange" value={selectedTimeRange} onChange={handleTimeRangeChange}>
        {TIME_RANGE_KEYS.map((range) => (
          <option key={range.value} value={range.value}>
            {t(range.key)}
          </option>
        ))}
      </select>
    </div>
  );
}

export default TimeRangeSelector;
// 5. Export the keys array if needed elsewhere, otherwise keep it internal
// export { TIME_RANGE_KEYS }; 