/**
 * Test language detection and date formatting
 */

// Mock window and localStorage for testing
global.window = {
    i18n: {
        language: 'zh-TW'
    }
};

global.localStorage = {
    getItem: (key) => {
        if (key === 'i18nextLng') return 'zh-TW';
        return null;
    }
};

// Mock the getCurrentLocale function
const getCurrentLocale = () => {
    // Try to get from i18n if available
    if (typeof window !== 'undefined' && window.i18n) {
        const lang = window.i18n.language || 'en';
        // Normalize language codes
        if (lang === 'zh-TW' || lang === 'zh') {
            return 'zh-TW';
        }
        return lang;
    }
    
    // Try to get from localStorage
    if (typeof localStorage !== 'undefined') {
        const lang = localStorage.getItem('i18nextLng') || 'en';
        // Normalize language codes
        if (lang === 'zh-TW' || lang === 'zh') {
            return 'zh-TW';
        }
        return lang;
    }
    
    return 'en';
};

// Mock formatDate function with proper language handling
const formatDate = (date, formatString = 'PPP', locale = null) => {
    const currentLocale = locale || getCurrentLocale();
    
    // Safe date parsing
    let dateObj;
    if (typeof date === 'string') {
        dateObj = new Date(date);
    } else {
        dateObj = date;
    }
    
    // Validate the date object
    if (!dateObj || isNaN(dateObj.getTime())) {
        console.error('Invalid date provided to formatDate:', date);
        return 'Invalid Date';
    }
    
    // Use native formatting with correct locale
    const localeCode = currentLocale === 'zh-TW' ? 'zh-TW' : 'en-US';
    return dateObj.toLocaleDateString(localeCode, {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
};

// Mock the language detection logic from redemptionService
const getCurrentLanguageForFormatting = () => {
    const currentLang = (typeof window !== 'undefined' && window.i18n?.language) || 
                      (typeof localStorage !== 'undefined' && localStorage.getItem('i18nextLng')) || 
                      'zh-TW';
    return (currentLang === 'zh-TW' || currentLang === 'zh') ? 'zh-TW' : 'en';
};

console.log('🧪 Testing language detection and date formatting...\n');

// Test language detection
console.log('--- Language Detection Tests ---');
console.log('window.i18n.language:', window.i18n.language);
console.log('localStorage i18nextLng:', localStorage.getItem('i18nextLng'));
console.log('getCurrentLocale():', getCurrentLocale());
console.log('getCurrentLanguageForFormatting():', getCurrentLanguageForFormatting());
console.log('');

// Test date formatting with different language settings
const testCases = [
    {
        name: 'Chinese (zh-TW) - Auto detect',
        date: '2025-01-15',
        locale: null // Auto detect
    },
    {
        name: 'Chinese (zh-TW) - Explicit',
        date: '2025-01-15',
        locale: 'zh-TW'
    },
    {
        name: 'English - Explicit',
        date: '2025-01-15',
        locale: 'en'
    }
];

testCases.forEach(testCase => {
    console.log(`--- ${testCase.name} ---`);
    console.log('Input date:', testCase.date);
    console.log('Locale:', testCase.locale || 'auto-detect');
    
    const result = formatDate(testCase.date, 'PPP', testCase.locale);
    console.log('Formatted result:', result);
    
    // Check if result is in expected language
    if (testCase.locale === 'zh-TW' || (testCase.locale === null && getCurrentLocale() === 'zh-TW')) {
        if (result.includes('年') && result.includes('月') && result.includes('日')) {
            console.log('✅ Correctly formatted in Chinese');
        } else {
            console.log('❌ Expected Chinese format but got:', result);
        }
    } else if (testCase.locale === 'en') {
        if (result.includes('January') || result.includes('February') || result.includes('March')) {
            console.log('✅ Correctly formatted in English');
        } else {
            console.log('❌ Expected English format but got:', result);
        }
    }
    console.log('');
});

// Test with different window.i18n.language settings
console.log('--- Testing Different Language Settings ---');

const languageTests = [
    { lang: 'zh-TW', expected: 'Chinese' },
    { lang: 'zh', expected: 'Chinese' },
    { lang: 'en', expected: 'English' },
    { lang: 'en-US', expected: 'English' }
];

languageTests.forEach(test => {
    // Update mock language
    window.i18n.language = test.lang;
    
    const detectedLocale = getCurrentLocale();
    const formattingLocale = getCurrentLanguageForFormatting();
    const formatted = formatDate('2025-01-15', 'PPP');
    
    console.log(`Language: ${test.lang}`);
    console.log(`Detected locale: ${detectedLocale}`);
    console.log(`Formatting locale: ${formattingLocale}`);
    console.log(`Formatted: ${formatted}`);
    
    if (test.expected === 'Chinese') {
        if (formatted.includes('年')) {
            console.log('✅ Correct Chinese formatting');
        } else {
            console.log('❌ Expected Chinese but got English formatting');
        }
    } else {
        if (formatted.includes('January') || formatted.includes('February')) {
            console.log('✅ Correct English formatting');
        } else {
            console.log('❌ Expected English but got Chinese formatting');
        }
    }
    console.log('');
});

console.log('✅ Language detection test completed!');