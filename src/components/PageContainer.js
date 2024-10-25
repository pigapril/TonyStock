import React from 'react';
import './PageContainer.css';

const PageContainer = ({ children, title, description }) => {
  return (
    <div className="page-container">
      {title && <h2>{title}</h2>}
      {description && <p className="analysis-description">{description}</p>}
      <div className="page-content">
        {children}
      </div>
    </div>
  );
};

export default PageContainer;
