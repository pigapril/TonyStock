/**
 * 前端日誌工具
 * 
 * 提供結構化的日誌記錄功能
 */

class Logger {
    constructor() {
        this.isDevelopment = process.env.NODE_ENV === 'development';
    }

    /**
     * 記錄資訊日誌
     */
    info(message, data = {}) {
        if (this.isDevelopment) {
            console.log(`[INFO] ${message}`, data);
        }
        
        // 在生產環境中可以發送到日誌服務
        this.sendToLogService('info', message, data);
    }

    /**
     * 記錄警告日誌
     */
    warn(message, data = {}) {
        if (this.isDevelopment) {
            console.warn(`[WARN] ${message}`, data);
        }
        
        this.sendToLogService('warn', message, data);
    }

    /**
     * 記錄錯誤日誌
     */
    error(message, data = {}) {
        if (this.isDevelopment) {
            console.error(`[ERROR] ${message}`, data);
        }
        
        this.sendToLogService('error', message, data);
    }

    /**
     * 記錄除錯日誌
     */
    debug(message, data = {}) {
        if (this.isDevelopment) {
            console.debug(`[DEBUG] ${message}`, data);
        }
    }

    /**
     * 發送日誌到服務端（生產環境）
     */
    sendToLogService(level, message, data) {
        if (!this.isDevelopment) {
            // 在生產環境中，可以發送到日誌收集服務
            // 例如：Sentry, LogRocket, 或自建的日誌 API
            try {
                // 這裡可以實作實際的日誌發送邏輯
                // fetch('/api/logs', {
                //     method: 'POST',
                //     headers: { 'Content-Type': 'application/json' },
                //     body: JSON.stringify({
                //         level,
                //         message,
                //         data,
                //         timestamp: new Date().toISOString(),
                //         userAgent: navigator.userAgent,
                //         url: window.location.href
                //     })
                // });
            } catch (error) {
                // 靜默處理日誌發送錯誤
            }
        }
    }
}

// 創建單例實例
export const systemLogger = new Logger();

export default systemLogger;