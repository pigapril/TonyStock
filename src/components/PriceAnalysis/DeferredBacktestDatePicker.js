import React, { useState } from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

function DeferredBacktestDatePicker({ backTestDate, setBackTestDate, placeholderText, title, autoFocus = false }) {
  const [isOpen, setIsOpen] = useState(autoFocus);
  const handleChange = (date) => {
    setBackTestDate(date ? date.toISOString().split('T')[0] : '');
    setIsOpen(false);
  };
  const handleKeyDown = (event) => {
    if (event.key === 'Escape') setIsOpen(false);
  };

  return (
    <DatePicker
      open={isOpen}
      selected={backTestDate ? new Date(backTestDate) : null}
      onChange={handleChange}
      onInputClick={() => setIsOpen(true)}
      onClickOutside={() => setIsOpen(false)}
      onKeyDown={handleKeyDown}
      placeholderText={placeholderText}
      title={title}
      className="form-control"
      autoFocus={autoFocus}
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
