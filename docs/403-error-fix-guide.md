# 403 Forbidden 錯誤修復指南

## 問題描述

用戶在重新整理頁面時偶爾會遇到 403 Forbidden 錯誤，特別是在以下情況：
- 頁面重新整理時
- 多個 API 請求同時發出時
- Session 接近過期時
- CSRF token 尚未初始化完成時

## 錯誤分析

### 根本原因
1. **認證狀態競爭條件**: 頁面載入時，認證狀態尚未完全初始化，但 API 請求已經發出
2. **CSRF Token 時機問題**: CSRF token 初始化與 API 請求之間的時機不同步
3. **Session 邊界情況**: Session 在請求過程中過期
4. **請求重複**: 同一個請求被多次發送，導致資源競爭

## 解決方案

### 1. 認證守衛 (AuthGuard)

**檔案**: `frontend/src/utils/authGuard.js`

提供統一的認證狀態管理：
- 確保認證狀態在 API 請求前完全初始化
- 自動重試機制處理 403 錯誤
- CSRF token 自動初始化
- Session 有效性驗證

```javascript
import authGuard from '../utils/authGuard';

// 使用認證守衛確保請求安全
await authGuard.makeAuthenticatedRequest(async () => {
    return await apiClient.get('/api/some-endpoint');
});
```

### 2. 增強的 API 客戶端

**檔案**: `frontend/src/utils/enhancedApiClient.js`

提供更可靠的 API 請求：
- 請求去重，避免重複請求
- 自動重試機制
- 網路狀態檢測
- 詳細的錯誤上下文

```javascript
import enhancedApiClient from '../utils/enhancedApiClient';

// 使用增強的 API 客戶端
const response = await enhancedApiClient.get('/api/hot-searches', {
    maxRetries: 2,
    retryDelay: 500
});
```

### 3. 後端 Session 驗證端點

**端點**: `GET /api/auth/validate-session`

提供輕量級的 session 驗證：
- 快速檢查 session 有效性
- 不涉及複雜的業務邏輯
- 用於前端認證狀態驗證

## 實施步驟

### 前端修改

#### 1. 更新組件使用增強的 API 客戶端

```javascript
// 原來的代碼
const response = await apiClient.get('/api/hot-searches');

// 修改後的代碼
const response = await enhancedApiClient.get('/api/hot-searches', {
    maxRetries: 2,
    retryDelay: 500
});
```

#### 2. 添加錯誤處理改進

```javascript
try {
    const response = await enhancedApiClient.get('/api/some-endpoint');
    // 處理成功回應
} catch (error) {
    // 只在非 403 錯誤時顯示錯誤提示
    if (error.response?.status !== 403) {
        handleApiError(error, showToast, t);
    } else {
        console.log('403 error detected, likely authentication issue');
    }
}
```

#### 3. 在應用初始化時設置認證守衛

```javascript
// 在 App.js 或主要組件中
import authGuard from './utils/authGuard';

useEffect(() => {
    // 確保認證狀態在應用啟動時初始化
    authGuard.ensureAuthenticated().catch(error => {
        console.log('Authentication not available:', error);
    });
}, []);
```

### 後端修改

#### 1. 添加 Session 驗證端點

執行腳本添加端點：
```bash
node backend/src/scripts/add-session-validation-endpoint.js
```

或手動添加到 auth routes：
```javascript
router.get('/validate-session', requireAuth, asyncHandler(async (req, res) => {
    res.json({
        status: 'success',
        data: {
            isValid: true,
            userId: req.user.userId,
            timestamp: new Date().toISOString()
        }
    });
}));
```

#### 2. 改進錯誤日誌

在相關中間件中添加更詳細的日誌：
```javascript
systemLogger.warn('403 Forbidden Error', {
    userId: req.user?.userId,
    endpoint: req.originalUrl,
    method: req.method,
    userAgent: req.get('User-Agent'),
    timestamp: new Date().toISOString(),
    sessionId: req.sessionID
});
```

## 測試和驗證

### 1. 診斷工具

使用診斷腳本檢查系統狀態：
```bash
node backend/src/scripts/diagnose-403-errors.js
```

### 2. 手動測試步驟

1. **正常流程測試**:
   - 登入系統
   - 重新整理頁面多次
   - 檢查是否出現 403 錯誤

2. **邊界情況測試**:
   - 在 session 即將過期時重新整理
   - 快速連續重新整理頁面
   - 開啟多個分頁同時操作

3. **網路問題模擬**:
   - 暫時斷網後重新連接
   - 模擬慢速網路環境

### 3. 監控指標

設置以下監控指標：
- 403 錯誤率
- 認證失敗次數
- API 請求重試次數
- Session 過期頻率

## 預防措施

### 1. 前端最佳實踐

- **延遲載入**: 確保認證狀態完全載入後再發送 API 請求
- **請求去重**: 避免同一時間發送重複請求
- **優雅降級**: 在認證失敗時提供適當的用戶體驗
- **狀態管理**: 使用統一的認證狀態管理

### 2. 後端最佳實踐

- **Session 管理**: 適當的 session 過期時間設置
- **CSRF 保護**: 確保 CSRF token 的正確處理
- **錯誤日誌**: 詳細記錄認證相關錯誤
- **監控警報**: 設置 403 錯誤率警報

### 3. 系統監控

- **實時監控**: 監控 403 錯誤的發生頻率和模式
- **用戶體驗追蹤**: 追蹤用戶在遇到 403 錯誤後的行為
- **效能監控**: 監控認證相關操作的效能

## 故障排除

### 常見問題和解決方案

#### 1. 認證守衛初始化失敗
```javascript
// 檢查認證狀態
console.log('Auth guard status:', authGuard.getQueueStatus());

// 重置認證狀態
authGuard.reset();
```

#### 2. CSRF Token 問題
```javascript
// 檢查 CSRF token 狀態
console.log('CSRF initialized:', csrfClient.isTokenInitialized());

// 強制重新初始化
await csrfClient.initializeCSRFToken();
```

#### 3. Session 過期問題
```javascript
// 檢查 session 狀態
const authStatus = await fetch('/api/auth/status');
console.log('Auth status:', await authStatus.json());
```

### 調試工具

#### 1. 瀏覽器開發者工具
- 檢查 Network 標籤中的請求狀態
- 查看 Console 中的錯誤訊息
- 檢查 Application 標籤中的 Session Storage

#### 2. 後端日誌
```bash
# 檢查認證相關錯誤
grep "403\|Forbidden\|Authentication" logs/system.log | tail -50

# 檢查 CSRF 相關錯誤
grep "CSRF" logs/system.log | tail -20

# 檢查 session 相關錯誤
grep "session" logs/system.log | tail -20
```

## 部署注意事項

### 1. 漸進式部署
- 先部署後端的 session 驗證端點
- 再部署前端的認證守衛功能
- 最後更新各個組件使用新的 API 客戶端

### 2. 回滾計劃
- 保留原有的 API 客戶端作為備用
- 可以通過功能開關控制新功能的啟用
- 監控部署後的錯誤率變化

### 3. 效能考量
- 認證守衛會增加少量的初始化時間
- 請求去重可能會稍微延遲某些請求
- 重試機制會增加伺服器負載

## 總結

通過實施認證守衛、增強的 API 客戶端和改進的錯誤處理，可以有效解決間歇性的 403 Forbidden 錯誤。這些改進不僅解決了當前問題，還提高了整體系統的穩定性和用戶體驗。

關鍵改進點：
- ✅ 統一的認證狀態管理
- ✅ 自動重試和錯誤恢復
- ✅ 請求去重和競爭條件處理
- ✅ 詳細的錯誤日誌和監控
- ✅ 優雅的錯誤處理和用戶體驗