/**
 * Chart.js 插件：手機版長按顯示 tooltip
 * 
 * 功能：
 * - 單指長按（500ms）顯示 tooltip
 * - 長按後可滑動查看不同位置的數據
 * - 單指快速滑動平移圖表
 */

// 全局狀態（因為插件可能被多個圖表實例共享）
const pluginState = new WeakMap();

export const createLongPressPlugin = (isMobile) => {
  if (!isMobile) {
    return null; // 桌面版不需要此插件
  }

  return {
    id: 'longPressTooltip',
    
    afterInit(chart) {
      // 為每個圖表實例初始化狀態
      const state = {
        longPressTimer: null,
        isLongPress: false,
        touchStartX: 0,
        touchStartY: 0,
        hasMoved: false,
      };
      pluginState.set(chart, state);
      // 也將狀態暴露到圖表實例上，方便 zoom 插件訪問
      chart.$longPressState = state;
    },
    
    beforeEvent(chart, args) {
      const event = args.event;
      const state = pluginState.get(chart);
      
      if (!state) return;
      
      if (event.type === 'touchstart') {
        const touch = event.native?.touches?.[0];
        if (touch && event.native.touches.length === 1) {
          console.log('[LongPress] touchstart detected');
          
          // 隱藏任何現有的 tooltip
          chart.setActiveElements([]);
          chart.tooltip.setActiveElements([]);
          
          state.isLongPress = false;
          state.hasMoved = false;
          state.touchStartX = touch.clientX;
          state.touchStartY = touch.clientY;
          
          // 清除舊的計時器
          if (state.longPressTimer) {
            clearTimeout(state.longPressTimer);
          }
          
          // 設置長按計時器（500ms）
          state.longPressTimer = setTimeout(() => {
            console.log('[LongPress] Long press triggered!');
            state.isLongPress = true;
            
            // 獲取當前觸控點位置（可能已經移動了）
            const currentTouch = event.native?.touches?.[0];
            if (!currentTouch) return;
            
            const rect = chart.canvas.getBoundingClientRect();
            const x = currentTouch.clientX - rect.left;
            const y = currentTouch.clientY - rect.top;
            
            // 創建一個模擬事件來獲取元素
            const mockEvent = {
              x,
              y,
              native: event.native,
              type: 'mousemove'
            };
            
            // 找到最接近的數據點
            const elements = chart.getElementsAtEventForMode(
              mockEvent,
              'index',
              { intersect: false },
              false
            );
            
            if (elements.length > 0) {
              console.log('[LongPress] Showing tooltip for', elements.length, 'elements');
              chart.setActiveElements(elements);
              chart.tooltip.setActiveElements(elements, { x, y });
              chart.update('none');
            } else {
              console.log('[LongPress] No elements found at position');
            }
          }, 500);
        }
        
        // 阻止 touchstart 觸發 tooltip
        args.changed = false;
        return false;
      } else if (event.type === 'touchmove') {
        const touch = event.native?.touches?.[0];
        if (touch && event.native.touches.length === 1) {
          // 檢查是否移動了足夠的距離（超過 10px 視為移動）
          const moveX = Math.abs(touch.clientX - state.touchStartX);
          const moveY = Math.abs(touch.clientY - state.touchStartY);
          
          if (moveX > 10 || moveY > 10) {
            state.hasMoved = true;
          }
          
          // 如果是長按狀態，更新 tooltip 位置並阻止平移
          if (state.isLongPress) {
            const rect = chart.canvas.getBoundingClientRect();
            const x = touch.clientX - rect.left;
            const y = touch.clientY - rect.top;
            
            // 創建一個模擬事件
            const mockEvent = {
              x,
              y,
              native: event.native,
              type: 'mousemove'
            };
            
            const elements = chart.getElementsAtEventForMode(
              mockEvent,
              'index',
              { intersect: false },
              false
            );
            
            if (elements.length > 0) {
              chart.setActiveElements(elements);
              chart.tooltip.setActiveElements(elements, { x, y });
              chart.update('none');
            }
            
            // 阻止事件傳播，防止觸發平移
            args.changed = false;
            return false;
          } else if (state.hasMoved) {
            // 如果移動了，取消長按計時器
            if (state.longPressTimer) {
              clearTimeout(state.longPressTimer);
              state.longPressTimer = null;
            }
          }
        }
        
        // 阻止 touchmove 觸發 tooltip（除非是長按狀態）
        if (!state.isLongPress) {
          args.changed = false;
          return false;
        }
      } else if (event.type === 'touchend' || event.type === 'touchcancel') {
        // 清除長按計時器
        if (state.longPressTimer) {
          clearTimeout(state.longPressTimer);
          state.longPressTimer = null;
        }
        
        // 如果是長按狀態，隱藏 tooltip
        if (state.isLongPress) {
          chart.setActiveElements([]);
          chart.tooltip.setActiveElements([]);
          chart.update('none');
        }
        
        // 重置狀態
        state.isLongPress = false;
        state.hasMoved = false;
      }
    },
    
    destroy(chart) {
      // 清理狀態
      const state = pluginState.get(chart);
      if (state && state.longPressTimer) {
        clearTimeout(state.longPressTimer);
      }
      pluginState.delete(chart);
    },
  };
};
