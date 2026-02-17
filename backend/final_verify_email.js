require('dotenv').config();
const { sendMailInternal } = require('./controllers/mailController');

const EMAIL_USER = process.env.EMAIL_USER;

async function finalTest() {
    console.log('Final Verification: Testing sendMailInternal with the new fix...');
    try {
        const info = await sendMailInternal({
            to: EMAIL_USER,
            subject: 'Final Verification - Email Fix',
            text: 'This email confirms that the mailController.js fix (manual DNS resolution) is working correctly.'
        });
        console.log('Verification Successful!', info.messageId);
    } catch (err) {
        console.error('Verification Failed:', err);
    }
}

finalTest();
