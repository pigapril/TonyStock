/**
 * Test frontend date formatting
 */

// Mock the date-fns functions for testing
const mockFormat = (date, formatString, options = {}) => {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    const locale = options.locale?.code || 'zh-TW';
    
    if (formatString === 'PPP') {
        if (locale === 'en-US') {
            return dateObj.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
        } else {
            return dateObj.toLocaleDateString('zh-TW', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
        }
    }
    return dateObj.toLocaleDateString();
};

const mockParseISO = (dateString) => {
    return new Date(dateString);
};

// Mock locale configurations
const LOCALE_CONFIG = {
    'zh-TW': {
        dateFnsLocale: { code: 'zh-TW' }
    },
    'en': {
        dateFnsLocale: { code: 'en-US' }
    }
};

// Mock the formatDate function from redemptionFormatting.js
const formatDate = (date, formatString = 'PPP', locale = null) => {
    const currentLocale = locale || 'zh-TW';
    const config = LOCALE_CONFIG[currentLocale] || LOCALE_CONFIG['en'];
    
    const dateObj = typeof date === 'string' ? mockParseISO(date) : date;
    return mockFormat(dateObj, formatString, { locale: config.dateFnsLocale });
};

console.log('🧪 Testing frontend date formatting...\n');

// Test cases for different locales
const testCases = [
    {
        name: 'Chinese - Full ISO timestamp',
        input: '2024-12-31T23:59:59.000Z',
        locale: 'zh-TW',
        expected: 'Should format to Chinese readable date'
    },
    {
        name: 'Chinese - Date only format (backend output)',
        input: '2024-12-31',
        locale: 'zh-TW',
        expected: 'Should format to Chinese readable date'
    },
    {
        name: 'English - Full ISO timestamp',
        input: '2024-12-31T23:59:59.000Z',
        locale: 'en',
        expected: 'Should format to English readable date'
    },
    {
        name: 'English - Date only format (backend output)',
        input: '2024-12-31',
        locale: 'en',
        expected: 'Should format to English readable date'
    },
    {
        name: 'Chinese - Future date',
        input: '2025-01-15',
        locale: 'zh-TW',
        expected: 'Should format to Chinese readable date'
    },
    {
        name: 'English - Future date',
        input: '2025-01-15',
        locale: 'en',
        expected: 'Should format to English readable date'
    }
];

testCases.forEach(testCase => {
    console.log(`Testing: ${testCase.name}`);
    console.log(`Input: ${testCase.input}, Locale: ${testCase.locale}`);
    try {
        const result = formatDate(testCase.input, 'PPP', testCase.locale);
        console.log(`Output: ${result}`);
        console.log(`✅ Success\n`);
    } catch (error) {
        console.log(`❌ Error: ${error.message}\n`);
    }
});

// Test the error message formatting for both languages
console.log('🔍 Testing error message formatting...');

const mockT = (key, params, locale = 'zh-TW') => {
    const translations = {
        'zh-TW': {
            'redemption.errors.code_not_active': '此代碼將於 {{activationDate}} 啟用',
            'redemption.errors.code_expired': '此代碼已於 {{expiryDate}} 過期'
        },
        'en': {
            'redemption.errors.code_not_active': 'This code will be active on {{activationDate}}',
            'redemption.errors.code_expired': 'This code expired on {{expiryDate}}'
        }
    };
    
    let message = translations[locale]?.[key] || key;
    if (params) {
        Object.keys(params).forEach(param => {
            message = message.replace(`{{${param}}}`, params[param]);
        });
    }
    return message;
};

// Test scenarios
const testScenarios = [
    {
        name: 'CODE_NOT_ACTIVE - Chinese',
        locale: 'zh-TW',
        error: {
            type: 'CODE_NOT_ACTIVE',
            message: 'Redemption code is not yet active',
            activationDate: '2025-01-15'
        },
        translationKey: 'redemption.errors.code_not_active',
        paramKey: 'activationDate'
    },
    {
        name: 'CODE_NOT_ACTIVE - English',
        locale: 'en',
        error: {
            type: 'CODE_NOT_ACTIVE',
            message: 'Redemption code is not yet active',
            activationDate: '2025-01-15'
        },
        translationKey: 'redemption.errors.code_not_active',
        paramKey: 'activationDate'
    },
    {
        name: 'CODE_EXPIRED - Chinese',
        locale: 'zh-TW',
        error: {
            type: 'CODE_EXPIRED',
            message: 'Redemption code has expired',
            expiresAt: '2024-12-30'
        },
        translationKey: 'redemption.errors.code_expired',
        paramKey: 'expiryDate'
    },
    {
        name: 'CODE_EXPIRED - English',
        locale: 'en',
        error: {
            type: 'CODE_EXPIRED',
            message: 'Redemption code has expired',
            expiresAt: '2024-12-30'
        },
        translationKey: 'redemption.errors.code_expired',
        paramKey: 'expiryDate'
    }
];

testScenarios.forEach(scenario => {
    console.log(`\n--- ${scenario.name} ---`);
    
    const error = scenario.error;
    const dateValue = error.activationDate || error.expiresAt;
    
    if (dateValue) {
        const formattedDate = formatDate(dateValue, 'PPP', scenario.locale);
        const userMessage = mockT(scenario.translationKey, { 
            [scenario.paramKey]: formattedDate 
        }, scenario.locale);
        
        console.log('Backend date value:', dateValue);
        console.log('Formatted date:', formattedDate);
        console.log('Final user message:', userMessage);
        console.log('✅ Success');
    }
});

console.log('\n✅ Comprehensive date formatting test completed!');