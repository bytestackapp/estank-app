const { getSupabase } = require('../lib/supabase');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { access_token, new_password } = req.body;
  if (!access_token || !new_password) {
    return res.json({ success: false, message: 'Missing required fields.' });
  }

  if (new_password.length < 6) {
    return res.json({ success: false, message: 'Password must be at least 6 characters.' });
  }

  const supabase = getSupabase();

  // Get the user from the access token
  const { data: { user }, error: userError } = await supabase.auth.getUser(access_token);

  if (userError || !user) {
    return res.json({ success: false, message: 'Invalid or expired reset link. Please request a new one.' });
  }

  // Update the password using admin
  const { error } = await supabase.auth.admin.updateUserById(user.id, {
    password: new_password
  });

  if (error) {
    console.error('Password reset error:', error);
    return res.json({ success: false, message: 'Failed to reset password. Please try again.' });
  }

  return res.json({ success: true, message: 'Password reset successfully.' });
};
