import { useCallback, useEffect, useState } from 'react';
import {
    goToThreeDVerification,
    renderBindCardForm,
    requestBindCardPayToken
} from '../../../utils/ecpayBindCardSdk';
import { systemLogger } from '../../../utils/logger';

export const BINDING_PHASE = {
    terms: 'terms',
    starting: 'starting',
    binding: 'binding',
    submitting: 'submitting',
    failed: 'failed'
};

const SHOWS_CARD_FIELDS = new Set([BINDING_PHASE.starting, BINDING_PHASE.binding, BINDING_PHASE.submitting]);

// 刷卡欄位、3D 與限流的錯誤兩條流程說法一樣。各流程後端自己的錯誤碼由 flow.errorKeys 補上。
const SHARED_ERROR_KEYS = {
    TOKEN_EXPIRED: 'cardTrial.errors.expired',
    SDK_LOAD_FAILED: 'cardTrial.errors.sdk',
    SDK_INIT_FAILED: 'cardTrial.errors.sdk',
    BIND_FORM_FAILED: 'cardTrial.errors.sdk',
    PAY_TOKEN_FAILED: 'cardTrial.errors.generic',
    RATE_LIMIT_EXCEEDED: 'cardTrial.errors.rateLimited'
};

const GENERIC_ERROR_KEY = 'cardTrial.errors.generic';

const errorKeyOf = (error, errorKeys) => {
    const keyOf = (code) => errorKeys[code] || SHARED_ERROR_KEYS[code];
    if (error && keyOf(error.code)) return keyOf(error.code);

    const response = error && error.response;
    if (!response) return GENERIC_ERROR_KEY;
    if (response.status === 429) return SHARED_ERROR_KEYS.RATE_LIMIT_EXCEEDED;

    const body = response.data || {};
    const code = body.errorCode || (body.data && body.data.errorCode);
    return keyOf(code) || GENERIC_ERROR_KEY;
};

// i18n 的語言可能是 zh、zh-TW 或 en。後端與綠界各自只認一組固定值，所以先收斂成
// 這兩個，再往下各自轉換。
export const localeOf = (language) => (String(language || '').startsWith('en') ? 'en' : 'zh-TW');

// 綠界綁卡欄位只支援這兩個值，而且英文是 en-US 不是 en。
const ecpayLanguageOf = (locale) => (locale === 'en' ? 'en-US' : 'zh-TW');

const NO_SESSION_FIELDS = {};

// flow 是 { start, create, errorKeys, logMessage, pendingResultUrl }，必須是模組層常數：它是下面 effect 的
// 依賴，每次 render 換一個新物件會讓綠界刷卡欄位一直重畫。
// sessionFields 是頁面當下的狀態，start 與 create 都會帶上，pendingResultUrl 也用它決定結果頁網址。
export const useCardBinding = (flow, locale, sessionFields = NO_SESSION_FIELDS) => {
    const [phase, setPhase] = useState(BINDING_PHASE.terms);
    const [agreed, setAgreed] = useState(false);
    const [binding, setBinding] = useState(null);
    const [errorKey, setErrorKey] = useState(null);

    const fail = useCallback((error) => {
        systemLogger.error(flow.logMessage, { code: error && error.code, message: error && error.message });
        setErrorKey(errorKeyOf(error, flow.errorKeys));
        setBinding(null);
        setPhase(BINDING_PHASE.failed);
    }, [flow]);

    const handleStart = useCallback(async (terms) => {
        setPhase(BINDING_PHASE.starting);
        try {
            const started = await flow.start({ termsConsentedAt: new Date().toISOString(), ...terms, ...sessionFields });
            setBinding(started);
        } catch (error) {
            fail(error);
        }
    }, [fail, flow, sessionFields]);

    // 刷卡欄位必須渲染進已經掛上 DOM 的 #ECPayPayment，所以 addBindingCard 要等
    // 這一輪 commit 完才能呼叫。
    useEffect(() => {
        if (!binding) return;
        let abandoned = false;

        renderBindCardForm({ token: binding.token, language: ecpayLanguageOf(locale) })
            .then(() => {
                if (!abandoned) setPhase(BINDING_PHASE.binding);
            })
            .catch((error) => {
                if (!abandoned) fail(error);
            });

        return () => { abandoned = true; };
    }, [binding, fail, locale]);

    const handleSubmit = useCallback(async () => {
        setPhase(BINDING_PHASE.submitting);
        try {
            const bindCardPayToken = await requestBindCardPayToken();
            const { threeDUrl } = await flow.create({
                merchantTradeNo: binding.merchantTradeNo,
                bindCardPayToken,
                ...sessionFields
            });
            // 綠界失敗時後端直接回錯誤。沒有網址是 RtnCode=1 但不需要 3D：交易已完成，結果由回呼帶來。
            if (threeDUrl) goToThreeDVerification(threeDUrl);
            else window.location.assign(flow.pendingResultUrl({ locale, ...sessionFields, merchantTradeNo: binding.merchantTradeNo }));
        } catch (error) {
            fail(error);
        }
    }, [binding, fail, flow, locale, sessionFields]);

    // 重新開始要把同意狀態一起清掉：送到後端的同意時間必須對應一次真實的勾選。
    const handleRestart = useCallback(() => {
        setErrorKey(null);
        setAgreed(false);
        setBinding(null);
        setPhase(BINDING_PHASE.terms);
    }, []);

    return {
        phase,
        agreed,
        setAgreed,
        errorKey,
        showsCardFields: SHOWS_CARD_FIELDS.has(phase),
        handleStart,
        handleSubmit,
        handleRestart
    };
};
