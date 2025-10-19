# Hostel Management System - Backend API

A comprehensive backend API for managing hostel operations including student management, complaints, requisitions, payments, and real-time notifications.

## 🚀 Features

- **Authentication & Authorization**: JWT-based auth with role-based access control (Student, Caretaker, Warden, Dean, Admin)
- **Student Management**: Profile management, room allocation, fee tracking
- **Complaint System**: File and track complaints with multi-level status updates
- **Requisition Management**: Multi-level approval workflow (Caretaker → Warden → Dean → Admin)
- **Payment Integration**: Razorpay integration for online fee payments
- **Real-time Updates**: Socket.io for live notifications and messaging
- **File Upload**: Cloudinary integration for secure file storage
- **Email Notifications**: Automated email alerts for important events
- **Security**: Rate limiting, XSS protection, NoSQL injection prevention

## 📋 Tech Stack

- **Runtime**: Node.js v18+
- **Framework**: Express.js v5.x
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT + bcryptjs
- **Payment Gateway**: Razorpay
- **File Storage**: Cloudinary
- **Real-time**: Socket.io
- **Email**: Nodemailer
- **Validation**: Joi
- **Logging**: Winston + Morgan
- **Security**: Helmet, express-rate-limit, express-mongo-sanitize, xss-clean

## 🛠️ Quick Start

### Prerequisites
- Node.js v18 or higher
- MongoDB (local or Atlas)
- npm or yarn

### Installation

1. **Clone and install**
```bash
git clone <repository-url>
cd hms-backend
npm install
```

2. **Configure environment**
```bash
cp .env.example .env
# Edit .env with your credentials
```

3. **Start the server**
```bash
# Development mode
npm run dev

# Production mode
npm start
```

Server runs at `http://localhost:5000`

For detailed setup instructions, see [QUICK_START.md](./QUICK_START.md)

## 📚 Documentation

- **[Quick Start Guide](./QUICK_START.md)** - Get started quickly
- **[API Testing Guide](./API_TESTING.md)** - Test all endpoints
- **[Deployment Guide](./DEPLOYMENT.md)** - Deploy to production
- **[Backend Requirements](./BACKEND_REQUIREMENTS.md)** - Complete specifications

## 🔧 Environment Variables

Create a `.env` file with these variables:

```env
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://localhost:27017/hms
JWT_SECRET=your_secure_random_string
RAZORPAY_KEY_ID=your_razorpay_key
CLOUDINARY_CLOUD_NAME=your_cloud_name
EMAIL_USER=your_email@gmail.com
```

See `.env.example` for all available options.

## 📁 Project Structure

```
backend/
├── src/
│   ├── config/          # Configuration (DB, email, etc.)
│   ├── models/          # Mongoose models
│   ├── controllers/     # Route controllers
│   ├── routes/          # API routes
│   ├── middleware/      # Custom middleware
│   ├── services/        # Business logic
│   ├── utils/           # Utility functions
│   ├── validators/      # Input validation
│   ├── socket/          # Socket.io handlers
│   └── app.js           # Express app
├── logs/                # Application logs
├── server.js            # Entry point
└── package.json         # Dependencies
```

## 🔌 API Endpoints

### Authentication
```
POST   /api/auth/register          Register new user
POST   /api/auth/login             User login
GET    /api/auth/me                Get current user
PUT    /api/auth/change-password   Change password
POST   /api/auth/forgot-password   Request password reset
```

### Student
```
GET    /api/student/dashboard           Get dashboard data
GET    /api/student/profile             Get profile
POST   /api/student/complaints          File complaint
GET    /api/student/complaints          Get all complaints
GET    /api/student/payments/pending    Get pending payments
POST   /api/student/payments/initiate   Initiate payment
POST   /api/student/payments/verify     Verify payment
GET    /api/student/notifications       Get notifications
```

### Caretaker
```
GET    /api/caretaker/dashboard              Get dashboard
GET    /api/caretaker/complaints             Get complaints
PUT    /api/caretaker/complaints/:id/status  Update status
POST   /api/caretaker/requisitions           Create requisition
GET    /api/caretaker/requisitions           Get requisitions
```

### Common
```
POST   /api/upload/image      Upload image
POST   /api/upload/document   Upload document
```

For complete API documentation, see [API_TESTING.md](./API_TESTING.md)

## 🧪 Testing

### Quick Test with cURL

**Register:**
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"student@test.com","password":"pass123","name":"John","role":"student","studentId":"STU001"}'
```

**Login:**
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"student@test.com","password":"pass123"}'
```

## 🔒 Security Features

- Helmet.js for security headers
- Rate limiting (100 req/15min, 5 for auth)
- MongoDB injection prevention
- XSS protection
- CORS configuration
- JWT authentication
- Password hashing with bcrypt
- Input validation with Joi

## 📊 Response Format

**Success:**
```json
{
  "success": true,
  "message": "Operation successful",
  "data": {...},
  "timestamp": "2024-01-20T10:30:00.000Z"
}
```

**Error:**
```json
{
  "success": false,
  "message": "Error message",
  "errors": [...],
  "timestamp": "2024-01-20T10:30:00.000Z"
}
```

## 🚀 Deployment

### Quick Deploy Options

- **Render**: Connect GitHub, auto-deploy (Free tier)
- **Railway**: One-click deployment (Free tier)
- **AWS EC2**: Full control, scalable (Paid)

For detailed deployment instructions, see [DEPLOYMENT.md](./DEPLOYMENT.md)

## 📝 Available Scripts

```bash
npm start      # Start production server
npm run dev    # Start development server
npm test       # Run tests
```

## 🐛 Troubleshooting

**MongoDB Connection Error:**
- Ensure MongoDB is running
- Check connection string in `.env`

**Port Already in Use:**
```bash
lsof -i :5000
kill -9 <PID>
```

**Module Not Found:**
```bash
rm -rf node_modules package-lock.json
npm install
```

## 🎯 Roadmap

- [x] Authentication & Authorization
- [x] Student Module
- [x] Caretaker Module
- [x] Payment Integration
- [x] File Upload
- [x] Real-time Notifications
- [ ] Warden Module
- [ ] Dean Module
- [ ] Admin Module
- [ ] Swagger Documentation
- [ ] Unit & Integration Tests

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Open Pull Request

## 📄 License

ISC License

## 💬 Support

- Create an issue in the repository
- Check documentation files
- Review logs in `logs/` directory

---

**Built with ❤️ for efficient hostel management**
