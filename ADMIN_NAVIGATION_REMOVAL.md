# 移除管理員導航入口

## 變更說明
根據用戶要求，移除了 top-nav 和 side menu 中的管理員入口，現在只能通過直接輸入 URL 來訪問管理員頁面。

## 修改的文件
- `frontend/src/App.js`

## 具體變更

### 1. 移除 AdminNavigation 組件的 import
```javascript
// 移除了這行：
import AdminNavigation from './components/Common/AdminNavigation';
```

### 2. 移除側邊欄中的管理員導航
```javascript
// 移除了這行：
<AdminNavigation isMobile={true} onNavigate={() => isMobile && setSidebarOpen(false)} />
```

### 3. 移除桌面版導航欄中的管理員導航
```javascript
// 移除了這行：
<AdminNavigation isMobile={false} />
```

## 結果
- ✅ 側邊欄不再顯示管理員入口
- ✅ 桌面版導航欄不再顯示管理員入口
- ✅ 管理員頁面仍然可以通過直接 URL 訪問：
  - `/zh-TW/nk-admin`
  - `/en/nk-admin`
- ✅ 管理員權限檢查和功能保持不變
- ✅ AdminNavigation 組件文件保留（以備將來需要）

## 訪問方式
現在管理員只能通過以下方式訪問管理員頁面：
1. 直接在瀏覽器地址欄輸入 URL
2. 書籤
3. 其他程式化方式

這提供了更好的安全性，因為管理員入口不會在普通用戶界面中顯示。