import { useCallback } from 'react';

/**
 * 通用拖拉排序 Hook
 * @param {Array} items - 要排序的項目陣列
 * @param {Function} onReorder - 排序完成後的回調，接收排序資料陣列
 * @returns {Object} 包含 handleDragEnd 處理器
 */
export const useReorder = (items, onReorder) => {
    const handleDragEnd = useCallback((result) => {
        // 如果沒有有效的拖放目標，不做任何事
        if (!result.destination) {
            return;
        }

        // 如果位置沒有改變，不做任何事
        if (result.destination.index === result.source.index) {
            return;
        }

        // 重新排列項目陣列
        const reorderedItems = Array.from(items);
        const [removed] = reorderedItems.splice(result.source.index, 1);
        reorderedItems.splice(result.destination.index, 0, removed);

        // 建立排序資料
        const orders = reorderedItems.map((item, index) => ({
            id: item.id,
            sortOrder: index
        }));

        // 呼叫排序回調
        if (onReorder) {
            onReorder(orders, reorderedItems);
        }
    }, [items, onReorder]);

    return { handleDragEnd };
};

export default useReorder;
