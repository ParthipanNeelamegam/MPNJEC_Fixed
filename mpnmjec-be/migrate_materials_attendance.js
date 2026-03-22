// Migration script for legacy Material and Attendance records
import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/mpnmjec';

const Material = require('./src/models/Material.js').default || require('./src/models/Material.js');
const Attendance = require('./src/models/Attendance.js').default || require('./src/models/Attendance.js');
const Faculty = require('./src/models/Faculty.js').default || require('./src/models/Faculty.js');
const Course = require('./src/models/Course.js').default || require('./src/models/Course.js');

async function migrateMaterials() {
  const materials = await Material.find({ $or: [ { uploadedBy: { $exists: false } }, { courseId: { $exists: false } } ] });
  for (const mat of materials) {
    // Try to find faculty by department or uploadedByName
    let faculty = null;
    if (mat.uploadedByName) {
      faculty = await Faculty.findOne({ name: mat.uploadedByName });
    }
    if (!faculty && mat.department) {
      faculty = await Faculty.findOne({ department: mat.department });
    }
    if (faculty) {
      mat.uploadedBy = faculty.userId;
    }
    // Try to find course by subject or department
    let course = null;
    if (mat.subject) {
      course = await Course.findOne({ name: mat.subject });
    }
    if (!course && mat.department) {
      course = await Course.findOne({ department: mat.department });
    }
    if (course) {
      mat.courseId = course._id;
    }
    await mat.save();
  }
  console.log(`Migrated ${materials.length} material records.`);
}

async function migrateAttendance() {
  const records = await Attendance.find({ $or: [ { facultyId: { $exists: false } }, { courseId: { $exists: false } } ] });
  for (const rec of records) {
    // Try to find faculty by department
    let faculty = null;
    if (rec.department) {
      faculty = await Faculty.findOne({ department: rec.department });
    }
    if (faculty) {
      rec.facultyId = faculty._id;
    }
    // Try to find course by department
    let course = null;
    if (rec.department) {
      course = await Course.findOne({ department: rec.department });
    }
    if (course) {
      rec.courseId = course._id;
    }
    await rec.save();
  }
  console.log(`Migrated ${records.length} attendance records.`);
}

async function main() {
  await mongoose.connect(MONGO_URI);
  await migrateMaterials();
  await migrateAttendance();
  await mongoose.disconnect();
  console.log('Migration complete.');
}

main().catch(err => { console.error(err); process.exit(1); });
