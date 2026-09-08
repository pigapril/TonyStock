import React from 'react';
import { render, screen, act } from '@testing-library/react';
import PriceAnalysisTour from '../PriceAnalysisTour';

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
  // jsdom 的 getBoundingClientRect 一律回 0，等同三步的目標都量不到。
  it('三步都量不到時會一路往下走，最後一步仍畫得出卡片與「略過」', () => {
    render(<PriceAnalysisTour t={t} onFinish={jest.fn()} />);

    // 重試還沒跑完之前不畫，免得卡片先閃一下置中位置
    expect(screen.queryByText('priceAnalysis.tour.skip')).not.toBeInTheDocument();

    act(() => { jest.advanceTimersByTime(600); }); // 第一步量不到 → 跳第二步
    act(() => { jest.advanceTimersByTime(600); }); // 第二步量不到 → 跳第三步
    act(() => { jest.advanceTimersByTime(600); }); // 最後一步量不到 → 置中 fallback

    expect(screen.getByText('3 / 3')).toBeInTheDocument();
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
    expect(screen.getByText('1 / 3')).toBeInTheDocument();

    target.remove();
  });
});
