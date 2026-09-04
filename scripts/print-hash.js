const crypto = require('crypto');
const value = process.argv[2] || 'officer123';
console.log(crypto.createHash('sha256').update(value).digest('hex')); 
