import React from 'react';
import PropTypes from 'prop-types';
import { FaFolder, FaLock } from 'react-icons/fa';
import '../styles/CategoryTabs.css';
import { useTranslation } from 'react-i18next';

export const CategoryTabs = ({
    categories,
    activeTab,
    onTabChange,
    onManageCategories,
    manageLocked = false
}) => {
    const { t } = useTranslation();

    return (
        <div className="category-tabs">
            <button
                onClick={onManageCategories}
                className="category-tab folder-tab"
                aria-label={t('watchlist.categoryTabs.manageCategoriesAria')}
                title={manageLocked ? t('watchlist.upgradeRequired') : t('watchlist.categoryTabs.manageCategoriesAria')}
                data-locked={manageLocked ? 'true' : undefined}
                data-testid="manage-categories-button"
            >
                <FaFolder />
                {manageLocked ? <FaLock className="category-tab__lock" aria-hidden="true" /> : null}
            </button>
            {categories.map((category) => (
                <button
                    key={category.id}
                    className={`category-tab ${activeTab === category.id ? 'active' : ''}`}
                    onClick={() => onTabChange(category.id)}
                >
                    {category.name}
                </button>
            ))}
        </div>
    );
};

CategoryTabs.propTypes = {
    categories: PropTypes.arrayOf(
        PropTypes.shape({
            id: PropTypes.string.isRequired,
            name: PropTypes.string.isRequired
        })
    ).isRequired,
    activeTab: PropTypes.string,
    onTabChange: PropTypes.func.isRequired,
    onManageCategories: PropTypes.func.isRequired,
    manageLocked: PropTypes.bool
}; 
