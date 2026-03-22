import mongoose from "mongoose";

const periodConfigSchema = new mongoose.Schema({
  periodNumber: {
    type: Number,
    required: true,
    unique: true,
    min: 1,
    max: 8,
  },
  startTime: {
    type: String, // Format: "HH:MM" (24-hour)
    required: true,
  },
  endTime: {
    type: String, // Format: "HH:MM" (24-hour)
    required: true,
  },
  isBreak: {
    type: Boolean,
    default: false,
  },
  breakName: {
    type: String, // e.g., "Lunch Break", "Tea Break"
  },
}, { timestamps: true });

// Static method to seed default period configuration
periodConfigSchema.statics.seedDefaultPeriods = async function () {
  const count = await this.countDocuments();
  if (count > 0) return; // Already seeded

  const defaultPeriods = [
    { periodNumber: 1, startTime: "09:00", endTime: "09:50" },
    { periodNumber: 2, startTime: "09:50", endTime: "10:40" },
    { periodNumber: 3, startTime: "10:55", endTime: "11:45" }, // After tea break
    { periodNumber: 4, startTime: "11:45", endTime: "12:35" },
    { periodNumber: 5, startTime: "13:30", endTime: "14:20" }, // After lunch
    { periodNumber: 6, startTime: "14:20", endTime: "15:10" },
    { periodNumber: 7, startTime: "15:25", endTime: "16:15" }, // After short break
    { periodNumber: 8, startTime: "16:15", endTime: "17:05" },
  ];

  await this.insertMany(defaultPeriods);
  console.log("Default period configuration seeded");
};

export default mongoose.models.PeriodConfig || mongoose.model("PeriodConfig", periodConfigSchema);
