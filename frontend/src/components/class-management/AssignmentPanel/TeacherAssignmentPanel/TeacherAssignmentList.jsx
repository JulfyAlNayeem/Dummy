import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, RefreshCw } from "lucide-react";
import { useGetSubmissionsQuery } from "@/redux/api/classGroup/assignmentApi";

export function AssignmentList({ classId, canManage, openMarkDialog }) {
  const [expandedDescriptions, setExpandedDescriptions] = useState({});
  const [expandedFeedbacks, setExpandedFeedbacks] = useState({});
  const [currentPage, setCurrentPage] = useState(1);
  const limit = 10; // Matches backend default limit
  console.log(classId)
  
  const { data: submissionsData, isLoading: isLoadingSubmissions, error: submissionsError } =
    useGetSubmissionsQuery({ classId, page: currentPage, limit });

  const toggleDescription = (id) => {
    setExpandedDescriptions((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const toggleFeedback = (id) => {
    setExpandedFeedbacks((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const handlePreviousPage = () => {
    setCurrentPage((prev) => Math.max(prev - 1, 1));
  };

  const handleNextPage = () => {
    setCurrentPage((prev) => Math.min(prev + 1, submissionsData?.totalPages || 1));
  };

  const handlePageClick = (pageNumber) => {
    setCurrentPage(pageNumber);
  };

  // Generate page numbers for pagination
  const generatePageNumbers = () => {
    const pages = [];
    const totalPages = submissionsData?.totalPages || 1;
    const maxVisiblePages = 5;
    
    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      const startPage = Math.max(1, currentPage - 2);
      const endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
      
      if (startPage > 1) {
        pages.push(1);
        if (startPage > 2) pages.push('...');
      }
      
      for (let i = startPage; i <= endPage; i++) {
        pages.push(i);
      }
      
      if (endPage < totalPages) {
        if (endPage < totalPages - 1) pages.push('...');
        pages.push(totalPages);
      }
    }
    
    return pages;
  };

  if (isLoadingSubmissions) {
    return (
      <div className="flex items-center justify-center dark:bg-gray-100 bg-gray-800 h-screen w-full">
        <RefreshCw className="h-8 w-8 animate-spin text-white dark:text-gray-900" />
      </div>
    );
  }

  if (submissionsError) {
    return (
      <Card className="bg-[#1a2332] dark:bg-[#eff0f3] border-gray-600 dark:border-gray-300">
        <CardContent className="p-6">
          <p className="text-center text-red-400 dark:text-red-600">Error: {submissionsError.message}</p>
        </CardContent>
      </Card>
    );
  }

  if (!submissionsData || submissionsData?.submissions.length === 0) {
    return (
      <Card className="bg-[#1a2332] dark:bg-[#eff0f3] border-gray-600 dark:border-gray-300">
        <CardContent className="p-6">
          <p className="text-center text-[#eff0f3] dark:text-[#1a2332] opacity-70">No submissions available</p>
        </CardContent>
      </Card>
    );
  }

  const totalPages = submissionsData?.totalPages || 1;
  const total = submissionsData?.total || 0;

  return (
    <div className="space-y-4">
      <Card className="bg-[#1a2332] dark:bg-[#eff0f3] border-gray-600 dark:border-gray-300">
        <CardHeader>
          <CardTitle className="text-[#eff0f3] dark:text-[#1a2332]">Submissions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {submissionsData?.submissions.map((submission) => (
              <div
                key={submission._id}
                className="border border-gray-600 dark:border-gray-300 bg-gray-700 dark:bg-white p-4 rounded-md flex justify-between items-start gap-4"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-semibold text-[#eff0f3] dark:text-[#1a2332] break-words">
                      {submission.assignmentTitle || "Untitled Submission"}
                    </h3>
                    <Badge
                      variant={submission.status === "Approved" ? "default" : "secondary"}
                      className={
                        submission.status === "Approved"
                          ? "bg-green-500 text-white"
                          : "bg-yellow-500 text-gray-900"
                      }
                    >
                      {submission.status || "Pending"}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 mb-2">
                    <p className="text-sm text-[#eff0f3] dark:text-[#1a2332] opacity-70">
                      {submission.userId?.name || "Unknown"}
                    </p>
                    <img
                      src={submission.userId?.image}
                      alt=""
                      className="size-5 rounded-md"
                    />
                  </div>
                  {submission.assignmentDescription && (
                    <div className="mt-2">
                      <p className={`text-[#eff0f3] dark:text-[#1a2332] break-words ${expandedDescriptions[submission._id] ? "" : "truncate"}`}>
                        {expandedDescriptions[submission._id]
                          ? submission.assignmentDescription
                          : `${submission.assignmentDescription.slice(0, 100)}${submission.assignmentDescription.length > 100 ? "..." : ""}`}
                      </p>
                      {submission.assignmentDescription.length > 100 && (
                        <Button
                          variant="link"
                          size="sm"
                          onClick={() => toggleDescription(submission._id)}
                          className="text-blue-400 dark:text-blue-600 p-0 h-auto"
                        >
                          {expandedDescriptions[submission._id] ? "See Less" : "See More"}
                        </Button>
                      )}
                      {submission.feedback && (
                        <div className="mt-2">
                          <p className={`text-sm text-[#eff0f3] dark:text-[#1a2332] opacity-70 break-words ${expandedFeedbacks[submission._id] ? "" : "truncate"}`}>
                            Feedback: {expandedFeedbacks[submission._id]
                              ? submission.feedback
                              : `${submission.feedback.slice(0, 100)}${submission.feedback.length > 100 ? "..." : ""}`}
                          </p>
                          {submission.feedback.length > 100 && (
                            <Button
                              variant="link"
                              size="sm"
                              onClick={() => toggleFeedback(submission._id)}
                              className="text-blue-400 dark:text-blue-600 p-0 h-auto"
                            >
                              {expandedFeedbacks[submission._id] ? "See Less" : "See More"}
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <div className="flex flex-col items-end gap-2 flex-shrink-0">
                  {submission.mark && (
                    <p className="text-sm text-[#eff0f3] dark:text-[#1a2332] opacity-70">
                      Mark: {submission.mark}
                    </p>
                  )}
                  {canManage && (
                    <Button
                      onClick={() => openMarkDialog(submission)}
                      variant="outline"
                      size="sm"
                      className="bg-gray-600 dark:bg-white text-[#eff0f3] dark:text-[#1a2332] border-gray-500 dark:border-gray-300 hover:bg-gray-500 dark:hover:bg-gray-50"
                    >
                      Mark
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Updated Pagination Component */}
      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 bg-[#1a2332] dark:bg-[#eff0f3] border border-gray-600 dark:border-gray-300 rounded-lg">
          <div className="text-sm text-[#eff0f3] dark:text-[#1a2332] opacity-70">
            Showing {((currentPage - 1) * limit) + 1} to {Math.min(currentPage * limit, total)} of {total} submissions
          </div>
          
          <div className="flex items-center space-x-2">
            <Button
              onClick={handlePreviousPage}
              disabled={currentPage === 1}
              variant="outline"
              size="sm"
              className="flex items-center gap-1 bg-gray-600 dark:bg-white text-[#eff0f3] dark:text-[#1a2332] border-gray-500 dark:border-gray-300 hover:bg-gray-500 dark:hover:bg-gray-50 disabled:opacity-50"
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            
            <div className="flex items-center space-x-1">
              {generatePageNumbers().map((pageNum, index) => (
                <div key={index}>
                  {pageNum === '...' ? (
                    <span className="px-3 py-1 text-[#eff0f3] dark:text-[#1a2332] opacity-70">...</span>
                  ) : (
                    <Button
                      onClick={() => handlePageClick(pageNum)}
                      variant={currentPage === pageNum ? "default" : "outline"}
                      size="sm"
                      className={`min-w-[40px] ${
                        currentPage === pageNum
                          ? "bg-[#eff0f3] dark:bg-[#1a2332] text-[#1a2332] dark:text-[#eff0f3] border-[#eff0f3] dark:border-[#1a2332]"
                          : "bg-gray-600 dark:bg-white text-[#eff0f3] dark:text-[#1a2332] border-gray-500 dark:border-gray-300 hover:bg-gray-500 dark:hover:bg-gray-50"
                      }`}
                    >
                      {pageNum}
                    </Button>
                  )}
                </div>
              ))}
            </div>
            
            <Button
              onClick={handleNextPage}
              disabled={currentPage === totalPages}
              variant="outline"
              size="sm"
              className="flex items-center gap-1 bg-gray-600 dark:bg-white text-[#eff0f3] dark:text-[#1a2332] border-gray-500 dark:border-gray-300 hover:bg-gray-500 dark:hover:bg-gray-50 disabled:opacity-50"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}