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

// 假設你在 .env 檔或 config 有定義 REACT_APP_API_BASE_URL
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

  // 資料抓取函式（原本在 App.js）
  const fetchStockData = useCallback(async (stock, yrs, testDate) => {
    setLoading(true);
    setTimeoutMessage('');

    try {
      const response = await axios.get(`${API_BASE_URL}/api/integrated-analysis`, {
        params: {
          stockCode: stock,
          years: yrs,
          backTestDate: testDate
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
    } catch (error) {
      if (error.code === 'ECONNABORTED') {
        setTimeoutMessage('分析超時，請稍後重試或縮短歷史查詢期間。');
      } else {
        handleApiError(error);
      }
    } finally {
      setLoading(false);
    }
  }, []);

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
    fetchStockData(stockCode, parseFloat(years) || 3.5, backTestDate);
    // eslint-disable-next-line
  }, []);

  return (
    <PageContainer
      title="樂活五線譜"
      description="分析股價長期趨勢，利用均值回歸搭配標準差，當價格漲至最上緣時可能代表過度樂觀；當價格跌至最下緣時可能代表過度悲觀。當價格達到標準差的極端上下緣時，可以再搭配樂活通道，觀察價格是否突破通道的上下緣，可能代表超漲或超跌，趨勢或許將持續，可以等再次回到通道時再做買賣。"
    >
      <div className="dashboard">
        {/* 主圖表區塊 */}
        <div className="chart-card">
          <div className="chart-container">
            <div className="chart-header">
              <div className="chart-title">
                {displayedStockCode && `${displayedStockCode} 分析結果`}
              </div>
              <div className="chart-tabs">
                <button
                  className={`chart-tab ${activeChart === 'sd' ? 'active' : ''}`}
                  onClick={() => handleChartSwitch('sd')}
                >
                  標準差分析
                </button>
                <button
                  className={`chart-tab ${activeChart === 'ulband' ? 'active' : ''}`}
                  onClick={() => handleChartSwitch('ulband')}
                >
                  超漲超跌通道
                </button>
              </div>
            </div>
            <div className="chart-content">
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

        {/* 搜尋/輸入區塊 */}
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
                style={{ width: '150px' }}
              />
            </div>
            <div className="input-group">
              <label>查詢期間（年）：</label>
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
                style={{ width: '150px' }}
              />
              {yearsError && <div className="error-message">{yearsError}</div>}
            </div>
            <div className="input-group">
              <label>回測日期：</label>
              <DatePicker
                selected={backTestDate ? new Date(backTestDate) : null}
                onChange={(date) => setBackTestDate(date ? date.toISOString().split('T')[0] : '')}
                placeholderText="預設為今日"
                className="form-control"
                dateFormat="yyyy/MM/dd"
                isClearable
                style={{ width: '150px' }}
              />
            </div>
            <button
              className={`btn-primary ${loading ? 'btn-loading' : ''}`}
              type="submit"
              disabled={loading}
            >
              {loading ? '分析中' : '開始分析'}
            </button>
            {timeoutMessage && <p>{timeoutMessage}</p>}
          </form>
        </div>
      </div>
    </PageContainer>
  );
} 