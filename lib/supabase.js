const { createClient } = require('@supabase/supabase-js');

function getSupabase() {
  return createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  );
}

function getSessionUser(req) {
  try {
    const cookie = req.headers.cookie || '';
    const match = cookie.match(/(?:^|;\s*)sb_token=([^;]+)/);
    if (!match) return null;

    const supabase = getSupabase();
    return match[1];
  } catch {
    return null;
  }
}

async function requireAuth(req, res) {
  const cookie = req.headers.cookie || '';
  const match = cookie.match(/(?:^|;\s*)sb_token=([^;]+)/);
  if (!match) {
    res.status(401).json({ message: 'Unauthorized' });
    return null;
  }

  const supabase = getSupabase();
  const { data: { user }, error } = await supabase.auth.getUser(match[1]);

  if (error || !user) {
    res.status(401).json({ message: 'Unauthorized' });
    return null;
  }

  // Get role from users table
  const { data: profile } = await supabase
    .from('users')
    .select('role, username')
    .eq('auth_id', user.id)
    .single();

  return { ...user, role: profile?.role || 'user', username: profile?.username };
}

async function requireAdmin(req, res) {
  const user = await requireAuth(req, res);
  if (!user) return null;

  if (user.role !== 'admin') {
    res.status(403).json({ message: 'Forbidden: Admins only' });
    return null;
  }
  return user;
}

function setTokenCookie(res, token) {
  res.setHeader(
    'Set-Cookie',
    `sb_token=${token}; HttpOnly; Path=/; Max-Age=1800; SameSite=Strict`
  );
}

function clearTokenCookie(res) {
  res.setHeader(
    'Set-Cookie',
    'sb_token=; HttpOnly; Path=/; Max-Age=0; SameSite=Strict'
  );
}

module.exports = { getSupabase, requireAuth, requireAdmin, setTokenCookie, clearTokenCookie };
