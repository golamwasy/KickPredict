import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
dotenv.config();

let transporter: nodemailer.Transporter;

// Initialize the email transporter
const initTransporter = async () => {
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    // Use real SMTP provider (e.g. Gmail)
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_PORT === '465', // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
      connectionTimeout: 5000, // 5 seconds connection timeout
      greetingTimeout: 5000,   // 5 seconds greeting timeout
      socketTimeout: 10000,    // 10 seconds socket activity timeout
    });
    console.log('[Email] Connected to real SMTP server');
  } else {
    // Use Ethereal fake email for development
    const testAccount = await nodemailer.createTestAccount();
    transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
      connectionTimeout: 5000, // 5 seconds
      greetingTimeout: 5000,
      socketTimeout: 10000,
    });
    console.log('[Email] Warning: No SMTP config found. Using Ethereal mock email service.');
  }
};

initTransporter();

export const sendVerificationEmail = async (to: string, code: string) => {
  try {
    // Print the code directly to backend console logs so developers can see it in Render/Dev logs easily
    console.log(`[Email] =======================================`);
    console.log(`[Email] VERIFICATION CODE FOR ${to} IS: ${code}`);
    console.log(`[Email] =======================================`);

    const info = await transporter.sendMail({
      from: process.env.SMTP_FROM || '"KickPredict Support" <noreply@kickpredict.com>',
      to,
      subject: 'Your KickPredict Verification Code',
      text: `Welcome to KickPredict!\n\nYour 6-digit verification code is: ${code}\n\nThis code will expire in 15 minutes.`,
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 10px;">
          <h2 style="color: #2563eb;">Welcome to KickPredict! ⚽</h2>
          <p>Thank you for signing up. Please use the verification code below to activate your account:</p>
          <div style="background-color: #f3f4f6; padding: 15px; text-align: center; font-size: 24px; letter-spacing: 5px; font-weight: bold; border-radius: 8px; margin: 20px 0;">
            ${code}
          </div>
          <p style="color: #6b7280; font-size: 14px;">This code will expire in 15 minutes.</p>
        </div>
      `,
    });

    console.log(`[Email] Verification email sent to ${to}`);
    
    // If using ethereal, output the preview URL so the dev can see the email
    if (info.messageId && nodemailer.getTestMessageUrl(info)) {
      console.log(`[Email] 📧 Preview the email here: ${nodemailer.getTestMessageUrl(info)}`);
    }

  } catch (error) {
    console.error('[Email Error] Failed to send email:', error);
  }
};
