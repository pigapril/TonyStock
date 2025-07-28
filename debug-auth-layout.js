// 專門檢查認證和佈局相關問題的調試腳本
console.log('=== Auth Layout Debug ===');

// 檢查認證狀態
console.log('Current URL:', window.location.href);
console.log('User agent:', navigator.userAgent);

// 檢查是否有認證對話框
const authDialogs = document.querySelectorAll('[class*="auth"], [class*="dialog"], [class*="modal"]');
console.log('Auth/Dialog elements:', authDialogs.length);

authDialogs.forEach((dialog, index) => {
  const rect = dialog.getBoundingClientRect();
  const styles = getComputedStyle(dialog);
  console.log(`Auth element ${index + 1}:`, {
    className: dialog.className,
    id: dialog.id,
    display: styles.display,
    position: styles.position,
    zIndex: styles.zIndex,
    width: rect.width,
    height: rect.height,
    visible: rect.width > 0 && rect.height > 0
  });
});

// 檢查頁面主要結構
const appContainer = document.querySelector('.App');
const mainContent = document.querySelector('.main-content');
const sidebar = document.querySelector('.sidebar');

console.log('Page structure:');
if (appContainer) {
  const appStyles = getComputedStyle(appContainer);
  console.log('App container:', {
    className: appContainer.className,
    width: appStyles.width,
    height: appStyles.height,
    display: appStyles.display,
    flexDirection: appStyles.flexDirection,
    overflow: appStyles.overflow
  });
}

if (mainContent) {
  const mainStyles = getComputedStyle(mainContent);
  console.log('Main content:', {
    className: mainContent.className,
    width: mainStyles.width,
    marginLeft: mainStyles.marginLeft,
    marginRight: mainStyles.marginRight,
    paddingLeft: mainStyles.paddingLeft,
    paddingRight: mainStyles.paddingRight,
    transform: mainStyles.transform
  });
}

if (sidebar) {
  const sidebarStyles = getComputedStyle(sidebar);
  console.log('Sidebar:', {
    className: sidebar.className,
    width: sidebarStyles.width,
    position: sidebarStyles.position,
    left: sidebarStyles.left,
    transform: sidebarStyles.transform,
    display: sidebarStyles.display
  });
}

// 檢查是否有 loading 狀態
const loadingElements = document.querySelectorAll('.loading-container, .spinner, [class*="loading"]');
console.log('Loading elements:', loadingElements.length);
loadingElements.forEach((loading, index) => {
  const rect = loading.getBoundingClientRect();
  console.log(`Loading element ${index + 1}:`, {
    className: loading.className,
    display: getComputedStyle(loading).display,
    width: rect.width,
    height: rect.height
  });
});

// 檢查是否有異常的白色區塊
const whiteBlocks = [];
const allDivs = document.querySelectorAll('div');
allDivs.forEach(div => {
  const styles = getComputedStyle(div);
  const rect = div.getBoundingClientRect();

  // 檢查白色背景且尺寸較大的元素
  if ((styles.backgroundColor === 'rgb(255, 255, 255)' ||
    styles.backgroundColor === 'white' ||
    styles.backgroundColor === '#ffffff' ||
    styles.backgroundColor === '#fff') &&
    rect.width > 200 && rect.height > 50) {

    whiteBlocks.push({
      className: div.className,
      id: div.id,
      width: rect.width,
      height: rect.height,
      top: rect.top,
      left: rect.left,
      right: rect.right,
      position: styles.position,
      zIndex: styles.zIndex
    });
  }
});

console.log('Large white blocks:', whiteBlocks.length);
whiteBlocks.slice(0, 5).forEach((block, index) => {
  console.log(`White block ${index + 1}:`, block);
});

// 檢查視窗大小和滾動
console.log('Viewport info:', {
  windowWidth: window.innerWidth,
  windowHeight: window.innerHeight,
  documentWidth: document.documentElement.scrollWidth,
  documentHeight: document.documentElement.scrollHeight,
  scrollX: window.scrollX,
  scrollY: window.scrollY
});

// 檢查是否有 CSS 錯誤
const stylesheets = Array.from(document.styleSheets);
console.log('Loaded stylesheets:', stylesheets.length);

console.log('=== Auth Layout Debug Complete ===');