const bcrypt = require('bcryptjs');
const { getSupabase, requireAdmin } = require('../lib/supabase');
const { sendMail } = require('../lib/mailer');

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

    // Send welcome email to approved user
    try {
      await sendMail({
        to: pendingUser.email,
        subject: 'Your Tank Estimator account has been approved!',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto;">
            <h2 style="color: #2d3748;">Welcome to Tank Estimator!</h2>
            <p style="color: #4a5568;">Hi ${pendingUser.first_name}, your account has been approved. You can now log in!</p>
            <table style="width:100%;border-collapse:collapse;margin:16px 0;">
              <tr><td style="padding:8px;color:#718096;width:120px;">Username</td><td style="padding:8px;color:#2d3748;font-weight:500;">${pendingUser.username}</td></tr>
            </table>
            <a href="https://tank-estimator-app.vercel.app/login"
               style="display:inline-block;padding:12px 24px;background:#38a169;color:#fff;text-decoration:none;border-radius:8px;font-weight:500;">
              Log In Now
            </a>
            <hr style="border:none;border-top:1px solid #e2e8f0;margin:20px 0;">
            <p style="color:#a0aec0;font-size:12px;">Bytestack — Tank Estimator App</p>
          </div>
        `,
      });
    } catch (err) {
      console.error('Welcome email error:', err);
    }

    return res.json({ message: `User "${username}" approved successfully` });
  }

  // POST /api/users?action=reject
  if (req.method === 'POST' && action === 'reject') {
    if (!await requireAdmin(req, res)) return;
    const { username } = req.body;
    if (!username) return res.status(400).json({ message: 'Username is required' });

    const { data: pendingUser } = await supabase
      .from('pending_users').select('email, first_name').eq('username', username).single();

    const { error, count } = await supabase
      .from('pending_users').delete({ count: 'exact' }).eq('username', username);
    if (error) return res.status(500).json({ message: 'Failed to reject user' });
    if (count === 0) return res.status(404).json({ message: 'Pending user not found' });

    // Notify rejected user
    if (pendingUser) {
      try {
        await sendMail({
          to: pendingUser.email,
          subject: 'Update on your Tank Estimator account request',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto;">
              <h2 style="color: #2d3748;">Account Request Update</h2>
              <p style="color: #4a5568;">Hi ${pendingUser.first_name}, unfortunately your account request was not approved at this time.</p>
              <p style="color: #4a5568;">If you think this is a mistake, please contact the administrator.</p>
              <hr style="border:none;border-top:1px solid #e2e8f0;margin:20px 0;">
              <p style="color:#a0aec0;font-size:12px;">Bytestack — Tank Estimator App</p>
            </div>
          `,
        });
      } catch (err) {
        console.error('Rejection email error:', err);
      }
    }

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
