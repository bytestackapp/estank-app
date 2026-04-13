const { getSupabase, requireAdmin } = require('../../lib/supabase');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  if (!requireAdmin(req, res)) return;

  const { username } = req.body;
  if (!username) return res.status(400).json({ message: 'Username is required' });

  const supabase = getSupabase();
  const { error, count } = await supabase
    .from('pending_users')
    .delete({ count: 'exact' })
    .eq('username', username);

  if (error) return res.status(500).json({ message: 'Failed to reject user' });
  if (count === 0) return res.status(404).json({ message: 'Pending user not found' });

  return res.json({ message: `User "${username}" rejected successfully` });
};
