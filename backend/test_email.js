require('dotenv').config();
const nodemailer = require('nodemailer');
const dns = require('dns');

const EMAIL_USER = process.env.EMAIL_USER;
const EMAIL_PASS = process.env.EMAIL_PASS;

console.log('Testing email with manual pre-resolution...');

async function test() {
    try {
        console.log('Manually resolving smtp.gmail.com...');
        const address = await new Promise((resolve, reject) => {
            dns.lookup('smtp.gmail.com', (err, addr) => {
                if (err) reject(err);
                else resolve(addr);
            });
        });
        console.log('Resolved to:', address);

        const transporter = nodemailer.createTransport({
            host: address, // Use IP directly
            port: 465,
            secure: true,
            auth: {
                user: EMAIL_USER,
                pass: EMAIL_PASS,
            },
            connectionTimeout: 30000,
            greetingTimeout: 30000,
            socketTimeout: 30000,
            tls: {
                servername: 'smtp.gmail.com' // Force SNI to match the certificate
            }
        });

        console.log('Sending test email via resolved IP...');
        const info = await transporter.sendMail({
            from: EMAIL_USER,
            to: EMAIL_USER,
            subject: 'Test Email Verification (Pre-resolved)',
            text: `This is a test email to verify SMTP connectivity after manual pre-resolution to ${address}.`,
        });
        console.log('Success!', info.messageId);
    } catch (err) {
        console.error('Test failed:', err);
    }
}

test();
