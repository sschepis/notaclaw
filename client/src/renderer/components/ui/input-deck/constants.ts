// Allowed file types for upload
export const ALLOWED_MIME_TYPES = [
  'text/markdown',
  'text/plain',
  'text/html',
  'text/css',
  'text/javascript',
  'text/xml',
  'text/csv',
  'text/x-python',
  'application/javascript',
  'application/typescript',
  'application/json',
  'application/xml',
  'application/x-yaml',
  'image/png',
  'image/jpeg',
  'image/gif',
  'application/pdf',
];

export const ALLOWED_EXTENSIONS = [
  '.md', '.txt', '.html', '.htm', '.css', '.js', '.ts', '.tsx', '.jsx',
  '.json', '.yaml', '.yml', '.xml', '.csv', '.log', '.sh', '.bash',
  '.py', '.rb', '.go', '.rs', '.java', '.c', '.cpp', '.h', '.hpp',
  '.toml', '.ini', '.cfg', '.conf', '.env', '.sql', '.graphql', '.gql',
  '.svelte', '.vue', '.astro',
  '.png', '.jpg', '.jpeg', '.gif', '.pdf'
];

// Maximum file size (10MB)
export const MAX_FILE_SIZE = 10 * 1024 * 1024;

// Large text threshold for treating as document
export const LARGE_TEXT_THRESHOLD = 1000;
