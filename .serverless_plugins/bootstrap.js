'use strict';

const aws = require('aws-sdk');

const getDynamoDB = serverless => {
  const options = {
    region: serverless.service.custom.region,
    apiVersions: {
      dynamodb: '2012-08-10',
    }
  };
  serverless.cli.log(`AWS options: ${JSON.stringify(options)}`);
  aws.config.update(options);
  return new aws.DynamoDB();
}

const getTableName = (serverless, options) => {
  const table = serverless.service.resources.Resources[options.resource].Properties.TableName;
  return table.replace(serverless.service.custom.stage, options['target-stage'] || 'dev');
}

const deleteItem = (dynamodb, params, serverless) => new Promise((resolve, reject) => {
  dynamodb.deleteItem(params, (error) => {
    if (error) {
      return reject(error);
    }
    serverless.cli.log(`Deleted ${JSON.stringify(params)}`);
    return resolve();
  });
});

const truncate = (serverless, options) => new Promise((resolve, reject) => {
  const dynamodb = getDynamoDB(serverless);

  const params = {
    TableName: getTableName(serverless, options),
  }

  serverless.cli.log(`Scanning database: ${JSON.stringify(params)}`);
  dynamodb.scan(params, (error, result) => {
    if (error) {
      serverless.cli.log(`Error scanning kip database! ${JSON.stringify(error)}`);
      return reject(error);
    }

    serverless.cli.log(`Deleting ${JSON.stringify(result.Items.length)} items`);

    const deletes = [];
    result.Items.forEach(data => {
      const params = {
        TableName: getTableName(serverless, options),
        Item: data
      };
      deletes.push(deleteItem(dynamodb, params, serverless));
    });

    Promise.all(deletes).then(() => {
      serverless.cli.log('Database truncated successfully!')
      resolve();
    }).catch(error => {
      serverless.cli.log(`Error truncating database! ${JSON.stringify(error)}`);
      reject(error);
    });
  });
});

const writeItem = (dynamodb, params, serverless) => new Promise((resolve, reject) => {
  dynamodb.putItem(params, (error) => {
    if (error) {
      return reject(error);
    }
    serverless.cli.log(`Created new database entry: ${JSON.stringify(params)}`);
    return resolve();
  });
});

const create = (serverless, options) => new Promise((resolve, reject) => {
  const dynamodb = getDynamoDB(serverless);
  const writes = [];

  const records = require(options['file'] || 'db.js');
  serverless.cli.log(`Bootstrapping kip database with ${JSON.stringify(records.length)} items`);
  records.forEach(item => {
    const params = {
      TableName: getTableName(serverless, options),
      Item: item
    };
    writes.push(writeItem(dynamodb, params, serverless));
  });

  Promise.all(writes).then(() => {
    serverless.cli.log('Database bootstrapped successfully!')
    resolve();
  }).catch(error => {
    serverless.cli.log(`Error bootstrapping database! ${JSON.stringify(error)}`);
    reject(error);
  });
});

class BootstrapPlugin {
  constructor(serverless, options) {
    this.serverless = serverless;
    this.options = options;

    this.commands = {
      bootstrap: {
        usage: 'Bootstrap kip database',
        lifecycleEvents: [
          'truncate',
          'create',
        ],
        options: {
          resource: {
            usage: 'Specify name of resource for your table',
            required: true,
            shortcut: 'r'
          },
          'target-stage': {
            usage: 'Stage to operate with (default=\'dev\')',
            required: false,
            shortcut: 't'
          },
          file: {
            usage: 'Path to JSON questions file (default=\'db.js\'`)',
            required: false,
            shortcut: 'f'
          },
        },
      },
    };

    this.hooks = {
      'bootstrap:truncate': truncate.bind(null, serverless, options),
      'bootstrap:create': create.bind(null, serverless, options),
    };
  }
}

module.exports = BootstrapPlugin;
