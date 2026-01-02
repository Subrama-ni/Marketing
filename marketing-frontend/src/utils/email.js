import emailjs from "@emailjs/browser";

const SERVICE_ID = "service_pdkdow8";
const PUBLIC_KEY = "JA6Q0RLGyyG50Iskg";

/* ==============================
   FORGOT PASSWORD EMAIL
============================== */
export const sendResetPasswordEmail = async (data) => {
  if (!data) {
    throw new Error("EmailJS data object is missing");
  }

  const { to_email, user_name, reset_link } = data;

  if (!to_email || !reset_link) {
    throw new Error("Required EmailJS fields missing");
  }

  console.log("EMAILJS FINAL PAYLOAD:", {
    to_email,
    user_name,
    reset_link,
  });

  return emailjs.send(
    SERVICE_ID,
    "template_o84bslc",
    {
      to_email,
      user_name,
      reset_link,
    },
    PUBLIC_KEY
  );
};
export const sendVerificationEmail = async (data) => {
  if (!data) {
    throw new Error("EmailJS data object is missing");
  }

  const { to_email, user_name, verification_link } = data;

  if (!to_email || !verification_link) {
    throw new Error("Required EmailJS fields missing");
  }

  return emailjs.send(
    SERVICE_ID,
    "template_ewwp0vl",
    {
      to_email,
      user_name,
      verification_link,
    },
    PUBLIC_KEY
  );
};
