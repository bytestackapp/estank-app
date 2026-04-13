const { getSupabase, requireAdmin } = require('../../lib/supabase');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  if (!requireAdmin(req, res)) return;

  const supabase = getSupabase();
  const { error } = await supabase
    .from('pending_users')
    .delete()
    .neq('username', '');

  if (error) return res.status(500).json({ message: 'Failed to clear pending requests' });
  return res.json({ message: 'All pending requests cleared' });
};
