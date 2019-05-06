const path = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const CopyPlugin = require("copy-webpack-plugin");

const packageJson = require('./package.json');
const distFolder = path.join(__dirname, "/dist");

module.exports = (env, options) => {
  return {
    entry: "./src/index.ts",
    resolve: {
      extensions: [".ts", ".tsx", ".js"],
      alias: { "@plugin/shared": path.resolve(__dirname, "../shared/") },
      modules: [path.resolve(__dirname, "../../node_modules"), path.resolve(__dirname, "node_modules")],
      symlinks: false
    },
    output: {
      path: distFolder,
      filename: `playkit-js-hotspots.min.js`
    },
    devtool: options.mode == "development" ? "eval-source-map" : "source-map",
    module: {
      rules: [
        {
          test: /\.tsx?$/,
          loader: "awesome-typescript-loader"
        }
      ]
    },
    plugins: [
      new HtmlWebpackPlugin({
        filename: path.resolve(distFolder, "index.html"),
        template: path.resolve("src", "test.ejs"),
        inject: false,
        hash: true
      }),
      new CopyPlugin([
        { from: "src/public", to: distFolder }
      ])
    ],
    devServer: {
      contentBase: distFolder,
      historyApiFallback: true,
      hot: false,
      inline: true,
      publicPath: "/",
      index: "index.html",
      port: 8007
    },
    externals: {
      '@playkit-js/playkit-js': {
        commonjs: '@playkit-js/playkit-js',
        commonjs2: '@playkit-js/playkit-js',
        amd: 'playkit-js',
        root: ['KalturaPlayer', 'core']
      }
    }

  };
}
