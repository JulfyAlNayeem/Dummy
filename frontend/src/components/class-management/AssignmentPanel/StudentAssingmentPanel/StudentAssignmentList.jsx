import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function StudentAssignmentList({ 
  assignments, 
  canManage, 
  userId, 
  openUpdateDialog, 
  handleDeleteAssignment, 
  deletingIds 
}) {
  const [expandedDescriptions, setExpandedDescriptions] = useState({});
  const [expandedFeedbacks, setExpandedFeedbacks] = useState({});

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

  if (!assignments || assignments.length === 0) {
    return (
      <Card className="bg-[#1a2332] dark:bg-[#eff0f3] border-gray-600 dark:border-gray-300">
        <CardContent className="p-6 mt-12">
          <p className="text-center text-[#eff0f3] dark:text-[#1a2332] opacity-70">
            No assignments available
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-[#1a2332] dark:bg-[#eff0f3] border-gray-600 dark:border-gray-300">
      <CardHeader>
        <CardTitle className="text-[#eff0f3] dark:text-[#1a2332]">
          Assignments
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {assignments?.map((assignment) => (
            <div
              key={assignment._id}
              className="border border-gray-600 dark:border-gray-300 bg-gray-700 dark:bg-white p-4 rounded-md flex justify-between items-start gap-4"
            >
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold break-words text-[#eff0f3] dark:text-[#1a2332]">
                  {assignment.assignmentTitle || "Untitled Assignment"}
                </h3>
                <div className="mt-2">
                  <p className={`text-sm text-[#eff0f3] dark:text-[#1a2332] opacity-70 break-words ${expandedDescriptions[assignment._id] ? "" : "truncate"}`}>
                    Description: {expandedDescriptions[assignment._id]
                      ? assignment.assignmentDescription || "No description"
                      : `${(assignment.assignmentDescription || "No description").slice(0, 100)}${(assignment.assignmentDescription?.length > 100) ? "..." : ""}`}
                  </p>
                  {assignment.assignmentDescription?.length > 100 && (
                    <Button
                      variant="link"
                      size="sm"
                      onClick={() => toggleDescription(assignment._id)}
                      className="text-blue-400 dark:text-blue-600 p-0 h-auto"
                    >
                      {expandedDescriptions[assignment._id] ? "See Less" : "See More"}
                    </Button>
                  )}
                </div>
                <p className="text-sm text-[#eff0f3] dark:text-[#1a2332] opacity-70">
                  Status: {assignment.status || "Pending"}
                </p>
                {assignment.mark && (
                  <p className="text-sm text-[#eff0f3] dark:text-[#1a2332] opacity-70">
                    Mark: {assignment.mark}
                  </p>
                )}
                {assignment.feedback && (
                  <div className="mt-2">
                    <p className={`text-sm text-[#eff0f3] dark:text-[#1a2332] opacity-70 break-words ${expandedFeedbacks[assignment._id] ? "" : "truncate"}`}>
                      Feedback: {expandedFeedbacks[assignment._id]
                        ? assignment.feedback
                        : `${assignment.feedback.slice(0, 100)}${assignment.feedback.length > 100 ? "..." : ""}`}
                    </p>
                    {assignment.feedback.length > 100 && (
                      <Button
                        variant="link"
                        size="sm"
                        onClick={() => toggleFeedback(assignment._id)}
                        className="text-blue-400 dark:text-blue-600 p-0 h-auto"
                      >
                        {expandedFeedbacks[assignment._id] ? "See Less" : "See More"}
                      </Button>
                    )}
                  </div>
                )}
              </div>
              <div className="flex gap-2 flex-shrink-0">
                {canManage ? (
                  <Button
                    onClick={() => openMarkDialog(assignment)}
                    variant="outline"
                    size="sm"
                    className="bg-gray-600 dark:bg-white text-[#eff0f3] dark:text-[#1a2332] border-gray-500 dark:border-gray-300 hover:bg-gray-500 dark:hover:bg-gray-50"
                  >
                    Mark Submission
                  </Button>
                ) : (
                  <>
                    {!assignment.mark && assignment.userId._id === userId && (
                      <>
                        <Button
                          onClick={() => openUpdateDialog(assignment)}
                          variant="outline"
                          size="sm"
                          className="bg-gray-600 dark:bg-white text-[#eff0f3] dark:text-[#1a2332] border-gray-500 dark:border-gray-300 hover:bg-gray-500 dark:hover:bg-gray-50"
                        >
                          Update
                        </Button>
                        <Button
                          onClick={() => handleDeleteAssignment(assignment._id)}
                          variant="destructive"
                          size="sm"
                          disabled={deletingIds.has(assignment._id)}
                          className="bg-red-600 dark:bg-red-600 text-white hover:bg-red-700 dark:hover:bg-red-700 disabled:opacity-50"
                        >
                          {deletingIds.has(assignment._id) ? "Deleting..." : "Delete"}
                        </Button>
                      </>
                    )}
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}