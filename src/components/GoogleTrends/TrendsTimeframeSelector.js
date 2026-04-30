import React from 'react';
import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import './TrendsTimeframeSelector.css';

const OPTIONS = [
    { key: '1m', i18nKey: 'googleTrendsTimeframe.oneMonth' },
    { key: '3m', i18nKey: 'googleTrendsTimeframe.threeMonths' },
    { key: '6m', i18nKey: 'googleTrendsTimeframe.sixMonths' },
    { key: '1y', i18nKey: 'googleTrendsTimeframe.oneYear' },
];

const TrendsTimeframeSelector = ({ value, onChange, disabled = false }) => {
    const { t } = useTranslation();

    return (
        <div className="trends-timeframe-selector" role="radiogroup" aria-label={t('googleTrendsTimeframe.label')}>
            {OPTIONS.map((opt) => {
                const isActive = value === opt.key;
                return (
                    <button
                        key={opt.key}
                        type="button"
                        role="radio"
                        aria-checked={isActive}
                        disabled={disabled}
                        className={`trends-timeframe-option${isActive ? ' is-active' : ''}`}
                        onClick={() => onChange(opt.key)}
                    >
                        {t(opt.i18nKey)}
                    </button>
                );
            })}
        </div>
    );
};

TrendsTimeframeSelector.propTypes = {
    value: PropTypes.oneOf(['1m', '3m', '6m', '1y']).isRequired,
    onChange: PropTypes.func.isRequired,
    disabled: PropTypes.bool,
};

export default TrendsTimeframeSelector;
