'use strict';

const aws = require('aws-sdk');
const dynamoDb = new aws.DynamoDB.DocumentClient();

module.exports.create = (event, context, callback) => {
  const params = {
    TableName: process.env.DYNAMODB_TABLE,
    Item: event
  }
  dynamoDb.put(params, (error, result) => {
    var response;
    if (error) {
      console.error(error);
      response = {
        statusCode: error.statusCode || 501,
        body: JSON.stringify({
          input: event,
          success: false,
          error: `Error adding entry! ${JSON.stringify(error.message)}`
        }),
      };
    } else {
      response = {
        statusCode: 200,
        success: true,
      };
    }
    callback(null, response);
  });
};

module.exports.get = (event, context, callback) => {
  const params = {
    TableName: process.env.DYNAMODB_TABLE,
    Key: {
      id: event.pathParameters.id,
    }
  }
  dynamoDb.get(params, (error, result) => {
    var response;
    if (error) {
      console.error(error);
      response = {
        statusCode: error.statusCode || 501,
        input: event,
        success: false,
        error: `Error fetching item! ${JSON.stringify(error.message)}`
      };
    } else if (result.Item == null) { 
      response = {
        statusCode: 404,
        success: false,
      };
    } else {
      response = {
        statusCode: 200,
        success: true,
        result: result.Item,
      };
    }
    callback(null, response);
  });
};

module.exports.delete = (event, context, callback) => {
  const params = {
    TableName: process.env.DYNAMODB_TABLE,
    Key: {
      id: event.pathParameters.id,
    },
  }
  dynamoDb.delete(params, (error, result) => {
    var response;
    if (error) {
      console.error(error);
      response = {
        statusCode: error.statusCode || 501,
        input: event,
        success: false,
        error: `Error deleting item! ${JSON.stringify(error.message)}`
      };
    } else {
      response = {
        statusCode: 200,
        success: true,
      };
    }
    callback(null, response);
  });
};

module.exports.scan = (event, context, callback) => {
  const params = {
    TableName: process.env.DYNAMODB_TABLE,
  }
  dynamoDb.scan(params, (error, result) => {
    var response;
    if (error) {
      console.error(error);
      response = {
        statusCode: error.statusCode || 501,
        input: event,
        success: false,
        error: `Error deleting item! ${JSON.stringify(error.message)}`
      };
    } else {
      response = {
        statusCode: 200,
        success: true,
        result: {
          items: result.Items,
          count: result.Count,
        },
      };
    }
    callback(null, response);
  });
};