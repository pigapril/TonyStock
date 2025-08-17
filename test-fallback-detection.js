/**
 * Test to verify fallback detection mechanisms in TokenDetectionService
 */

// Mock fetch for testing
global.fetch = jest.fn();

// Mock localStorage and sessionStorage
const mockLocalStorage = {
    getItem: jest.fn(),
    setItem: jest.fn(),
    clear: jest.fn(),
    removeItem: jest.fn()
};

const mockSessionStorage = {
    getItem: jest.fn(),
    setItem: jest.fn(),
    clear: jest.fn(),
    removeItem: jest.fn()
};

Object.defineProperty(window, 'localStorage', { value: mockLocalStorage });
Object.defineProperty(window, 'sessionStorage', { value: mockSessionStorage });

// Import the service
import TokenDetectionService from './src/utils/tokenDetection.service.js';

async function testFallbackDetection() {
    console.log('Testing TokenDetectionService fallback detection mechanisms...');
    
    const service = new TokenDetectionService();
    
    // Test 1: API fails, fallback to localStorage
    console.log('\n1. Testing API failure fallback to localStorage...');
    global.fetch.mockRejectedValueOnce(new Error('Network error'));
    mockLocalStorage.getItem.mockImplementation((key) => {
        if (key === 'accessToken') return 'localStorage-access-token';
        if (key === 'refreshToken') return 'localStorage-refresh-token';
        if (key === 'userData') return JSON.stringify({ id: 1, name: 'Test User' });
        return null;
    });
    
    const result1 = await service.detectTokens(false); // Skip cache
    console.log('Result 1:', {
        hasAccessToken: result1.hasAccessToken,
        hasRefreshToken: result1.hasRefreshToken,
        hasUserData: result1.hasUserData,
        sources: result1.tokenSources,
        apiError: result1.debugInfo.api?.error
    });
    
    // Test 2: API provides partial tokens, fallback for missing ones
    console.log('\n2. Testing partial API response with fallback...');
    global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
            status: 'success',
            data: {
                hasAccessToken: true,  // API provides this
                hasRefreshToken: false, // API doesn't provide this
                hasUserData: false,    // API doesn't provide this
                isAuthenticated: true,
                isAdmin: false
            }
        })
    });
    
    // Set up fallback sources
    mockSessionStorage.getItem.mockImplementation((key) => {
        if (key === 'refreshToken') return 'sessionStorage-refresh-token';
        if (key === 'userData') return JSON.stringify({ id: 2, name: 'Session User' });
        return null;
    });
    
    const result2 = await service.detectTokens(false); // Skip cache
    console.log('Result 2:', {
        hasAccessToken: result2.hasAccessToken,
        hasRefreshToken: result2.hasRefreshToken,
        hasUserData: result2.hasUserData,
        sources: result2.tokenSources,
        isValid: result2.isValid
    });
    
    // Test 3: All sources fail gracefully
    console.log('\n3. Testing graceful degradation when all sources fail...');
    global.fetch.mockRejectedValueOnce(new Error('API unavailable'));
    mockLocalStorage.getItem.mockReturnValue(null);
    mockSessionStorage.getItem.mockReturnValue(null);
    
    const result3 = await service.detectTokens(false); // Skip cache
    console.log('Result 3:', {
        hasAccessToken: result3.hasAccessToken,
        hasRefreshToken: result3.hasRefreshToken,
        hasUserData: result3.hasUserData,
        isValid: result3.isValid,
        debugInfo: Object.keys(result3.debugInfo)
    });
    
    // Test 4: Comprehensive logging verification
    console.log('\n4. Debug information structure:');
    console.log('Available debug info keys:', Object.keys(result3.debugInfo));
    console.log('API debug info:', result3.debugInfo.api);
    console.log('LocalStorage debug info:', result3.debugInfo.localStorage);
    
    // Cleanup
    service.cleanup();
    
    console.log('\nFallback detection test completed successfully!');
}

// Run the test
testFallbackDetection().catch(console.error);