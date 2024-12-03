import React, { Component } from 'react';
import PropTypes from 'prop-types';
import './ErrorBoundary.css';

export class ErrorBoundary extends Component {
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
        const { message, fallback } = this.props;

        // 如果有錯誤且提供了自定義的 fallback，則使用它
        if (hasError && fallback) {
            return fallback(error, this.handleRetry);
        }

        // 如果有錯誤，顯示預設的錯誤介面
        if (hasError) {
            return (
                <div className="error-boundary">
                    <h2>很抱歉，發生了一些問題</h2>
                    <p>{message || error?.message || '發生未知錯誤'}</p>
                    <button 
                        className="retry-button"
                        onClick={this.handleRetry}
                    >
                        重試
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}

ErrorBoundary.propTypes = {
    children: PropTypes.node.isRequired,
    message: PropTypes.string,
    onError: PropTypes.func,
    onRetry: PropTypes.func,
    fallback: PropTypes.func
}; 