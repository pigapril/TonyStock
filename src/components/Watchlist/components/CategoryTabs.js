import React from 'react';
import PropTypes from 'prop-types';
import { FaPencilAlt } from 'react-icons/fa';
import '../styles/CategoryTabs.css';
import { useTranslation } from 'react-i18next';

export const CategoryTabs = ({
    categories,
    activeTab,
    onTabChange,
    onManageCategories
}) => {
    const { t } = useTranslation();

    return (
        <div className="category-tabs">
            <button
                onClick={onManageCategories}
                className="category-tab folder-tab"
                aria-label={t('watchlist.categoryTabs.manageCategoriesAria')}
            >
                <FaPencilAlt />
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
    onManageCategories: PropTypes.func.isRequired
}; 