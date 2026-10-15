// server.js
const express = require('express');
const session = require('express-session');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');

const app = express();
const PORT = process.env.PORT || 3000;

const USERS_FILE = path.join(__dirname, 'users.json');
const PENDING_FILE = path.join(__dirname, 'pending_users.json');

// Ensure pending file exists
if (!fs.existsSync(PENDING_FILE)) fs.writeFileSync(PENDING_FILE, '[]', 'utf8');

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(session({
  secret: process.env.SESSION_SECRET || 'change_this_secret_for_beta',
  resave: false,
  saveUninitialized: false,
  rolling: true,
  cookie: { maxAge: 1000 * 60 * 30 } // 30 minutes
}));

// Ensure admin only
function requireAdmin(req, res, next) {
  if (req.session && req.session.user && req.session.user.role === 'admin') {
    return next();
  }
  return res.status(403).json({ message: 'Forbidden: Admins only' });
}

// Serve login page
app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// Handle login
app.post('/login', (req, res) => {
  const { username, password } = req.body;

  let users = [];
  try { 
    users = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8')); 
  } catch (e) { users = []; }

  const user = users.find(u => u.username === username);

  if (!user) {
    return res.json({ success: false, message: "Invalid username or password." });
  }

  // Compare hashed password
  const passwordHash = user.password || user.passwordHash;
  const match = bcrypt.compareSync(password, passwordHash);

  if (!match) {
    return res.json({ success: false, message: "Invalid username or password." });
  }

  // Login success, store session
  req.session.user = { username: user.username, role: user.role || 'user' };
  return res.json({ success: true, role: req.session.user.role });
});

// Handle sign-up requests - FIXED
app.post('/signup', (req, res) => {
  const { firstName, lastName, email, username, password } = req.body;

  if (!firstName || !lastName || !email || !username || !password) {
    return res.json({ success: false, message: "All fields are required." });
  }

  // Check approved users
  let users = [];
  try { users = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8')); } catch (e) { users = []; }
  if (users.some(u => u.username === username || u.email === email)) {
    return res.json({ success: false, message: "Username or email already exists." });
  }

  // Check pending users
  let pendingUsers = [];
  try { pendingUsers = JSON.parse(fs.readFileSync(PENDING_FILE, 'utf8')); } catch(e){ pendingUsers = []; }
  if (pendingUsers.some(u => u.username === username || u.email === email)) {
    return res.json({ success: false, message: "Your account application is either in process or already active." });
  }

  // Hash the password before storing
  const hashedPassword = bcrypt.hashSync(password, 10);

  pendingUsers.push({
    firstName,
    lastName,
    email,
    username,
    password: hashedPassword, // Store hashed password
    requestedAt: new Date().toISOString()
  });

  try {
    fs.writeFileSync(PENDING_FILE, JSON.stringify(pendingUsers, null, 2));
  } catch (e) {
    return res.json({ success: false, message: "Failed to save signup request." });
  }

  return res.json({ success: true, message: "Signup request submitted. Await admin approval." });
});

// Logout
app.get('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/login'));
});

// Get current logged-in user
app.get('/current_user', (req, res) => {
  if (req.session && req.session.user) {
    // Load full user data from users.json to get firstName and lastName
    try {
      const users = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
      const fullUser = users.find(u => u.username === req.session.user.username);
      
      if (fullUser) {
        return res.json({ 
          username: fullUser.username, 
          firstName: fullUser.firstName || null,
          lastName: fullUser.lastName || null,
          email: fullUser.email || null,
          role: fullUser.role || 'user' 
        });
      } else {
        // If user not found in users.json, return session data only
        return res.json({ 
          username: req.session.user.username, 
          role: req.session.user.role || 'user' 
        });
      }
    } catch (e) {
      // If file read fails, return session data only
      return res.json({ 
        username: req.session.user.username, 
        role: req.session.user.role || 'user' 
      });
    }
  }
  return res.json({ username: null, role: null });
});

// Delete user (admin only)
app.post('/api/users/delete', requireAdmin, (req, res) => {
  const { username } = req.body;
  if (!username) return res.status(400).json({ message: 'Username is required' });

  let users = [];
  try {
    users = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
  } catch (e) {
    return res.status(500).json({ message: 'Failed to read users file' });
  }

  const newUsers = users.filter(u => u.username !== username);

  if (newUsers.length === users.length) {
    return res.status(404).json({ message: `User '${username}' not found.` });
  }

  try {
    fs.writeFileSync(USERS_FILE, JSON.stringify(newUsers, null, 2), 'utf8');
    return res.json({ message: `User '${username}' deleted successfully.` });
  } catch (e) {
    return res.status(500).json({ message: 'Failed to update users.json' });
  }
});

// API endpoint for current user (consistent with admin page)
app.get('/api/current-user', (req, res) => {
  if (req.session && req.session.user) {
    return res.json({ 
      username: req.session.user.username, 
      role: req.session.user.role || 'user' 
    });
  }
  return res.json({ username: null, role: null });
});

// Get active users (admin only)
app.get('/api/users/active', requireAdmin, (req, res) => {
  try {
    const users = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
    res.json(users.map(u => ({ 
      username: u.username, 
      firstName: u.firstName || null,
      lastName: u.lastName || null,
      email: u.email || null,
      role: u.role || 'user' 
    })));
  } catch (e) {
    res.status(500).json({ message: 'Failed to load users' });
  }
});

// Get pending users (admin only)
app.get('/api/users/pending', requireAdmin, (req, res) => {
  try {
    const pending = JSON.parse(fs.readFileSync(PENDING_FILE, 'utf8'));
    // Don't send password hashes to frontend
    const sanitized = pending.map(user => ({
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      username: user.username,
      requestedAt: user.requestedAt
    }));
    res.json(sanitized);
  } catch (e) {
    res.status(500).json({ message: 'Failed to load pending users' });
  }
});

// Approve user - FIXED
app.post('/api/users/approve', requireAdmin, (req, res) => {
  const { username } = req.body;
  if (!username) return res.status(400).json({ message: 'Username is required' });

  try {
    // Load pending users
    let pendingUsers = JSON.parse(fs.readFileSync(PENDING_FILE, 'utf8'));
    const userToApprove = pendingUsers.find(u => u.username === username);
    
    if (!userToApprove) {
      return res.status(404).json({ message: 'Pending user not found' });
    }

    // Load active users
    let activeUsers = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
    
    // Check if user already exists in active users
    if (activeUsers.some(u => u.username === username)) {
      return res.status(409).json({ message: 'User already exists in active users' });
    }

    // Move user from pending to active with their original password
    const newUser = {
      username: userToApprove.username,
      firstName: userToApprove.firstName,
      lastName: userToApprove.lastName,
      email: userToApprove.email,
      password: userToApprove.password, // Use the password they submitted (already hashed)
      role: 'user',
      approvedAt: new Date().toISOString()
    };

    activeUsers.push(newUser);
    
    // Remove from pending
    pendingUsers = pendingUsers.filter(u => u.username !== username);
    
    // Save both files
    fs.writeFileSync(USERS_FILE, JSON.stringify(activeUsers, null, 2));
    fs.writeFileSync(PENDING_FILE, JSON.stringify(pendingUsers, null, 2));
    
    res.json({ message: `User "${username}" approved successfully` });
  } catch (e) {
    console.error('Approve user error:', e);
    res.status(500).json({ message: 'Failed to approve user' });
  }
});

// Reject user
app.post('/api/users/reject', requireAdmin, (req, res) => {
  const { username } = req.body;
  if (!username) return res.status(400).json({ message: 'Username is required' });

  try {
    let pendingUsers = JSON.parse(fs.readFileSync(PENDING_FILE, 'utf8'));
    const originalLength = pendingUsers.length;
    
    pendingUsers = pendingUsers.filter(u => u.username !== username);
    
    if (pendingUsers.length === originalLength) {
      return res.status(404).json({ message: 'Pending user not found' });
    }
    
    fs.writeFileSync(PENDING_FILE, JSON.stringify(pendingUsers, null, 2));
    res.json({ message: `User "${username}" rejected successfully` });
  } catch (e) {
    res.status(500).json({ message: 'Failed to reject user' });
  }
});

// Add user directly (admin only) - FIXED
app.post('/api/users/add', requireAdmin, (req, res) => {
  const { firstName, lastName, email, username, password } = req.body;
  
  if (!username || !password) {
    return res.status(400).json({ message: 'Username and password required' });
  }
  
  try {
    const users = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
    
    if (users.some(u => u.username === username)) {
      return res.status(409).json({ message: 'Username already exists' });
    }
    
    const hashedPassword = bcrypt.hashSync(password, 10);
    users.push({
      username,
      firstName: firstName || null,
      lastName: lastName || null,
      email: email || null,
      password: hashedPassword,
      role: 'user',
      createdAt: new Date().toISOString()
    });
    
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
    res.json({ message: 'User added successfully' });
  } catch (e) {
    res.status(500).json({ message: 'Failed to add user' });
  }
});

// Clear all pending (admin only)
app.post('/api/users/clear-pending', requireAdmin, (req, res) => {
  try {
    fs.writeFileSync(PENDING_FILE, '[]');
    res.json({ message: 'All pending requests cleared' });
  } catch (e) {
    res.status(500).json({ message: 'Failed to clear pending requests' });
  }
});

// Serve static files for authenticated users
app.use('/app', (req, res, next) => {
  if (req.session && req.session.user) {
    if (req.path === '/' || req.path === '') {
      return res.sendFile(path.join(__dirname, 'public', 'homepage.html'));
    }
    return next();
  }
  return res.redirect('/login');
}, express.static(path.join(__dirname, 'public')));

// Serve static files (login, etc.)
app.use(express.static(path.join(__dirname, 'public')));

// Redirect root to login
app.get('/', (req, res) => {
  if (req.session && req.session.user) {
    res.redirect('/app/');
  } else {
    res.redirect('/login');
  }
});

// Start server
app.listen(PORT, '0.0.0.0', () => console.log(`Tank Estimator running on all interfaces at port ${PORT}`));