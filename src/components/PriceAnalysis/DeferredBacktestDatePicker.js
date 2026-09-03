import React from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

function DeferredBacktestDatePicker({ backTestDate, setBackTestDate, placeholderText, title }) {
  return (
    <DatePicker
      selected={backTestDate ? new Date(backTestDate) : null}
      onChange={(date) => setBackTestDate(date ? date.toISOString().split('T')[0] : '')}
      placeholderText={placeholderText}
      title={title}
      className="form-control"
      dateFormat="yyyy/MM/dd"
      isClearable
      popperPlacement="auto"
      popperProps={{
        strategy: 'fixed'
      }}
    />
  );
}

export default DeferredBacktestDatePicker;
