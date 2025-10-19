const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const authMiddleware = require('../middleware/auth.middleware');
const validate = require('../middleware/validation.middleware');
const {
  registerSchema,
  loginSchema,
  changePasswordSchema,
  forgotPasswordSchema,
  resetPasswordSchema
} = require('../validators/authValidator');

router.post('/register', validate(registerSchema), authController.register);
router.post('/login', validate(loginSchema), authController.login);
router.get('/me', authMiddleware, authController.getMe);
router.put('/update-profile', authMiddleware, authController.updateProfile);
router.put('/change-password', authMiddleware, validate(changePasswordSchema), authController.changePassword);
router.post('/forgot-password', validate(forgotPasswordSchema), authController.forgotPassword);
router.post('/reset-password/:token', validate(resetPasswordSchema), authController.resetPassword);

module.exports = router;
