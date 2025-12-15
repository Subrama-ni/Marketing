// verifyEmail controller
export const verifyEmail = async (req, res) => {
  const { token } = req.params;

  await pool.query(
    "UPDATE users SET is_email_verified=true WHERE email_token=$1",
    [token]
  );

  res.redirect(`${FRONTEND_URL}/email-verified`);
};
