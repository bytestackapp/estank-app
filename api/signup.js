const { getSupabase } = require('../lib/supabase');
const { sendMail } = require('../lib/mailer');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const action = req.query.action;

  // GET /api/signup?action=check-availability
  if (req.method === 'POST' && action === 'check') {
    const { email, username } = req.body;
    const supabase = getSupabase();
    const [e1, e2, u1, u2] = await Promise.all([
      supabase.from('users').select('email').eq('email', email).maybeSingle(),
      supabase.from('pending_users').select('email').eq('email', email).maybeSingle(),
      supabase.from('users').select('username').eq('username', username).maybeSingle(),
      supabase.from('pending_users').select('username').eq('username', username).maybeSingle(),
    ]);
    return res.json({ emailTaken: !!(e1.data || e2.data), usernameTaken: !!(u1.data || u2.data) });
  }

  // POST /api/signup?action=contact (RFQ)
  if (action === 'contact') {
    const { name, email, message, company, users } = req.body;
    if (!message) return res.json({ success: false });
    try {
      await sendMail({
        to: process.env.ADMIN_EMAIL || process.env.GMAIL_USER,
        subject: 'New Quote Request - Tank Estimator',
        html: `<div style="font-family:Arial,sans-serif;max-width:480px;"><h2>New Quote Request</h2>
          <p><strong>Name:</strong> ${name||'N/A'}</p><p><strong>Email:</strong> ${email||'N/A'}</p>
          <p><strong>Company:</strong> ${company||'N/A'}</p><p><strong>Users:</strong> ${users||'N/A'}</p>
          <p><strong>Message:</strong> ${message}</p></div>`,
      });
    } catch(e) { console.error(e); }
    return res.json({ success: true });
  }

  // POST /api/signup (main signup)
  const { firstName, lastName, email, username, password } = req.body;
  if (!firstName || !lastName || !email || !username || !password) {
    return res.json({ success: false, message: 'All fields are required.' });
  }

  const supabase = getSupabase();

  const { data: existingUser } = await supabase
    .from('users').select('username, email')
    .or(`username.eq.${username},email.eq.${email}`).maybeSingle();
  if (existingUser) return res.json({ success: false, message: 'Username or email already exists.' });

  const { data: existingPending } = await supabase
    .from('pending_users').select('username, email')
    .or(`username.eq.${username},email.eq.${email}`).maybeSingle();
  if (existingPending) return res.json({ success: false, message: 'Your account application is either in process or already active.' });

  const { error } = await supabase.from('pending_users').insert({
    first_name: firstName, last_name: lastName, email, username, password,
  });
  if (error) return res.json({ success: false, message: 'Failed to save signup request.' });

  try {
    await sendMail({
      to: process.env.ADMIN_EMAIL || process.env.GMAIL_USER,
      subject: 'New signup request - Tank Estimator',
      html: `<div style="font-family:Arial,sans-serif;max-width:480px;"><h2>New Signup Request</h2>
        <p><strong>Name:</strong> ${firstName} ${lastName}</p>
        <p><strong>Username:</strong> ${username}</p><p><strong>Email:</strong> ${email}</p>
        <a href="https://tank-estimator-app.vercel.app/admin" style="display:inline-block;padding:12px 24px;background:#3182ce;color:#fff;text-decoration:none;border-radius:8px;">Review in Admin Panel</a></div>`,
    });
  } catch(e) { console.error(e); }

  return res.json({ success: true, message: 'Signup request submitted. Await admin approval.' });
};
