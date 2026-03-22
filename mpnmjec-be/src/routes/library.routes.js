import express from "express";
import { authenticate, authorizeRoles } from "../middleware/auth.middleware.js";
import {
  getDashboardStats,
  createBook,
  getBooks,
  updateBook,
  deleteBook,
  issueBook,
  returnBook,
  getStudentLibraryDetails,
  getTransactions,
  getStudents,
  exportTransactionsCSV,
} from "../controllers/library.controller.js";

const router = express.Router();

// All routes require authentication + librarian role
router.use(authenticate);
router.use(authorizeRoles("librarian"));

// Dashboard
router.get("/dashboard", getDashboardStats);

// Books CRUD
router.post("/books", createBook);
router.get("/books", getBooks);
router.put("/books/:id", updateBook);
router.delete("/books/:id", deleteBook);

// Issue & Return
router.post("/issue", issueBook);
router.post("/return/:transactionId", returnBook);

// Student details
router.get("/student/:studentId", getStudentLibraryDetails);
router.get("/students", getStudents);

// Transactions
router.get("/transactions", getTransactions);
router.get("/transactions/export", exportTransactionsCSV);

export default router;
