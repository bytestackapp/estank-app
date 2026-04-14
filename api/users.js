const bcrypt = require('bcryptjs');
const { getSupabase, requireAdmin } = require('../lib/supabase');

module.exports = async function handler(req, res) {
  const action = req.query.action;
  const supabase = getSupabase();

  // GET /api/users?action=active
  if (req.method === 'GET' && action === 'active') {
    if (!await requireAdmin(req, res)) return;
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
  }

  // GET /api/users?action=pending
  if (req.method === 'GET' && action === 'pending') {
    if (!await requireAdmin(req, res)) return;
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
  }

  // POST /api/users?action=approve
  if (req.method === 'POST' && action === 'approve') {
    if (!await requireAdmin(req, res)) return;
    const { username } = req.body;
    if (!username) return res.status(400).json({ message: 'Username is required' });

    const { data: pendingUser, error: fetchError } = await supabase
      .from('pending_users').select('*').eq('username', username).single();
    if (fetchError || !pendingUser) return res.status(404).json({ message: 'Pending user not found' });

    const { data: existing } = await supabase
      .from('users').select('username').eq('username', username).maybeSingle();
    if (existing) return res.status(409).json({ message: 'User already exists' });

    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: pendingUser.email,
      password: pendingUser.password,
      email_confirm: true,
    });
    if (authError) return res.status(500).json({ message: 'Failed to create auth user: ' + authError.message });

    const { error: insertError } = await supabase.from('users').insert({
      username: pendingUser.username,
      first_name: pendingUser.first_name,
      last_name: pendingUser.last_name,
      email: pendingUser.email,
      password: pendingUser.password,
      role: 'user',
      auth_id: authData.user.id,
    });
    if (insertError) return res.status(500).json({ message: 'Failed to create user profile' });

    await supabase.from('pending_users').delete().eq('username', username);
    return res.json({ message: `User "${username}" approved successfully` });
  }

  // POST /api/users?action=reject
  if (req.method === 'POST' && action === 'reject') {
    if (!await requireAdmin(req, res)) return;
    const { username } = req.body;
    if (!username) return res.status(400).json({ message: 'Username is required' });

    const { error, count } = await supabase
      .from('pending_users').delete({ count: 'exact' }).eq('username', username);
    if (error) return res.status(500).json({ message: 'Failed to reject user' });
    if (count === 0) return res.status(404).json({ message: 'Pending user not found' });
    return res.json({ message: `User "${username}" rejected successfully` });
  }

  // POST /api/users?action=delete
  if (req.method === 'POST' && action === 'delete') {
    if (!await requireAdmin(req, res)) return;
    const { username } = req.body;
    if (!username) return res.status(400).json({ message: 'Username is required' });

    const { error, count } = await supabase
      .from('users').delete({ count: 'exact' }).eq('username', username);
    if (error) return res.status(500).json({ message: 'Failed to delete user' });
    if (count === 0) return res.status(404).json({ message: `User '${username}' not found.` });
    return res.json({ message: `User '${username}' deleted successfully.` });
  }

  // POST /api/users?action=add
  if (req.method === 'POST' && action === 'add') {
    if (!await requireAdmin(req, res)) return;
    const { firstName, lastName, email, username, password } = req.body;
    if (!username || !password) return res.status(400).json({ message: 'Username and password required' });

    const { data: existing } = await supabase
      .from('users').select('username').eq('username', username).maybeSingle();
    if (existing) return res.status(409).json({ message: 'Username already exists' });

    const hashedPassword = bcrypt.hashSync(password, 10);
    const { error } = await supabase.from('users').insert({
      username,
      first_name: firstName || null,
      last_name: lastName || null,
      email: email || null,
      password: hashedPassword,
      role: 'user',
    });
    if (error) return res.status(500).json({ message: 'Failed to add user' });
    return res.json({ message: 'User added successfully' });
  }

  // POST /api/users?action=clear-pending
  if (req.method === 'POST' && action === 'clear-pending') {
    if (!await requireAdmin(req, res)) return;
    const { error } = await supabase.from('pending_users').delete().neq('username', '');
    if (error) return res.status(500).json({ message: 'Failed to clear pending requests' });
    return res.json({ message: 'All pending requests cleared' });
  }

  return res.status(400).json({ message: 'Invalid action' });
};
