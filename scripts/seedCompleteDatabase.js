require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Import all models
const User = require('../src/models/User');
const Student = require('../src/models/Student');
const Caretaker = require('../src/models/Caretaker');
const Warden = require('../src/models/Warden');
const Admin = require('../src/models/Admin');
const Dean = require('../src/models/Dean');
const Hostel = require('../src/models/Hostel');
const Room = require('../src/models/Room');
const Complaint = require('../src/models/Complaint');
const Request = require('../src/models/Request');
const Requisition = require('../src/models/Requisition');
const MessMenu = require('../src/models/MessMenu');
const Notification = require('../src/models/Notification');
const FeeStructure = require('../src/models/FeeStructure');
const Payment = require('../src/models/Payment');
const Event = require('../src/models/Event');
const Notice = require('../src/models/Notice');
const Feedback = require('../src/models/Feedback');
const Rating = require('../src/models/Rating');
const EmergencyContact = require('../src/models/EmergencyContact');
const HostelApplication = require('../src/models/HostelApplication');
const Message = require('../src/models/Message');
const Inventory = require('../src/models/Inventory');

const { generateId } = require('../src/utils/helpers');

// ==================== UTILITY FUNCTIONS ====================

const log = (emoji, message) => console.log(`${emoji} ${message}`);
const logSection = (title) => {
  console.log('\n' + '═'.repeat(60));
  console.log(`  ${title}`);
  console.log('═'.repeat(60));
};

// ==================== DATA GENERATORS ====================

const generateHostels = () => {
  return [
    {
      name: 'Boys Hostel A',
      code: 'BHA',
      type: 'boys',
      totalRooms: 100,
      totalCapacity: 200,
      occupiedCapacity: 0,
      facilities: ['WiFi', 'Gym', 'Common Room', 'Laundry', 'Mess', 'Library', 'Sports Room'],
      address: 'Campus North Wing, Block A',
      contactNumber: '+91-9876543210',
      isActive: true
    },
    {
      name: 'Boys Hostel B',
      code: 'BHB',
      type: 'boys',
      totalRooms: 100,
      totalCapacity: 200,
      occupiedCapacity: 0,
      facilities: ['WiFi', 'Gym', 'Common Room', 'Laundry', 'Mess', 'Study Hall'],
      address: 'Campus North Wing, Block B',
      contactNumber: '+91-9876543211',
      isActive: true
    },
    {
      name: 'Girls Hostel A',
      code: 'GHA',
      type: 'girls',
      totalRooms: 80,
      totalCapacity: 160,
      occupiedCapacity: 0,
      facilities: ['WiFi', 'Gym', 'Common Room', 'Laundry', 'Mess', 'Library', 'Yoga Room'],
      address: 'Campus South Wing, Block A',
      contactNumber: '+91-9876543212',
      isActive: true
    },
    {
      name: 'Girls Hostel B',
      code: 'GHB',
      type: 'girls',
      totalRooms: 80,
      totalCapacity: 160,
      occupiedCapacity: 0,
      facilities: ['WiFi', 'Gym', 'Common Room', 'Laundry', 'Mess', 'Music Room'],
      address: 'Campus South Wing, Block B',
      contactNumber: '+91-9876543213',
      isActive: true
    },
    {
      name: 'International Hostel',
      code: 'IH',
      type: 'mixed',
      totalRooms: 60,
      totalCapacity: 120,
      occupiedCapacity: 0,
      facilities: ['WiFi', 'Gym', 'Common Room', 'Laundry', 'Mess', 'Conference Room', 'Cafeteria'],
      address: 'Campus East Wing',
      contactNumber: '+91-9876543214',
      isActive: true
    }
  ];
};

const generateRooms = (hostels) => {
  const rooms = [];
  const roomTypes = ['single', 'double', 'triple', 'quad'];
  const capacities = { single: 1, double: 2, triple: 3, quad: 4 };
  const facilities = ['AC', 'Attached Bathroom', 'Study Table', 'Wardrobe', 'WiFi', 'Balcony', 'Fan', 'Bed', 'Mattress'];
  
  hostels.forEach(hostel => {
    const roomsPerHostel = hostel.code === 'IH' ? 60 : hostel.type === 'girls' ? 80 : 100;
    const floorsCount = hostel.code === 'IH' ? 6 : hostel.type === 'girls' ? 8 : 10;
    const roomsPerFloor = Math.ceil(roomsPerHostel / floorsCount);
    
    for (let floor = 1; floor <= floorsCount; floor++) {
      for (let roomNum = 1; roomNum <= roomsPerFloor; roomNum++) {
        const type = roomTypes[Math.floor(Math.random() * roomTypes.length)];
        const roomNumber = `${floor}${String(roomNum).padStart(2, '0')}`;
        
        rooms.push({
          roomNumber,
          hostelId: hostel._id,
          floor,
          capacity: capacities[type],
          roomType: type,
          facilities: facilities.slice(0, Math.floor(Math.random() * 4) + 5),
          currentOccupancy: 0,
          occupiedBy: [],
          status: 'available',
          monthlyRent: type === 'single' ? 6000 : type === 'double' ? 5000 : type === 'triple' ? 4000 : 3500
        });
      }
    }
  });
  
  return rooms;
};

const generateMessMenu = (hostels) => {
  const messMenuData = {
    monday: {
      breakfast: { items: ['Idli', 'Sambar', 'Coconut Chutney', 'Tea/Coffee', 'Banana'], time: '7:30 AM - 9:30 AM' },
      lunch: { items: ['Rice', 'Dal Tadka', 'Mixed Veg Curry', 'Chapati', 'Curd', 'Pickle', 'Papad'], time: '12:30 PM - 2:30 PM' },
      snacks: { items: ['Samosa', 'Green Chutney', 'Tea/Coffee'], time: '4:30 PM - 5:30 PM' },
      dinner: { items: ['Chapati', 'Paneer Butter Masala', 'Jeera Rice', 'Dal Fry', 'Salad'], time: '7:30 PM - 9:30 PM' }
    },
    tuesday: {
      breakfast: { items: ['Poha', 'Jalebi', 'Tea/Coffee', 'Boiled Eggs'], time: '7:30 AM - 9:30 AM' },
      lunch: { items: ['Rice', 'Rajma Curry', 'Aloo Gobi', 'Chapati', 'Buttermilk', 'Pickle'], time: '12:30 PM - 2:30 PM' },
      snacks: { items: ['Bread Pakora', 'Tomato Ketchup', 'Tea/Coffee'], time: '4:30 PM - 5:30 PM' },
      dinner: { items: ['Chapati', 'Chicken Curry', 'Veg Pulao', 'Raita', 'Salad'], time: '7:30 PM - 9:30 PM' }
    },
    wednesday: {
      breakfast: { items: ['Upma', 'Coconut Chutney', 'Tea/Coffee', 'Banana'], time: '7:30 AM - 9:30 AM' },
      lunch: { items: ['Rice', 'Chole Masala', 'Bhindi Fry', 'Chapati', 'Curd', 'Pickle'], time: '12:30 PM - 2:30 PM' },
      snacks: { items: ['Veg Cutlet', 'Green Chutney', 'Tea/Coffee'], time: '4:30 PM - 5:30 PM' },
      dinner: { items: ['Chapati', 'Dal Makhani', 'Veg Biryani', 'Raita', 'Salad'], time: '7:30 PM - 9:30 PM' }
    },
    thursday: {
      breakfast: { items: ['Paratha', 'Aloo Sabzi', 'Curd', 'Tea/Coffee', 'Pickle'], time: '7:30 AM - 9:30 AM' },
      lunch: { items: ['Rice', 'Sambar', 'Cabbage Poriyal', 'Chapati', 'Rasam', 'Papad'], time: '12:30 PM - 2:30 PM' },
      snacks: { items: ['Aloo Bonda', 'Coconut Chutney', 'Tea/Coffee'], time: '4:30 PM - 5:30 PM' },
      dinner: { items: ['Chapati', 'Egg Curry', 'Jeera Rice', 'Dal', 'Salad'], time: '7:30 PM - 9:30 PM' }
    },
    friday: {
      breakfast: { items: ['Dosa', 'Potato Masala', 'Sambar', 'Coconut Chutney', 'Tea/Coffee'], time: '7:30 AM - 9:30 AM' },
      lunch: { items: ['Rice', 'Fish Curry', 'Beans Fry', 'Chapati', 'Curd', 'Pickle'], time: '12:30 PM - 2:30 PM' },
      snacks: { items: ['Paneer Pakora', 'Green Chutney', 'Tea/Coffee'], time: '4:30 PM - 5:30 PM' },
      dinner: { items: ['Chapati', 'Kadai Paneer', 'Veg Fried Rice', 'Manchurian', 'Salad'], time: '7:30 PM - 9:30 PM' }
    },
    saturday: {
      breakfast: { items: ['Puri', 'Chole', 'Halwa', 'Tea/Coffee', 'Banana'], time: '7:30 AM - 9:30 AM' },
      lunch: { items: ['Rice', 'Chicken Biryani', 'Raita', 'Boiled Egg', 'Salad', 'Pickle'], time: '12:30 PM - 2:30 PM' },
      snacks: { items: ['Veg Sandwich', 'Tomato Ketchup', 'Tea/Coffee'], time: '4:30 PM - 5:30 PM' },
      dinner: { items: ['Chapati', 'Mutton Curry', 'Jeera Rice', 'Dal', 'Salad'], time: '7:30 PM - 9:30 PM' }
    },
    sunday: {
      breakfast: { items: ['Bread Toast', 'Butter', 'Jam', 'Omelette', 'Tea/Coffee', 'Fruits'], time: '8:00 AM - 10:00 AM' },
      lunch: { items: ['Rice', 'Special Thali', 'Paneer Tikka', 'Naan', 'Sweet Dish', 'Salad'], time: '12:30 PM - 2:30 PM' },
      snacks: { items: ['Pav Bhaji', 'Onion', 'Lemon', 'Tea/Coffee'], time: '4:30 PM - 5:30 PM' },
      dinner: { items: ['Chapati', 'Mix Veg', 'Dal Tadka', 'Rice', 'Ice Cream', 'Salad'], time: '7:30 PM - 9:30 PM' }
    }
  };
  
  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  const menus = [];
  
  hostels.forEach(hostel => {
    days.forEach(day => {
      menus.push({
        hostelId: hostel._id,
        day,
        meals: messMenuData[day],
        specialMenu: day === 'sunday',
        occasion: day === 'sunday' ? 'Weekend Special' : null,
        effectiveFrom: new Date(),
        isActive: true
      });
    });
  });
  
  return menus;
};

// ==================== MAIN SEED FUNCTION ====================

async function seedCompleteDatabase() {
  try {
    logSection('🚀 STARTING COMPLETE DATABASE SEEDING');
    
    // Define common data arrays at the top
    const bloodGroups = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'];
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    log('✅', 'Connected to MongoDB');
    
    // Clear all collections
    logSection('🗑️  CLEARING ALL COLLECTIONS');
    await Promise.all([
      User.deleteMany({}),
      Student.deleteMany({}),
      Caretaker.deleteMany({}),
      Warden.deleteMany({}),
      Admin.deleteMany({}),
      Dean.deleteMany({}),
      Hostel.deleteMany({}),
      Room.deleteMany({}),
      Complaint.deleteMany({}),
      Request.deleteMany({}),
      Requisition.deleteMany({}),
      MessMenu.deleteMany({}),
      Notification.deleteMany({}),
      FeeStructure.deleteMany({}),
      Payment.deleteMany({}),
      Event.deleteMany({}),
      Notice.deleteMany({}),
      Feedback.deleteMany({}),
      Rating.deleteMany({}),
      EmergencyContact.deleteMany({}),
      HostelApplication.deleteMany({}),
      Message.deleteMany({}),
      Inventory.deleteMany({})
    ]);
    log('✅', 'All collections cleared');
    
    // Create Hostels
    logSection('🏢 CREATING HOSTELS');
    const hostelData = generateHostels();
    const hostels = await Hostel.insertMany(hostelData);
    log('✅', `Created ${hostels.length} hostels`);
    
    // Create Admin
    logSection('👤 CREATING ADMIN');
    const adminUser = await User.create({
      email: 'admin@hms.com',
      password: 'Admin@123',
      name: 'System Administrator',
      role: 'admin',
      phone: '+91-9999999999',
      isActive: true,
      isEmailVerified: true
    });
    
    await Admin.create({
      userId: adminUser._id,
      employeeId: 'EMP-ADMIN-001',
      designation: 'Super Admin',
      joinDate: new Date('2020-01-01'),
      accessLevel: 'full',
      isSuperAdmin: true,
      canAccessAllHostels: true,
      salary: 80000
    });
    log('✅', `Created admin: ${adminUser.email} / Admin@123`);
    
    // Create Dean
    logSection('🎓 CREATING DEAN');
    const deanUser = await User.create({
      email: 'dean@hms.com',
      password: 'Dean@123',
      name: 'Dr. Rajesh Kumar',
      role: 'dean',
      phone: '+91-9999999998',
      isActive: true,
      isEmailVerified: true
    });
    
    await Dean.create({
      userId: deanUser._id,
      employeeId: 'EMP-DEAN-001',
      designation: 'Dean of Students',
      qualification: 'PhD in Education Management',
      specialization: 'Student Welfare',
      experience: 15,
      joinDate: new Date('2015-06-01'),
      overseeingHostels: hostels.map(h => h._id),
      salary: 120000,
      degrees: [{
        degree: 'PhD',
        field: 'Education Management',
        university: 'Delhi University',
        year: 2010
      }]
    });
    log('✅', `Created dean: ${deanUser.email} / Dean@123`);
    
    // Create Wardens and Caretakers
    logSection('👥 CREATING WARDENS & CARETAKERS');
    const wardens = [];
    const caretakers = [];
    
    const wardenNames = [
      { name: 'Dr. Suresh Patel', qualification: 'PhD in Psychology', specialization: 'Student Counseling', experience: 12 },
      { name: 'Prof. Ramesh Iyer', qualification: 'M.Ed in Educational Administration', specialization: 'Hostel Management', experience: 10 },
      { name: 'Dr. Meena Sharma', qualification: 'PhD in Social Work', specialization: 'Student Welfare', experience: 15 },
      { name: 'Prof. Lakshmi Reddy', qualification: 'MBA in Administration', specialization: 'Facility Management', experience: 8 },
      { name: 'Dr. Anil Kumar', qualification: 'PhD in Management', specialization: 'Operations Management', experience: 14 }
    ];
    
    const caretakerNames = [
      { name: 'Mohan Lal', experience: 8, specialization: 'Electrical & Plumbing' },
      { name: 'Ravi Kumar', experience: 6, specialization: 'General Maintenance' },
      { name: 'Sunita Devi', experience: 10, specialization: 'Housekeeping & Hygiene' },
      { name: 'Kamala Bai', experience: 7, specialization: 'Mess & Kitchen Management' },
      { name: 'Rajesh Singh', experience: 9, specialization: 'Security & Maintenance' }
    ];
    
    for (let i = 0; i < hostels.length; i++) {
      const hostel = hostels[i];
      const wardenData = wardenNames[i];
      const caretakerData = caretakerNames[i];
      
      // Create Warden
      const wardenEmail = wardenData.name.toLowerCase().replace(/dr\.\s*/g, '').replace(/prof\.\s*/g, '').replace(/\s+/g, '.') + '@hms.com';
      const wardenNameWithoutTitle = wardenData.name.replace(/^(Dr\.|Prof\.)\s*/i, '');
      
      try {
        const wardenUser = await User.create({
          email: wardenEmail,
          password: 'Warden@123',
          name: wardenData.name,
          role: 'warden',
          phone: `+91-${9800000000 + i}`,
          hostelId: hostel._id,
          isActive: true,
          isEmailVerified: true
        });
        
        const wardenProfile = await Warden.create({
          userId: wardenUser._id,
          employeeId: `EMP-WARDEN-${String(i + 1).padStart(3, '0')}`,
          hostelId: hostel._id,
          designation: i === 0 ? 'Chief Warden' : 'Warden',
          qualification: wardenData.qualification,
          specialization: wardenData.specialization,
          experience: wardenData.experience,
          joinDate: new Date(2024 - wardenData.experience, 6, 1),
          dateOfBirth: new Date(1970 + i, i % 12, (i * 5) % 28 + 1),
          gender: i % 2 === 0 ? 'male' : 'female',
          bloodGroup: bloodGroups[i % bloodGroups.length],
          address: `${i + 1}, Faculty Housing, Campus Area, University`,
          emergencyContactName: `${wardenNameWithoutTitle.split(' ')[0]} Family`,
          emergencyContactPhone: `+91-${9700000000 + i}`,
          emergencyContactRelation: 'Spouse',
          responsibilities: [
            'Overall hostel administration',
            'Student discipline and welfare',
            'Complaint resolution',
            'Budget management',
            'Staff supervision'
          ],
          officeHours: {
            start: '09:00 AM',
            end: '06:00 PM'
          },
          availableForEmergency: true,
          totalStudentsUnderSupervision: 0,
          totalComplaintsReviewed: 0,
          totalRequisitionsApproved: 0,
          salary: 60000 + (i * 5000),
          bankAccountNumber: `${1234567890 + i}`,
          bankName: 'State Bank of India',
          ifscCode: `SBIN000${1000 + i}`
        });
        
        wardens.push(wardenUser);
        hostel.wardenId = wardenUser._id;
        log('   ', `Created warden: ${wardenEmail}`);
      } catch (error) {
        console.error(`❌ Error creating warden ${i + 1}:`, error.message);
        throw error;
      }
      
      // Create Caretaker
      const caretakerEmail = caretakerData.name.toLowerCase().replace(/\s+/g, '.') + '@hms.com';
      
      try {
        const caretakerUser = await User.create({
          email: caretakerEmail,
          password: 'Caretaker@123',
          name: caretakerData.name,
          role: 'caretaker',
          phone: `+91-${9700000000 + i}`,
          hostelId: hostel._id,
          isActive: true,
          isEmailVerified: true
        });
        
        await Caretaker.create({
          userId: caretakerUser._id,
          employeeId: `EMP-CARE-${String(i + 1).padStart(3, '0')}`,
          hostelId: hostel._id,
          designation: 'Senior Caretaker',
          shift: 'full-day',
          joinDate: new Date(2024 - caretakerData.experience, 0, 15),
          dateOfBirth: new Date(1975 + i, i % 12, (i * 7) % 28 + 1),
          gender: i % 2 === 0 ? 'male' : 'female',
          bloodGroup: bloodGroups[(i + 2) % bloodGroups.length],
          address: `${i + 10}, Staff Quarters, Campus Area, University`,
          emergencyContactName: `${caretakerData.name.split(' ')[0]} Family`,
          emergencyContactPhone: `+91-${9600000000 + i}`,
          emergencyContactRelation: 'Family',
          specialization: caretakerData.specialization,
          experience: caretakerData.experience,
          responsibilities: [
            'Daily hostel maintenance',
            'Complaint handling and resolution',
            'Room inspection and cleanliness',
            'Mess coordination',
            'Student assistance',
            'Inventory management'
          ],
          workingHours: {
            start: '08:00 AM',
            end: '08:00 PM'
          },
          totalComplaintsHandled: 0,
          totalMaintenanceWorks: 0,
          salary: 35000 + (i * 2000),
          bankAccountNumber: `${2234567890 + i}`,
          bankName: 'State Bank of India',
          ifscCode: `SBIN000${2000 + i}`
        });
        
        caretakers.push(caretakerUser);
        hostel.caretakerIds = [caretakerUser._id];
        log('   ', `Created caretaker: ${caretakerEmail}`);
      } catch (error) {
        console.error(`❌ Error creating caretaker ${i + 1}:`, error.message);
        throw error;
      }
      
      await hostel.save();
    }
    
    log('✅', `Created ${wardens.length} wardens with professional profiles`);
    log('✅', `Created ${caretakers.length} caretakers with specialized skills`);
    
    // Create Rooms
    logSection('🏠 CREATING ROOMS');
    const roomData = generateRooms(hostels);
    const rooms = await Room.insertMany(roomData);
    log('✅', `Created ${rooms.length} rooms`);
    
    // Create Students
    logSection('👨‍🎓 CREATING STUDENTS');
    const courses = ['BTech', 'MTech', 'MBA', 'MCA', 'BBA', 'MSc'];
    const branches = ['Computer Science', 'Electronics', 'Mechanical', 'Civil', 'Electrical', 'IT'];
    
    const firstNames = {
      male: ['Rahul', 'Amit', 'Vikram', 'Arjun', 'Rohan', 'Karan', 'Aditya', 'Siddharth', 'Varun', 'Nikhil', 
             'Ankit', 'Harsh', 'Prateek', 'Abhishek', 'Rajat', 'Mohit', 'Vishal', 'Akash', 'Deepak', 'Gaurav'],
      female: ['Priya', 'Anjali', 'Neha', 'Pooja', 'Sneha', 'Riya', 'Kavya', 'Divya', 'Shreya', 'Ananya',
               'Sakshi', 'Nikita', 'Simran', 'Tanvi', 'Ishita', 'Meera', 'Aditi', 'Swati', 'Pallavi', 'Kritika']
    };
    
    const lastNames = ['Sharma', 'Kumar', 'Singh', 'Patel', 'Gupta', 'Verma', 'Reddy', 'Joshi', 'Mehta', 'Nair',
                       'Rao', 'Iyer', 'Desai', 'Malhotra', 'Kapoor', 'Agarwal', 'Bansal', 'Saxena', 'Pandey', 'Mishra'];
    
    const students = [];
    const studentProfiles = [];
    
    for (let i = 0; i < 100; i++) {
      const gender = i % 2 === 0 ? 'male' : 'female';
      const firstName = firstNames[gender][i % firstNames[gender].length];
      const lastName = lastNames[i % lastNames.length];
      const fullName = `${firstName} ${lastName}`;
      
      // Assign to appropriate hostel based on gender
      let hostel;
      if (gender === 'male') {
        hostel = hostels.find(h => h.type === 'boys') || hostels[0];
      } else {
        hostel = hostels.find(h => h.type === 'girls') || hostels[2];
      }
      
      const year = (i % 4) + 1;
      const semester = (year * 2) - (i % 2);
      
      const studentUser = await User.create({
        email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}${i + 1}@student.hms.com`,
        password: 'Student@123',
        name: fullName,
        role: 'student',
        phone: `+91-${9000000000 + i}`,
        isActive: true,
        isEmailVerified: true
      });
      
      const studentProfile = await Student.create({
        userId: studentUser._id,
        studentId: `STU${2024}${String(i + 1).padStart(4, '0')}`,
        course: courses[i % courses.length],
        branch: branches[i % branches.length],
        department: branches[i % branches.length],
        year,
        semester,
        gender,
        dateOfBirth: new Date(2000 + (i % 5), i % 12, (i % 28) + 1),
        bloodGroup: bloodGroups[i % bloodGroups.length],
        hostelId: hostel._id,
        guardianName: `${lastNames[i % lastNames.length]} ${firstNames.male[(i + 5) % firstNames.male.length]}`,
        guardianPhone: `+91-${8000000000 + i}`,
        guardianEmail: `guardian${i + 1}@example.com`,
        emergencyContact: `+91-${8000000000 + i}`,
        address: `${i + 1}, ${lastNames[i % lastNames.length]} Street, ${['Mumbai', 'Delhi', 'Bangalore', 'Chennai', 'Kolkata', 'Hyderabad'][i % 6]}, India`,
        admissionDate: new Date(2020 + year - 1, 6, 15)
      });
      
      students.push(studentUser);
      studentProfiles.push(studentProfile);
    }
    
    log('✅', `Created ${students.length} students with realistic data`);
    
    // Allocate Students to Rooms
    logSection('🔑 ALLOCATING STUDENTS TO ROOMS');
    let allocatedCount = 0;
    
    for (let i = 0; i < Math.min(60, studentProfiles.length); i++) {
      const student = studentProfiles[i];
      const availableRooms = rooms.filter(r => 
        r.hostelId.toString() === student.hostelId.toString() && 
        r.currentOccupancy < r.capacity
      );
      
      if (availableRooms.length > 0) {
        const room = availableRooms[0];
        room.occupiedBy.push(student._id);
        room.currentOccupancy++;
        await room.save();
        
        student.roomId = room._id;
        student.roomNumber = room.roomNumber;
        await student.save();
        allocatedCount++;
      }
    }
    
    log('✅', `Allocated ${allocatedCount} students to rooms`);
    
    // Continue in next part...
    
    log('✅', 'Phase 1 complete - Basic entities created');
    
    return { hostels, rooms, students: studentProfiles, wardens, caretakers, adminUser, deanUser };
    
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    throw error;
  }
}

// Export for use in part 2
module.exports = { seedCompleteDatabase };

// ==================== SEED ADDITIONAL DATA ====================

async function seedAdditionalData(baseData) {
  const { hostels, rooms, students, wardens, caretakers, adminUser, deanUser } = baseData;
  
  try {
    // Create Mess Menu
    logSection('🍽️  CREATING MESS MENU');
    const menuData = generateMessMenu(hostels);
    const menus = await MessMenu.insertMany(menuData);
    log('✅', `Created ${menus.length} mess menu entries`);
    
    // Create Fee Structures
    logSection('💰 CREATING FEE STRUCTURES');
    const feeStructures = [];
    for (const hostel of hostels) {
      feeStructures.push({
        hostelId: hostel._id,
        hostel: hostel.name,
        academicYear: '2024-25',
        hostelFee: 40000,
        messFee: 30000,
        securityDeposit: 10000,
        maintenanceFee: 5000,
        effectiveFrom: new Date('2024-07-01'),
        effectiveTo: new Date('2025-06-30'),
        status: 'active'
      });
    }
    const fees = await FeeStructure.insertMany(feeStructures);
    log('✅', `Created ${fees.length} fee structures`);
    
    // Create Complaints
    logSection('📝 CREATING COMPLAINTS');
    const categories = ['mess', 'infrastructure', 'water', 'electricity', 'wifi', 'sanitation'];
    const priorities = ['low', 'medium', 'high', 'urgent'];
    const statuses = ['pending', 'in_progress', 'resolved'];
    const complaints = [];
    
    const complaintTemplates = [
      { title: 'AC not working', desc: 'The air conditioner in my room is not cooling properly.' },
      { title: 'Water leakage', desc: 'There is water leakage in the bathroom ceiling.' },
      { title: 'WiFi connectivity issue', desc: 'WiFi signal is very weak in my room.' },
      { title: 'Broken furniture', desc: 'Study table chair is broken and needs replacement.' },
      { title: 'Mess food quality', desc: 'Food quality has deteriorated in the past week.' },
      { title: 'Electricity fluctuation', desc: 'Frequent power cuts in the hostel.' },
      { title: 'Washroom cleaning', desc: 'Common washroom needs better maintenance.' },
      { title: 'Door lock issue', desc: 'Room door lock is not working properly.' },
      { title: 'Window broken', desc: 'Window glass is cracked and needs repair.' },
      { title: 'Pest control needed', desc: 'Mosquitoes and insects in the room.' }
    ];
    
    for (let i = 0; i < 50; i++) {
      const student = students[i % students.length];
      const template = complaintTemplates[i % complaintTemplates.length];
      const status = statuses[Math.floor(Math.random() * statuses.length)];
      const createdDate = new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000);
      
      complaints.push({
        complaintId: await generateId('CMP'),
        title: template.title,
        description: template.desc,
        category: categories[Math.floor(Math.random() * categories.length)],
        priority: priorities[Math.floor(Math.random() * priorities.length)],
        status,
        studentId: student._id,
        hostelId: student.hostelId,
        roomNumber: student.roomNumber || `${Math.floor(Math.random() * 5) + 1}${String(Math.floor(Math.random() * 4) + 1).padStart(2, '0')}`,
        createdAt: createdDate,
        updatedAt: status === 'resolved' ? new Date(createdDate.getTime() + Math.random() * 7 * 24 * 60 * 60 * 1000) : createdDate,
        resolvedAt: status === 'resolved' ? new Date(createdDate.getTime() + Math.random() * 7 * 24 * 60 * 60 * 1000) : null
      });
    }
    const createdComplaints = await Complaint.insertMany(complaints);
    log('✅', `Created ${createdComplaints.length} complaints`);
    
    // Create Requests
    logSection('📋 CREATING CHANGE REQUESTS');
    const requestTypes = ['room_change', 'hostel_change', 'leave'];
    const requestStatuses = ['pending', 'approved', 'rejected'];
    const requests = [];
    
    for (let i = 0; i < 30; i++) {
      const student = students[i % students.length];
      const type = requestTypes[Math.floor(Math.random() * requestTypes.length)];
      const status = requestStatuses[Math.floor(Math.random() * requestStatuses.length)];
      const createdDate = new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000);
      
      requests.push({
        requestId: await generateId('REQ'),
        requestType: type,
        studentId: student._id,
        hostelId: student.hostelId,
        currentHostelId: student.hostelId,
        currentRoomId: student.roomId,
        reason: `Request for ${type.replace('_', ' ')} due to personal reasons`,
        status,
        priority: priorities[Math.floor(Math.random() * 3)],
        createdAt: createdDate,
        updatedAt: status !== 'pending' ? new Date(createdDate.getTime() + Math.random() * 7 * 24 * 60 * 60 * 1000) : createdDate,
        approvedAt: status === 'approved' ? new Date(createdDate.getTime() + Math.random() * 7 * 24 * 60 * 60 * 1000) : null
      });
    }
    const createdRequests = await Request.insertMany(requests);
    log('✅', `Created ${createdRequests.length} change requests`);
    
    // Create Requisitions with various statuses for Dean testing
    logSection('📄 CREATING REQUISITIONS');
    const reqCategories = ['maintenance', 'repair', 'inventory', 'infrastructure', 'equipment'];
    const urgencies = ['low', 'medium', 'high', 'critical'];
    const requisitions = [];
    
    const requisitionTemplates = [
      { title: 'Emergency Plumbing Repair', desc: 'Major pipe burst in Block C basement. Water leakage affecting multiple rooms.', category: 'maintenance', urgency: 'critical', amount: 35000 },
      { title: 'AC Replacement - Common Room', desc: 'Old AC units not working efficiently. Need replacement for better cooling.', category: 'equipment', urgency: 'high', amount: 45000 },
      { title: 'Electrical Wiring Upgrade', desc: 'Upgrade electrical wiring in old wing to handle increased load.', category: 'infrastructure', urgency: 'high', amount: 75000 },
      { title: 'Furniture Replacement', desc: 'Replace broken study tables and chairs in 20 rooms.', category: 'inventory', urgency: 'medium', amount: 40000 },
      { title: 'Roof Waterproofing', desc: 'Waterproofing required for terrace to prevent leakage during monsoon.', category: 'maintenance', urgency: 'high', amount: 60000 },
      { title: 'CCTV Camera Installation', desc: 'Install additional CCTV cameras for enhanced security.', category: 'equipment', urgency: 'medium', amount: 55000 },
      { title: 'Mess Kitchen Equipment', desc: 'Purchase new cooking equipment for mess kitchen.', category: 'equipment', urgency: 'medium', amount: 80000 },
      { title: 'Painting Work', desc: 'Repainting of hostel exterior and common areas.', category: 'maintenance', urgency: 'low', amount: 50000 },
      { title: 'Water Tank Cleaning', desc: 'Deep cleaning and sanitization of overhead water tanks.', category: 'maintenance', urgency: 'high', amount: 15000 },
      { title: 'Generator Repair', desc: 'Emergency generator needs major repair and servicing.', category: 'repair', urgency: 'critical', amount: 45000 },
      { title: 'WiFi Router Upgrade', desc: 'Upgrade WiFi routers for better connectivity in all floors.', category: 'equipment', urgency: 'medium', amount: 35000 },
      { title: 'Fire Safety Equipment', desc: 'Purchase fire extinguishers and smoke detectors for all floors.', category: 'equipment', urgency: 'high', amount: 40000 },
      { title: 'Bathroom Renovation', desc: 'Renovation of common bathrooms with new fixtures.', category: 'infrastructure', urgency: 'medium', amount: 90000 },
      { title: 'Solar Panel Installation', desc: 'Install solar panels for energy efficiency.', category: 'infrastructure', urgency: 'low', amount: 150000 },
      { title: 'Pest Control Service', desc: 'Annual pest control and fumigation service.', category: 'maintenance', urgency: 'medium', amount: 12000 },
      { title: 'Gym Equipment Purchase', desc: 'Purchase new gym equipment for fitness center.', category: 'equipment', urgency: 'low', amount: 70000 },
      { title: 'Library Books Purchase', desc: 'Purchase new books and magazines for hostel library.', category: 'inventory', urgency: 'low', amount: 25000 },
      { title: 'Elevator Maintenance', desc: 'Annual maintenance contract for elevators.', category: 'maintenance', urgency: 'high', amount: 30000 },
      { title: 'Window Replacement', desc: 'Replace broken windows in multiple rooms.', category: 'repair', urgency: 'medium', amount: 28000 },
      { title: 'Drainage System Repair', desc: 'Repair blocked drainage system in basement.', category: 'repair', urgency: 'high', amount: 38000 }
    ];
    
    // Create requisitions with different statuses
    let reqIndex = 0;
    
    // 1. Pending Dean Approval (10 requisitions) - These are ready for dean to review
    for (let i = 0; i < 10; i++) {
      const caretaker = caretakers[i % caretakers.length];
      const warden = wardens[i % wardens.length];
      const template = requisitionTemplates[reqIndex % requisitionTemplates.length];
      const createdDate = new Date(Date.now() - Math.random() * 15 * 24 * 60 * 60 * 1000);
      const wardenApprovalDate = new Date(createdDate.getTime() + Math.random() * 3 * 24 * 60 * 60 * 1000);
      
      requisitions.push({
        requisitionId: await generateId('REQ'),
        title: template.title,
        description: template.desc,
        category: template.category,
        estimatedAmount: template.amount,
        urgency: template.urgency,
        status: 'pending-dean',
        hostelId: caretaker.hostelId,
        requestedBy: caretaker._id,
        approvedByWarden: warden._id,
        approvalHistory: [
          {
            approvedBy: caretaker._id,
            role: 'caretaker',
            action: 'forwarded',
            comments: 'Created and submitted for warden approval',
            timestamp: createdDate
          },
          {
            approvedBy: warden._id,
            role: 'warden',
            action: 'approved',
            comments: i % 3 === 0 ? 'Urgent requirement. Please approve.' : 'Approved. Necessary for hostel maintenance.',
            timestamp: wardenApprovalDate
          }
        ],
        createdAt: createdDate,
        updatedAt: wardenApprovalDate
      });
      reqIndex++;
    }
    
    // 2. Approved by Warden (5 requisitions) - Also pending dean
    for (let i = 0; i < 5; i++) {
      const caretaker = caretakers[i % caretakers.length];
      const warden = wardens[i % wardens.length];
      const template = requisitionTemplates[reqIndex % requisitionTemplates.length];
      const createdDate = new Date(Date.now() - Math.random() * 10 * 24 * 60 * 60 * 1000);
      const wardenApprovalDate = new Date(createdDate.getTime() + Math.random() * 2 * 24 * 60 * 60 * 1000);
      
      requisitions.push({
        requisitionId: await generateId('REQ'),
        title: template.title,
        description: template.desc,
        category: template.category,
        estimatedAmount: template.amount,
        urgency: template.urgency,
        status: 'approved-by-warden',
        hostelId: caretaker.hostelId,
        requestedBy: caretaker._id,
        approvedByWarden: warden._id,
        approvalHistory: [
          {
            approvedBy: caretaker._id,
            role: 'caretaker',
            action: 'forwarded',
            comments: 'Submitted for approval',
            timestamp: createdDate
          },
          {
            approvedBy: warden._id,
            role: 'warden',
            action: 'approved',
            comments: 'Approved by warden. Forwarding to dean.',
            timestamp: wardenApprovalDate
          }
        ],
        createdAt: createdDate,
        updatedAt: wardenApprovalDate
      });
      reqIndex++;
    }
    
    // 3. Approved by Dean (8 requisitions) - Dean has already approved these
    for (let i = 0; i < 8; i++) {
      const caretaker = caretakers[i % caretakers.length];
      const warden = wardens[i % wardens.length];
      const template = requisitionTemplates[reqIndex % requisitionTemplates.length];
      const createdDate = new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000);
      const wardenApprovalDate = new Date(createdDate.getTime() + Math.random() * 3 * 24 * 60 * 60 * 1000);
      const deanApprovalDate = new Date(wardenApprovalDate.getTime() + Math.random() * 5 * 24 * 60 * 60 * 1000);
      
      requisitions.push({
        requisitionId: await generateId('REQ'),
        title: template.title,
        description: template.desc,
        category: template.category,
        estimatedAmount: template.amount,
        actualAmount: template.amount,
        urgency: template.urgency,
        status: 'approved-by-dean',
        hostelId: caretaker.hostelId,
        requestedBy: caretaker._id,
        approvedByWarden: warden._id,
        approvedByDean: deanUser._id,
        approvalHistory: [
          {
            approvedBy: caretaker._id,
            role: 'caretaker',
            action: 'forwarded',
            comments: 'Created requisition',
            timestamp: createdDate
          },
          {
            approvedBy: warden._id,
            role: 'warden',
            action: 'approved',
            comments: 'Approved by warden',
            timestamp: wardenApprovalDate
          },
          {
            approvedBy: deanUser._id,
            role: 'dean',
            action: 'approved',
            comments: i % 2 === 0 ? 'Approved. Funds allocated from maintenance budget.' : 'Approved. Essential requirement.',
            timestamp: deanApprovalDate
          }
        ],
        createdAt: createdDate,
        updatedAt: deanApprovalDate
      });
      reqIndex++;
    }
    
    // 4. Rejected by Dean (3 requisitions) - Dean has rejected these
    for (let i = 0; i < 3; i++) {
      const caretaker = caretakers[i % caretakers.length];
      const warden = wardens[i % wardens.length];
      const template = requisitionTemplates[reqIndex % requisitionTemplates.length];
      const createdDate = new Date(Date.now() - Math.random() * 25 * 24 * 60 * 60 * 1000);
      const wardenApprovalDate = new Date(createdDate.getTime() + Math.random() * 3 * 24 * 60 * 60 * 1000);
      const deanRejectionDate = new Date(wardenApprovalDate.getTime() + Math.random() * 4 * 24 * 60 * 60 * 1000);
      
      requisitions.push({
        requisitionId: await generateId('REQ'),
        title: template.title,
        description: template.desc,
        category: template.category,
        estimatedAmount: template.amount,
        urgency: template.urgency,
        status: 'rejected-by-dean',
        hostelId: caretaker.hostelId,
        requestedBy: caretaker._id,
        approvedByWarden: warden._id,
        approvalHistory: [
          {
            approvedBy: caretaker._id,
            role: 'caretaker',
            action: 'forwarded',
            comments: 'Submitted for approval',
            timestamp: createdDate
          },
          {
            approvedBy: warden._id,
            role: 'warden',
            action: 'approved',
            comments: 'Approved by warden',
            timestamp: wardenApprovalDate
          },
          {
            approvedBy: deanUser._id,
            role: 'dean',
            action: 'rejected',
            comments: i === 0 ? 'Budget constraints. Please resubmit with lower estimate.' : i === 1 ? 'Not a priority at this time. Defer to next quarter.' : 'Alternative solution available. Please explore other options.',
            timestamp: deanRejectionDate
          }
        ],
        createdAt: createdDate,
        updatedAt: deanRejectionDate
      });
      reqIndex++;
    }
    
    // 5. Completed (5 requisitions) - Full lifecycle completed
    for (let i = 0; i < 5; i++) {
      const caretaker = caretakers[i % caretakers.length];
      const warden = wardens[i % wardens.length];
      const template = requisitionTemplates[reqIndex % requisitionTemplates.length];
      const createdDate = new Date(Date.now() - Math.random() * 60 * 24 * 60 * 60 * 1000);
      const wardenApprovalDate = new Date(createdDate.getTime() + Math.random() * 3 * 24 * 60 * 60 * 1000);
      const deanApprovalDate = new Date(wardenApprovalDate.getTime() + Math.random() * 5 * 24 * 60 * 60 * 1000);
      const completedDate = new Date(deanApprovalDate.getTime() + Math.random() * 15 * 24 * 60 * 60 * 1000);
      
      requisitions.push({
        requisitionId: await generateId('REQ'),
        title: template.title,
        description: template.desc,
        category: template.category,
        estimatedAmount: template.amount,
        actualAmount: template.amount + (Math.random() * 5000 - 2500), // Slight variation
        urgency: template.urgency,
        status: 'completed',
        hostelId: caretaker.hostelId,
        requestedBy: caretaker._id,
        approvedByWarden: warden._id,
        approvedByDean: deanUser._id,
        processedByAdmin: adminUser._id,
        approvalHistory: [
          {
            approvedBy: caretaker._id,
            role: 'caretaker',
            action: 'forwarded',
            comments: 'Created requisition',
            timestamp: createdDate
          },
          {
            approvedBy: warden._id,
            role: 'warden',
            action: 'approved',
            comments: 'Approved by warden',
            timestamp: wardenApprovalDate
          },
          {
            approvedBy: deanUser._id,
            role: 'dean',
            action: 'approved',
            comments: 'Approved and forwarded to admin',
            timestamp: deanApprovalDate
          },
          {
            approvedBy: adminUser._id,
            role: 'admin',
            action: 'approved',
            comments: 'Processed and completed',
            timestamp: completedDate
          }
        ],
        completedAt: completedDate,
        createdAt: createdDate,
        updatedAt: completedDate
      });
      reqIndex++;
    }
    
    // 6. Pending Warden (4 requisitions) - Not yet reached dean
    for (let i = 0; i < 4; i++) {
      const caretaker = caretakers[i % caretakers.length];
      const template = requisitionTemplates[reqIndex % requisitionTemplates.length];
      const createdDate = new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000);
      
      requisitions.push({
        requisitionId: await generateId('REQ'),
        title: template.title,
        description: template.desc,
        category: template.category,
        estimatedAmount: template.amount,
        urgency: template.urgency,
        status: 'pending-warden',
        hostelId: caretaker.hostelId,
        requestedBy: caretaker._id,
        approvalHistory: [
          {
            approvedBy: caretaker._id,
            role: 'caretaker',
            action: 'forwarded',
            comments: 'Submitted for warden approval',
            timestamp: createdDate
          }
        ],
        createdAt: createdDate,
        updatedAt: createdDate
      });
      reqIndex++;
    }
    
    const createdRequisitions = await Requisition.insertMany(requisitions);
    log('✅', `Created ${createdRequisitions.length} requisitions`);
    log('   ', `- Pending Dean: 15 (ready for dean action)`);
    log('   ', `- Approved by Dean: 8`);
    log('   ', `- Rejected by Dean: 3`);
    log('   ', `- Completed: 5`);
    log('   ', `- Pending Warden: 4`);
    
    // Create Payments
    logSection('💳 CREATING PAYMENTS');
    const payments = [];
    for (let i = 0; i < 40; i++) {
      const student = students[i % students.length];
      const paymentTypes = ['hostel_fee', 'mess_fee', 'security_deposit'];
      const paymentType = paymentTypes[i % paymentTypes.length];
      const amount = paymentType === 'hostel_fee' ? 40000 : paymentType === 'mess_fee' ? 30000 : 10000;
      
      payments.push({
        paymentId: await generateId('PAY'),
        transactionId: `TXN${Date.now()}${i}`,
        studentId: student._id,
        hostelId: student.hostelId,
        amount,
        paymentType,
        paymentMethod: ['upi', 'card', 'netbanking'][Math.floor(Math.random() * 3)],
        status: Math.random() > 0.2 ? 'completed' : 'pending',
        academicYear: '2024-25',
        semester: String(student.semester),
        paidAt: Math.random() > 0.2 ? new Date() : null
      });
    }
    const createdPayments = await Payment.insertMany(payments);
    log('✅', `Created ${createdPayments.length} payments`);
    
    // Create Events
    logSection('🎉 CREATING EVENTS');
    const eventCategories = ['cultural', 'sports', 'academic', 'social'];
    const events = [];
    
    for (let i = 0; i < 15; i++) {
      const hostel = hostels[i % hostels.length];
      const futureDate = new Date(Date.now() + Math.random() * 60 * 24 * 60 * 60 * 1000);
      
      events.push({
        title: `Event ${i + 1}`,
        description: `Description for event ${i + 1}`,
        category: eventCategories[Math.floor(Math.random() * eventCategories.length)],
        date: futureDate,
        time: '6:00 PM',
        venue: `${hostel.name} Common Hall`,
        organizer: wardens[i % wardens.length].name,
        organizerId: wardens[i % wardens.length]._id,
        hostelId: hostel._id,
        maxParticipants: 50,
        status: 'upcoming',
        createdBy: wardens[i % wardens.length]._id
      });
    }
    const createdEvents = await Event.insertMany(events);
    log('✅', `Created ${createdEvents.length} events`);
    
    // Create Notices
    logSection('📢 CREATING NOTICES');
    const noticeTypes = ['general', 'urgent', 'event', 'maintenance', 'fee'];
    const notices = [];
    
    // Dean's notices (10 notices)
    const deanNotices = [
      {
        title: 'Emergency Maintenance - Water Supply Shutdown',
        content: 'Water supply will be temporarily shut down on January 20th from 10 AM to 2 PM for emergency repairs in the main pipeline. Please store water in advance. We apologize for the inconvenience.',
        type: 'urgent',
        priority: 'high',
        targetAudience: { roles: ['student', 'warden', 'caretaker'], hostels: [] },
        publishedBy: deanUser._id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        isPinned: true
      },
      {
        title: 'Annual Hostel Inspection Schedule',
        content: 'Annual hostel inspection will be conducted from February 1-5, 2024. All students are requested to keep their rooms clean and organized. Wardens and caretakers should ensure all facilities are in proper working condition.',
        type: 'general',
        priority: 'high',
        targetAudience: { roles: ['student', 'warden', 'caretaker'], hostels: [] },
        publishedBy: deanUser._id,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        isPinned: true
      },
      {
        title: 'New Hostel Fee Structure - Academic Year 2024-25',
        content: 'The revised hostel fee structure for the academic year 2024-25 has been approved. Hostel Fee: ₹40,000, Mess Fee: ₹30,000, Security Deposit: ₹10,000. Payment deadline: July 31, 2024.',
        type: 'fee',
        priority: 'high',
        targetAudience: { roles: ['student'], hostels: [] },
        publishedBy: deanUser._id,
        expiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
        isPinned: true
      },
      {
        title: 'WiFi Upgrade Completion Notice',
        content: 'We are pleased to announce that the WiFi upgrade project has been completed successfully. All hostels now have high-speed internet connectivity. Students can connect using their credentials.',
        type: 'general',
        priority: 'medium',
        targetAudience: { roles: ['student'], hostels: [] },
        publishedBy: deanUser._id,
        expiresAt: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
        isPinned: false
      },
      {
        title: 'Hostel Committee Elections - Call for Nominations',
        content: 'Nominations are invited for Hostel Committee positions. Interested students can submit their nominations to their respective wardens by January 25th. Elections will be held on February 1st.',
        type: 'event',
        priority: 'medium',
        targetAudience: { roles: ['student'], hostels: [] },
        publishedBy: deanUser._id,
        expiresAt: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000),
        isPinned: false
      },
      {
        title: 'Mess Menu Feedback Survey',
        content: 'We value your feedback! Please participate in the mess menu feedback survey. Your suggestions will help us improve the quality and variety of food. Survey link will be shared via email.',
        type: 'general',
        priority: 'low',
        targetAudience: { roles: ['student'], hostels: [] },
        publishedBy: deanUser._id,
        expiresAt: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
        isPinned: false
      },
      {
        title: 'Fire Safety Drill - All Hostels',
        content: 'A fire safety drill will be conducted in all hostels on January 28th at 4 PM. All students must participate. Please follow the instructions of wardens and caretakers during the drill.',
        type: 'urgent',
        priority: 'high',
        targetAudience: { roles: ['student', 'warden', 'caretaker'], hostels: [] },
        publishedBy: deanUser._id,
        expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        isPinned: false
      },
      {
        title: 'Hostel Closure During Summer Break',
        content: 'All hostels will be closed from May 15 to June 30 for summer break. Students must vacate their rooms by May 14th. Special permission for summer stay can be requested through proper channels.',
        type: 'general',
        priority: 'medium',
        targetAudience: { roles: ['student'], hostels: [] },
        publishedBy: deanUser._id,
        expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
        isPinned: false
      },
      {
        title: 'New Gym Equipment Installation',
        content: 'New gym equipment has been installed in all hostel gyms. Students can use the facilities from 6 AM to 10 PM. Please maintain cleanliness and follow gym etiquette.',
        type: 'general',
        priority: 'low',
        targetAudience: { roles: ['student'], hostels: [] },
        publishedBy: deanUser._id,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        isPinned: false
      },
      {
        title: 'Hostel Complaint Resolution - New Process',
        content: 'We have implemented a new complaint resolution process for faster response. All complaints will be tracked and resolved within 48 hours. Students can track their complaint status online.',
        type: 'general',
        priority: 'medium',
        targetAudience: { roles: ['student', 'warden', 'caretaker'], hostels: [] },
        publishedBy: deanUser._id,
        expiresAt: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000),
        isPinned: false
      }
    ];
    
    notices.push(...deanNotices);
    
    // Admin notices (5 notices)
    for (let i = 0; i < 5; i++) {
      notices.push({
        title: `Admin Notice ${i + 1}`,
        content: `This is an administrative notice ${i + 1}. Important information for all hostel residents.`,
        type: noticeTypes[Math.floor(Math.random() * noticeTypes.length)],
        priority: priorities[Math.floor(Math.random() * 3)],
        targetAudience: {
          roles: ['student'],
          hostels: i % 2 === 0 ? [hostels[0]._id] : []
        },
        publishedBy: adminUser._id,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        isPinned: i < 2
      });
    }
    
    // Warden notices (5 notices)
    for (let i = 0; i < 5; i++) {
      const warden = wardens[i % wardens.length];
      notices.push({
        title: `Hostel Notice ${i + 1}`,
        content: `This is a hostel-specific notice ${i + 1} from your warden.`,
        type: noticeTypes[Math.floor(Math.random() * noticeTypes.length)],
        priority: priorities[Math.floor(Math.random() * 3)],
        targetAudience: {
          roles: ['student'],
          hostels: [warden.hostelId]
        },
        publishedBy: warden._id,
        expiresAt: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
        isPinned: false
      });
    }
    
    const createdNotices = await Notice.insertMany(notices);
    log('✅', `Created ${createdNotices.length} notices`);
    log('   ', `- Dean notices: 10`);
    log('   ', `- Admin notices: 5`);
    log('   ', `- Warden notices: 5`);
    
    // Create Feedback
    logSection('💬 CREATING FEEDBACK');
    const feedbackCategories = ['hostel', 'mess', 'facilities', 'staff'];
    const feedbacks = [];
    
    for (let i = 0; i < 30; i++) {
      const student = students[i % students.length];
      feedbacks.push({
        studentId: student._id,
        hostelId: student.hostelId,
        category: feedbackCategories[Math.floor(Math.random() * feedbackCategories.length)],
        subject: `Feedback ${i + 1}`,
        description: `Feedback description ${i + 1}`,
        rating: Math.floor(Math.random() * 5) + 1,
        status: ['pending', 'reviewed'][Math.floor(Math.random() * 2)],
        isAnonymous: Math.random() > 0.5
      });
    }
    const createdFeedbacks = await Feedback.insertMany(feedbacks);
    log('✅', `Created ${createdFeedbacks.length} feedbacks`);
    
    // Create Ratings
    logSection('⭐ CREATING RATINGS');
    const ratingCategories = ['overall', 'cleanliness', 'food_quality', 'staff_behavior', 'maintenance'];
    const ratings = [];
    
    for (let i = 0; i < 40; i++) {
      const student = students[i % students.length];
      const category = ratingCategories[i % ratingCategories.length];
      
      ratings.push({
        studentId: student._id,
        hostelId: student.hostelId,
        category,
        rating: Math.floor(Math.random() * 5) + 1,
        feedback: `Rating feedback for ${category}`,
        isAnonymous: Math.random() > 0.5
      });
    }
    const createdRatings = await Rating.insertMany(ratings);
    log('✅', `Created ${createdRatings.length} ratings`);
    
    // Create Inventory Items
    logSection('📦 CREATING INVENTORY ITEMS');
    const inventoryItems = [];
    
    const inventoryTemplates = [
      { name: 'Study Tables', category: 'furniture', quantity: 150, condition: 'good', location: 'All Blocks' },
      { name: 'Chairs', category: 'furniture', quantity: 150, condition: 'good', location: 'All Blocks' },
      { name: 'Beds', category: 'furniture', quantity: 150, condition: 'fair', location: 'All Blocks' },
      { name: 'Cupboards', category: 'furniture', quantity: 150, condition: 'good', location: 'All Blocks' },
      { name: 'Mattresses', category: 'furniture', quantity: 150, condition: 'good', location: 'All Rooms' },
      { name: 'Ceiling Fans', category: 'electronics', quantity: 200, condition: 'good', location: 'All Rooms' },
      { name: 'Tube Lights', category: 'electronics', quantity: 300, condition: 'fair', location: 'All Rooms' },
      { name: 'Table Lamps', category: 'electronics', quantity: 100, condition: 'good', location: 'Study Rooms' },
      { name: 'Water Coolers', category: 'equipment', quantity: 20, condition: 'good', location: 'Each Floor' },
      { name: 'Fire Extinguishers', category: 'equipment', quantity: 50, condition: 'good', location: 'Corridors' },
      { name: 'Vacuum Cleaners', category: 'equipment', quantity: 10, condition: 'fair', location: 'Storage' },
      { name: 'Washing Machines', category: 'equipment', quantity: 15, condition: 'good', location: 'Laundry' },
      { name: 'Brooms', category: 'supplies', quantity: 50, condition: 'fair', location: 'Storage' },
      { name: 'Mops', category: 'supplies', quantity: 40, condition: 'good', location: 'Storage' },
      { name: 'Dustbins', category: 'supplies', quantity: 200, condition: 'good', location: 'All Rooms' },
      { name: 'Cleaning Supplies', category: 'supplies', quantity: 100, condition: 'good', location: 'Storage' }
    ];
    
    for (const hostel of hostels) {
      for (const template of inventoryTemplates) {
        const quantityPerHostel = Math.floor(template.quantity / hostels.length);
        inventoryItems.push({
          name: template.name,
          category: template.category,
          quantity: quantityPerHostel,
          condition: template.condition,
          location: `${hostel.name} - ${template.location}`,
          hostelId: hostel._id,
          addedBy: wardens[hostels.indexOf(hostel)]._id,
          lastInspected: new Date(Date.now() - Math.random() * 60 * 24 * 60 * 60 * 1000),
          notes: `Inventory for ${hostel.name}`
        });
      }
    }
    
    const createdInventory = await Inventory.insertMany(inventoryItems);
    log('✅', `Created ${createdInventory.length} inventory items`);
    
    // Create Emergency Contacts
    logSection('🚨 CREATING EMERGENCY CONTACTS');
    const emergencyContacts = [
      { name: 'Police Station', designation: 'Emergency Services', category: 'emergency', phone: '100', priority: 'critical' },
      { name: 'Fire Brigade', designation: 'Fire Department', category: 'emergency', phone: '101', priority: 'critical' },
      { name: 'Ambulance', designation: 'Medical Emergency', category: 'medical', phone: '102', priority: 'critical' },
      { name: 'Campus Security', designation: 'Security Head', category: 'security', phone: '+91-9876543200', priority: 'high' },
      { name: 'Medical Center', designation: 'Campus Hospital', category: 'medical', phone: '+91-9876543201', priority: 'high' },
      { name: 'Maintenance Team', designation: 'Maintenance Head', category: 'maintenance', phone: '+91-9876543202', priority: 'medium' }
    ];
    
    const contacts = [];
    for (const contact of emergencyContacts) {
      contacts.push({
        ...contact,
        availability: '24/7',
        createdBy: adminUser._id
      });
    }
    const createdContacts = await EmergencyContact.insertMany(contacts);
    log('✅', `Created ${createdContacts.length} emergency contacts`);
    
    // Create Hostel Applications
    logSection('📝 CREATING HOSTEL APPLICATIONS');
    const applications = [];
    for (let i = 0; i < 20; i++) {
      const student = students[i % students.length];
      applications.push({
        applicationId: await generateId('APP'),
        studentId: student._id,
        hostelId: hostels[Math.floor(Math.random() * hostels.length)]._id,
        status: ['pending', 'approved', 'rejected'][Math.floor(Math.random() * 3)],
        academicYear: '2024-25',
        semester: student.semester
      });
    }
    const createdApplications = await HostelApplication.insertMany(applications);
    log('✅', `Created ${createdApplications.length} hostel applications`);
    
    // Create Notifications
    logSection('🔔 CREATING NOTIFICATIONS');
    const notifications = [];
    
    // Notifications for students
    for (let i = 0; i < 50; i++) {
      const student = students[i % students.length];
      notifications.push({
        userId: student.userId,
        type: ['complaint', 'request', 'payment', 'notice'][Math.floor(Math.random() * 4)],
        title: `Notification ${i + 1}`,
        message: `This is notification message ${i + 1}`,
        priority: priorities[Math.floor(Math.random() * 3)],
        isRead: Math.random() > 0.5
      });
    }
    
    // Notifications for caretakers
    for (let i = 0; i < 20; i++) {
      const caretaker = caretakers[i % caretakers.length];
      notifications.push({
        userId: caretaker._id,
        type: ['complaint', 'requisition', 'system'][Math.floor(Math.random() * 3)],
        title: `Caretaker Notification ${i + 1}`,
        message: `Caretaker notification message ${i + 1}`,
        priority: priorities[Math.floor(Math.random() * 3)],
        isRead: Math.random() > 0.5
      });
    }
    
    const createdNotifications = await Notification.insertMany(notifications);
    log('✅', `Created ${createdNotifications.length} notifications`);
    
    // Create Messages
    logSection('💬 CREATING MESSAGES');
    const messages = [];
    for (let i = 0; i < 30; i++) {
      const sender = students[i % students.length];
      const receiver = i % 2 === 0 ? caretakers[i % caretakers.length] : wardens[i % wardens.length];
      
      messages.push({
        conversationId: `${sender.userId}-${receiver._id}`,
        senderId: sender.userId,
        receiverId: receiver._id,
        message: `Message ${i + 1} content`,
        messageType: 'text',
        isRead: Math.random() > 0.5
      });
    }
    const createdMessages = await Message.insertMany(messages);
    log('✅', `Created ${createdMessages.length} messages`);
    
    return {
      menus,
      fees,
      complaints: createdComplaints,
      requests: createdRequests,
      requisitions: createdRequisitions,
      payments: createdPayments,
      events: createdEvents,
      notices: createdNotices,
      feedbacks: createdFeedbacks,
      ratings: createdRatings,
      inventory: createdInventory,
      contacts: createdContacts,
      applications: createdApplications,
      notifications: createdNotifications,
      messages: createdMessages
    };
    
  } catch (error) {
    console.error('❌ Error seeding additional data:', error);
    throw error;
  }
}

// Update main function
if (require.main === module) {
  (async () => {
    try {
      const baseData = await seedCompleteDatabase();
      const additionalData = await seedAdditionalData(baseData);
      
      // Display final summary
      logSection('📊 FINAL SUMMARY');
      console.log(`
✅ Hostels:              ${baseData.hostels.length}
✅ Rooms:                ${baseData.rooms.length}
✅ Admin:                1
✅ Dean:                 1
✅ Wardens:              ${baseData.wardens.length}
✅ Caretakers:           ${baseData.caretakers.length}
✅ Students:             ${baseData.students.length}
✅ Allocated Rooms:      60
✅ Mess Menus:           ${additionalData.menus.length}
✅ Fee Structures:       ${additionalData.fees.length}
✅ Complaints:           ${additionalData.complaints.length}
✅ Requests:             ${additionalData.requests.length}
✅ Requisitions:         ${additionalData.requisitions.length}
   - Pending Dean:       15 (ready for dean action)
   - Approved by Dean:   8
   - Rejected by Dean:   3
   - Completed:          5
   - Pending Warden:     4
✅ Payments:             ${additionalData.payments.length}
✅ Events:               ${additionalData.events.length}
✅ Notices:              ${additionalData.notices.length}
   - Dean Notices:       10
   - Admin Notices:      5
   - Warden Notices:     5
✅ Feedbacks:            ${additionalData.feedbacks.length}
✅ Ratings:              ${additionalData.ratings.length}
✅ Inventory Items:      ${additionalData.inventory.length}
✅ Emergency Contacts:   ${additionalData.contacts.length}
✅ Hostel Applications:  ${additionalData.applications.length}
✅ Notifications:        ${additionalData.notifications.length}
✅ Messages:             ${additionalData.messages.length}
      `);
      
      logSection('🔐 LOGIN CREDENTIALS');
      console.log(`
═══════════════════════════════════════════════════════════════

ADMIN CREDENTIALS:
  Email:    admin@hms.com
  Password: Admin@123
  Role:     Super Administrator

DEAN CREDENTIALS:
  Email:    dean@hms.com
  Password: Dean@123
  Name:     Dr. Rajesh Kumar
  Role:     Dean of Students

WARDEN CREDENTIALS (${baseData.wardens.length} Wardens):
  1. suresh.patel@hms.com       - Boys Hostel A (Chief Warden)
  2. ramesh.iyer@hms.com        - Boys Hostel B
  3. meena.sharma@hms.com       - Girls Hostel A
  4. lakshmi.reddy@hms.com      - Girls Hostel B
  5. anil.kumar@hms.com         - International Hostel
  Password: Warden@123 (for all)

CARETAKER CREDENTIALS (${baseData.caretakers.length} Caretakers):
  1. mohan.lal@hms.com          - Boys Hostel A
  2. ravi.kumar@hms.com         - Boys Hostel B
  3. sunita.devi@hms.com        - Girls Hostel A
  4. kamala.bai@hms.com         - Girls Hostel B
  5. rajesh.singh@hms.com       - International Hostel
  Password: Caretaker@123 (for all)

STUDENT CREDENTIALS (${baseData.students.length} Students):
  Sample: rahul.sharma1@student.hms.com
          priya.kumar2@student.hms.com
          amit.singh3@student.hms.com
  Pattern: firstname.lastname[number]@student.hms.com
  Password: Student@123 (for all)

═══════════════════════════════════════════════════════════════

📝 QUICK START GUIDE:

1. Login as Dean to test Dean APIs:
   Email: dean@hms.com
   Password: Dean@123

2. View pending requisitions (15 available for approval)
3. Test approval/rejection workflows
4. Create announcements and notices
5. Generate reports and analytics

═══════════════════════════════════════════════════════════════
      `);
      
      log('✨', 'Complete database seeding finished successfully!');
      process.exit(0);
    } catch (error) {
      console.error('❌ Seeding failed:', error);
      process.exit(1);
    }
  })();
}
