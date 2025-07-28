import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../Auth/useAuth'; // 更新路徑
import { Analytics } from '../../utils/analytics';
import './styles/UserProfile.css';
import { useTranslation } from 'react-i18next'; // 1. 引入 useTranslation
import csrfClient from '../../utils/csrfClient';

export const UserProfile = () => {
    const { t } = useTranslation(); // 2. 使用 hook
    const navigate = useNavigate();
    const { user, logout, loading } = useAuth();
    const [isOpen, setIsOpen] = useState(false);
    const menuRef = useRef(null);

    // 監聽登出事件，確保狀態同步
    useEffect(() => {
        const handleLogoutSuccess = () => {
            setIsOpen(false);
        };

        window.addEventListener('logoutSuccess', handleLogoutSuccess);
        return () => window.removeEventListener('logoutSuccess', handleLogoutSuccess);
    }, []);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen]);

    const handleAccountClick = () => {
        const lang = document.documentElement.lang || 'zh-TW';
        navigate(`/${lang}/user-account`);
        setIsOpen(false);
        
        Analytics.ui.navigation.click({
            destination: 'userAccount',
            source: 'userProfile'
        });
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            setIsOpen(!isOpen);
        } else if (e.key === 'Escape' && isOpen) {
            setIsOpen(false);
        }
    };

    if (!user || loading) return null;

    return (
        <div className="user-profile" ref={menuRef}>
            <button
                className="user-profile__trigger"
                onClick={() => setIsOpen(!isOpen)}
                onKeyPress={handleKeyPress}
                aria-expanded={isOpen}
                aria-haspopup="true"
                aria-label={t('userProfile.openMenuAria')}
            >
                <img 
                    src={user.avatarUrl} 
                    alt={t('userProfile.avatarAlt', { username: user.username })}
                    className="user-profile__avatar"
                />
                <span className="user-profile__name">{user.username}</span>
            </button>
            
            {isOpen && (
                <div 
                    className="user-profile__menu"
                    role="menu"
                    aria-label={t('userProfile.menuAria')}
                >
                    <div className="user-profile__info">
                        <p className="user-profile__name">{user.username}</p>
                    </div>
                    <button 
                        className="user-profile__account"
                        onClick={handleAccountClick}
                        role="menuitem"
                    >
                        <svg className="user-profile__menu-icon" width="16" height="16" viewBox="0 0 16 16" fill="none">
                            <path d="M8 8C10.2091 8 12 6.20914 12 4C12 1.79086 10.2091 0 8 0C5.79086 0 4 1.79086 4 4C4 6.20914 5.79086 8 8 8Z" fill="currentColor"/>
                            <path d="M8 10C3.58172 10 0 13.5817 0 18H16C16 13.5817 12.4183 10 8 10Z" fill="currentColor"/>
                        </svg>
                        {t('userProfile.account', 'Account')}
                    </button>
                </div>
            )}
        </div>
    );
}; 