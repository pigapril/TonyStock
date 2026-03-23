const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const buildDir = path.resolve(__dirname, '..', 'build');
const manifestPath = path.join(buildDir, 'asset-manifest.json');

const budgets = {
  initialJsGzipBytes: 560 * 1024,
  initialCssGzipBytes: 120 * 1024,
  totalInitialGzipBytes: 680 * 1024,
  maxEntrypoints: 6,
  mainJsGzipBytes: 230 * 1024,
  mainCssGzipBytes: 35 * 1024
};

if (!fs.existsSync(manifestPath)) {
  console.error('Performance budget check requires frontend/build/asset-manifest.json. Run npm run build first.');
  process.exit(1);
}

const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const entrypoints = manifest.entrypoints || [];

const getAbsolutePath = (assetPath) => path.join(buildDir, assetPath.replace(/^\//, ''));
const gzipSize = (filePath) => zlib.gzipSync(fs.readFileSync(filePath)).length;

const jsEntrypoints = entrypoints.filter((asset) => asset.endsWith('.js'));
const cssEntrypoints = entrypoints.filter((asset) => asset.endsWith('.css'));
const files = manifest.files || {};
const mainJsAsset = files['main.js'] || Object.values(files).find((assetPath) => /^\/?static\/js\/main\..+\.js$/.test(assetPath));
const mainCssAsset = files['main.css'] || Object.values(files).find((assetPath) => /^\/?static\/css\/main\..+\.css$/.test(assetPath));

const jsGzipBytes = jsEntrypoints.reduce((total, assetPath) => total + gzipSize(getAbsolutePath(assetPath)), 0);
const cssGzipBytes = cssEntrypoints.reduce((total, assetPath) => total + gzipSize(getAbsolutePath(assetPath)), 0);
const totalInitialGzipBytes = jsGzipBytes + cssGzipBytes;
const mainJsGzipBytes = mainJsAsset ? gzipSize(getAbsolutePath(mainJsAsset)) : 0;
const mainCssGzipBytes = mainCssAsset ? gzipSize(getAbsolutePath(mainCssAsset)) : 0;

const failures = [];

if (jsGzipBytes > budgets.initialJsGzipBytes) {
  failures.push(`Initial JS gzip size ${jsGzipBytes} exceeds budget ${budgets.initialJsGzipBytes}`);
}

if (cssGzipBytes > budgets.initialCssGzipBytes) {
  failures.push(`Initial CSS gzip size ${cssGzipBytes} exceeds budget ${budgets.initialCssGzipBytes}`);
}

if (totalInitialGzipBytes > budgets.totalInitialGzipBytes) {
  failures.push(`Initial total gzip size ${totalInitialGzipBytes} exceeds budget ${budgets.totalInitialGzipBytes}`);
}

if (entrypoints.length > budgets.maxEntrypoints) {
  failures.push(`Entrypoint count ${entrypoints.length} exceeds budget ${budgets.maxEntrypoints}`);
}

if (mainJsAsset && mainJsGzipBytes > budgets.mainJsGzipBytes) {
  failures.push(`Main JS gzip size ${mainJsGzipBytes} exceeds budget ${budgets.mainJsGzipBytes}`);
}

if (mainCssAsset && mainCssGzipBytes > budgets.mainCssGzipBytes) {
  failures.push(`Main CSS gzip size ${mainCssGzipBytes} exceeds budget ${budgets.mainCssGzipBytes}`);
}

console.log(JSON.stringify({
  entrypoints,
  budgets,
  current: {
    jsGzipBytes,
    cssGzipBytes,
    totalInitialGzipBytes,
    mainJsAsset,
    mainJsGzipBytes,
    mainCssAsset,
    mainCssGzipBytes
  },
  status: failures.length ? 'fail' : 'pass'
}, null, 2));

if (failures.length) {
  failures.forEach((failure) => console.error(`BUDGET_FAIL: ${failure}`));
  process.exit(1);
}
