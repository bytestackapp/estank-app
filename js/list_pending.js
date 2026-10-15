// list_pending.js
const fs = require('fs');
const path = require('path');

const PENDING_FILE = path.join(__dirname, 'pending_users.json');

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

// Display pending users
if (pendingUsers.length === 0) {
  console.log('⚠️ No pending applications.');
} else {
  console.log('✅ Pending Sign-Up Applications:\n');
pendingUsers.forEach((u, index) => {
  console.log(
    `${index + 1}. ${u.username} - ${u.firstName} ${u.lastName} - ${u.email} - Requested At: ${u.requestedAt}`
  );
  // Do NOT log u.password
});
  console.log('\nUse APPROVE command to create user and remove from pending.');
}
