# 分析專欄紅點提示功能測試指南

## 功能概述
當有新文章發佈時，「分析專欄」導航連結會顯示紅點提示，使用者點擊進入文章列表後紅點消失。

## 持久化機制
- **儲存位置**: `localStorage`
- **儲存鍵值**: `lastViewedArticleSlug`
- **儲存內容**: 使用者最後查看時的最新文章 slug
- **優點**: 
  - ✅ 前後端伺服器重啟不影響
  - ✅ 瀏覽器關閉重開後記錄仍存在
  - ✅ 無需後端支援
  - ✅ 跨裝置獨立追蹤（每個裝置/瀏覽器獨立記錄）

## 運作邏輯

### 1. 初次使用者
- localStorage 中沒有 `lastViewedArticleSlug` 記錄
- 顯示紅點提示
- 點擊進入文章列表後，記錄當前最新文章的 slug

### 2. 回訪使用者（無新文章）
- localStorage 中的 `lastViewedArticleSlug` 與當前最新文章相同
- 不顯示紅點

### 3. 回訪使用者（有新文章）
- localStorage 中的 `lastViewedArticleSlug` 與當前最新文章不同
- 顯示紅點提示
- 點擊進入文章列表後，更新為新的最新文章 slug

## 測試步驟

### 測試 1: 初次使用者體驗
```javascript
// 1. 清除 localStorage
localStorage.removeItem('lastViewedArticleSlug');

// 2. 重新載入頁面
// 預期結果: 「分析專欄」顯示紅點

// 3. 點擊「分析專欄」
// 預期結果: 紅點消失，localStorage 中記錄最新文章 slug
```

### 測試 2: 新文章發佈模擬
```javascript
// 1. 查看當前記錄
console.log(localStorage.getItem('lastViewedArticleSlug'));
// 例如: "2.用市場情緒綜合指數判斷買賣時機"

// 2. 模擬舊使用者（將記錄改為舊文章）
localStorage.setItem('lastViewedArticleSlug', '1.用樂活五線譜分析價格趨勢與情緒');

// 3. 重新載入頁面
// 預期結果: 「分析專欄」顯示紅點（因為有新文章）

// 4. 點擊「分析專欄」
// 預期結果: 紅點消失，localStorage 更新為最新文章
```

### 測試 3: 伺服器重啟後持久性
```bash
# 1. 正常使用後，記錄已存在
# 2. 重啟前端開發伺服器
npm start

# 3. 重新開啟瀏覽器
# 預期結果: 記錄仍然存在，紅點狀態正確
```

### 測試 4: 跨裝置獨立性
```
1. 在裝置 A 查看文章列表（紅點消失）
2. 在裝置 B 開啟網站
預期結果: 裝置 B 仍顯示紅點（因為 localStorage 是獨立的）
```

## 開發者工具檢查

### 查看當前記錄
```javascript
// 在瀏覽器 Console 執行
console.log('最後查看的文章:', localStorage.getItem('lastViewedArticleSlug'));
```

### 重置通知狀態（測試用）
```javascript
// 清除記錄，模擬初次使用者
localStorage.removeItem('lastViewedArticleSlug');
window.location.reload();
```

### 模擬有新文章
```javascript
// 設定為舊文章，模擬有新文章發佈
localStorage.setItem('lastViewedArticleSlug', '1.用樂活五線譜分析價格趨勢與情緒');
window.location.reload();
```

## 紅點顯示位置

### 桌面版
- 頂部導航列的「分析專欄」連結右上角

### 手機版
- 側邊欄的「分析專欄」項目右側
- 漢堡選單圖示（如果有未讀文章）

## 技術實作細節

### 檔案修改清單
1. `frontend/src/components/NewFeatureBadge/useNewFeatureNotification.js`
   - 新增基於文章 ID 的追蹤機制
   - 支援傳入文章列表進行比對

2. `frontend/src/components/Articles/Articles.js`
   - 進入文章列表時自動標記為已讀

3. `frontend/src/App.js`
   - 載入文章列表用於通知檢查
   - 在導航連結中顯示紅點
   - 點擊時標記為已讀

4. `frontend/src/components/NewFeatureBadge/NewFeatureBadge.css`
   - 新增導航連結中紅點的樣式

### 資料流程
```
1. App.js 載入文章列表
   ↓
2. useNewFeatureNotification 比對最新文章與 localStorage
   ↓
3. 如果不同 → hasNewArticles = true → 顯示紅點
   ↓
4. 使用者點擊「分析專欄」
   ↓
5. handleArticlesClick 更新 localStorage
   ↓
6. 紅點消失
```

## 注意事項

### 優點
- ✅ 完全前端實作，無需後端支援
- ✅ 持久化儲存，不受伺服器重啟影響
- ✅ 效能優異，無額外 API 請求
- ✅ 跨裝置獨立追蹤

### 限制
- ⚠️ 清除瀏覽器資料會重置記錄
- ⚠️ 無痕模式下記錄不會保留
- ⚠️ 跨裝置不同步（這是設計特性，非缺陷）

## 未來擴展建議

如果需要跨裝置同步，可考慮：
1. 將記錄儲存到後端使用者資料
2. 使用 Firebase 或類似服務
3. 實作 Service Worker 同步機制
