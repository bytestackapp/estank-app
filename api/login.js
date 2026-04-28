const { getSupabase, setTokenCookie } = require('../lib/supabase');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { username, password } = req.body;
  if (!username || !password) {
    return res.json({ success: false, message: 'Username and password are required.' });
  }

  const supabase = getSupabase();

  // Look up user profile
  const { data: profile } = await supabase
    .from('users')
    .select('email, role, plan, trial_expires_at')
    .eq('username', username)
    .single();

  if (!profile) {
    return res.json({ success: false, message: 'Invalid username or password.' });
  }

  // Check if trial has expired BEFORE allowing login
  if (profile.plan === 'trial' && profile.trial_expires_at) {
    const expired = new Date(profile.trial_expires_at) < new Date();
    if (expired) {
      return res.json({
        success: false,
        message: 'Your free trial has expired. Please upgrade to a paid plan to continue.',
        trialExpired: true
      });
    }
  }

  // Sign in with Supabase Auth
  const { data, error } = await supabase.auth.signInWithPassword({
    email: profile.email,
    password,
  });

  if (error || !data.session) {
    return res.json({ success: false, message: 'Invalid username or password.' });
  }

  setTokenCookie(res, data.session.access_token);
  return res.json({ success: true, role: profile.role || 'user' });
};
