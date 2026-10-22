import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import supabase from './config/supabase.js';

dotenv.config();

const importData = async () => {
  try {
    // Clear all existing users (for a fresh start)
    await supabase.from('users').delete().neq('id', '00000000-0000-0000-0000-000000000000');

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(process.env.ADMIN_PASSWORD || 'Aneesmon123', salt);

    const adminUser = {
      name: 'Admin',
      email: process.env.ADMIN_EMAIL || 'admin@frutllejam@gmail.com',
      password: hashedPassword,
      role: 'admin',
    };

    const { error } = await supabase.from('users').insert([adminUser]);
    
    if (error) throw error;

    console.log('Data Imported - Admin created!');
    process.exit();
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

const destroyData = async () => {
  try {
    const { error } = await supabase.from('users').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    
    if (error) throw error;
    
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
