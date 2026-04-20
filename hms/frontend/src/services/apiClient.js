import axios from "axios";

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:5000/api/v1",
  headers: {
    "Content-Type": "application/json",
  },
});

let isRefreshing = false;
let failedRequests = [];

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem("medicare_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    if (error?.response?.status === 401 && !originalRequest._retry && !originalRequest.url.includes("/auth/refresh")) {
      const refreshToken = localStorage.getItem("medicare_refresh_token");
      if (!refreshToken) {
        localStorage.removeItem("medicare_token");
        localStorage.removeItem("medicare_user");
        localStorage.removeItem("medicare_refresh_token");
        window.location.href = "/login";
        return Promise.reject(error);
      }
      
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedRequests.push({ resolve, reject });
        }).then(() => {
          originalRequest.headers.Authorization = `Bearer ${localStorage.getItem("medicare_token")}`;
          return apiClient(originalRequest);
        });
      }
      
      originalRequest._retry = true;
      isRefreshing = true;
      
      try {
        const response = await axios.post(
          `${apiClient.defaults.baseURL}/auth/refresh`,
          {},
          { headers: { Authorization: `Bearer ${refreshToken}` } }
        );
        
        const { accessToken, refreshToken: newRefreshToken } = response.data.data;
        localStorage.setItem("medicare_token", accessToken);
        if (newRefreshToken) {
          localStorage.setItem("medicare_refresh_token", newRefreshToken);
        }
        
        failedRequests.forEach(({ resolve }) => resolve());
        failedRequests = [];
        
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        isRefreshing = false;
        return apiClient(originalRequest);
      } catch (refreshError) {
        failedRequests.forEach(({ reject }) => reject(refreshError));
        failedRequests = [];
        isRefreshing = false;
        localStorage.removeItem("medicare_token");
        localStorage.removeItem("medicare_user");
        localStorage.removeItem("medicare_refresh_token");
        window.location.href = "/login";
        return Promise.reject(refreshError);
      }
    }
    
    if (error?.response?.status === 401) {
      localStorage.removeItem("medicare_token");
      localStorage.removeItem("medicare_user");
      localStorage.removeItem("medicare_refresh_token");
    }
    
    return Promise.reject(
      new Error(
        error?.response?.data?.message || error?.message || "Request failed"
      )
    );
  }
);

export default apiClient;
