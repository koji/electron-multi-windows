const path = require('path');

module.exports = {
  target: 'electron-main',
  entry: {
    main: './src/main/main.ts',
    preload: './src/preload/preload.ts',
    childPreload: './src/preload/childPreload.ts',
  },
  output: {
    path: path.resolve(__dirname, 'dist/main'),
    filename: '[name].js',
  },
  resolve: {
    extensions: ['.ts', '.js'],
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: {
          loader: 'ts-loader',
          options: {
            configFile: 'tsconfig.main.json'
          }
        },
        exclude: [/node_modules/, /\.test\.ts$/, /__tests__/],
      },
    ],
  },
  node: {
    __dirname: false,
    __filename: false,
  },
};
