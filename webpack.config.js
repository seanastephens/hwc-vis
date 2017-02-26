module.exports = {
  entry: ['babel-polyfill', __dirname + '/index.js'],
  output: {
    path: __dirname,
    filename: 'bundle.js'
  },
  module: {
    loaders: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        loader: 'babel-loader'
      }, {
				test: /\.css$/,
				loader: "style-loader!css-loader"
			}
		]
  },
  resolve: {
    extensions: ['.js']
  },
  devtool: 'sourcemap'
};
