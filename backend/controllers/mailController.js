const nodemailer = require('nodemailer');
const dns = require('dns');

const EMAIL_USER = process.env.EMAIL_USER;
const EMAIL_PASS = process.env.EMAIL_PASS;

if (!EMAIL_USER || !EMAIL_PASS) {
  console.warn('EMAIL_USER or EMAIL_PASS not set in env; mail may fail');
}

// Function to create transporter with optional resolved IP
async function getTransporter() {
  let host = 'smtp.gmail.com';
  try {
    // Attempt manual resolution to bypass Node.js internal queryA timeouts
    const address = await new Promise((resolve, reject) => {
      dns.lookup('smtp.gmail.com', { family: 4 }, (err, addr) => {
        if (err) reject(err);
        else resolve(addr);
      });
    });
    host = address;
    console.log(`Mail: smtp.gmail.com resolved to ${host}`);
  } catch (err) {
    console.warn('Mail: DNS resolution failed, falling back to hostname:', err.message);
  }

  return nodemailer.createTransport({
    host: host,
    port: 465,
    secure: true,
    auth: {
      user: EMAIL_USER,
      pass: EMAIL_PASS,
    },
    connectionTimeout: 30000,
    greetingTimeout: 30000,
    socketTimeout: 30000,
    dnsTimeout: 30000,
    tls: {
      servername: 'smtp.gmail.com' // Crucial for certificate validation when using IP
    }
  });
}

async function sendMail(req, res) {
  try {
    const { to, subject, text, html } = req.body;
    if (!to || !subject || (!text && !html)) {
      return res.status(400).json({ message: 'Requière: to, subject et text ou html' });
    }

    const transporter = await getTransporter();
    const info = await transporter.sendMail({
      from: EMAIL_USER,
      to,
      subject,
      text: text || undefined,
      html: html || undefined,
    });

    return res.status(200).json({ message: 'Email envoyé', info });
  } catch (err) {
    console.error('sendMail error', err);
    return res.status(500).json({ message: 'Erreur lors de l envoi du mail', error: err.message });
  }
}

async function sendMailInternal({ to, subject, text, html }) {
  if (!to || !subject || (!text && !html)) {
    throw new Error('Requière: to, subject et text ou html');
  }

  const transporter = await getTransporter();
  const info = await transporter.sendMail({
    from: EMAIL_USER,
    to,
    subject,
    text: text || undefined,
    html: html || undefined,
  });

  return info;
}

module.exports = { sendMail, sendMailInternal };
