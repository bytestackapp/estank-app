const { createClient } = require('@supabase/supabase-js');
const jwt = require('jsonwebtoken');

function getSupabase() {
  return createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  );
}

function getSessionUser(req) {
  try {
    const cookie = req.headers.cookie || '';
    const match = cookie.match(/(?:^|;\s*)token=([^;]+)/);
    if (!match) return null;
    const decoded = jwt.verify(match[1], process.env.JWT_SECRET);
    return { username: decoded.username, role: decoded.role };
  } catch {
    return null;
  }
}

function requireAdmin(req, res) {
  const user = getSessionUser(req);
  if (!user || user.role !== 'admin') {
    res.status(403).json({ message: 'Forbidden: Admins only' });
    return null;
  }
  return user;
}

function setTokenCookie(res, payload) {
  const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '30m' });
  res.setHeader(
    'Set-Cookie',
    `token=${token}; HttpOnly; Path=/; Max-Age=1800; SameSite=Strict`
  );
}

function clearTokenCookie(res) {
  res.setHeader(
    'Set-Cookie',
    'token=; HttpOnly; Path=/; Max-Age=0; SameSite=Strict'
  );
}

module.exports = { getSupabase, getSessionUser, requireAdmin, setTokenCookie, clearTokenCookie };
