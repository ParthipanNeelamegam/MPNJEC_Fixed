import mongoose from "mongoose"

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI)
    console.log("MongoDB connected")

    // Auto-migrate old-format leave requests to new schema
    await migrateOldLeaveRequests()
  } catch (error) {
    console.error(error)
    process.exit(1)
  }
}

// One-time migration: convert old flat leave fields to new nested approval format
async function migrateOldLeaveRequests() {
  try {
    const db = mongoose.connection.db;
    const col = db.collection('leaverequests');
    const oldDocs = await col.find({
      finalStatus: { $exists: false },
      status: { $exists: true }
    }).toArray();

    if (oldDocs.length === 0) return;

    console.log(`Migrating ${oldDocs.length} old-format leave request(s)...`);

    for (const doc of oldDocs) {
      const update = {
        $set: {
          finalStatus: doc.status || 'Pending',
          facultyApproval: {
            status: doc.classAdvisorStatus || 'N/A',
            ...(doc.classAdvisorReviewedBy && { approvedBy: doc.classAdvisorReviewedBy }),
            ...(doc.classAdvisorReviewedAt && { approvedAt: doc.classAdvisorReviewedAt }),
          },
          hodApproval: {
            status: doc.hodStatus || 'Pending',
            ...(doc.hodReviewedBy && { approvedBy: doc.hodReviewedBy }),
            ...(doc.hodReviewedAt && { approvedAt: doc.hodReviewedAt }),
          },
          principalApproval: {
            status: doc.principalStatus || 'Pending',
            ...(doc.principalReviewedBy && { approvedBy: doc.principalReviewedBy }),
            ...(doc.principalReviewedAt && { approvedAt: doc.principalReviewedAt }),
          },
        },
        $unset: {
          status: '', classAdvisorStatus: '', hodStatus: '', principalStatus: '',
          currentLevel: '', classAdvisorReviewedBy: '', classAdvisorReviewedAt: '',
          hodReviewedBy: '', hodReviewedAt: '', principalReviewedBy: '', principalReviewedAt: '',
        }
      };
      await col.updateOne({ _id: doc._id }, update);
    }
    console.log(`Leave requests migration complete.`);
  } catch (err) {
    console.warn('Leave migration skipped:', err.message);
  }
}

export default connectDB;
