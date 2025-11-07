const nodemailer = require("nodemailer");
const pug = require("pug");
const path = require("path");


const fallbackEmail = "info@researchdecode.com";
const fallbackPassword = "Web#@mail$%9956";
const rawEmailPassword = process.env.EMAIL_PASSWORD;
const emailPassword =
  rawEmailPassword && rawEmailPassword.trim().length > 0
    ? rawEmailPassword.trim()
    : fallbackPassword;

if (
  rawEmailPassword &&
  !rawEmailPassword.includes("#") &&
  fallbackPassword.includes("#")
) {
  console.warn(
    "[MAILER] EMAIL_PASSWORD appears to exclude special characters. " +
      "If your real password contains '#', wrap it in quotes in the .env file."
  );
}

const emailPort = parseInt(process.env.EMAIL_PORT || "465", 10);
const emailSecure =
  typeof process.env.EMAIL_SECURE !== "undefined"
    ? process.env.EMAIL_SECURE === "true"
    : emailPort === 465;

const transporterOptions = {
  host: process.env.EMAIL_HOST || "smtp.hostinger.com",
  port: emailPort,
  secure: emailSecure,
  auth: {
    user: process.env.EMAIL || fallbackEmail,
    pass: emailPassword,
  },
  logger: process.env.NODE_ENV === "development",
  debug: process.env.NODE_ENV === "development",
};

if (process.env.EMAIL_AUTH_METHOD) {
  transporterOptions.authMethod = process.env.EMAIL_AUTH_METHOD;
}

if (process.env.EMAIL_TLS_REJECT_UNAUTHORIZED === "false") {
  transporterOptions.tls = { rejectUnauthorized: false };
}

const transporter = nodemailer.createTransport(transporterOptions);

if (process.env.NODE_ENV === "development") {
  transporter.verify((error) => {
    if (error) {
      console.warn("[MAILER] SMTP verification failed:", error.message);
    } else {
      console.info("[MAILER] SMTP server is ready to send emails.");
    }
  });
}

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
