import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useUpdateAssignmentMutation } from "@/redux/api/classGroup/assignmentApi";
import { toast } from "react-hot-toast";

export default function UpdateAssignmentDialog({
  classId,
  showUpdateDialog,
  setShowUpdateDialog,
  updateAssignmentData,
  setUpdateAssignmentData,
  selectedAssignment,
  setSelectedAssignment,
}) {
  const [updateAssignment, { isLoading: isUpdating }] = useUpdateAssignmentMutation();

  const handleUpdateAssignment = async () => {
    if (!updateAssignmentData.assignmentTitle && !updateAssignmentData.assignmentDescription) {
      toast.error(
        <div>
          <div className="font-bold">Error</div>
          <div>Please provide at least one field to update</div>
        </div>
      );
      return;
    }

    if (updateAssignmentData.assignmentDescription?.length > 1000) {
      toast.error(
        <div>
          <div className="font-bold">Error</div>
          <div>Description must be 1000 characters or less</div>
        </div>
      );
      return;
    }

    try {
      await updateAssignment({
        id: selectedAssignment._id,
        updateData: updateAssignmentData,
        classId,
      }).unwrap();
      toast.success(
        <div>
          <div className="font-bold">Alhamdulillah</div>
          <div>Assignment updated successfully</div>
        </div>
      );
      setUpdateAssignmentData({ assignmentTitle: "", assignmentDescription: "" });
      setShowUpdateDialog(false);
      setSelectedAssignment(null);
    } catch (error) {
      toast.error(
        <div>
          <div className="font-bold">Error</div>
          <div>{error.data?.message || "Failed to update assignment"}</div>
        </div>
      );
    }
  };

  return (
    <Dialog open={showUpdateDialog} onOpenChange={setShowUpdateDialog}>
      <DialogContent className="w-full max-w-md bg-gray-900 dark:bg-white border border-gray-700 dark:border-gray-300 rounded-xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-gray-100 dark:text-gray-900">
            Update Assignment
          </DialogTitle>
          <DialogDescription className="text-gray-400 dark:text-gray-600">
            Update the assignment details
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label htmlFor="updateAssignmentTitle" className="text-sm font-medium text-gray-300 dark:text-gray-700">
              Assignment Title
            </Label>
            <Input
              id="updateAssignmentTitle"
              placeholder="Enter assignment title"
              value={updateAssignmentData.assignmentTitle}
              onChange={(e) =>
                setUpdateAssignmentData({
                  ...updateAssignmentData,
                  assignmentTitle: e.target.value,
                })
              }
              className="w-full border-gray-600 dark:border-gray-300 rounded-md focus:ring-2 focus:ring-blue-400 dark:focus:ring-blue-500 text-gray-100 dark:text-gray-900"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="updateAssignmentDescription" className="text-sm font-medium text-gray-300 dark:text-gray-700">
              Description
            </Label>
            <Textarea
              id="updateAssignmentDescription"
              placeholder="Enter assignment description (max 1000 characters)"
              value={updateAssignmentData.assignmentDescription}
              onChange={(e) =>
                setUpdateAssignmentData({
                  ...updateAssignmentData,
                  assignmentDescription: e.target.value,
                })
              }
              maxLength={1000}
              className="w-full border-gray-600 dark:border-gray-300 rounded-md focus:ring-2 focus:ring-blue-400 dark:focus:ring-blue-500 text-gray-100 dark:text-gray-900"
            />
            <p className="text-sm text-gray-400 dark:text-gray-600 mt-1">
              {updateAssignmentData.assignmentDescription?.length || 0}/1000 characters
            </p>
          </div>

          <Button
            onClick={handleUpdateAssignment}
            disabled={isUpdating}
            className="w-full bg-blue-400 hover:bg-blue-500 dark:bg-blue-600 dark:hover:bg-blue-700 text-gray-900 dark:text-white font-medium py-2 rounded-md transition-colors duration-200 disabled:bg-blue-300 dark:disabled:bg-blue-400 disabled:cursor-not-allowed"
          >
            {isUpdating ? "Updating..." : "Update Assignment"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
