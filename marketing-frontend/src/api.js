// frontend/src/api.js
import axios from "axios";
import dayjs from "dayjs";
import { toast } from "react-toastify";

/* ============================================================
   🌍 BASE URL — FINAL RENDER URL FOR BACKEND
   ============================================================ */
const BASE = "https://marketing-db-ihb3.onrender.com/api";
 // your Render backend URL

console.log("🌍 API Base URL:", BASE);
console.log("🔥 ENV API URL =", process.env.REACT_APP_API_URL);
console.log("🔥 FINAL BASE URL =", BASE);

const API = axios.create({
  baseURL: BASE,
  headers: { "Content-Type": "application/json" },
  withCredentials: false, // must be false for Render
});

/* ============================================================
   🔐 REQUEST INTERCEPTOR
   ============================================================ */
API.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;

  const lastActive = localStorage.getItem("lastActive");
  if (lastActive) config.headers["x-last-active"] = lastActive;

  return config;
});

/* ============================================================
   🔐 RESPONSE INTERCEPTOR – SESSION & TOKEN HANDLING
   ============================================================ */
API.interceptors.response.use(
  (res) => res,
  (err) => {
    console.error("❌ API Interceptor Error:", err);

    const status = err.response?.status;

    // 🔒 Session Expired
    if (status === 440 || status === 441) {
      toast.error(
        err.response?.data?.message || "Session expired. Please login again."
      );
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      setTimeout(() => (window.location.href = "/login"), 800);
      return;
    }

    // ❌ Unauthorized Token
    if (status === 401) {
      console.warn("401 Unauthorized → Clearing token");
      localStorage.removeItem("token");
      localStorage.removeItem("user");
    }

    return Promise.reject(err);
  }
);

/* ============================================================
   ❗ COMMON ERROR HANDLER
   ============================================================ */
const handleError = (error) => {
  console.error("❌ API Error:", error.response?.data || error.message);

  toast.error(error.response?.data?.message || "Something went wrong");
  throw error;
};

/* ============================================================
   👤 CUSTOMERS
   ============================================================ */
export const getCustomers = async (params = {}) => {
  try {
    return await API.get("/customers", { params });
  } catch (e) {
    handleError(e);
  }
};

export const createCustomer = async (data) => {
  try {
    return await API.post("/customers", data);
  } catch (e) {
    handleError(e);
  }
};

export const updateCustomer = async (id, data) => {
  try {
    return await API.put(`/customers/${id}`, data);
  } catch (e) {
    handleError(e);
  }
};

export const deleteCustomer = async (id) => {
  try {
    return await API.delete(`/customers/${id}`);
  } catch (e) {
    handleError(e);
  }
};

export const getCustomersByMode = async (billingType) =>
  getCustomers({ billingType });

/* ============================================================
   📦 ENTRIES
   ============================================================ */
const normalizeNumber = (v) => Number(v || 0);

export const createEntry = async (data) => {
  try {
    const payload = {
      ...data,
      kgs: normalizeNumber(data.kgs),
      rate: normalizeNumber(data.rate),
      commission: normalizeNumber(data.commission),
      bags: normalizeNumber(data.bags),
      luggage_amount: normalizeNumber(data.luggage_amount),
    };
    return await API.post("/entries", payload);
  } catch (e) {
    handleError(e);
  }
};

export const getEntriesByCustomer = async (customerId, billingType = "farmer") => {
  try {
    return await API.get(`/entries/${customerId}`, { params: { billingType } });
  } catch (e) {
    handleError(e);
  }
};

export const updateEntry = async (id, data) => {
  try {
    const payload = {
      ...data,
      kgs: normalizeNumber(data.kgs),
      rate: normalizeNumber(data.rate),
      commission: normalizeNumber(data.commission),
      bags: normalizeNumber(data.bags),
      luggage_amount: normalizeNumber(data.luggage_amount),
    };
    return await API.put(`/entries/${id}`, payload);
  } catch (e) {
    handleError(e);
  }
};

export const deleteEntry = async (id) => {
  try {
    return await API.delete(`/entries/${id}`);
  } catch (e) {
    handleError(e);
  }
};

/* ============================================================
   💰 PAYMENTS
   ============================================================ */
const normalizeDate = (d) => {
  if (!d) return null;
  const parsed = dayjs(d);
  return parsed.isValid() ? parsed.format("YYYY-MM-DD") : null;
};

export const getEntriesForPayment = async (
  customerId,
  fromDate,
  toDate,
  billingType = "farmer"
) => {
  try {
    return await API.get(`/payments/entries/${customerId}`, {
      params: {
        fromDate: normalizeDate(fromDate),
        toDate: normalizeDate(toDate),
        billingType,
      },
    });
  } catch (e) {
    handleError(e);
  }
};

export const makePayment = async (data) => {
  try {
    return await API.post("/payments", data);
  } catch (e) {
    handleError(e);
  }
};

export const getPaymentHistory = async (customerId) => {
  try {
    return await API.get(`/payments/history/${customerId}`);
  } catch (e) {
    handleError(e);
  }
};

/* ============================================================
   🔐 AUTH
   ============================================================ */
export const loginUser = async (data) => {
  try {
    return await API.post("/auth/login", data);
  } catch (e) {
    handleError(e);
  }
};

export const registerUser = async (data) => {
  try {
    return await API.post("/auth/register", data);
  } catch (e) {
    handleError(e);
  }
};

export const forgotPasswordRequest = async (email) => {
  try {
    return await API.post("/auth/forgot-password", { email });
  } catch (e) {
    handleError(e);
  }
};

export const resetPasswordRequest = async (token, newPassword) => {
  try {
    return await API.post("/auth/reset-password", { token, newPassword });
  } catch (e) {
    handleError(e);
  }
};

/* ============================================================
   ⚙ SETTINGS
   ============================================================ */
export const getSettings = async () => {
  try {
    return await API.get("/settings");
  } catch (e) {
    handleError(e);
  }
};

export const saveSettings = async (data) => {
  try {
    return await API.put("/settings", data);
  } catch (e) {
    handleError(e);
  }
};
const authHeader = () => ({
  headers: {
    Authorization: `Bearer ${localStorage.getItem("token")}`,
  },
});

// 🔐 ADMIN APIs
export const getPendingUsers = () =>
  axios.get(`${BASE}/admin/pending-users`, authHeader());

export const approveUser = (userId) =>
  axios.post(`${BASE}/admin/approve-user/${userId}`, {}, authHeader());

export const rejectUser = (userId) =>
  axios.post(`${BASE}/admin/reject-user/${userId}`, {}, authHeader());
