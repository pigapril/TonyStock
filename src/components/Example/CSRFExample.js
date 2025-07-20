import React, { useState, useEffect } from 'react';
import csrfClient from '../../utils/csrfClient';

/**
 * CSRF保護使用範例組件
 * 展示如何在React應用程式中整合CSRF保護
 */
const CSRFExample = () => {
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [csrfStatus, setCsrfStatus] = useState('未初始化');
    const [tokenSource, setTokenSource] = useState('未知');

    useEffect(() => {
        // 組件載入時檢查CSRF token狀態
        checkCSRFStatus();
    }, []);

    /**
     * 檢查CSRF token狀態
     */
    const checkCSRFStatus = () => {
        if (csrfClient.isTokenInitialized()) {
            setCsrfStatus('已初始化');
            setTokenSource(window.__CSRF_TOKEN_SOURCE__ || '未知');
        } else {
            setCsrfStatus('未初始化');
            setTokenSource('未知');
        }
    };

    /**
     * 初始化CSRF token
     */
    const handleInitializeCSRF = async () => {
        setIsLoading(true);
        setMessage('正在初始化CSRF token...');

        try {
            await csrfClient.initializeCSRFToken();
            setMessage('CSRF token初始化成功！');
            setCsrfStatus('已初始化');
        } catch (error) {
            setMessage(`CSRF token初始化失敗: ${error.message}`);
            setCsrfStatus('初始化失敗');
        } finally {
            setIsLoading(false);
        }
    };

    /**
     * 執行受CSRF保護的POST請求範例
     */
    const handleProtectedPost = async () => {
        setIsLoading(true);
        setMessage('正在執行受CSRF保護的POST請求...');

        try {
            const response = await csrfClient.post('/api/example/protected-endpoint', {
                data: '這是一個受CSRF保護的請求',
                timestamp: new Date().toISOString()
            });

            if (response.ok) {
                const result = await response.json();
                setMessage(`POST請求成功: ${JSON.stringify(result)}`);
            } else {
                setMessage(`POST請求失敗: ${response.status} ${response.statusText}`);
            }
        } catch (error) {
            setMessage(`POST請求錯誤: ${error.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    /**
     * 執行受CSRF保護的PUT請求範例
     */
    const handleProtectedPut = async () => {
        setIsLoading(true);
        setMessage('正在執行受CSRF保護的PUT請求...');

        try {
            const response = await csrfClient.put('/api/example/protected-endpoint/123', {
                data: '這是一個受CSRF保護的PUT請求',
                timestamp: new Date().toISOString()
            });

            if (response.ok) {
                const result = await response.json();
                setMessage(`PUT請求成功: ${JSON.stringify(result)}`);
            } else {
                setMessage(`PUT請求失敗: ${response.status} ${response.statusText}`);
            }
        } catch (error) {
            setMessage(`PUT請求錯誤: ${error.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    /**
     * 執行受CSRF保護的DELETE請求範例
     */
    const handleProtectedDelete = async () => {
        setIsLoading(true);
        setMessage('正在執行受CSRF保護的DELETE請求...');

        try {
            const response = await csrfClient.delete('/api/example/protected-endpoint/123');

            if (response.ok) {
                const result = await response.json();
                setMessage(`DELETE請求成功: ${JSON.stringify(result)}`);
            } else {
                setMessage(`DELETE請求失敗: ${response.status} ${response.statusText}`);
            }
        } catch (error) {
            setMessage(`DELETE請求錯誤: ${error.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    /**
     * 清除CSRF token
     */
    const handleClearCSRF = () => {
        csrfClient.clearCSRFToken();
        setMessage('CSRF token已清除');
        setCsrfStatus('未初始化');
    };

    /**
     * 測試無CSRF保護的請求（應該失敗）
     */
    const handleUnprotectedRequest = async () => {
        setIsLoading(true);
        setMessage('正在執行無CSRF保護的請求（應該失敗）...');

        try {
            // 先檢查用戶是否已登入
            const authResponse = await fetch(`${process.env.REACT_APP_API_BASE_URL}/api/auth/status`, {
                method: 'GET',
                credentials: 'include'
            });

            if (!authResponse.ok) {
                setMessage('❌ 需要先登入才能測試CSRF保護。請先登入後再測試。');
                return;
            }

            const authData = await authResponse.json();
            if (!authData.data.isAuthenticated) {
                setMessage('❌ 需要先登入才能測試CSRF保護。請先登入後再測試。\n\n測試步驟：\n1. 先登入您的帳戶\n2. 然後再次點擊「測試無CSRF保護」按鈕\n3. 如果返回 403 錯誤，表示CSRF保護正常工作');
                return;
            }

            setMessage('✅ 用戶已登入，正在測試無CSRF token的請求...');

            // 發送無CSRF token的POST請求（用戶已登入）
            const response = await fetch(`${process.env.REACT_APP_API_BASE_URL}/api/example/protected-endpoint`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    data: '這是一個無CSRF保護的請求',
                    timestamp: new Date().toISOString()
                }),
                credentials: 'include'
            });

            if (response.status === 403) {
                setMessage('✅ 無CSRF保護的請求被正確拒絕（403 Forbidden）');
            } else if (response.status === 401) {
                setMessage('❌ 請求被拒絕：需要認證（401 Unauthorized）');
            } else if (response.status === 404) {
                setMessage('❌ 端點不存在（404 Not Found）');
            } else {
                setMessage(`❌ 無CSRF保護的請求意外成功: ${response.status}`);
            }
        } catch (error) {
            setMessage(`無CSRF保護請求錯誤: ${error.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    // 在 setCSRFToken 時設置來源
    csrfClient.setCSRFToken = function(token) {
        if (token) {
            this.csrfToken = token;
            this.isInitialized = true;
            window.__CSRF_TOKEN_SOURCE__ = '登入回傳';
            console.log('CSRF token set directly from login response');
        }
    };
    // 在 initializeCSRFToken 時設置來源
    const originalInit = csrfClient.initializeCSRFToken.bind(csrfClient);
    csrfClient.initializeCSRFToken = async function() {
        const token = await originalInit();
        window.__CSRF_TOKEN_SOURCE__ = '刷新端點';
        return token;
    };

    return (
        <div className="csrf-example">
            <h2>CSRF保護機制範例</h2>
            
            <div className="csrf-status">
                <h3>CSRF Token狀態</h3>
                <p>狀態: <span className={`status ${csrfStatus === '已初始化' ? 'success' : 'warning'}`}>
                    {csrfStatus}
                </span></p>
                <p>來源: <span className="token-source">{tokenSource}</span></p>
                {csrfClient.isTokenInitialized() && (
                    <p>Token: <code>{csrfClient.getCSRFToken()?.substring(0, 20)}...</code></p>
                )}
            </div>

            <div className="csrf-actions">
                <h3>CSRF Token管理</h3>

                <button onClick={checkCSRFStatus} className="btn btn-info">
                </button>

                <button 
                    onClick={handleInitializeCSRF}
                    disabled={isLoading || csrfClient.isTokenInitialized()}
                    className="btn btn-primary"
                >
                    初始化CSRF Token
                </button>
                
                <button 
                    onClick={handleClearCSRF}
                    disabled={isLoading || !csrfClient.isTokenInitialized()}
                    className="btn btn-secondary"
                >
                    清除CSRF Token
                </button>
            </div>

            <div className="csrf-tests">
                <h3>受CSRF保護的請求測試</h3>
                <button 
                    onClick={handleProtectedPost}
                    disabled={isLoading || !csrfClient.isTokenInitialized()}
                    className="btn btn-success"
                >
                    測試POST請求
                </button>
                
                <button 
                    onClick={handleProtectedPut}
                    disabled={isLoading || !csrfClient.isTokenInitialized()}
                    className="btn btn-info"
                >
                    測試PUT請求
                </button>
                
                <button 
                    onClick={handleProtectedDelete}
                    disabled={isLoading || !csrfClient.isTokenInitialized()}
                    className="btn btn-danger"
                >
                    測試DELETE請求
                </button>
            </div>

            <div className="csrf-security-test">
                <h3>安全性測試</h3>
                <button 
                    onClick={handleUnprotectedRequest}
                    disabled={isLoading}
                    className="btn btn-warning"
                >
                    測試無CSRF保護請求（應該失敗）
                </button>
            </div>

            <div className="csrf-message">
                <h3>操作結果</h3>
                <div className="message-box">
                    {message || '等待操作...'}
                </div>
            </div>

            <div className="csrf-info">
                <h3>使用說明</h3>
                <ul>
                    <li>首先點擊「初始化CSRF Token」來獲取CSRF token</li>
                    <li>初始化成功後，可以測試各種受CSRF保護的請求</li>
                    <li>「測試無CSRF保護請求」應該返回403錯誤，證明保護機制正常運作</li>
                    <li>CSRF token會自動包含在所有狀態改變的請求中</li>
                    <li>登出時會自動清除CSRF token</li>
                </ul>
            </div>

            <style jsx>{`
                .csrf-example {
                    max-width: 800px;
                    margin: 0 auto;
                    padding: 20px;
                }
                
                .csrf-status, .csrf-actions, .csrf-tests, .csrf-security-test, .csrf-message, .csrf-info {
                    margin-bottom: 20px;
                    padding: 15px;
                    border: 1px solid #ddd;
                    border-radius: 5px;
                }
                
                .status {
                    font-weight: bold;
                }
                
                .status.success {
                    color: green;
                }
                
                .status.warning {
                    color: orange;
                }
                
                .btn {
                    margin: 5px;
                    padding: 8px 16px;
                    border: none;
                    border-radius: 4px;
                    cursor: pointer;
                }
                
                .btn:disabled {
                    opacity: 0.6;
                    cursor: not-allowed;
                }
                
                .btn-primary { background-color: #007bff; color: white; }
                .btn-secondary { background-color: #6c757d; color: white; }
                .btn-success { background-color: #28a745; color: white; }
                .btn-info { background-color: #17a2b8; color: white; }
                .btn-danger { background-color: #dc3545; color: white; }
                .btn-warning { background-color: #ffc107; color: black; }
                
                .message-box {
                    background-color: #f8f9fa;
                    padding: 10px;
                    border-radius: 4px;
                    min-height: 50px;
                    font-family: monospace;
                }
                
                code {
                    background-color: #f1f1f1;
                    padding: 2px 4px;
                    border-radius: 3px;
                }
            `}</style>
        </div>
    );
};

export default CSRFExample; 