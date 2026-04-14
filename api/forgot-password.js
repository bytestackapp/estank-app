const { getSupabase } = require('../lib/supabase');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { email } = req.body;
  if (!email) return res.json({ success: false, message: 'Email is required.' });

  const supabase = getSupabase();

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.SITE_URL || 'https://tank-estimator-app.vercel.app'}/reset-password`,
  });

  // Always return success to prevent email enumeration
  return res.json({ success: true, message: 'If that email exists, a reset link has been sent.' });
};
