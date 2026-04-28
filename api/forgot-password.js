const { getSupabase } = require('../lib/supabase');
const { sendMail } = require('../lib/mailer');
module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const { email } = req.body;
  if (!email) return res.json({ success: false, message: 'Email is required.' });
  const supabase = getSupabase();
  const siteUrl = process.env.SITE_URL || 'https://tank-estimator-app.vercel.app';
  const { data, error } = await supabase.auth.admin.generateLink({
    type: 'recovery', email,
    options: { redirectTo: `${siteUrl}/reset-password` }
  });
  if (error || !data?.properties?.action_link) {
    return res.json({ success: true, message: 'If that email exists, a reset link has been sent.' });
  }
  const resetLink = data.properties.action_link;
  try {
    await sendMail({
      to: email,
      subject: 'Reset your Tank Estimator password',
      html: `<div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;">
        <h2 style="color:#2d3748;">Reset your password</h2>
        <p style="color:#4a5568;">Click the button below to reset your Tank Estimator password. This link expires in 1 hour.</p>
        <a href="${resetLink}" style="display:inline-block;margin:20px 0;padding:12px 24px;background:#3182ce;color:#fff;text-decoration:none;border-radius:8px;font-weight:500;">Reset Password</a>
        <p style="color:#718096;font-size:13px;">If you didn't request this, you can safely ignore this email.</p>
        <hr style="border:none;border-top:1px solid #e2e8f0;margin:20px 0;">
        <p style="color:#a0aec0;font-size:12px;">Bytestack — Tank Estimator App</p>
      </div>`,
    });
  } catch(e) { console.error('Email send error:', e); }
  return res.json({ success: true, message: 'If that email exists, a reset link has been sent.' });
};
