/**
 * 廣告阻擋服務 - 根據用戶訂閱狀態控制 AdSense 廣告顯示
 */

class AdBlockingService {
  constructor() {
    this.isProUser = false;
    this.adSenseBlocked = false;
    this.originalPushFunction = null;
  }

  /**
   * 初始化廣告控制
   * @param {boolean} isProUser - 是否為 Pro 用戶
   */
  initialize(isProUser = false) {
    this.isProUser = isProUser;
    
    if (isProUser && !this.adSenseBlocked) {
      this.blockAdSense();
    } else if (!isProUser && this.adSenseBlocked) {
      this.unblockAdSense();
    }
  }

  /**
   * 阻擋 AdSense 廣告
   */
  blockAdSense() {
    if (this.adSenseBlocked) return;

    console.log('🚫 AdSense 廣告已為 Pro 用戶阻擋');

    // 1. 阻擋 adsbygoogle.push()
    if (window.adsbygoogle) {
      this.originalPushFunction = window.adsbygoogle.push;
      window.adsbygoogle.push = () => {
        console.log('🚫 AdSense push 被阻擋 (Pro 用戶)');
        return;
      };
    }

    // 2. 隱藏現有的廣告元素
    this.hideExistingAds();

    // 3. 阻擋新的廣告元素
    this.blockNewAds();

    // 4. 添加 CSS 規則隱藏廣告
    this.addAdBlockingCSS();

    this.adSenseBlocked = true;
  }

  /**
   * 解除 AdSense 廣告阻擋
   */
  unblockAdSense() {
    if (!this.adSenseBlocked) return;

    console.log('✅ AdSense 廣告已為 Free 用戶啟用');

    // 1. 恢復 adsbygoogle.push()
    if (window.adsbygoogle && this.originalPushFunction) {
      window.adsbygoogle.push = this.originalPushFunction;
      this.originalPushFunction = null;
    }

    // 2. 顯示廣告元素
    this.showAds();

    // 3. 移除阻擋 CSS
    this.removeAdBlockingCSS();

    this.adSenseBlocked = false;
  }

  /**
   * 隱藏現有的廣告元素
   */
  hideExistingAds() {
    const adSelectors = [
      '.adsbygoogle',
      'ins.adsbygoogle',
      '[data-ad-client]',
      '[data-ad-slot]',
      '.ad-banner-container',
      '.google-auto-placed',
      '.interstitial-ad-modal-overlay', // 插頁廣告
      '.interstitial-ad-modal-content'
    ];

    adSelectors.forEach(selector => {
      const elements = document.querySelectorAll(selector);
      elements.forEach(element => {
        element.style.display = 'none';
        element.setAttribute('data-pro-hidden', 'true');
      });
    });
  }

  /**
   * 顯示廣告元素
   */
  showAds() {
    const hiddenAds = document.querySelectorAll('[data-pro-hidden="true"]');
    hiddenAds.forEach(element => {
      element.style.display = '';
      element.removeAttribute('data-pro-hidden');
    });
  }

  /**
   * 阻擋新的廣告元素
   */
  blockNewAds() {
    // 使用 MutationObserver 監控新添加的廣告元素
    if (this.observer) {
      this.observer.disconnect();
    }

    this.observer = new MutationObserver((mutations) => {
      if (!this.isProUser) return;

      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            // 檢查是否為廣告元素
            if (this.isAdElement(node)) {
              node.style.display = 'none';
              node.setAttribute('data-pro-hidden', 'true');
            }

            // 檢查子元素
            const adElements = node.querySelectorAll && node.querySelectorAll('.adsbygoogle, ins.adsbygoogle, [data-ad-client]');
            if (adElements) {
              adElements.forEach(adElement => {
                adElement.style.display = 'none';
                adElement.setAttribute('data-pro-hidden', 'true');
              });
            }
          }
        });
      });
    });

    this.observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  /**
   * 檢查元素是否為廣告元素
   */
  isAdElement(element) {
    const adClasses = ['adsbygoogle', 'google-auto-placed', 'interstitial-ad-modal-overlay', 'interstitial-ad-modal-content'];
    const adAttributes = ['data-ad-client', 'data-ad-slot'];

    return (
      adClasses.some(className => element.classList?.contains(className)) ||
      adAttributes.some(attr => element.hasAttribute?.(attr)) ||
      element.tagName === 'INS' && element.className.includes('adsbygoogle')
    );
  }

  /**
   * 添加 CSS 規則隱藏廣告
   */
  addAdBlockingCSS() {
    if (document.getElementById('pro-ad-blocking-css')) return;

    const style = document.createElement('style');
    style.id = 'pro-ad-blocking-css';
    style.textContent = `
      /* Pro 用戶廣告隱藏 CSS */
      .pro-user .adsbygoogle,
      .pro-user ins.adsbygoogle,
      .pro-user [data-ad-client],
      .pro-user [data-ad-slot],
      .pro-user .google-auto-placed,
      .pro-user .interstitial-ad-modal-overlay,
      .pro-user .interstitial-ad-modal-content {
        display: none !important;
        visibility: hidden !important;
        height: 0 !important;
        width: 0 !important;
        margin: 0 !important;
        padding: 0 !important;
        opacity: 0 !important;
        pointer-events: none !important;
      }
    `;
    document.head.appendChild(style);

    // 為 body 添加 pro-user class
    document.body.classList.add('pro-user');
  }

  /**
   * 移除廣告阻擋 CSS
   */
  removeAdBlockingCSS() {
    const style = document.getElementById('pro-ad-blocking-css');
    if (style) {
      style.remove();
    }
    document.body.classList.remove('pro-user');
  }

  /**
   * 清理資源
   */
  cleanup() {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
    this.removeAdBlockingCSS();
  }
}

// 創建單例
const adBlockingService = new AdBlockingService();

export default adBlockingService;