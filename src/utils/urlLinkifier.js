/**
 * URL 連結化工具
 * 自動檢測文字中的 URL 並轉換為可點擊的連結
 */

/**
 * URL 正則表達式 - 支援 http/https/ftp 協議和常見的網址格式
 */
const URL_REGEX = /(https?:\/\/[^\s<>"{}|\\^`[\]]+|ftp:\/\/[^\s<>"{}|\\^`[\]]+|www\.[^\s<>"{}|\\^`[\]]+\.[a-z]{2,})/gi;

/**
 * 檢測文字中是否包含 URL
 * @param {string} text - 要檢測的文字
 * @returns {boolean} 是否包含 URL
 */
export const hasUrls = (text) => {
  if (!text || typeof text !== 'string') return false;
  return URL_REGEX.test(text);
};

/**
 * 將文字中的 URL 轉換為可點擊的連結
 * @param {string} text - 包含 URL 的文字
 * @param {Object} options - 配置選項
 * @param {string} options.target - 連結目標 (預設: '_blank')
 * @param {string} options.rel - 連結關係 (預設: 'noopener noreferrer')
 * @param {string} options.className - CSS 類名
 * @param {number} options.maxLength - URL 顯示的最大長度 (預設: 50)
 * @returns {Array} React 元素陣列
 */
export const linkifyText = (text, options = {}) => {
  const {
    target = '_blank',
    rel = 'noopener noreferrer',
    className = 'announcement-link',
    maxLength = 50
  } = options;

  if (!text || typeof text !== 'string') {
    return [text];
  }

  // 重置正則表達式的 lastIndex
  URL_REGEX.lastIndex = 0;

  const parts = [];
  let lastIndex = 0;
  let match;

  while ((match = URL_REGEX.exec(text)) !== null) {
    const url = match[0];
    const startIndex = match.index;

    // 添加 URL 前的文字
    if (startIndex > lastIndex) {
      parts.push(text.slice(lastIndex, startIndex));
    }

    // 處理 URL
    let href = url;
    let displayText = url;

    // 如果 URL 不包含協議，添加 https://
    if (!url.match(/^https?:\/\//i) && !url.match(/^ftp:\/\//i)) {
      href = `https://${url}`;
    }

    // 縮短顯示文字
    if (displayText.length > maxLength) {
      displayText = displayText.substring(0, maxLength - 3) + '...';
    }

    // 創建連結元素
    parts.push({
      type: 'link',
      href,
      text: displayText,
      target,
      rel,
      className,
      key: `link-${startIndex}`
    });

    lastIndex = URL_REGEX.lastIndex;
  }

  // 添加最後一部分文字
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts;
};

/**
 * 將連結化的文字轉換為 React 元素
 * @param {Array} parts - linkifyText 的返回值
 * @returns {Array} React 元素陣列
 */
export const renderLinkifiedText = (parts) => {
  return parts.map((part, index) => {
    if (typeof part === 'string') {
      return part;
    }

    if (part.type === 'link') {
      return (
        <a
          key={part.key || `link-${index}`}
          href={part.href}
          target={part.target}
          rel={part.rel}
          className={part.className}
          title={part.href}
        >
          {part.text}
        </a>
      );
    }

    return part;
  });
};

/**
 * 一步到位的連結化函數 - 直接返回 React 元素
 * @param {string} text - 要處理的文字
 * @param {Object} options - 配置選項
 * @returns {Array} React 元素陣列
 */
export const linkify = (text, options = {}) => {
  const parts = linkifyText(text, options);
  return renderLinkifiedText(parts);
};

export default {
  hasUrls,
  linkifyText,
  renderLinkifiedText,
  linkify
};