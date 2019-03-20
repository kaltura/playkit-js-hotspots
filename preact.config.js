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
  config.resolve.symlinks = false;

};
