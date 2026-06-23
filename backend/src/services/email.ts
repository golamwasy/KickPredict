import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import https from 'https';
dotenv.config();

let transporter: nodemailer.Transporter;
let isResendApi = false;

// Initialize the email transporter
const initTransporter = async () => {
  if (process.env.SMTP_HOST === 'smtp.resend.com') {
    isResendApi = true;
    console.log('[Email] Configured to use Resend HTTPS REST API (Port 443)');
    return;
  }

  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    // Use real SMTP provider
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_PORT === '465',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
      connectionTimeout: 5000,
      greetingTimeout: 5000,
      socketTimeout: 10000,
    });
    console.log('[Email] Connected to real SMTP server');
  } else {
    // Use Ethereal fake email for development
    try {
      const testAccount = await nodemailer.createTestAccount();
      transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass,
        },
        connectionTimeout: 5000,
        greetingTimeout: 5000,
        socketTimeout: 10000,
      });
      console.log('[Email] Warning: No SMTP config found. Using Ethereal mock email service.');
    } catch (err) {
      console.error('[Email Error] Failed to create Ethereal test account:', err);
    }
  }
};

initTransporter();

// Helper to send emails using Resend's HTTPS REST API (Port 443 - open on Render free tier)
const sendResendHttpEmail = (to: string, subject: string, text: string, html: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    const apiKey = process.env.SMTP_PASS;
    const fromEmail = process.env.SMTP_FROM || 'KickPredict <onboarding@resend.dev>';

    const data = JSON.stringify({
      from: fromEmail,
      to: [to],
      subject: subject,
      text: text,
      html: html,
    });

    const options = {
      hostname: 'api.resend.com',
      port: 443,
      path: '/emails',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'Content-Length': Buffer.byteLength(data),
      },
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
          console.log(`[Email] Resend HTTPS API success: ${body}`);
          resolve();
        } else {
          console.error(`[Email Error] Resend HTTPS API failed: Code ${res.statusCode}, Response: ${body}`);
          reject(new Error(`Resend HTTPS API failed with status ${res.statusCode}: ${body}`));
        }
      });
    });

    req.on('error', (err) => {
      console.error('[Email Error] Resend HTTPS request error:', err);
      reject(err);
    });

    req.write(data);
    req.end();
  });
};

export const sendVerificationEmail = async (to: string, code: string) => {
  // Always log the code first so it's retrievable from stdout logs regardless of delivery status
  console.log(`[Email] =======================================`);
  console.log(`[Email] VERIFICATION CODE FOR ${to} IS: ${code}`);
  console.log(`[Email] =======================================`);

  const subject = 'Your KickPredict Verification Code';
  const text = `Welcome to KickPredict!\n\nYour 6-digit verification code is: ${code}\n\nThis code will expire in 15 minutes.`;
  const html = `
    <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 10px;">
      <h2 style="color: #2563eb;">Welcome to KickPredict! ⚽</h2>
      <p>Thank you for signing up. Please use the verification code below to activate your account:</p>
      <div style="background-color: #f3f4f6; padding: 15px; text-align: center; font-size: 24px; letter-spacing: 5px; font-weight: bold; border-radius: 8px; margin: 20px 0;">
        ${code}
      </div>
      <p style="color: #6b7280; font-size: 14px;">This code will expire in 15 minutes.</p>
    </div>
  `;

  try {
    if (isResendApi) {
      await sendResendHttpEmail(to, subject, text, html);
    } else if (transporter) {
      const info = await transporter.sendMail({
        from: process.env.SMTP_FROM || '"KickPredict Support" <noreply@kickpredict.com>',
        to,
        subject,
        text,
        html,
      });

      console.log(`[Email] Verification email sent to ${to}`);
      
      // Output test inbox preview link for Ethereal service
      if (info.messageId && nodemailer.getTestMessageUrl(info)) {
        console.log(`[Email] 📧 Preview mock email here: ${nodemailer.getTestMessageUrl(info)}`);
      }
    } else {
      console.warn('[Email Warning] Email service not initialized. Code was output to console only.');
    }
  } catch (error) {
    console.error('[Email Error] Failed to send email:', error);
  }
};
