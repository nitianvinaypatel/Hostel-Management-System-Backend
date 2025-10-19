const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');
const { errorHandler } = require('./middleware/error.middleware');

const app = express();

app.use(helmet());

// Custom MongoDB sanitization middleware (Express 5.x compatible)
app.use((req, res, next) => {
  const sanitize = (obj) => {
    if (obj && typeof obj === 'object') {
      Object.keys(obj).forEach(key => {
        if (key.startsWith('$') || key.includes('.')) {
          delete obj[key];
        } else if (typeof obj[key] === 'object') {
          sanitize(obj[key]);
        }
      });
    }
    return obj;
  };
  
  if (req.body) sanitize(req.body);
  if (req.query) sanitize(req.query);
  if (req.params) sanitize(req.params);
  
  next();
});

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 900000,
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  message: 'Too many requests from this IP, please try again later'
});

app.use('/api/', limiter);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: 'Too many authentication attempts, please try again later'
});

app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Hostel Management System API',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString()
  });
});

app.use('/api/auth', require('./routes/auth.routes'));
app.use('/api/student', require('./routes/student.routes'));
app.use('/api/caretaker', require('./routes/caretaker.routes'));
app.use('/api/warden', require('./routes/warden.routes'));
app.use('/api/admin', require('./routes/admin.routes'));
app.use('/api/dean', require('./routes/dean.routes'));
app.use('/api', require('./routes/common.routes'));

// 404 handler - must be after all routes
app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`,
    timestamp: new Date().toISOString()
  });
});

app.use(errorHandler);

module.exports = app;
