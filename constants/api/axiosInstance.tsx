import axios from "axios";

// IMPORTANT:
// If testing on physical device → use your local IP address
// If testing on emulator → use 10.0.2.2 for Android emulator

const BASE_URL = "http://192.168.88.19:5000";
// replace with your system IP address

const axiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
});

export default axiosInstance;
