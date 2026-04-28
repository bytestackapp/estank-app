const { getSupabase } = require('../lib/supabase');
const { sendMail } = require('../lib/mailer');

const PAYPAL_CLIENT_ID     = process.env.PAYPAL_CLIENT_ID;
const PAYPAL_CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET;
const PAYPAL_BASE = process.env.PAYPAL_ENV === 'live'
  ? 'https://api-m.paypal.com'
  : 'https://api-m.sandbox.paypal.com';

async function getAccessToken() {
  const credentials = Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_CLIENT_SECRET}`).toString('base64');
  const res = await fetch(`${PAYPAL_BASE}/v1/oauth2/token`, {
    method: 'POST',
    headers: { 'Authorization': `Basic ${credentials}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'grant_type=client_credentials'
  });
  const data = await res.json();
  if (!data.access_token) throw new Error('Failed to get PayPal access token');
  return data.access_token;
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { orderId, token, userData } = req.body || {};
  const idToCapture = orderId || token;

  if (!idToCapture) return res.status(400).json({ error: 'No order ID provided' });

  try {
    const accessToken = await getAccessToken();

    // Capture the PayPal order
    const captureRes = await fetch(`${PAYPAL_BASE}/v2/checkout/orders/${idToCapture}/capture`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' }
    });
    const capture = await captureRes.json();

    if (capture.status !== 'COMPLETED') {
      return res.status(200).json({ verified: false, error: `Payment status: ${capture.status}` });
    }

    const unit          = capture.purchase_units?.[0];
    const captureDetail = unit?.payments?.captures?.[0];
    const transactionId = captureDetail?.id || idToCapture;
    const amount        = captureDetail?.amount?.value || '';

    // If userData provided, auto-approve the account
    if (userData) {
      const supabase = getSupabase();
      const { firstName, lastName, email, username, password, package: pkg } = userData;

      // Create Supabase Auth user
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });

      if (!authError && authData?.user) {
        // Insert into users table
        await supabase.from('users').insert({
          username,
          first_name: firstName,
          last_name:  lastName,
          email,
          password,
          role:       'user',
          plan:       'paid',
          auth_id:    authData.user.id,
        });

        // Send welcome email to user
        const packageLabels = { monthly: 'Monthly Plan', yearly: 'Yearly Basic', premium: 'Yearly Premium' };
        try {
          await sendMail({
            to: email,
            subject: '🎉 Your Tank Estimator Account is Active!',
            html: `
              <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;">
                <h2 style="color:#2d3748;">Welcome to Tank Estimator!</h2>
                <p style="color:#4a5568;">Hi ${firstName}, your payment was confirmed and your account is now active!</p>
                <div style="background:#f0fff4;border-radius:8px;padding:16px;margin:16px 0;">
                  <p style="margin:4px 0;color:#276749;"><strong>Username:</strong> ${username}</p>
                  <p style="margin:4px 0;color:#276749;"><strong>Plan:</strong> ${packageLabels[pkg] || pkg}</p>
                  <p style="margin:4px 0;color:#276749;"><strong>Transaction ID:</strong> ${transactionId}</p>
                </div>
                <a href="https://tank-estimator-app.vercel.app/login"
                   style="display:inline-block;padding:12px 24px;background:#38a169;color:#fff;text-decoration:none;border-radius:8px;font-weight:500;">
                  Log In Now
                </a>
                <hr style="border:none;border-top:1px solid #e2e8f0;margin:20px 0;">
                <p style="color:#a0aec0;font-size:12px;">Bytestack — Tank Estimator App</p>
              </div>
            `,
          });
        } catch(e) { console.error('Welcome email error:', e); }

        // Notify admin
        try {
          await sendMail({
            to: process.env.ADMIN_EMAIL || process.env.GMAIL_USER,
            subject: `New PayPal Payment — ${username} (Auto-Approved)`,
            html: `<div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;">
              <h2>New PayPal Payment (Auto-Approved)</h2>
              <p><strong>Name:</strong> ${firstName} ${lastName}</p>
              <p><strong>Email:</strong> ${email}</p>
              <p><strong>Username:</strong> ${username}</p>
              <p><strong>Package:</strong> ${packageLabels[pkg] || pkg}</p>
              <p><strong>Amount:</strong> $${amount}</p>
              <p><strong>Transaction ID:</strong> ${transactionId}</p>
            </div>`,
          });
        } catch(e) { console.error('Admin email error:', e); }
      }
    }

    return res.status(200).json({ verified: true, transactionId, amount, status: capture.status });

  } catch(err) {
    console.error('[PayPal] verify-payment error:', err.message);
    return res.status(500).json({ error: err.message, verified: false });
  }
};
