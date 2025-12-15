import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

export async function sendVerificationMail({ email, name, token }) {
  const verifyUrl = `${process.env.FRONTEND_URL}/verify-email/${token}`;

  await transporter.sendMail({
    from: `"Marketing App" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: "✅ Verify your email",
    html: `
      <h2>Hello ${name},</h2>
      <p>Please verify your email to activate your account.</p>
      <a href="${verifyUrl}"
         style="padding:10px 16px;background:#2563eb;color:white;
                text-decoration:none;border-radius:6px;">
        Verify Email
      </a>
      <p>This link expires in 24 hours.</p>
    `,
  });
}
