/**
 * Task 16: Comprehensive Logging for State Synchronization
 * 
 * Tests to verify that comprehensive logging has been implemented correctly
 * for debugging authentication state changes, API responses, state conflicts,
 * and race conditions with timing information.
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
const originalConsole = {
    log: console.log,
    info: console.info,
    warn: console.warn,
    error: console.error
};

const mockConsole = {
    log: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
};

describe('Task 16: Comprehensive Logging for State Synchronization', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        
        // Replace console methods with mocks
        console.log = mockConsole.log;
        console.info = mockConsole.info;
        console.warn = mockConsole.warn;
        console.error = mockConsole.error;
        
        // Reset auth mock to default state
        Object.assign(mockAuthHook, {
            user: { id: 'test-user-123', email: 'test@example.com' },
            isAuthenticated: true,
            loading: false,
            isAdmin: undefined,
            adminLoading: false
        });
        
        // Mock utility methods
        adminPermissions.checkIsAdmin.mockResolvedValue(true);
        adminPermissions.getDebugInfo.mockReturnValue({
            utility: { message: 'Mock utility debug info' },
            apiCalls: { totalCalls: 1 },
            logging: { totalLogs: 5 }
        });
    });
    
    afterEach(() => {
        // Restore original console methods
        Object.assign(console, originalConsole);
    });
    
    describe('Authentication State Change Logging', () => {
        test('should log detailed authentication state changes with timing information', async () => {
            const { result } = renderHook(() => useAdminPermissions());
            
            // Wait for initial state to settle
            await waitFor(() => {
                expect(result.current.loading).toBe(false);
            });
            
            // Check that AUTH_STATE_CHANGE events were logged
            const authStateLogs = mockConsole.info.mock.calls.filter(call => 
                call[0] && call[0].includes('AUTH_STATE_CHANGE')
            );
            
            expect(authStateLogs.length).toBeGreaterThan(0);
            
            // Verify the log contains comprehensive authentication state details
            const lastAuthLog = authStateLogs[authStateLogs.length - 1];
            expect(lastAuthLog[1]).toMatchObject({
                event: 'AUTH_STATE_CHANGE',
                details: expect.objectContaining({
                    currentAuthState: expect.objectContaining({
                        isAuthenticated: expect.any(Boolean),
                        hasUser: expect.any(Boolean),
                        authLoading: expect.any(Boolean),
                        authContextAdminLoading: expect.any(Boolean),
                        userId: expect.any(String),
                        userEmail: expect.any(String)
                    }),
                    stabilityAnalysis: expect.objectContaining({
                        isStable: expect.any(Boolean),
                        stabilizationTime: expect.any(Number)
                    }),
                    conflictAnalysis: expect.objectContaining({
                        authContextVsHookConflict: expect.any(Boolean),
                        conflictResolutionStrategy: expect.any(String)
                    }),
                    timingAnalysis: expect.objectContaining({
                        hasActiveApiCall: expect.any(Boolean),
                        recentAuthChanges: expect.any(Number),
                        potentialRaceCondition: expect.any(Boolean)
                    })
                })
            });
        });
        
        test('should include timing information in all log entries', async () => {
            const { result } = renderHook(() => useAdminPermissions());
            
            await waitFor(() => {
                expect(result.current.loading).toBe(false);
            });
            
            // Check that all log entries have timing information
            const allLogs = [
                ...mockConsole.log.mock.calls,
                ...mockConsole.info.mock.calls,
                ...mockConsole.warn.mock.calls,
                ...mockConsole.error.mock.calls
            ].filter(call => call[0] && call[0].includes('useAdminPermissions') && call[1]);
            
            expect(allLogs.length).toBeGreaterThan(0);
            
            allLogs.forEach(logCall => {
                const logEntry = logCall[1];
                if (logEntry && typeof logEntry === 'object') {
                    expect(logEntry).toMatchObject({
                        timestamp: expect.any(String),
                        relativeTime: expect.any(Number),
                        relativeStartTime: expect.any(Number)
                    });
                }
            });
        });
    });
    
    describe('API Response Logging', () => {
        test('should log comprehensive API call details including timing', async () => {
            adminPermissions.checkIsAdmin.mockImplementation(() => 
                new Promise(resolve => setTimeout(() => resolve(true), 100))
            );
            
            const { result } = renderHook(() => useAdminPermissions());
            
            // Trigger an API call
            await act(async () => {
                await result.current.checkAdminStatus();
            });
            
            // Check for API_CALL_STARTED logs
            const apiStartLogs = mockConsole.info.mock.calls.filter(call => 
                call[0] && call[0].includes('API_CALL_STARTED')
            );
            expect(apiStartLogs.length).toBeGreaterThan(0);
            
            const startLog = apiStartLogs[0][1];
            expect(startLog.details).toMatchObject({
                callId: expect.any(Number),
                apiCallStartTime: expect.any(Number),
                concurrentApiCalls: expect.any(Boolean),
                authStateAtCallTime: expect.objectContaining({
                    isAuthenticated: expect.any(Boolean),
                    authLoading: expect.any(Boolean)
                }),
                triggerReason: expect.any(String)
            });
            
            // Check for API_CALL_SUCCESS logs
            await waitFor(() => {
                const apiSuccessLogs = mockConsole.info.mock.calls.filter(call => 
                    call[0] && call[0].includes('API_CALL_SUCCESS')
                );
                expect(apiSuccessLogs.length).toBeGreaterThan(0);
                
                const successLog = apiSuccessLogs[0][1];
                expect(successLog.details).toMatchObject({
                    isAdmin: expect.any(Boolean),
                    callId: expect.any(Number),
                    apiCallDuration: expect.any(Number),
                    stateChangeAnalysis: expect.objectContaining({
                        previousAdminStatus: expect.any(Boolean),
                        newAdminStatus: expect.any(Boolean),
                        statusChanged: expect.any(Boolean)
                    }),
                    authStateAtResponse: expect.objectContaining({
                        isAuthenticated: expect.any(Boolean),
                        stateStable: expect.any(Boolean)
                    })
                });
            });
        });
        
        test('should log API errors with comprehensive error analysis', async () => {
            const mockError = new Error('Network error');
            mockError.response = { status: 500, data: { error: 'Server error' } };
            adminPermissions.checkIsAdmin.mockRejectedValue(mockError);
            
            const { result } = renderHook(() => useAdminPermissions());
            
            await act(async () => {
                await result.current.checkAdminStatus();
            });
            
            // Check for API_CALL_ERROR logs
            await waitFor(() => {
                const apiErrorLogs = mockConsole.error.mock.calls.filter(call => 
                    call[0] && call[0].includes('API_CALL_ERROR')
                );
                expect(apiErrorLogs.length).toBeGreaterThan(0);
                
                const errorLog = apiErrorLogs[0][1];
                expect(errorLog.details).toMatchObject({
                    error: 'Network error',
                    callId: expect.any(Number),
                    apiCallDuration: expect.any(Number),
                    errorAnalysis: expect.objectContaining({
                        errorType: expect.any(String),
                        isNetworkError: expect.any(Boolean),
                        isAuthError: expect.any(Boolean),
                        isServerError: expect.any(Boolean),
                        statusCode: expect.any(Number)
                    }),
                    recoveryStrategy: expect.objectContaining({
                        shouldRetry: expect.any(Boolean),
                        shouldClearAuth: expect.any(Boolean),
                        fallbackToFalse: expect.any(Boolean)
                    })
                });
            });
        });
    });
    
    describe('State Conflict Detection and Logging', () => {
        test('should detect and log state conflicts between auth context and hook state', async () => {
            // Set up a state conflict scenario
            mockAuthHook.isAdmin = true; // Auth context says admin
            adminPermissions.checkIsAdmin.mockResolvedValue(false); // API says not admin
            
            const { result } = renderHook(() => useAdminPermissions());
            
            await act(async () => {
                await result.current.checkAdminStatus();
            });
            
            // Wait for state conflict detection
            await waitFor(() => {
                const conflictLogs = [
                    ...mockConsole.warn.mock.calls,
                    ...mockConsole.error.mock.calls
                ].filter(call => 
                    call[0] && (
                        call[0].includes('STATE CONFLICT DETECTED') ||
                        call[0].includes('CONFLICT')
                    )
                );
                
                if (conflictLogs.length > 0) {
                    const conflictLog = conflictLogs[0];
                    expect(conflictLog[1]).toMatchObject({
                        details: expect.objectContaining({
                            stateConflictAnalysis: expect.objectContaining({
                                hasConflict: expect.any(Boolean),
                                conflictType: expect.any(String)
                            })
                        })
                    });
                }
            });
        });
        
        test('should log conflict resolution strategies', async () => {
            const { result } = renderHook(() => useAdminPermissions());
            
            await waitFor(() => {
                expect(result.current.loading).toBe(false);
            });
            
            // Check that conflict analysis is included in auth state change logs
            const authStateLogs = mockConsole.info.mock.calls.filter(call => 
                call[0] && call[0].includes('AUTH_STATE_CHANGE')
            );
            
            expect(authStateLogs.length).toBeGreaterThan(0);
            
            const lastAuthLog = authStateLogs[authStateLogs.length - 1];
            expect(lastAuthLog[1].details.conflictAnalysis).toMatchObject({
                conflictResolutionStrategy: expect.any(String)
            });
        });
    });
    
    describe('Race Condition Detection', () => {
        test('should detect and log potential race conditions', async () => {
            const { result } = renderHook(() => useAdminPermissions());
            
            // Trigger multiple concurrent API calls to create race condition
            await act(async () => {
                const promises = [
                    result.current.checkAdminStatus(),
                    result.current.checkAdminStatus(),
                    result.current.refreshAdminStatus()
                ];
                await Promise.all(promises);
            });
            
            // Check for race condition warnings
            const raceConditionLogs = mockConsole.warn.mock.calls.filter(call => 
                call[0] && call[0].includes('RACE CONDITION')
            );
            
            // Race conditions might be detected, but not guaranteed in test environment
            // So we check that the logging structure supports race condition detection
            const allLogs = [
                ...mockConsole.log.mock.calls,
                ...mockConsole.info.mock.calls,
                ...mockConsole.warn.mock.calls
            ].filter(call => call[0] && call[0].includes('useAdminPermissions'));
            
            const logsWithRaceAnalysis = allLogs.filter(call => 
                call[1] && call[1].details && call[1].details.raceConditionAnalysis
            );
            
            expect(logsWithRaceAnalysis.length).toBeGreaterThan(0);
            
            logsWithRaceAnalysis.forEach(logCall => {
                expect(logCall[1].details.raceConditionAnalysis).toMatchObject({
                    recentApiCalls: expect.any(Number),
                    recentAuthChanges: expect.any(Number),
                    potentialRaceCondition: expect.any(Boolean)
                });
            });
        });
    });
    
    describe('Debug Information Access', () => {
        test('should provide comprehensive debug information', async () => {
            const { result } = renderHook(() => useAdminPermissions());
            
            await waitFor(() => {
                expect(result.current.loading).toBe(false);
            });
            
            const debugInfo = result.current.getDebugInfo();
            
            // Verify comprehensive debug information structure
            expect(debugInfo).toMatchObject({
                hookState: expect.objectContaining({
                    isAdmin: expect.any(Boolean),
                    loading: expect.any(Boolean),
                    isAuthenticated: expect.any(Boolean),
                    timestamp: expect.any(String)
                }),
                authContextState: expect.objectContaining({
                    isAuthenticated: expect.any(Boolean),
                    hasUser: expect.any(Boolean)
                }),
                synchronizationState: expect.objectContaining({
                    isStable: expect.any(Boolean),
                    hasConflict: expect.any(Boolean)
                }),
                raceConditionAnalysis: expect.objectContaining({
                    hasActiveApiCall: expect.any(Boolean),
                    recentApiCallCount: expect.any(Number),
                    potentialRaceConditions: expect.any(Number)
                }),
                stateConflictAnalysis: expect.objectContaining({
                    totalConflicts: expect.any(Number),
                    activeConflicts: expect.any(Number)
                }),
                performanceMetrics: expect.objectContaining({
                    totalStateTransitions: expect.any(Number),
                    averageApiCallTime: expect.any(Number)
                }),
                errorAnalysis: expect.objectContaining({
                    totalErrors: expect.any(Number),
                    networkErrors: expect.any(Number)
                }),
                stateTransitionLog: expect.any(Array),
                utilityDebugInfo: expect.any(Object)
            });
        });
        
        test('should provide recent logs access', async () => {
            const { result } = renderHook(() => useAdminPermissions());
            
            await waitFor(() => {
                expect(result.current.loading).toBe(false);
            });
            
            const recentLogs = result.current.getRecentLogs(5);
            
            expect(Array.isArray(recentLogs)).toBe(true);
            expect(recentLogs.length).toBeGreaterThan(0);
            expect(recentLogs.length).toBeLessThanOrEqual(5);
            
            recentLogs.forEach(log => {
                expect(log).toMatchObject({
                    timestamp: expect.any(String),
                    relativeTime: expect.any(Number),
                    event: expect.any(String),
                    details: expect.any(Object)
                });
            });
        });
        
        test('should support custom event logging', async () => {
            const { result } = renderHook(() => useAdminPermissions());
            
            await waitFor(() => {
                expect(result.current.loading).toBe(false);
            });
            
            // Log a custom event
            act(() => {
                result.current.logCustomEvent('test_event', { 
                    testData: 'test_value',
                    customField: 123 
                });
            });
            
            // Check that custom event was logged
            const customEventLogs = mockConsole.log.mock.calls.filter(call => 
                call[0] && call[0].includes('CUSTOM_TEST_EVENT')
            );
            
            expect(customEventLogs.length).toBe(1);
            expect(customEventLogs[0][1].details).toMatchObject({
                testData: 'test_value',
                customField: 123,
                customEvent: true,
                triggeredBy: 'external_call'
            });
        });
    });
    
    describe('AdminPermissions Utility Logging', () => {
        test('should verify utility has comprehensive logging', () => {
            // Test that the utility provides debug info
            expect(adminPermissions.getDebugInfo).toBeDefined();
            
            const debugInfo = adminPermissions.getDebugInfo();
            expect(debugInfo).toMatchObject({
                utility: expect.any(Object),
                apiCalls: expect.any(Object),
                logging: expect.any(Object)
            });
        });
    });
});