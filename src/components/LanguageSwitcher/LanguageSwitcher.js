import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { FaGlobe } from 'react-icons/fa'; // 引入地球圖示
import './LanguageSwitcher.css'; // 引入樣式

const LanguageSwitcher = () => {
  const { t, i18n } = useTranslation();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null); // Ref for detecting clicks outside

  const changeLanguage = (lng) => {
    i18n.changeLanguage(lng);
    setDropdownOpen(false); // Close dropdown after selection
  };

  // Close dropdown if clicked outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    }
    // Bind the event listener
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      // Unbind the event listener on clean up
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [dropdownRef]);


  return (
    <div className="language-switcher" ref={dropdownRef}>
      <button
        className="language-switcher-button"
        onClick={() => setDropdownOpen(!dropdownOpen)}
        aria-label={t('language.change')} // Accessibility
      >
        <FaGlobe />
      </button>
      {dropdownOpen && (
        <div className="language-dropdown">
          <button
            onClick={() => changeLanguage('zh-TW')}
            disabled={i18n.language === 'zh-TW'}
          >
            {t('language.zhTW')}
          </button>
          <button
            onClick={() => changeLanguage('en')}
            disabled={i18n.language === 'en'}
          >
            {t('language.en')}
          </button>
        </div>
      )}
    </div>
  );
};

export default LanguageSwitcher; 