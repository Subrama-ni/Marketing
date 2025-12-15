import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

export async function sendAdminApprovalMail(user) {
  const approveUrl = `${process.env.FRONTEND_URL}/admin/approve/${user.id}`;
  const rejectUrl = `${process.env.FRONTEND_URL}/admin/reject/${user.id}`;

  const mailOptions = {
    from: `"Marketing App" <${process.env.EMAIL_USER}>`,
    to: process.env.ADMIN_EMAIL,
    subject: "🛑 New User Approval Required",
    html: `
      <h2>New User Registration</h2>
      <p><strong>Name:</strong> ${user.name}</p>
      <p><strong>Email:</strong> ${user.email}</p>
      <p><strong>Phone:</strong> ${user.phone || "N/A"}</p>

      <br/>

      <a href="${approveUrl}" style="
        padding:10px 16px;
        background:#16a34a;
        color:white;
        text-decoration:none;
        border-radius:6px;
        margin-right:10px;
      ">✅ Approve</a>

      <a href="${rejectUrl}" style="
        padding:10px 16px;
        background:#dc2626;
        color:white;
        text-decoration:none;
        border-radius:6px;
      ">❌ Reject</a>
    `,
  };

  await transporter.sendMail(mailOptions);
}
