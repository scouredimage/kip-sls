'use strict';

const AWS = require('aws-sdk');
const dynamoDb = new AWS.DynamoDB.DocumentClient();

module.exports.create = (event, context, callback) => {
  console.log(`Incoming create request: ${JSON.stringify(event)}`);
  const params = {
    TableName: process.env.DYNAMODB_TABLE,
    Item: JSON.parse(event.body)
  };
  dynamoDb.put(params, (error, result) => {
    const response = {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true
      }
    };
    if (error) {
      console.error(`Error adding entry: ${JSON.stringify(error)}`);
      response.statusCode = error.statusCode || 501;
      response.error = JSON.stringify(`Error adding entry! ${JSON.stringify(error.message)}`);
    }
    callback(null, response);
  });
};

module.exports.get = (event, context, callback) => {
  const params = {
    TableName: process.env.DYNAMODB_TABLE,
    Key: {
      id: event.pathParameters.id
    }
  };
  dynamoDb.get(params, (error, result) => {
    const response = {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true
      }
    };
    if (error) {
      console.error(`Error fetching item: ${JSON.stringify(error)}`);
      response.statusCode = error.statusCode || 501;
      response.error = `Error fetching item! ${JSON.stringify(error.message)}`;
    } else if (result.Item == null) { 
      response.statusCode = 404;
    } else {
      response.body = JSON.stringify({
        result: result.Item
      });
    }
    callback(null, response);
  });
};

module.exports.delete = (event, context, callback) => {
  const params = {
    TableName: process.env.DYNAMODB_TABLE,
    Key: {
      id: event.pathParameters.id
    }
  };
  dynamoDb.delete(params, (error, result) => {
    const response = {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true
      }
    };
    if (error) {
      console.error(error);
      response.statusCode = error.statusCode || 501;
      response.error = `Error deleting item! ${JSON.stringify(error.message)}`;
    }
    callback(null, response);
  });
};

module.exports.scan = (event, context, callback) => {
  const params = {
    TableName: process.env.DYNAMODB_TABLE
  };
  dynamoDb.scan(params, (error, result) => {
    console.log(`Scan result: ${JSON.stringify(result)}`);
    const response = {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true
      }
    };
    if (error) {
      console.error(`Scan error: ${JSON.stringify(error)}`);
      response.statusCode = error.statusCode || 501;
      response.error = `Error scanning table! ${JSON.stringify(error.message)}`;
    } else {
      response.body = JSON.stringify({
        result: {
          items: result.Items,
          count: result.Count
        }
      });
    }
    callback(null, response);
  });
};

module.exports.auth = (event, context, callback) => {
  const Pusher = require('pusher');
  const pusher = new Pusher({
    appId: process.env.PUSHER_APP_ID,
    key: process.env.PUSHER_APP_KEY,
    secret: process.env.PUSHER_APP_SECRET,
    cluster: process.env.PUSHER_APP_CLUSTER
  });

  const { parse } = require('querystring');
  const request = parse(event.body);
  console.log(`Incoming auth request: ${JSON.stringify(request)}`);

  const response = {
    statusCode: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Credentials': true
    },
    body: JSON.stringify(
      pusher.authenticate(request.socket_id, request.channel_name)
    )
  };
  callback(null, response);
};
