const { getSupabase, requireAdmin } = require('../../lib/supabase');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  if (!requireAdmin(req, res)) return;

  const { username } = req.body;
  if (!username) return res.status(400).json({ message: 'Username is required' });

  const supabase = getSupabase();
  const { data: pendingUser, error: fetchError } = await supabase
    .from('pending_users')
    .select('*')
    .eq('username', username)
    .single();

  if (fetchError || !pendingUser) {
    return res.status(404).json({ message: 'Pending user not found' });
  }

  const { data: existing } = await supabase
    .from('users')
    .select('username')
    .eq('username', username)
    .maybeSingle();

  if (existing) {
    return res.status(409).json({ message: 'User already exists in active users' });
  }

  const { error: insertError } = await supabase.from('users').insert({
    username: pendingUser.username,
    first_name: pendingUser.first_name,
    last_name: pendingUser.last_name,
    email: pendingUser.email,
    password: pendingUser.password,
    role: 'user',
  });

  if (insertError) {
    return res.status(500).json({ message: 'Failed to approve user' });
  }

  await supabase.from('pending_users').delete().eq('username', username);
  return res.json({ message: `User "${username}" approved successfully` });
};
