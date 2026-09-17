/**
 * 綠界 ECPG 綁卡 SDK 的包裝層。
 *
 * 三支 script 的順序不可變，SDK 一律從正式 domain 載入，環境靠 initialize 的第一個
 * 參數切換。stage domain 的 SDK 是不同檔案、行為會異常。
 *
 * 這裡不對綠界發任何帶自訂 header 的請求：綠界 gateway 的
 * access-control-allow-headers 是白名單，多一個 header 就會在 preflight 被擋掉，
 * 而且不會告訴你原因。
 */

const SDK_SCRIPTS = [
    'https://code.jquery.com/jquery-3.7.1.min.js',
    'https://cdn.jsdelivr.net/npm/node-forge@0.7.0/dist/forge.min.js',
    'https://ecpg.ecpay.com.tw/Scripts/sdk-1.0.0.js?t=20210121100116'
];

export const BIND_CARD_CONTAINER_ID = 'ECPayPayment';

// Token 過期時 callback 只回「廠商驗證碼(Token)已失效，請重新操作」這句繁中字串，
// 不附任何錯誤碼，所以只能認這四個字。
const TOKEN_EXPIRED_MARK = '已失效';

const failure = (code, message) => Object.assign(new Error(message || code), { code });

const sdkMode = () => (process.env.REACT_APP_ECPG_MODE === 'Prod' ? 'Prod' : 'Stage');

const loadScript = (src) => new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${src}"]`);
    const target = existing || document.createElement('script');

    if (existing && existing.dataset.ecpgLoaded === 'true') {
        resolve();
        return;
    }

    target.addEventListener('load', () => {
        target.dataset.ecpgLoaded = 'true';
        resolve();
    });
    target.addEventListener('error', () => reject(failure('SDK_LOAD_FAILED', src)));

    if (!existing) {
        target.src = src;
        target.async = false;
        document.head.appendChild(target);
    }
});

let pendingLoad = null;

export const loadBindCardSdk = () => {
    if (!pendingLoad) {
        pendingLoad = SDK_SCRIPTS
            .reduce((chain, src) => chain.then(() => loadScript(src)), Promise.resolve())
            .then(() => {
                if (!window.ECPay) throw failure('SDK_LOAD_FAILED', 'ECPay global missing');
                return window.ECPay;
            })
            .catch((error) => {
                pendingLoad = null;
                throw error;
            });
    }
    return pendingLoad;
};

export const renderBindCardForm = async ({ token, language = 'zh-TW' }) => {
    const ECPay = await loadBindCardSdk();

    await new Promise((resolve, reject) => {
        ECPay.initialize(sdkMode(), 1, (error) => (
            error ? reject(failure('SDK_INIT_FAILED', String(error))) : resolve()
        ));
    });

    await new Promise((resolve, reject) => {
        ECPay.addBindingCard(token, language, (error) => {
            if (!error) {
                resolve();
                return;
            }
            const message = String(error);
            reject(failure(message.includes(TOKEN_EXPIRED_MARK) ? 'TOKEN_EXPIRED' : 'BIND_FORM_FAILED', message));
        });
    });
};

export const requestBindCardPayToken = () => new Promise((resolve, reject) => {
    if (!window.ECPay) {
        reject(failure('SDK_LOAD_FAILED', 'ECPay global missing'));
        return;
    }

    window.ECPay.getBindCardPayToken((result, errorMessage) => {
        if (errorMessage || !result || !result.BindCardPayToken) {
            const message = String(errorMessage || '');
            reject(failure(message.includes(TOKEN_EXPIRED_MARK) ? 'TOKEN_EXPIRED' : 'PAY_TOKEN_FAILED', message));
            return;
        }
        resolve(result.BindCardPayToken);
    });
});

export const goToThreeDVerification = (url) => {
    window.location.assign(url);
};
