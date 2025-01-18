import React from 'react';
import './PageContainer.css';
import { Helmet } from 'react-helmet-async';

const PageContainer = ({ children, title, description }) => {
  const defaultTitle = "Sentiment Inside Out - 市場情緒分析";
  const defaultDescription = "掌握市場情緒，克服投資上的恐懼和貪婪心態。";

  const pageTitle = title ? `${title} | ${defaultTitle}` : defaultTitle;
  const pageDescription = description || defaultDescription;

  return (
    <div className="page-container">
      <Helmet>
        <title>{pageTitle}</title>
        <meta name="description" content={pageDescription} />
      </Helmet>
      <div className="page-content">
        {children}
      </div>
    </div>
  );
};

export default PageContainer;
