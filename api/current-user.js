const { getSupabase, getSessionUser } = require('../lib/supabase');

module.exports = async function handler(req, res) {
  const session = getSessionUser(req);
  if (!session) {
    return res.json({ username: null, role: null });
  }

  const supabase = getSupabase();
  const { data: user } = await supabase
    .from('users')
    .select('username, first_name, last_name, email, role')
    .eq('username', session.username)
    .single();

  if (user) {
    return res.json({
      username: user.username,
      firstName: user.first_name || null,
      lastName: user.last_name || null,
      email: user.email || null,
      role: user.role || 'user',
    });
  }

  return res.json({ username: session.username, role: session.role || 'user' });
};
