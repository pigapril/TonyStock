import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './MarketSentimentIndex.css';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5001';

function MarketSentimentIndex() {
  const [sentimentData, setSentimentData] = useState(null);

  useEffect(() => {
    async function fetchSentimentData() {
      try {
        const response = await axios.get(`${API_BASE_URL}/api/market-sentiment`);
        setSentimentData(response.data);
      } catch (error) {
        console.error('Error fetching market sentiment data:', error);
      }
    }

    fetchSentimentData();
  }, []);

  if (!sentimentData) {
    return <div>Loading...</div>;
  }

  const { indicators, compositeScore } = sentimentData;

  return (
    <div className="market-sentiment">
      <h2>市場情緒綜合指標</h2>
      <div className="composite-score">
        <h3>綜合指標得分: {compositeScore.toFixed(2)} / 10</h3>
      </div>
      <div className="indicators-list">
        {indicators.map((indicator, index) => (
          <div key={index} className="indicator-item">
            <h4>{indicator.name}</h4>
            <p className={indicator.isRealData ? 'real-data' : 'simulated-data'}>
              數據: {indicator.value}
            </p>
            <p>分數: {indicator.score.toFixed(2)} / 10</p>
            <p className="indicator-description">說明: {indicator.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default MarketSentimentIndex;