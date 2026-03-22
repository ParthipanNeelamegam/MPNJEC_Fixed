import mongoose from "mongoose";

const bookSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
  },
  author: {
    type: String,
    required: true,
    trim: true,
  },
  isbn: {
    type: String,
    unique: true,
    required: true,
    trim: true,
  },
  category: {
    type: String,
    required: true,
    trim: true,
  },
  totalCopies: {
    type: Number,
    required: true,
    min: 0,
    default: 1,
  },
  availableCopies: {
    type: Number,
    required: true,
    min: 0,
    default: 1,
  },
  issuedCopies: {
    type: Number,
    default: 0,
    min: 0,
  },
}, { timestamps: true });

bookSchema.index({ title: "text", author: "text", isbn: "text" });

export default mongoose.model("Book", bookSchema);
