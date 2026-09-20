const scripts = [
    'https://code.jquery.com/jquery-3.7.1.min.js',
    'https://cdn.jsdelivr.net/npm/node-forge@0.7.0/dist/forge.min.js',
    'https://ecpg.ecpay.com.tw/Scripts/sdk-1.0.0.js?t=20210121100116'
];

beforeEach(() => {
    jest.resetModules();
    document.head.innerHTML = '';
    scripts.forEach((src) => {
        const script = document.createElement('script');
        script.src = src;
        script.dataset.ecpgLoaded = 'true';
        document.head.appendChild(script);
    });
    window.ECPay = {
        initialize: jest.fn((mode, loading, callback) => callback(null)),
        addBindingCard: jest.fn((token, language, callback) => callback(null))
    };
});

afterEach(() => { delete window.ECPay; });

test('重試與換卡沿用初始化，但每次使用新的 token 掛載表單', async () => {
    const { renderBindCardForm } = require('../ecpayBindCardSdk');
    window.ECPay.initialize.mockImplementationOnce((mode, loading, callback) => callback(null))
        .mockImplementation(() => { throw new TypeError('i is not a function'); });
    await renderBindCardForm({ token: 'first' });
    await renderBindCardForm({ token: 'second', language: 'en-US' });
    expect(window.ECPay.initialize).toHaveBeenCalledTimes(1);
    expect(window.ECPay.addBindingCard).toHaveBeenNthCalledWith(2, 'second', 'en-US', expect.any(Function));
});

test('初始化尚未完成時的重疊掛載共用同一請求', async () => {
    const { renderBindCardForm } = require('../ecpayBindCardSdk');
    let initialized;
    window.ECPay.initialize.mockImplementation((mode, loading, callback) => { initialized = callback; });
    const first = renderBindCardForm({ token: 'first' });
    const second = renderBindCardForm({ token: 'second' });
    for (let i = 0; i < 12 && !initialized; i++) await Promise.resolve();
    expect(window.ECPay.initialize).toHaveBeenCalledTimes(1);
    expect(window.ECPay.addBindingCard).not.toHaveBeenCalled();
    initialized(null);
    await Promise.all([first, second]);
});

test('初始化失敗後重新載入 SDK，下一次可以恢復', async () => {
    const { renderBindCardForm } = require('../ecpayBindCardSdk');
    window.ECPay.initialize.mockImplementation((mode, loading, callback) => callback('network failure'));
    await expect(renderBindCardForm({ token: 'first' })).rejects.toMatchObject({ code: 'SDK_INIT_FAILED' });
    expect(document.querySelector(`script[src="${scripts[2]}"]`)).toBeNull();
    const retry = renderBindCardForm({ token: 'second' });
    let reloaded;
    for (let i = 0; i < 12 && !reloaded; i++) {
        await Promise.resolve();
        reloaded = document.querySelector(`script[src="${scripts[2]}"]`);
    }
    window.ECPay = {
        initialize: jest.fn((mode, loading, callback) => callback(null)),
        addBindingCard: jest.fn((token, language, callback) => callback(null))
    };
    reloaded.dispatchEvent(new Event('load'));
    await retry;
    expect(window.ECPay.addBindingCard).toHaveBeenCalledWith('second', 'zh-TW', expect.any(Function));
});
