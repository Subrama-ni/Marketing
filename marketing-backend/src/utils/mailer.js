import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS,
  },
});

export const sendApprovalMail = async ({ to, name }) => {
  await transporter.sendMail({
    from: `"Admin" <${process.env.MAIL_USER}>`,
    to,
    subject: "Account Approved ✅",
    html: `
      <h2>Hello ${name},</h2>
      <p>Your account has been approved.</p>
      <p>You can now login.</p>
      <br/>
      <p>— Admin</p>
    `,
  });
};
