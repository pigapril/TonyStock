# Debug Log 清理

## 問題描述
用戶反映按下 "Clear Cache" 後會出現大量重複的 log 訊息，特別是：
- `shouldShowAdminFeatures` 每 2 秒被調用兩次
- `AdminPermissions: Scheduling background refresh` 持續出現
- 過多的狀態同步 log

## 根本原因
1. **過度的調試 log**：`shouldShowAdminFeatures` 函數每次被調用都會產生 log
2. **定期同步機制**：1 秒間隔的狀態同步檢查造成持續的 log 輸出
3. **調試組件頻繁更新**：每 2 秒更新一次的調試組件造成額外的函數調用

## 修復措施

### 1. 移除 `shouldShowAdminFeatures` 的調試 log
```javascript
// 修復前 (產生過多 log):
const shouldShowAdminFeatures = useCallback(() => {
    const result = isAdmin && isAuthenticated;
    console.log('useAdminPermissions: shouldShowAdminFeatures:', {
        isAdmin,
        isAuthenticated,
        result,
        timestamp: new Date().toISOString()
    });
    return result;
}, [isAdmin, isAuthenticated]);

// 修復後 (清潔):
const shouldShowAdminFeatures = useCallback(() => {
    return isAdmin && isAuthenticated;
}, [isAdmin, isAuthenticated]);
```

### 2. 移除定期狀態同步機制
```javascript
// 移除了這個造成過多 log 的 useEffect:
useEffect(() => {
    const syncInterval = setInterval(() => {
        if (isMountedRef.current && isAuthenticated && user) {
            const utilityStatus = adminPermissions.isCurrentUserAdmin();
            if (utilityStatus !== isAdmin) {
                console.log('useAdminPermissions: Periodic sync - updating React state:', {
                    from: isAdmin,
                    to: utilityStatus
                });
                setIsAdmin(utilityStatus);
                setLastKnownStatus(utilityStatus);
            }
        }
    }, 1000); // 每秒檢查一次 - 太頻繁了！
    
    return () => clearInterval(syncInterval);
}, [isAdmin, isAuthenticated, user]);
```

### 3. 簡化認證狀態 log
```javascript
// 修復前 (每次狀態變化都 log):
useEffect(() => {
    console.log('useAdminPermissions: Auth state changed:', {
        hasUser: !!user,
        userEmail: user?.email,
        isAuthenticated,
        authLoading,
        timestamp: new Date().toISOString()
    });
}, [user, isAuthenticated, authLoading]);

// 修復後 (只在重要變化時 log):
useEffect(() => {
    if (user && isAuthenticated && !authLoading) {
        console.log('useAdminPermissions: User authenticated:', user.email);
    } else if (!user && !isAuthenticated) {
        console.log('useAdminPermissions: User not authenticated');
    }
}, [user, isAuthenticated, authLoading]);
```

### 4. 優化 AdminPage 調試 log
```javascript
// 修復前 (每次渲染都 log):
useEffect(() => {
    console.log('AdminPage: Component state changed:', {
        isAdmin,
        adminLoading,
        shouldShowAdminFeatures: shouldShowAdminFeatures,
        timestamp: new Date().toISOString()
    });
    
    if (getDebugInfo) {
        const debugInfo = getDebugInfo();
        console.log('AdminPage: Debug info:', debugInfo);
    }
}, [isAdmin, adminLoading, getDebugInfo, shouldShowAdminFeatures]);

// 修復後 (只在狀態解析完成時 log):
useEffect(() => {
    if (!adminLoading) {
        console.log('AdminPage: Admin status resolved:', {
            isAdmin,
            shouldShowAdminFeatures: shouldShowAdminFeatures
        });
    }
}, [isAdmin, adminLoading, shouldShowAdminFeatures]);
```

### 5. 優化調試組件更新頻率
```javascript
// 修復前 (每 2 秒更新):
const interval = setInterval(updateDebugInfo, 2000);

// 修復後 (只在狀態變化時更新):
useEffect(() => {
    updateDebugInfo();
}, [isAdmin, loading, getDebugInfo]);
```

## 結果
- ✅ 大幅減少 console log 的數量
- ✅ 保留重要的狀態變化 log
- ✅ 移除不必要的定期檢查
- ✅ 提升性能（減少不必要的函數調用）
- ✅ 保持調試功能的可用性

## 現在的 Log 行為
- 只在用戶認證狀態變化時記錄
- 只在管理員狀態解析完成時記錄
- 移除了重複的狀態同步 log
- 調試組件只在實際狀態變化時更新

這樣既保持了調試功能，又避免了過多的 log 干擾。