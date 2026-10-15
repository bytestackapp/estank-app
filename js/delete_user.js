// delete_user.js
const fs = require('fs');
const path = require('path');

const username = process.argv[2]?.replace(/^"|"$/g, '');
if (!username) {
  console.log('Usage: node delete_user.js <username>');
  process.exit(1);
}

const USERS_FILE = path.join(__dirname, 'users.json');

// Check if users.json exists
if (!fs.existsSync(USERS_FILE)) {
  console.log('⚠️ No users found.');
  process.exit(0);
}

// Read existing users
let users = [];
try {
  users = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
} catch (e) {
  console.error('❌ Failed to read users.json:', e.message);
  process.exit(1);
}

// Filter out the user to delete
const newUsers = users.filter(u => u.username !== username);

if (newUsers.length === users.length) {
  console.log(`❌ User '${username}' not found.`);
  process.exit(0);
}

// Save updated users list
try {
  fs.writeFileSync(USERS_FILE, JSON.stringify(newUsers, null, 2), 'utf8');
  console.log(`✅ User '${username}' deleted successfully.`);
} catch (e) {
  console.error('❌ Failed to update users.json:', e.message);
  process.exit(1);
}
