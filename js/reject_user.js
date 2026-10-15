// reject_user.js
const fs = require('fs');
const path = require('path');

const PENDING_FILE = path.join(__dirname, 'pending_users.json');

// Get the username from command-line arguments and remove quotes if present
const username = process.argv[2]?.replace(/^"|"$/g, '');
if (!username) {
  console.log('❌ Please provide a username to reject.');
  process.exit(1);
}

// Check if pending_users.json exists
if (!fs.existsSync(PENDING_FILE)) {
  console.log('⚠️ No pending applications.');
  process.exit(0);
}

// Read pending users
let pendingUsers = [];
try {
  pendingUsers = JSON.parse(fs.readFileSync(PENDING_FILE, 'utf8'));
} catch (e) {
  console.error('❌ Failed to read pending_users.json:', e.message);
  process.exit(1);
}

// Find the user in the pending list
const index = pendingUsers.findIndex(u => u.username === username);
if (index === -1) {
  console.log(`⚠️ No pending user found with username "${username}".`);
  process.exit(0);
}

// Remove the user from the pending list
pendingUsers.splice(index, 1);

// Save updated pending list
try {
  fs.writeFileSync(PENDING_FILE, JSON.stringify(pendingUsers, null, 2), 'utf8');
  console.log(`✅ Pending user "${username}" has been rejected and removed.`);
} catch (e) {
  console.error('❌ Failed to update pending_users.json:', e.message);
  process.exit(1);
}
