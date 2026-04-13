const { getSupabase, requireAdmin } = require('../../lib/supabase');

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();
  if (!requireAdmin(req, res)) return;

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('users')
    .select('username, first_name, last_name, email, role');

  if (error) return res.status(500).json({ message: 'Failed to load users' });

  return res.json(data.map(u => ({
    username: u.username,
    firstName: u.first_name || null,
    lastName: u.last_name || null,
    email: u.email || null,
    role: u.role || 'user',
  })));
};
