/**
 * Redemption Text Formatting Utilities
 * Provides dynamic text formatting with parameter support, currency formatting,
 * date formatting, and pluralization for different locales
 */

// Import date-fns dynamically to avoid Jest issues
let format, formatDistanceToNow, parseISO, zhTW, zhCN, enUS, ko;

try {
    const dateFns = require('date-fns');
    format = dateFns.format;
    formatDistanceToNow = dateFns.formatDistanceToNow;
    parseISO = dateFns.parseISO;
    
    // Verify functions are properly imported
    if (typeof parseISO !== 'function') {
        console.warn('parseISO not properly imported from date-fns, using fallback');
        parseISO = (dateStr) => new Date(dateStr);
    }
    
    // Try to import locales
    try {
        const zhTWModule = require('date-fns/locale/zh-TW');
        const zhCNModule = require('date-fns/locale/zh-CN');
        const enUSModule = require('date-fns/locale/en-US');
        const koModule = require('date-fns/locale/ko');
        // date-fns v3/v4 expose locale modules as named exports (zhTW,
        // zhCN, enUS), while older versions exposed the locale directly.
        zhTW = zhTWModule.zhTW || zhTWModule.default || zhTWModule;
        zhCN = zhCNModule.zhCN || zhCNModule.default || zhCNModule;
        enUS = enUSModule.enUS || enUSModule.default || enUSModule;
        ko = koModule.ko || koModule.default || koModule;
    } catch (e) {
        console.warn('date-fns locales not available, using fallback');
        zhTW = null;
        zhCN = null;
        enUS = null;
        ko = null;
    }
} catch (e) {
    console.warn('date-fns not available, using fallback functions');
    // Fallback functions for testing environment or when date-fns is not available
    format = (date, formatStr) => {
        if (!date || isNaN(date.getTime())) return 'Invalid Date';
        return date.toLocaleDateString();
    };
    formatDistanceToNow = (date) => {
        if (!date || isNaN(date.getTime())) return 'Invalid Date';
        return 'some time ago';
    };
    parseISO = (dateStr) => {
        try {
            return new Date(dateStr);
        } catch (error) {
            console.error('Error parsing date string:', dateStr, error);
            return new Date(); // Return current date as fallback
        }
    };
    zhTW = null;
    zhCN = null;
    enUS = null;
}

/**
 * Locale configuration for formatting
 */
const LOCALE_CONFIG = {
    'zh-TW': {
        dateFnsLocale: zhTW,
        currency: {
            TWD: { symbol: 'NT$', position: 'before' },
            USD: { symbol: '$', position: 'before' }
        },
        numberFormat: {
            decimal: '.',
            thousands: ','
        }
    },
    'zh-CN': {
        dateFnsLocale: zhCN,
        currency: {
            TWD: { symbol: 'NT$', position: 'before' },
            USD: { symbol: '$', position: 'before' }
        },
        numberFormat: {
            decimal: '.',
            thousands: ','
        }
    },
    'en': {
        dateFnsLocale: enUS,
        currency: {
            TWD: { symbol: 'NT$', position: 'before' },
            USD: { symbol: '$', position: 'before' }
        },
        numberFormat: {
            decimal: '.',
            thousands: ','
        }
    },
    'ko-KR': {
        dateFnsLocale: ko,
        currency: {
            TWD: { symbol: 'NT$', position: 'before' },
            USD: { symbol: '$', position: 'before' }
        },
        numberFormat: {
            decimal: '.',
            thousands: ','
        }
    }
};

/**
 * Get current locale from i18n or default to 'en'
 */
const getCurrentLocale = () => {
    // Try to get from i18n if available
    if (typeof window !== 'undefined' && window.i18n) {
        const lang = window.i18n.language || 'en';
        // Normalize language codes
        if (lang === 'zh-CN' || lang.toLowerCase().startsWith('zh-hans')) {
            return 'zh-CN';
        }
        if (lang === 'zh-TW' || lang === 'zh') {
            return 'zh-TW';
        }
        if (/^ko(?:-|$)/i.test(lang)) {
            return 'ko-KR';
        }
        return lang;
    }
    
    // Try to get from localStorage
    if (typeof localStorage !== 'undefined') {
        const lang = localStorage.getItem('i18nextLng') || 'en';
        // Normalize language codes
        if (lang === 'zh-CN' || lang.toLowerCase().startsWith('zh-hans')) {
            return 'zh-CN';
        }
        if (lang === 'zh-TW' || lang === 'zh') {
            return 'zh-TW';
        }
        if (/^ko(?:-|$)/i.test(lang)) {
            return 'ko-KR';
        }
        return lang;
    }
    
    return 'en';
};

/**
 * Format currency amount with proper locale formatting
 * @param {number} amount - The amount to format
 * @param {string} currency - Currency code (TWD, USD)
 * @param {string} locale - Locale code
 * @returns {string} Formatted currency string
 */
export const formatCurrency = (amount, currency = 'TWD', locale = null) => {
    // 檢查 amount 是否為有效數值
    if (amount === null || amount === undefined || isNaN(amount)) {
        console.warn('formatCurrency: Invalid amount provided:', amount);
        return '0';
    }
    
    const currentLocale = locale || getCurrentLocale();
    const config = LOCALE_CONFIG[currentLocale] || LOCALE_CONFIG['en'];
    const currencyConfig = config.currency[currency] || config.currency['TWD'];
    
    // Format number with thousands separator
    const formattedAmount = new Intl.NumberFormat(['zh-TW', 'zh-CN', 'ko-KR'].includes(currentLocale) ? currentLocale : 'en-US', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2
    }).format(Number(amount));
    
    // Position symbol
    if (currencyConfig.position === 'before') {
        return `${currencyConfig.symbol}${formattedAmount}`;
    } else {
        return `${formattedAmount} ${currencyConfig.symbol}`;
    }
};

/**
 * Format date with locale-specific formatting
 * @param {Date|string} date - Date to format
 * @param {string} formatString - Format string (default: 'PPP')
 * @param {string} locale - Locale code
 * @returns {string} Formatted date string
 */
export const formatDate = (date, formatString = 'PPP', locale = null) => {
    const currentLocale = locale || getCurrentLocale();
    const config = LOCALE_CONFIG[currentLocale] || LOCALE_CONFIG['en'];
    
    // Safe date parsing with fallback
    let dateObj;
    if (typeof date === 'string') {
        if (parseISO && typeof parseISO === 'function') {
            dateObj = parseISO(date);
        } else {
            // Fallback: use native Date constructor
            dateObj = new Date(date);
        }
    } else {
        dateObj = date;
    }
    
    // Validate the date object
    if (!dateObj || isNaN(dateObj.getTime())) {
        console.error('Invalid date provided to formatDate:', date);
        return 'Invalid Date';
    }
    
    if (format && typeof format === 'function' && config.dateFnsLocale) {
        try {
            return format(dateObj, formatString, {
                locale: config.dateFnsLocale
            });
        } catch (error) {
            console.error('Error formatting date with date-fns:', error);
            // Fall through to native formatting
        }
    }
    
    // Fallback formatting using native methods
    const localeCode = ['zh-TW', 'zh-CN', 'ko-KR'].includes(currentLocale) ? currentLocale : 'en-US';
    return dateObj.toLocaleDateString(localeCode, {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
};

/**
 * Format relative time (e.g., "2 hours ago", "in 3 days")
 * @param {Date|string} date - Date to format
 * @param {string} locale - Locale code
 * @returns {string} Formatted relative time string
 */
export const formatRelativeTime = (date, locale = null) => {
    const currentLocale = locale || getCurrentLocale();
    const config = LOCALE_CONFIG[currentLocale] || LOCALE_CONFIG['en'];
    
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    
    if (formatDistanceToNow && config.dateFnsLocale) {
        return formatDistanceToNow(dateObj, {
            addSuffix: true,
            locale: config.dateFnsLocale
        });
    } else {
        // Fallback relative time formatting
        const now = new Date();
        const diffMs = now - dateObj;
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        
        if (currentLocale === 'zh-CN') {
            return diffHours > 0 ? `${diffHours} 小时前` : '刚刚';
        }
        if (currentLocale === 'zh-TW') {
            return diffHours > 0 ? `${diffHours} 小時前` : '剛剛';
        }
        if (currentLocale === 'ko-KR') {
            const diffDays = Math.floor(diffHours / 24);
            const diffMinutes = Math.floor(diffMs / (1000 * 60));
            if (diffDays > 0) return `${diffDays}일 전`;
            if (diffHours > 0) return `${diffHours}시간 전`;
            if (diffMinutes > 0) return `${diffMinutes}분 전`;
            return '방금';
        } else {
            return diffHours > 0 ? `${diffHours} hours ago` : 'just now';
        }
    }
};

/**
 * Get pluralized time unit based on duration and locale
 * @param {number} duration - Duration amount
 * @param {string} unit - Time unit (day, month, year)
 * @param {string} locale - Locale code
 * @returns {string} Pluralized unit string
 */
export const getPluralizedTimeUnit = (duration, unit, locale = null) => {
    const currentLocale = locale || getCurrentLocale();
    
    if (currentLocale === 'zh-TW' || currentLocale === 'zh-CN') {
        // Chinese doesn't have plural forms
        const unitMap = {
            'day': '天',
            'month': currentLocale === 'zh-CN' ? '个月' : '個月',
            'year': '年'
        };
        return unitMap[unit] || unit;
    } else {
        if (currentLocale === 'ko-KR') {
            const unitMap = { day: '일', month: '개월', year: '년' };
            return unitMap[unit] || unit;
        }
        // English pluralization
        if (duration === 1) {
            return unit;
        } else {
            const pluralMap = {
                'day': 'days',
                'month': 'months',
                'year': 'years'
            };
            return pluralMap[unit] || `${unit}s`;
        }
    }
};

/**
 * Format time extension description with proper pluralization
 * @param {number} duration - Extension duration
 * @param {string} unit - Time unit
 * @param {string} locale - Locale code
 * @returns {string} Formatted extension description
 */
export const formatTimeExtension = (duration, unit, locale = null) => {
    const currentLocale = locale || getCurrentLocale();
    const pluralizedUnit = getPluralizedTimeUnit(duration, unit, currentLocale);
    
    if (currentLocale === 'zh-TW') {
        return `延長 ${duration} ${pluralizedUnit}`;
    } else if (currentLocale === 'zh-CN') {
        return `延长 ${duration} ${pluralizedUnit}`;
    } else if (currentLocale === 'ko-KR') {
        return `구독 기간 ${duration}${pluralizedUnit} 연장`;
    } else {
        return `Extend ${duration} ${pluralizedUnit}`;
    }
};

/**
 * Format discount description with proper currency and percentage formatting
 * @param {object} discount - Discount configuration
 * @param {string} locale - Locale code
 * @returns {string} Formatted discount description
 */
export const formatDiscountDescription = (discount, locale = null) => {
    const currentLocale = locale || getCurrentLocale();
    
    // 支援多種折扣類型名稱
    const isPercentageDiscount = discount.discountType === 'percentage' || 
                                discount.discountType === 'PERCENTAGE_DISCOUNT';
    const isFixedDiscount = discount.discountType === 'fixed' || 
                           discount.discountType === 'FIXED_AMOUNT_DISCOUNT';
    
    if (isPercentageDiscount) {
        const percentage = discount.percentage || discount.savingsPercentage;
        if (currentLocale === 'zh-TW' || currentLocale === 'zh-CN') {
            return `${percentage}% 折扣`;
        } else if (currentLocale === 'ko-KR') {
            return `${percentage}% 할인`;
        } else {
            return `${percentage}% discount`;
        }
    } else if (isFixedDiscount) {
        const amount = discount.amount || discount.estimatedValue || discount.discountAmount;
        const formattedAmount = formatCurrency(amount, discount.currency, currentLocale);
        if (currentLocale === 'zh-TW' || currentLocale === 'zh-CN') {
            return `${formattedAmount} 折扣`;
        } else if (currentLocale === 'ko-KR') {
            return `${formattedAmount} 할인`;
        } else {
            return `${formattedAmount} discount`;
        }
    }
    
    return '';
};

/**
 * Format benefit description with dynamic parameters
 * @param {object} benefit - Benefit configuration
 * @param {string} locale - Locale code
 * @returns {object} Formatted benefit with title and description
 */
export const formatBenefitDescription = (benefit, locale = null) => {
    const currentLocale = locale || getCurrentLocale();
    
    switch (benefit.type) {
        case 'discount':
            // 支援多種金額字段名稱：estimatedValue, discountAmount, amount
            const discountAmount = benefit.estimatedValue || benefit.discountAmount || benefit.amount;
            const discountPercentage = benefit.savingsPercentage || benefit.percentage;

            const discountTitle = {
                'zh-TW': '折扣優惠',
                'zh-CN': '折扣优惠',
                'ko-KR': '할인 적용'
            }[currentLocale] || 'Discount Applied';
            
            return {
                title: discountTitle,
                description: formatDiscountDescription({
                    ...benefit,
                    amount: discountAmount,
                    percentage: discountPercentage
                }, currentLocale),
                icon: '💰',
                highlight: (benefit.discountType === 'percentage' || benefit.discountType === 'PERCENTAGE_DISCOUNT') ? 
                    `${discountPercentage}%` : 
                    formatCurrency(discountAmount, benefit.currency, currentLocale)
            };
            
        case 'extension':
            const extensionTitle = currentLocale === 'zh-TW'
                ? '訂閱延長'
                : currentLocale === 'zh-CN'
                    ? '订阅延期'
                    : currentLocale === 'ko-KR' ? '구독 기간 연장' : 'Subscription Extended';
            return {
                title: extensionTitle,
                description: formatTimeExtension(benefit.duration, benefit.unit, currentLocale),
                icon: '⏰',
                highlight: currentLocale === 'ko-KR'
                    ? `+${benefit.duration}${getPluralizedTimeUnit(benefit.duration, benefit.unit, currentLocale)}`
                    : `+${benefit.duration} ${getPluralizedTimeUnit(benefit.duration, benefit.unit, currentLocale)}`
            };
            
        case 'upgrade':
            const planName = getLocalizedPlanName(benefit.targetPlan, currentLocale);
            if (currentLocale === 'zh-TW' || currentLocale === 'zh-CN' || currentLocale === 'ko-KR') {
                const upgradeTitle = currentLocale === 'zh-CN'
                    ? '套餐升级'
                    : currentLocale === 'zh-TW' ? '方案升級' : '요금제 업그레이드';
                const upgradeDescription = currentLocale === 'zh-CN'
                    ? `升级至 ${planName}`
                    : currentLocale === 'zh-TW' ? `升級至 ${planName}` : `${planName}로 업그레이드`;
                return {
                    title: upgradeTitle,
                    description: upgradeDescription,
                    icon: '⭐',
                    highlight: planName
                };
            } else {
                return {
                    title: 'Plan Upgrade',
                    description: `Upgrade to ${planName}`,
                    icon: '⭐',
                    highlight: planName
                };
            }
            
        default:
            const defaultCopy = {
                'zh-TW': { title: '特殊優惠', description: '您將獲得特殊促銷優惠', highlight: '高級權限' },
                'zh-CN': { title: '特别优惠', description: '您将获得特别促销优惠', highlight: '高级权限' },
                'ko-KR': { title: '특별 혜택', description: '특별 혜택이 제공됩니다.', highlight: '프리미엄 이용 권한' }
            }[currentLocale] || {
                title: 'Special Benefits',
                description: 'You will receive special promotional benefits',
                highlight: 'Premium Access'
            };
            return {
                title: defaultCopy.title,
                description: defaultCopy.description,
                icon: '🎁',
                highlight: defaultCopy.highlight
            };
    }
};

/**
 * Format countdown timer with proper locale formatting
 * @param {number} timeRemaining - Time remaining in milliseconds
 * @param {string} locale - Locale code
 * @returns {string} Formatted countdown string
 */
export const formatCountdown = (timeRemaining, locale = null) => {
    const currentLocale = locale || getCurrentLocale();
    
    const days = Math.floor(timeRemaining / (1000 * 60 * 60 * 24));
    const hours = Math.floor((timeRemaining % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((timeRemaining % (1000 * 60 * 60)) / (1000 * 60));
    
    if (currentLocale === 'zh-TW' || currentLocale === 'zh-CN') {
        const remaining = currentLocale === 'zh-CN' ? '剩余' : '剩餘';
        const hour = currentLocale === 'zh-CN' ? '小时' : '小時';
        const minute = currentLocale === 'zh-CN' ? '分钟' : '分鐘';
        if (days > 0) {
            return `${remaining} ${days} 天 ${hours} ${hour}`;
        } else if (hours > 0) {
            return `${remaining} ${hours} ${hour} ${minutes} ${minute}`;
        } else {
            return `${remaining} ${minutes} ${minute}`;
        }
    } else if (currentLocale === 'ko-KR') {
        if (days > 0) return `남은 기간 ${days}일 ${hours}시간`;
        if (hours > 0) return `남은 기간 ${hours}시간 ${minutes}분`;
        return `남은 기간 ${minutes}분`;
    } else {
        if (days > 0) {
            return `${days}d ${hours}h remaining`;
        } else if (hours > 0) {
            return `${hours}h ${minutes}m remaining`;
        } else {
            return `${minutes}m remaining`;
        }
    }
};

/**
 * Format validation error message with parameters
 * @param {string} errorCode - Error code
 * @param {object} params - Error parameters
 * @param {string} locale - Locale code
 * @returns {string} Formatted error message
 */
export const formatErrorMessage = (errorCode, params = {}, locale = null) => {
    const currentLocale = locale || getCurrentLocale();
    
    // Format dates in parameters
    const formattedParams = { ...params };
    
    if (params.expiryDate) {
        formattedParams.expiryDate = formatDate(params.expiryDate, 'PPP', currentLocale);
    }
    
    if (params.activationDate) {
        formattedParams.activationDate = formatDate(params.activationDate, 'PPP', currentLocale);
    }
    
    if (params.redemptionDate) {
        formattedParams.redemptionDate = formatDate(params.redemptionDate, 'PPP', currentLocale);
    }
    
    if (params.retryAfter) {
        formattedParams.retryAfter = Math.ceil(params.retryAfter / 1000); // Convert to seconds
    }
    
    return formattedParams;
};

/**
 * Format number with locale-specific formatting
 * @param {number} number - Number to format
 * @param {object} options - Formatting options
 * @param {string} locale - Locale code
 * @returns {string} Formatted number string
 */
export const formatNumber = (number, options = {}, locale = null) => {
    const currentLocale = locale || getCurrentLocale();
    
    return new Intl.NumberFormat(['zh-TW', 'zh-CN', 'ko-KR'].includes(currentLocale) ? currentLocale : 'en-US', {
        minimumFractionDigits: options.minimumFractionDigits || 0,
        maximumFractionDigits: options.maximumFractionDigits || 2,
        ...options
    }).format(number);
};

/**
 * Format percentage with locale-specific formatting
 * @param {number} percentage - Percentage to format (0-100)
 * @param {string} locale - Locale code
 * @returns {string} Formatted percentage string
 */
export const formatPercentage = (percentage, locale = null) => {
    const currentLocale = locale || getCurrentLocale();
    
    return new Intl.NumberFormat(['zh-TW', 'zh-CN', 'ko-KR'].includes(currentLocale) ? currentLocale : 'en-US', {
        style: 'percent',
        minimumFractionDigits: 0,
        maximumFractionDigits: 1
    }).format(percentage / 100);
};

/**
 * Get localized plan name
 * @param {string} planKey - Plan key (e.g., 'pro', 'free')
 * @param {string} locale - Locale code
 * @returns {string} Localized plan name
 */
export const getLocalizedPlanName = (planKey, locale = null) => {
    const currentLocale = locale || getCurrentLocale();
    
    const planNames = {
        'zh-TW': {
            'free': '免費方案',
            'pro': 'Pro 方案',
            'premium': '高級方案'
        },
        'zh-CN': {
            'free': '免费套餐',
            'pro': 'Pro 套餐',
            'premium': '高级套餐'
        },
        'en': {
            'free': 'Free Plan',
            'pro': 'Pro Plan',
            'premium': 'Premium Plan'
        },
        'ko-KR': {
            'free': 'Free 요금제',
            'pro': 'Pro 요금제',
            'premium': 'Premium 요금제'
        }
    };
    
    return planNames[currentLocale]?.[planKey] || planKey;
};

/**
 * Format estimated value with currency and locale
 * @param {number} value - Value to format
 * @param {string} currency - Currency code
 * @param {string} locale - Locale code
 * @returns {string} Formatted estimated value
 */
export const formatEstimatedValue = (value, currency = 'TWD', locale = null) => {
    const currentLocale = locale || getCurrentLocale();
    const formattedAmount = formatCurrency(value, currency, currentLocale);
    
    if (currentLocale === 'zh-TW') {
        return `預估價值：${formattedAmount}`;
    } else if (currentLocale === 'zh-CN') {
        return `预估价值：${formattedAmount}`;
    } else if (currentLocale === 'ko-KR') {
        return `예상 혜택 금액: ${formattedAmount}`;
    } else {
        return `Estimated Value: ${formattedAmount}`;
    }
};

export default {
    formatCurrency,
    formatDate,
    formatRelativeTime,
    getPluralizedTimeUnit,
    formatTimeExtension,
    formatDiscountDescription,
    formatBenefitDescription,
    formatCountdown,
    formatErrorMessage,
    formatNumber,
    formatPercentage,
    getLocalizedPlanName,
    formatEstimatedValue
};
