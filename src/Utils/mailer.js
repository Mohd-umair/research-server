const nodemailer = require("nodemailer");
const pug = require("pug");
const path = require("path");


const transporter = nodemailer.createTransport({
  host: "smtp.hostinger.com",
  port: 465,
  secure: true,
  auth: {
    user: "info@researchdecode.com",
    pass: "Web#@mail$%9956",
  },
  logger: true,
  debug: true,
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


module.exports = { sendVerificationEmail, sendCustomEmail };
