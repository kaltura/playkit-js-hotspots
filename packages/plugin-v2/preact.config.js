const path = require('path');

export default (config, env, helpers) => {
  delete config.entry.polyfills;
  config.output.filename = "[name].js";

  let { plugin } = helpers.getPluginsByName(config, "ExtractTextPlugin")[0];
  plugin.options.disable = true;

  config.module.loaders.push({
      test: /\.[tj]sx?$/,
      loader: "ts-loader",
  });

  if (env.production) {
    config.output.libraryTarget = "umd";
  }

  const entrypoint = env.template.replace(/ejs$/, "js");
  config.resolve.alias['preact-cli-entrypoint'] = path.resolve(__dirname, entrypoint);

  // Allow symlink to plubin
  config.resolve.symlinks = false;

  // use the same instance of preact
  config.resolve.alias['preact'] = path.resolve(__dirname, 'node_modules/preact');

  config.externals = config.externals || {};
  config.externals['@playkit-js/playkit-js'] = {
    commonjs: '@playkit-js/playkit-js',
      commonjs2: '@playkit-js/playkit-js',
      amd: 'playkit-js',
      root: ['KalturaPlayer', 'core']
  };
};
