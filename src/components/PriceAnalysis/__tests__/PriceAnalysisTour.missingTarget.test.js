import React from 'react';
import { render, screen, act, fireEvent } from '@testing-library/react';
import PriceAnalysisTour from '../PriceAnalysisTour';
import { TOUR_STORAGE_KEY } from '../tourStorageKey';

// 導覽只認得 key，測試就用 key 當文字，不必拉整包翻譯進來。
const t = (key) => key;

describe('PriceAnalysisTour：量不到目標時仍要留出口', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    // jsdom 沒有 scrollIntoView
    Element.prototype.scrollIntoView = jest.fn();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  // 這條釘的是一個真的會關住人的行為：早期版本在量不到目標時整個 return null，
  // 連「略過」都消失。導覽的目標不保證存在——例如只有極度恐懼／貪婪時才 render
  // 的那段——所以量不到必須有出路。
  // jsdom 的 getBoundingClientRect 一律回 0，等同四步的目標都量不到。
  it('四步都量不到時會一路往下走，最後一步仍畫得出卡片與「略過」', () => {
    render(<PriceAnalysisTour t={t} onFinish={jest.fn()} />);

    // 重試還沒跑完之前不畫，免得卡片先閃一下置中位置
    expect(screen.queryByText('priceAnalysis.tour.skip')).not.toBeInTheDocument();

    act(() => { jest.advanceTimersByTime(600); }); // 第一步量不到 → 跳第二步
    act(() => { jest.advanceTimersByTime(600); }); // 第二步量不到 → 跳第三步
    act(() => { jest.advanceTimersByTime(600); }); // 第三步量不到 → 跳其他指標
    act(() => { jest.advanceTimersByTime(600); }); // 最後一步量不到 → 置中 fallback

    expect(screen.getByText('4 / 4')).toBeInTheDocument();
    expect(screen.getByText('priceAnalysis.tour.skip')).toBeInTheDocument();
    expect(screen.getByText('priceAnalysis.tour.done')).toBeInTheDocument();
  });

  it('量得到目標就照常畫聚光框，停在那一步', () => {
    const target = document.createElement('div');
    target.className = 'pa-searchbar';
    target.getBoundingClientRect = () => ({ top: 100, left: 50, width: 400, height: 48 });
    document.body.appendChild(target);

    const { container } = render(<PriceAnalysisTour t={t} onFinish={jest.fn()} />);
    act(() => { jest.advanceTimersByTime(600); });

    expect(container.querySelector('.pa-tour__spotlight')).toBeInTheDocument();
    expect(screen.getByText('1 / 4')).toBeInTheDocument();

    target.remove();
  });

  it('結果之後聚焦其他指標，支援返回並在完成時記錄新版導覽', () => {
    const targets = ['pa-searchbar', 'pa-searchbar__controls', 'chart-card', 'pa-indicator'].map((className, index) => {
      const target = document.createElement('div');
      target.className = className;
      target.getBoundingClientRect = () => ({ top: 100 + index * 10, left: 50, width: 400, height: 48 });
      document.body.appendChild(target);
      return target;
    });
    const onFinish = jest.fn();
    window.localStorage.removeItem(TOUR_STORAGE_KEY);
    const { container } = render(<PriceAnalysisTour t={t} onFinish={onFinish} />);

    try {
      for (let i = 0; i < 3; i += 1) {
        fireEvent.click(screen.getByText('priceAnalysis.tour.next'));
      }
      expect(screen.getByText('4 / 4')).toBeInTheDocument();
      expect(screen.getByText('priceAnalysis.tour.indicators.title')).toBeInTheDocument();
      expect(container.querySelector('.pa-tour__spotlight')).toHaveStyle({ top: '124px' });
      fireEvent.click(screen.getByText('priceAnalysis.tour.back'));
      expect(screen.getByText('priceAnalysis.tour.result.title')).toBeInTheDocument();
      fireEvent.click(screen.getByText('priceAnalysis.tour.next'));
      fireEvent.click(screen.getByText('priceAnalysis.tour.done'));
      expect(onFinish).toHaveBeenCalledTimes(1);
      expect(window.localStorage.getItem(TOUR_STORAGE_KEY)).toBe('1');
    } finally {
      targets.forEach((target) => target.remove());
      window.localStorage.removeItem(TOUR_STORAGE_KEY);
    }
  });

});
