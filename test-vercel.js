// Quick test to verify serverless function works
process.env.VERCEL = '1';
process.env.MONGODB_URI = 'mongodb://localhost:27017/test';
process.env.JWT_SECRET = 'test-secret';

const handler = require('./server.js');

const mockReq = {
  method: 'GET',
  url: '/',
  headers: {},
  body: {},
  query: {},
  params: {}
};

const mockRes = {
  statusCode: 200,
  headers: {},
  status(code) {
    this.statusCode = code;
    return this;
  },
  json(data) {
    console.log('Response:', JSON.stringify(data, null, 2));
    return this;
  },
  send(data) {
    console.log('Response:', data);
    return this;
  },
  setHeader(key, value) {
    this.headers[key] = value;
  }
};

console.log('Testing serverless function...');
handler(mockReq, mockRes).catch(err => {
  console.error('Error:', err.message);
});
