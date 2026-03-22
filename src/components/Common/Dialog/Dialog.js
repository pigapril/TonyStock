import React, { useCallback, useEffect, useId, useState } from 'react';
import { IoClose } from 'react-icons/io5';
import { useTranslation } from 'react-i18next';
import './Dialog.css';

export function Dialog({
    open,
    onClose,
    title,
    titleClassName = '',
    description,
    children,
    className = '',
    contentClassName = '',
    overlayClassName = '',
    maxWidth = 'md'
}) {
    const { t } = useTranslation();
    const [isClosing, setIsClosing] = useState(false);
    const titleId = useId();
    const descriptionId = useId();

    useEffect(() => {
        if (open) {
            setIsClosing(false);
        }
    }, [open]);

    const handleClose = useCallback(() => {
        if (!onClose) return;
        setIsClosing(true);
        setTimeout(() => {
            setIsClosing(false);
            onClose();
        }, 300);
    }, [onClose]);

    useEffect(() => {
        if (!open || typeof document === 'undefined') return undefined;

        const previousOverflow = document.body.style.overflow;
        const handleKeyDown = (event) => {
            if (event.key === 'Escape') {
                handleClose();
            }
        };

        document.body.style.overflow = 'hidden';
        window.addEventListener('keydown', handleKeyDown);

        return () => {
            document.body.style.overflow = previousOverflow;
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [open, handleClose]);

    if (!open && !isClosing) return null;

    return (
        <div
            className={[
                'dialog-overlay',
                isClosing && 'dialog-overlay--closing',
                overlayClassName
            ].filter(Boolean).join(' ')}
            onClick={(e) => {
                if (e.target === e.currentTarget) {
                    handleClose();
                }
            }}
        >
            <div
                className={[
                    'dialog',
                    `dialog--${maxWidth}`,
                    isClosing && 'dialog--closing',
                    className
                ].filter(Boolean).join(' ')}
                role="dialog"
                aria-labelledby={title ? titleId : undefined}
                aria-describedby={description ? descriptionId : undefined}
                aria-modal="true"
            >
                <button
                    className="dialog-close"
                    onClick={handleClose}
                    aria-label={t('dialog.closeAriaLabel')}
                >
                    <IoClose />
                </button>

                {title && (
                    <h2 id={titleId} className={`dialog-title ${titleClassName}`.trim()}>
                        {title}
                    </h2>
                )}

                {description && (
                    <div id={descriptionId} className="dialog-description">
                        {description}
                    </div>
                )}

                <div className={`dialog-content ${contentClassName}`.trim()}>
                    {children}
                </div>
            </div>
        </div>
    );
} 
