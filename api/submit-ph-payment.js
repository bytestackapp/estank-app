const { getSupabase } = require('../lib/supabase');
const { sendMail } = require('../lib/mailer');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { firstName, lastName, email, username, password, package: pkg, paymentMethod, paymentReference, paymentAmount } = req.body;

  if (!firstName || !lastName || !email || !username || !password || !pkg || !paymentMethod || !paymentReference) {
    return res.json({ success: false, message: 'All fields are required.' });
  }

  const supabase = getSupabase();

  // Check if already exists
  const { data: existingUser } = await supabase
    .from('users').select('email').eq('email', email).maybeSingle();
  if (existingUser) return res.json({ success: false, message: 'This email is already registered.' });

  const { data: existingPending } = await supabase
    .from('pending_users').select('email').eq('email', email).maybeSingle();
  if (existingPending) return res.json({ success: false, message: 'A request for this email is already pending.' });

  const methodLabels = { gcash: 'GCash', maya: 'Maya', bank: 'Bank Transfer' };
  const packageLabels = { monthly: 'Monthly Plan ($15/mo)', yearly: 'Yearly Basic ($120/yr)', premium: 'Yearly Premium ($180/yr)' };

  // Add to pending_users with payment info
  const { error } = await supabase.from('pending_users').insert({
    first_name:        firstName,
    last_name:         lastName,
    email,
    username,
    password,
    package:           pkg,
    payment_method:    paymentMethod,
    payment_reference: paymentReference,
    payment_amount:    paymentAmount,
    payment_status:    'unverified',
  });

  if (error) {
    console.error('Insert error:', error);
    return res.json({ success: false, message: 'Failed to submit payment. Please try again.' });
  }

  // Notify admin
  try {
    await sendMail({
      to: process.env.ADMIN_EMAIL || process.env.GMAIL_USER,
      subject: `New Payment Submission (${methodLabels[paymentMethod]}) - Tank Estimator`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;">
          <h2 style="color:#2d3748;">New Payment Submission</h2>
          <p style="color:#4a5568;">Please verify and approve this payment in your admin panel.</p>
          <table style="width:100%;border-collapse:collapse;margin:16px 0;">
            <tr><td style="padding:8px;color:#718096;width:140px;">Name</td><td style="padding:8px;color:#2d3748;font-weight:500;">${firstName} ${lastName}</td></tr>
            <tr style="background:#f7fafc;"><td style="padding:8px;color:#718096;">Email</td><td style="padding:8px;color:#2d3748;font-weight:500;">${email}</td></tr>
            <tr><td style="padding:8px;color:#718096;">Username</td><td style="padding:8px;color:#2d3748;font-weight:500;">${username}</td></tr>
            <tr style="background:#f7fafc;"><td style="padding:8px;color:#718096;">Package</td><td style="padding:8px;color:#2d3748;font-weight:500;">${packageLabels[pkg] || pkg}</td></tr>
            <tr><td style="padding:8px;color:#718096;">Payment</td><td style="padding:8px;color:#2d3748;font-weight:500;">${methodLabels[paymentMethod]}</td></tr>
            <tr style="background:#f7fafc;"><td style="padding:8px;color:#718096;">Reference #</td><td style="padding:8px;color:#2d3748;font-weight:500;">${paymentReference}</td></tr>
            <tr><td style="padding:8px;color:#718096;">Amount Sent</td><td style="padding:8px;color:#2d3748;font-weight:500;">₱${paymentAmount}</td></tr>
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
  } catch(e) { console.error('Admin email error:', e); }

  // Notify user
  try {
    await sendMail({
      to: email,
      subject: 'Payment Received — Tank Estimator',
      html: `
        <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;">
          <h2 style="color:#2d3748;">Payment Received!</h2>
          <p style="color:#4a5568;">Hi ${firstName}, we received your payment submission. We'll verify it and activate your account shortly.</p>
          <div style="background:#f7fafc;border-radius:8px;padding:16px;margin:16px 0;">
            <p style="margin:4px 0;color:#4a5568;"><strong>Package:</strong> ${packageLabels[pkg] || pkg}</p>
            <p style="margin:4px 0;color:#4a5568;"><strong>Payment Method:</strong> ${methodLabels[paymentMethod]}</p>
            <p style="margin:4px 0;color:#4a5568;"><strong>Reference #:</strong> ${paymentReference}</p>
            <p style="margin:4px 0;color:#e53e3e;font-size:13px;">⏳ Account activation usually takes 1-24 hours.</p>
          </div>
          <hr style="border:none;border-top:1px solid #e2e8f0;margin:20px 0;">
          <p style="color:#a0aec0;font-size:12px;">Bytestack — Tank Estimator App</p>
        </div>
      `,
    });
  } catch(e) { console.error('User email error:', e); }

  return res.json({ success: true, message: 'Payment submitted successfully!' });
};
