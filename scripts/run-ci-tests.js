const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const frontendRoot = path.resolve(__dirname, '..');
const manifestPath = path.join(frontendRoot, 'config', 'testing', 'regression.manifest.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const testPaths = manifest.tests.map((relativePath) => path.join(frontendRoot, relativePath));
const cliArgs = process.argv.slice(2);
const hasExplicitTestPaths = cliArgs.includes('--runTestsByPath');
const hasCoverageFlag = cliArgs.includes('--coverage') || cliArgs.includes('--coverage=false');

const testCommand = [
    require.resolve('react-app-rewired/bin/index.js'),
    'test',
    '--watch=false',
    '--watchman=false',
    '--runInBand'
];

if (!hasCoverageFlag) {
    testCommand.push('--coverage');
}

if (hasExplicitTestPaths) {
    testCommand.push(...cliArgs);
} else {
    testCommand.push('--runTestsByPath', ...testPaths, ...cliArgs);
}

const result = spawnSync(
    process.execPath,
    testCommand,
    {
        cwd: frontendRoot,
        env: {
            ...process.env,
            CI: 'true',
            WATCHMAN_DISABLE_WATCHMAN: '1'
        },
        stdio: 'inherit'
    }
);

process.exit(result.status === null ? 1 : result.status);
