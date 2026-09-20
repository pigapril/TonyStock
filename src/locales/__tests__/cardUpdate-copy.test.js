const zhTW = require('../zh-TW/translation.json');
const en = require('../en/translation.json');

// Tony 核准的換卡文案。寬限期提示沿用扣款失敗信的句子，兩邊要一致，所以逐字釘死。
const APPROVED_ZH_TW = {
    title: '更換付款卡片',
    'disclosure.verification': '綁定新卡時會進行一筆 2 元的驗證，你不會被收取這筆費用',
    'disclosure.futureCharges': '之後的扣款會改用新卡',
    'disclosure.chargeNow': '換卡成功後會立即扣款 {{amount}} 元',
    'disclosure.nextCharge': '扣款成功後，下次扣款日為 {{date}}',
    start: '同意並綁定新卡',
    startAndPay: '同意並綁定新卡，付款 {{amount}} 元',
    'method.card': '•••• {{last4}}，有效期限 {{mm}}/{{yy}}',
    'method.cardWithoutLast4': '有效期限 {{mm}}/{{yy}}',
    'method.cardWithoutValidity': '•••• {{last4}}',
    'errors.stateChanged': '付款狀態剛剛有變動，請重新整理頁面後再試一次。',
    'errors.chargePending': '上一筆扣款正在向銀行確認，確認完成前無法更換卡片。',
    'method.update': '更換卡片',
    'method.updateAndPay': '更換卡片並付款 {{amount}} 元',
    'method.graceNotice': '這次扣款未成功，我們沒有向你收取任何費用。請於 {{date}} 前更換付款卡片。',
    'result.successTitle': '卡片已更新',
    'result.successBody': '新卡已設定完成。',
    'result.failedTitle': '卡片沒有更新',
    'result.failedBody': '這張卡沒有綁定成功，你沒有被收取任何費用。'
};

const at = (dict, dotted) => dotted.split('.').reduce((node, key) => node && node[key], dict);

const leaves = (node, prefix = '', out = {}) => {
    Object.entries(node).forEach(([key, value]) => {
        const dotted = prefix ? `${prefix}.${key}` : key;
        if (value && typeof value === 'object') leaves(value, dotted, out);
        else out[dotted] = value;
    });
    return out;
};

const allKeys = (node, out = []) => {
    if (!node || typeof node !== 'object') return out;
    Object.entries(node).forEach(([key, value]) => {
        out.push(key);
        allKeys(value, out);
    });
    return out;
};

const placeholders = (text) => (text.match(/{{\s*\w+\s*}}/g) || []).map((p) => p.replace(/\s/g, '')).sort();

describe('換卡文案', () => {
    it('zh-TW 逐字符合核准版本', () => {
        Object.entries(APPROVED_ZH_TW).forEach(([dotted, text]) => {
            expect([dotted, at(zhTW.cardUpdate, dotted)]).toEqual([dotted, text]);
        });
    });

    it('en 的付款狀態變動與只有末四碼逐字符合', () => {
        expect(en.cardUpdate.errors.stateChanged).toBe('Your payment status just changed. Please refresh the page and try again.');
        expect(en.cardUpdate.method.cardWithoutValidity).toBe('•••• {{last4}}');
        expect(en.cardUpdate.errors.chargePending).toBe('Your last charge is still being confirmed with the bank. You can update your card once it is confirmed.');
    });

    it('付款狀態變動時的按鈕沿用 common.refresh', () => {
        expect(zhTW.common.refresh).toBe('重新整理');
        expect(en.common.refresh).toBe('Refresh');
    });

    it('結果頁的確認中狀態沿用試用的句子', () => {
        expect(zhTW.cardTrial.result.pendingTitle).toBe('正在確認結果');
        expect(zhTW.cardTrial.result.pendingBody).toBe('銀行的回覆還在路上，稍後可於帳戶頁面查看。');
    });

    it('zh-TW 與 en 的 key 結構一致', () => {
        const shape = (node) => (node && typeof node === 'object' && !Array.isArray(node)
            ? Object.fromEntries(Object.keys(node).sort().map((key) => [key, shape(node[key])]))
            : null);

        expect(shape(en.cardUpdate)).toEqual(shape(zhTW.cardUpdate));
    });

    it('en 每一句帶的變數與 zh-TW 相同，金額與日期不會在翻譯裡掉成寫死的字', () => {
        const zhLeaves = leaves(zhTW.cardUpdate);
        const enLeaves = leaves(en.cardUpdate);
        Object.keys(zhLeaves).forEach((dotted) => {
            expect([dotted, placeholders(enLeaves[dotted])]).toEqual([dotted, placeholders(zhLeaves[dotted])]);
        });
    });

    it('cardUpdate 底下沒有任何 freeTrial 開頭的 key', () => {
        [zhTW, en].forEach((dict) => {
            allKeys(dict.cardUpdate).forEach((key) => expect(key).not.toMatch(/^freeTrial/));
        });
    });
});
