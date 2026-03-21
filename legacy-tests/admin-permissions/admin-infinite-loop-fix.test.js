/**
 * 測試管理員權限無限循環修復
 * 
 * 這個測試驗證 AuthContext 和 useAdminPermissions 之間不會產生無限循環
 */

import React from 'react';
import { render, act, waitFor } from '@testing-library/react';
import { AuthProvider } from '../components/Auth/AuthContext';
import { useAdminPermissions } from '../hooks/useAdminPermissions';
import { BrowserRouter } from 'react-router-dom';

// Mock auth service
jest.mock('../components/Auth/auth.service', () => ({
    checkStatus: jest.fn(),
    checkAdminStatus: jest.fn(),
    logout: jest.fn()
}));

// Mock admin permissions utility
jest.mock('../utils/adminPermissions', () => ({
    checkIsAdmin: jest.fn(),
    getDebugInfo: jest.fn(() => ({}))
}));

// Mock CSRF client
jest.mock('../utils/csrfClient', () => ({
    isTokenInitialized: jest.fn(() => true),
    initializeCSRFToken: jest.fn(),
    clearCSRFToken: jest.fn(),
    setCSRFToken: jest.fn()
}));

// Mock analytics
jest.mock('../utils/analytics', () => ({
    Analytics: {
        auth: {
            login: jest.fn(),
            logout: jest.fn(),
            statusCheck: jest.fn(),
            identityService: {
                initialize: jest.fn(),
                buttonRender: jest.fn(),
                error: jest.fn()
            }
        }
    }
}));

// Mock auth diagnostics
jest.mock('../utils/authDiagnostics', () => ({
    authDiagnostics: {
        diagnoseAuthIssue: jest.fn()
    }
}));

// Test component that uses both AuthContext and useAdminPermissions
function TestComponent() {
    const adminPermissions = useAdminPermissions();
    
    return (
        <div>
            <div data-testid="is-admin">{adminPermissions.isAdmin.toString()}</div>
            <div data-testid="loading">{adminPermissions.loading.toString()}</div>
        </div>
    );
}

describe('Admin Infinite Loop Fix', () => {
    let authService;
    let adminPermissions;
    let consoleLogSpy;
    let consoleWarnSpy;
    
    beforeEach(() => {
        authService = require('../components/Auth/auth.service').default;
        adminPermissions = require('../utils/adminPermissions').default;
        
        // 監控控制台輸出
        consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
        consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
        
        // 清除 sessionStorage
        sessionStorage.clear();
        
        // 重置 mocks
        jest.clearAllMocks();
    });
    
    afterEach(() => {
        consoleLogSpy.mockRestore();
        consoleWarnSpy.mockRestore();
        sessionStorage.clear();
    });
    
    test('should not create infinite loop when user logs in', async () => {
        // 模擬用戶登入
        const mockUser = { id: 'user123', email: 'test@example.com' };
        
        authService.checkStatus.mockResolvedValue({ user: mockUser });
        authService.checkAdminStatus.mockResolvedValue({ isAdmin: true });
        adminPermissions.checkIsAdmin.mockResolvedValue(true);
        
        const { getByTestId } = render(
            <BrowserRouter>
                <AuthProvider>
                    <TestComponent />
                </AuthProvider>
            </BrowserRouter>
        );
        
        // 等待初始化完成
        await waitFor(() => {
            expect(getByTestId('loading')).toHaveTextContent('false');
        }, { timeout: 3000 });
        
        // 檢查管理員狀態是否正確設置
        expect(getByTestId('is-admin')).toHaveTextContent('true');
        
        // 驗證 API 調用次數合理（不應該有無限調用）
        expect(authService.checkAdminStatus).toHaveBeenCalledTimes(1);
        expect(adminPermissions.checkIsAdmin).toHaveBeenCalledTimes(0); // 應該使用 AuthContext 的結果
        
        // 檢查控制台輸出是否合理（不應該有大量重複日誌）
        const logCalls = consoleLogSpy.mock.calls.filter(call => 
            call[0] && call[0].includes && call[0].includes('useAdminPermissions')
        );
        
        // 日誌調用應該少於 10 次（之前會有數百次）
        expect(logCalls.length).toBeLessThan(10);
    });
    
    test('should not repeatedly check admin status for same user', async () => {
        const mockUser = { id: 'user123', email: 'test@example.com' };
        
        authService.checkStatus.mockResolvedValue({ user: mockUser });
        authService.checkAdminStatus.mockResolvedValue({ isAdmin: false });
        
        const { rerender } = render(
            <BrowserRouter>
                <AuthProvider>
                    <TestComponent />
                </AuthProvider>
            </BrowserRouter>
        );
        
        // 等待初始檢查完成
        await waitFor(() => {
            expect(authService.checkAdminStatus).toHaveBeenCalledTimes(1);
        });
        
        // 重新渲染組件（模擬狀態更新）
        rerender(
            <BrowserRouter>
                <AuthProvider>
                    <TestComponent />
                </AuthProvider>
            </BrowserRouter>
        );
        
        // 等待一段時間，確保沒有額外的 API 調用
        await act(async () => {
            await new Promise(resolve => setTimeout(resolve, 500));
        });
        
        // 驗證沒有重複的 API 調用
        expect(authService.checkAdminStatus).toHaveBeenCalledTimes(1);
    });
    
    test('should handle user change correctly', async () => {
        const mockUser1 = { id: 'user123', email: 'test1@example.com' };
        const mockUser2 = { id: 'user456', email: 'test2@example.com' };
        
        // 第一個用戶
        authService.checkStatus
            .mockResolvedValueOnce({ user: mockUser1 })
            .mockResolvedValueOnce({ user: mockUser2 });
        
        authService.checkAdminStatus
            .mockResolvedValueOnce({ isAdmin: true })
            .mockResolvedValueOnce({ isAdmin: false });
        
        const { getByTestId, rerender } = render(
            <BrowserRouter>
                <AuthProvider>
                    <TestComponent />
                </AuthProvider>
            </BrowserRouter>
        );
        
        // 等待第一個用戶的檢查完成
        await waitFor(() => {
            expect(getByTestId('is-admin')).toHaveTextContent('true');
        });
        
        // 模擬用戶切換
        rerender(
            <BrowserRouter>
                <AuthProvider>
                    <TestComponent />
                </AuthProvider>
            </BrowserRouter>
        );
        
        // 等待第二個用戶的檢查完成
        await waitFor(() => {
            expect(authService.checkAdminStatus).toHaveBeenCalledTimes(2);
        });
        
        // 驗證每個用戶只檢查一次
        expect(authService.checkAdminStatus).toHaveBeenCalledTimes(2);
    });
    
    test('should suppress excessive logging in production', async () => {
        // 模擬生產環境
        const originalEnv = process.env.NODE_ENV;
        process.env.NODE_ENV = 'production';
        
        try {
            const mockUser = { id: 'user123', email: 'test@example.com' };
            
            authService.checkStatus.mockResolvedValue({ user: mockUser });
            authService.checkAdminStatus.mockResolvedValue({ isAdmin: true });
            
            render(
                <BrowserRouter>
                    <AuthProvider>
                        <TestComponent />
                    </AuthProvider>
                </BrowserRouter>
            );
            
            // 等待初始化完成
            await waitFor(() => {
                expect(authService.checkAdminStatus).toHaveBeenCalled();
            });
            
            // 在生產環境中，useAdminPermissions 的日誌應該被抑制
            const adminPermissionsLogs = consoleLogSpy.mock.calls.filter(call => 
                call[0] && call[0].includes && call[0].includes('useAdminPermissions')
            );
            
            expect(adminPermissionsLogs.length).toBe(0);
            
        } finally {
            process.env.NODE_ENV = originalEnv;
        }
    });
});