import React, { useState } from 'react';
import { useAuth } from '../Auth/useAuth'; // 更新路徑
import { useNavigate, useParams } from 'react-router-dom';
import { Analytics } from '../../utils/analytics';
import './styles/UserProfile.css';
import { useTranslation } from 'react-i18next'; // 1. 引入 useTranslation

export const UserProfile = () => {
    const { t } = useTranslation(); // 2. 使用 hook
    const { user, loading } = useAuth();
    const navigate = useNavigate();
    const { lang } = useParams();
    const [imageError, setImageError] = useState(false);

    const handleProfileClick = () => {
        navigate(`/${lang}/user-account`);
        
        Analytics.track('user_profile_clicked_direct_navigation', {
            userId: user?.id
        });
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            handleProfileClick();
        }
    };

    const handleImageError = () => {
        console.warn('Profile avatar failed to load:', user?.avatarUrl);
        setImageError(true);
    };

    const handleImageLoad = () => {
        setImageError(false);
    };

    // 生成預設頭像（使用用戶名首字母）
    const getDefaultAvatar = () => {
        const initial = user?.username?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || '?';
        return (
            <div className="user-profile__avatar user-profile__avatar--default">
                {initial}
            </div>
        );
    };

    if (!user || loading) return null;

    return (
        <div className="user-profile">
            <button
                className="user-profile__trigger"
                onClick={handleProfileClick}
                onKeyPress={handleKeyPress}
                aria-label={t('userProfile.goToAccountAria')}
                title={t('subscription.userAccount.viewAccount')}
            >
                {!imageError && user.avatarUrl ? (
                    <img 
                        src={user.avatarUrl} 
                        alt={t('userProfile.avatarAlt', { username: user.username })}
                        className="user-profile__avatar"
                        onError={handleImageError}
                        onLoad={handleImageLoad}
                    />
                ) : (
                    getDefaultAvatar()
                )}
                <span className="user-profile__name">{user.username}</span>
            </button>
        </div>
    );
}; 