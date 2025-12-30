/**
 * Test language consistency between translation and date formatting
 */

// Mock different language scenarios
const testScenarios = [
    {
        name: 'English Interface',
        windowLang: 'en',
        localStorageLang: 'en',
        urlPath: '/en/redemption',
        expectedLocale: 'en',
        expectedDateFormat: 'English'
    },
    {
        name: 'Chinese Interface (zh-TW)',
        windowLang: 'zh-TW',
        localStorageLang: 'zh-TW',
        urlPath: '/zh-TW/redemption',
        expectedLocale: 'zh-TW',
        expectedDateFormat: 'Chinese'
    },
    {
        name: 'Chinese Interface (zh)',
        windowLang: 'zh',
        localStorageLang: 'zh',
        urlPath: '/zh/redemption',
        expectedLocale: 'zh-TW',
        expectedDateFormat: 'Chinese'
    },
    {
        name: 'Mixed Settings (window=en, localStorage=zh-TW)',
        windowLang: 'en',
        localStorageLang: 'zh-TW',
        urlPath: '/en/redemption',
        expectedLocale: 'en', // window.i18n takes priority
        expectedDateFormat: 'English'
    }
];

// Mock the getCurrentLanguage function from redemptionService
const getCurrentLanguage = (windowLang, localStorageLang, urlPath) => {
    // Mock window and localStorage
    const mockWindow = {
        i18n: { language: windowLang },
        location: { pathname: urlPath }
    };
    
    const mockLocalStorage = {
        getItem: (key) => key === 'i18nextLng' ? localStorageLang : null
    };
    
    // Simulate the actual function logic
    if (mockWindow.i18n?.language) {
        const lang = mockWindow.i18n.language;
        return (lang === 'zh-TW' || lang === 'zh') ? 'zh-TW' : 'en';
    }
    
    if (mockLocalStorage.getItem('i18nextLng')) {
        const lang = mockLocalStorage.getItem('i18nextLng');
        return (lang === 'zh-TW' || lang === 'zh') ? 'zh-TW' : 'en';
    }
    
    if (mockWindow.location) {
        const pathLang = mockWindow.location.pathname.split('/')[1];
        if (pathLang === 'zh-TW' || pathLang === 'zh') {
            return 'zh-TW';
        } else if (pathLang === 'en') {
            return 'en';
        }
    }
    
    return 'en';
};

// Mock formatDate function
const formatDate = (date, formatString = 'PPP', locale = null) => {
    const dateObj = new Date(date);
    const localeCode = locale === 'zh-TW' ? 'zh-TW' : 'en-US';
    
    return dateObj.toLocaleDateString(localeCode, {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
};

console.log('🧪 Testing language consistency between translation and date formatting...\n');

testScenarios.forEach(scenario => {
    console.log(`--- ${scenario.name} ---`);
    console.log('Setup:');
    console.log(`  window.i18n.language: ${scenario.windowLang}`);
    console.log(`  localStorage.i18nextLng: ${scenario.localStorageLang}`);
    console.log(`  URL path: ${scenario.urlPath}`);
    
    const detectedLocale = getCurrentLanguage(scenario.windowLang, scenario.localStorageLang, scenario.urlPath);
    const formattedDate = formatDate('2025-01-15', 'PPP', detectedLocale);
    
    console.log('Results:');
    console.log(`  Detected locale: ${detectedLocale}`);
    console.log(`  Formatted date: ${formattedDate}`);
    console.log(`  Expected locale: ${scenario.expectedLocale}`);
    
    // Validate results
    if (detectedLocale === scenario.expectedLocale) {
        console.log('✅ Locale detection correct');
    } else {
        console.log('❌ Locale detection incorrect');
    }
    
    if (scenario.expectedDateFormat === 'Chinese') {
        if (formattedDate.includes('年') && formattedDate.includes('月') && formattedDate.includes('日')) {
            console.log('✅ Date format correct (Chinese)');
        } else {
            console.log('❌ Expected Chinese date format but got:', formattedDate);
        }
    } else {
        if (formattedDate.includes('January') || formattedDate.includes('February') || formattedDate.includes('March')) {
            console.log('✅ Date format correct (English)');
        } else {
            console.log('❌ Expected English date format but got:', formattedDate);
        }
    }
    
    console.log('');
});

// Test the complete error message formatting
console.log('--- Complete Error Message Test ---');

const mockT = (key, params, lang = 'en') => {
    const translations = {
        'en': {
            'redemption.errors.code_not_active': 'This code will be active on {{activationDate}}'
        },
        'zh-TW': {
            'redemption.errors.code_not_active': '此代碼將於 {{activationDate}} 啟用'
        }
    };
    
    let message = translations[lang]?.[key] || key;
    if (params) {
        Object.keys(params).forEach(param => {
            message = message.replace(`{{${param}}}`, params[param]);
        });
    }
    return message;
};

// Test English scenario
console.log('English Interface Test:');
const enLocale = getCurrentLanguage('en', 'en', '/en/redemption');
const enFormattedDate = formatDate('2025-01-15', 'PPP', enLocale);
const enMessage = mockT('redemption.errors.code_not_active', { activationDate: enFormattedDate }, 'en');
console.log('Message:', enMessage);
console.log('Expected: "This code will be active on January 15, 2025"');
console.log('');

// Test Chinese scenario
console.log('Chinese Interface Test:');
const zhLocale = getCurrentLanguage('zh-TW', 'zh-TW', '/zh-TW/redemption');
const zhFormattedDate = formatDate('2025-01-15', 'PPP', zhLocale);
const zhMessage = mockT('redemption.errors.code_not_active', { activationDate: zhFormattedDate }, 'zh-TW');
console.log('Message:', zhMessage);
console.log('Expected: "此代碼將於 2025年1月15日 啟用"');

console.log('\n✅ Language consistency test completed!');