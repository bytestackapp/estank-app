// list_users.js
const fs = require('fs');
const path = require('path');

const USERS_FILE = path.join(__dirname, 'users.json');

// Check if users.json exists
if (!fs.existsSync(USERS_FILE)) {
  console.log('⚠️ No users found.');
  process.exit(0);
}

// Read users from the file
let users = [];
try {
  users = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
} catch (e) {
  console.error('❌ Failed to read users.json:', e.message);
  process.exit(1);
}

// Display users
if (users.length === 0) {
  console.log('⚠️ No users found.');
} else {
  console.log('✅ Registered Users:');
  users.forEach((u, index) => {
    console.log(`${index + 1}. ${u.username}`);
  });
}
