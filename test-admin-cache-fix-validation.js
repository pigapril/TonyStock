/**
 * Admin Permission Cache Fix Validation Script
 * 
 * This script validates the admin permission cache fix in the development environment.
 * It tests the specific issues described in the user's scenario and verifies that:
 * 1. API response `isAdmin: true` immediately enables admin features
 * 2. Page refreshes maintain correct admin state
 * 3. Network delay scenarios are handled gracefully
 * 
 * Task 10: Deploy and validate the fix in development environment
 * Requirements: 1.1, 1.2, 2.1
 * 
 * @author SentimentInsideOut Team
 * @version 1.0.0
 */

const puppeteer = require('puppeteer');
const path = require('path');

class AdminCacheFixValidator {
    constructor() {
        this.browser = null;
        this.page = null;
        this.baseUrl = process.env.REACT_APP_BASE_URL || 'http://localhost:3000';
        this.apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:5000';
        this.testResults = [];
        this.adminEmail = process.env.ADMIN_TEST_EMAIL || 'admin@example.com';
        this.adminPassword = process.env.ADMIN_TEST_PASSWORD || 'testpassword';
    }

    async initialize() {
        console.log('🚀 Initializing Admin Cache Fix Validation...\n');
        
        this.browser = await puppeteer.launch({
            headless: false, // Show browser for visual validation
            devtools: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        
        this.page = await this.browser.newPage();
        
        // Enable console logging from the page
        this.page.on('console', msg => {
            if (msg.type() === 'error') {
                console.log('❌ Browser Error:', msg.text());
            } else if (msg.text().includes('AdminPermissions')) {
                console.log('🔍 Admin Debug:', msg.text());
            }
        });
        
        // Set viewport
        await this.page.setViewport({ width: 1280, height: 720 });
        
        // Add request interception for API monitoring
        await this.page.setRequestInterception(true);
        this.setupRequestInterception();
    }

    setupRequestInterception() {
        this.page.on('request', request => {
            if (request.url().includes('/api/auth/admin-status')) {
                console.log('📡 Admin Status API Call:', request.url());
            }
            request.continue();
        });

        this.page.on('response', response => {
            if (response.url().includes('/api/auth/admin-status')) {
                console.log('📨 Admin Status API Response:', response.status());
            }
        });
    }

    async runTest(testName, testFunction) {
        console.log(`\n🧪 Running Test: ${testName}`);
        console.log('─'.repeat(50));
        
        const startTime = Date.now();
        let result = { name: testName, success: false, error: null, duration: 0 };
        
        try {
            await testFunction();
            result.success = true;
            console.log(`✅ Test Passed: ${testName}`);
        } catch (error) {
            result.error = error.message;
            console.log(`❌ Test Failed: ${testName}`);
            console.log(`   Error: ${error.message}`);
        }
        
        result.duration = Date.now() - startTime;
        this.testResults.push(result);
        
        console.log(`   Duration: ${result.duration}ms`);
    }

    async testImmediateAdminRecognition() {
        // Test Requirement 1.1: API response `isAdmin: true` immediately enables admin features
        await this.page.goto(this.baseUrl);
        
        // Wait for page to load
        await this.page.waitForSelector('body', { timeout: 10000 });
        
        // Mock admin login by setting up the admin state
        await this.page.evaluate(() => {
            // Simulate successful login
            localStorage.setItem('authToken', 'mock-admin-token');
            window.dispatchEvent(new CustomEvent('loginSuccess'));
        });
        
        // Navigate to admin page
        await this.page.goto(`${this.baseUrl}/admin`);
        
        // Wait for admin permissions to be checked
        await this.page.waitForTimeout(2000);
        
        // Check if admin features are immediately available
        const adminPanelExists = await this.page.$('[data-testid="admin-panel"]') !== null;
        const adminContentExists = await this.page.$('[data-testid="admin-content"]') !== null;
        
        if (!adminPanelExists && !adminContentExists) {
            // Check if there are any admin-only elements
            const adminElements = await this.page.$$('[class*="admin"]');
            if (adminElements.length === 0) {
                throw new Error('No admin features found after login - admin recognition failed');
            }
        }
        
        // Verify that isCurrentUserAdmin() returns true
        const isAdminResult = await this.page.evaluate(() => {
            if (window.adminPermissions && window.adminPermissions.isCurrentUserAdmin) {
                return window.adminPermissions.isCurrentUserAdmin();
            }
            return false;
        });
        
        if (!isAdminResult) {
            throw new Error('isCurrentUserAdmin() returned false despite admin login');
        }
        
        console.log('   ✓ Admin features immediately available after login');
        console.log('   ✓ isCurrentUserAdmin() returns true');
    }

    async testPageRefreshStateRecovery() {
        // Test Requirement 1.2, 2.1: Page refreshes maintain correct admin state
        
        // First, ensure we're in an admin state
        await this.page.goto(`${this.baseUrl}/admin`);
        await this.page.waitForTimeout(1000);
        
        // Set admin state in localStorage to simulate existing session
        await this.page.evaluate(() => {
            const adminState = {
                adminStatus: true,
                lastKnownStatus: true,
                lastCheck: Date.now() - 1000, // 1 second ago
                gracePeriodEnd: null
            };
            localStorage.setItem('adminPermissions', JSON.stringify(adminState));
            localStorage.setItem('authToken', 'mock-admin-token');
        });
        
        // Perform page refresh
        console.log('   🔄 Performing page refresh...');
        await this.page.reload({ waitUntil: 'networkidle0' });
        
        // Wait for the page to fully load and admin permissions to be restored
        await this.page.waitForTimeout(3000);
        
        // Check if admin state is maintained after refresh
        const adminStateAfterRefresh = await this.page.evaluate(() => {
            if (window.adminPermissions) {
                return {
                    isCurrentUserAdmin: window.adminPermissions.isCurrentUserAdmin(),
                    debugInfo: window.adminPermissions.getDebugInfo ? window.adminPermissions.getDebugInfo() : null
                };
            }
            return { isCurrentUserAdmin: false, debugInfo: null };
        });
        
        if (!adminStateAfterRefresh.isCurrentUserAdmin) {
            throw new Error('Admin state not maintained after page refresh');
        }
        
        // Verify admin features are still accessible
        const adminFeaturesVisible = await this.page.evaluate(() => {
            const adminElements = document.querySelectorAll('[data-testid*="admin"], [class*="admin-only"]');
            return adminElements.length > 0;
        });
        
        if (!adminFeaturesVisible) {
            throw new Error('Admin features not visible after page refresh');
        }
        
        console.log('   ✓ Admin state maintained after page refresh');
        console.log('   ✓ Admin features remain accessible');
        
        if (adminStateAfterRefresh.debugInfo) {
            console.log('   ✓ Debug info available:', {
                lastKnownStatus: adminStateAfterRefresh.debugInfo.cacheState?.lastKnownStatus,
                adminStatus: adminStateAfterRefresh.debugInfo.cacheState?.adminStatus
            });
        }
    }

    async testNetworkDelayGracefulHandling() {
        // Test Requirement 2.1: Network delay scenarios and graceful handling
        
        await this.page.goto(this.baseUrl);
        
        // Set up network delay simulation
        await this.page.setRequestInterception(true);
        
        let adminStatusCallCount = 0;
        this.page.on('request', request => {
            if (request.url().includes('/api/auth/admin-status')) {
                adminStatusCallCount++;
                console.log(`   📡 Admin Status API Call #${adminStatusCallCount}`);
                
                // Simulate network delay for the first call
                if (adminStatusCallCount === 1) {
                    console.log('   ⏳ Simulating 2-second network delay...');
                    setTimeout(() => {
                        request.continue();
                    }, 2000);
                    return;
                }
            }
            request.continue();
        });
        
        // Set up last known admin status before triggering the delayed call
        await this.page.evaluate(() => {
            if (window.adminPermissions) {
                window.adminPermissions.lastKnownStatus = true;
                localStorage.setItem('authToken', 'mock-admin-token');
            }
        });
        
        // Navigate to admin page to trigger admin check with delay
        await this.page.goto(`${this.baseUrl}/admin`);
        
        // Check admin status immediately (should use last known status during loading)
        const immediateAdminStatus = await this.page.evaluate(() => {
            if (window.adminPermissions) {
                return {
                    isCurrentUserAdmin: window.adminPermissions.isCurrentUserAdmin(),
                    loading: window.adminPermissions.isLoading ? window.adminPermissions.isLoading() : false,
                    lastKnownStatus: window.adminPermissions.lastKnownStatus
                };
            }
            return { isCurrentUserAdmin: false, loading: false, lastKnownStatus: null };
        });
        
        console.log('   📊 Immediate status during network delay:', immediateAdminStatus);
        
        // Should show graceful degradation - admin features visible with loading indicator
        const gracefulDegradationVisible = await this.page.evaluate(() => {
            const adminContent = document.querySelector('[data-testid*="admin"]');
            const loadingIndicator = document.querySelector('[class*="permission"], [class*="verifying"]');
            return {
                hasAdminContent: !!adminContent,
                hasLoadingIndicator: !!loadingIndicator
            };
        });
        
        console.log('   🎭 Graceful degradation state:', gracefulDegradationVisible);
        
        // Wait for the delayed API call to complete
        await this.page.waitForTimeout(3000);
        
        // Verify final state after network delay
        const finalAdminStatus = await this.page.evaluate(() => {
            if (window.adminPermissions) {
                return {
                    isCurrentUserAdmin: window.adminPermissions.isCurrentUserAdmin(),
                    loading: window.adminPermissions.isLoading ? window.adminPermissions.isLoading() : false
                };
            }
            return { isCurrentUserAdmin: false, loading: false };
        });
        
        if (immediateAdminStatus.isCurrentUserAdmin !== true) {
            throw new Error('Failed to use last known status during network delay');
        }
        
        if (finalAdminStatus.loading !== false) {
            throw new Error('Loading state not properly cleared after network delay');
        }
        
        console.log('   ✓ Graceful handling during network delay');
        console.log('   ✓ Last known status used during loading');
        console.log('   ✓ Loading state properly managed');
    }

    async testPromiseQueueManagement() {
        // Test that multiple simultaneous admin checks don't cause race conditions
        
        await this.page.goto(this.baseUrl);
        
        // Clear any existing state
        await this.page.evaluate(() => {
            if (window.adminPermissions) {
                window.adminPermissions.clearCache();
            }
            localStorage.setItem('authToken', 'mock-admin-token');
        });
        
        // Make multiple simultaneous admin checks
        const multipleCheckResults = await this.page.evaluate(async () => {
            if (!window.adminPermissions) {
                throw new Error('AdminPermissions not available');
            }
            
            const startTime = Date.now();
            
            // Make 5 simultaneous calls
            const promises = [
                window.adminPermissions.checkIsAdmin(),
                window.adminPermissions.checkIsAdmin(),
                window.adminPermissions.checkIsAdmin(),
                window.adminPermissions.checkIsAdmin(),
                window.adminPermissions.checkIsAdmin()
            ];
            
            const results = await Promise.all(promises);
            const endTime = Date.now();
            
            return {
                results,
                duration: endTime - startTime,
                allSame: results.every(r => r === results[0])
            };
        });
        
        if (!multipleCheckResults.allSame) {
            throw new Error('Multiple simultaneous admin checks returned different results');
        }
        
        // Check that promise queue was used (should be relatively fast)
        if (multipleCheckResults.duration > 5000) {
            console.warn('   ⚠️  Multiple checks took longer than expected, promise queue may not be working optimally');
        }
        
        console.log('   ✓ Multiple simultaneous checks handled correctly');
        console.log(`   ✓ All checks completed in ${multipleCheckResults.duration}ms`);
        console.log('   ✓ Consistent results across all checks');
    }

    async testErrorRecoveryMechanism() {
        // Test error handling and recovery mechanisms
        
        await this.page.goto(this.baseUrl);
        
        // Set up error simulation
        await this.page.setRequestInterception(true);
        
        let shouldSimulateError = true;
        this.page.on('request', request => {
            if (request.url().includes('/api/auth/admin-status') && shouldSimulateError) {
                console.log('   💥 Simulating API error...');
                shouldSimulateError = false; // Only fail once
                request.abort('failed');
                return;
            }
            request.continue();
        });
        
        // Set last known admin status
        await this.page.evaluate(() => {
            if (window.adminPermissions) {
                window.adminPermissions.lastKnownStatus = true;
                window.adminPermissions.gracePeriodEnd = Date.now() + 30000; // 30 seconds grace period
            }
            localStorage.setItem('authToken', 'mock-admin-token');
        });
        
        // Navigate to admin page (will trigger error)
        await this.page.goto(`${this.baseUrl}/admin`);
        await this.page.waitForTimeout(2000);
        
        // Check that error recovery maintains last known status
        const errorRecoveryStatus = await this.page.evaluate(() => {
            if (window.adminPermissions) {
                const debugInfo = window.adminPermissions.getDebugInfo ? window.adminPermissions.getDebugInfo() : {};
                return {
                    isCurrentUserAdmin: window.adminPermissions.isCurrentUserAdmin(),
                    isInGracePeriod: debugInfo.errorHandling?.isInGracePeriod,
                    lastKnownStatus: debugInfo.cacheState?.lastKnownStatus
                };
            }
            return { isCurrentUserAdmin: false, isInGracePeriod: false, lastKnownStatus: null };
        });
        
        if (!errorRecoveryStatus.isCurrentUserAdmin) {
            throw new Error('Error recovery failed - admin status not maintained');
        }
        
        if (!errorRecoveryStatus.isInGracePeriod) {
            throw new Error('Grace period not activated during error recovery');
        }
        
        console.log('   ✓ Error recovery mechanism working');
        console.log('   ✓ Grace period activated during errors');
        console.log('   ✓ Last known status maintained during errors');
    }

    async generateReport() {
        console.log('\n📊 Test Results Summary');
        console.log('═'.repeat(60));
        
        const totalTests = this.testResults.length;
        const passedTests = this.testResults.filter(t => t.success).length;
        const failedTests = totalTests - passedTests;
        
        console.log(`Total Tests: ${totalTests}`);
        console.log(`Passed: ${passedTests} ✅`);
        console.log(`Failed: ${failedTests} ❌`);
        console.log(`Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`);
        
        console.log('\nDetailed Results:');
        console.log('─'.repeat(60));
        
        this.testResults.forEach(result => {
            const status = result.success ? '✅' : '❌';
            console.log(`${status} ${result.name} (${result.duration}ms)`);
            if (result.error) {
                console.log(`   Error: ${result.error}`);
            }
        });
        
        // Generate requirements coverage report
        console.log('\n📋 Requirements Coverage:');
        console.log('─'.repeat(60));
        
        const requirementsCoverage = {
            '1.1': 'API response `isAdmin: true` immediately enables admin features',
            '1.2': 'isCurrentUserAdmin() waits for API result instead of returning false',
            '2.1': 'Network delay scenarios handled gracefully with loading states'
        };
        
        Object.entries(requirementsCoverage).forEach(([req, description]) => {
            const covered = this.testResults.some(t => t.success && t.name.toLowerCase().includes(description.toLowerCase().split(' ')[0]));
            const status = covered ? '✅' : '❌';
            console.log(`${status} Requirement ${req}: ${description}`);
        });
        
        // Save detailed report to file
        const reportData = {
            timestamp: new Date().toISOString(),
            summary: {
                totalTests,
                passedTests,
                failedTests,
                successRate: ((passedTests / totalTests) * 100).toFixed(1) + '%'
            },
            testResults: this.testResults,
            requirementsCoverage
        };
        
        const fs = require('fs');
        const reportPath = path.join(__dirname, 'admin-cache-fix-validation-report.json');
        fs.writeFileSync(reportPath, JSON.stringify(reportData, null, 2));
        
        console.log(`\n📄 Detailed report saved to: ${reportPath}`);
        
        return passedTests === totalTests;
    }

    async cleanup() {
        if (this.browser) {
            await this.browser.close();
        }
    }

    async run() {
        try {
            await this.initialize();
            
            // Run all validation tests
            await this.runTest(
                'Immediate Admin Recognition After Login',
                () => this.testImmediateAdminRecognition()
            );
            
            await this.runTest(
                'Page Refresh State Recovery',
                () => this.testPageRefreshStateRecovery()
            );
            
            await this.runTest(
                'Network Delay Graceful Handling',
                () => this.testNetworkDelayGracefulHandling()
            );
            
            await this.runTest(
                'Promise Queue Management',
                () => this.testPromiseQueueManagement()
            );
            
            await this.runTest(
                'Error Recovery Mechanism',
                () => this.testErrorRecoveryMechanism()
            );
            
            // Generate and display report
            const allTestsPassed = await this.generateReport();
            
            if (allTestsPassed) {
                console.log('\n🎉 All tests passed! Admin cache fix validation successful.');
                console.log('\n✅ Task 10 Complete: Admin permission cache fix validated in development environment');
                console.log('   - API response `isAdmin: true` immediately enables admin features');
                console.log('   - Page refreshes maintain correct admin state');
                console.log('   - Network delay scenarios handled gracefully');
            } else {
                console.log('\n⚠️  Some tests failed. Please review the issues above.');
                process.exit(1);
            }
            
        } catch (error) {
            console.error('\n💥 Validation failed with error:', error.message);
            console.error(error.stack);
            process.exit(1);
        } finally {
            await this.cleanup();
        }
    }
}

// Run validation if this script is executed directly
if (require.main === module) {
    const validator = new AdminCacheFixValidator();
    validator.run().catch(console.error);
}

module.exports = AdminCacheFixValidator;