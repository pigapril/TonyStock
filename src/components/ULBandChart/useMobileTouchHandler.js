import { useEffect, useRef } from 'react';

/**
 * 自定義 Hook：處理手機版圖表的長壓顯示 tooltip 和平移功能
 * 
 * 新方案：直接在 Canvas 上監聽事件，不使用透明層
 * 
 * @param {Object} chartRef - Chart.js 圖表的 ref
 * @param {boolean} isMobile - 是否為手機版
 * @param {boolean} enabled - 是否啟用此功能
 */
export const useMobileTouchHandler = (chartRef, isMobile, enabled = true) => {
  const touchStateRef = useRef({
    longPressTimer: null,
    touchStartPos: null,
    lastTouchPos: null,
    isLongPress: false,
    isPanning: false,
    fingerCount: 0
  });
  
  // 追蹤當前綁定的 Canvas 實例
  const currentCanvasRef = useRef(null);

  useEffect(() => {
    // 如果不啟用或不是手機版，直接返回
    if (!enabled || !isMobile) {
      return;
    }

    // 延遲初始化，確保圖表已渲染
    // 使用重試機制，最多嘗試 3 次
    let retryCount = 0;
    const maxRetries = 3;
    
    const tryInitialize = () => {
      if (!chartRef.current) {
        retryCount++;
        if (retryCount < maxRetries) {
          // 重試，每次延遲增加
          return setTimeout(tryInitialize, 300 * retryCount);
        }
        return null;
      }

      const chart = chartRef.current;
      const canvas = chart.canvas;
      
      if (!canvas) {
        console.error('Mobile touch handler: Canvas not found');
        return null;
      }
      
      // 檢查是否是同一個 Canvas 實例
      if (currentCanvasRef.current === canvas) {
        // 已經綁定過了，不需要重複綁定
        return null;
      }
      
      // 如果之前綁定過其他 Canvas，先清理
      if (currentCanvasRef.current) {
        console.log('Canvas changed, cleaning up old listeners');
        // 清理邏輯會在 useEffect 的 cleanup 中處理
      }
      
      // 記錄當前 Canvas
      currentCanvasRef.current = canvas;

      const touchState = touchStateRef.current;

      // 輔助函數：找到觸控點附近的數據點
      const findNearestDataIndex = (chart, point) => {
        let nearestIndex = -1;
        let minDistance = Infinity;

        const priceDatasetIndex = chart.data.datasets.findIndex(
          ds => ds.label && (ds.label.includes('價格') || ds.label.includes('Price') || ds.label.includes('price'))
        );
        
        if (priceDatasetIndex === -1) return -1;

        const meta = chart.getDatasetMeta(priceDatasetIndex);
        if (!meta || !meta.data) return -1;

        meta.data.forEach((element, index) => {
          const distance = Math.abs(element.x - point.x);
          if (distance < minDistance) {
            minDistance = distance;
            nearestIndex = index;
          }
        });

        return minDistance < 50 ? nearestIndex : -1;
      };

      // 輔助函數：顯示指定索引的 tooltip
      const showTooltipAtIndex = (chart, dataIndex) => {
        if (dataIndex === -1) return;

        const activeElements = chart.data.datasets.map((dataset, datasetIndex) => ({
          datasetIndex,
          index: dataIndex
        }));

        chart.setActiveElements(activeElements);

        const priceDatasetIndex = chart.data.datasets.findIndex(
          ds => ds.label && (ds.label.includes('價格') || ds.label.includes('Price') || ds.label.includes('price'))
        );

        if (priceDatasetIndex !== -1) {
          const priceDatasetMeta = chart.getDatasetMeta(priceDatasetIndex);
          if (priceDatasetMeta && priceDatasetMeta.data[dataIndex]) {
            const priceElement = priceDatasetMeta.data[dataIndex];
            chart.tooltip.setActiveElements(activeElements, {
              x: priceElement.x,
              y: priceElement.y
            });
          }
        }

        chart.update('none');
      };

      // 輔助函數：隱藏 tooltip
      const hideTooltip = (chart) => {
        chart.setActiveElements([]);
        chart.tooltip.setActiveElements([]);
        chart.update('none');
      };

      // 輔助函數：手動執行平移
      const panChart = (deltaX) => {
        try {
          if (chart.pan) {
            chart.pan({ x: deltaX, y: 0 }, undefined, 'default');
          }
        } catch (error) {
          console.warn('Failed to pan chart:', error);
        }
      };

      // 處理 touchstart 事件
      const handleTouchStart = (e) => {
        const touches = e.touches;
        touchState.fingerCount = touches.length;

        if (touches.length === 1) {
          // 單指觸控 - 攔截事件，不讓 Hammer 處理
          e.preventDefault();
          e.stopPropagation();
          
          touchState.touchStartPos = {
            x: touches[0].clientX,
            y: touches[0].clientY
          };
          touchState.lastTouchPos = {
            x: touches[0].clientX,
            y: touches[0].clientY
          };
          touchState.isLongPress = false;
          touchState.isPanning = false;

          // 設置長壓計時器
          touchState.longPressTimer = setTimeout(() => {
            touchState.isLongPress = true;

            const rect = canvas.getBoundingClientRect();
            const point = {
              x: touches[0].clientX - rect.left,
              y: touches[0].clientY - rect.top
            };

            const dataIndex = findNearestDataIndex(chart, point);
            if (dataIndex !== -1) {
              showTooltipAtIndex(chart, dataIndex);

              if (navigator.vibrate) {
                navigator.vibrate(50);
              }
            }
          }, 500);

        } else if (touches.length >= 2) {
          // 雙指或多指 - 不攔截，讓 Hammer.js 處理
          // 不調用 preventDefault()
          
          // 清除長壓計時器
          if (touchState.longPressTimer) {
            clearTimeout(touchState.longPressTimer);
            touchState.longPressTimer = null;
          }

          // 隱藏 tooltip
          if (touchState.isLongPress) {
            hideTooltip(chart);
            touchState.isLongPress = false;
          }
          
          // 禁用 Chart.js 的 tooltip（縮放時不顯示）
          if (chart.options.plugins.tooltip) {
            chart.options.plugins.tooltip.enabled = false;
          }
        }
      };

      // 處理 touchmove 事件
      const handleTouchMove = (e) => {
        const touches = e.touches;

        if (touches.length === 1 && touchState.fingerCount === 1) {
          // 只有在一直是單指的情況下才處理
          e.preventDefault();
          e.stopPropagation();
          
          if (touchState.touchStartPos) {
            const moveDistance = Math.sqrt(
              Math.pow(touches[0].clientX - touchState.touchStartPos.x, 2) +
              Math.pow(touches[0].clientY - touchState.touchStartPos.y, 2)
            );

            if (moveDistance > 10) {
              if (touchState.longPressTimer) {
                clearTimeout(touchState.longPressTimer);
                touchState.longPressTimer = null;
              }

              if (!touchState.isLongPress) {
                if (!touchState.isPanning) {
                  touchState.isPanning = true;
                }
                
                const deltaX = touches[0].clientX - touchState.lastTouchPos.x;
                panChart(deltaX);
                
                touchState.lastTouchPos = {
                  x: touches[0].clientX,
                  y: touches[0].clientY
                };
              } else {
                const rect = canvas.getBoundingClientRect();
                const point = {
                  x: touches[0].clientX - rect.left,
                  y: touches[0].clientY - rect.top
                };

                const dataIndex = findNearestDataIndex(chart, point);
                if (dataIndex !== -1) {
                  showTooltipAtIndex(chart, dataIndex);
                }
              }
            }
          }
        } else if (touches.length >= 2) {
          // 雙指移動 - 不攔截
          // 不調用 preventDefault()
        }
      };

      // 處理 touchend 事件
      const handleTouchEnd = (e) => {
        touchState.fingerCount = e.touches.length;
        
        if (touchState.longPressTimer) {
          clearTimeout(touchState.longPressTimer);
          touchState.longPressTimer = null;
        }

        if (e.touches.length === 0) {
          // 所有手指都離開
          if (touchState.isLongPress) {
            hideTooltip(chart);
          }
          
          // 重新啟用 tooltip
          if (chart.options.plugins.tooltip && chart.options.plugins.tooltip.enabled === false) {
            chart.options.plugins.tooltip.enabled = true;
          }

          // 重置狀態
          touchState.touchStartPos = null;
          touchState.lastTouchPos = null;
          touchState.isLongPress = false;
          touchState.isPanning = false;
        }
      };

      // 處理 touchcancel 事件
      const handleTouchCancel = () => {
        if (touchState.longPressTimer) {
          clearTimeout(touchState.longPressTimer);
          touchState.longPressTimer = null;
        }

        if (touchState.isLongPress) {
          hideTooltip(chart);
        }
        
        // 重新啟用 tooltip
        if (chart.options.plugins.tooltip && chart.options.plugins.tooltip.enabled === false) {
          chart.options.plugins.tooltip.enabled = true;
        }

        touchState.touchStartPos = null;
        touchState.lastTouchPos = null;
        touchState.isLongPress = false;
        touchState.isPanning = false;
        touchState.fingerCount = 0;
      };

      // 直接在 Canvas 上添加事件監聽器
      // 使用 capture 階段，在 Hammer.js 之前攔截單指事件
      canvas.addEventListener('touchstart', handleTouchStart, { passive: false, capture: true });
      canvas.addEventListener('touchmove', handleTouchMove, { passive: false, capture: true });
      canvas.addEventListener('touchend', handleTouchEnd, { passive: false, capture: true });
      canvas.addEventListener('touchcancel', handleTouchCancel, { passive: false, capture: true });

      // 清理函數
      return () => {
        if (touchState.longPressTimer) {
          clearTimeout(touchState.longPressTimer);
        }

        canvas.removeEventListener('touchstart', handleTouchStart, { capture: true });
        canvas.removeEventListener('touchmove', handleTouchMove, { capture: true });
        canvas.removeEventListener('touchend', handleTouchEnd, { capture: true });
        canvas.removeEventListener('touchcancel', handleTouchCancel, { capture: true });
        
        // 清除 Canvas 引用
        currentCanvasRef.current = null;
      };
    };
    
    // 開始初始化（可能會重試）
    const timerId = tryInitialize();
    
    // 定期檢查 Canvas 是否變化（每 500ms 檢查一次）
    const checkInterval = setInterval(() => {
      if (chartRef.current && chartRef.current.canvas) {
        const newCanvas = chartRef.current.canvas;
        if (currentCanvasRef.current !== newCanvas) {
          console.log('Canvas instance changed, re-initializing touch handler');
          // Canvas 變化了，重新初始化
          tryInitialize();
        }
      }
    }, 500);

    // 清理函數
    return () => {
      if (timerId) {
        clearTimeout(timerId);
      }
      
      clearInterval(checkInterval);
      
      // 清理事件監聽器
      if (currentCanvasRef.current) {
        const canvas = currentCanvasRef.current;
        canvas.removeEventListener('touchstart', () => {}, { capture: true });
        canvas.removeEventListener('touchmove', () => {}, { capture: true });
        canvas.removeEventListener('touchend', () => {}, { capture: true });
        canvas.removeEventListener('touchcancel', () => {}, { capture: true });
        currentCanvasRef.current = null;
      }
    };
  }, [isMobile, enabled]);

  return null; // 不再需要返回 touchLayerRef
};
