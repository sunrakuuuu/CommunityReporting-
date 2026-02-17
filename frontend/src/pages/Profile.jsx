import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { authService } from "../services/auth";
import * as api from "../services/api";
import Header from "../components/Header";
import {
  Edit2,
  FileText,
  MessageCircle,
  MapPin,
  Calendar,
  Heart,
  Award,
  Clock,
  LogOut,
  Settings,
  User,
  ChevronRight,
} from "lucide-react";

const Profile = () => {
  const navigate = useNavigate();
  const currentUser = authService.getCurrentUser();

  const [userReports, setUserReports] = useState([]);
  const [activeTab, setActiveTab] = useState("reports");
  const [loading, setLoading] = useState(true);
  const [commentCounts, setCommentCounts] = useState({});
  const [stats, setStats] = useState({
    totalReports: 0,
    totalLikes: 0,
    totalComments: 0,
    joinDate: null,
  });

  // Utility functions - memoized to prevent recreation
  const getTimeAgo = useCallback((dateString) => {
    if (!dateString) return "";

    const now = new Date();
    const past = new Date(dateString);
    const diffInSeconds = Math.floor((now - past) / 1000);

    if (diffInSeconds < 60) return `${diffInSeconds}s`;
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h`;
    if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)}d`;
    return `${Math.floor(diffInSeconds / 2592000)}mo`;
  }, []);

  const getCategoryColor = useCallback((category) => {
    switch (category) {
      case "Issue":
        return "bg-red-50 text-red-600 border-red-100";
      case "Request":
        return "bg-green-50 text-green-600 border-green-100";
      case "Incident":
        return "bg-orange-50 text-orange-600 border-orange-100";
      default:
        return "bg-gray-50 text-gray-600 border-gray-100";
    }
  }, []);

  // Data fetching
  useEffect(() => {
    let isMounted = true;

    if (!currentUser) {
      navigate("/login");
      return;
    }

    const fetchUserData = async () => {
      try {
        setLoading(true);
        const response = await api.getReports();

        if (!isMounted) return;

        // Filter reports for current user
        const filteredReports = response.data.filter(
          (report) =>
            report.userId === currentUser?.id ||
            report.userName === currentUser?.username,
        );

        // Calculate total likes
        const totalLikes = filteredReports.reduce(
          (sum, report) => sum + (report.likeCount || 0),
          0,
        );

        // Batch fetch comment counts
        const commentPromises = filteredReports.map((report) =>
          api
            .getCommentCount(report.id)
            .then((res) => ({
              id: report.id,
              count: res.data.count || 0,
            }))
            .catch(() => ({
              id: report.id,
              count: 0,
            })),
        );

        const commentResults = await Promise.all(commentPromises);

        if (!isMounted) return;

        // Create comment count map
        const commentCountMap = commentResults.reduce((acc, { id, count }) => {
          acc[id] = count;
          return acc;
        }, {});

        const totalComments = commentResults.reduce(
          (sum, { count }) => sum + count,
          0,
        );

        // Update all state at once
        setUserReports(filteredReports);
        setCommentCounts(commentCountMap);
        setStats({
          totalReports: filteredReports.length,
          totalLikes,
          totalComments,
          joinDate: new Date().toISOString(),
        });
      } catch (error) {
        if (isMounted) {
          console.error("Error fetching user data:", error);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchUserData();

    return () => {
      isMounted = false;
    };
  }, [currentUser, navigate]);

  // Memoized stat cards
  const statCards = useMemo(
    () => [
      {
        id: "reports-stat",
        icon: FileText,
        label: "Reports",
        value: stats.totalReports,
        color: "text-orange-500",
        bg: "bg-orange-50",
        border: "border-orange-100",
      },
      {
        id: "likes-stat",
        icon: Heart,
        label: "Likes",
        value: stats.totalLikes,
        color: "text-rose-500",
        bg: "bg-rose-50",
        border: "border-rose-100",
      },
      {
        id: "comments-stat",
        icon: MessageCircle,
        label: "Comments",
        value: stats.totalComments,
        color: "text-blue-500",
        bg: "bg-blue-50",
        border: "border-blue-100",
      },
    ],
    [stats.totalReports, stats.totalLikes, stats.totalComments],
  );

  // Memoized processed reports
  const processedReports = useMemo(() => {
    return userReports.map((report) => ({
      ...report,
      commentCount: commentCounts[report.id] || 0,
      timeAgo: getTimeAgo(report.createdAt),
      categoryColor: getCategoryColor(report.category),
    }));
  }, [userReports, commentCounts, getTimeAgo, getCategoryColor]);

  // Handlers
  const handleLogout = useCallback(() => {
    authService.logout();
    navigate("/login");
  }, [navigate]);

  const handleTabChange = useCallback((tabId) => {
    setActiveTab(tabId);
  }, []);

  const handleDeleteAccount = useCallback(() => {
    if (
      window.confirm(
        "Are you sure you want to delete your account? This action cannot be undone.",
      )
    ) {
      // Implement actual account deletion here
      alert("Account deletion would be implemented here");
    }
  }, []);

  const handleNavigateToCreate = useCallback(() => {
    navigate("/create");
  }, [navigate]);

  const handleNavigateToFeed = useCallback(() => {
    navigate("/feed");
  }, [navigate]);

  const handleNavigateToReport = useCallback(
    (reportId) => {
      navigate(`/report/${reportId}`);
    },
    [navigate],
  );

  if (!currentUser) return null;

  const tabs = useMemo(
    () => [
      { id: "reports", icon: FileText, label: "My Reports" },
      { id: "likes", icon: Heart, label: "Liked Reports" },
      { id: "comments", icon: MessageCircle, label: "Comments" },
    ],
    [],
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Profile Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 mb-6 overflow-hidden">
          {/* Cover with Logout */}
          <div className="h-36 bg-gradient-to-r from-orange-400 to-amber-500 relative">
            <button
              onClick={handleLogout}
              className="absolute top-4 right-4 bg-white/90 hover:bg-white text-gray-700 px-4 py-2 rounded-xl text-sm font-medium flex items-center space-x-2 shadow-sm transition-all"
              aria-label="Sign out"
            >
              <LogOut size={16} />
              <span>Sign out</span>
            </button>
          </div>

          {/* Profile Section */}
          <div className="px-6 pb-6">
            {/* Avatar and Name */}
            <div className="flex items-end -mt-12 mb-6">
              <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-orange-400 to-amber-500 border-4 border-white shadow-lg flex items-center justify-center text-white">
                <span className="text-3xl font-bold">
                  {currentUser.username?.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="ml-4 mb-1">
                <h1 className="text-2xl font-bold text-gray-900">
                  {currentUser.username}
                </h1>
                <div className="flex items-center space-x-3 text-sm text-gray-500 mt-1">
                  <span className="flex items-center space-x-1">
                    <Calendar size={14} />
                    <span>
                      Joined{" "}
                      {new Date().toLocaleDateString("en-US", {
                        month: "short",
                        year: "numeric",
                      })}
                    </span>
                  </span>
                  <span className="w-1 h-1 bg-gray-300 rounded-full"></span>
                  <span className="flex items-center space-x-1">
                    <Award size={14} />
                    <span>Member</span>
                  </span>
                </div>
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {statCards.map((stat) => {
                const Icon = stat.icon;
                return (
                  <div
                    key={stat.id}
                    className={`${stat.bg} ${stat.border} border rounded-xl p-5 transition-all hover:shadow-md`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">
                          {stat.label}
                        </p>
                        <p className={`text-2xl font-bold ${stat.color} mt-1`}>
                          {stat.value}
                        </p>
                      </div>
                      <div
                        className={`${stat.color} ${stat.bg} p-3 rounded-xl`}
                      >
                        <Icon size={24} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
          {/* Tabs */}
          <div className="border-b border-gray-100 px-6">
            <nav className="flex space-x-8" aria-label="Profile tabs">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => handleTabChange(tab.id)}
                    className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 transition-colors ${
                      isActive
                        ? "border-orange-500 text-orange-600"
                        : "border-transparent text-gray-500 hover:text-gray-700"
                    }`}
                    aria-current={isActive ? "page" : undefined}
                  >
                    <Icon size={18} />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {loading && activeTab === "reports" ? (
              <div className="flex justify-center py-16" aria-label="Loading">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-orange-500 border-t-transparent"></div>
              </div>
            ) : (
              <>
                {/* Reports Tab */}
                {activeTab === "reports" && (
                  <div className="space-y-4">
                    {processedReports.length === 0 ? (
                      <div className="text-center py-16">
                        <div className="w-20 h-20 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                          <FileText className="w-10 h-10 text-gray-400" />
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">
                          No reports yet
                        </h3>
                        <p className="text-gray-500 mb-6">
                          Share your first report with the community
                        </p>
                        <button
                          onClick={handleNavigateToCreate}
                          className="inline-flex items-center space-x-2 px-6 py-3 bg-orange-500 text-white rounded-xl hover:bg-orange-600 transition-colors shadow-sm"
                        >
                          <FileText size={18} />
                          <span>Create Report</span>
                        </button>
                      </div>
                    ) : (
                      processedReports.map((report) => (
                        <div
                          key={report.id}
                          onClick={() => handleNavigateToReport(report.id)}
                          className="group border border-gray-100 rounded-xl p-5 hover:border-orange-200 hover:shadow-sm transition-all cursor-pointer"
                          role="button"
                          tabIndex={0}
                          onKeyPress={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              handleNavigateToReport(report.id);
                            }
                          }}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center space-x-3 mb-3">
                                <span
                                  className={`px-3 py-1 rounded-full text-xs font-medium border ${report.categoryColor}`}
                                >
                                  {report.category}
                                </span>
                                <span className="flex items-center space-x-1 text-xs text-gray-400">
                                  <Clock size={12} />
                                  <span>{report.timeAgo}</span>
                                </span>
                              </div>
                              <h3 className="font-semibold text-gray-900 text-lg mb-2 group-hover:text-orange-600 transition-colors">
                                {report.title}
                              </h3>
                              <p className="text-gray-600 text-sm line-clamp-2 mb-4">
                                {report.description}
                              </p>
                              <div className="flex items-center space-x-6 text-xs">
                                <span className="flex items-center space-x-1.5 text-gray-500">
                                  <Heart
                                    size={14}
                                    className={
                                      report.likeCount > 0
                                        ? "text-rose-500"
                                        : "text-gray-400"
                                    }
                                  />
                                  <span>{report.likeCount || 0}</span>
                                </span>
                                <span className="flex items-center space-x-1.5 text-gray-500">
                                  <MessageCircle size={14} />
                                  <span>{report.commentCount}</span>
                                </span>
                                <span className="flex items-center space-x-1.5 text-gray-500">
                                  <MapPin size={14} />
                                  <span>{report.location}</span>
                                </span>
                              </div>
                            </div>
                            <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-orange-400 transition-colors" />
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {/* Likes Tab */}
                {activeTab === "likes" && (
                  <div className="text-center py-16">
                    <div className="w-20 h-20 bg-rose-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                      <Heart className="w-10 h-10 text-rose-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      Liked reports
                    </h3>
                    <p className="text-gray-500">
                      Reports you like will show up here
                    </p>
                    <button
                      onClick={handleNavigateToFeed}
                      className="mt-6 text-orange-500 hover:text-orange-600 font-medium inline-flex items-center space-x-1"
                    >
                      <span>Browse feed</span>
                      <ChevronRight size={16} />
                    </button>
                  </div>
                )}

                {/* Comments Tab */}
                {activeTab === "comments" && (
                  <div className="text-center py-16">
                    <div className="w-20 h-20 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                      <MessageCircle className="w-10 h-10 text-blue-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      Your comments
                    </h3>
                    <p className="text-gray-500">
                      Comments you've made will appear here
                    </p>
                    <button
                      onClick={handleNavigateToFeed}
                      className="mt-6 text-orange-500 hover:text-orange-600 font-medium inline-flex items-center space-x-1"
                    >
                      <span>Start commenting</span>
                      <ChevronRight size={16} />
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Settings Section */}
        <div className="mt-6 bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center space-x-3 mb-4">
            <Settings className="w-5 h-5 text-gray-400" />
            <h2 className="text-sm font-medium text-gray-900">
              Account Settings
            </h2>
          </div>
          <button
            onClick={handleDeleteAccount}
            className="text-sm text-red-600 hover:text-red-700 flex items-center space-x-2"
            aria-label="Delete account"
          >
            <User size={16} />
            <span>Delete account</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default Profile;
