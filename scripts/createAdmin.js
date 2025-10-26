require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../src/models/User');

const createAdmin = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✓ Connected to MongoDB');

    // Check if admin already exists
    const existingAdmin = await User.findOne({ email: 'admin@hms.com' });
    if (existingAdmin) {
      console.log('⚠ Admin user already exists!');
      console.log('Email:', existingAdmin.email);
      console.log('Name:', existingAdmin.name);
      process.exit(0);
    }

    // Create admin user
    const admin = await User.create({
      email: 'admin@hms.com',
      password: 'Admin@123',
      name: 'System Administrator',
      role: 'admin',
      phone: '+919999999999',
      isActive: true,
      isEmailVerified: true
    });

    console.log('\n✓ Admin user created successfully!');
    console.log('==========================================');
    console.log('Email:', admin.email);
    console.log('Password: Admin@123');
    console.log('Role:', admin.role);
    console.log('==========================================');
    console.log('\n⚠ IMPORTANT: Please change the password after first login!');
    
    process.exit(0);
  } catch (error) {
    console.error('✗ Error creating admin user:', error.message);
    process.exit(1);
  }
};

createAdmin();
