import { useState } from "react";
import { useGetClassAssignmentsQuery, useDeleteAssignmentMutation } from "@/redux/api/classGroup/assignmentApi";
import SubmitAssignmentCard from "../components/class-management/AssignmentPanel/StudentAssingmentPanel/SubmitAssignmentCard";
import UpdateAssignmentDialog from "../components/class-management/AssignmentPanel/StudentAssingmentPanel/UpdateAssignmentDialog";
import StudentAssignmentList from "../components/class-management/AssignmentPanel/StudentAssingmentPanel/StudentAssignmentList";
import { toast } from 'react-hot-toast';
import { useParams } from "react-router-dom";
import { selectCurrentUser } from "@/redux/slices/authSlice";
import { useSelector } from "react-redux";
import { RefreshCw } from "lucide-react";
import DashboardLayout from "@/components/admin/DashboardLayout";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

export default function StudentAssignmentPanelPage() {
  const { classId } = useParams();
  const currentUser = useSelector(selectCurrentUser);
  const userId = currentUser?._id;

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [limit] = useState(10); // You can make this configurable if needed

  const [submissionData, setSubmissionData] = useState({
    assignmentTitle: "",
    assignmentDescription: "",
    file: null,
  });
  const [updateAssignmentData, setUpdateAssignmentData] = useState({
    assignmentTitle: "",
    assignmentDescription: "",
  });
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);
  const [showUpdateDialog, setShowUpdateDialog] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [deletingIds, setDeletingIds] = useState(new Set());

  // Updated query with pagination params
  const {
    data: assignmentsData,
    isLoading: isLoadingAssignments,
    error: assignmentsError,
    refetch: refetchAssignments
  } = useGetClassAssignmentsQuery({
    classId,
    page: currentPage,
    limit
  });

  const [deleteAssignment] = useDeleteAssignmentMutation();

  const handleDeleteAssignment = async (assignmentId) => {
    setDeletingIds((prev) => new Set([...prev, assignmentId]));
    try {
      await deleteAssignment({ id: assignmentId, classId }).unwrap();
      toast.success(
        <div>
          <div className="font-bold">Alhamdulillah</div>
          <div>Assignment deleted successfully</div>
        </div>
      );

      // Check if current page becomes empty after deletion
      const remainingItems = (assignmentsData?.total || 1) - 1;
      const maxPage = Math.ceil(remainingItems / limit);
      if (currentPage > maxPage && maxPage > 0) {
        setCurrentPage(maxPage);
      }
    } catch (error) {
      toast.error(
        <div>
          <div className="font-bold">Error</div>
          <div>{error.data?.message || "Failed to delete assignment"}</div>
        </div>
      );
    } finally {
      setDeletingIds((prev) => {
        const newSet = new Set(prev);
        newSet.delete(assignmentId);
        return newSet;
      });
    }
  };

  const openUpdateDialog = (assignment) => {
    setSelectedAssignment(assignment);
    setUpdateAssignmentData({
      assignmentTitle: assignment.assignmentTitle,
      assignmentDescription: assignment.assignmentDescription,
    });
    setShowUpdateDialog(true);
  };

  // Pagination handlers
  const handlePreviousPage = () => {
    setCurrentPage((prev) => Math.max(prev - 1, 1));
  };

  const handleNextPage = () => {
    setCurrentPage((prev) => Math.min(prev + 1, assignmentsData?.totalPages || 1));
  };

  const handlePageClick = (pageNumber) => {
    setCurrentPage(pageNumber);
  };

  if (isLoadingAssignments) {
    return (
      <div className="flex items-center justify-center dark:bg-gray-100 bg-gray-800 h-screen w-full">
        <RefreshCw className="h-8 w-8 animate-spin text-white dark:text-gray-900" />
      </div>
    );
  }

  if (assignmentsError) {
    return (
      <div className="card md:mt-0 mt-8">
        <div className="card-content p-6">
          <div className="text-center">
            <p className="text-red-600 mb-4">Failed to load assignments</p>
            <button onClick={refetchAssignments} className="btn btn-outline btn-sm">
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  const assignments = assignmentsData?.assignments || [];
  const totalPages = assignmentsData?.totalPages || 1;
  const total = assignmentsData?.total || 0;

  // Generate page numbers for pagination
  const generatePageNumbers = () => {
    const pages = [];
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
console.log('Bismillah')
  return (
    <DashboardLayout type="student">
      <div className="space-y-6 md:mt-0 mt-8">
        <SubmitAssignmentCard
          classId={classId}
          submissionData={submissionData}
          setSubmissionData={setSubmissionData}
          showSubmitDialog={showSubmitDialog}
          setShowSubmitDialog={setShowSubmitDialog}
        />
        <UpdateAssignmentDialog
          classId={classId}
          showUpdateDialog={showUpdateDialog}
          setShowUpdateDialog={setShowUpdateDialog}
          updateAssignmentData={updateAssignmentData}
          setUpdateAssignmentData={setUpdateAssignmentData}
          selectedAssignment={selectedAssignment}
          setSelectedAssignment={setSelectedAssignment}
        />

        <StudentAssignmentList
          assignments={assignments}
          canManage={false}
          userId={userId}
          openUpdateDialog={openUpdateDialog}
          handleDeleteAssignment={handleDeleteAssignment}
          deletingIds={deletingIds}
        />

        {/* Pagination Component */}
        {totalPages > 1 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 bg-[#1a2332] dark:bg-[#eff0f3] border border-gray-600 dark:border-gray-300 rounded-lg">
            <div className="text-sm text-[#eff0f3] dark:text-[#1a2332] opacity-70">
              Showing {((currentPage - 1) * limit) + 1} to {Math.min(currentPage * limit, total)} of {total} assignments
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
                        className={`min-w-[40px] ${currentPage === pageNum
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
    </DashboardLayout>
  );
}