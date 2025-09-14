// 動態處理 robots.txt 的工具函數
export const setupRobotsProtection = () => {
  // 檢查是否為 staging 環境 (針對你的具體環境)
  const hostname = window.location.hostname;
  
  // 明確定義正式環境域名
  const isProduction = hostname === 'sentimentinsideout.com' || 
                      hostname === 'www.sentimentinsideout.com';
  
  // 明確定義 staging 環境域名
  const isStaging = 
    hostname === 'sentimentinsideout-staging.netlify.app' ||  // 你的 staging 環境
    hostname.includes('deploy-preview') ||                    // Netlify PR 預覽
    hostname.includes('branch-deploy') ||                     // Netlify 分支部署
    (hostname.endsWith('.netlify.app') && !isProduction) ||   // 其他 Netlify 子域名
    process.env.REACT_APP_ENVIRONMENT === 'staging' ||
    process.env.NODE_ENV === 'development';

  if (isStaging && !isProduction) {
    // 動態添加 meta robots tag
    const existingMeta = document.querySelector('meta[name="robots"]');
    if (existingMeta) {
      existingMeta.remove();
    }
    
    const metaRobots = document.createElement('meta');
    metaRobots.name = 'robots';
    metaRobots.content = 'noindex, nofollow, noarchive, nosnippet';
    document.head.appendChild(metaRobots);
    
    // 添加視覺提示
    const originalTitle = document.title.replace('[STAGING] ', '');
    document.title = `[STAGING] ${originalTitle}`;
    
    // 添加視覺邊框提示 (可選)
    if (process.env.NODE_ENV === 'development') {
      document.body.style.border = '3px solid orange';
      document.body.style.boxSizing = 'border-box';
    }
    
    // 在 console 中提醒
    console.warn('🚧 STAGING ENVIRONMENT - Search engines blocked');
    console.info(`Current hostname: ${hostname}`);
    
    return true;
  }
  
  return false;
};

// 檢查並重定向 robots.txt
export const handleRobotsRequest = () => {
  const hostname = window.location.hostname;
  const isStaging = hostname === 'sentimentinsideout-staging.netlify.app' || 
                   hostname.includes('deploy-preview') ||
                   hostname.includes('branch-deploy');
  
  if (isStaging) {
    // 如果有人直接訪問 /robots.txt，可以用 JavaScript 重定向
    if (window.location.pathname === '/robots.txt') {
      window.location.href = '/robots-staging.txt';
    }
  }
};