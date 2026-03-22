import axiosInstance from '../axios/axiosInstance';

// ========================
// DASHBOARD
// ========================
export const getLibraryDashboard = async () => {
  return axiosInstance.get('/api/library/dashboard');
};

// ========================
// BOOKS
// ========================
export interface BookData {
  title: string;
  author: string;
  isbn: string;
  category: string;
  totalCopies: number;
}

export interface Book {
  _id: string;
  title: string;
  author: string;
  isbn: string;
  category: string;
  totalCopies: number;
  availableCopies: number;
  issuedCopies: number;
  createdAt: string;
}

export const createBook = async (data: BookData) => {
  return axiosInstance.post('/api/library/books', data);
};

export const getBooks = async (search?: string, category?: string) => {
  const params: Record<string, string> = {};
  if (search) params.search = search;
  if (category) params.category = category;
  return axiosInstance.get('/api/library/books', { params });
};

export const updateBook = async (id: string, data: Partial<BookData>) => {
  return axiosInstance.put(`/api/library/books/${id}`, data);
};

export const deleteBook = async (id: string) => {
  return axiosInstance.delete(`/api/library/books/${id}`);
};

// ========================
// ISSUE & RETURN
// ========================
export const issueBook = async (studentId: string, bookId: string) => {
  return axiosInstance.post('/api/library/issue', { studentId, bookId });
};

export const returnBook = async (transactionId: string) => {
  return axiosInstance.post(`/api/library/return/${transactionId}`);
};

// ========================
// STUDENTS
// ========================
export interface LibraryStudent {
  _id: string;
  rollNumber: string;
  department: string;
  year: number;
  section: string;
  semester: number;
  status: string;
  libraryCardsTotal: number;
  libraryCardsAvailable: number;
  userId: {
    name: string;
    email: string;
  };
}

export const getLibraryStudents = async (filters?: {
  department?: string;
  year?: string;
  section?: string;
  semester?: string;
  search?: string;
}) => {
  return axiosInstance.get('/api/library/students', { params: filters });
};

export const getStudentLibraryDetails = async (studentId: string) => {
  return axiosInstance.get(`/api/library/student/${studentId}`);
};

// ========================
// TRANSACTIONS
// ========================
export interface LibraryTransaction {
  _id: string;
  studentId: {
    _id: string;
    rollNumber: string;
    department: string;
    year: number;
    section: string;
    userId: {
      name: string;
    };
  };
  bookId: {
    _id: string;
    title: string;
    author: string;
    isbn: string;
  };
  issueDate: string;
  dueDate: string;
  returnDate: string | null;
  status: 'Issued' | 'Returned' | 'Overdue';
  fineAmount: number;
}

export const getTransactions = async (status?: string, search?: string) => {
  const params: Record<string, string> = {};
  if (status) params.status = status;
  if (search) params.search = search;
  return axiosInstance.get('/api/library/transactions', { params });
};

export const exportTransactionsCSV = async () => {
  return axiosInstance.get('/api/library/transactions/export', {
    responseType: 'blob',
  });
};