import React, { useState, useEffect } from 'react';
import { IoArrowBack } from 'react-icons/io5';
import { useTranslation } from 'react-i18next';
import './Dialog.css';

export function Dialog({ 
    open, 
    onClose, 
    title, 
    titleClassName, 
    description, 
    children 
}) {
    const { t } = useTranslation();
    const [isClosing, setIsClosing] = useState(false);

    useEffect(() => {
        if (open) {
            setIsClosing(false);
        }
    }, [open]);

    const handleClose = () => {
        setIsClosing(true);
        setTimeout(() => {
            setIsClosing(false);
            onClose();
        }, 300);
    };

    if (!open && !isClosing) return null;

    return (
        <div 
            className={`dialog-overlay ${isClosing ? 'dialog-overlay--closing' : ''}`}
            onClick={(e) => {
                if (e.target === e.currentTarget) {
                    handleClose();
                }
            }}
        >
            <div 
                className={`dialog ${isClosing ? 'dialog--closing' : ''}`}
                role="dialog"
                aria-labelledby="dialog-title"
                aria-describedby="dialog-description"
                aria-modal="true"
            >
                <button 
                    className="dialog-close"
                    onClick={handleClose}
                    aria-label={t('dialog.closeAriaLabel')}
                >
                    <IoArrowBack />
                </button>
                
                <h2 id="dialog-title" className={`dialog-title ${titleClassName || ''}`}>
                    {title}
                </h2>
                
                {description && (
                    <div id="dialog-description" className="dialog-description">
                        {description}
                    </div>
                )}

                <div className="dialog-content">
                    {children}
                </div>
            </div>
        </div>
    );
} 