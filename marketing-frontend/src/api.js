import axios from "axios";
import dayjs from "dayjs";

// ✅ Base API URL
const BASE = process.env.REACT_APP_API_URL || "http://localhost:4000/api";

/* =========================================================
   🛡️ Axios Setup — Adds token automatically for all requests
========================================================= */
axios.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    config.headers["Content-Type"] = "application/json";
    return config;
  },
  (error) => Promise.reject(error)
);

/* =========================================================
   ⚠️ Centralized Error Handler
========================================================= */
const handleError = (error) => {
  console.error("❌ API Error:", error.response?.data || error.message);
  throw error;
};

/* =========================================================
   👥 Customers
========================================================= */
export const getCustomers = async () => {
  try {
    return await axios.get(`${BASE}/customers`);
  } catch (error) {
    handleError(error);
  }
};

export const createCustomer = async (data) => {
  try {
    return await axios.post(`${BASE}/customers`, data);
  } catch (error) {
    handleError(error);
  }
};

export const updateCustomer = async (id, data) => {
  try {
    return await axios.put(`${BASE}/customers/${id}`, data);
  } catch (error) {
    handleError(error);
  }
};

export const deleteCustomer = async (id) => {
  try {
    return await axios.delete(`${BASE}/customers/${id}`);
  } catch (error) {
    handleError(error);
  }
};

/* =========================================================
   📘 Entries (Supports item_name + bags)
========================================================= */
export const createEntry = async (data) => {
  try {
    // Normalize numbers for DB consistency
    const payload = {
      ...data,
      kgs: Number(data.kgs),
      rate: Number(data.rate),
      commission: Number(data.commission || 0),
      bags: Number(data.bags || 0),
    };
    return await axios.post(`${BASE}/entries`, payload);
  } catch (error) {
    handleError(error);
  }
};

export const getEntriesByCustomer = async (customerId) => {
  try {
    return await axios.get(`${BASE}/entries/${customerId}`);
  } catch (error) {
    handleError(error);
  }
};

export const getEntriesForPayment = async (customerId, fromDate, toDate) => {
  try {
    const f = normalizeDateForApi(fromDate);
    const t = normalizeDateForApi(toDate);
    return await axios.get(
      `${BASE}/entries/for-payment/${customerId}/${f}/${t}`
    );
  } catch (error) {
    handleError(error);
  }
};

// ✅ Update Entry (Edit feature)
export const updateEntry = async (id, data) => {
  try {
    const payload = {
      ...data,
      kgs: Number(data.kgs),
      rate: Number(data.rate),
      commission: Number(data.commission || 0),
      bags: Number(data.bags || 0),
    };
    return await axios.put(`${BASE}/entries/${id}`, payload);
  } catch (error) {
    handleError(error);
  }
};

export const deleteEntry = async (id) => {
  try {
    return await axios.delete(`${BASE}/entries/${id}`);
  } catch (error) {
    handleError(error);
  }
};

/* =========================================================
   💰 Payments (Supports bag_amount)
========================================================= */
const normalizeDateForApi = (d) => {
  if (!d) return null;
  const parsed = dayjs(d);
  return parsed.isValid() ? parsed.format("YYYY-MM-DD") : null;
};

export const makePayment = async (data) => {
  try {
    // Includes optional bag_amount if applicable
    const payload = {
      ...data,
      bag_amount: Number(data.bag_amount || 0),
    };
    return await axios.post(`${BASE}/payments`, payload);
  } catch (error) {
    handleError(error);
  }
};

export const getPaymentHistory = async (customerId) => {
  try {
    return await axios.get(`${BASE}/payments/history/${customerId}`);
  } catch (error) {
    handleError(error);
  }
};

/* =========================================================
   🔐 Authentication
========================================================= */
export const loginUser = async (data) => {
  try {
    return await axios.post(`${BASE}/auth/login`, data);
  } catch (error) {
    handleError(error);
  }
};

export const registerUser = async (data) => {
  try {
    return await axios.post(`${BASE}/auth/register`, data);
  } catch (error) {
    handleError(error);
  }
};
