// approve_user.js
const fs = require('fs');
const path = require('path');
const readline = require('readline-sync');
const bcrypt = require('bcryptjs');

const USERS_FILE = path.join(__dirname, 'users.json');
const PENDING_FILE = path.join(__dirname, 'pending_users.json');

// Get username from command line arguments
const username = process.argv[2];

if (!username) {
  console.log("❌ Usage: node approve_user.js <username>");
  process.exit(1);
}

if (!fs.existsSync(PENDING_FILE)) {
  console.log("⚠️ No pending applications.");
  process.exit(0);
}

let pendingUsers = JSON.parse(fs.readFileSync(PENDING_FILE, 'utf8'));
const index = pendingUsers.findIndex(u => u.username === username);

if (index === -1) {
  console.log(`⚠️ User "${username}" not found in pending applications.`);
  process.exit(0);
}

const userData = pendingUsers[index];

// Hash password
const passwordHash = bcrypt.hashSync(defaultPassword, 10);

// Load existing users
let users = [];
try {
  users = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
} catch (e) {
  users = [];
}

// Add full user object
users.push({
  username: userData.username,
  firstName: userData.firstName,
  lastName: userData.lastName,
  email: userData.email,
  role: "user", // default role
  passwordHash
});

// Save updated users.json
fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), 'utf8');

// Remove from pending list
pendingUsers.splice(index, 1);
fs.writeFileSync(PENDING_FILE, JSON.stringify(pendingUsers, null, 2), 'utf8');

console.log(`✅ User "${username}" approved and created successfully.`);
