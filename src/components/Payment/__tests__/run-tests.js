#!/usr/bin/env node

/**
 * Phase 5 測試運行腳本
 * 
 * 運行所有 Phase 5 相關的測試
 */

const { execSync } = require('child_process');
const path = require('path');

console.log('🚀 Running Phase 5 Payment Tests...\n');

const testFiles = [
    // 組件測試
    'frontend/src/components/Payment/__tests__/PaymentFlow.test.js',
    'frontend/src/components/Payment/__tests__/PaymentStatus.test.js',
    'frontend/src/components/Payment/__tests__/PaymentHistory.test.js',
    
    // 整合測試
    'frontend/src/components/Payment/__tests__/PaymentFlow.integration.test.js',
    
    // 服務測試
    'frontend/src/services/__tests__/paymentService.test.js',
    'frontend/src/services/__tests__/subscriptionService.test.js',
    
    // 工具測試
    'frontend/src/utils/__tests__/paymentErrorHandler.test.js'
];

const runTests = () => {
    try {
        console.log('📋 Test Files:');
        testFiles.forEach((file, index) => {
            console.log(`  ${index + 1}. ${file}`);
        });
        console.log('');

        // 運行測試
        const testPattern = testFiles.join(' ');
        const command = `npm test -- ${testPattern} --verbose --coverage`;
        
        console.log('🔧 Running command:', command);
        console.log('');
        
        execSync(command, {
            stdio: 'inherit',
            cwd: path.resolve(__dirname, '../../../..')
        });
        
        console.log('\n✅ All Phase 5 tests completed successfully!');
        
    } catch (error) {
        console.error('\n❌ Tests failed:', error.message);
        process.exit(1);
    }
};

const runLinting = () => {
    try {
        console.log('🔍 Running ESLint on Payment components...');
        
        const lintCommand = 'npx eslint frontend/src/components/Payment/ frontend/src/services/paymentService.js frontend/src/services/subscriptionService.js --ext .js,.jsx';
        
        execSync(lintCommand, {
            stdio: 'inherit',
            cwd: path.resolve(__dirname, '../../../..')
        });
        
        console.log('✅ Linting passed!');
        
    } catch (error) {
        console.warn('⚠️  Linting issues found:', error.message);
        // Don't exit on linting errors, just warn
    }
};

const runTypeCheck = () => {
    try {
        console.log('🔍 Running TypeScript type checking...');
        
        // Check if TypeScript is configured
        const tsConfigPath = path.resolve(__dirname, '../../../..', 'tsconfig.json');
        const fs = require('fs');
        
        if (fs.existsSync(tsConfigPath)) {
            const typeCheckCommand = 'npx tsc --noEmit';
            
            execSync(typeCheckCommand, {
                stdio: 'inherit',
                cwd: path.resolve(__dirname, '../../../..')
            });
            
            console.log('✅ Type checking passed!');
        } else {
            console.log('ℹ️  TypeScript not configured, skipping type check');
        }
        
    } catch (error) {
        console.warn('⚠️  Type checking issues found:', error.message);
        // Don't exit on type errors, just warn
    }
};

// Main execution
const main = () => {
    console.log('🧪 Phase 5 Payment System Test Suite');
    console.log('=====================================\n');
    
    // Run linting first
    runLinting();
    console.log('');
    
    // Run type checking
    runTypeCheck();
    console.log('');
    
    // Run tests
    runTests();
    
    console.log('\n🎉 Phase 5 testing completed!');
    console.log('\n📊 Test Coverage Report:');
    console.log('  - Check the coverage/ directory for detailed reports');
    console.log('  - Open coverage/lcov-report/index.html in your browser');
    
    console.log('\n📝 Next Steps:');
    console.log('  1. Review test coverage and add tests for uncovered code');
    console.log('  2. Fix any failing tests');
    console.log('  3. Update documentation based on test results');
    console.log('  4. Proceed to Phase 6 implementation');
};

// Handle command line arguments
const args = process.argv.slice(2);

if (args.includes('--help') || args.includes('-h')) {
    console.log('Phase 5 Payment Tests Runner');
    console.log('');
    console.log('Usage: node run-tests.js [options]');
    console.log('');
    console.log('Options:');
    console.log('  --help, -h     Show this help message');
    console.log('  --tests-only   Run only tests (skip linting and type checking)');
    console.log('  --lint-only    Run only linting');
    console.log('  --type-only    Run only type checking');
    console.log('');
    process.exit(0);
}

if (args.includes('--tests-only')) {
    runTests();
} else if (args.includes('--lint-only')) {
    runLinting();
} else if (args.includes('--type-only')) {
    runTypeCheck();
} else {
    main();
}