// Allowed file types for upload
export const ALLOWED_MIME_TYPES = [
  'text/markdown',
  'text/plain',
  'text/html',
  'text/css',
  'text/javascript',
  'application/javascript',
  'application/typescript',
  'image/png',
  'image/jpeg',
  'image/gif',
  'application/pdf',
];

export const ALLOWED_EXTENSIONS = [
  '.md', '.txt', '.html', '.htm', '.css', '.js', '.ts', '.tsx', '.jsx', 
  '.png', '.jpg', '.jpeg', '.gif', '.pdf'
];

// Maximum file size (10MB)
export const MAX_FILE_SIZE = 10 * 1024 * 1024;

// Large text threshold for treating as document
export const LARGE_TEXT_THRESHOLD = 1000;
