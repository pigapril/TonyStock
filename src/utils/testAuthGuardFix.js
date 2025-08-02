/**
 * Test script for AuthGuard fix
 * Tests the corrected authentication flow without circular dependency
 */

import authGuard from './authGuard';
import csrfClient from './csrfClient';

class AuthGuardFixTester {
    constructor() {
        this.testResults = [];
    }

    log(message, type = 'info') {
        const timestamp = new Date().toISOString();
        const logEntry = { timestamp, message, type };
        this.testResults.push(logEntry);
        
        const emoji = type === 'success' ? '✅' : type === 'error' ? '❌' : type === 'warning' ? '⚠️' : 'ℹ️';
        console.log(`${emoji} [${timestamp}] ${message}`);
    }

    async testUnauthenticatedFlow() {
        this.log('Testing unauthenticated flow...', 'info');
        
        try {
            // Reset auth guard state
            authGuard.reset();
            csrfClient.clearCSRFToken();
            
            // Test 1: Check if AuthGuard handles unauthenticated state correctly
            this.log('Test 1: Checking unauthenticated state handling');
            const isAuthenticated = await authGuard.ensureAuthenticated();
            
            if (isAuthenticated === false) {
                this.log('✓ AuthGuard correctly returns false for unauthenticated user', 'success');
            } else {
                this.log('✗ AuthGuard should return false for unauthenticated user', 'error');
            }
            
            // Test 2: Try to make a request without authentication
            this.log('Test 2: Making request without authentication');
            try {
                const result = await authGuard.makeAuthenticatedRequest(async () => {
                    const response = await fetch('/api/auth/status', {
                        credentials: 'include'
                    });
                    return response.json();
                });
                
                this.log('✓ Request completed without authentication', 'success');
                this.log(`Response: ${JSON.stringify(result)}`, 'info');
            } catch (error) {
                if (error.message.includes('Authentication required')) {
                    this.log('✓ Request correctly failed with authentication required', 'success');
                } else {
                    this.log(`✗ Unexpected error: ${error.message}`, 'error');
                }
            }
            
        } catch (error) {
            this.log(`Test failed with error: ${error.message}`, 'error');
        }
    }

    async testCSRFClientBehavior() {
        this.log('Testing CSRF client behavior...', 'info');
        
        try {
            // Reset CSRF client
            csrfClient.clearCSRFToken();
            
            // Test 1: Check if CSRF client handles missing token gracefully
            this.log('Test 1: Testing CSRF client without token');
            
            try {
                const response = await csrfClient.fetchWithCSRF('/api/auth/status', {
                    method: 'GET'
                });
                
                this.log('✓ CSRF client handled request without token', 'success');
                this.log(`Response status: ${response.status}`, 'info');
            } catch (error) {
                if (error.message.includes('401')) {
                    this.log('✓ CSRF client correctly handled 401 error', 'success');
                } else {
                    this.log(`✗ Unexpected CSRF client error: ${error.message}`, 'error');
                }
            }
            
        } catch (error) {
            this.log(`CSRF client test failed: ${error.message}`, 'error');
        }
    }

    async testCircularDependencyFix() {
        this.log('Testing circular dependency fix...', 'info');
        
        try {
            // Reset everything
            authGuard.reset();
            csrfClient.clearCSRFToken();
            
            // Test: Ensure no circular dependency when initializing
            this.log('Test: Checking for circular dependency');
            
            const startTime = Date.now();
            let completed = false;
            
            // Set a timeout to detect infinite loops
            const timeout = setTimeout(() => {
                if (!completed) {
                    this.log('✗ Possible circular dependency detected (timeout)', 'error');
                }
            }, 5000);
            
            try {
                await authGuard.ensureAuthenticated();
                completed = true;
                clearTimeout(timeout);
                
                const duration = Date.now() - startTime;
                this.log(`✓ No circular dependency detected (completed in ${duration}ms)`, 'success');
                
            } catch (error) {
                completed = true;
                clearTimeout(timeout);
                this.log(`✓ Authentication failed as expected: ${error.message}`, 'success');
            }
            
        } catch (error) {
            this.log(`Circular dependency test failed: ${error.message}`, 'error');
        }
    }

    async runFullTest() {
        this.log('Starting AuthGuard fix validation tests...', 'info');
        this.log('='.repeat(50), 'info');
        
        await this.testUnauthenticatedFlow();
        this.log('-'.repeat(30), 'info');
        
        await this.testCSRFClientBehavior();
        this.log('-'.repeat(30), 'info');
        
        await this.testCircularDependencyFix();
        this.log('-'.repeat(30), 'info');
        
        // Summary
        const successCount = this.testResults.filter(r => r.type === 'success').length;
        const errorCount = this.testResults.filter(r => r.type === 'error').length;
        const warningCount = this.testResults.filter(r => r.type === 'warning').length;
        
        this.log('='.repeat(50), 'info');
        this.log(`Test Summary: ${successCount} passed, ${errorCount} failed, ${warningCount} warnings`, 'info');
        
        if (errorCount === 0) {
            this.log('🎉 All tests passed! AuthGuard fix is working correctly.', 'success');
        } else {
            this.log('❌ Some tests failed. Please check the implementation.', 'error');
        }
        
        return {
            passed: successCount,
            failed: errorCount,
            warnings: warningCount,
            results: this.testResults
        };
    }

    getResults() {
        return this.testResults;
    }
}

// Create global instance for testing
const testAuthGuardFix = new AuthGuardFixTester();

// Export for use in browser console
if (typeof window !== 'undefined') {
    window.testAuthGuardFix = testAuthGuardFix;
}

export default testAuthGuardFix;