import emailjs from "@emailjs/browser";

const SERVICE_ID = "service_pdkdow8";
const PUBLIC_KEY = "JA6Q0RLGyyG50Iskg";

/* ==============================
   FORGOT PASSWORD EMAIL
============================== */
export const sendResetPasswordEmail = async ({
  to_email,
  user_name,
  reset_link,
}) => {
  return emailjs.send(
    SERVICE_ID,
    "template_reset_password",
    {
      to_email,
      user_name,
      reset_link,
    },
    PUBLIC_KEY
  );
};

/* ==============================
   EMAIL VERIFICATION
============================== */
export const sendVerificationEmail = async ({
  to_email,
  user_name,
  verification_link,
}) => {
  return emailjs.send(
    SERVICE_ID,
    "template_email_verification",
    {
      to_email,
      user_name,
      verification_link,
    },
    PUBLIC_KEY
  );
};
