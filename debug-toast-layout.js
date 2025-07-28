// 調試 Toast 佈局問題的腳本
// 在瀏覽器控制台中運行此腳本來檢查 Toast 相關的問題

console.log('=== Toast Layout Debug ===');

// 檢查是否有 Toast 元素存在
const toastElements = document.querySelectorAll('.toast');
console.log('Toast elements found:', toastElements.length);

toastElements.forEach((toast, index) => {
    console.log(`Toast ${index + 1}:`, {
        display: getComputedStyle(toast).display,
        position: getComputedStyle(toast).position,
        top: getComputedStyle(toast).top,
        right: getComputedStyle(toast).right,
        left: getComputedStyle(toast).left,
        zIndex: getComputedStyle(toast).zIndex,
        width: getComputedStyle(toast).width,
        height: getComputedStyle(toast).height
    });
});

// 檢查是否有其他可能影響佈局的元素
const fixedElements = document.querySelectorAll('[style*="position: fixed"], [style*="position:fixed"]');
console.log('Fixed position elements:', fixedElements.length);

fixedElements.forEach((el, index) => {
    if (!el.classList.contains('toast')) {
        console.log(`Fixed element ${index + 1}:`, {
            className: el.className,
            position: getComputedStyle(el).position,
            top: getComputedStyle(el).top,
            right: getComputedStyle(el).right,
            left: getComputedStyle(el).left,
            zIndex: getComputedStyle(el).zIndex
        });
    }
});

// 檢查頁面主要容器的樣式
const mainContainer = document.querySelector('.App') || document.querySelector('main') || document.body;
console.log('Main container styles:', {
    marginLeft: getComputedStyle(mainContainer).marginLeft,
    marginRight: getComputedStyle(mainContainer).marginRight,
    paddingLeft: getComputedStyle(mainContainer).paddingLeft,
    paddingRight: getComputedStyle(mainContainer).paddingRight,
    width: getComputedStyle(mainContainer).width,
    maxWidth: getComputedStyle(mainContainer).maxWidth
});

// 檢查是否有白色長條區塊
const suspiciousElements = document.querySelectorAll('[style*="background: white"], [style*="background-color: white"], [style*="background:#fff"], [style*="background-color:#fff"]');
console.log('White background elements:', suspiciousElements.length);

suspiciousElements.forEach((el, index) => {
    const rect = el.getBoundingClientRect();
    if (rect.width > 100 && rect.height > 20) { // 過濾掉小元素
        console.log(`White element ${index + 1}:`, {
            className: el.className,
            position: getComputedStyle(el).position,
            top: rect.top,
            right: rect.right,
            width: rect.width,
            height: rect.height,
            zIndex: getComputedStyle(el).zIndex
        });
    }
});

console.log('=== Debug Complete ===');