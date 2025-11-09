import React from 'react';
import { useTranslation } from 'react-i18next';
import './ScrollToTopButton.css';

/**
 * ScrollToTopButton - 蘋果風格的回到頂端按鈕
 * 特色：動態向上移動並淡出的箭頭動畫
 */
const ScrollToTopButton = ({ show = true }) => {
  const { t } = useTranslation();

  const handleClick = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };

  if (!show) return null;

  return (
    <button
      className="scroll-to-top-button"
      onClick={handleClick}
      title={t('common.scrollToTop') || '回到頂端'}
      aria-label={t('common.scrollToTop') || '回到頂端'}
    >
      {/* 三個倒V形（Chevron），依序延遲動畫 */}
      <svg className="arrow-icon arrow-1" width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path d="M3 10L8 5L13 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
      <svg className="arrow-icon arrow-2" width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path d="M3 10L8 5L13 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
      <svg className="arrow-icon arrow-3" width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path d="M3 10L8 5L13 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    </button>
  );
};

export default ScrollToTopButton;
