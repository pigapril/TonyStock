/**
 * Auth Status Indicator
 * 智能顯示認證狀態，避免登入按鈕到用戶資料的突然切換
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from './useAuth';
import { UserProfile } from './UserProfile';
import { useDialog } from '../Common/Dialog/useDialog';
import { useTranslation } from 'react-i18next';
import authPreloader from '../../utils/authPreloader';

export function AuthStatusIndicator() {
    const { t } = useTranslation();
    const { user, loading } = useAuth();
    const { openDialog } = useDialog();
    const [showSkeleton, setShowSkeleton] = useState(true);
    const [preloadState, setPreloadState] = useState(null);

    // 監聽預載入狀態
    useEffect(() => {
        const checkPreloadState = () => {
            const state = authPreloader.getPreloadedState();
            setPreloadState(state);
            
            // 如果有預載入狀態且信心度高，立即隱藏骨架屏
            if (state && state.confidence === 'high') {
                setShowSkeleton(false);
            }
        };

        // 立即檢查
        checkPreloadState();

        // 定期檢查預載入狀態
        const interval = setInterval(checkPreloadState, 100);

        // 最多顯示骨架屏 2 秒
        const timeout = setTimeout(() => {
            setShowSkeleton(false);
        }, 2000);

        return () => {
            clearInterval(interval);
            clearTimeout(timeout);
        };
    }, []);

    // 當認證狀態確定後隱藏骨架屏
    useEffect(() => {
        if (!loading) {
            setShowSkeleton(false);
        }
    }, [loading]);

    // 如果正在載入且應該顯示骨架屏
    if (showSkeleton && loading) {
        return <AuthSkeleton />;
    }

    // 如果有用戶，顯示用戶資料
    if (user) {
        return <UserProfile />;
    }

    // 如果沒有用戶，顯示登入按鈕
    return (
        <button 
            className="btn-primary" 
            onClick={() => openDialog('auth')}
        >
            {t('userActions.login')}
        </button>
    );
}

/**
 * 認證狀態骨架屏組件
 */
function AuthSkeleton() {
    return (
        <div className="auth-skeleton">
            <div className="skeleton-avatar"></div>
            <div className="skeleton-text"></div>
            <style jsx="true">{`
                .auth-skeleton {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    padding: 8px 16px;
                    border-radius: 6px;
                    background: rgba(0, 0, 0, 0.05);
                }
                
                .skeleton-avatar {
                    width: 32px;
                    height: 32px;
                    border-radius: 50%;
                    background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
                    background-size: 200% 100%;
                    animation: loading 1.5s infinite;
                }
                
                .skeleton-text {
                    width: 80px;
                    height: 16px;
                    border-radius: 4px;
                    background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
                    background-size: 200% 100%;
                    animation: loading 1.5s infinite;
                }
                
                @keyframes loading {
                    0% {
                        background-position: 200% 0;
                    }
                    100% {
                        background-position: -200% 0;
                    }
                }
                
                @media (max-width: 768px) {
                    .auth-skeleton {
                        padding: 6px 12px;
                    }
                    
                    .skeleton-avatar {
                        width: 28px;
                        height: 28px;
                    }
                    
                    .skeleton-text {
                        width: 60px;
                        height: 14px;
                    }
                }
            `}</style>
        </div>
    );
}