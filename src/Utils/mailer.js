const nodemailer = require("nodemailer");
const pug = require("pug");
const path = require("path");


const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || "smtp.hostinger.com",
  port: parseInt(process.env.EMAIL_PORT || "465"),
  secure: true,
  auth: {
    user: process.env.EMAIL || "info@researchdecode.com",
    pass: process.env.EMAIL_PASSWORD || "Web#@mail$%9956",
  },
  logger: process.env.NODE_ENV === 'development',
  debug: process.env.NODE_ENV === 'development',
});

const sendVerificationEmail = async (email, token) => {
  const url = `${process.env.BASE_URL}/?token=${token}`;

  const templatePath = path.join(__dirname, '..', 'templates', 'verification-email.pug');

  const html = pug.renderFile(templatePath, { url });

  const mailOptions = {
    from: process.env.EMAIL,
    to: email,
    subject: "Email Verification",
    html,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Email sent to ${email} successfully.`);
  } catch (error) {
    console.error("Error sending email", error);
  }
};

const sendCustomEmail = async (email, templateName, subject, data = {}) => {
  const templatePath = path.join(
    __dirname,
    "..",
    "templates",
    `${templateName}.pug`
  );

  let html;
  try {
    html = pug.renderFile(templatePath, data);
  } catch (error) {
    console.error("Error rendering Pug template:", error);
    return;
  }

  const mailOptions = {
    from: process.env.EMAIL,
    to: email,
    subject,
    html,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Email sent to ${email} successfully.`);
  } catch (error) {
    console.error("Error sending email:", error);
    throw new Error(`Error sending email`)
  }
};

const sendPasswordResetEmail = async (email, resetToken, userType) => {
  // Use FRONTEND_URL first (website URL), fallback to BASE_URL, then localhost for dev
  const baseUrl = process.env.FRONTEND_URL || process.env.BASE_URL || 'http://localhost:4200';
  const resetUrl = `${baseUrl}/auth/reset-password?token=${resetToken}&userType=${userType}`;

  const templatePath = path.join(__dirname, '..', 'templates', 'password-reset-email.pug');

  const html = pug.renderFile(templatePath, { resetUrl });

  const mailOptions = {
    from: process.env.EMAIL || "info@researchdecode.com",
    to: email,
    subject: "Password Reset Request",
    html,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Password reset email sent to ${email} successfully.`);
  } catch (error) {
    console.error("Error sending password reset email", error);
    throw new Error("Failed to send password reset email");
  }
};

module.exports = { sendVerificationEmail, sendCustomEmail, sendPasswordResetEmail };
