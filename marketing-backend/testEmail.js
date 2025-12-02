import dotenv from "dotenv";
import nodemailer from "nodemailer";

dotenv.config();

async function testEmail() {
  try {
    console.log("Testing Gmail SMTP…");

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS,
      },
    });

    const info = await transporter.sendMail({
      from: `"Test Mail" <${process.env.MAIL_USER}>`,
      to: process.env.MAIL_USER,
      subject: "SMTP Test ✔",
      text: "This is a test email from Node.js using your Gmail App Password.",
    });

    console.log("Email sent successfully!");
    console.log("Response:", info);
  } catch (err) {
    console.error("❌ Email test failed:", err);
  }
}

testEmail();
