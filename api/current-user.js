const { getSupabase, requireAuth } = require('../lib/supabase');

module.exports = async function handler(req, res) {
  const user = await requireAuth(req, res);
  if (!user) return;

  const supabase = getSupabase();
  const { data: profile } = await supabase
    .from('users')
    .select('username, first_name, last_name, email, role')
    .eq('auth_id', user.id)
    .single();

  if (profile) {
    return res.json({
      username: profile.username,
      firstName: profile.first_name || null,
      lastName: profile.last_name || null,
      email: profile.email || null,
      role: profile.role || 'user',
    });
  }

  return res.json({ username: null, role: null });
};
