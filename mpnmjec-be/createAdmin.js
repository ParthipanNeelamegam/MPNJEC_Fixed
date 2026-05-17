import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';

// Render-ல இருக்கற Atlas connection string paste பண்ணு
const MONGO_URI = 'mongodb+srv://poojapalanisamy48_db_user:n01wbvKEUIVguGjT@cluster0.mukanwp.mongodb.net/mpnmjec';

await mongoose.connect(MONGO_URI);

const hash = await bcrypt.hash('Admin@123', 10);

await mongoose.connection.collection('users').insertOne({
  name: 'Admin',
  username: 'poojapalanisamy48@gmail.com',
  email: 'poojapalanisamy48@gmail.com',
  password: hash,
  role: 'admin',
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
});

console.log('Admin created!');
await mongoose.disconnect();