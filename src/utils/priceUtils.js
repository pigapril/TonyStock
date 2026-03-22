// 格式化價格
export const formatPrice = (price) => {
    if (!price && price !== 0) return '-';

    const numPrice = Number(price);
    const absPrice = Math.abs(numPrice);

    let decimals;
    if (absPrice >= 100) {
        decimals = 0; // 100+ no decimal places
    } else if (absPrice >= 10) {
        decimals = 1; // 10-99 max 1 decimal place
    } else if (absPrice >= 1) {
        decimals = 2; // 1-9 max 2 decimal places
    } else {
        decimals = 3; // <1 max 3 decimal places
    }

    // toFixed to restrict max length, parseFloat to strip unnecessary zeroes (e.g. 10.100 -> 10.1)
    return parseFloat(numPrice.toFixed(decimals)).toString();
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