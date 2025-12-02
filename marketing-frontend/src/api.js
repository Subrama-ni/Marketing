// frontend/src/api.js
import axios from "axios";
import dayjs from "dayjs";
import { toast } from "react-toastify";

const BASE = process.env.REACT_APP_API_URL || "http://localhost:4000/api";

const API = axios.create({
  baseURL: BASE,
  headers: { "Content-Type": "application/json" },
});

/* REQUEST INTERCEPTOR */
API.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;

  // last active (set by sessionActivity)
  const lastActive = localStorage.getItem("lastActive") || Date.now();
  config.headers["x-last-active"] = lastActive;

  return config;
});

/* RESPONSE INTERCEPTOR */
API.interceptors.response.use(
  (res) => res,
  (err) => {
    const status = err.response?.status;

    if (status === 440 || status === 441) {
      toast.error(err.response?.data?.message || "Session expired. Please login again.");
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      setTimeout(() => (window.location.href = "/login"), 800);
    }

    // plain 401 → just clear token; let UI handle route protection
    if (status === 401) {
      console.warn("API 401 - clearing token");
      localStorage.removeItem("token");
      localStorage.removeItem("user");
    }

    return Promise.reject(err);
  }
);

const handleError = (error) => {
  console.error("❌ API Error:", error.response?.data || error.message);
  toast.error(error.response?.data?.message || "Something went wrong");
  throw error;
};

/* ----------------- Customers ----------------- */

export const getCustomers = async (params = {}) => {
  try {
    return await API.get(`/customers`, { params });
  } catch (e) {
    handleError(e);
  }
};

export const createCustomer = async (data) => {
  try {
    return await API.post(`/customers`, data);
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

// Helper
export const getCustomersByMode = async (billingType) => {
  return getCustomers({ billingType });
};

/* ----------------- Entries ----------------- */

export const createEntry = async (data) => {
  try {
    const payload = {
      ...data,
      kgs: Number(data.kgs),
      rate: Number(data.rate),
      commission: Number(data.commission || 0),
      bags: Number(data.bags || 0),
      luggage_amount: Number(data.luggage_amount || 0),
    };
    return await API.post(`/entries`, payload);
  } catch (error) {
    handleError(error);
  }
};

export const getEntriesByCustomer = async (customerId, billingType = "farmer") => {
  try {
    return await API.get(`/entries/${customerId}`, { params: { billingType } });
  } catch (error) {
    handleError(error);
  }
};

export const updateEntry = async (id, data) => {
  try {
    const payload = {
      ...data,
      kgs: Number(data.kgs),
      rate: Number(data.rate),
      commission: Number(data.commission || 0),
      bags: Number(data.bags || 0),
      luggage_amount: Number(data.luggage_amount || 0),
    };
    return await API.put(`/entries/${id}`, payload);
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

/* ----------------- Payments ----------------- */

const normalizeDateForApi = (d) => {
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
    const f = normalizeDateForApi(fromDate);
    const t = normalizeDateForApi(toDate);
    return await API.get(`/payments/entries/${customerId}`, {
      params: { fromDate: f, toDate: t, billingType },
    });
  } catch (error) {
    handleError(error);
  }
};

export const makePayment = async (data) => {
  try {
    return await API.post(`/payments`, data);
  } catch (error) {
    handleError(error);
  }
};

export const getPaymentHistory = async (customerId) => {
  try {
    return await API.get(`/payments/history/${customerId}`);
  } catch (error) {
    handleError(error);
  }
};

/* ----------------- Auth ----------------- */

export const loginUser = async (data) => {
  try {
    return await API.post(`/auth/login`, data);
  } catch (error) {
    handleError(error);
  }
};

export const registerUser = async (data) => {
  try {
    return await API.post(`/auth/register`, data);
  } catch (error) {
    handleError(error);
  }
};

export const forgotPasswordRequest = async (email) => {
  try {
    return await API.post(`/auth/forgot-password`, { email });
  } catch (error) {
    handleError(error);
  }
};

export const resetPasswordRequest = async (token, newPassword) => {
  try {
    return await API.post(`/auth/reset-password`, { token, newPassword });
  } catch (error) {
    handleError(error);
  }
};

/* ----------------- Settings ----------------- */

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
