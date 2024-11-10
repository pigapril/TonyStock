import React, { useState, useRef } from 'react';
import { useAuth } from '../../hooks/useAuth';
import './UserProfile.css';

const UserProfile = () => {
    const { user, logout } = useAuth();
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const menuRef = useRef(null);

    const handleLogout = async () => {
        try {
            await logout();
            setIsMenuOpen(false);
        } catch (error) {
            console.error('Logout failed:', error);
        }
    };

    return (
        <div className="user-profile">
            <button 
                className="profile-button"
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                aria-label="用戶選單"
            >
                <img 
                    src={user.avatarUrl} 
                    alt="用戶頭像" 
                    className="avatar"
                />
            </button>
            
            {isMenuOpen && (
                <div className="profile-menu" ref={menuRef}>
                    <div className="menu-header">
                        <img src={user.avatarUrl} alt="用戶頭像" />
                        <div className="user-info">
                            <span className="username">{user.username}</span>
                            <span className="email">{user.email}</span>
                        </div>
                    </div>
                    <div className="menu-items">
                        <button onClick={handleLogout}>登出</button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default UserProfile; 