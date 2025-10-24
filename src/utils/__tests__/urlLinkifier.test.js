/**
 * URL 連結化工具測試
 */

import { hasUrls, linkifyText, linkify } from '../urlLinkifier';

describe('urlLinkifier', () => {
  describe('hasUrls', () => {
    test('應該檢測到 HTTP URL', () => {
      expect(hasUrls('訪問 https://example.com 了解更多')).toBe(true);
      expect(hasUrls('查看 http://test.com 的內容')).toBe(true);
    });

    test('應該檢測到 www URL', () => {
      expect(hasUrls('訪問 www.example.com 了解更多')).toBe(true);
    });

    test('應該檢測到 FTP URL', () => {
      expect(hasUrls('下載 ftp://files.example.com/file.zip')).toBe(true);
    });

    test('不應該檢測到非 URL 文字', () => {
      expect(hasUrls('這是普通文字')).toBe(false);
      expect(hasUrls('email@example.com')).toBe(false);
    });

    test('應該處理空值', () => {
      expect(hasUrls('')).toBe(false);
      expect(hasUrls(null)).toBe(false);
      expect(hasUrls(undefined)).toBe(false);
    });
  });

  describe('linkifyText', () => {
    test('應該將 HTTP URL 轉換為連結物件', () => {
      const result = linkifyText('訪問 https://example.com 了解更多');
      expect(result).toHaveLength(3);
      expect(result[0]).toBe('訪問 ');
      expect(result[1]).toMatchObject({
        type: 'link',
        href: 'https://example.com',
        text: 'https://example.com'
      });
      expect(result[2]).toBe(' 了解更多');
    });

    test('應該為 www URL 添加 https 協議', () => {
      const result = linkifyText('訪問 www.example.com');
      expect(result[1]).toMatchObject({
        type: 'link',
        href: 'https://www.example.com',
        text: 'www.example.com'
      });
    });

    test('應該縮短長 URL', () => {
      const longUrl = 'https://example.com/very/long/path/that/exceeds/the/maximum/length/limit';
      const result = linkifyText(`訪問 ${longUrl}`, { maxLength: 30 });
      expect(result[1].text).toMatch(/\.\.\.$/);
      expect(result[1].text.length).toBeLessThanOrEqual(30);
    });

    test('應該處理多個 URL', () => {
      const result = linkifyText('訪問 https://example.com 和 www.test.com');
      expect(result).toHaveLength(5);
      expect(result[1].type).toBe('link');
      expect(result[3].type).toBe('link');
    });

    test('應該處理沒有 URL 的文字', () => {
      const result = linkifyText('這是普通文字');
      expect(result).toEqual(['這是普通文字']);
    });
  });

  describe('linkify', () => {
    test('應該返回 React 元素陣列', () => {
      const result = linkify('訪問 https://example.com');
      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(3);
      
      // 檢查連結元素的屬性
      const linkElement = result[1];
      expect(linkElement.type).toBe('a');
      expect(linkElement.props.href).toBe('https://example.com');
      expect(linkElement.props.target).toBe('_blank');
      expect(linkElement.props.rel).toBe('noopener noreferrer');
    });

    test('應該使用自定義選項', () => {
      const result = linkify('訪問 https://example.com', {
        target: '_self',
        className: 'custom-link'
      });
      
      const linkElement = result[1];
      expect(linkElement.props.target).toBe('_self');
      expect(linkElement.props.className).toBe('custom-link');
    });
  });
});