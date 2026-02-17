import React, { useState, useEffect, useCallback, useRef } from "react";
import * as api from "../services/api";
import { useNavigate } from "react-router-dom";
import { authService } from "../services/auth";
import Header from "../components/Header";
import CommentSection from "../components/CommentSection";

// Icons
const UpvoteIcon = ({ filled }) => (
  <svg
    className={`w-6 h-6 transition-colors ${
      filled ? "text-orange-500" : "text-gray-400 hover:text-orange-500"
    }`}
    fill={filled ? "currentColor" : "none"}
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M5 15l7-7 7 7"
    />
  </svg>
);

const ShareIcon = () => (
  <svg
    className="w-5 h-5 text-gray-400 group-hover:text-gray-600"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
    />
  </svg>
);

const MenuIcon = () => (
  <svg
    className="w-5 h-5 text-gray-400 group-hover:text-gray-600"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z"
    />
  </svg>
);

const Feed = () => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState("hot");
  const [likedReports, setLikedReports] = useState({});
  const [commentCounts, setCommentCounts] = useState({});

  const observer = useRef();
  const navigate = useNavigate();
  const currentUser = authService.getCurrentUser();

  // Calculate hot score based on likes and recency
  const calculateHotScore = (report) => {
    const likes = report.likeCount || 0;
    const createdAt = new Date(report.createdAt).getTime();
    const now = new Date().getTime();
    const ageInHours = (now - createdAt) / (1000 * 60 * 60);

    // Reddit-style hot algorithm: score / (age + 2)^1.5
    // This gives higher scores to newer posts with more likes
    return likes / Math.pow(ageInHours + 2, 1.5);
  };

  const fetchReports = async () => {
    if (loading || !hasMore) return;

    try {
      setLoading(true);
      const response = await api.getReports();

      let sortedReports = [...response.data];

      // Apply different sorting algorithms based on filter
      switch (filter) {
        case "hot":
          // Hot: Combination of likes and recency
          sortedReports.sort((a, b) => {
            const scoreA = calculateHotScore(a);
            const scoreB = calculateHotScore(b);
            return scoreB - scoreA;
          });
          break;

        case "new":
          // New: Simply by creation date (newest first)
          sortedReports.sort(
            (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
          );
          break;

        case "top":
          // Top: All-time highest likes
          sortedReports.sort((a, b) => (b.likeCount || 0) - (a.likeCount || 0));
          break;

        default:
          break;
      }

      // Initialize liked status for new reports
      const newLikedStatus = {};
      sortedReports.forEach((report) => {
        newLikedStatus[report.id] = false;
      });
      setLikedReports((prev) => ({ ...prev, ...newLikedStatus }));

      // Pagination
      const startIndex = (page - 1) * 10;
      const endIndex = page * 10;

      if (page === 1) {
        setReports(sortedReports.slice(0, 10));
      } else {
        setReports((prev) => [
          ...prev,
          ...sortedReports.slice(startIndex, endIndex),
        ]);
      }

      setHasMore(sortedReports.length > endIndex);

      // Fetch comment counts for new reports
      sortedReports.slice(startIndex, endIndex).forEach((report) => {
        api
          .getCommentCount(report.id)
          .then((response) => {
            setCommentCounts((prev) => ({
              ...prev,
              [report.id]: response.data.count,
            }));
          })
          .catch((err) => console.error("Error fetching comment count:", err));
      });
    } catch (error) {
      console.error("Error fetching reports:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [page, filter]);

  const lastReportElementRef = useCallback(
    (node) => {
      if (loading) return;
      if (observer.current) observer.current.disconnect();

      observer.current = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && hasMore) {
          setPage((prevPage) => prevPage + 1);
        }
      });

      if (node) observer.current.observe(node);
    },
    [loading, hasMore],
  );

  const handleLike = async (reportId) => {
    if (!currentUser) {
      alert("Please login to like reports");
      navigate("/login");
      return;
    }

    try {
      const isLiked = likedReports[reportId];
      const report = reports.find((r) => r.id === reportId);

      if (isLiked) {
        await api.unlikeReport(reportId);
      } else {
        await api.likeReport(reportId);
      }

      // Update local state
      setReports((prev) =>
        prev.map((report) =>
          report.id === reportId
            ? {
                ...report,
                likeCount: isLiked
                  ? report.likeCount - 1
                  : report.likeCount + 1,
              }
            : report,
        ),
      );

      setLikedReports((prev) => ({
        ...prev,
        [reportId]: !isLiked,
      }));

      // If on "hot" or "top" filter, resort the reports
      if (filter === "hot" || filter === "top") {
        setReports((prev) => {
          const updatedReports = [...prev];
          if (filter === "hot") {
            updatedReports.sort(
              (a, b) => calculateHotScore(b) - calculateHotScore(a),
            );
          } else if (filter === "top") {
            updatedReports.sort(
              (a, b) => (b.likeCount || 0) - (a.likeCount || 0),
            );
          }
          return updatedReports;
        });
      }
    } catch (error) {
      console.error("Error liking report:", error);
      alert("Failed to process like");
    }
  };

  const handleCommentUpdate = (reportId, newCount) => {
    setCommentCounts((prev) => ({
      ...prev,
      [reportId]: newCount,
    }));
  };

  const getTimeAgo = (dateString) => {
    const now = new Date();
    const past = new Date(dateString);
    const diffInSeconds = Math.floor((now - past) / 1000);

    if (diffInSeconds < 60) return `${diffInSeconds} seconds ago`;
    if (diffInSeconds < 3600)
      return `${Math.floor(diffInSeconds / 60)} minutes ago`;
    if (diffInSeconds < 86400)
      return `${Math.floor(diffInSeconds / 3600)} hours ago`;
    if (diffInSeconds < 2592000)
      return `${Math.floor(diffInSeconds / 86400)} days ago`;
    if (diffInSeconds < 31536000)
      return `${Math.floor(diffInSeconds / 2592000)} months ago`;
    return `${Math.floor(diffInSeconds / 31536000)} years ago`;
  };

  const getCategoryColor = (category) => {
    switch (category) {
      case "Issue":
        return "bg-red-100 text-red-800 border border-red-200";
      case "Request":
        return "bg-green-100 text-green-800 border border-green-200";
      case "Incident":
        return "bg-orange-100 text-orange-800 border border-orange-200";
      default:
        return "bg-gray-100 text-gray-800 border border-gray-200";
    }
  };

  // Get filter description
  const getFilterDescription = () => {
    switch (filter) {
      case "hot":
        return "Trending now • Based on likes and recency";
      case "new":
        return "Latest • Newest reports first";
      case "top":
        return "Top • All-time highest liked";
      default:
        return "";
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header
        filter={filter}
        setFilter={setFilter}
        setPage={setPage}
        setReports={setReports}
      />

      <main className="max-w-4xl mx-auto px-4 py-6">
        {/* Filter Description */}
        <div className="mb-4 px-1">
          <p className="text-sm text-gray-500 italic">
            {getFilterDescription()}
          </p>
        </div>

        <div className="space-y-4">
          {reports.map((report, index) => (
            <article
              key={report.id}
              ref={index === reports.length - 1 ? lastReportElementRef : null}
              className="bg-white rounded-xl border border-gray-200 hover:border-gray-300 transition-all hover:shadow-md"
            >
              <div className="flex">
                {/* Vote Sidebar */}
                <div className="w-14 bg-gradient-to-b from-gray-50 to-gray-100 rounded-l-xl flex flex-col items-center py-4 space-y-2">
                  <button
                    onClick={() => handleLike(report.id)}
                    className={`p-1.5 rounded-lg transition-all ${
                      likedReports[report.id]
                        ? "bg-orange-100"
                        : "hover:bg-gray-200"
                    }`}
                  >
                    <UpvoteIcon filled={likedReports[report.id]} />
                  </button>
                  <span className="text-sm font-bold text-gray-700">
                    {report.likeCount || 0}
                  </span>
                  <div className="w-4 h-0.5 bg-gray-300 rounded-full"></div>
                </div>

                {/* Content */}
                <div className="flex-1 p-5">
                  {/* Header Metadata */}
                  <div className="flex items-center flex-wrap gap-2 text-xs text-gray-500 mb-3">
                    <span
                      className={`px-2.5 py-1 rounded-full text-xs font-medium ${getCategoryColor(
                        report.category,
                      )}`}
                    >
                      {report.category}
                    </span>
                    <span className="text-gray-300">•</span>
                    <span className="font-medium text-gray-600">
                      Posted by {report.userName || "Anonymous"}
                    </span>
                    <span className="text-gray-300">•</span>
                    <span>{getTimeAgo(report.createdAt)}</span>

                    {/* Show hot score indicator for hot filter */}
                    {filter === "hot" && (
                      <>
                        <span className="text-gray-300">•</span>
                        <span className="text-orange-500 font-medium">
                          🔥 {calculateHotScore(report).toFixed(1)} hot score
                        </span>
                      </>
                    )}
                  </div>

                  {/* Title */}
                  <h2
                    className="text-xl font-semibold text-gray-900 mb-3 cursor-pointer hover:text-orange-500 transition-colors"
                    onClick={() => navigate(`/report/${report.id}`)}
                  >
                    {report.title}
                  </h2>

                  {/* Description Preview */}
                  <p className="text-gray-600 mb-4 line-clamp-3 leading-relaxed">
                    {report.description}
                  </p>

                  {/* Location */}
                  <div className="flex items-center space-x-2 text-sm text-gray-500 mb-4 bg-gray-50 px-3 py-2 rounded-lg w-fit">
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                    </svg>
                    <span className="font-medium">{report.location}</span>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center space-x-6 text-sm border-t border-gray-100 pt-4">
                    <button
                      className="group flex items-center space-x-2 text-gray-500 hover:text-gray-700 transition-colors"
                      onClick={() => {
                        const commentSection = document.getElementById(
                          `comments-${report.id}`,
                        );
                        if (commentSection) {
                          commentSection.scrollIntoView({ behavior: "smooth" });
                        }
                      }}
                    >
                      <svg
                        className="w-5 h-5 text-gray-400 group-hover:text-gray-600"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                        />
                      </svg>
                      <span className="font-medium">
                        {commentCounts[report.id] || 0} Comments
                      </span>
                    </button>

                    <button className="group flex items-center space-x-2 text-gray-500 hover:text-gray-700 transition-colors">
                      <ShareIcon />
                      <span className="font-medium">Share</span>
                    </button>

                    <button className="group flex items-center space-x-2 text-gray-500 hover:text-gray-700 transition-colors ml-auto">
                      <MenuIcon />
                    </button>
                  </div>

                  {/* Comment Section */}
                  <div id={`comments-${report.id}`} className="mt-4">
                    <CommentSection
                      reportId={report.id}
                      commentCount={commentCounts[report.id] || 0}
                      onCommentUpdate={(newCount) =>
                        handleCommentUpdate(report.id, newCount)
                      }
                    />
                  </div>
                </div>
              </div>
            </article>
          ))}

          {/* Loading Indicator */}
          {loading && (
            <div className="flex flex-col items-center justify-center py-12 bg-white rounded-xl border border-gray-200">
              <div className="animate-spin rounded-full h-10 w-10 border-3 border-orange-500 border-t-transparent mb-4"></div>
              <p className="text-gray-500 font-medium">
                Loading more reports...
              </p>
            </div>
          )}

          {/* End of Feed */}
          {!hasMore && reports.length > 0 && (
            <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
              <div className="text-5xl mb-4">🎉</div>
              <p className="text-xl font-semibold text-gray-800 mb-2">
                You've reached the end!
              </p>
              <p className="text-gray-500">No more reports to load</p>
            </div>
          )}

          {/* Empty State */}
          {!loading && reports.length === 0 && (
            <div className="text-center py-20 bg-white rounded-xl border border-gray-200 shadow-sm">
              <div className="text-7xl mb-6">📭</div>
              <h3 className="text-2xl font-bold text-gray-800 mb-3">
                No reports yet
              </h3>
              <p className="text-gray-600 mb-8 text-lg max-w-md mx-auto">
                Be the first to share something with the community!
              </p>
              <button
                onClick={() => navigate("/create")}
                className="bg-orange-500 text-white px-8 py-3 rounded-xl font-semibold hover:bg-orange-600 transition-colors shadow-md hover:shadow-lg transform hover:-translate-y-0.5 transition-all"
              >
                Create First Report
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Feed;
