/**
 * 行為測試抓不到的兩件事，直接看原始碼。
 *
 * 這台機器的 jsdom 是台北時區，漏掉 timeZone 時畫面上的日期照樣正確，只有 production
 * （Etc/UTC）的使用者會差一天。月繳 199、年繳 1990 必須來自 API 的 amountDue，寫死在
 * 前端的話另一種繳期的人會看到錯的金額。
 */

const fs = require('fs');
const path = require('path');

const zhTW = require('../../../../locales/zh-TW/translation.json');
const en = require('../../../../locales/en/translation.json');

const SRC = path.resolve(__dirname, '../../../..');
const read = (relative) => fs.readFileSync(path.join(SRC, relative), 'utf8');

const DATE_FORMATTING_SOURCES = [
    'components/Subscription/UserAccount/components/PaymentMethod.js',
    'components/Payment/CardUpdate/CardUpdateFlow.js'
];

const CARD_UPDATE_SOURCES = [
    ...DATE_FORMATTING_SOURCES,
    'components/Payment/CardUpdate/CardUpdateResult.js',
    'components/Payment/CardTrial/useCardBinding.js',
    'services/cardUpdateService.js'
];

const TAIPEI = "timeZone: 'Asia/Taipei'";
const HARDCODED_AMOUNT = /(?<![\d.])(199|1990|1,990)(?![\d.])/;

const formatterOptions = (source) => source
    .split('new Intl.DateTimeFormat(')
    .slice(1)
    .map((rest) => rest.slice(0, rest.indexOf(').format(')));

const strings = (node, out = []) => {
    if (typeof node === 'string') out.push(node);
    else if (node && typeof node === 'object') Object.values(node).forEach((value) => strings(value, out));
    return out;
};

describe('換卡的日期格式化一定指定台北時區', () => {
    it.each(DATE_FORMATTING_SOURCES)('%s 每一個日期格式化都帶台北時區', (relative) => {
        const formatters = formatterOptions(read(relative));

        expect(formatters.length).toBeGreaterThan(0);
        formatters.forEach((options) => expect(options).toContain(TAIPEI));
    });

    it.each(DATE_FORMATTING_SOURCES)('%s 沒有繞過 Intl 用 toLocale*String 格式化日期', (relative) => {
        expect(read(relative)).not.toMatch(/toLocale(Date)?String\(/);
    });
});

describe('換卡金額不寫死', () => {
    it.each(CARD_UPDATE_SOURCES)('%s 沒有 199 或 1990', (relative) => {
        expect(read(relative)).not.toMatch(HARDCODED_AMOUNT);
    });

    it('cardUpdate 的文案沒有 199 或 1990', () => {
        [zhTW, en].forEach((dict) => {
            strings(dict.cardUpdate).forEach((text) => expect(text).not.toMatch(HARDCODED_AMOUNT));
        });
    });
});
