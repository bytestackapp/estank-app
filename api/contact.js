const { sendMail } = require('../lib/mailer');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { name, email, message, company, users } = req.body;
  if (!message) return res.json({ success: false, message: 'Message is required.' });

  try {
    await sendMail({
      to: process.env.ADMIN_EMAIL || process.env.GMAIL_USER,
      subject: 'New Quote Request - Tank Estimator',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto;">
          <h2 style="color: #2d3748;">New Quote Request</h2>
          <table style="width:100%;border-collapse:collapse;margin:16px 0;">
            <tr><td style="padding:8px;color:#718096;width:120px;">Name</td><td style="padding:8px;color:#2d3748;font-weight:500;">${name || 'N/A'}</td></tr>
            <tr style="background:#f7fafc;"><td style="padding:8px;color:#718096;">Email</td><td style="padding:8px;color:#2d3748;font-weight:500;">${email || 'N/A'}</td></tr>
            <tr><td style="padding:8px;color:#718096;">Company</td><td style="padding:8px;color:#2d3748;font-weight:500;">${company || 'N/A'}</td></tr>
            <tr style="background:#f7fafc;"><td style="padding:8px;color:#718096;">Users</td><td style="padding:8px;color:#2d3748;font-weight:500;">${users || 'N/A'}</td></tr>
            <tr><td style="padding:8px;color:#718096;">Message</td><td style="padding:8px;color:#2d3748;font-weight:500;">${message}</td></tr>
          </table>
          <hr style="border:none;border-top:1px solid #e2e8f0;margin:20px 0;">
          <p style="color:#a0aec0;font-size:12px;">Bytestack — Tank Estimator App</p>
        </div>
      `,
    });
    return res.json({ success: true });
  } catch(e) {
    console.error('Contact email error:', e);
    return res.json({ success: false });
  }
};
