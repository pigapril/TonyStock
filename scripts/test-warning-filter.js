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
        || message.includes('⚠️ React Router Future Flag Warning:')
        || message.includes('🛡️ ApiClient: Skipping CSRF token for auth endpoint:')
        || message.includes('API Client: 401 Unauthorized - clearing auth data and redirecting to login')
        || message.includes('API Client: 429 Too Many Requests - rate limit exceeded')
        || message.includes('react-i18next:: useTranslation: You will need to pass in an i18next instance')
        || message.includes('Support for defaultProps will be removed from function components in a future major release')
        || message.includes('Fetching hot searches...')
        || message.includes('API response received:')
        || message.includes('Finished fetching hot searches.')
        || message.includes('Turnstile verified:')
        || message.includes('Form submitted, checking auth:')
        || message.includes('Stock check:')
        || message.includes('Stock not allowed, opening dialog')
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
