const { getSupabase } = require('../lib/supabase');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { email, username } = req.body;
  const supabase = getSupabase();

  const [emailCheck, usernameCheck, pendingEmailCheck, pendingUsernameCheck] = await Promise.all([
    supabase.from('users').select('email').eq('email', email).maybeSingle(),
    supabase.from('users').select('username').eq('username', username).maybeSingle(),
    supabase.from('pending_users').select('email').eq('email', email).maybeSingle(),
    supabase.from('pending_users').select('username').eq('username', username).maybeSingle(),
  ]);

  return res.json({
    emailTaken: !!(emailCheck.data || pendingEmailCheck.data),
    usernameTaken: !!(usernameCheck.data || pendingUsernameCheck.data),
  });
};
