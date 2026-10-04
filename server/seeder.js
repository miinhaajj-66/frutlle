import mongoose from 'mongoose';
import dotenv from 'dotenv';
import connectDB from './config/db.js';
import User from './models/User.js';

dotenv.config();
connectDB();

const importData = async () => {
  try {
    await User.deleteMany();

    const adminUser = {
      name: 'Admin',
      email: process.env.ADMIN_EMAIL || 'admin@frutllejam@gmail.com',
      password: process.env.ADMIN_PASSWORD || 'Aneesmon123',
      role: 'admin',
    };

    await User.create(adminUser);
    console.log('Data Imported - Admin created!');
    process.exit();
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

const destroyData = async () => {
  try {
    await User.deleteMany();
    console.log('Data Destroyed!');
    process.exit();
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

if (process.argv[2] === '-d') {
  destroyData();
} else {
  importData();
}
