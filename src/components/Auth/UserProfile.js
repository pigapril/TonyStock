import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { Analytics } from '../../utils/analytics';
import authService from '../../services/auth.service';
import './styles/UserProfile.css';

export const UserProfile = () => {
    const { user, logout, loading } = useAuth();
    const [isOpen, setIsOpen] = useState(false);
    const menuRef = useRef(null);

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
                aria-label="開啟使用者選單"
            >
                <img 
                    src={user.avatarUrl} 
                    alt={`${user.username} 的頭像`}
                    className="user-profile__avatar"
                />
                <span className="user-profile__name">{user.username}</span>
            </button>
            
            {isOpen && (
                <div 
                    className="user-profile__menu"
                    role="menu"
                    aria-label="使用者選單"
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
                        登出
                    </button>
                </div>
            )}
        </div>
    );
}; 