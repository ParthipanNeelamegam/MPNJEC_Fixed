import mongoose from "mongoose";

const hodSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  department: {
    type: String,
    required: true,
    unique: true,
  },
  status: {
    type: String,
    enum: ["active", "inactive"],
    default: "active",
  },
  timetable: {
    type: mongoose.Schema.Types.Mixed,
    default: null,
  },
}, { timestamps: true });

export default mongoose.models.HOD || mongoose.model("HOD", hodSchema);
