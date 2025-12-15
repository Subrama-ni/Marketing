import { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "react-toastify";

const BASE = "https://marketing-db-ihb3.onrender.com/api";

export default function VerifyEmailPage() {
  const { token } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    axios
      .get(`${BASE}/auth/verify-email/${token}`)
      .then(() => {
        toast.success("Email verified! Wait for admin approval.");
        navigate("/login");
      })
      .catch(() => {
        toast.error("Verification link invalid or expired");
        navigate("/login");
      });
  }, [token, navigate]);

  return <div style={{ padding: 40 }}>Verifying email...</div>;
}
