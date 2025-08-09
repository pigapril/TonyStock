import React from 'react';
import { render, screen } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import i18n from '../../../../i18n';
import MarketSentimentGauge from '../MarketSentimentGauge';

// Mock styled-components
jest.mock('styled-components', () => ({
  __esModule: true,
  default: () => (props) => {
    const mockReact = require('react');
    return mockReact.createElement('div', {
      'data-testid': 'styled-gauge-chart',
      ...props
    });
  },
}));

// Mock react-gauge-chart
jest.mock('react-gauge-chart', () => {
  const mockReact = require('react');
  return function MockGaugeChart(props) {
    return mockReact.createElement('div', {
      'data-testid': 'gauge-chart',
      'data-percent': props.percent
    });
  };
});

const mockSentimentData = {
  totalScore: 75,
  compositeScoreLastUpdate: '2024-01-15T10:30:00Z'
};

const renderWithI18n = (component) => {
  return render(
    <I18nextProvider i18n={i18n}>
      {component}
    </I18nextProvider>
  );
};

describe('MarketSentimentGauge', () => {
  test('renders with valid sentiment data', () => {
    const initialRenderRef = { current: false };
    
    renderWithI18n(
      <MarketSentimentGauge
        sentimentData={mockSentimentData}
        isDataLoaded={true}
        initialRenderRef={initialRenderRef}
      />
    );

    // 檢查是否顯示分析結果
    expect(screen.getByText(/當前市場情緒|Current Market Sentiment/)).toBeInTheDocument();
    
    // 檢查是否顯示 gauge 圖表
    expect(screen.getByTestId('gauge-chart')).toBeInTheDocument();
    
    // 檢查是否顯示數值
    expect(screen.getByText('75')).toBeInTheDocument();
    
    // 檢查是否顯示最後更新時間
    expect(screen.getByText(/最後更新|Last Update/)).toBeInTheDocument();
  });

  test('renders loading state when no data', () => {
    const initialRenderRef = { current: true };
    
    renderWithI18n(
      <MarketSentimentGauge
        sentimentData={null}
        isDataLoaded={false}
        initialRenderRef={initialRenderRef}
      />
    );

    // 檢查是否顯示載入狀態
    expect(screen.getByText(/載入中|Loading/)).toBeInTheDocument();
  });

  test('renders error state with invalid data', () => {
    const invalidData = { totalScore: null, compositeScoreLastUpdate: '2024-01-15T10:30:00Z' };
    const initialRenderRef = { current: false };
    
    renderWithI18n(
      <MarketSentimentGauge
        sentimentData={invalidData}
        isDataLoaded={true}
        initialRenderRef={initialRenderRef}
      />
    );

    // 檢查是否顯示錯誤狀態
    expect(screen.getByText(/數據載入失敗|Invalid Data/)).toBeInTheDocument();
  });

  test('respects showAnalysisResult prop', () => {
    const initialRenderRef = { current: false };
    
    renderWithI18n(
      <MarketSentimentGauge
        sentimentData={mockSentimentData}
        isDataLoaded={true}
        initialRenderRef={initialRenderRef}
        showAnalysisResult={false}
      />
    );

    // 檢查分析結果是否被隱藏
    expect(screen.queryByText(/當前市場情緒|Current Market Sentiment/)).not.toBeInTheDocument();
  });

  test('respects showLastUpdate prop', () => {
    const initialRenderRef = { current: false };
    
    renderWithI18n(
      <MarketSentimentGauge
        sentimentData={mockSentimentData}
        isDataLoaded={true}
        initialRenderRef={initialRenderRef}
        showLastUpdate={false}
      />
    );

    // 檢查最後更新時間是否被隱藏
    expect(screen.queryByText(/最後更新|Last Update/)).not.toBeInTheDocument();
  });

  test('applies correct size class', () => {
    const initialRenderRef = { current: false };
    
    const { container } = renderWithI18n(
      <MarketSentimentGauge
        sentimentData={mockSentimentData}
        isDataLoaded={true}
        initialRenderRef={initialRenderRef}
        size="large"
      />
    );

    // 檢查是否應用了正確的尺寸類
    expect(container.firstChild).toHaveClass('size-large');
  });

  test('applies custom className', () => {
    const initialRenderRef = { current: false };
    
    const { container } = renderWithI18n(
      <MarketSentimentGauge
        sentimentData={mockSentimentData}
        isDataLoaded={true}
        initialRenderRef={initialRenderRef}
        className="custom-class"
      />
    );

    // 檢查是否應用了自定義類名
    expect(container.firstChild).toHaveClass('custom-class');
  });
});