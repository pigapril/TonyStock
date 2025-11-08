/**
 * Chart.js 插件：手機版長按顯示 tooltip
 * 
 * 功能：
 * - 單指長按（500ms）顯示 tooltip
 * - 長按後可滑動查看不同位置的數據
 * - 單指快速滑動平移圖表
 */

export const createLongPressPlugin = (isMobile) => {
  if (!isMobile) {
    return null; // 桌面版不需要此插件
  }

  let longPressTimer = null;
  let isLongPress = false;
  let touchStartX = 0;
  let touchStartY = 0;
  let hasMoved = false;

  return {
    id: 'longPressTooltip',
    
    beforeEvent(chart, args) {
      const event = args.event;
      
      if (event.type === 'touchstart') {
        const touch = event.native?.touches?.[0];
        if (touch && event.native.touches.length === 1) {
          isLongPress = false;
          hasMoved = false;
          touchStartX = touch.clientX;
          touchStartY = touch.clientY;
          
          // 設置長按計時器（500ms）
          longPressTimer = setTimeout(() => {
            isLongPress = true;
            
            // 啟用 tooltip
            chart.options.plugins.tooltip.enabled = true;
            
            // 獲取觸控點位置並顯示 tooltip
            const rect = chart.canvas.getBoundingClientRect();
            const x = touch.clientX - rect.left;
            const y = touch.clientY - rect.top;
            
            // 找到最接近的數據點
            const elements = chart.getElementsAtEventForMode(
              event,
              'index',
              { intersect: false },
              false
            );
            
            if (elements.length > 0) {
              chart.setActiveElements(elements);
              chart.tooltip.setActiveElements(elements, { x, y });
              chart.update('none');
            }
          }, 500);
        }
      } else if (event.type === 'touchmove') {
        const touch = event.native?.touches?.[0];
        if (touch && event.native.touches.length === 1) {
          // 檢查是否移動了足夠的距離（超過 10px 視為移動）
          const moveX = Math.abs(touch.clientX - touchStartX);
          const moveY = Math.abs(touch.clientY - touchStartY);
          
          if (moveX > 10 || moveY > 10) {
            hasMoved = true;
          }
          
          // 如果是長按狀態，更新 tooltip 位置
          if (isLongPress) {
            const rect = chart.canvas.getBoundingClientRect();
            const x = touch.clientX - rect.left;
            const y = touch.clientY - rect.top;
            
            const elements = chart.getElementsAtEventForMode(
              event,
              'index',
              { intersect: false },
              false
            );
            
            if (elements.length > 0) {
              chart.setActiveElements(elements);
              chart.tooltip.setActiveElements(elements, { x, y });
              chart.update('none');
            }
            
            // 阻止平移
            args.changed = false;
            return false;
          } else if (hasMoved) {
            // 如果移動了，取消長按計時器
            if (longPressTimer) {
              clearTimeout(longPressTimer);
              longPressTimer = null;
            }
          }
        }
      } else if (event.type === 'touchend' || event.type === 'touchcancel') {
        // 清除長按計時器
        if (longPressTimer) {
          clearTimeout(longPressTimer);
          longPressTimer = null;
        }
        
        // 如果是長按狀態，隱藏 tooltip
        if (isLongPress) {
          chart.options.plugins.tooltip.enabled = false;
          chart.setActiveElements([]);
          chart.tooltip.setActiveElements([]);
          chart.update('none');
        }
        
        // 重置狀態
        isLongPress = false;
        hasMoved = false;
      }
    },
  };
};
