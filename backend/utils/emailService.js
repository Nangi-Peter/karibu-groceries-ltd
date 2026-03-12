// ========================================
// EMAIL SERVICE
// Handles sending emails for password reset, notifications, etc.
// ========================================

const nodemailer = require('nodemailer');

// For development - use ethereal.email (fake email service)
const createTestTransporter = async () => {
  const testAccount = await nodemailer.createTestAccount();
  return nodemailer.createTransport({
    host: 'smtp.ethereal.email',
    port: 587,
    secure: false,
    auth: {
      user: testAccount.user,
      pass: testAccount.pass,
    },
  });
};

// For production - use actual email service
const createProductionTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    secure: process.env.EMAIL_PORT === '465',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
};

/**
 * Send email
 * @param {Object} options - Email options
 * @param {string} options.email - Recipient email
 * @param {string} options.subject - Email subject
 * @param {string} options.message - Email message (text)
 * @param {string} options.html - Email HTML (optional)
 */
exports.sendEmail = async (options) => {
  try {
    // Use test transporter in development, production in production
    const transporter = process.env.NODE_ENV === 'production' 
      ? createProductionTransporter() 
      : await createTestTransporter();

    const mailOptions = {
      from: '"Karibu Groceries LTD" <noreply@karibugroceries.com>',
      to: options.email,
      subject: options.subject,
      text: options.message,
      html: options.html || `<p>${options.message}</p>`,
    };

    const info = await transporter.sendMail(mailOptions);

    // Log test email URL in development
    if (process.env.NODE_ENV !== 'production') {
      console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info));
    }

    return info;
  } catch (error) {
    console.error('Email send error:', error);
    // Don't throw error in development - just log it
    if (process.env.NODE_ENV === 'production') {
      throw error;
    }
  }
};

/**
 * Send password reset email
 */
exports.sendPasswordResetEmail = async (email, resetToken) => {
  const resetURL = `${process.env.FRONTEND_URL || 'http://localhost:5500'}/reset-password/${resetToken}`;
  
  const message = `Forgot your password? Submit a request with your new password to: ${resetURL}\nIf you didn't forget your password, please ignore this email.`;
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #2E7D32;">Karibu Groceries LTD</h2>
      <p>You requested a password reset.</p>
      <p>Click the button below to reset your password:</p>
      <a href="${resetURL}" style="display: inline-block; padding: 10px 20px; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 5px;">Reset Password</a>
      <p>Or copy this link: ${resetURL}</p>
      <p>This link will expire in 10 minutes.</p>
      <p>If you didn't request this, please ignore this email.</p>
    </div>
  `;
  
  return exports.sendEmail({
    email,
    subject: 'Your password reset token (valid for 10 minutes)',
    message,
    html
  });
};

/**
 * Send welcome email
 */
exports.sendWelcomeEmail = async (email, username) => {
  const message = `Welcome to Karibu Groceries LTD, ${username}! Your account has been created successfully.`;
  
  return exports.sendEmail({
    email,
    subject: 'Welcome to Karibu Groceries LTD',
    message
  });
};

/**
 * Send low stock alert
 */
exports.sendLowStockAlert = async (email, products) => {
  const productList = products.map(p => `- ${p.name}: ${p.stock}kg remaining`).join('\n');
  
  const message = `Low Stock Alert!\n\nThe following products are running low:\n${productList}\n\nPlease restock soon.`;
  
  return exports.sendEmail({
    email,
    subject: 'Low Stock Alert - Karibu Groceries LTD',
    message
  });
};