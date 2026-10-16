// frontend/src/api.js
import axios from "axios";
import dayjs from "dayjs";
import { toast } from "react-toastify";

/* ============================================================
   BASE URL — RENDER BACKEND
   ============================================================ */
const BASE = "https://marketing-db-ihb3.onrender.com/api";

console.log("API Base URL:", BASE);

const API = axios.create({
  baseURL: BASE,
  headers: { "Content-Type": "application/json" },
  withCredentials: false,
});

/* ============================================================
   REQUEST INTERCEPTOR
   ============================================================ */
API.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  const lastActive = localStorage.getItem("lastActive");

  if (lastActive) {
    config.headers["x-last-active"] = lastActive;
  }

  return config;
});

/* ============================================================
   RESPONSE INTERCEPTOR
   ============================================================ */
API.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error("API Error:", error);

    const status = error.response?.status;

    if (status === 440 || status === 441) {
      toast.error(
        error.response?.data?.message || "Session expired. Please login again.",
      );

      localStorage.removeItem("token");
      localStorage.removeItem("user");
      localStorage.removeItem("loginTime");
      localStorage.removeItem("lastActive");

      window.setTimeout(() => {
        window.location.href = "/login";
      }, 800);

      return Promise.reject(error);
    }

    if (status === 401) {
      console.warn("401 Unauthorized");
      localStorage.removeItem("token");
      localStorage.removeItem("user");
    }

    return Promise.reject(error);
  },
);

/* ============================================================
   COMMON ERROR HANDLER
   ============================================================ */
const handleError = (error) => {
  console.error("API request failed:", error.response?.data || error.message);

  toast.error(error.response?.data?.message || "Something went wrong");

  throw error;
};

/* ============================================================
   CUSTOMERS
   ============================================================ */
export const getCustomers = async (params = {}) => {
  try {
    return await API.get("/customers", { params });
  } catch (error) {
    handleError(error);
  }
};

export const createCustomer = async (data) => {
  try {
    return await API.post("/customers", data);
  } catch (error) {
    handleError(error);
  }
};

export const updateCustomer = async (id, data) => {
  try {
    return await API.put(`/customers/${id}`, data);
  } catch (error) {
    handleError(error);
  }
};

export const deleteCustomer = async (id) => {
  try {
    return await API.delete(`/customers/${id}`);
  } catch (error) {
    handleError(error);
  }
};

export const getCustomersByMode = (billingType) =>
  getCustomers({ billingType });

/* ============================================================
   ENTRIES
   ============================================================ */
const normalizeNumber = (value) => Number(value || 0);

export const createEntry = async (data) => {
  try {
    return await API.post("/entries", {
      ...data,
      kgs: normalizeNumber(data.kgs),
      rate: normalizeNumber(data.rate),
      commission: normalizeNumber(data.commission),
      bags: normalizeNumber(data.bags),
      luggage_amount: normalizeNumber(data.luggage_amount),
    });
  } catch (error) {
    handleError(error);
  }
};

export const getEntriesByCustomer = async (
  customerId,
  billingType = "farmer",
) => {
  try {
    return await API.get(`/entries/${customerId}`, {
      params: { billingType },
    });
  } catch (error) {
    handleError(error);
  }
};

export const updateEntry = async (id, data) => {
  try {
    return await API.put(`/entries/${id}`, {
      ...data,
      kgs: normalizeNumber(data.kgs),
      rate: normalizeNumber(data.rate),
      commission: normalizeNumber(data.commission),
      bags: normalizeNumber(data.bags),
      luggage_amount: normalizeNumber(data.luggage_amount),
    });
  } catch (error) {
    handleError(error);
  }
};

export const deleteEntry = async (id) => {
  try {
    return await API.delete(`/entries/${id}`);
  } catch (error) {
    handleError(error);
  }
};

/* ============================================================
   PAYMENTS
   ============================================================ */
const normalizeDate = (date) => {
  if (!date) return null;

  const parsed = dayjs(date);

  return parsed.isValid() ? parsed.format("YYYY-MM-DD") : null;
};

/*
 * Retrieve entries for the selected date range.
 */
export const getEntriesForPayment = async (
  customerId,
  fromDate,
  toDate,
  billingType = "farmer",
) => {
  try {
    return await API.get(`/payments/entries/${customerId}`, {
      params: {
        fromDate: normalizeDate(fromDate),
        toDate: normalizeDate(toDate),
        billingType,
      },
    });
  } catch (error) {
    handleError(error);
  }
};

/*
 * Retrieve the saved customer balance independently of dates.
 * This requires GET /payments/balance/:customerId on the backend.
 */
export const getCustomerBalance = async (
  customerId,
  billingType = "farmer",
) => {
  try {
    return await API.get(`/payments/balance/${customerId}`, {
      params: { billingType },
    });
  } catch (error) {
    handleError(error);
  }
};

/*
 * Record a payment.
 */
export const makePayment = async (data) => {
  try {
    return await API.post("/payments", data);
  } catch (error) {
    handleError(error);
  }
};

/*
 * Retrieve customer payment history.
 */
export const getPaymentHistory = async (customerId) => {
  try {
    return await API.get(`/payments/history/${customerId}`);
  } catch (error) {
    handleError(error);
  }
};

/* ============================================================
   AUTH
   ============================================================ */
export const loginUser = async (data) => {
  try {
    return await API.post("/auth/login", data);
  } catch (error) {
    handleError(error);
  }
};

export const registerUser = async (data) => {
  try {
    return await API.post("/auth/register", data);
  } catch (error) {
    handleError(error);
  }
};

export const forgotPasswordRequest = async (email) => {
  try {
    return await API.post("/auth/forgot-password", { email });
  } catch (error) {
    handleError(error);
  }
};

export const resetPasswordRequest = async (token, newPassword) => {
  try {
    return await API.post("/auth/reset-password", {
      token,
      newPassword,
    });
  } catch (error) {
    handleError(error);
  }
};

export const resendVerification = async (email) => {
  try {
    return await API.post("/auth/resend-verification", {
      email,
    });
  } catch (error) {
    handleError(error);
  }
};

/* ============================================================
   SETTINGS
   ============================================================ */
export const getSettings = async () => {
  try {
    return await API.get("/settings");
  } catch (error) {
    handleError(error);
  }
};

export const saveSettings = async (data) => {
  try {
    return await API.put("/settings", data);
  } catch (error) {
    handleError(error);
  }
};

/* ============================================================
   ADMIN
   ============================================================ */
export const getPendingUsers = async () => {
  try {
    return await API.get("/admin/pending-users");
  } catch (error) {
    handleError(error);
  }
};

export const approveUser = async (userId) => {
  try {
    return await API.post(`/admin/approve/${userId}`);
  } catch (error) {
    handleError(error);
  }
};

export const rejectUser = async (userId) => {
  try {
    return await API.post(`/admin/reject/${userId}`);
  } catch (error) {
    handleError(error);
  }
};
