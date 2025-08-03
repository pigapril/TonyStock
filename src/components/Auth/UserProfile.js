import React from 'react';
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
                <img 
                    src={user.avatarUrl} 
                    alt={t('userProfile.avatarAlt', { username: user.username })}
                    className="user-profile__avatar"
                />
                <span className="user-profile__name">{user.username}</span>
            </button>
        </div>
    );
}; 