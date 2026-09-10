import { sortStocks, nextDirection } from '../utils/sortStocks';

// 缺報價的股票在觀察清單上顯示的是「無資料」。null 被比較運算子當成 0，
// 排序時會落在最便宜、最恐懼那一端，跟 StockAnalysis 那個坑是同一個。
const bands = (trendLine, sd) => ({
    trendLine,
    tl_minus_2sd: trendLine - 2 * sd,
    tl_minus_sd: trendLine - sd,
    tl_plus_sd: trendLine + sd,
    tl_plus_2sd: trendLine + 2 * sd
});

const stock = (symbol, price, analysis = bands(100, 10)) => ({ id: symbol, symbol, price, analysis });

const symbolsOf = (list) => list.map((s) => s.symbol);

describe('sortStocks', () => {
    it('無排序時回傳原陣列，不動手動順序', () => {
        const stocks = [stock('TSLA', 300), stock('AAPL', 200)];

        expect(sortStocks(stocks, null, null)).toBe(stocks);
        expect(sortStocks(stocks, 'price', null)).toBe(stocks);
        expect(sortStocks(stocks, null, 'asc')).toBe(stocks);
    });

    it('股票代碼照字母排，兩個方向都對', () => {
        const stocks = [stock('TSLA', 1), stock('2330', 1), stock('AAPL', 1)];

        expect(symbolsOf(sortStocks(stocks, 'symbol', 'asc'))).toEqual(['2330', 'AAPL', 'TSLA']);
        expect(symbolsOf(sortStocks(stocks, 'symbol', 'desc'))).toEqual(['TSLA', 'AAPL', '2330']);
    });

    it('價格照數值排，不照字串排', () => {
        const stocks = [stock('A', 9), stock('B', 100), stock('C', 30)];

        expect(symbolsOf(sortStocks(stocks, 'price', 'asc'))).toEqual(['A', 'C', 'B']);
        expect(symbolsOf(sortStocks(stocks, 'price', 'desc'))).toEqual(['B', 'C', 'A']);
    });

    it('缺報價的股票在兩個方向都沉底', () => {
        const stocks = [stock('NONE', null), stock('B', 100), stock('A', 50)];

        expect(symbolsOf(sortStocks(stocks, 'price', 'asc'))).toEqual(['A', 'B', 'NONE']);
        expect(symbolsOf(sortStocks(stocks, 'price', 'desc'))).toEqual(['B', 'A', 'NONE']);
        expect(symbolsOf(sortStocks(stocks, 'sentiment', 'asc'))).toEqual(['A', 'B', 'NONE']);
        expect(symbolsOf(sortStocks(stocks, 'sentiment', 'desc'))).toEqual(['B', 'A', 'NONE']);
    });

    it('缺五線譜資料時情緒排序當缺值處理', () => {
        const noAnalysis = { id: 'X', symbol: 'X', price: 100, analysis: null };
        const flatBands = { id: 'Y', symbol: 'Y', price: 100, analysis: bands(100, 0) };
        const stocks = [noAnalysis, flatBands, stock('OK', 130)];

        expect(symbolsOf(sortStocks(stocks, 'sentiment', 'asc'))).toEqual(['OK', 'X', 'Y']);
    });

    it('情緒照價格在通道上的位置排，同一級之內也分得出誰更極端', () => {
        // 兩檔都在 +1σ 與 +2σ 之間（卡片上都標「貪婪」），位置不同
        const greedier = stock('GREEDIER', 119);   // +1.9σ
        const greedy = stock('GREEDY', 112);       // +1.2σ
        const fear = stock('FEAR', 85);            // -1.5σ
        const stocks = [greedy, fear, greedier];

        expect(symbolsOf(sortStocks(stocks, 'sentiment', 'asc'))).toEqual(['FEAR', 'GREEDY', 'GREEDIER']);
        expect(symbolsOf(sortStocks(stocks, 'sentiment', 'desc'))).toEqual(['GREEDIER', 'GREEDY', 'FEAR']);
    });

    it('不同通道寬度的股票用相同尺度比較', () => {
        // 寬通道的 +1.5σ 絕對價差比窄通道的 +1.5σ 大，位置一樣就不該分先後
        const wide = { id: 'W', symbol: 'W', price: 130, analysis: bands(100, 20) };   // +1.5σ
        const narrow = { id: 'N', symbol: 'N', price: 103, analysis: bands(100, 2) };  // +1.5σ

        // 並列時維持原本的手動順序（stable sort）
        expect(symbolsOf(sortStocks([wide, narrow], 'sentiment', 'asc'))).toEqual(['W', 'N']);
        expect(symbolsOf(sortStocks([narrow, wide], 'sentiment', 'asc'))).toEqual(['N', 'W']);
    });

    it('數值相同時維持手動順序', () => {
        const stocks = [stock('C', 50), stock('A', 50), stock('B', 50)];

        expect(symbolsOf(sortStocks(stocks, 'price', 'asc'))).toEqual(['C', 'A', 'B']);
    });

    it('不改動傳入的陣列', () => {
        const stocks = [stock('B', 200), stock('A', 100)];

        sortStocks(stocks, 'price', 'asc');

        expect(symbolsOf(stocks)).toEqual(['B', 'A']);
    });
});

describe('nextDirection', () => {
    it('三態循環：無排序 → 升冪 → 降冪 → 無排序', () => {
        expect(nextDirection(null)).toBe('asc');
        expect(nextDirection('asc')).toBe('desc');
        expect(nextDirection('desc')).toBe(null);
    });
});
