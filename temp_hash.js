const crypto = require('crypto');
const salt = 'f3b8e1a2c3d4e5f6';
const hash = crypto.scryptSync('admin123', salt, 64).toString('hex');
console.log(`${salt}:${hash}`);
