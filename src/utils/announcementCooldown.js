/**
 * 公告冷卻期管理工具
 * 實作漸進式冷卻期機制，支援公告版本更新重置
 */

const STORAGE_KEY = 'tony_stock_announcement_cooldown';

// 漸進式冷卻期設定 (毫秒)
const COOLDOWN_PERIODS = [
  6 * 60 * 60 * 1000,      // 第1次關閉：6小時
  24 * 60 * 60 * 1000,     // 第2次關閉：24小時
  3 * 24 * 60 * 60 * 1000, // 第3次關閉：3天
  7 * 24 * 60 * 60 * 1000  // 第4次以上：7天（上限）
];

/**
 * 公告冷卻期管理類
 */
class AnnouncementCooldownManager {
  /**
   * 獲取儲存的公告資料
   */
  getStoredData() {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      return data ? JSON.parse(data) : {};
    } catch (error) {
      console.error('Error reading announcement cooldown data from localStorage:', error);
      return {};
    }
  }

  /**
   * 儲存公告資料
   */
  setStoredData(data) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
      console.error('Error saving announcement cooldown data to localStorage:', error);
    }
  }

  /**
   * 生成公告的唯一標識符
   * 基於公告內容和最後更新時間
   */
  generateAnnouncementId(config) {
    if (!config || !config.message) {
      return null;
    }

    // 使用訊息內容的前50個字符 + 最後更新時間作為ID
    const messageHash = config.message.substring(0, 50);
    
    // 使用 lastUpdated 時間戳，如果沒有則使用當前時間
    const timestamp = config.lastUpdated || Date.now();
    
    // 使用安全的編碼方法處理中文字符
    const safeEncode = (str) => {
      try {
        // 先將字符串轉為 UTF-8 bytes，再進行 base64 編碼
        return btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, (match, p1) => {
          return String.fromCharCode(parseInt(p1, 16));
        })).replace(/[^a-zA-Z0-9]/g, '');
      } catch (error) {
        // 如果編碼失敗，使用簡單的 hash 方法
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
          const char = str.charCodeAt(i);
          hash = ((hash << 5) - hash) + char;
          hash = hash & hash; // 轉為32位整數
        }
        return Math.abs(hash).toString(36);
      }
    };
    
    return `announcement_${safeEncode(messageHash)}_${timestamp}`;
  }

  /**
   * 檢查是否應該顯示公告
   * @param {Object} config - 公告配置物件
   * @returns {boolean} 是否應該顯示
   */
  shouldShowAnnouncement(config) {
    if (!config || !config.enabled || !config.message) {
      return false;
    }

    const announcementId = this.generateAnnouncementId(config);
    if (!announcementId) {
      return false;
    }

    const storedData = this.getStoredData();
    const announcementData = storedData[announcementId];

    // 如果沒有記錄，應該顯示
    if (!announcementData) {
      return true;
    }

    // 檢查是否還在冷卻期內
    const now = Date.now();
    return now >= announcementData.nextShowTime;
  }

  /**
   * 記錄公告關閉
   * @param {Object} config - 公告配置物件
   */
  dismissAnnouncement(config) {
    if (!config || !config.message) {
      return;
    }

    const announcementId = this.generateAnnouncementId(config);
    if (!announcementId) {
      return;
    }

    const storedData = this.getStoredData();
    const announcementData = storedData[announcementId] || {};

    // 增加關閉次數
    announcementData.dismissCount = (announcementData.dismissCount || 0) + 1;
    announcementData.lastDismissed = new Date().toISOString();
    announcementData.announcementId = announcementId;

    // 計算下次顯示時間
    const cooldownIndex = Math.min(
      announcementData.dismissCount - 1,
      COOLDOWN_PERIODS.length - 1
    );
    const cooldownPeriod = COOLDOWN_PERIODS[cooldownIndex];
    announcementData.nextShowTime = Date.now() + cooldownPeriod;

    // 儲存更新後的資料
    storedData[announcementId] = announcementData;
    this.setStoredData(storedData);

    // 開發模式下顯示調試資訊
    if (process.env.NODE_ENV === 'development') {
      console.log(`公告已關閉 (第${announcementData.dismissCount}次)`, {
        id: announcementId,
        nextShowTime: new Date(announcementData.nextShowTime).toLocaleString(),
        cooldownPeriod: this.formatCooldownPeriod(cooldownPeriod)
      });
    }
  }

  /**
   * 格式化冷卻期時間為可讀字串
   */
  formatCooldownPeriod(period) {
    const hours = period / (60 * 60 * 1000);
    if (hours < 24) {
      return `${hours}小時`;
    } else {
      const days = hours / 24;
      return `${days}天`;
    }
  }

  /**
   * 獲取公告的關閉統計資訊
   * @param {Object} config - 公告配置物件
   * @returns {Object} 統計資訊
   */
  getAnnouncementStats(config) {
    if (!config) {
      return {
        dismissCount: 0,
        lastDismissed: null,
        nextShowTime: null,
        isInCooldown: false
      };
    }

    const announcementId = this.generateAnnouncementId(config);
    if (!announcementId) {
      return {
        dismissCount: 0,
        lastDismissed: null,
        nextShowTime: null,
        isInCooldown: false
      };
    }

    const storedData = this.getStoredData();
    const announcementData = storedData[announcementId];

    if (!announcementData) {
      return {
        dismissCount: 0,
        lastDismissed: null,
        nextShowTime: null,
        isInCooldown: false
      };
    }

    return {
      dismissCount: announcementData.dismissCount || 0,
      lastDismissed: announcementData.lastDismissed,
      nextShowTime: announcementData.nextShowTime,
      isInCooldown: Date.now() < announcementData.nextShowTime,
      announcementId: announcementId
    };
  }

  /**
   * 清除特定公告的記錄（用於測試或管理）
   * @param {Object} config - 公告配置物件
   */
  clearAnnouncementData(config) {
    const announcementId = this.generateAnnouncementId(config);
    if (!announcementId) {
      return;
    }

    const storedData = this.getStoredData();
    delete storedData[announcementId];
    this.setStoredData(storedData);
  }

  /**
   * 清除所有公告記錄（用於測試或重置）
   */
  clearAllAnnouncementData() {
    localStorage.removeItem(STORAGE_KEY);
  }

  /**
   * 清理過期的公告記錄（超過30天的記錄）
   */
  cleanupExpiredData() {
    const storedData = this.getStoredData();
    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
    let hasChanges = false;

    Object.keys(storedData).forEach(key => {
      const data = storedData[key];
      if (data.lastDismissed && new Date(data.lastDismissed).getTime() < thirtyDaysAgo) {
        delete storedData[key];
        hasChanges = true;
      }
    });

    if (hasChanges) {
      this.setStoredData(storedData);
    }
  }

  /**
   * 獲取冷卻期設定（用於顯示給用戶）
   * @returns {Array} 冷卻期陣列
   */
  getCooldownPeriods() {
    return COOLDOWN_PERIODS.map(period => this.formatCooldownPeriod(period));
  }
}

// 建立單例實例
const announcementCooldownManager = new AnnouncementCooldownManager();

export default announcementCooldownManager;