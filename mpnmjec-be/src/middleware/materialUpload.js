// Multer config for faculty material uploads
import multer from 'multer';
import path from 'path';
import { mkdirSync } from 'fs';

// FIX: Create uploads directory if it doesn't exist (prevents ENOENT crash on fresh deploy)
const uploadDir = path.join(process.cwd(), 'uploads', 'materials');
mkdirSync(uploadDir, { recursive: true });

// Storage config: save files to uploads/materials with unique names
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(process.cwd(), 'uploads', 'materials'));
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});

// Accept only PDF, DOC, DOCX, PPT, ZIP
const fileFilter = (req, file, cb) => {
  const allowed = ['.pdf', '.doc', '.docx', '.ppt', '.pptx', '.zip'];
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowed.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Only PDF, Word, PPT, and ZIP files are allowed'));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB max
});

export default upload;
