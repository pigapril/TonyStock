import React, { useEffect } from 'react';
import PropTypes from 'prop-types';
import '../styles/Toast.css';

export const Toast = ({ message, type, onClose }) => {
    useEffect(() => {
        const timer = setTimeout(() => {
            onClose();
        }, 4000);  // 保持 2 秒的顯示時間
        
        return () => clearTimeout(timer);
    }, [onClose]);

    return (
        <div className={`toast toast-${type}`}>
            {message}
        </div>
    );
};

Toast.propTypes = {
    message: PropTypes.string.isRequired,
    type: PropTypes.oneOf(['success', 'error', 'warning', 'info']).isRequired,
    onClose: PropTypes.func.isRequired
}; 