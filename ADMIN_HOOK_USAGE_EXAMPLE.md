# useAdminPermissions Hook 使用示例

## 基本使用

```javascript
import React from 'react';
import { useAdminPermissions } from '../hooks/useAdminPermissions';

function AdminPanel() {
    const {
        isAdmin,
        loading,
        error,
        checkAdminStatus,
        refreshAdminStatus,
        clearAdminStatus,
        isCurrentUserAdmin,
        shouldShowAdminFeatures
    } = useAdminPermissions();

    // 顯示加載狀態
    if (loading) {
        return <div>檢查管理員權限中...</div>;
    }

    // 顯示錯誤狀態
    if (error) {
        return (
            <div>
                <p>權限檢查失敗: {error.message}</p>
                <button onClick={refreshAdminStatus}>重試</button>
            </div>
        );
    }

    // 條件渲染管理員功能
    if (!shouldShowAdminFeatures()) {
        return <div>您沒有管理員權限</div>;
    }

    return (
        <div>
            <h1>管理員面板</h1>
            <p>歡迎，管理員！</p>
            
            <div>
                <button onClick={refreshAdminStatus}>
                    刷新權限狀態
                </button>
                <button onClick={clearAdminStatus}>
                    清除權限緩存
                </button>
            </div>
            
            {/* 管理員功能 */}
            <AdminFeatures />
        </div>
    );
}
```

## 條件渲染組件

```javascript
import React from 'react';
import { useAdminPermissions } from '../hooks/useAdminPermissions';

function ConditionalAdminButton() {
    const { isCurrentUserAdmin } = useAdminPermissions();

    // 使用同步方法進行條件渲染
    if (!isCurrentUserAdmin()) {
        return null;
    }

    return (
        <button className="admin-button">
            管理員操作
        </button>
    );
}
```

## 與現有組件集成

```javascript
import React from 'react';
import { useAdminPermissions } from '../hooks/useAdminPermissions';

function NavigationBar() {
    const { shouldShowAdminFeatures } = useAdminPermissions();

    return (
        <nav>
            <ul>
                <li><a href="/">首頁</a></li>
                <li><a href="/profile">個人資料</a></li>
                
                {/* 條件顯示管理員導航 */}
                {shouldShowAdminFeatures() && (
                    <li><a href="/admin">管理員面板</a></li>
                )}
            </ul>
        </nav>
    );
}
```

## 錯誤處理示例

```javascript
import React from 'react';
import { useAdminPermissions } from '../hooks/useAdminPermissions';

function AdminDashboard() {
    const {
        isAdmin,
        loading,
        error,
        refreshAdminStatus
    } = useAdminPermissions();

    const handleRetry = async () => {
        try {
            await refreshAdminStatus();
        } catch (err) {
            console.error('重試失敗:', err);
        }
    };

    return (
        <div>
            {loading && <div className="loading">檢查權限中...</div>}
            
            {error && (
                <div className="error">
                    <p>權限檢查失敗</p>
                    <button onClick={handleRetry}>重試</button>
                </div>
            )}
            
            {isAdmin && !loading && !error && (
                <div className="admin-content">
                    <h1>管理員儀表板</h1>
                    {/* 管理員內容 */}
                </div>
            )}
            
            {!isAdmin && !loading && !error && (
                <div className="access-denied">
                    <p>訪問被拒絕</p>
                </div>
            )}
        </div>
    );
}
```

## 高階組件 (HOC) 使用

```javascript
import React from 'react';
import { useAdminPermissions } from '../hooks/useAdminPermissions';

// 創建一個需要管理員權限的高階組件
function withAdminPermissions(WrappedComponent) {
    return function AdminProtectedComponent(props) {
        const { isAdmin, loading, error } = useAdminPermissions();

        if (loading) {
            return <div>檢查權限中...</div>;
        }

        if (error) {
            return <div>權限檢查失敗</div>;
        }

        if (!isAdmin) {
            return <div>需要管理員權限</div>;
        }

        return <WrappedComponent {...props} />;
    };
}

// 使用 HOC
const ProtectedAdminPanel = withAdminPermissions(AdminPanel);
```

## 與路由保護集成

```javascript
import React from 'react';
import { Route, Redirect } from 'react-router-dom';
import { useAdminPermissions } from '../hooks/useAdminPermissions';

function AdminRoute({ component: Component, ...rest }) {
    const { isAdmin, loading } = useAdminPermissions();

    return (
        <Route
            {...rest}
            render={(props) => {
                if (loading) {
                    return <div>檢查權限中...</div>;
                }
                
                return isAdmin ? (
                    <Component {...props} />
                ) : (
                    <Redirect to="/unauthorized" />
                );
            }}
        />
    );
}

// 使用受保護的路由
function App() {
    return (
        <Router>
            <Switch>
                <Route exact path="/" component={Home} />
                <AdminRoute path="/admin" component={AdminPanel} />
                <Route path="/unauthorized" component={Unauthorized} />
            </Switch>
        </Router>
    );
}
```

## 關鍵特性

### 1. 立即可用
- Hook 初始化時立即從工具類獲取當前狀態
- 無需等待異步檢查即可進行條件渲染

### 2. 自動同步
- 自動監聽工具類的狀態變化
- 當權限狀態改變時自動更新 UI

### 3. 錯誤恢復
- 當 API 調用失敗時，自動使用工具類的緩存狀態
- 提供重試機制

### 4. 性能優化
- 最小化重新渲染
- 無不必要的定時器或輪詢
- 事件驅動的更新機制

### 5. 簡單易用
- 清晰的 API
- 最少的配置
- 直觀的方法命名

## 最佳實踐

1. **使用 `shouldShowAdminFeatures()` 進行條件渲染**
2. **使用 `isCurrentUserAdmin()` 進行同步檢查**
3. **處理 loading 和 error 狀態**
4. **在組件卸載時自動清理**
5. **避免在 render 方法中調用異步方法**