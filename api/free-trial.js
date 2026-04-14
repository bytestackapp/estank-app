const { getSupabase } = require('../lib/supabase');
const { sendMail } = require('../lib/mailer');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { firstName, lastName, email } = req.body;
  if (!firstName || !lastName || !email) {
    return res.json({ success: false, message: 'All fields are required.' });
  }

  const supabase = getSupabase();

  // Check if email already used for free trial
  const { data: existingTrial } = await supabase
    .from('trial_emails')
    .select('email')
    .eq('email', email.toLowerCase())
    .maybeSingle();

  if (existingTrial) {
    return res.json({ success: false, message: 'A free trial has already been used for this email address.' });
  }

  // Check if email already exists in users table
  const { data: existingUser } = await supabase
    .from('users')
    .select('email')
    .eq('email', email.toLowerCase())
    .maybeSingle();

  if (existingUser) {
    return res.json({ success: false, message: 'This email is already registered. Please log in.' });
  }

  // Generate freeuser ID
  const { data: seqData } = await supabase.rpc('nextval', { seq: 'freeuser_seq' }).single();
  const username = `freeuser_${seqData || Date.now()}`;
  const password = 'Trial@1234';
  const trialExpiry = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000); // 3 days

  // Create Supabase Auth user
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email: email.toLowerCase(),
    password,
    email_confirm: true,
  });

  if (authError) {
    return res.json({ success: false, message: 'Failed to create trial account. Please try again.' });
  }

  // Insert into users table
  const { error: insertError } = await supabase.from('users').insert({
    username,
    first_name: firstName,
    last_name: lastName,
    email: email.toLowerCase(),
    password,
    role: 'user',
    plan: 'trial',
    trial_expires_at: trialExpiry.toISOString(),
    auth_id: authData.user.id,
  });

  if (insertError) {
    await supabase.auth.admin.deleteUser(authData.user.id);
    return res.json({ success: false, message: 'Failed to create trial account.' });
  }

  // Record email to prevent spam
  await supabase.from('trial_emails').insert({ email: email.toLowerCase() });

  // Send credentials email
  try {
    await sendMail({
      to: email,
      subject: 'Your Tank Estimator Free Trial is Ready!',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto;">
          <h2 style="color: #2d3748;">Welcome to Tank Estimator!</h2>
          <p style="color: #4a5568;">Hi ${firstName}, your 3-day free trial is ready. Here are your login credentials:</p>
          <div style="background:#f7fafc;border-radius:8px;padding:16px;margin:16px 0;">
            <p style="margin:4px 0;color:#4a5568;"><strong>Username:</strong> ${username}</p>
            <p style="margin:4px 0;color:#4a5568;"><strong>Password:</strong> ${password}</p>
            <p style="margin:4px 0;color:#e53e3e;font-size:13px;">Trial expires: ${trialExpiry.toDateString()}</p>
          </div>
          <a href="https://tank-estimator-app.vercel.app/login"
             style="display:inline-block;padding:12px 24px;background:#3182ce;color:#fff;text-decoration:none;border-radius:8px;font-weight:500;">
            Start Using Tank Estimator
          </a>
          <p style="color:#718096;font-size:13px;margin-top:16px;">To unlock all features, upgrade to a paid plan anytime.</p>
          <hr style="border:none;border-top:1px solid #e2e8f0;margin:20px 0;">
          <p style="color:#a0aec0;font-size:12px;">Bytestack — Tank Estimator App</p>
        </div>
      `,
    });
  } catch (err) {
    console.error('Trial email error:', err);
  }

  // Notify admin
  try {
    await sendMail({
      to: process.env.ADMIN_EMAIL || process.env.GMAIL_USER,
      subject: 'New free trial signup - Tank Estimator',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto;">
          <h2 style="color: #2d3748;">New Free Trial Signup</h2>
          <p><strong>Name:</strong> ${firstName} ${lastName}</p>
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Username:</strong> ${username}</p>
          <p><strong>Expires:</strong> ${trialExpiry.toDateString()}</p>
        </div>
      `,
    });
  } catch (err) {
    console.error('Admin trial notification error:', err);
  }

  return res.json({ 
    success: true, 
    message: `Trial account created! Check your email (${email}) for your login credentials.`
  });
};
