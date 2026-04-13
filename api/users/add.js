const bcrypt = require('bcryptjs');
const { getSupabase, requireAdmin } = require('../../lib/supabase');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  if (!requireAdmin(req, res)) return;

  const { firstName, lastName, email, username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ message: 'Username and password required' });
  }

  const supabase = getSupabase();
  const { data: existing } = await supabase
    .from('users')
    .select('username')
    .eq('username', username)
    .maybeSingle();

  if (existing) {
    return res.status(409).json({ message: 'Username already exists' });
  }

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
};
