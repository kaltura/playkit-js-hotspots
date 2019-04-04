const path = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const CopyPlugin = require("copy-webpack-plugin");

const distFolder = path.join(__dirname, "/dist");
module.exports = (env, options) => {
  return {
    entry: "./src/index.ts",
    resolve: {
      extensions: [".ts", ".tsx", ".js"],
      alias: { "@plugin/core": path.resolve(__dirname, "../shared/") },
      modules: [path.resolve(__dirname, "node_modules")],
      symlinks: false
    },
    output: {
      path: distFolder,
      filename: "bundle.min.js"
    },
    devtool: options.mode == "development" ? "source-map" : false,
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
        { from: "src/tests", to: distFolder }
      ])
    ],
    devServer: {
      contentBase: distFolder,
      historyApiFallback: true,
      hot: false,
      inline: true,
      publicPath: "/",
      index: "test.html",
      port: 8002
    }

  };
}
