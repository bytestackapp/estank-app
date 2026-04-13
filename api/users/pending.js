const { getSupabase, requireAdmin } = require('../../lib/supabase');

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();
  if (!requireAdmin(req, res)) return;

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('pending_users')
    .select('username, first_name, last_name, email, requested_at')
    .order('requested_at', { ascending: true });

  if (error) return res.status(500).json({ message: 'Failed to load pending users' });

  return res.json(data.map(u => ({
    username: u.username,
    firstName: u.first_name || null,
    lastName: u.last_name || null,
    email: u.email || null,
    requestedAt: u.requested_at,
  })));
};
