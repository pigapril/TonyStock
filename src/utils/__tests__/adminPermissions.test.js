/**
 * Admin Permissions Utility Tests
 * 
 * Tests for the frontend admin permissions utility class.
 * Covers API integration, caching, error handling, and session management.
 */

// Mock dependencies first
const mockApiClient = {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn()
};

const mockHandleApiError = jest.fn();

jest.mock('../../api/apiClient', () => mockApiClient);
jest.mock('../errorHandler', () => ({
    handleApiError: mockHandleApiError
}));

// Import after mocking
const { AdminPermissions } = require('../adminPermissions');

describe('AdminPermissions', () => {
    let adminPermissions;
    
    beforeEach(() => {
        adminPermissions = new AdminPermissions();
        jest.clearAllMocks();
        
        // Reset instance state
        adminPermissions.adminStatus = null;
        adminPermissions.loading = false;
        adminPermissions.lastCheck = null;
        adminPermissions.listeners.clear();
        
        // Mock console methods to reduce test noise
        jest.spyOn(console, 'log').mockImplementation(() => {});
        jest.spyOn(console, 'warn').mockImplementation(() => {});
        jest.spyOn(console, 'error').mockImplementation(() => {});
    });
    
    afterEach(() => {
        jest.restoreAllMocks();
    });
    
    describe('checkIsAdmin', () => {
        it('should return true when user is admin', async () => {
            // Arrange
            const mockResponse = {
                data: {
                    data: {
                        isAuthenticated: true,
                        isAdmin: true
                    }
                }
            };
            mockApiClient.get.mockResolvedValue(mockResponse);
            
            // Act
            const result = await adminPermissions.checkIsAdmin();
            
            // Assert
            expect(result).toBe(true);
            expect(adminPermissions.adminStatus).toBe(true);
            expect(adminPermissions.lastCheck).toBeTruthy();
            expect(mockApiClient.get).toHaveBeenCalledWith('/api/auth/admin-status');
        });
        
        it('should return false when user is not admin', async () => {
            // Arrange
            const mockResponse = {
                data: {
                    data: {
                        isAuthenticated: true,
                        isAdmin: false
                    }
                }
            };
            mockApiClient.get.mockResolvedValue(mockResponse);
            
            // Act
            const result = await adminPermissions.checkIsAdmin();
            
            // Assert
            expect(result).toBe(false);
            expect(adminPermissions.adminStatus).toBe(false);
        });
        
        it('should use cached result when cache is valid', async () => {
            // Arrange
            adminPermissions.adminStatus = true;
            adminPermissions.lastCheck = Date.now();
            
            // Act
            const result = await adminPermissions.checkIsAdmin();
            
            // Assert
            expect(result).toBe(true);
            expect(mockApiClient.get).not.toHaveBeenCalled();
        });
        
        it('should handle network errors gracefully', async () => {
            // Arrange
            const networkError = new Error('Network Error');
            networkError.code = 'ERR_NETWORK';
            mockApiClient.get.mockRejectedValue(networkError);
            mockHandleApiError.mockReturnValue(networkError);
            
            // Set existing status to test fallback
            adminPermissions.adminStatus = true;
            adminPermissions.lastCheck = Date.now() - (6 * 60 * 1000);
            
            // Act
            const result = await adminPermissions.checkIsAdmin();
            
            // Assert
            expect(result).toBe(true); // Should maintain existing status
            expect(mockHandleApiError).toHaveBeenCalledWith(networkError);
        });
    });
    
    describe('isCurrentUserAdmin', () => {
        it('should return cached admin status when valid', () => {
            // Arrange
            adminPermissions.adminStatus = true;
            adminPermissions.lastCheck = Date.now();
            
            // Act
            const result = adminPermissions.isCurrentUserAdmin();
            
            // Assert
            expect(result).toBe(true);
        });
        
        it('should return false when no cached status', () => {
            // Act
            const result = adminPermissions.isCurrentUserAdmin();
            
            // Assert
            expect(result).toBe(false);
        });
    });
    
    describe('shouldShowAdminFeatures', () => {
        it('should return true when user is admin', () => {
            // Arrange
            adminPermissions.adminStatus = true;
            adminPermissions.lastCheck = Date.now();
            
            // Act
            const result = adminPermissions.shouldShowAdminFeatures();
            
            // Assert
            expect(result).toBe(true);
        });
        
        it('should return false when user is not admin', () => {
            // Arrange
            adminPermissions.adminStatus = false;
            adminPermissions.lastCheck = Date.now();
            
            // Act
            const result = adminPermissions.shouldShowAdminFeatures();
            
            // Assert
            expect(result).toBe(false);
        });
    });
    
    describe('cache management', () => {
        it('should clear cache correctly', () => {
            // Arrange
            adminPermissions.adminStatus = true;
            adminPermissions.lastCheck = Date.now();
            adminPermissions.loading = true;
            
            const listener = jest.fn();
            adminPermissions.addListener(listener);
            
            // Act
            adminPermissions.clearCache();
            
            // Assert
            expect(adminPermissions.adminStatus).toBe(null);
            expect(adminPermissions.lastCheck).toBe(null);
            expect(adminPermissions.loading).toBe(false);
            expect(listener).toHaveBeenCalledWith(null);
        });
        
        it('should validate cache correctly', () => {
            // Test valid cache
            adminPermissions.adminStatus = true;
            adminPermissions.lastCheck = Date.now();
            expect(adminPermissions.isCacheValid()).toBe(true);
            
            // Test expired cache
            adminPermissions.lastCheck = Date.now() - (6 * 60 * 1000);
            expect(adminPermissions.isCacheValid()).toBe(false);
            
            // Test no cache
            adminPermissions.adminStatus = null;
            adminPermissions.lastCheck = null;
            expect(adminPermissions.isCacheValid()).toBe(false);
        });
    });
    
    describe('listener management', () => {
        it('should add and remove listeners correctly', () => {
            // Arrange
            const listener1 = jest.fn();
            const listener2 = jest.fn();
            
            // Act
            adminPermissions.addListener(listener1);
            adminPermissions.addListener(listener2);
            
            // Assert
            expect(adminPermissions.listeners.size).toBe(2);
            
            // Act
            adminPermissions.removeListener(listener1);
            
            // Assert
            expect(adminPermissions.listeners.size).toBe(1);
            expect(adminPermissions.listeners.has(listener2)).toBe(true);
        });
    });
    
    describe('debug functionality', () => {
        it('should return correct debug information', () => {
            // Arrange
            adminPermissions.adminStatus = true;
            adminPermissions.loading = false;
            adminPermissions.lastCheck = Date.now();
            adminPermissions.addListener(() => {});
            
            // Act
            const debugInfo = adminPermissions.getDebugInfo();
            
            // Assert
            expect(debugInfo).toEqual({
                adminStatus: true,
                loading: false,
                lastCheck: expect.any(Number),
                cacheValid: true,
                cacheAge: expect.any(Number),
                listenersCount: 1
            });
        });
    });
});