const express = require('express');
const router = express.Router();
const { sendMail } = require('../controllers/mailController');

// POST /api/mail/send
router.post('/send', sendMail);

module.exports = router;
