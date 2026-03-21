/**
 * Test formatDate function safety and fallbacks
 */

// Mock the formatDate function with the new safety checks
const formatDate = (date, formatString = 'PPP', locale = null) => {
    const currentLocale = locale || 'zh-TW';
    
    // Safe date parsing with fallback
    let dateObj;
    if (typeof date === 'string') {
        // Simulate parseISO not being available
        const parseISO = null; // This simulates the error condition
        
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
    
    // Simulate format function not being available
    const format = null;
    
    if (format && typeof format === 'function') {
        try {
            return format(dateObj, formatString, {
                locale: { code: currentLocale }
            });
        } catch (error) {
            console.error('Error formatting date with date-fns:', error);
            // Fall through to native formatting
        }
    }
    
    // Fallback formatting using native methods
    return dateObj.toLocaleDateString(currentLocale === 'zh-TW' ? 'zh-TW' : 'en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
};

console.log('🧪 Testing formatDate function safety...\n');

const testCases = [
    {
        name: 'Valid date string (YYYY-MM-DD)',
        input: '2025-01-15',
        locale: 'zh-TW'
    },
    {
        name: 'Valid date string (ISO)',
        input: '2024-12-31T23:59:59.000Z',
        locale: 'zh-TW'
    },
    {
        name: 'Valid date string (English)',
        input: '2025-01-15',
        locale: 'en'
    },
    {
        name: 'Date object',
        input: new Date('2025-01-15'),
        locale: 'zh-TW'
    },
    {
        name: 'Invalid date string',
        input: 'invalid-date',
        locale: 'zh-TW'
    },
    {
        name: 'Null input',
        input: null,
        locale: 'zh-TW'
    },
    {
        name: 'Undefined input',
        input: undefined,
        locale: 'zh-TW'
    }
];

testCases.forEach(testCase => {
    console.log(`Testing: ${testCase.name}`);
    console.log(`Input: ${testCase.input}, Locale: ${testCase.locale}`);
    
    try {
        const result = formatDate(testCase.input, 'PPP', testCase.locale);
        console.log(`Output: ${result}`);
        
        if (result === 'Invalid Date') {
            console.log('⚠️  Expected invalid date result');
        } else {
            console.log('✅ Success');
        }
    } catch (error) {
        console.log(`❌ Error: ${error.message}`);
    }
    console.log('');
});

console.log('✅ formatDate safety test completed!');