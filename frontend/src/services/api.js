import axios from "axios";
import { authService } from "./auth";

const API = axios.create({
  baseURL: "http://localhost:5000/api",
  timeout: 10000,
});

// Add auth token to requests
API.interceptors.request.use(
  (config) => {
    const user = authService.getCurrentUser();
    if (user) {
      // You can add user ID to requests if needed
      config.headers["X-User-Id"] = user.id;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

// Report API functions
export const getReports = () => API.get("/reports");
export const getReport = (id) => API.get(`/reports/${id}`);
export const createReport = (report) => {
  const user = authService.getCurrentUser();
  // Add username to report if user is logged in
  if (user) {
    report.username = user.username;
    report.userId = user.id;
  }
  return API.post("/reports", report);
};
export const updateReport = (id, report) => API.put(`/reports/${id}`, report);
export const deleteReport = (id) => API.delete(`/reports/${id}`);

// Add these to your existing api.js file

export const likeReport = (reportId) => {
  const user = authService.getCurrentUser();
  return API.post(`/reports/${reportId}/like`, null, {
    headers: {
      "X-User-Id": user?.id || "",
    },
  });
};

export const unlikeReport = (reportId) => {
  const user = authService.getCurrentUser();
  return API.delete(`/reports/${reportId}/like`, {
    headers: {
      "X-User-Id": user?.id || "",
    },
  });
};

export const getReportLikes = (reportId) => {
  return API.get(`/reports/${reportId}/likes`);
};

export const checkUserLiked = (reportId) => {
  const user = authService.getCurrentUser();
  if (!user) return Promise.resolve({ data: { liked: false } });

  return API.get(`/reports/${reportId}/liked`, {
    headers: {
      "X-User-Id": user.id,
    },
  });
};

// ========== COMMENT FUNCTIONS ==========

export const getComments = (reportId) => {
  return API.get(`/reports/${reportId}/comments`);
};

export const getCommentCount = (reportId) => {
  return API.get(`/reports/${reportId}/comments/count`);
};

export const createComment = (reportId, content) => {
  const user = authService.getCurrentUser();
  return API.post(
    `/reports/${reportId}/comments`,
    { content },
    {
      headers: {
        "X-User-Id": user?.id || "",
        "X-User-Name": user?.username || "",
      },
    },
  );
};

export const updateComment = (commentId, content) => {
  const user = authService.getCurrentUser();
  return API.put(
    `/comments/${commentId}`,
    { content },
    {
      headers: {
        "X-User-Id": user?.id || "",
      },
    },
  );
};

export const deleteComment = (commentId) => {
  const user = authService.getCurrentUser();
  return API.delete(`/comments/${commentId}`, {
    headers: {
      "X-User-Id": user?.id || "",
    },
  });
};

// Export auth functions separately
export { authService };
