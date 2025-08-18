/**
 * Admin 診斷頁面
 * 用於調試 admin 權限狀態同步問題
 */

import React, { useEffect, useState } from 'react';
import { useAuth } from '../components/Auth/useAuth';
import { useAdminPermissions } from '../hooks/useAdminPermissions';

const AdminDiagnostic = () => {
    const authContext = useAuth();
    const adminPermissions = useAdminPermissions();
    const [diagnosticData, setDiagnosticData] = useState({});

    useEffect(() => {
        const interval = setInterval(() => {
            setDiagnosticData({
                timestamp: new Date().toISOString(),
                authContext: {
                    isAuthenticated: authContext.isAuthenticated,
                    hasUser: !!authContext.user,
                    userId: authContext.user?.id || authContext.user?.userId,
                    userEmail: authContext.user?.email,
                    isAdmin: authContext.isAdmin,
                    adminLoading: authContext.adminLoading,
                    loading: authContext.loading
                },
                adminPermissions: {
                    isAdmin: adminPermissions.isAdmin,
                    loading: adminPermissions.loading,
                    error: adminPermissions.error?.message,
                    shouldShowAdminFeatures: adminPermissions.shouldShowAdminFeatures()
                },
                debugInfo: adminPermissions.getDebugInfo ? adminPermissions.getDebugInfo() : null
            });
        }, 1000);

        return () => clearInterval(interval);
    }, [authContext, adminPermissions]);

    const handleRefreshAdminStatus = () => {
        if (adminPermissions.refreshAdminStatus) {
            adminPermissions.refreshAdminStatus();
        }
    };

    const handleCheckAuthStatus = () => {
        if (authContext.checkAuthStatus) {
            authContext.checkAuthStatus();
        }
    };

    return (
        <div style={{ padding: '20px', fontFamily: 'monospace' }}>
            <h1>🔍 Admin 權限診斷</h1>
            
            <div style={{ marginBottom: '20px' }}>
                <button onClick={handleRefreshAdminStatus} style={{ marginRight: '10px' }}>
                    刷新 Admin 狀態
                </button>
                <button onClick={handleCheckAuthStatus}>
                    刷新認證狀態
                </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div>
                    <h2>🔐 AuthContext 狀態</h2>
                    <pre style={{ background: '#f5f5f5', padding: '10px', borderRadius: '5px' }}>
                        {JSON.stringify(diagnosticData.authContext, null, 2)}
                    </pre>
                </div>

                <div>
                    <h2>👑 AdminPermissions Hook 狀態</h2>
                    <pre style={{ background: '#f5f5f5', padding: '10px', borderRadius: '5px' }}>
                        {JSON.stringify(diagnosticData.adminPermissions, null, 2)}
                    </pre>
                </div>
            </div>

            {diagnosticData.debugInfo && (
                <div style={{ marginTop: '20px' }}>
                    <h2>🐛 詳細調試信息</h2>
                    <pre style={{ background: '#f0f0f0', padding: '10px', borderRadius: '5px', fontSize: '12px' }}>
                        {JSON.stringify(diagnosticData.debugInfo, null, 2)}
                    </pre>
                </div>
            )}

            <div style={{ marginTop: '20px', padding: '10px', background: '#e8f4fd', borderRadius: '5px' }}>
                <h3>📊 狀態分析</h3>
                <ul>
                    <li>認證狀態: {diagnosticData.authContext?.isAuthenticated ? '✅ 已認證' : '❌ 未認證'}</li>
                    <li>AuthContext Admin: {diagnosticData.authContext?.isAdmin ? '✅ 是管理員' : '❌ 不是管理員'}</li>
                    <li>Hook Admin: {diagnosticData.adminPermissions?.isAdmin ? '✅ 是管理員' : '❌ 不是管理員'}</li>
                    <li>狀態同步: {diagnosticData.authContext?.isAdmin === diagnosticData.adminPermissions?.isAdmin ? '✅ 同步' : '❌ 不同步'}</li>
                    <li>應該顯示 Admin 功能: {diagnosticData.adminPermissions?.shouldShowAdminFeatures ? '✅ 是' : '❌ 否'}</li>
                </ul>
            </div>
        </div>
    );
};

export default AdminDiagnostic;
