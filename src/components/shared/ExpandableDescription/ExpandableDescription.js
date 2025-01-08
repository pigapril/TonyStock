import React, { useState } from 'react';
import './ExpandableDescription.css'; // 可以添加樣式

const ExpandableDescription = ({ text }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleToggle = () => {
    setIsExpanded(!isExpanded);
  };

  const lines = text.split('\n');
  const shortText = lines.slice(0, 2).join('\n'); // 只顯示前兩行
  const isLongText = lines.length > 2;

  return (
    <div className="expandable-description">
      <div className={`description-content ${isExpanded ? 'expanded' : 'collapsed'}`}>
        {isExpanded ? (
          text
        ) : (
          lines.length > 2 ? shortText : text // 如果行數小於等於 2，則顯示全部 text
        )}
      </div>
      {isLongText && (
        <button className="toggle-button" onClick={handleToggle}>
          {isExpanded ? '收起' : '展開更多'}
        </button>
      )}
      <div className={`overlay ${isExpanded ? 'hidden' : ''}`} />
    </div>
  );
};

export default ExpandableDescription; 