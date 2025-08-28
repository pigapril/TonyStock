import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * 智能導航 Hook - 檢測導航文字是否換行並自動切換到側邊選單
 * @param {Object} options - 配置選項
 * @param {number} options.debounceMs - 防抖延遲時間（毫秒）
 * @param {number} options.threshold - 高度變化閾值（像素）
 * @returns {Object} - 返回導航狀態和相關方法
 */
export const useSmartNavigation = (options = {}) => {
  const {
    debounceMs = 100,
    threshold = 5
  } = options;

  const [shouldUseSideNav, setShouldUseSideNav] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const navRef = useRef(null);
  const resizeTimeoutRef = useRef(null);
  const initialHeightRef = useRef(null);

  /**
   * 檢測導航項目是否換行
   */
  const checkNavWrapping = useCallback(() => {
    if (!navRef.current) return;

    const navElement = navRef.current;
    const navItems = navElement.querySelectorAll('.desktop-nav-items a, .desktop-nav-items .desktop-nav-item');
    
    if (navItems.length === 0) return;

    // 獲取導航容器的當前高度
    const currentHeight = navElement.offsetHeight;
    
    // 如果是第一次檢測，記錄初始高度
    if (initialHeightRef.current === null) {
      initialHeightRef.current = currentHeight;
      setIsInitialized(true);
      return;
    }

    // 檢查高度是否增加（表示可能有換行）
    const heightIncrease = currentHeight - initialHeightRef.current;
    const hasWrapped = heightIncrease > threshold;

    // 額外檢查：檢測導航項目是否在同一行
    let hasLineBreak = false;
    if (navItems.length > 1) {
      const firstItemTop = navItems[0].getBoundingClientRect().top;
      for (let i = 1; i < navItems.length; i++) {
        const itemTop = navItems[i].getBoundingClientRect().top;
        if (Math.abs(itemTop - firstItemTop) > threshold) {
          hasLineBreak = true;
          break;
        }
      }
    }

    // 檢查導航容器是否溢出
    const isOverflowing = navElement.scrollWidth > navElement.clientWidth;

    const shouldSwitch = hasWrapped || hasLineBreak || isOverflowing;
    
    // 只在狀態真正改變時更新
    setShouldUseSideNav(prev => {
      if (prev !== shouldSwitch) {
        console.log('🔄 Smart Navigation: Switching to', shouldSwitch ? 'side nav' : 'top nav', {
          heightIncrease,
          hasLineBreak,
          isOverflowing,
          currentHeight,
          initialHeight: initialHeightRef.current
        });
        return shouldSwitch;
      }
      return prev;
    });
  }, [threshold]);

  /**
   * 防抖的檢查函數
   */
  const debouncedCheck = useCallback(() => {
    if (resizeTimeoutRef.current) {
      clearTimeout(resizeTimeoutRef.current);
    }
    
    resizeTimeoutRef.current = setTimeout(() => {
      checkNavWrapping();
    }, debounceMs);
  }, [checkNavWrapping, debounceMs]);

  /**
   * 重置導航狀態（當窗口大小顯著改變時）
   */
  const resetNavigation = useCallback(() => {
    initialHeightRef.current = null;
    setShouldUseSideNav(false);
    setIsInitialized(false);
    
    // 延遲重新檢測，確保 DOM 已更新
    setTimeout(() => {
      checkNavWrapping();
    }, 50);
  }, [checkNavWrapping]);

  /**
   * 手動觸發檢查（用於內容動態變化時）
   */
  const triggerCheck = useCallback(() => {
    debouncedCheck();
  }, [debouncedCheck]);

  // 監聽窗口大小變化
  useEffect(() => {
    const handleResize = () => {
      // 如果窗口寬度變化超過 100px，重置導航狀態
      const currentWidth = window.innerWidth;
      if (!window.lastWidth) {
        window.lastWidth = currentWidth;
      }
      
      const widthChange = Math.abs(currentWidth - window.lastWidth);
      if (widthChange > 100) {
        resetNavigation();
        window.lastWidth = currentWidth;
      } else {
        debouncedCheck();
      }
    };

    window.addEventListener('resize', handleResize);
    
    // 初始檢查
    const initialCheck = setTimeout(() => {
      checkNavWrapping();
    }, 100);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current);
      }
      clearTimeout(initialCheck);
    };
  }, [debouncedCheck, resetNavigation, checkNavWrapping]);

  // 監聽字體加載完成
  useEffect(() => {
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(() => {
        setTimeout(() => {
          triggerCheck();
        }, 100);
      });
    }
  }, [triggerCheck]);

  return {
    shouldUseSideNav,
    isInitialized,
    navRef,
    triggerCheck,
    resetNavigation
  };
};

export default useSmartNavigation;