import React, { useState, useEffect } from 'react';
import './AnnouncementBar.css';

const AnnouncementBar = ({ message, isVisible, onClose }) => {
  const [showBar, setShowBar] = useState(isVisible);

  useEffect(() => {
    setShowBar(isVisible);
  }, [isVisible]);

  if (!showBar) return null;

  return (
    <div className="announcement-bar">
      <div className="announcement-content">
        <p className="announcement-message">{message}</p>
      </div>
      <button className="announcement-close" onClick={() => {
        setShowBar(false);
        if (onClose) onClose();
      }}>
        &times;
      </button>
    </div>
  );
};

export default AnnouncementBar;