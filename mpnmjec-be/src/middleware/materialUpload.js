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

// File filter: allow common document and archive types (case-insensitive)
const fileFilter = (req, file, cb) => {
  const allowedExt = new Set(['.pdf', '.doc', '.docx', '.ppt', '.pptx', '.zip', '.xls', '.xlsx', '.rar', '.7z']);
  const allowedMime = new Set([
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/zip',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/x-rar-compressed',
    'application/x-7z-compressed',
    'application/octet-stream', // some clients send generic binary
  ]);

  const originalName = String(file.originalname || '').split('?')[0].trim();
  const ext = path.extname(originalName).toLowerCase();
  const mime = String(file.mimetype || '').toLowerCase();

  // Accept if extension or mimetype matches known good types
  if (allowedExt.has(ext) || allowedMime.has(mime) || /officedocument|msword|pdf|powerpoint|presentation|zip|compressed|excel/.test(mime)) {
    return cb(null, true);
  }

  // As a last resort, check filename pattern (case-insensitive)
  const lowerName = originalName.toLowerCase();
  if (lowerName.endsWith('.pdf') || lowerName.endsWith('.doc') || lowerName.endsWith('.docx') || lowerName.endsWith('.ppt') || lowerName.endsWith('.pptx') || lowerName.endsWith('.zip') || lowerName.endsWith('.xls') || lowerName.endsWith('.xlsx') || lowerName.endsWith('.rar') || lowerName.endsWith('.7z')) {
    return cb(null, true);
  }

  cb(new Error('Only PDF, Word, PPT, Excel and common archive files are allowed'));
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB max
});

export default upload;
