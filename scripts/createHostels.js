require('dotenv').config();
const mongoose = require('mongoose');
const Hostel = require('../src/models/Hostel');

const hostelsData = [
  // Boys Hostels
  {
    name: 'Boys Hostel 1',
    code: 'BH1',
    type: 'boys',
    totalRooms: 50,
    totalCapacity: 100,
    facilities: ['WiFi', 'Gym', 'Mess', 'Library', 'Common Room', 'Laundry'],
    address: 'Campus Road, University Campus',
    contactNumber: '+919876543210'
  },
  {
    name: 'Boys Hostel 2',
    code: 'BH2',
    type: 'boys',
    totalRooms: 60,
    totalCapacity: 120,
    facilities: ['WiFi', 'Gym', 'Mess', 'Library', 'Sports Room', 'Laundry'],
    address: 'Campus Road, University Campus',
    contactNumber: '+919876543211'
  },
  {
    name: 'Boys Hostel 3',
    code: 'BH3',
    type: 'boys',
    totalRooms: 55,
    totalCapacity: 110,
    facilities: ['WiFi', 'Gym', 'Mess', 'Library', 'Study Room', 'Laundry'],
    address: 'Campus Road, University Campus',
    contactNumber: '+919876543212'
  },
  {
    name: 'Boys Hostel 4',
    code: 'BH4',
    type: 'boys',
    totalRooms: 65,
    totalCapacity: 130,
    facilities: ['WiFi', 'Gym', 'Mess', 'Library', 'Recreation Room', 'Laundry'],
    address: 'Campus Road, University Campus',
    contactNumber: '+919876543213'
  },
  // Girls Hostels
  {
    name: 'Girls Hostel 1',
    code: 'GH1',
    type: 'girls',
    totalRooms: 45,
    totalCapacity: 90,
    facilities: ['WiFi', 'Gym', 'Mess', 'Library', 'Common Room', 'Laundry', 'Security'],
    address: 'Campus Road, University Campus',
    contactNumber: '+919876543214'
  },
  {
    name: 'Girls Hostel 2',
    code: 'GH2',
    type: 'girls',
    totalRooms: 50,
    totalCapacity: 100,
    facilities: ['WiFi', 'Gym', 'Mess', 'Library', 'Study Room', 'Laundry', 'Security'],
    address: 'Campus Road, University Campus',
    contactNumber: '+919876543215'
  }
];

const createHostels = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✓ Connected to MongoDB\n');

    // Check existing hostels
    const existingHostels = await Hostel.find({});
    if (existingHostels.length > 0) {
      console.log('⚠ Hostels already exist in database:');
      existingHostels.forEach(h => {
        console.log(`  - ${h.name} (${h.code})`);
      });
      console.log('\nDo you want to continue? This will skip existing hostel codes.');
    }

    let created = 0;
    let skipped = 0;

    console.log('\nCreating hostels...\n');

    for (const hostelData of hostelsData) {
      const existing = await Hostel.findOne({ code: hostelData.code });
      
      if (existing) {
        console.log(`⊘ Skipped: ${hostelData.name} (${hostelData.code}) - already exists`);
        skipped++;
        continue;
      }

      const hostel = await Hostel.create(hostelData);
      console.log(`✓ Created: ${hostel.name} (${hostel.code}) - ${hostel.totalCapacity} capacity`);
      created++;
    }

    console.log('\n==========================================');
    console.log(`✓ Hostels created: ${created}`);
    console.log(`⊘ Hostels skipped: ${skipped}`);
    console.log('==========================================\n');

    // Display summary
    const allHostels = await Hostel.find({}).sort({ code: 1 });
    console.log('Current Hostels in Database:');
    console.log('----------------------------');
    allHostels.forEach(h => {
      console.log(`${h.code.padEnd(5)} | ${h.name.padEnd(20)} | ${h.type.padEnd(6)} | Capacity: ${h.totalCapacity}`);
    });
    console.log('');

    process.exit(0);
  } catch (error) {
    console.error('✗ Error creating hostels:', error.message);
    process.exit(1);
  }
};

createHostels();
