import { useEffect, useRef } from 'react';

/**
 * 自定義 Hook：處理手機版圖表的長壓顯示 tooltip 和平移功能
 * 
 * @param {Object} chartRef - Chart.js 圖表的 ref
 * @param {boolean} isMobile - 是否為手機版
 * @param {boolean} enabled - 是否啟用此功能
 */
export const useMobileTouchHandler = (chartRef, isMobile, enabled = true) => {
  const touchLayerRef = useRef(null);
  const touchStateRef = useRef({
    longPressTimer: null,
    touchStartPos: null,
    lastTouchPos: null,
    isLongPress: false,
    isPanning: false,
    initialPinchDistance: null
  });

  useEffect(() => {
    // 如果不啟用或不是手機版，直接返回
    if (!enabled || !isMobile) {
      console.log('Touch handler disabled:', { enabled, isMobile });
      return;
    }

    // 延遲初始化，確保圖表已渲染
    const initTimer = setTimeout(() => {
      if (!chartRef.current) {
        console.log('Chart not ready yet');
        return;
      }

      const chart = chartRef.current;
      const canvas = chart.canvas;
      
      if (!canvas) {
        console.log('Canvas not found');
        return;
      }

      const touchState = touchStateRef.current;
      console.log('✅ Initializing touch handler for mobile');

      // 輔助函數：計算兩點之間的距離
      const getDistance = (touch1, touch2) => {
        return Math.sqrt(
          Math.pow(touch2.clientX - touch1.clientX, 2) +
          Math.pow(touch2.clientY - touch1.clientY, 2)
        );
      };

      // 輔助函數：找到觸控點附近的數據點
      const findNearestDataIndex = (chart, point) => {
        let nearestIndex = -1;
        let minDistance = Infinity;

        // 只檢查價格線（通常是第一個或特定的 dataset）
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

        // 只有在距離合理範圍內才返回索引
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

        // 獲取價格線的數據點位置
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

      // 輔助函數：手動執行平移（不轉發事件，直接調用 Chart.js API）
      const panChart = (deltaX, deltaY) => {
        try {
          // 使用 Chart.js 的 pan 功能
          if (chart.pan) {
            chart.pan({ x: deltaX, y: 0 }, undefined, 'default');
          }
        } catch (error) {
          console.warn('Failed to pan chart:', error);
        }
      };
      
      // 輔助函數：創建並轉發觸控事件給 canvas（用於雙指縮放）
      const forwardTouchEvent = (canvas, originalEvent) => {
        try {
          const newEvent = new TouchEvent(originalEvent.type, {
            bubbles: true,
            cancelable: true,
            touches: originalEvent.touches,
            targetTouches: originalEvent.targetTouches,
            changedTouches: originalEvent.changedTouches
          });
          canvas.dispatchEvent(newEvent);
        } catch (error) {
          console.warn('Failed to forward touch event:', error);
        }
      };

      // 處理 touchstart 事件
      const handleTouchStart = (e) => {
        console.log('👆 Touch start:', e.touches.length, 'finger(s)');
        const touches = e.touches;

        if (touches.length === 1) {
          // 單指觸控 - 攔截事件
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
            console.log('⏱️ Long press detected');

            // 計算觸控點相對於 canvas 的位置
            const rect = canvas.getBoundingClientRect();
            const point = {
              x: touches[0].clientX - rect.left,
              y: touches[0].clientY - rect.top
            };

            // 找到最近的數據點並顯示 tooltip
            const dataIndex = findNearestDataIndex(chart, point);
            if (dataIndex !== -1) {
              showTooltipAtIndex(chart, dataIndex);

              // 震動反饋（如果支援）
              if (navigator.vibrate) {
                navigator.vibrate(50);
              }
            }
          }, 500); // 500ms 長壓閾值

        } else if (touches.length === 2) {
          console.log('✌️ Two fingers detected - pinch zoom');
          // 雙指觸控 - 不攔截，讓事件穿透到 canvas
          // 不調用 preventDefault()，讓事件自然傳遞
          
          // 清除長壓計時器
          if (touchState.longPressTimer) {
            clearTimeout(touchState.longPressTimer);
            touchState.longPressTimer = null;
          }

          // 隱藏 tooltip（如果正在顯示）
          if (touchState.isLongPress) {
            hideTooltip(chart);
            touchState.isLongPress = false;
          }

          // 記錄初始雙指距離
          touchState.initialPinchDistance = getDistance(touches[0], touches[1]);
          
          // 暫時隱藏透明層，讓事件直接到達 canvas
          touchLayer.style.pointerEvents = 'none';
          console.log('🔓 Touch layer disabled for pinch');
        }
      };

      // 處理 touchmove 事件
      const handleTouchMove = (e) => {
        const touches = e.touches;

        if (touches.length === 1 && touchLayer.style.pointerEvents !== 'none') {
          // 單指移動 - 只在透明層啟用時處理
          e.preventDefault();
          e.stopPropagation();
          
          if (touchState.touchStartPos) {
            const moveDistance = Math.sqrt(
              Math.pow(touches[0].clientX - touchState.touchStartPos.x, 2) +
              Math.pow(touches[0].clientY - touchState.touchStartPos.y, 2)
            );

            if (moveDistance > 10) {
              // 移動超過閾值
              if (touchState.longPressTimer) {
                clearTimeout(touchState.longPressTimer);
                touchState.longPressTimer = null;
              }

              if (!touchState.isLongPress) {
                // 不是長壓，開始平移
                if (!touchState.isPanning) {
                  touchState.isPanning = true;
                  console.log('↔️ Pan started');
                }
                
                // 計算移動增量
                const deltaX = touches[0].clientX - touchState.lastTouchPos.x;
                
                // 使用我們自己的平移函數
                panChart(deltaX, 0);
                
                // 更新最後位置
                touchState.lastTouchPos = {
                  x: touches[0].clientX,
                  y: touches[0].clientY
                };
              } else {
                // 是長壓後的移動，更新 tooltip 位置
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
        }
        // 雙指移動時，透明層已經禁用，事件會自然傳遞到 canvas
      };

      // 處理 touchend 事件
      const handleTouchEnd = (e) => {
        console.log('🖐️ Touch end, remaining fingers:', e.touches.length);
        
        if (touchState.longPressTimer) {
          clearTimeout(touchState.longPressTimer);
          touchState.longPressTimer = null;
        }

        if (touchState.isLongPress) {
          // 長壓結束，隱藏 tooltip
          console.log('Long press ended');
          hideTooltip(chart);
        } else if (touchState.isPanning) {
          // 平移結束
          console.log('Pan ended');
        }

        // 如果所有手指都離開，重新啟用透明層
        if (e.touches.length === 0) {
          touchLayer.style.pointerEvents = 'auto';
          console.log('🔒 Touch layer re-enabled');
          
          // 如果之前是雙指操作，現在結束了
          if (touchState.initialPinchDistance !== null) {
            console.log('Pinch zoom ended');
          }
        }

        // 重置狀態
        touchState.touchStartPos = null;
        touchState.lastTouchPos = null;
        touchState.isLongPress = false;
        touchState.isPanning = false;
        
        // 只有在所有手指都離開時才重置 pinch 狀態
        if (e.touches.length === 0) {
          touchState.initialPinchDistance = null;
        }
      };

      // 處理 touchcancel 事件
      const handleTouchCancel = () => {
        console.log('❌ Touch cancelled');
        
        if (touchState.longPressTimer) {
          clearTimeout(touchState.longPressTimer);
          touchState.longPressTimer = null;
        }

        if (touchState.isLongPress) {
          hideTooltip(chart);
        }

        // 重新啟用透明層
        touchLayer.style.pointerEvents = 'auto';
        console.log('🔒 Touch layer re-enabled (cancel)');

        // 重置狀態
        touchState.touchStartPos = null;
        touchState.lastTouchPos = null;
        touchState.isLongPress = false;
        touchState.isPanning = false;
        touchState.initialPinchDistance = null;
      };

      // 創建透明觸控層
      const touchLayer = document.createElement('div');
      touchLayer.style.position = 'absolute';
      touchLayer.style.top = '0';
      touchLayer.style.left = '0';
      touchLayer.style.right = '0';
      touchLayer.style.bottom = '0';
      touchLayer.style.zIndex = '10';
      touchLayer.style.touchAction = 'none'; // 防止瀏覽器預設行為
      touchLayer.style.backgroundColor = 'rgba(255, 0, 0, 0.1)'; // 臨時：半透明紅色用於除錯

      // 將觸控層插入到 canvas 的父容器中
      const canvasParent = canvas.parentElement;
      if (canvasParent) {
        // 確保父容器有 position: relative
        const parentPosition = getComputedStyle(canvasParent).position;
        if (parentPosition === 'static') {
          canvasParent.style.position = 'relative';
        }
        
        canvasParent.appendChild(touchLayer);
        touchLayerRef.current = touchLayer;
        console.log('✅ Touch layer created and attached');

        // 添加事件監聽器
        touchLayer.addEventListener('touchstart', handleTouchStart, { passive: false });
        touchLayer.addEventListener('touchmove', handleTouchMove, { passive: false });
        touchLayer.addEventListener('touchend', handleTouchEnd, { passive: false });
        touchLayer.addEventListener('touchcancel', handleTouchCancel, { passive: false });
        console.log('✅ Event listeners attached');
      } else {
        console.error('❌ Canvas parent not found');
      }
    }, 300); // 延遲 300ms 確保圖表已渲染

    // 清理函數
    return () => {
      clearTimeout(initTimer);
      
      const touchState = touchStateRef.current;
      if (touchState.longPressTimer) {
        clearTimeout(touchState.longPressTimer);
      }

      if (touchLayerRef.current) {
        console.log('🧹 Cleaning up touch handler');
        touchLayerRef.current.removeEventListener('touchstart', () => {});
        touchLayerRef.current.removeEventListener('touchmove', () => {});
        touchLayerRef.current.removeEventListener('touchend', () => {});
        touchLayerRef.current.removeEventListener('touchcancel', () => {});

        if (touchLayerRef.current.parentElement) {
          touchLayerRef.current.parentElement.removeChild(touchLayerRef.current);
        }
        touchLayerRef.current = null;
      }
    };
  }, [isMobile, enabled]); // 只依賴 isMobile 和 enabled

  return touchLayerRef;
};
