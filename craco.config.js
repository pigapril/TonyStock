const CssMinimizerPlugin = require('css-minimizer-webpack-plugin');

module.exports = {
  webpack: {
    configure: (webpackConfig, { env, paths }) => {
      if (env === 'production') {
        // Find and replace the CSS minimizer with CleanCSS
        const minimizerIndex = webpackConfig.optimization.minimizer.findIndex(
          (plugin) => plugin.constructor.name === 'CssMinimizerPlugin'
        );
        
        if (minimizerIndex !== -1) {
          // Replace with CleanCSS which is more tolerant of SVG data URLs
          webpackConfig.optimization.minimizer[minimizerIndex] = new CssMinimizerPlugin({
            minify: CssMinimizerPlugin.cleanCssMinify,
            minimizerOptions: {
              level: {
                1: {
                  // Level 1 optimizations (safe)
                  cleanupCharsets: true,
                  normalizeUrls: false, // 不要正規化 URL
                  optimizeBackground: false, // 不要優化背景屬性
                  optimizeBorderRadius: true,
                  optimizeFilter: true,
                  optimizeFont: true,
                  optimizeFontWeight: true,
                  optimizeOutline: true,
                  removeEmpty: true,
                  removeNegativePaddings: true,
                  removeQuotes: false, // 保留引號
                  removeWhitespace: true,
                  replaceMultipleZeros: true,
                  replaceTimeUnits: true,
                  replaceZeroUnits: true,
                  roundingPrecision: 2,
                  selectorsSortingMethod: 'standard',
                  specialComments: 0,
                  tidyAtRules: true,
                  tidyBlockScopes: true,
                  tidySelectors: true,
                },
                2: {
                  // Level 2 optimizations (more aggressive but still safe)
                  mergeAdjacentRules: true,
                  mergeIntoShorthands: true,
                  mergeMedia: true,
                  mergeNonAdjacentRules: true,
                  mergeSemantically: false, // 不要語義合併
                  overrideProperties: true,
                  removeEmpty: true,
                  reduceNonAdjacentRules: true,
                  removeDuplicateFontRules: true,
                  removeDuplicateMediaBlocks: true,
                  removeDuplicateRules: true,
                  removeUnusedAtRules: false,
                  restructureRules: false, // 不要重構規則
                  skipProperties: []
                }
              },
              format: 'beautify' // 保持一定的可讀性
            }
          });
        }
      }
      return webpackConfig;
    }
  }
};