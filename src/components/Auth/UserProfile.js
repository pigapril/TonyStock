import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../Auth/useAuth'; // 更新路徑
import { Analytics } from '../../utils/analytics';
import './styles/UserProfile.css';
import { useTranslation } from 'react-i18next'; // 1. 引入 useTranslation
import csrfClient from '../../utils/csrfClient';

export const UserProfile = () => {
    const { t } = useTranslation(); // 2. 使用 hook
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

    const handleLogout = async () => {
        try {
            await logout();
            csrfClient.clearCSRFToken(); // 登出時同步清除CSRF token
            setIsOpen(false);
        } catch (error) {
            Analytics.error({
                type: 'AUTH_ERROR',
                code: error.code || 500,
                message: error.message
            });
        }
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
                        <p className="user-profile__email">{user.email}</p>
                    </div>
                    <button 
                        className="user-profile__logout"
                        onClick={handleLogout}
                        role="menuitem"
                    >
                        {t('userProfile.logout')}
                    </button>
                </div>
            )}
        </div>
    );
}; 