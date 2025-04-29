import { createContext, useState, useCallback } from 'react';
import { Analytics } from '../../../utils/analytics';

export const DialogContext = createContext(null);

export function DialogProvider({ children }) {
    const [dialog, setDialog] = useState({
        type: null,
        isOpen: false,
        props: {}
    });

    const openDialog = useCallback((type, props = {}) => {
        setDialog({
            type,
            isOpen: true,
            props
        });
        if (Analytics.ui && Analytics.ui.dialog) {
            Analytics.ui.dialog.open({ type, ...props });
        }
    }, []);

    const closeDialog = useCallback(() => {
        setDialog(prev => ({
            ...prev,
            isOpen: false
        }));
        if (Analytics.ui && Analytics.ui.dialog) {
            Analytics.ui.dialog.close({ type: dialog.type });
        }
    }, [dialog.type]);

    const value = {
        dialog,
        openDialog,
        closeDialog
    };

    return (
        <DialogContext.Provider value={value}>
            {children}
        </DialogContext.Provider>
    );
} 