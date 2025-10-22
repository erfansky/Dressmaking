
// api.js
import axios from "axios";

const BASEHOST = window.location.hostname;  // dynamic IP
const BASEPORT = 8000;

const api = axios.create({
  baseURL: `http://${BASEHOST}:${BASEPORT}/api/`,
});

// token interceptors remain the same
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("access");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        const refresh = localStorage.getItem("refresh");
        const res = await axios.post(`http://${BASEHOST}:${BASEPORT}/api/token/refresh/`, { refresh });
        localStorage.setItem("access", res.data.access);
        originalRequest.headers.Authorization = `Bearer ${res.data.access}`;
        return api(originalRequest);
      } catch (err) {
        console.error("Refresh token expired, logging out");
        localStorage.removeItem("access");
        localStorage.removeItem("refresh");
        window.location.href = "/";
      }
    }
    return Promise.reject(error);
  }
);

export default api;
