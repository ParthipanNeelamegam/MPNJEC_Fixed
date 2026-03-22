import Book from "../models/Book.js";
import LibraryTransaction from "../models/LibraryTransaction.js";
import Student from "../models/Student.js";

const FINE_PER_DAY = 5; // ₹5 per day
const DEFAULT_DUE_DAYS = 14; // 2 weeks

// ========================
// Helper: Update overdue transactions
// ========================
const updateOverdueTransactions = async () => {
  const now = new Date();
  const overdueTransactions = await LibraryTransaction.find({
    status: "Issued",
    dueDate: { $lt: now },
  });

  for (const txn of overdueTransactions) {
    const daysOverdue = Math.ceil((now - txn.dueDate) / (1000 * 60 * 60 * 24));
    txn.status = "Overdue";
    txn.fineAmount = daysOverdue * FINE_PER_DAY;
    await txn.save();
  }
};

// ========================
// DASHBOARD STATS
// ========================
export const getDashboardStats = async (req, res) => {
  try {
    await updateOverdueTransactions();

    const totalBooks = await Book.countDocuments();
    const totalIssuedResult = await Book.aggregate([{ $group: { _id: null, total: { $sum: "$issuedCopies" } } }]);
    const totalIssued = totalIssuedResult[0]?.total || 0;
    const overdueBooks = await LibraryTransaction.countDocuments({ status: "Overdue" });
    const activeStudents = await LibraryTransaction.distinct("studentId", { status: { $in: ["Issued", "Overdue"] } });

    const recentTransactions = await LibraryTransaction.find()
      .sort({ createdAt: -1 })
      .limit(10)
      .populate({ path: "bookId", select: "title author isbn" })
      .populate({ path: "studentId", select: "rollNumber userId", populate: { path: "userId", select: "name" } });

    const lowStockBooks = await Book.find({ availableCopies: { $lt: 3 }, totalCopies: { $gt: 0 } })
      .sort({ availableCopies: 1 })
      .limit(10);

    // Fine summary
    const fineResult = await LibraryTransaction.aggregate([
      { $match: { fineAmount: { $gt: 0 } } },
      { $group: { _id: null, totalFine: { $sum: "$fineAmount" }, count: { $sum: 1 } } },
    ]);

    res.json({
      stats: {
        totalBooks,
        totalIssued,
        overdueBooks,
        activeStudents: activeStudents.length,
        totalFine: fineResult[0]?.totalFine || 0,
        fineCount: fineResult[0]?.count || 0,
      },
      recentTransactions,
      lowStockBooks,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ========================
// BOOK CRUD
// ========================
export const createBook = async (req, res) => {
  try {
    const { title, author, isbn, category, totalCopies } = req.body;

    if (!title || !author || !isbn || !category) {
      return res.status(400).json({ error: "Title, author, ISBN, and category are required" });
    }

    const existing = await Book.findOne({ isbn });
    if (existing) {
      return res.status(400).json({ error: "A book with this ISBN already exists" });
    }

    const book = await Book.create({
      title,
      author,
      isbn,
      category,
      totalCopies: totalCopies || 1,
      availableCopies: totalCopies || 1,
      issuedCopies: 0,
    });

    res.status(201).json({ message: "Book added successfully", book });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getBooks = async (req, res) => {
  try {
    const { search, category } = req.query;
    const filter = {};

    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: "i" } },
        { author: { $regex: search, $options: "i" } },
        { isbn: { $regex: search, $options: "i" } },
      ];
    }
    if (category) {
      filter.category = category;
    }

    const books = await Book.find(filter).sort({ createdAt: -1 });
    const categories = await Book.distinct("category");
    res.json({ books, categories });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const updateBook = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, author, isbn, category, totalCopies } = req.body;

    const book = await Book.findById(id);
    if (!book) return res.status(404).json({ error: "Book not found" });

    // If totalCopies changed, adjust availableCopies accordingly
    if (totalCopies !== undefined && totalCopies !== book.totalCopies) {
      const diff = totalCopies - book.totalCopies;
      const newAvailable = book.availableCopies + diff;
      if (newAvailable < 0) {
        return res.status(400).json({ error: "Cannot reduce total copies below issued copies" });
      }
      book.availableCopies = newAvailable;
      book.totalCopies = totalCopies;
    }

    if (title) book.title = title;
    if (author) book.author = author;
    if (isbn) book.isbn = isbn;
    if (category) book.category = category;

    await book.save();
    res.json({ message: "Book updated successfully", book });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const deleteBook = async (req, res) => {
  try {
    const { id } = req.params;
    const book = await Book.findById(id);
    if (!book) return res.status(404).json({ error: "Book not found" });

    if (book.issuedCopies > 0) {
      return res.status(400).json({ error: "Cannot delete book with issued copies. Return all copies first." });
    }

    await Book.findByIdAndDelete(id);
    res.json({ message: "Book deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ========================
// ISSUE BOOK
// ========================
export const issueBook = async (req, res) => {
  try {
    const { studentId, bookId } = req.body;

    if (!studentId || !bookId) {
      return res.status(400).json({ error: "Student ID and Book ID are required" });
    }

    const student = await Student.findById(studentId);
    if (!student) return res.status(404).json({ error: "Student not found" });

    if (student.status !== "active") {
      return res.status(400).json({ error: "Student account is inactive. Cannot issue books." });
    }

    if (student.libraryCardsAvailable <= 0) {
      return res.status(400).json({ error: "Student has no available library cards. Return a book first." });
    }

    const book = await Book.findById(bookId);
    if (!book) return res.status(404).json({ error: "Book not found" });

    if (book.availableCopies <= 0) {
      return res.status(400).json({ error: "No copies available for this book." });
    }

    // Prevent issuing same book twice to same student without return
    const existingIssue = await LibraryTransaction.findOne({
      studentId,
      bookId,
      status: { $in: ["Issued", "Overdue"] },
    });
    if (existingIssue) {
      return res.status(400).json({ error: "This book is already issued to this student." });
    }

    // Create transaction
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + DEFAULT_DUE_DAYS);

    const transaction = await LibraryTransaction.create({
      studentId,
      bookId,
      issueDate: new Date(),
      dueDate,
      status: "Issued",
    });

    // Update book stock
    book.availableCopies -= 1;
    book.issuedCopies += 1;
    await book.save();

    // Update student library cards
    student.libraryCardsAvailable -= 1;
    await student.save();

    const populated = await LibraryTransaction.findById(transaction._id)
      .populate({ path: "bookId", select: "title author isbn" })
      .populate({ path: "studentId", select: "rollNumber userId", populate: { path: "userId", select: "name" } });

    res.status(201).json({ message: "Book issued successfully", transaction: populated });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ========================
// RETURN BOOK
// ========================
export const returnBook = async (req, res) => {
  try {
    const { transactionId } = req.params;

    const transaction = await LibraryTransaction.findById(transactionId);
    if (!transaction) return res.status(404).json({ error: "Transaction not found" });

    if (transaction.status === "Returned") {
      return res.status(400).json({ error: "This book is already returned." });
    }

    // Calculate fine if overdue
    const now = new Date();
    let fineAmount = 0;
    if (now > transaction.dueDate) {
      const daysOverdue = Math.ceil((now - transaction.dueDate) / (1000 * 60 * 60 * 24));
      fineAmount = daysOverdue * FINE_PER_DAY;
    }

    // Update transaction
    transaction.status = "Returned";
    transaction.returnDate = now;
    transaction.fineAmount = fineAmount;
    await transaction.save();

    // Update book stock
    const book = await Book.findById(transaction.bookId);
    if (book) {
      book.availableCopies += 1;
      book.issuedCopies -= 1;
      await book.save();
    }

    // Restore student library card
    const student = await Student.findById(transaction.studentId);
    if (student) {
      student.libraryCardsAvailable += 1;
      await student.save();
    }

    const populated = await LibraryTransaction.findById(transactionId)
      .populate({ path: "bookId", select: "title author isbn" })
      .populate({ path: "studentId", select: "rollNumber userId", populate: { path: "userId", select: "name" } });

    res.json({ message: "Book returned successfully", transaction: populated, fineAmount });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ========================
// GET STUDENT LIBRARY DETAILS
// ========================
export const getStudentLibraryDetails = async (req, res) => {
  try {
    const { studentId } = req.params;

    const student = await Student.findById(studentId).populate({ path: "userId", select: "name email" });
    if (!student) return res.status(404).json({ error: "Student not found" });

    await updateOverdueTransactions();

    const transactions = await LibraryTransaction.find({ studentId })
      .sort({ createdAt: -1 })
      .populate({ path: "bookId", select: "title author isbn category" });

    const activeBooks = transactions.filter(t => t.status === "Issued" || t.status === "Overdue");
    const history = transactions.filter(t => t.status === "Returned");

    res.json({
      student: {
        _id: student._id,
        name: student.userId?.name || "Unknown",
        email: student.userId?.email || "",
        rollNumber: student.rollNumber,
        department: student.department,
        year: student.year,
        section: student.section,
        semester: student.semester,
        status: student.status,
        libraryCardsTotal: student.libraryCardsTotal,
        libraryCardsAvailable: student.libraryCardsAvailable,
      },
      activeBooks,
      history,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ========================
// GET ALL TRANSACTIONS
// ========================
export const getTransactions = async (req, res) => {
  try {
    const { status, search } = req.query;
    await updateOverdueTransactions();

    const filter = {};
    if (status && status !== "all") {
      filter.status = status;
    }

    let transactions = await LibraryTransaction.find(filter)
      .sort({ createdAt: -1 })
      .populate({ path: "bookId", select: "title author isbn" })
      .populate({ path: "studentId", select: "rollNumber department year section userId", populate: { path: "userId", select: "name" } });

    // Filter by search (student name or roll number)
    if (search) {
      const searchLower = search.toLowerCase();
      transactions = transactions.filter(t => {
        const name = t.studentId?.userId?.name?.toLowerCase() || "";
        const roll = t.studentId?.rollNumber?.toLowerCase() || "";
        const bookTitle = t.bookId?.title?.toLowerCase() || "";
        return name.includes(searchLower) || roll.includes(searchLower) || bookTitle.includes(searchLower);
      });
    }

    res.json({ transactions });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ========================
// GET STUDENTS FOR LIBRARY (with filters)
// ========================
export const getStudents = async (req, res) => {
  try {
    const { department, year, section, semester, search } = req.query;
    const filter = { status: "active" };

    if (department) filter.department = department;
    if (year) filter.year = Number(year);
    if (section) filter.section = section;
    if (semester) filter.semester = Number(semester);

    let students = await Student.find(filter)
      .populate({ path: "userId", select: "name email" })
      .sort({ rollNumber: 1 });

    if (search) {
      const searchLower = search.toLowerCase();
      students = students.filter(s => {
        const name = s.userId?.name?.toLowerCase() || "";
        const roll = s.rollNumber?.toLowerCase() || "";
        return name.includes(searchLower) || roll.includes(searchLower);
      });
    }

    res.json({ students });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ========================
// EXPORT TRANSACTIONS CSV
// ========================
export const exportTransactionsCSV = async (req, res) => {
  try {
    await updateOverdueTransactions();

    const transactions = await LibraryTransaction.find()
      .sort({ createdAt: -1 })
      .populate({ path: "bookId", select: "title author isbn" })
      .populate({ path: "studentId", select: "rollNumber department year section userId", populate: { path: "userId", select: "name" } });

    const csvHeader = "Student Name,Roll Number,Department,Book Title,Author,ISBN,Issue Date,Due Date,Return Date,Status,Fine (₹)\n";
    const csvRows = transactions.map(t => {
      return [
        t.studentId?.userId?.name || "Unknown",
        t.studentId?.rollNumber || "",
        t.studentId?.department || "",
        t.bookId?.title || "",
        t.bookId?.author || "",
        t.bookId?.isbn || "",
        t.issueDate ? new Date(t.issueDate).toLocaleDateString() : "",
        t.dueDate ? new Date(t.dueDate).toLocaleDateString() : "",
        t.returnDate ? new Date(t.returnDate).toLocaleDateString() : "",
        t.status,
        t.fineAmount || 0,
      ].join(",");
    }).join("\n");

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", "attachment; filename=library_transactions.csv");
    res.send(csvHeader + csvRows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
