const winston = require('winston');

const transports = [];

// File logging doesn't work in serverless (Vercel)
if (!process.env.VERCEL) {
  transports.push(
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' })
  );
}

// Always use console in production/serverless
transports.push(new winston.transports.Console({
  format: winston.format.simple()
}));

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports
});

module.exports = logger;
