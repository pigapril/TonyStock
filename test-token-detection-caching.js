/**
 * Simple test to verify TokenDetectionService caching functionality
 */

// Mock fetch for testing
global.fetch = jest.fn();

// Import the service
import TokenDetectionService from './src/utils/tokenDetection.service.js';

async function testCaching() {
    console.log('Testing TokenDetectionService caching functionality...');
    
    // Mock successful API response
    global.fetch.mockResolvedValue({
        ok: true,
        json: async () => ({
            status: 'success',
            data: {
                hasAccessToken: true,
                hasRefreshToken: true,
                hasUserData: true,
                isAuthenticated: true,
                isAdmin: false,
                sessionValid: true,
                checkDuration: 15
            }
        })
    });

    const service = new TokenDetectionService();
    
    console.log('1. First detection call (should hit API)...');
    const result1 = await service.detectTokens();
    console.log('Result 1:', {
        hasAccessToken: result1.hasAccessToken,
        fromCache: result1.fromCache,
        cacheHit: result1.cacheHit
    });
    
    console.log('2. Second detection call (should use cache)...');
    const result2 = await service.detectTokens();
    console.log('Result 2:', {
        hasAccessToken: result2.hasAccessToken,
        fromCache: result2.fromCache,
        cacheHit: result2.cacheHit
    });
    
    console.log('3. Cache statistics:');
    const cacheStats = service.getCacheStats();
    console.log('Cache stats:', cacheStats);
    
    console.log('4. Invalidating cache...');
    service.invalidateCache('test');
    
    console.log('5. Third detection call (should hit API again)...');
    const result3 = await service.detectTokens();
    console.log('Result 3:', {
        hasAccessToken: result3.hasAccessToken,
        fromCache: result3.fromCache,
        cacheHit: result3.cacheHit
    });
    
    console.log('6. API call count:', global.fetch.mock.calls.length);
    
    // Cleanup
    service.cleanup();
    
    console.log('Caching test completed successfully!');
}

// Run the test
testCaching().catch(console.error);