import mongoose from "mongoose";

const scheduleRequestSchema = new mongoose.Schema(
  {
    fromHod: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
    },

    toHod: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
    },

    year: {
      type: Number,
      required: true,
    },

    reason: {
      type: String,
      required: true,
      trim: true,
    },

    status: {
      type: String,
      enum: ["PENDING", "APPROVED", "REJECTED"],
      default: "PENDING",
    },

    sourceRequestId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ScheduleRequest",
      default: null,
      index: true,
    },

    approvedTimetable: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "TimeTable",
      default: null,
    },

    approvedAt: {
      type: Date,
      default: null,
    },

    freePeriods: {
      type: Object,
      default: {},
    },
  },
  { timestamps: true }
);

const ScheduleRequest = mongoose.model(
  "ScheduleRequest",
  scheduleRequestSchema
);

export default ScheduleRequest;
