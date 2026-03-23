const { override, addWebpackPlugin } = require('customize-cra');
const path = require('path');

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
    }
    return config;
  }
);
