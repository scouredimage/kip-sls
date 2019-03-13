const path = require('path');
const Dotenv = require('dotenv-webpack');

module.exports = {
    entry: './index.js',
    output: {
        filename: 'main.js',
        path: path.resolve(__dirname, 'static'),
        libraryTarget: 'var',
        library: 'Kip',
    },
    plugins: [
        new Dotenv(),
    ],
};