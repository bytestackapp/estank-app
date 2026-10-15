// create_user.js
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const [,, username, password, roleArg] = process.argv;

if (!username || !password) {
  console.log('Usage: node create_user.js <username> <password> [role]');
  process.exit(1);
}

const USERS_FILE = path.join(__dirname, 'users.json');
let users = [];
try { 
  users = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8')); 
} catch (e) { 
  users = []; 
}

// Check if username already exists
if (users.find(u => u.username === username)) {
  console.log('❌ User already exists');
  process.exit(1);
}

// Hash password
const passwordHash = bcrypt.hashSync(password, 10);

// Default role is "user"
const role = roleArg && roleArg.toLowerCase() === 'admin' ? 'admin' : 'user';

// Store user object
users.push({ username, passwordHash, role });

// Save users.json
fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), 'utf8');
console.log(`✅ User ${username} created successfully with role: ${role}.`);
