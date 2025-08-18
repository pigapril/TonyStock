/**
 * AdminNavigation - Admin-only navigation component
 * 
 * Features:
 * - Conditionally renders admin navigation items
 * - Uses AdminOnly component for permission checking
 * - Integrates with existing navigation structure
 * - Responsive design
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import { NavLink, useParams } from 'react-router-dom';
import AdminOnly from '../AdminOnly';
import { FaCog, FaChartBar } from 'react-icons/fa';

const AdminNavigation = ({ isMobile = false, onNavigate }) => {
    const { t } = useTranslation();
    const { lang } = useParams();

    const handleNavClick = () => {
        if (onNavigate) {
            onNavigate();
        }
    };

    return (
        <AdminOnly fallback={null}>
            <li className={`sidebar-item-admin ${isMobile ? 'mobile' : 'desktop'}`}>
                <NavLink 
                    to={`/${lang}/NK-Admin`}
                    onClick={handleNavClick}
                    className={({ isActive }) => isActive ? "active-nav-link admin-nav-link" : "admin-nav-link"}
                    aria-current={({ isActive }) => isActive ? "page" : undefined}
                >
                    <div className="sidebar-item-content">
                        <FaCog />
                        <span>{t('nav.admin')}</span>
                    </div>
                    <div className="admin-badge">
                        <span>{t('nav.adminBadge')}</span>
                    </div>
                </NavLink>
            </li>
        </AdminOnly>
    );
};

export default AdminNavigation;