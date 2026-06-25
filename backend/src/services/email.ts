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

export const sendAccountActivatedEmail = async (to: string) => {
  const subject = 'Your KickPredict Account is Now Active! ⚽';
  const text = `Great news!\n\nYour KickPredict account has been successfully activated by an administrator.\n\nYou can now log in and start making your predictions.`;
  const html = `
    <div style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; padding: 40px 20px; max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 24px rgba(0, 0, 0, 0.05); border: 1px solid #f1f5f9;">
      <div style="text-align: center; margin-bottom: 30px;">
        <div style="background: linear-gradient(135deg, #3b82f6, #1d4ed8); width: 80px; height: 80px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 20px; box-shadow: 0 8px 16px rgba(59, 130, 246, 0.3);">
          <span style="font-size: 40px; line-height: 80px;">⚽</span>
        </div>
        <h2 style="color: #0f172a; font-size: 28px; margin: 0; font-weight: 800; letter-spacing: -0.5px;">Account Activated!</h2>
      </div>
      
      <p style="color: #475569; font-size: 16px; line-height: 1.6; text-align: center; margin-bottom: 30px;">
        Great news! Your KickPredict account has been reviewed and <strong style="color: #10b981;">successfully activated</strong> by our admin team. You're all set to join the action.
      </p>
      
      <div style="text-align: center; margin-bottom: 35px;">
        <a href="https://kickpredict.com/login" style="display: inline-block; background: linear-gradient(to right, #2563eb, #1d4ed8); color: #ffffff; text-decoration: none; padding: 14px 32px; font-size: 16px; font-weight: 600; border-radius: 8px; box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3); font-family: inherit;">
          Log In Now
        </a>
      </div>
      
      <div style="border-top: 1px solid #e2e8f0; padding-top: 20px; text-align: center;">
        <p style="color: #64748b; font-size: 14px; margin: 0 0 10px 0;">Get ready to make your predictions and climb the leaderboard.</p>
        <p style="color: #94a3b8; font-size: 12px; margin: 0;">© ${new Date().getFullYear()} KickPredict. All rights reserved.</p>
      </div>
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

      console.log(\`[Email] Activation email sent to \${to}\`);
      
      if (info.messageId && nodemailer.getTestMessageUrl(info)) {
        console.log(\`[Email] 📧 Preview mock email here: \${nodemailer.getTestMessageUrl(info)}\`);
      }
    } else {
      console.warn('[Email Warning] Email service not initialized. Cannot send activation email.');
    }
  } catch (error) {
    console.error('[Email Error] Failed to send activation email:', error);
  }
};
