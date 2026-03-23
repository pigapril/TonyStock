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

module.exports = override(
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
