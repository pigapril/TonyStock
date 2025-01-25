import React, { useState, useEffect, useCallback } from 'react';
import { Line } from 'react-chartjs-2';
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import './PriceAnalysis.css';
import PageContainer from '../components/PageContainer';
import ULBandChart from '../components/ULBandChart';
import axios from 'axios';
import { Analytics } from '../utils/analytics';
import { handleApiError } from '../utils/errorHandler';
import { useMediaQuery } from 'react-responsive';
import Turnstile from 'react-turnstile';
import { formatPrice } from './Common/priceUtils';
import { ExpandableDescription } from '../components/Common/ExpandableDescription/ExpandableDescription';
import { Helmet } from 'react-helmet-async';

// 假設在 .env 檔或 config 有定義 REACT_APP_API_BASE_URL
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || '';

// 輔助函數：決定 X 軸顯示的 timeUnit
function getTimeUnit(dates) {
  const start = new Date(dates[0]);
  const end = new Date(dates[dates.length - 1]);
  const yearDiff = end.getFullYear() - start.getFullYear();

  if (yearDiff > 1) {
    return 'year';
  } else if (yearDiff === 1 || end.getMonth() - start.getMonth() > 3) {
    return 'month';
  } else {
    return 'day';
  }
}

/**
 * 價格標準差分析頁面 (PriceAnalysisPage)
 *
 * 專門負責：1) 抓取API資料 2) 處理表單 3) 顯示標準差圖表 or ULBandChart
 */
export function PriceAnalysis() {
  const isMobile = useMediaQuery({ query: '(max-width: 768px)' });

  // 這裡保留所有原本在 App.js 中標準差分析需要的狀態
  const [stockCode, setStockCode] = useState('SPY');
  const [years, setYears] = useState('3.5');
  const [yearsError, setYearsError] = useState('');
  const [backTestDate, setBackTestDate] = useState('');
  const [chartData, setChartData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [timeoutMessage, setTimeoutMessage] = useState('');
  const [displayedStockCode, setDisplayedStockCode] = useState('');
  const [activeChart, setActiveChart] = useState('sd');
  const [ulbandData, setUlbandData] = useState(null);
  const [turnstileToken, setTurnstileToken] = useState(null);
  const [turnstileVisible, setTurnstileVisible] = useState(true);
  // 新增分析結果狀態
  const [analysisResult, setAnalysisResult] = useState({
    price: null,
    sentiment: null
  });

  // 處理股票代碼的全形/半形轉換
  const handleStockCodeChange = (e) => {
    const value = e.target.value;
    const convertedValue = value.replace(/[０-９Ａ-Ｚａ-ｚ]/g, (char) =>
      String.fromCharCode(char.charCodeAt(0) - 0xFEE0)
    );
    setStockCode(convertedValue.toUpperCase());
  };

  // 切換主圖表 (標準差 or ULBand)
  const handleChartSwitch = (chartType) => {
    Analytics.stockAnalysis.chartSwitch(chartType);
    setActiveChart(chartType);
  };

  // 處理 Turnstile 回調
  const handleTurnstileSuccess = useCallback((token) => {
    setTurnstileToken(token);
    setTimeout(() => {
      setTurnstileVisible(false);
    }, 1000);
  }, []);

  // 資料抓取函式（原本在 App.js）
  const fetchStockData = useCallback(async (stock, yrs, testDate, bypassTurnstile = false) => {
    if (!bypassTurnstile && !turnstileToken) {
      handleApiError(new Error('請先完成驗證'));
      return;
    }

    setLoading(true);
    setTimeoutMessage('');

    try {
      const response = await axios.get(`${API_BASE_URL}/api/stock/integrated-analysis`, {
        params: {
          stockCode: stock,
          years: yrs,
          backTestDate: testDate
        },
        headers: {
          'CF-Turnstile-Token': bypassTurnstile ? undefined : turnstileToken
        },
        timeout: 30000
      });

      const { data } = response.data;
      const {
        dates,
        prices,
        sdAnalysis,
        weeklyDates,
        weeklyPrices,
        upperBand,
        lowerBand,
        ma20
      } = data;

      // 設置標準差圖表數據
      setChartData({
        labels: dates,
        datasets: [
          {
            label: 'Price',
            data: prices,
            borderColor: 'blue',
            borderWidth: 2,
            fill: false,
            pointRadius: 0
          },
          {
            label: 'Trend Line',
            data: sdAnalysis.trendLine,
            borderColor: '#E9972D',
            borderWidth: 2,
            fill: false,
            pointRadius: 0
          },
          {
            label: 'TL-2SD',
            data: sdAnalysis.tl_minus_2sd,
            borderColor: '#143829',
            borderWidth: 2,
            fill: false,
            pointRadius: 0
          },
          {
            label: 'TL-SD',
            data: sdAnalysis.tl_minus_sd,
            borderColor: '#2B5B3F',
            borderWidth: 2,
            fill: false,
            pointRadius: 0
          },
          {
            label: 'TL+SD',
            data: sdAnalysis.tl_plus_sd,
            borderColor: '#C4501B',
            borderWidth: 2,
            fill: false,
            pointRadius: 0
          },
          {
            label: 'TL+2SD',
            data: sdAnalysis.tl_plus_2sd,
            borderColor: '#A0361B',
            borderWidth: 2,
            fill: false,
            pointRadius: 0
          }
        ],
        timeUnit: getTimeUnit(dates)
      });

      setDisplayedStockCode(stock);

      // 設置超漲超跌通道數據
      setUlbandData({
        dates: weeklyDates,
        prices: weeklyPrices,
        upperBand,
        lowerBand,
        ma20
      });

      // 計算情緒分析
      if (prices && prices.length > 0 && sdAnalysis) {
        const lastPrice = prices[prices.length - 1];
        const { trendLine, tl_plus_2sd, tl_plus_sd, tl_minus_sd, tl_minus_2sd } = sdAnalysis;
        const lastTrendLine = trendLine[trendLine.length - 1];
        const lastTlPlusSd = tl_plus_sd[tl_plus_sd.length - 1];
        const lastTlMinusSd = tl_minus_sd[tl_minus_sd.length - 1];

        // 計算趨勢線的上下2.5%範圍
        const upperNeutralBound = lastTrendLine * 1.025;
        const lowerNeutralBound = lastTrendLine * 0.975;

        let sentiment = '中性';
        
        // 判斷市場情緒
        if (lastPrice >= lastTlPlusSd) {
          sentiment = '極度樂觀';
        } else if (lastPrice > upperNeutralBound) {
          sentiment = '樂觀';
        } else if (lastPrice <= lastTlMinusSd) {
          sentiment = '極度悲觀';
        } else if (lastPrice < lowerNeutralBound) {
          sentiment = '悲觀';
        }
        // 如果在趨勢線上下2.5%範圍內，維持中性
        
        setAnalysisResult({
          price: lastPrice.toFixed(2),
          sentiment: sentiment
        });
      }
    } catch (error) {
      if (error.code === 'ECONNABORTED') {
        setTimeoutMessage('分析超時，請稍後重試或縮短歷史查詢期間。');
      } else {
        handleApiError(error);
      }
    } finally {
      setLoading(false);
    }
  }, [turnstileToken]);

  // 表單送出
  const handleSubmit = (e) => {
    e.preventDefault();
    const convertedYears = years
      .replace(/[０-９]/g, (char) => String.fromCharCode(char.charCodeAt(0) - 0xFEE0))
      .replace(/[．。]/g, '.');
    const numYears = parseFloat(convertedYears);

    if (isNaN(numYears) || numYears <= 0) {
      setYearsError('請輸入有效的查詢期間（年），且必須大於零。');
      return;
    }
    setYearsError('');

    // 記錄分析事件
    Analytics.stockAnalysis.search({
      stockCode,
      years: numYears,
      backTestDate
    });

    // 呼叫 fetchStockData
    fetchStockData(stockCode, numYears, backTestDate);
  };

  // 初始化資料 (componentDidMount)
  useEffect(() => {
    fetchStockData(stockCode, parseFloat(years) || 3.5, backTestDate, true);
    // eslint-disable-next-line
  }, []);

  return (
    <PageContainer>
      <Helmet>
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "SoftwareApplication",
            "name": "樂活五線譜",
            "description": "利用標準差分析股價趨勢，判斷市場情緒。分析當前股價是否過度樂觀或悲觀。利用股價均值回歸的統計特性，追蹤長期趨勢、判斷股價所處位置。",
            "applicationCategory": "BusinessApplication",
            "operatingSystem": "Web",
            "url": "https://sentimentinsideout.com/priceanalysis",
            "potentialAction": {
              "@type": "SearchAction",
              "target": "https://sentimentinsideout.com/priceanalysis?stockCode={stockCode}&years={years}&backTestDate={backTestDate}",
              "query-input": "required name=stockCode,years,backTestDate"
            }
          })}
        </script>
      </Helmet>
      <h1>樂活五線譜</h1>
      <div className="dashboard">
        
        {/* 將 stock-analysis-card 移到 chart-card 上方 */}
        <div className="stock-analysis-card">
          <form onSubmit={handleSubmit}>
            <div className="input-group">
              <label>股票代碼：</label>
              <input
                className="form-control"
                type="text"
                value={stockCode}
                onChange={handleStockCodeChange}
                placeholder="例如:2330、AAPL"
                required
              />
            </div>
            <div className="input-group">
              <label>查詢年數：</label>
              <input
                className="form-control"
                type="text"
                value={years}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value === '' || /^[0-9０-９.．。]*$/.test(value)) {
                    setYears(value);
                  }
                }}
                placeholder="輸入年數，如 3.5"
                required
              />
              {yearsError && <div className="error-message">{yearsError}</div>}
            </div>
            <div className="input-group">
              <label>回測日期：</label>
              <DatePicker
                selected={backTestDate ? new Date(backTestDate) : null}
                onChange={(date) => setBackTestDate(date ? date.toISOString().split('T')[0] : '')}
                placeholderText="預設今天"
                className="form-control"
                dateFormat="yyyy/MM/dd"
                isClearable
                popperPlacement="auto"
              />
            </div>
            <button
              className={`btn-primary analysis-button ${loading ? 'btn-loading' : ''}`}
              type="submit"
              disabled={loading || !turnstileToken}
            >
              {loading ? '分析中' : turnstileToken ? '開始分析' : '請完成下方驗證'}
            </button>
            {timeoutMessage && <p>{timeoutMessage}</p>}
            {turnstileVisible && (
              <div className="turnstile-container">
                <Turnstile
                  sitekey={process.env.REACT_APP_TURNSTILE_SITE_KEY}
                  onSuccess={handleTurnstileSuccess}
                  onError={() => {
                    setTurnstileToken(null);
                    handleApiError(new Error('驗證失敗，請重試'));
                  }}
                  onExpire={() => {
                    setTurnstileToken(null);
                    handleApiError(new Error('驗證已過期，請重新驗證'));
                  }}
                  refreshExpired="auto"
                />
              </div>
            )}
          </form>
        </div>

        {/* 主圖表區塊 */}
        <div className="chart-card">
          <div className="chart-container">
            <div className="chart-header">
              <div className="analysis-result">
                <div className="analysis-item">
                  <span className="analysis-label">股票代碼</span>
                  <span className="analysis-value">
                    {displayedStockCode}
                  </span>
                </div>
                <div className="analysis-item">
                  <span className="analysis-label">股票價格</span>
                  <span className="analysis-value">
                    ${formatPrice(analysisResult.price)}
                  </span>
                </div>
                <div className="analysis-item">
                  <span className="analysis-label">市場情緒</span>
                  <span className={`analysis-value sentiment-${analysisResult.sentiment}`}>
                    {analysisResult.sentiment}
                  </span>
                </div>
              </div>
            </div>
            <div className="chart-content">
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '10px' }}>
                <div className="chart-tabs">
                  <button
                    className={`chart-tab ${activeChart === 'sd' ? 'active' : ''}`}
                    onClick={() => handleChartSwitch('sd')}
                  >
                    樂活五線譜
                  </button>
                  <button
                    className={`chart-tab ${activeChart === 'ulband' ? 'active' : ''}`}
                    onClick={() => handleChartSwitch('ulband')}
                  >
                    樂活通道
                  </button>
                </div>
              </div>
              {activeChart === 'sd' && chartData && (
                <Line
                  data={chartData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                      x: {
                        type: 'time',
                        time: {
                          unit: chartData.timeUnit || 'day',
                          displayFormats: {
                            day: 'MM/dd',
                            week: 'MM/dd',
                            month: 'yyyy/MM',
                            quarter: 'yyyy/[Q]Q',
                            year: 'yyyy'
                          },
                          tooltipFormat: 'yyyy/MM/dd'
                        },
                        ticks: {
                          maxTicksLimit: isMobile ? 4 : 6,
                          autoSkip: true,
                          maxRotation: isMobile ? 45 : 0,
                          minRotation: isMobile ? 45 : 0,
                          font: {
                            size: isMobile ? 10 : 12
                          }
                        }
                      },
                      y: {
                        position: 'right',
                        grid: {
                          drawBorder: true
                        }
                      }
                    },
                    plugins: {
                      legend: { 
                        display: false  // 隱藏圖例
                      },
                      tooltip: {
                        enabled: false,
                        mode: 'index',
                        intersect: false,
                        external: function(context) {
                          const tooltipModel = context.tooltip;
                          let tooltipEl = document.getElementById('chartjs-tooltip-sd');

                          if (!tooltipEl) {
                            tooltipEl = document.createElement('div');
                            tooltipEl.id = 'chartjs-tooltip-sd';
                            document.body.appendChild(tooltipEl);
                          }

                          if (tooltipModel.opacity === 0) {
                            tooltipEl.style.opacity = 0;
                            return;
                          }

                          if (tooltipModel.body) {
                            const titleLines = tooltipModel.title || [];

                            // 定義想要顯示的數據集標籤順序
                            const desiredLabels = ['Price', 'Trend Line', 'TL+2SD', 'TL+SD', 'TL-SD', 'TL-2SD'];

                            // 過濾並排序數據點
                            const sortedItems = tooltipModel.dataPoints
                              .filter(item => desiredLabels.includes(item.dataset.label))
                              .sort((a, b) => b.raw - a.raw);

                            let innerHtml = `<div class="custom-tooltip">`;
                            innerHtml += `<div class="tooltip-title">${titleLines[0]}</div>`;

                            sortedItems.forEach(item => {
                              const label = item.dataset.label;
                              const value = item.raw.toFixed(2);
                              const color = item.dataset.borderColor;
                              innerHtml += `
                                <div class="tooltip-item" style="display: flex; align-items: center;">
                                  <div style="width: 10px; height: 10px; background-color: ${color}; margin-right: 5px;"></div>
                                  <span>${label}: ${value}</span>
                                </div>
                              `;
                            });

                            innerHtml += `</div>`;
                            tooltipEl.innerHTML = innerHtml;
                          }

                          const position = context.chart.canvas.getBoundingClientRect();
                          const bodyWidth = document.body.clientWidth;
                          const tooltipWidth = Math.min(200, bodyWidth * 0.8);
                          let left = position.left + window.pageXOffset + tooltipModel.caretX;

                          if (left + tooltipWidth > bodyWidth) {
                            left = bodyWidth - tooltipWidth;
                          }
                          if (left < 0) {
                            left = 0;
                          }

                          tooltipEl.style.opacity = 1;
                          tooltipEl.style.position = 'absolute';
                          tooltipEl.style.left = left + 'px';
                          tooltipEl.style.top = position.top + window.pageYOffset + tooltipModel.caretY + 'px';
                          tooltipEl.style.font = tooltipModel.options.bodyFont.string;
                          tooltipEl.style.padding = tooltipModel.options.padding + 'px ' + tooltipModel.options.padding + 'px';
                          tooltipEl.style.pointerEvents = 'none';
                          tooltipEl.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
                          tooltipEl.style.color = 'white';
                          tooltipEl.style.borderRadius = '3px';
                          tooltipEl.style.zIndex = 1000;
                          tooltipEl.style.maxWidth = tooltipWidth + 'px';
                          tooltipEl.style.width = 'auto';
                        }
                      },
                      crosshair: {
                        line: {
                          color: '#F66',
                          width: 1,
                          dashPattern: [5, 5]
                        },
                        sync: {
                          enabled: false
                        },
                        zoom: {
                          enabled: false
                        }
                      }
                    },
                    interaction: {
                      mode: 'index',
                      intersect: false
                    },
                    hover: {
                      mode: 'index',
                      intersect: false
                    },
                    layout: {
                      padding: {
                        left: 10,
                        right: 30,
                        top: 20,
                        bottom: 25
                      }
                    }
                  }}
                />
              )}
              {activeChart === 'ulband' && ulbandData && (
                <ULBandChart data={ulbandData} />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 將 ExpandableDescription 移到 dashboard 下方 */}
      <ExpandableDescription
        shortDescription={
          <>
            分析當前股價是否過度樂觀或悲觀。利用股價均值回歸的統計特性，追蹤長期趨勢、判斷股價所處位置。<br />
            詳細使用方式請參考文章：
            <a href="https://sentimentinsideout.com/articles/1.%E7%94%A8%E6%A8%82%E6%B4%BB%E4%BA%94%E7%B7%9A%E8%AD%9C%E5%88%86%E6%9E%90%E5%83%B9%E6%A0%BC%E8%B6%A8%E5%8B%A2%E8%88%87%E6%83%85%E7%B7%92" target="_blank" rel="noopener noreferrer">
              用樂活五線譜分析價格趨勢與情緒
            </a>
          </>
        }
        sections={[
          {
            title: "樂活五線譜",
            type: "list",
            content: [
              "中間的趨勢線為長期移動平均線，是評估股價長期趨勢的基準，以此為基準，上下分別添加兩個標準差。",
              "愈遠離中間的趨勢線，代表股價愈遠離長期平均值，回歸趨勢線的機率將逐漸增加。",
              "當股價觸及最上緣，表示股價短期內強烈超買，市場極度樂觀，有回調的風險。",
              "當股價觸及最下緣，表示股價短期內強烈超賣，市場極度悲觀，有反彈的機會。",
            ],
          },
          {
            title: "樂活通道",
            type: "list",
            content: [
              "樂活通道是更敏感的指標，用來輔助判斷短期內的超買超賣。",
              "當股價突破樂活通道上緣時，表示短期可能過熱。",
              "當股價跌破樂活通道下緣時，表示短期可能過冷。",
            ],
          },
          {
            title: "兩者搭配使用",
            type: "list",
            content: [  
              "當股價觸及五線譜的最上緣或是最下緣時，若同時也突破了樂活通道，可能代表趨勢的延續，可以等回到通道內再進行操作。",
              "建議使用在指數型ETF或具有趨勢性的大型股票，搭配基本面分析，不應單獨作為買賣依據。"
            ]
          },
        ]}
        expandButtonText="了解更多"
        collapseButtonText="收合"
      />
    </PageContainer>
  );
} 