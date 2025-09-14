const { override, addWebpackPlugin } = require('customize-cra');

module.exports = override(
  (config, env) => {
    if (env === 'production') {
      // 移除 CSS 最小化器以避免斜線問題
      config.optimization.minimizer = config.optimization.minimizer.filter(
        (plugin) => plugin.constructor.name !== 'CssMinimizerPlugin'
      );
    }
    return config;
  }
);