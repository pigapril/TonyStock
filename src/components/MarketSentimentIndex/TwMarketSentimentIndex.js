import React from 'react';
import MarketSentimentIndex from './MarketSentimentIndex';
import { TW_MARKET_SENTIMENT_CONFIG } from './marketConfigs';

export default function TwMarketSentimentIndex() {
  return <MarketSentimentIndex marketConfig={TW_MARKET_SENTIMENT_CONFIG} />;
}
