// 全站唯一的小數位數判準：數量級越大、小數位越少。
// 抽出來是為了讓不走 formatPrice（例如需要千分位）的地方也能用同一套規則，
// 而不是各自再寫一份門檻。
export const getDecimalPlaces = (value) => {
    const abs = Math.abs(Number(value));

    if (abs >= 100) return 0; // 100+ no decimal places
    if (abs >= 10) return 1;  // 10-99 max 1 decimal place
    if (abs >= 1) return 2;   // 1-9 max 2 decimal places
    return 3;                 // <1 max 3 decimal places
};

// 格式化價格
export const formatPrice = (price) => {
    if (!price && price !== 0) return '-';

    const numPrice = Number(price);

    // toFixed to restrict max length, parseFloat to strip unnecessary zeroes (e.g. 10.100 -> 10.1)
    return parseFloat(numPrice.toFixed(getDecimalPlaces(numPrice))).toString();
};

// 判斷是否接近支撐或壓力位
export const isNearEdge = (price, support, resistance) => {
    if (!price || !support || !resistance) {
        return { isNearUpper: false, isNearLower: false };
    }

    const upperThreshold = (resistance - support) * 0.1;
    const lowerThreshold = (resistance - support) * 0.1;

    return {
        isNearUpper: (resistance - price) <= upperThreshold,
        isNearLower: (price - support) <= lowerThreshold
    };
}; 