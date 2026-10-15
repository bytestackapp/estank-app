// login.js
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const [,, username, password] = process.argv;

if (!username || !password) {
  console.log('Usage: node login.js <username> <password>');
  process.exit(1);
}

const USERS_FILE = path.join(__dirname, 'users.json');
let users = [];
try { 
  users = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8')); 
} catch(e) { 
  console.log('❌ Error reading users file:', e.message);
  users = []; 
}

const user = users.find(u => u.username === username);
if (!user) {
  console.log('❌ Invalid username or password');
  process.exit(1);
}

// Check which password property exists and use it
let storedHash;
if (user.passwordHash) {
  storedHash = user.passwordHash;
} else if (user.password) {
  storedHash = user.password;
} else {
  console.log('❌ No password hash found for user');
  process.exit(1);
}

// Verify password
try {
  const validPassword = bcrypt.compareSync(password, storedHash);
  if (!validPassword) {
    console.log('❌ Invalid username or password');
    process.exit(1);
  }
  
  console.log(`✅ User ${username} logged in successfully.`);
} catch (error) {
  console.log('❌ Error verifying password:', error.message);
  process.exit(1);
}