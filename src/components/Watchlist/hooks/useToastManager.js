import { useState, useCallback } from 'react';

export function useToastManager() {
    const [toast, setToast] = useState(null);

    const showToast = useCallback((message, type = 'info') => {
        setToast({ message, type });
    }, []);

    const hideToast = useCallback(() => {
        requestAnimationFrame(() => {
            setToast(null);
        });
    }, []);

    return {
        toast,
        showToast,
        hideToast
    };
} 