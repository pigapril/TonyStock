import React from 'react';
import FAQ from './FAQ/FAQ';
import './MarketSentimentDescriptionSection.css';

function MarketSentimentDescriptionSection({
  activeIndicator = 'composite',
  className = ''
}) {
  return (
    <section className={`msiLearn ${className}`}>
      <div className="msiLearn__header">
        <div className="msiLearn__heading">
          <h2 className="msiLearn__title">FAQ</h2>
        </div>
      </div>

      <div className="msiLearn__body">
        <FAQ activeIndicator={activeIndicator} />
      </div>
    </section>
  );
}

export default MarketSentimentDescriptionSection;
