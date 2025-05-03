import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { FaGlobe } from 'react-icons/fa'; // 引入地球圖示
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import './LanguageSwitcher.css'; // 引入樣式

const LanguageSwitcher = () => {
  const { t, i18n } = useTranslation();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null); // Ref for detecting clicks outside
  const navigate = useNavigate();
  const location = useLocation();
  const { lang: currentLang } = useParams(); // 從 URL 獲取當前語言

  const changeLanguage = (newLang) => {
    if (newLang === currentLang) {
      setDropdownOpen(false); // 如果相同，只關閉下拉選單
      return;
    }

    const pathWithoutLang = location.pathname.replace(/^\/[^/]+/, '');
    const basePath = pathWithoutLang || '/';
    const newPath = `/${newLang}${basePath}${location.search}${location.hash}`;

    navigate(newPath);
    setDropdownOpen(false); // 關閉下拉選單
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
            disabled={currentLang === 'zh-TW'}
          >
            {t('language.zhTW')}
          </button>
          <button
            onClick={() => changeLanguage('en')}
            disabled={currentLang === 'en'}
          >
            {t('language.en')}
          </button>
        </div>
      )}
    </div>
  );
};

export default LanguageSwitcher; 