'use strict';

const webpack = require('webpack');

function compile() {
    this.serverless.cli.log('Gather stack info...');
    const StackName = this.provider.naming.getStackName(this.options.stage);
    const serviceEndpointKey = this.provider.naming.getServiceEndpointRegex();
    return this.provider.request('CloudFormation', 'describeStacks', { StackName }, this.options.stage, this.options.region).then(
        (response) => {
            const stack = response.Stacks[0].Outputs.filter(x => x.OutputKey.match(serviceEndpointKey))[0];
            const endpoint = stack.OutputValue;
            this.serverless.cli.log(`Resolved endpoint: ${endpoint}`);

            this.serverless.cli.log('Bundle with Webpack...');
            const config = require(this.options['webpack-config-file'] || '../webpack.config.js');
            config.plugins.push(new webpack.DefinePlugin({
                'process.env.PUSHER_AUTH_ENDPOINT_RESOLVED': JSON.stringify(`${endpoint}${this.serverless.service.provider.environment.PUSHER_AUTH_ENDPOINT}`),
                'process.env.SCAN_ENDPOINT': JSON.stringify(`${endpoint}${this.serverless.service.custom.scanEndpoint}`),
            }));
            const compiler = webpack(config);
            return new Promise((resolve, reject) => {
                compiler.run((err, stats) => {
                    if (err) {
                        return reject(err);
                    } else {
                        this.serverless.cli.log(stats.toString({colors: true}));
                        if (stats.hasErrors()) {
                            return reject(stats.toString({errorDetails: true}));
                        } else {
                            return resolve();
                        }
                    }
                });
            });
        }
    );

}

class WebpackPlugin {
    constructor(serverless, options) {
        this.serverless = serverless;
        this.options = options;
        this.provider = this.serverless.getProvider('aws');

        this.commands = {
            webpack: {
                type: 'entrypoint',
                lifecycleEvents: [
                    'pack',
                ],
                options: {
                    'webpack-config-file': {
                        usage: 'Webpack config file',
                        shortcut: '-c',
                    },
                },
            },
        };
        this.hooks = {
            'after:deploy:deploy': compile.bind(this),
        };
    }
}

module.exports = WebpackPlugin;