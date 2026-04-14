const { getSupabase } = require('../lib/supabase');
const { sendMail } = require('../lib/mailer');

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

  const { error } = await supabase.from('pending_users').insert({
    first_name: firstName,
    last_name: lastName,
    email,
    username,
    password,
  });

  if (error) {
    return res.json({ success: false, message: 'Failed to save signup request.' });
  }

  // Notify admin about new signup
  try {
    await sendMail({
      to: process.env.GMAIL_USER,
      subject: 'New signup request - Tank Estimator',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto;">
          <h2 style="color: #2d3748;">New Signup Request</h2>
          <p style="color: #4a5568;">A new user has requested access to Tank Estimator.</p>
          <table style="width:100%;border-collapse:collapse;margin:16px 0;">
            <tr><td style="padding:8px;color:#718096;width:120px;">Name</td><td style="padding:8px;color:#2d3748;font-weight:500;">${firstName} ${lastName}</td></tr>
            <tr style="background:#f7fafc;"><td style="padding:8px;color:#718096;">Username</td><td style="padding:8px;color:#2d3748;font-weight:500;">${username}</td></tr>
            <tr><td style="padding:8px;color:#718096;">Email</td><td style="padding:8px;color:#2d3748;font-weight:500;">${email}</td></tr>
          </table>
          <a href="https://tank-estimator-app.vercel.app/admin"
             style="display:inline-block;padding:12px 24px;background:#3182ce;color:#fff;text-decoration:none;border-radius:8px;font-weight:500;">
            Review in Admin Panel
          </a>
          <hr style="border:none;border-top:1px solid #e2e8f0;margin:20px 0;">
          <p style="color:#a0aec0;font-size:12px;">Bytestack — Tank Estimator App</p>
        </div>
      `,
    });
  } catch (err) {
    console.error('Admin notification error:', err);
  }

  return res.json({ success: true, message: 'Signup request submitted. Await admin approval.' });
};
