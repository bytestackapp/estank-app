const { getSupabase } = require('../lib/supabase');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { firstName, lastName, email, username, password } = req.body;
  if (!firstName || !lastName || !email || !username || !password) {
    return res.json({ success: false, message: 'All fields are required.' });
  }

  const supabase = getSupabase();

  // Check active users
  const { data: existingUser } = await supabase
    .from('users')
    .select('username, email')
    .or(`username.eq.${username},email.eq.${email}`)
    .maybeSingle();

  if (existingUser) {
    return res.json({ success: false, message: 'Username or email already exists.' });
  }

  // Check pending users
  const { data: existingPending } = await supabase
    .from('pending_users')
    .select('username, email')
    .or(`username.eq.${username},email.eq.${email}`)
    .maybeSingle();

  if (existingPending) {
    return res.json({ success: false, message: 'Your account application is either in process or already active.' });
  }

  // Store in pending (no password hashing needed, Supabase Auth handles it)
  const { error } = await supabase.from('pending_users').insert({
    first_name: firstName,
    last_name: lastName,
    email,
    username,
    password, // stored temporarily, used when admin approves
  });

  if (error) {
    return res.json({ success: false, message: 'Failed to save signup request.' });
  }

  return res.json({ success: true, message: 'Signup request submitted. Await admin approval.' });
};
