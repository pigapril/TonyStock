/**
 * Test error message formatting with actual data structure
 */

// Mock the formatDate function
const formatDate = (date, formatString = 'PPP', locale = null) => {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    const currentLocale = locale || 'zh-TW';
    
    if (currentLocale === 'en') {
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
};

// Mock translation function
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

// Simulate the formatErrorMessage function with the fix
function formatErrorMessage(error, t, locale = 'zh-TW') {
    if (!error) return t('redemption.errors.unknown');

    const errorCode = error.errorCode || 'UNKNOWN';
    
    // 處理特殊的錯誤類型，需要參數替換
    if (error.data) {
        // 檢查錯誤詳細信息的多個可能位置
        const details = error.data.details || error.data;
        const errors = error.data.errors || [];
        const primaryError = errors[0];
        
        // 從 primaryError 中提取具體的錯誤詳情
        let errorDetails = null;
        if (primaryError) {
            errorDetails = primaryError;
        } else if (details) {
            errorDetails = details;
        }
        
        switch (errorCode) {
            case 'CODE_EXPIRED':
                // 檢查多個可能的位置
                const expiryDate = errorDetails?.expiresAt || errorDetails?.expiryDate || details.expiresAt;
                if (expiryDate) {
                    const formattedDate = formatDate(expiryDate, 'PPP', locale);
                    return t('redemption.errors.code_expired', { 
                        expiryDate: formattedDate 
                    }, locale);
                }
                break;
                
            case 'CODE_NOT_ACTIVE':
                // 檢查多個可能的位置
                const activationDate = errorDetails?.activationDate || errorDetails?.activatesAt || details.activationDate;
                if (activationDate) {
                    const formattedDate = formatDate(activationDate, 'PPP', locale);
                    return t('redemption.errors.code_not_active', { 
                        activationDate: formattedDate 
                    }, locale);
                }
                break;
        }
    }
    
    // 嘗試獲取翻譯信息
    const translationKey = `redemption.errors.${errorCode.toLowerCase()}`;
    return t(translationKey, {}, locale);
}

console.log('🧪 Testing error message formatting with actual data structure...\n');

// Test scenarios that match the actual backend response structure
const testScenarios = [
    {
        name: 'CODE_NOT_ACTIVE - Backend structure (Chinese)',
        locale: 'zh-TW',
        error: {
            success: false,
            error: 'Code is not yet active',
            errorCode: 'CODE_NOT_ACTIVE',
            data: {
                isValid: false,
                errors: [
                    {
                        type: 'CODE_NOT_ACTIVE',
                        message: 'Redemption code is not yet active',
                        activationDate: '2025-01-15'  // This is what backend now sends
                    }
                ]
            }
        }
    },
    {
        name: 'CODE_NOT_ACTIVE - Backend structure (English)',
        locale: 'en',
        error: {
            success: false,
            error: 'Code is not yet active',
            errorCode: 'CODE_NOT_ACTIVE',
            data: {
                isValid: false,
                errors: [
                    {
                        type: 'CODE_NOT_ACTIVE',
                        message: 'Redemption code is not yet active',
                        activationDate: '2025-01-15'
                    }
                ]
            }
        }
    },
    {
        name: 'CODE_EXPIRED - Backend structure (Chinese)',
        locale: 'zh-TW',
        error: {
            success: false,
            error: 'Code has expired',
            errorCode: 'CODE_EXPIRED',
            data: {
                isValid: false,
                errors: [
                    {
                        type: 'CODE_EXPIRED',
                        message: 'Redemption code has expired',
                        expiresAt: '2024-12-30'  // This is what backend now sends
                    }
                ]
            }
        }
    },
    {
        name: 'CODE_EXPIRED - Backend structure (English)',
        locale: 'en',
        error: {
            success: false,
            error: 'Code has expired',
            errorCode: 'CODE_EXPIRED',
            data: {
                isValid: false,
                errors: [
                    {
                        type: 'CODE_EXPIRED',
                        message: 'Redemption code has expired',
                        expiresAt: '2024-12-30'
                    }
                ]
            }
        }
    }
];

testScenarios.forEach(scenario => {
    console.log(`--- ${scenario.name} ---`);
    
    const t = (key, params) => mockT(key, params, scenario.locale);
    const result = formatErrorMessage(scenario.error, t, scenario.locale);
    
    console.log('Error structure:');
    console.log('- errorCode:', scenario.error.errorCode);
    console.log('- data.errors[0]:', JSON.stringify(scenario.error.data.errors[0], null, 2));
    console.log('Formatted message:', result);
    
    // Check if the message contains template variables (indicates failure)
    if (result.includes('{{') && result.includes('}}')) {
        console.log('❌ FAILED: Template variables not replaced!');
    } else {
        console.log('✅ SUCCESS: Message formatted correctly');
    }
    console.log('');
});

console.log('✅ Error formatting test completed!');