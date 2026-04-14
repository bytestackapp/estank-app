const { getSupabase, requireAdmin } = require('../../lib/supabase');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  if (!requireAdmin(req, res)) return;

  const { username } = req.body;
  if (!username) return res.status(400).json({ message: 'Username is required' });

  const supabase = getSupabase();

  // Find pending user
  const { data: pendingUser, error: fetchError } = await supabase
    .from('pending_users')
    .select('*')
    .eq('username', username)
    .single();

  if (fetchError || !pendingUser) {
    return res.status(404).json({ message: 'Pending user not found' });
  }

  // Check if already active
  const { data: existing } = await supabase
    .from('users')
    .select('username')
    .eq('username', username)
    .maybeSingle();

  if (existing) {
    return res.status(409).json({ message: 'User already exists in active users' });
  }

  // Create in Supabase Auth
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email: pendingUser.email,
    password: pendingUser.password,
    email_confirm: true,
  });

  if (authError) {
    return res.status(500).json({ message: 'Failed to create auth user: ' + authError.message });
  }

  // Insert into users table with auth_id
  const { error: insertError } = await supabase.from('users').insert({
    username: pendingUser.username,
    first_name: pendingUser.first_name,
    last_name: pendingUser.last_name,
    email: pendingUser.email,
    password: pendingUser.password,
    role: 'user',
    auth_id: authData.user.id,
  });

  if (insertError) {
    return res.status(500).json({ message: 'Failed to create user profile' });
  }

  // Remove from pending
  await supabase.from('pending_users').delete().eq('username', username);

  return res.json({ message: `User "${username}" approved successfully` });
};
