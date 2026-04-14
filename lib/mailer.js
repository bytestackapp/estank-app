const nodemailer = require('nodemailer');

function getTransporter() {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  });
}

async function sendMail({ to, subject, html }) {
  const transporter = getTransporter();
  await transporter.sendMail({
    from: `"Bytestack" <${process.env.GMAIL_USER}>`,
    to,
    subject,
    html,
  });
}

module.exports = { sendMail };
