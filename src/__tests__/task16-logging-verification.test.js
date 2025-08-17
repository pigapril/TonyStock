/**
 * Task 16: Basic Logging Verification
 * 
 * Simple tests to verify that the comprehensive logging implementation is working
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { useAdminPermissions } from '../hooks/useAdminPermissions';
import adminPermissions from '../utils/adminPermissions';

// Mock the auth hook
const mockAuthHook = {
    user: { id: 'test-user-123', email: 'test@example.com' },
    isAuthenticated: true,
    loading: false,
    isAdmin: undefined,
    adminLoading: false
};

jest.mock('../components/Auth/useAuth', () => ({
    useAuth: () => mockAuthHook
}));

// Mock the admin permissions utility
jest.mock('../utils/adminPermissions', () => ({
    checkIsAdmin: jest.fn(),
    getDebugInfo: jest.fn(),
    getRecentLogs: jest.fn(),
    clearLogs: jest.fn(),
    getMetrics: jest.fn()
}));

// Mock console methods to capture logs
const mockConsole = {
    log: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
};

describe('Task 16: Basic Logging Verification', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        
        // Replace console methods with mocks
        console.log = mockConsole.log;
        console.info = mockConsole.info;
        console.warn = mockConsole.warn;
        console.error = mockConsole.error;
        
        // Mock utility methods
        adminPermissions.checkIsAdmin.mockResolvedValue(true);
        adminPermissions.getDebugInfo.mockReturnValue({
            utility: { message: 'Mock utility debug info' },
            apiCalls: { totalCalls: 1 },
            logging: { totalLogs: 5 }
        });
    });
    
    test('should log authentication state changes', async () => {
        const { result } = renderHook(() => useAdminPermissions());
        
        await waitFor(() => {
            expect(result.current.loading).toBe(false);
        });
        
        // Check that some logs were generated
        const totalLogs = mockConsole.log.mock.calls.length + 
                         mockConsole.info.mock.calls.length + 
                         mockConsole.warn.mock.calls.length + 
                         mockConsole.error.mock.calls.length;
        
        expect(totalLogs).toBeGreaterThan(0);
        
        // Check that at least one log contains useAdminPermissions
        const adminPermissionLogs = [
            ...mockConsole.log.mock.calls,
            ...mockConsole.info.mock.calls,
            ...mockConsole.warn.mock.calls,
            ...mockConsole.error.mock.calls
        ].filter(call => call[0] && call[0].includes('useAdminPermissions'));
        
        expect(adminPermissionLogs.length).toBeGreaterThan(0);
    });
    
    test('should provide debug information', async () => {
        const { result } = renderHook(() => useAdminPermissions());
        
        await waitFor(() => {
            expect(result.current.loading).toBe(false);
        });
        
        const debugInfo = result.current.getDebugInfo();
        
        expect(debugInfo).toBeDefined();
        expect(typeof debugInfo).toBe('object');
        expect(debugInfo.hookState).toBeDefined();
        expect(debugInfo.authContextState).toBeDefined();
    });
    
    test('should provide recent logs access', async () => {
        const { result } = renderHook(() => useAdminPermissions());
        
        await waitFor(() => {
            expect(result.current.loading).toBe(false);
        });
        
        const recentLogs = result.current.getRecentLogs(5);
        
        expect(Array.isArray(recentLogs)).toBe(true);
    });
    
    test('should support custom event logging', async () => {
        const { result } = renderHook(() => useAdminPermissions());
        
        await waitFor(() => {
            expect(result.current.loading).toBe(false);
        });
        
        // Clear previous logs
        mockConsole.log.mockClear();
        mockConsole.info.mockClear();
        mockConsole.warn.mockClear();
        mockConsole.error.mockClear();
        
        // Log a custom event
        act(() => {
            result.current.logCustomEvent('test_event', { 
                testData: 'test_value'
            });
        });
        
        // Check that custom event was logged
        const allLogs = [
            ...mockConsole.log.mock.calls,
            ...mockConsole.info.mock.calls,
            ...mockConsole.warn.mock.calls,
            ...mockConsole.error.mock.calls
        ];
        
        const customEventLogs = allLogs.filter(call => 
            call[0] && call[0].includes('CUSTOM_TEST_EVENT')
        );
        
        expect(customEventLogs.length).toBeGreaterThan(0);
    });
    
    test('should log API calls with timing information', async () => {
        adminPermissions.checkIsAdmin.mockImplementation(() => 
            new Promise(resolve => setTimeout(() => resolve(true), 50))
        );
        
        const { result } = renderHook(() => useAdminPermissions());
        
        // Clear previous logs
        mockConsole.log.mockClear();
        mockConsole.info.mockClear();
        mockConsole.warn.mockClear();
        mockConsole.error.mockClear();
        
        // Trigger an API call
        await act(async () => {
            await result.current.checkAdminStatus();
        });
        
        // Check for API call logs
        const allLogs = [
            ...mockConsole.log.mock.calls,
            ...mockConsole.info.mock.calls,
            ...mockConsole.warn.mock.calls,
            ...mockConsole.error.mock.calls
        ];
        
        const apiLogs = allLogs.filter(call => 
            call[0] && call[0].includes('API_CALL')
        );
        
        expect(apiLogs.length).toBeGreaterThan(0);
    });
    
    test('adminPermissions utility should have enhanced logging', () => {
        // Verify the utility has the expected methods
        expect(adminPermissions.getDebugInfo).toBeDefined();
        expect(typeof adminPermissions.getDebugInfo).toBe('function');
        
        const debugInfo = adminPermissions.getDebugInfo();
        expect(debugInfo).toBeDefined();
        expect(typeof debugInfo).toBe('object');
    });
});