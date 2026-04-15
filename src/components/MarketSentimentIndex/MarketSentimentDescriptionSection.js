import React from 'react';
import { useTranslation } from 'react-i18next';
import FAQ from './FAQ/FAQ';
import './MarketSentimentDescriptionSection.css';

function MarketSentimentDescriptionSection({
  activeIndicator = 'composite',
  className = ''
}) {
  const { t } = useTranslation();

  return (
    <section className={`msiLearn ${className}`}>
      <div className="msiLearn__header">
        <div className="msiLearn__heading">
          <h2 className="msiLearn__title">{t('marketSentiment.enhancedDescription.tabs.faq')}</h2>
        </div>
      </div>

      <div className="msiLearn__body">
        <FAQ activeIndicator={activeIndicator} />
      </div>
    </section>
  );
}

export default MarketSentimentDescriptionSection;
