const bcrypt = require('bcryptjs');
const { getSupabase, setTokenCookie } = require('../lib/supabase');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { username, password } = req.body;
  if (!username || !password) {
    return res.json({ success: false, message: 'Username and password are required.' });
  }

  const supabase = getSupabase();
  const { data: user, error } = await supabase
    .from('users')
    .select('*')
    .eq('username', username)
    .single();

  if (error || !user) {
    return res.json({ success: false, message: 'Invalid username or password.' });
  }

  const match = bcrypt.compareSync(password, user.password);
  if (!match) {
    return res.json({ success: false, message: 'Invalid username or password.' });
  }

  setTokenCookie(res, { username: user.username, role: user.role || 'user' });
  return res.json({ success: true, role: user.role || 'user' });
};
