// backend/src/utils/sendAdminApprovalMail.js
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * Send approval email to admin
 */
export async function sendAdminApprovalMail(user) {
  try {
    if (!process.env.ADMIN_EMAIL) {
      console.warn("⚠️ ADMIN_EMAIL not set. Skipping admin approval mail.");
      return;
    }

    // 🔥 BACKEND approval links (CORRECT)
    const approveUrl = `${process.env.BACKEND_URL}/api/admin/approve/${user.id}`;
    const rejectUrl = `${process.env.BACKEND_URL}/api/admin/reject/${user.id}`;

    await resend.emails.send({
      from: process.env.FROM_EMAIL,
      to: process.env.ADMIN_EMAIL,
      subject: "🛑 New User Approval Required",
      html: `
        <h2>New User Registration</h2>

        <p><strong>Name:</strong> ${user.name}</p>
        <p><strong>Email:</strong> ${user.email}</p>
        <p><strong>Phone:</strong> ${user.phone || "N/A"}</p>

        <br/>

        <a href="${approveUrl}" style="
          padding:12px 18px;
          background:#16a34a;
          color:white;
          text-decoration:none;
          border-radius:6px;
          margin-right:10px;
          display:inline-block;
        ">✅ Approve User</a>

        <a href="${rejectUrl}" style="
          padding:12px 18px;
          background:#dc2626;
          color:white;
          text-decoration:none;
          border-radius:6px;
          display:inline-block;
        ">❌ Reject User</a>

        <br/><br/>
        <small>This action is handled securely by the backend.</small>
      `,
    });

    console.log("📧 Admin approval email sent to:", process.env.ADMIN_EMAIL);
  } catch (err) {
    console.error("❌ Failed to send admin approval mail:", err);
    throw err;
  }
}
