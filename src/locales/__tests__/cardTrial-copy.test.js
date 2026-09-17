const fs = require('fs');
const path = require('path');

const zhTW = require('../zh-TW/translation.json');
const en = require('../en/translation.json');

const cardTrialDir = path.resolve(__dirname, '../../components/Payment/CardTrial');
const cardTrialSources = fs.readdirSync(cardTrialDir)
    .filter((name) => name.endsWith('.js'))
    .map((name) => fs.readFileSync(path.join(cardTrialDir, name), 'utf8'));

// Visa 對試用綁卡的四項硬性揭露，扣款那一項分月繳與年繳兩句。改這些句子要走法務，不是文案潤飾，所以逐字釘死。
const REQUIRED_DISCLOSURES = {
    length: '試用期 30 天，期間可使用全部 Pro 功能',
    verification: '綁定信用卡時會進行一筆 2 元的驗證，你不會被收取這筆費用',
    renewal: '試用期滿若未取消，將於 {{date}} 自動扣款 199 元，之後每月自動續費',
    renewalYearly: '試用期滿若未取消，將於 {{date}} 自動扣款 1990 元，之後每年自動續費',
    cancel: '隨時可於帳戶頁面取消，取消後試用期仍可使用到期滿'
};

describe('綁卡試用文案', () => {
    it('zh-TW 的揭露逐字符合定案版本', () => {
        Object.entries(REQUIRED_DISCLOSURES).forEach(([key, text]) => {
            expect(zhTW.cardTrial.disclosure[key]).toBe(text);
        });
    });

    it('zh-TW 與 en 的 key 結構一致', () => {
        const shape = (node) => (node && typeof node === 'object' && !Array.isArray(node)
            ? Object.fromEntries(Object.keys(node).sort().map((key) => [key, shape(node[key])]))
            : null);

        expect(shape(en.cardTrial)).toEqual(shape(zhTW.cardTrial));
    });
});

// freeTrial* 已被 subscription.freeTrialDialog（全站免費公告）佔用，語意與綁卡試用相反。
describe('綁卡試用不碰 freeTrial 前綴', () => {
    it('cardTrial 底下沒有任何 freeTrial 開頭的 key', () => {
        const keys = (node, out = []) => {
            if (!node || typeof node !== 'object') return out;
            Object.entries(node).forEach(([key, value]) => {
                out.push(key);
                keys(value, out);
            });
            return out;
        };

        [zhTW, en].forEach((dict) => {
            keys(dict.cardTrial).forEach((key) => expect(key).not.toMatch(/^freeTrial/));
        });
    });

    it('綁卡元件不引用任何 freeTrial 開頭的 i18n key', () => {
        cardTrialSources.forEach((source) => expect(source).not.toMatch(/freeTrial/));
    });

    it('既有的全站免費公告文案沒有被動到', () => {
        expect(zhTW.subscription.freeTrialDialog.heading).toBe('目前所有功能免費開放！');
        expect(en.subscription.freeTrialDialog.heading).toBeTruthy();
    });
});
