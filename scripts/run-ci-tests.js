const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const frontendRoot = path.resolve(__dirname, '..');
const manifestPath = path.join(frontendRoot, 'config', 'testing', 'regression.manifest.json');
const warningFilterPath = path.join(__dirname, 'test-warning-filter.js');
const rawArgs = process.argv.slice(2);
const runRegressionOnly = rawArgs.length === 1 && rawArgs[0] === '--regression';
if (rawArgs.length > 0 && !runRegressionOnly) {
    throw new Error(
        'run-ci-tests.js only supports the full CI suite or --regression. ' +
        'For targeted tests, use npm test -- --watchAll=false --watchman=false --runInBand --runTestsByPath <test-file>.'
    );
}
let testPaths = [];
if (runRegressionOnly) {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    if (!Array.isArray(manifest.tests) || manifest.tests.length === 0) {
        throw new Error('Regression test manifest must contain at least one test path.');
    }
    if (manifest.tests.some((relativePath) => typeof relativePath !== 'string' || !relativePath.trim())) {
        throw new Error('Regression test manifest paths must be non-empty strings.');
    }
    testPaths = manifest.tests.map((relativePath) => path.resolve(frontendRoot, relativePath));
    if (new Set(testPaths).size !== testPaths.length) {
        throw new Error('Regression test manifest contains duplicate paths.');
    }
    if (testPaths.some((testPath) => !testPath.startsWith(`${frontendRoot}${path.sep}`))) {
        throw new Error('Regression test manifest paths must stay inside the frontend repository.');
    }
    const missingTestPaths = testPaths.filter((testPath) => (
        !fs.existsSync(testPath) || !fs.statSync(testPath).isFile()
    ));
    if (missingTestPaths.length > 0) {
        throw new Error(`Regression manifest contains missing test files:\n${missingTestPaths.join('\n')}`);
    }
}
const nodeOptions = [
    process.env.NODE_OPTIONS,
    '--max-old-space-size=4096',
    `--require=${warningFilterPath}`
].filter(Boolean).join(' ');

const rewiredBin = path.resolve(frontendRoot, 'node_modules', 'react-app-rewired', 'bin', 'index.js');
const testCommand = [
    rewiredBin,
    'test',
    '--watch=false',
    '--watchAll=false',
    '--watchman=false',
    '--runInBand'
];

// The curated regression subset is intentionally narrower than the complete
// source tree, so apply repository-wide coverage thresholds only to the full run.
if (!runRegressionOnly) {
    testCommand.push('--coverage');
} else {
    // Keep the regression subset independent from any future collectCoverage default.
    testCommand.push('--coverage=false');
}

if (runRegressionOnly) {
    testCommand.push('--runTestsByPath', ...testPaths);
}

const result = spawnSync(
    process.execPath,
    testCommand,
    {
        cwd: frontendRoot,
        env: {
            ...process.env,
            CI: 'true',
            WATCHMAN_DISABLE_WATCHMAN: '1',
            NODE_OPTIONS: nodeOptions
        },
        stdio: 'inherit'
    }
);

process.exit(result.status === null ? 1 : result.status);
