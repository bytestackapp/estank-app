const { getSupabase } = require('../lib/supabase');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { access_token, new_password } = req.body;
  if (!access_token || !new_password) {
    return res.json({ success: false, message: 'Missing required fields.' });
  }

  const supabase = getSupabase();

  const { error } = await supabase.auth.admin.updateUserById(
    access_token,
    { password: new_password }
  );

  if (error) {
    return res.json({ success: false, message: 'Failed to reset password.' });
  }

  return res.json({ success: true, message: 'Password reset successfully.' });
};
