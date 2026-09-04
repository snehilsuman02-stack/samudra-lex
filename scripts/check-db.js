const db = require('../src/main/database');

db.initializeDatabase();
console.log(JSON.stringify(db.verifyLogin('officer', 'officer123')));
console.log(JSON.stringify(db.search('Foreign fishing vessel', 'ALL')));
