// 格式化價格
export const formatPrice = (price) => {
    if (!price && price !== 0) return '-';
    
    const numPrice = Number(price);
    
    if (numPrice >= 100) {
        return numPrice.toFixed(0);
    } else if (numPrice >= 10) {
        return numPrice.toFixed(0);
    } else {
        return numPrice.toFixed(2);
    }
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