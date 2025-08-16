/**
 * 錯誤顯示組件
 * 
 * 提供統一的錯誤顯示介面，支援多種顯示模式和互動功能
 * 
 * @author ECPay Integration Team
 * @version 1.0.0
 */

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import paymentErrorHandler from '../../utils/paymentErrorHandler';

// Simple SVG icons to replace heroicons
const ExclamationTriangleIcon = ({ className }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.268 18.5c-.77.833.192 2.5 1.732 2.5z" />
    </svg>
);

const XCircleIcon = ({ className }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
);

const InformationCircleIcon = ({ className }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
);

const ArrowPathIcon = ({ className }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
    </svg>
);

const XMarkIcon = ({ className }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
);

/**
 * 錯誤顯示組件
 */
const ErrorDisplay = ({
    error,
    mode = 'banner', // 'banner', 'modal', 'inline', 'toast'
    showRetry = true,
    showDismiss = true,
    showDetails = false,
    autoRetry = false,
    retryDelay = 3000,
    onRetry,
    onDismiss,
    onAction,
    className = '',
    ...props
}) => {
    const { t } = useTranslation();
    const [isRetrying, setIsRetrying] = useState(false);
    const [retryCountdown, setRetryCountdown] = useState(0);
    const [showDetailedInfo, setShowDetailedInfo] = useState(false);

    // 自動重試倒計時
    useEffect(() => {
        if (autoRetry && error?.recoverable && retryDelay > 0) {
            setRetryCountdown(Math.ceil(retryDelay / 1000));
            
            const interval = setInterval(() => {
                setRetryCountdown(prev => {
                    if (prev <= 1) {
                        clearInterval(interval);
                        handleRetry();
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);

            return () => clearInterval(interval);
        }
    }, [error, autoRetry, retryDelay]);

    if (!error) return null;

    /**
     * 處理重試
     */
    const handleRetry = async () => {
        if (isRetrying) return;
        
        setIsRetrying(true);
        setRetryCountdown(0);
        
        try {
            if (onRetry) {
                await onRetry();
            }
        } catch (retryError) {
            console.error('Retry failed:', retryError);
        } finally {
            setIsRetrying(false);
        }
    };

    /**
     * 處理關閉
     */
    const handleDismiss = () => {
        if (onDismiss) {
            onDismiss();
        }
    };

    /**
     * 處理操作按鈕點擊
     */
    const handleAction = (actionType) => {
        const suggestion = paymentErrorHandler.getActionSuggestion(actionType);
        
        if (onAction) {
            onAction(suggestion);
        } else if (suggestion.url) {
            window.location.href = suggestion.url;
        } else if (suggestion.action === 'retry') {
            handleRetry();
        } else if (suggestion.action === 'back') {
            window.history.back();
        }
    };

    /**
     * 獲取錯誤圖示
     */
    const getErrorIcon = () => {
        const iconClass = "h-5 w-5";
        
        switch (error.severity) {
            case 'error':
                return <XCircleIcon className={`${iconClass} text-red-500`} />;
            case 'warning':
                return <ExclamationTriangleIcon className={`${iconClass} text-yellow-500`} />;
            case 'info':
                return <InformationCircleIcon className={`${iconClass} text-blue-500`} />;
            default:
                return <XCircleIcon className={`${iconClass} text-red-500`} />;
        }
    };

    /**
     * 獲取錯誤樣式類
     */
    const getErrorClasses = () => {
        const baseClasses = "rounded-lg border p-4";
        const severityClasses = paymentErrorHandler.getSeverityColor(error.severity);
        
        const modeClasses = {
            banner: "w-full",
            modal: "max-w-md mx-auto",
            inline: "w-full",
            toast: "max-w-sm shadow-lg"
        };
        
        return `${baseClasses} ${severityClasses} ${modeClasses[mode]} ${className}`;
    };

    /**
     * 渲染重試按鈕
     */
    const renderRetryButton = () => {
        if (!showRetry || !error.recoverable) return null;

        return (
            <button
                onClick={handleRetry}
                disabled={isRetrying || retryCountdown > 0}
                className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {isRetrying && (
                    <ArrowPathIcon className="animate-spin -ml-1 mr-2 h-4 w-4" />
                )}
                {retryCountdown > 0 ? (
                    t('common.retryIn', { seconds: retryCountdown })
                ) : isRetrying ? (
                    t('common.retrying')
                ) : (
                    t('common.retry')
                )}
            </button>
        );
    };

    /**
     * 渲染操作按鈕
     */
    const renderActionButton = () => {
        if (!error.action) return null;

        const suggestion = paymentErrorHandler.getActionSuggestion(error.action);
        
        return (
            <button
                onClick={() => handleAction(error.action)}
                className={`inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                    suggestion.variant === 'primary'
                        ? 'text-white bg-blue-600 hover:bg-blue-700 focus:ring-blue-500'
                        : 'text-gray-700 bg-gray-200 hover:bg-gray-300 focus:ring-gray-500'
                }`}
            >
                {suggestion.text}
            </button>
        );
    };

    /**
     * 渲染關閉按鈕
     */
    const renderDismissButton = () => {
        if (!showDismiss) return null;

        return (
            <button
                onClick={handleDismiss}
                className="inline-flex text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
            >
                <XMarkIcon className="h-4 w-4" />
            </button>
        );
    };

    /**
     * 渲染錯誤詳情
     */
    const renderErrorDetails = () => {
        if (!showDetails && !showDetailedInfo) return null;

        return (
            <div className="mt-3 pt-3 border-t border-gray-200">
                <details className="text-xs text-gray-600">
                    <summary className="cursor-pointer hover:text-gray-800">
                        {t('common.technicalDetails')}
                    </summary>
                    <div className="mt-2 space-y-1">
                        <div><strong>{t('common.errorCode')}:</strong> {error.code}</div>
                        <div><strong>{t('common.timestamp')}:</strong> {new Date(error.timestamp).toLocaleString()}</div>
                        <div><strong>{t('common.context')}:</strong> {error.context}</div>
                        {error.originalMessage && (
                            <div><strong>{t('common.originalMessage')}:</strong> {error.originalMessage}</div>
                        )}
                    </div>
                </details>
            </div>
        );
    };

    // 模態框模式
    if (mode === 'modal') {
        return (
            <div className="fixed inset-0 z-50 overflow-y-auto" {...props}>
                <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
                    
                    <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
                        <div className="sm:flex sm:items-start">
                            <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
                                {getErrorIcon()}
                            </div>
                            <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left flex-1">
                                <h3 className="text-lg leading-6 font-medium text-gray-900">
                                    {error.title}
                                </h3>
                                <div className="mt-2">
                                    <p className="text-sm text-gray-500">
                                        {error.message}
                                    </p>
                                </div>
                                {renderErrorDetails()}
                            </div>
                        </div>
                        
                        <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse gap-2">
                            {renderRetryButton()}
                            {renderActionButton()}
                            {renderDismissButton()}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // 其他模式（banner, inline, toast）
    return (
        <div className={getErrorClasses()} {...props}>
            <div className="flex items-start">
                <div className="flex-shrink-0">
                    {getErrorIcon()}
                </div>
                
                <div className="ml-3 flex-1">
                    <h3 className="text-sm font-medium">
                        {error.title}
                    </h3>
                    <div className="mt-1 text-sm">
                        {error.message}
                    </div>
                    
                    {renderErrorDetails()}
                    
                    <div className="mt-3 flex items-center gap-2">
                        {renderRetryButton()}
                        {renderActionButton()}
                    </div>
                </div>
                
                <div className="ml-auto pl-3">
                    {renderDismissButton()}
                </div>
            </div>
        </div>
    );
};

/**
 * 錯誤邊界組件
 */
export class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        // 記錄錯誤到錯誤處理器
        paymentErrorHandler.handleError(error, 'error_boundary');
        
        console.error('Error Boundary caught an error:', error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <ErrorDisplay
                    error={{
                        code: 'COMPONENT_ERROR',
                        title: '組件錯誤',
                        message: '頁面組件發生錯誤，請重新整理頁面',
                        severity: 'error',
                        recoverable: true,
                        action: 'retry'
                    }}
                    mode="banner"
                    onRetry={() => {
                        this.setState({ hasError: false, error: null });
                        window.location.reload();
                    }}
                />
            );
        }

        return this.props.children;
    }
}

export default ErrorDisplay;