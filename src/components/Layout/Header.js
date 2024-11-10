import React from 'react';
import { useAuth } from '../../hooks/useAuth';
import SignInButton from '../Auth/SignInButton';
import UserProfile from '../Auth/UserProfile';
import './Header.css';

const Header = () => {
    const { user, loading } = useAuth();

    return (
        <header className="header">
            <div className="logo">Stock Analysis Platform</div>
            <div className="auth-section">
                {loading ? (
                    <div className="loading-spinner" />
                ) : user ? (
                    <UserProfile />
                ) : (
                    <>
                        <SignInButton />
                        <button className="register-button">Register</button>
                    </>
                )}
            </div>
        </header>
    );
};

export default Header; 