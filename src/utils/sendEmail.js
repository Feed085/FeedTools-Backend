const nodemailer = require('nodemailer');

const sendEmail = async (options) => {
    // For development, if no email credentials are provided, we just log to console
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
        console.log('-----------------------------------------');
        console.log(`To: ${options.email}`);
        console.log(`Subject: ${options.subject}`);
        console.log(`Message: ${options.message}`);
        console.log('-----------------------------------------');
        return;
    }

    const transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST,
        port: process.env.EMAIL_PORT || 587,
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
        }
    });

    const message = {
        from: `${process.env.FROM_NAME || 'FeedTools'} <${process.env.FROM_EMAIL || 'no-reply@feedtools.com'}>`,
        to: options.email,
        subject: options.subject,
        text: options.message
    };

    const info = await transporter.sendMail(message);

    console.log('Message sent: %s', info.messageId);
};

module.exports = sendEmail;
