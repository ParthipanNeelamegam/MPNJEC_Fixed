import mongoose from "mongoose";

const libraryTransactionSchema = new mongoose.Schema({
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Student",
    required: true,
  },
  bookId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Book",
    required: true,
  },
  issueDate: {
    type: Date,
    default: Date.now,
    required: true,
  },
  dueDate: {
    type: Date,
    required: true,
  },
  returnDate: {
    type: Date,
    default: null,
  },
  status: {
    type: String,
    enum: ["Issued", "Returned", "Overdue"],
    default: "Issued",
  },
  fineAmount: {
    type: Number,
    default: 0,
    min: 0,
  },
}, { timestamps: true });

libraryTransactionSchema.index({ studentId: 1, status: 1 });
libraryTransactionSchema.index({ bookId: 1, status: 1 });

export default mongoose.model("LibraryTransaction", libraryTransactionSchema);
