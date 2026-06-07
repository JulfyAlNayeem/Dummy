// @ts-nocheck
import { useState } from "react";
import {
  ArrowLeft,
  Check,
  X,
  Clock,
  ChevronDown,
  ChevronUp,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  useGetSubmissionsQuery,
  useReviewSubmissionMutation,
  useGetSubmissionByIdQuery,
} from "@/redux/api/formApi";
import toast from "react-hot-toast";

/**
 * Submission Reviewer — for the assigner (reviewer) to review submissions.
 * Lists submissions, allows per-question accept/reject.
 */
const SubmissionReviewer = ({ assignment, onClose }: any): JSX.Element => {
  const [selectedSubmissionId, setSelectedSubmissionId] = useState<string | null>(null);

  // Fetch submissions for this assignment
  const { data: submissionsData, isLoading }: any = useGetSubmissionsQuery({
    assignmentId: assignment._id,
  });

  const submissions = submissionsData?.submissions || [];

  if (selectedSubmissionId) {
    return (
      <SubmissionDetail
        submissionId={selectedSubmissionId}
        assignment={assignment}
        onBack={() => setSelectedSubmissionId(null)}
        onClose={onClose}
      />
    );
  }

  return (
    <div className="flex flex-col h-full max-w-full bg-gray-900 text-gray-100">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b border-gray-700">
        <Button
          variant="ghost"
          size="sm"
          className="p-2 hover:bg-white/10"
          onClick={onClose}
        >
          <ArrowLeft className="h-5 w-5 text-gray-100" />
        </Button>
        <h2 className="text-lg font-semibold text-gray-100 flex-1">
          Review Submissions
        </h2>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {isLoading ? (
          <p className="text-gray-400 text-sm text-center py-8">Loading...</p>
        ) : submissions.length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-12">
            No submissions yet.
          </p>
        ) : (
          submissions.map((sub) => (
            <button
              key={sub._id}
              className="w-full flex items-center justify-between bg-gray-800/60 rounded-lg px-4 py-3 hover:bg-gray-800 transition-colors text-left"
              onClick={() => setSelectedSubmissionId(sub._id)}
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <User className="h-4 w-4 text-gray-400 flex-shrink-0" />
                <div className="min-w-0">
                  <span className="text-gray-100 text-sm block truncate capitalize">
                    {sub.submittedBy?.name || "User"}
                  </span>
                  <span className="text-gray-400 text-xs">
                    {sub.dueDate ? new Date(sub.dueDate).toLocaleDateString() : "No date"}
                  </span>
                </div>
              </div>
              <StatusBadge status={sub.status} />
            </button>
          ))
        )}
      </div>
    </div>
  );
};

/**
 * Detail view for a single submission with per-question review.
 */
const SubmissionDetail = ({ submissionId, assignment, onBack, onClose }: any): JSX.Element => {
    const { data: subData, isLoading }: any = useGetSubmissionByIdQuery(submissionId);
    const [reviewSubmission, { isLoading: isReviewing }]: any =
    useReviewSubmissionMutation();

  const submission = subData?.submission;
  const form = assignment.form;
  const fields = form?.fields || [];

  // Local review state
  const [reviews, setReviews] = useState({});

  const setFieldReview = (fieldId, status, note = "") => {
    setReviews((prev) => ({
      ...prev,
      [fieldId]: { status, note: prev[fieldId]?.note || note },
    }));
  };

  const setFieldNote = (fieldId, note) => {
    setReviews((prev) => ({
      ...prev,
      [fieldId]: { ...prev[fieldId], note },
    }));
  };

  const handleSubmitReview = async () => {
    const reviewArray = Object.entries(reviews).map(([fieldId, r]) => ({
      fieldId,
      status: r.status,
      note: r.note || "",
    }));

    if (reviewArray.length === 0) {
      return toast.error("Review at least one answer.");
    }

    try {
      await reviewSubmission({
        submissionId,
        reviews: reviewArray,
      }).unwrap();
      toast.success("Review submitted!");
      onBack();
    } catch (err) {
      toast.error(err?.data?.message || "Failed to submit review.");
    }
  };

  if (isLoading || !submission) {
    return (
      <div className="flex flex-col h-full max-w-full bg-gray-900 items-center justify-center">
        <p className="text-gray-400">Loading submission...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full max-w-full bg-gray-900 text-gray-100">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b border-gray-700">
        <Button
          variant="ghost"
          size="sm"
          className="p-2 hover:bg-white/10"
          onClick={onBack}
        >
          <ArrowLeft className="h-5 w-5 text-gray-100" />
        </Button>
        <div className="flex-1">
          <h2 className="text-lg font-semibold text-gray-100">
            Review: {submission.submittedBy?.name || "User"}
          </h2>
          <p className="text-xs text-gray-400">
            {submission.dueDate ? new Date(submission.dueDate).toLocaleDateString() : "No date"}
          </p>
        </div>
        <StatusBadge status={submission.status} />
      </div>

      {/* Answers */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {submission.answers?.map((answer, index) => {
          const field = fields.find(
            (f) => f._id === answer.fieldId
          );
          const currentReview = reviews[answer.fieldId];
          const existingStatus = answer.reviewStatus;

          return (
            <div
              key={answer._id || index}
              className="bg-gray-800/60 rounded-lg p-4 border border-gray-700/50 space-y-3"
            >
              {/* Question */}
              <div className="flex items-start gap-2">
                <span className="text-gray-500 text-sm font-mono w-6 flex-shrink-0">
                  {index + 1}.
                </span>
                <span className="text-gray-300 text-sm">
                  {field?.label || "Question"}
                </span>
              </div>

              {/* Answer */}
              <div className="pl-8">
                <div className="bg-gray-700/50 rounded px-3 py-2 text-gray-100 text-sm">
                  {answer.value === "yes" ? (
                    <span className="text-green-400 font-medium">Yes</span>
                  ) : answer.value === "no" ? (
                    <span className="text-red-400 font-medium">No</span>
                  ) : (
                    answer.value
                  )}
                </div>
                {answer.explanation && (
                  <div className="mt-2 text-xs text-yellow-300/80 bg-yellow-500/10 rounded px-3 py-2">
                    Explanation: {answer.explanation}
                  </div>
                )}
              </div>

              {/* Existing review status */}
              {existingStatus !== "pending" && !currentReview && (
                <div className="pl-8">
                  <StatusBadge status={existingStatus} />
                </div>
              )}

              {/* Review actions */}
              <div className="pl-8 flex items-center gap-2">
                <Button
                  size="sm"
                  variant={currentReview?.status === "accepted" ? "default" : "outline"}
                  className={`text-xs gap-1 ${
                    currentReview?.status === "accepted"
                      ? "bg-green-600 hover:bg-green-700 text-white"
                      : "border-green-600/50 text-green-400 hover:bg-green-500/10"
                  }`}
                  onClick={() => setFieldReview(answer.fieldId, "accepted")}
                >
                  <Check className="h-3 w-3" /> Accept
                </Button>
                <Button
                  size="sm"
                  variant={currentReview?.status === "rejected" ? "default" : "outline"}
                  className={`text-xs gap-1 ${
                    currentReview?.status === "rejected"
                      ? "bg-red-600 hover:bg-red-700 text-white"
                      : "border-red-600/50 text-red-400 hover:bg-red-500/10"
                  }`}
                  onClick={() => setFieldReview(answer.fieldId, "rejected")}
                >
                  <X className="h-3 w-3" /> Reject
                </Button>
              </div>

              {/* Review note (on reject) */}
              {currentReview?.status === "rejected" && (
                <div className="pl-8">
                  <Textarea
                    placeholder="Reason for rejection (optional)"
                    value={currentReview.note || ""}
                    onChange={(e) =>
                      setFieldNote(answer.fieldId, e.target.value)
                    }
                    className="bg-gray-700 border-gray-600 text-gray-100 text-sm min-h-[50px] resize-none"
                    maxLength={500}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="border-t border-gray-700 p-4 flex gap-3 justify-end">
        <Button
          variant="ghost"
          className="text-gray-400 hover:text-gray-100"
          onClick={onBack}
        >
          Cancel
        </Button>
        <Button
          className="bg-blue-600 hover:bg-blue-700 text-white"
          onClick={handleSubmitReview}
          disabled={isReviewing || Object.keys(reviews).length === 0}
        >
          {isReviewing ? "Submitting..." : "Submit Review"}
        </Button>
      </div>
    </div>
  );
};

/**
 * Reusable status badge.
 */
const StatusBadge = ({ status }: { status: string }): JSX.Element => {
  const config = {
    submitted: { label: "Pending", className: "bg-gray-600 text-gray-200", icon: Clock },
    accepted: { label: "Accepted", className: "bg-green-500/20 text-green-400", icon: Check },
    partially_accepted: { label: "Partial", className: "bg-yellow-500/20 text-yellow-400", icon: Clock },
    rejected: { label: "Rejected", className: "bg-red-500/20 text-red-400", icon: X },
    pending: { label: "Pending", className: "bg-gray-600 text-gray-200", icon: Clock },
    not_submitted: { label: "Missing", className: "bg-red-500/20 text-red-400", icon: X },
  };

  const c = config[status] || config.pending;
  const Icon = c.icon;

  return (
    <Badge className={`${c.className} text-[10px] gap-1`}>
      <Icon className="h-3 w-3" />
      {c.label}
    </Badge>
  );
};

export default SubmissionReviewer;
