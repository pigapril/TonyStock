/**
 * Task 16: AdminPermissions Utility Logging Test
 * 
 * Test to verify the enhanced logging in the AdminPermissions utility
 */

import adminPermissions, { AdminPermissions } from '../utils/adminPermissions';
import apiClient from '../api/apiClient';

// Mock the API client
jest.mock('../api/apiClient', () => ({
    get: jest.fn()
}));

// Mock console methods
const mockConsole = {
    log: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
};

describe('Task 16: AdminPermissions Utility Logging', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        
        // Replace console methods with mocks
        console.log = mockConsole.log;
        console.info = mockConsole.info;
        console.warn = mockConsole.warn;
        console.error = mockConsole.error;
        
        // Clear any existing logs
        adminPermissions.clearLogs();
    });
    
    test('should log API calls with comprehensive details', async () => {
        // Mock successful API response
        apiClient.get.mockResolvedValue({
            status: 200,
            headers: { 'content-type': 'application/json' },
            data: {
                data: {
                    isAuthenticated: true,
                    isAdmin: true
                }
            }
        });
        
        // Clear previous logs
        mockConsole.info.mockClear();
        
        // Make API call
        const result = await adminPermissions.checkIsAdmin();
        
        expect(result).toBe(true);
        
        // Check that API call was logged
        const apiStartLogs = mockConsole.info.mock.calls.filter(call => 
            call[0] && call[0].includes('API_CALL_STARTED')
        );
        
        const apiSuccessLogs = mockConsole.info.mock.calls.filter(call => 
            call[0] && call[0].includes('API_CALL_SUCCESS')
        );
        
        expect(apiStartLogs.length).toBeGreaterThan(0);
        expect(apiSuccessLogs.length).toBeGreaterThan(0);
        
        // Verify log structure
        const startLog = apiStartLogs[0][1];
        expect(startLog.details).toMatchObject({
            callId: expect.any(Number),
            endpoint: '/api/auth/admin-status',
            method: 'GET',
            startTime: expect.any(Number),
            concurrentCalls: expect.any(Number)
        });
        
        const successLog = apiSuccessLogs[0][1];
        expect(successLog.details).toMatchObject({
            callId: expect.any(Number),
            responseTime: expect.any(Number),
            isAuthenticated: true,
            isAdmin: true,
            responseStatus: 200
        });
    });
    
    test('should log API errors with detailed analysis', async () => {
        // Mock API error
        const mockError = new Error('Network error');
        mockError.response = {
            status: 500,
            data: { error: 'Internal server error' },
            headers: { 'content-type': 'application/json' }
        };
        apiClient.get.mockRejectedValue(mockError);
        
        // Clear previous logs
        mockConsole.error.mockClear();
        
        // Make API call
        const result = await adminPermissions.checkIsAdmin();
        
        expect(result).toBe(false);
        
        // Check that error was logged
        const errorLogs = mockConsole.error.mock.calls.filter(call => 
            call[0] && call[0].includes('API_CALL_ERROR')
        );
        
        expect(errorLogs.length).toBeGreaterThan(0);
        
        const errorLog = errorLogs[0][1];
        expect(errorLog.details).toMatchObject({
            callId: expect.any(Number),
            responseTime: expect.any(Number),
            errorMessage: 'Network error',
            errorStatus: 500,
            serverError: true,
            networkError: false,
            authError: false,
            timeoutError: false,
            concurrentCallsAtStart: expect.any(Number),
            wasRaceCondition: expect.any(Boolean)
        });
    });
    
    test('should provide comprehensive debug information', () => {
        const debugInfo = adminPermissions.getDebugInfo();
        
        expect(debugInfo).toMatchObject({
            utility: expect.objectContaining({
                message: expect.any(String),
                version: expect.any(String),
                timestamp: expect.any(String)
            }),
            apiCalls: expect.objectContaining({
                totalCalls: expect.any(Number),
                activeCalls: expect.any(Number)
            }),
            logging: expect.objectContaining({
                totalLogs: expect.any(Number)
            }),
            raceConditions: expect.objectContaining({
                potentialRaceConditions: expect.any(Number)
            }),
            errors: expect.objectContaining({
                networkErrors: expect.any(Number),
                authErrors: expect.any(Number),
                serverErrors: expect.any(Number)
            })
        });
    });
    
    test('should track concurrent API calls for race condition detection', async () => {
        // Mock API response with delay
        apiClient.get.mockImplementation(() => 
            new Promise(resolve => setTimeout(() => resolve({
                status: 200,
                headers: {},
                data: { data: { isAuthenticated: true, isAdmin: true } }
            }), 100))
        );
        
        // Clear previous logs
        mockConsole.info.mockClear();
        mockConsole.warn.mockClear();
        
        // Make concurrent API calls
        const promises = [
            adminPermissions.checkIsAdmin(),
            adminPermissions.checkIsAdmin(),
            adminPermissions.checkIsAdmin()
        ];
        
        await Promise.all(promises);
        
        // Check for race condition detection in logs
        const allLogs = [
            ...mockConsole.info.mock.calls,
            ...mockConsole.warn.mock.calls
        ];
        
        const raceConditionLogs = allLogs.filter(call => 
            call[1] && call[1].details && call[1].details.raceConditionRisk === true
        );
        
        // At least some calls should have detected concurrent operations
        expect(raceConditionLogs.length).toBeGreaterThan(0);
    });
    
    test('should log authentication events', () => {
        // Clear previous logs
        mockConsole.info.mockClear();
        
        // Simulate login event
        const loginEvent = new CustomEvent('loginSuccess', { 
            detail: { userId: 'test-123' } 
        });
        window.dispatchEvent(loginEvent);
        
        // Check that login event was logged
        const loginLogs = mockConsole.info.mock.calls.filter(call => 
            call[0] && call[0].includes('AUTH_LOGIN_SUCCESS_EVENT')
        );
        
        expect(loginLogs.length).toBe(1);
        
        const loginLog = loginLogs[0][1];
        expect(loginLog.details).toMatchObject({
            eventType: 'loginSuccess',
            timestamp: expect.any(String),
            source: 'window_event'
        });
    });
    
    test('should provide recent logs access', async () => {
        // Make an API call to generate logs
        apiClient.get.mockResolvedValue({
            status: 200,
            headers: {},
            data: { data: { isAuthenticated: true, isAdmin: true } }
        });
        
        await adminPermissions.checkIsAdmin();
        
        // Get recent logs
        const recentLogs = adminPermissions.getRecentLogs(5);
        
        expect(Array.isArray(recentLogs)).toBe(true);
        expect(recentLogs.length).toBeGreaterThan(0);
        
        recentLogs.forEach(log => {
            expect(log).toMatchObject({
                timestamp: expect.any(String),
                relativeTime: expect.any(Number),
                level: expect.any(String),
                event: expect.any(String),
                details: expect.any(Object)
            });
        });
    });
    
    test('should provide performance metrics', async () => {
        // Make a few API calls to generate metrics
        apiClient.get.mockResolvedValue({
            status: 200,
            headers: {},
            data: { data: { isAuthenticated: true, isAdmin: true } }
        });
        
        await adminPermissions.checkIsAdmin();
        await adminPermissions.checkIsAdmin();
        
        const metrics = adminPermissions.getMetrics();
        
        expect(metrics).toMatchObject({
            totalLogs: expect.any(Number),
            apiCalls: expect.any(Number),
            errors: expect.any(Number),
            authEvents: expect.any(Number),
            uptime: expect.any(Number)
        });
        
        expect(metrics.totalLogs).toBeGreaterThan(0);
        expect(metrics.apiCalls).toBeGreaterThan(0);
    });
});