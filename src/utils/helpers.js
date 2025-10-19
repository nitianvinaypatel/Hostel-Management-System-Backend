const crypto = require('crypto');

const generateId = (prefix) => {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 7);
  return `${prefix}-${timestamp}-${random}`.toUpperCase();
};

const sanitizeInput = (data) => {
  if (typeof data === 'string') {
    return data.trim().replace(/[<>]/g, '');
  }
  
  if (typeof data === 'object' && data !== null) {
    const sanitized = {};
    for (const key in data) {
      sanitized[key] = sanitizeInput(data[key]);
    }
    return sanitized;
  }
  
  return data;
};

const generateResetToken = () => {
  const resetToken = crypto.randomBytes(32).toString('hex');
  const hashedToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');
  
  return { resetToken, hashedToken };
};

const getPaginationParams = (query) => {
  const page = parseInt(query.page) || 1;
  const limit = parseInt(query.limit) || 10;
  const skip = (page - 1) * limit;
  
  return { page, limit, skip };
};

module.exports = {
  generateId,
  sanitizeInput,
  generateResetToken,
  getPaginationParams
};
