const { override } = require('customize-cra');
const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');

class AsyncCssHtmlPlugin {
  apply(compiler) {
    compiler.hooks.compilation.tap('AsyncCssHtmlPlugin', (compilation) => {
      HtmlWebpackPlugin.getHooks(compilation).alterAssetTagGroups.tap(
        'AsyncCssHtmlPlugin',
        (data) => {
          const transformedHeadTags = [];

          data.headTags.forEach((tag) => {
            if (
              tag.tagName === 'link'
              && tag.attributes?.rel === 'stylesheet'
              && tag.attributes?.href
            ) {
              const href = tag.attributes.href;

              transformedHeadTags.push({
                tagName: 'link',
                voidTag: true,
                meta: tag.meta,
                attributes: {
                  rel: 'preload',
                  as: 'style',
                  href,
                  onload: "this.onload=null;this.rel='stylesheet'"
                }
              });
              transformedHeadTags.push({
                tagName: 'noscript',
                voidTag: false,
                meta: tag.meta,
                innerHTML: `<link rel="stylesheet" href="${href}">`
              });
              return;
            }

            transformedHeadTags.push(tag);
          });

          data.headTags = transformedHeadTags;
          return data;
        }
      );
    });
  }
}

const webpack = override(
  (config, env) => {
    config.resolve = config.resolve || {};
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      'chartjs-adapter-date-fns': path.resolve(
        __dirname,
        'src/utils/chartjsDateAdapterShim.js'
      )
    };

    if (env === 'production') {
      // 移除 CSS 最小化器以避免斜線問題
      config.optimization.minimizer = config.optimization.minimizer.filter(
        (plugin) => plugin.constructor.name !== 'CssMinimizerPlugin'
      );
      config.plugins.push(new AsyncCssHtmlPlugin());
    }
    return config;
  }
);

module.exports = {
  webpack,
  jest: (config) => {
    // Axios 1.7+ exposes an ESM entry point. Let babel transform only Axios
    // JavaScript while preserving CRA's default treatment of all other JS and
    // CSS modules. A broad `node_modules/(?!axios/)` rule also excludes package
    // CSS files from CRA's stylesheet transformer and breaks react-datepicker.
    config.transformIgnorePatterns = [
      '[/\\\\]node_modules[/\\\\](?!axios[/\\\\]).+\\.(js|jsx|mjs|cjs|ts|tsx)$',
      '^.+\\.module\\.(css|sass|scss)$'
    ];
    return config;
  }
};
