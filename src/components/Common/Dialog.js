import React from 'react';
import './styles/Dialog.css';

export function Dialog({ 
    open, 
    onClose, 
    title, 
    titleClassName, 
    description, 
    children 
}) {
    if (!open) return null;

    return (
        <div 
            className="dialog-overlay"
            onClick={(e) => {
                if (e.target === e.currentTarget) {
                    onClose();
                }
            }}
        >
            <div 
                className="dialog"
                role="dialog"
                aria-labelledby="dialog-title"
                aria-describedby="dialog-description"
                aria-modal="true"
            >
                <button 
                    className="dialog-close"
                    onClick={onClose}
                    aria-label="關閉對話框"
                >
                    ✕
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