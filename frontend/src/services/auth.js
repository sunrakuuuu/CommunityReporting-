import axios from "axios";

const API = axios.create({
  baseURL: "http://localhost:5000/api",
  timeout: 10000,
});

// Add token to requests if it exists
API.interceptors.request.use(
  (config) => {
    const user = JSON.parse(localStorage.getItem("user"));
    if (user?.token) {
      config.headers.Authorization = `Bearer ${user.token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

// Handle response errors
API.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.code === "ECONNABORTED") {
      throw new Error("Request timeout. Please try again.");
    }
    if (!error.response) {
      throw new Error("Network error. Please check if the server is running.");
    }

    // Handle unauthorized errors
    if (error.response.status === 401) {
      // Clear invalid user data
      localStorage.removeItem("user");
      // You could also trigger a redirect to login here
    }

    throw error;
  },
);

// Authentication functions
export const authService = {
  // Register a new user
  async register(username, password) {
    try {
      const response = await API.post("/users/register", {
        username,
        password,
      });

      if (response.data) {
        // Store user data (in a real app, you'd get a token)
        localStorage.setItem("user", JSON.stringify(response.data));
        return response.data;
      }
    } catch (error) {
      console.error("Registration error:", error);
      throw error.response?.data || { message: "Registration failed" };
    }
  },

  // Login user
  async login(username, password) {
    try {
      const response = await API.post("/users/login", {
        username,
        password,
      });

      if (response.data) {
        // Store user data
        localStorage.setItem("user", JSON.stringify(response.data));
        return response.data;
      }
    } catch (error) {
      console.error("Login error:", error);
      throw error.response?.data || { message: "Login failed" };
    }
  },

  // Logout user
  logout() {
    localStorage.removeItem("user");
  },

  // Get current user
  getCurrentUser() {
    try {
      const user = localStorage.getItem("user");
      return user ? JSON.parse(user) : null;
    } catch (error) {
      console.error("Error getting current user:", error);
      return null;
    }
  },

  // Check if user is authenticated
  isAuthenticated() {
    return !!this.getCurrentUser();
  },

  // Update user profile (optional)
  async updateProfile(userId, data) {
    try {
      const response = await API.put(`/users/${userId}`, data);
      if (response.data) {
        // Update stored user data
        const currentUser = this.getCurrentUser();
        const updatedUser = { ...currentUser, ...response.data };
        localStorage.setItem("user", JSON.stringify(updatedUser));
        return updatedUser;
      }
    } catch (error) {
      console.error("Update profile error:", error);
      throw error.response?.data || { message: "Update failed" };
    }
  },

  // Change password (optional)
  async changePassword(userId, currentPassword, newPassword) {
    try {
      const response = await API.post(`/users/${userId}/change-password`, {
        currentPassword,
        newPassword,
      });
      return response.data;
    } catch (error) {
      console.error("Change password error:", error);
      throw error.response?.data || { message: "Password change failed" };
    }
  },
};

// Create a hook for using auth in components
export const useAuth = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is logged in on mount
    const currentUser = authService.getCurrentUser();
    setUser(currentUser);
    setLoading(false);
  }, []);

  const login = async (username, password) => {
    setLoading(true);
    try {
      const userData = await authService.login(username, password);
      setUser(userData);
      return userData;
    } finally {
      setLoading(false);
    }
  };

  const register = async (username, password) => {
    setLoading(true);
    try {
      const userData = await authService.register(username, password);
      setUser(userData);
      return userData;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    authService.logout();
    setUser(null);
  };

  return {
    user,
    loading,
    login,
    register,
    logout,
    isAuthenticated: !!user,
  };
};

export default authService;
