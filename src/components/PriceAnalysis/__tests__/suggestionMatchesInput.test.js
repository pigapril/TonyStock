import { suggestionMatchesInput } from '../suggestionMatch';

// 用戶回報：打 LU1929549753 後，Enter 會被下拉裡不相干的建議攔走，
// 只有搶在 250ms debounce 之前按 Enter 才能分析到自己打的標的。
// 攔截條件改為「建議確實指向使用者打的字」。
describe('suggestionMatchesInput', () => {
    const tsmc = { symbol: '2330', name: '台積電' };

    test('中文前綴仍要選建議（打「台積」→ 台積電）', () => {
        expect(suggestionMatchesInput(tsmc, '台積')).toBe(true);
    });

    test('完整中文名要選建議', () => {
        expect(suggestionMatchesInput(tsmc, '台積電')).toBe(true);
    });

    test('代號前綴要選建議（打「233」→ 2330）', () => {
        expect(suggestionMatchesInput(tsmc, '233')).toBe(true);
    });

    test('ISIN 對上不相干建議時放行，讓表單送出原始輸入', () => {
        expect(suggestionMatchesInput(tsmc, 'LU1929549753')).toBe(false);
    });

    test('英文名前綴不分大小寫', () => {
        expect(suggestionMatchesInput({ symbol: 'AAPL', name: 'Apple Inc.' }, 'apple')).toBe(true);
        expect(suggestionMatchesInput({ symbol: 'AAPL', name: 'Apple Inc.' }, 'AAPL')).toBe(true);
    });

    test('帶字母尾碼的 ETF 代號', () => {
        expect(suggestionMatchesInput({ symbol: '00679B', name: '元大美債20年' }, '00679B')).toBe(true);
    });

    test('打的字比建議長且不相符時放行（台股 ETF vs 港股）', () => {
        expect(suggestionMatchesInput({ symbol: '0858.HK', name: '精優藥業' }, '00858')).toBe(false);
    });

    test('空輸入與缺欄位不當成命中', () => {
        expect(suggestionMatchesInput(tsmc, '')).toBe(false);
        expect(suggestionMatchesInput(tsmc, '   ')).toBe(false);
        expect(suggestionMatchesInput({}, 'ABC')).toBe(false);
        expect(suggestionMatchesInput(null, 'ABC')).toBe(false);
    });
});
