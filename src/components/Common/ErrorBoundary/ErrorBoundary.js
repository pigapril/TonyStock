import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { withTranslation } from 'react-i18next';
import './ErrorBoundary.css';

class BaseErrorBoundary extends Component {
    constructor(props) {
        super(props);
        this.state = {
            hasError: false,
            error: null,
            errorInfo: null
        };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        this.setState({
            error,
            errorInfo
        });

        // 如果有提供錯誤處理函數，則調用它
        this.props.onError?.(error, errorInfo);
    }

    handleRetry = () => {
        this.setState({
            hasError: false,
            error: null,
            errorInfo: null
        });
        
        // 如果有提供重試函數，則調用它
        this.props.onRetry?.();
    };

    render() {
        const { hasError, error } = this.state;
        const { message, fallback, children, t } = this.props;

        // 如果有錯誤且提供了自定義的 fallback，則使用它
        if (hasError && fallback) {
            return fallback(error, this.handleRetry);
        }

        // 如果有錯誤，顯示預設的錯誤介面
        if (hasError) {
            return (
                <div className="error-boundary">
                    <h2>{t('errorBoundary.title')}</h2>
                    <p>{message || error?.message || t('errorBoundary.defaultMessage')}</p>
                    <button 
                        className="retry-button"
                        onClick={this.handleRetry}
                    >
                        {t('errorBoundary.retryButton')}
                    </button>
                </div>
            );
        }

        return children;
    }
}

BaseErrorBoundary.propTypes = {
    children: PropTypes.node.isRequired,
    message: PropTypes.string,
    onError: PropTypes.func,
    onRetry: PropTypes.func,
    fallback: PropTypes.func,
    t: PropTypes.func.isRequired,
};

// Wrap the component with withTranslation
export const ErrorBoundary = withTranslation()(BaseErrorBoundary); 