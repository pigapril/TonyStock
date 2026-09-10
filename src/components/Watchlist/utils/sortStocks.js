/**
 * 觀察清單的欄位排序。
 *
 * 排序只是檢視，不寫 DB，也不動編輯模式拖曳出來的 sortOrder。
 * key 為 null 就是「無排序」狀態，直接回傳後端給的手動順序。
 */

/** 可排序的欄位，順序跟表頭一致。 */
export const SORTABLE_COLUMNS = ['symbol', 'price', 'sentiment'];

/** 點一下的下一個狀態：升冪 → 降冪 → 無排序。 */
export const nextDirection = (direction) => {
    if (direction === 'asc') return 'desc';
    if (direction === 'desc') return null;
    return 'asc';
};

/**
 * 情緒排序用價格在五線譜上的實際位置，不是「極度恐懼／恐懼／中性」那五級。
 * 五十檔用五級排，一半會擠在中性並列，看起來像沒排。
 * 位置以趨勢線到 +1σ 的距離為單位，判準跟卡片上的標籤同一套，
 * 但同一級之內還分得出誰更極端。
 */
const sentimentPosition = (stock) => {
    const price = stock?.price;
    const trendLine = stock?.analysis?.trendLine;
    const plusSd = stock?.analysis?.tl_plus_sd;

    if (!Number.isFinite(price) || !Number.isFinite(trendLine) || !Number.isFinite(plusSd)) {
        return null;
    }

    const sd = plusSd - trendLine;
    if (!(sd > 0)) {
        return null;  // 通道寬度算不出來時當缺值，別讓它除出 Infinity
    }

    return (price - trendLine) / sd;
};

const readValue = {
    symbol: (stock) => (typeof stock?.symbol === 'string' ? stock.symbol : null),
    price: (stock) => (Number.isFinite(stock?.price) ? stock.price : null),
    sentiment: sentimentPosition
};

/**
 * @param {Array} stocks - 後端回傳的股票陣列（已按手動 sortOrder 排好）
 * @param {'symbol'|'price'|'sentiment'|null} key
 * @param {'asc'|'desc'|null} direction
 * @returns {Array} 排序後的新陣列；無排序時回傳原陣列
 */
export const sortStocks = (stocks, key, direction) => {
    if (!Array.isArray(stocks) || !key || !direction || !readValue[key]) {
        return stocks;
    }

    const read = readValue[key];
    const factor = direction === 'asc' ? 1 : -1;

    // 缺報價的股票在兩個方向都沉底。卡片上顯示的是「無資料」，
    // 讓它跟著 0 一起排會落在最恐懼那一端，那是假訊號。
    return [...stocks].sort((a, b) => {
        const left = read(a);
        const right = read(b);

        if (left === null && right === null) return 0;
        if (left === null) return 1;
        if (right === null) return -1;

        if (typeof left === 'string') {
            return factor * left.localeCompare(right, 'en');
        }
        return factor * (left - right);
    });
};
