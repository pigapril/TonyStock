// 深度分析佈局問題的調試腳本
console.log('=== Layout Analysis Debug ===');

// 檢查 ProtectedRoute 相關的問題
const protectedRoutes = document.querySelectorAll('[data-testid*="protected"], .protected-route');
console.log('Protected route elements:', protectedRoutes.length);

// 檢查是否有認證相關的對話框或遮罩
const dialogs = document.querySelectorAll('[role="dialog"], .dialog, .modal');
console.log('Dialog elements found:', dialogs.length);
dialogs.forEach((dialog, index) => {
    const rect = dialog.getBoundingClientRect();
    console.log(`Dialog ${index + 1}:`, {
        className: dialog.className,
        display: getComputedStyle(dialog).display,
        position: getComputedStyle(dialog).position,
        width: rect.width,
        height: rect.height,
        zIndex: getComputedStyle(dialog).zIndex
    });
});

// 檢查側邊欄狀態
const sidebar = document.querySelector('.sidebar');
const app = document.querySelector('.App');
if (sidebar && app) {
    console.log('Sidebar state:', {
        sidebarClass: sidebar.className,
        appClass: app.className,
        sidebarWidth: getComputedStyle(sidebar).width,
        sidebarDisplay: getComputedStyle(sidebar).display,
        sidebarPosition: getComputedStyle(sidebar).position
    });
}

// 檢查主內容區域
const mainContent = document.querySelector('.main-content') || document.querySelector('main');
if (mainContent) {
    console.log('Main content styles:', {
        marginLeft: getComputedStyle(mainContent).marginLeft,
        marginRight: getComputedStyle(mainContent).marginRight,
        paddingLeft: getComputedStyle(mainContent).paddingLeft,
        paddingRight: getComputedStyle(mainContent).paddingRight,
        width: getComputedStyle(mainContent).width,
        transform: getComputedStyle(mainContent).transform
    });
}

// 檢查是否有異常的 CSS 變換或定位
const transformedElements = [];
const allElements = document.querySelectorAll('*');
allElements.forEach(el => {
    const transform = getComputedStyle(el).transform;
    const position = getComputedStyle(el).position;
    if (transform !== 'none' || position === 'absolute' || position === 'fixed') {
        const rect = el.getBoundingClientRect();
        if (rect.width > 50 && rect.height > 20) { // 過濾小元素
            transformedElements.push({
                element: el,
                className: el.className,
                transform: transform,
                position: position,
                left: getComputedStyle(el).left,
                right: getComputedStyle(el).right,
                top: getComputedStyle(el).top,
                width: rect.width,
                height: rect.height
            });
        }
    }
});

console.log('Elements with transforms or special positioning:', transformedElements.length);
transformedElements.slice(0, 10).forEach((item, index) => {
    console.log(`Transformed element ${index + 1}:`, item);
});

// 檢查 CSS Grid 或 Flexbox 佈局問題
const flexContainers = document.querySelectorAll('[style*="display: flex"], [style*="display:flex"]');
const gridContainers = document.querySelectorAll('[style*="display: grid"], [style*="display:grid"]');
console.log('Flex containers:', flexContainers.length);
console.log('Grid containers:', gridContainers.length);

// 檢查是否有 overflow 問題
const overflowElements = [];
allElements.forEach(el => {
    const overflow = getComputedStyle(el).overflow;
    const overflowX = getComputedStyle(el).overflowX;
    const overflowY = getComputedStyle(el).overflowY;
    if (overflow === 'hidden' || overflowX === 'hidden' || overflowY === 'hidden') {
        const rect = el.getBoundingClientRect();
        if (rect.width > 100) {
            overflowElements.push({
                className: el.className,
                overflow: overflow,
                overflowX: overflowX,
                overflowY: overflowY,
                width: rect.width,
                height: rect.height
            });
        }
    }
});

console.log('Elements with overflow hidden:', overflowElements.length);
overflowElements.slice(0, 5).forEach((item, index) => {
    console.log(`Overflow element ${index + 1}:`, item);
});

console.log('=== Analysis Complete ===');