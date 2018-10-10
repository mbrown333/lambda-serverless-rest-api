const serverless = require('serverless-http');
const bodyParser = require('body-parser');
const express = require('express');
const app = express();
const AWS = require('aws-sdk');
const uuid = require('node-uuid');

const { TODOS_TABLE, IS_OFFLINE } = process.env;

const dynamoDb = IS_OFFLINE === 'true' ?
  new AWS.DynamoDB.DocumentClient({
    region: 'localhost',
    endpoint: 'http://localhost:8000',
  }) :
  new AWS.DynamoDB.DocumentClient();

app.use(bodyParser.json({ strict: false }));

app.get('/todos', (req, res) => {
  const params = {
    TableName: TODOS_TABLE,
  };

  dynamoDb.scan(params, (error, result) => {
    if (error) {
      res.status(400).json({ error: 'Error retrieving Todos'});
    }

    const { Items: todos } = result;

    res.json({ todos });
  })
});

app.get('/todos/:todoId', (req, res) => {
  const { todoId } = req.params;

  const params = {
    TableName: TODOS_TABLE,
    Key: {
      todoId,
    },
  };

  dynamoDb.get(params, (error, result) => {
    if (error) {
      res.status(400).json({ error: 'Error retrieving Todo' });
    }

    if (result.Item) {
      const { todoId , title, done } = result.Item;
      res.json({ todoId, title, done });
    } else {
      res.status(404).json({ error: `Todo with id: ${todoId} not found` });
    }
  });
});

app.post('/todos', (req, res) => {
  const { title, done = false} = req.body;

  const todoId = uuid.v4();

  const params = {
    TableName: TODOS_TABLE,
    Item: {
      todoId,
      title,
      done,
    },
  };

  dynamoDb.put(params, (error) => {
    if (error) {
      console.log('Error creating Todo: ', error);
      res.status(400).json({ error: 'Could not create Todo' });
    }

    res.json({ todoId, title, done });
  });
});

app.put('/todos', (req, res) => {
  const { todoId, title, done } = req.body;

  var params = {
    TableName : TODOS_TABLE,
    Key: { todoId },
    UpdateExpression : 'set #a = :title, #b = :done',
    ExpressionAttributeNames: { '#a' : 'title', '#b': 'done' },
    ExpressionAttributeValues : { ':title' : title, ':done': done },
  };

  dynamoDb.update(params, (error) => {
    if (error) {
      console.log(`Error updating Todo with id ${todoId}: `, error);
      res.status(400).json({ error: 'Could not update Todo' });
    }

    res.json({ todoId, title, done });
  })
});

app.delete('/todos/:todoId', (req, res) => {
  const { todoId } = req.params;

  const params = {
    TableName: TODOS_TABLE,
    Key: {
      todoId,
    },
  };

  dynamoDb.delete(params, (error) => {
    if (error) {
      console.log(`Error updating Todo with id ${todoId}`, error);
      res.status(400).json({ error: 'Could not delete Todo' });
    }

    res.json({ success: true });
  });
});

module.exports.handler = serverless(app);