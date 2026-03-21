const originalLog = console.log.bind(console);
const originalInfo = console.info.bind(console);
const originalWarn = console.warn.bind(console);
const originalError = console.error.bind(console);

function flattenMessage(args) {
    return args
        .map((arg) => {
            if (typeof arg === 'string') {
                return arg;
            }

            if (arg instanceof Error) {
                return `${arg.name}: ${arg.message}`;
            }

            return '';
        })
        .join(' ');
}

function isKnownTestWarning(args) {
    const message = flattenMessage(args);

    return message.includes('[baseline-browser-mapping]')
        || message.includes('Warning: `ReactDOMTestUtils.act` is deprecated in favor of `React.act`')
        || (message.includes('Warning: An update to') && message.includes('not wrapped in act(...)'));
}

function isKnownTestNoise(args) {
    const message = flattenMessage(args);

    return isKnownTestWarning(args)
        || message.includes('📊 Subscription API full response:')
        || message.includes('📊 Response data structure:')
        || message.includes('📊 Subscriptions array:')
        || message.includes('📊 Subscriptions length:')
        || message.includes('📊 Final subscription result:')
        || message.includes('🔄 PaymentFlow: 開始載入定價資料')
        || message.includes('✅ PaymentFlow: 定價資料載入成功')
        || message.includes('🔗 從 URL 參數中發現優惠碼:')
        || message.includes('🔍 創建訂單前的 appliedRedemption:')
        || message.includes('🔍 傳遞給後端的 redemptionCode:')
        || message.includes('❌ PaymentFlow: 定價資料載入失敗')
        || message.includes('🧹 Clearing request queue');
}

console.log = (...args) => {
    if (isKnownTestNoise(args)) {
        return;
    }

    originalLog(...args);
};

console.info = (...args) => {
    if (isKnownTestNoise(args)) {
        return;
    }

    originalInfo(...args);
};

console.warn = (...args) => {
    if (isKnownTestNoise(args)) {
        return;
    }

    originalWarn(...args);
};

console.error = (...args) => {
    if (isKnownTestNoise(args)) {
        return;
    }

    originalError(...args);
};
