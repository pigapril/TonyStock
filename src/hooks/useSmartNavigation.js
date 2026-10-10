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
    enabled = true,
    debounceMs = 100,
    threshold = 5
  } = options;

  const [shouldUseSideNav, setShouldUseSideNav] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const navRef = useRef(null);
  const resizeTimeoutRef = useRef(null);
  const initialHeightRef = useRef(null);
  const frameRef = useRef(null);
  const previousWidthRef = useRef(null);

  /**
   * 檢測導航項目是否換行
   */
  const checkNavWrapping = useCallback(() => {
    if (!enabled || !navRef.current) return;

    const navElement = navRef.current;
    // 只取 .desktop-nav-items 的直接子層，避免把 dropdown menu 內部的連結誤判為換行的 nav item
    const navItems = navElement.querySelectorAll('.desktop-nav-items > a, .desktop-nav-items > .desktop-nav-item');
    
    if (navItems.length === 0) return;

    // 獲取導航容器的當前高度
    const currentHeight = navElement.offsetHeight;
    
    // 如果是第一次檢測，記錄初始高度
    if (initialHeightRef.current === null) {
      initialHeightRef.current = currentHeight;
      setIsInitialized(true);
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
    const desktopNav = navElement.querySelector('.desktop-nav-items');
    const isOverflowing = navElement.scrollWidth > navElement.clientWidth ||
      (desktopNav && desktopNav.scrollWidth > desktopNav.clientWidth);

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
  }, [enabled, threshold]);

  /**
   * 防抖的檢查函數
   */
  const cancelCheck = useCallback(() => {
    clearTimeout(resizeTimeoutRef.current);
    if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    frameRef.current = null;
  }, []);

  const debouncedCheck = useCallback(() => {
    cancelCheck();
    if (!enabled) return;
    resizeTimeoutRef.current = setTimeout(() => {
      // Let the current render reach a frame before reading layout dimensions.
      frameRef.current = requestAnimationFrame(() => {
        frameRef.current = requestAnimationFrame(() => {
          frameRef.current = null;
          checkNavWrapping();
        });
      });
    }, debounceMs);
  }, [cancelCheck, enabled, checkNavWrapping, debounceMs]);

  /**
   * 重置導航狀態（當窗口大小顯著改變時）
   */
  const resetNavigation = useCallback(() => {
    initialHeightRef.current = null;
    setShouldUseSideNav(false);
    setIsInitialized(false);
    
    debouncedCheck();
  }, [debouncedCheck]);

  /**
   * 手動觸發檢查（用於內容動態變化時）
   */
  const triggerCheck = useCallback(() => {
    debouncedCheck();
  }, [debouncedCheck]);

  useEffect(() => {
    initialHeightRef.current = null;
    setShouldUseSideNav(false);
    setIsInitialized(false);
    if (!enabled) return undefined;

    previousWidthRef.current = window.innerWidth;
    const handleResize = () => {
      const width = window.innerWidth;
      if (Math.abs(width - previousWidthRef.current) > 100) {
        previousWidthRef.current = width;
        resetNavigation();
      } else {
        debouncedCheck();
      }
    };

    window.addEventListener('resize', handleResize);
    // Subscribe to future font loads without reading fonts.ready, which can
    // synchronously flush pending layout during the initial React commit.
    const fonts = document.fonts;
    fonts?.addEventListener?.('loadingdone', debouncedCheck);
    debouncedCheck();
    return () => {
      window.removeEventListener('resize', handleResize);
      fonts?.removeEventListener?.('loadingdone', debouncedCheck);
      cancelCheck();
    };
  }, [enabled, debouncedCheck, resetNavigation, cancelCheck]);

  return {
    shouldUseSideNav,
    isInitialized,
    navRef,
    triggerCheck,
    resetNavigation
  };
};

export default useSmartNavigation;