const path = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const { CleanWebpackPlugin } = require("clean-webpack-plugin");
const CopyWebpackPlugin = require("copy-webpack-plugin");

module.exports = {
  entry: "./public/js/main.js",
  output: {
    path: path.resolve(__dirname, "dist"),
    publicPath: "/", // updated to root for simplicity in dev
    filename: "bundle.js"
  },
  mode: "development",
  devServer: {
    static: {
      directory: path.resolve(__dirname, "public")
    },
    port: 8081, // frontend on 8081
    open: true,
    historyApiFallback: true,
    proxy: {
      "/api": "http://localhost:8080",
      "/recommend": "http://localhost:8080" // redirect /api to backend server
    }
  },
  plugins: [
    new CleanWebpackPlugin(),
    new HtmlWebpackPlugin({
      template: "./index.html",
      filename: "index.html"
    }),
    new CopyWebpackPlugin({
      patterns: [
        { from: "workout_recommendation.py", to: "workout_recommendation.py" },
        { from: "workouts_data.py", to: "workouts_data.py" },
        { from: "server.js", to: "server.js" },
        { from: "workouts.js", to: "workouts.js" },
        { from: "data_workout_final.csv", to: "data_workout_final.csv" },
        { from: "public/css/style.css", to: "style.css" },
        { from: "public/picture", to: "picture" }
      ]
    })
  ],
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: "babel-loader",
          options: {
            presets: ["@babel/preset-env"]
          }
        }
      },
      {
        test: /\.css$/i,
        use: ["style-loader", "css-loader"]
      }
    ]
  }
};
