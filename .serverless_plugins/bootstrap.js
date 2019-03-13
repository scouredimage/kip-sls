'use strict';

const invoke = (serverless, provider, fn, data = {}, invocationType = 'RequestResponse', log = 'Tail') => {
  const functionObj = serverless.service.getFunction(fn);
  const params = {
    FunctionName: functionObj.name,
    InvocationType: invocationType,
    LogType: log,
    Payload: new Buffer(JSON.stringify(data)),
  };
  return provider.request('Lambda', 'invoke', params);
}

const getTableName = (serverless, options) => {
  const table = serverless.service.resources.Resources[options.name].Properties.TableName;
  return table.replace(serverless.service.custom.stage, options['target-stage'] || 'dev');
}

const deleteItem = (provider, params, serverless) => new Promise((resolve, reject) => {
  invoke(serverless, provider, 'delete', params).then((response) => {
    const result = JSON.parse(response.Payload);
    if (result.statusCode !== 200) {
      return reject(JSON.parse(result.body).error);
    } else {
      serverless.cli.log(`Deleted item: ${JSON.stringify(params.pathParameters.id)}`);
      return resolve();
    }
  }).catch(error => {
    return reject(error);
  });
});

const truncate = (serverless, options, provider) => new Promise((resolve, reject) => {
  invoke(serverless, provider, 'scan').then((response) => {
    serverless.cli.log(`Scan database result: ${JSON.stringify(response)}`);
    const result = JSON.parse(JSON.parse(response.Payload).body).result;
    serverless.cli.log(`Scan database result: ${JSON.stringify(result)}`);
    serverless.cli.log(`Deleting ${JSON.stringify(result.count)} items`);

    const deletes = [];
    result.items.forEach(data => {
      const params = {
        pathParameters: {
          id: data.id
        }
      };
      deletes.push(deleteItem(provider, params, serverless));
    });

    Promise.all(deletes).then(() => {
      serverless.cli.log('Database truncated successfully!')
      return resolve();
    }).catch(error => {
      serverless.cli.log(`Error truncating database! ${JSON.stringify(error)}`);
      return reject(error);
    });

  }).catch(error => {
    serverless.cli.log(`Error scanning kip database! ${JSON.stringify(error)}`);
    return reject(error);
  });
});

const writeItem = (provider, item, serverless) => new Promise((resolve, reject) => {
  invoke(serverless, provider, 'create', {body: JSON.stringify(item)}).then((response) => {
    serverless.cli.log(`Create item repsonse: ${JSON.stringify(response)}`);
    const result = JSON.parse(response.Payload);
    if (result.statusCode !== 200) {
      return reject(JSON.parse(result.body).error);
    } else {
      serverless.cli.log(`Created new database entry: ${JSON.stringify(item)}`);
      return resolve(result);
    }
  }).catch(error => { 
    return reject(error);
  });
});

const create = (serverless, options, provider) => new Promise((resolve, reject) => {
  const writes = [];

  const items = require(options['file'] || '../db.json');
  serverless.cli.log(`Bootstrapping kip database with ${JSON.stringify(items.length)} items`);
  items.forEach(item => {
    writes.push(writeItem(provider, item, serverless));
  });

  Promise.all(writes).then(() => {
    serverless.cli.log('Database bootstrapped successfully!')
    return resolve();
  }).catch(error => {
    serverless.cli.log(`Error bootstrapping database! ${JSON.stringify(error)}`);
    return reject(error);
  });
});

class BootstrapPlugin {
  constructor(serverless, options) {
    this.serverless = serverless;
    this.options = options;
    this.provider = this.serverless.getProvider('aws')

    this.commands = {
      bootstrap: {
        usage: 'Bootstrap kip database',
        lifecycleEvents: [
          'truncate',
          'create',
        ],
        options: {
          name: {
            usage: 'Specify name of resource for your table',
            required: true,
            shortcut: 'n'
          },
          'target-stage': {
            usage: 'Stage to operate with (default=\'dev\')',
            required: false,
            shortcut: 't'
          },
          file: {
            usage: 'Path to JSON questions file (default=\'db.json\'`)',
            required: false,
            shortcut: 'f'
          },
        },
      },
    };

    this.hooks = {
      'bootstrap:truncate': truncate.bind(null, this.serverless, this.options, this.provider),
      'bootstrap:create': create.bind(null, this.serverless, this.options, this.provider),
    };
  }
}

module.exports = BootstrapPlugin;
