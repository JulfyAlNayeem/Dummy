import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useCreateAssignmentMutation } from "@/redux/api/classGroup/assignmentApi";
import { toast } from 'react-hot-toast';

export default function CreateAssignmentCard({ classId }) {
  const [createAssignmentData, setCreateAssignmentData] = useState({
    assignmentTitle: "",
    assignmentDescription: "",
  });
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [createAssignment, { isLoading: isCreating }] = useCreateAssignmentMutation();

  const handleCreateAssignment = async () => {
    if (!createAssignmentData.assignmentTitle || !createAssignmentData.assignmentDescription) {
      toast.error(
        <div className="text-gray-100 dark:text-gray-900">
          <div className="font-bold">Error</div>
          <div>Please provide assignment title and description</div>
        </div>
      );
      return;
    }

    if (createAssignmentData.assignmentDescription.length > 1000) {
      toast.error(
        <div className="text-gray-100 dark:text-gray-900">
          <div className="font-bold">Error</div>
          <div>Description must be 1000 characters or less</div>
        </div>
      );
      return;
    }

    try {
      await createAssignment({ ...createAssignmentData, classId }).unwrap();
      toast.success(
        <div className="text-gray-100 dark:text-gray-900">
          <div className="font-bold">Alhamdulillah</div>
          <div>Assignment created successfully</div>
        </div>
      );
      setCreateAssignmentData({ assignmentTitle: "", assignmentDescription: "" });
      setShowCreateDialog(false);
    } catch (error) {
      toast.error(
        <div className="text-gray-100 dark:text-gray-900">
          <div className="font-bold">Error</div>
          <div>{error.data?.message || "Failed to create assignment"}</div>
        </div>
      );
    }
  };

  return (
    <Card className="bg-gray-800 dark:bg-white border-gray-600 dark:border-gray-300">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-gray-100 dark:text-gray-900">
              Create Assignment
            </CardTitle>
            <CardDescription className="text-gray-400 dark:text-gray-600">
              Create a new assignment for the class
            </CardDescription>
          </div>
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button className="bg-blue-400 dark:bg-blue-600 text-gray-100 dark:text-gray-100 hover:bg-blue-500 dark:hover:bg-blue-700">
                Create New
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-gray-800 dark:bg-white border-gray-600 dark:border-gray-300">
              <DialogHeader>
                <DialogTitle className="text-gray-100 dark:text-gray-900">
                  Create Assignment
                </DialogTitle>
                <DialogDescription className="text-gray-400 dark:text-gray-600">
                  Fill in the assignment details and description
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="createAssignmentTitle" className="text-gray-100 dark:text-gray-900">
                    Assignment Title
                  </Label>
                  <Input
                    id="createAssignmentTitle"
                    placeholder="Enter assignment title"
                    value={createAssignmentData.assignmentTitle}
                    onChange={(e) =>
                      setCreateAssignmentData({
                        ...createAssignmentData,
                        assignmentTitle: e.target.value,
                      })
                    }
                    className="bg-gray-700 dark:bg-gray-100 text-gray-100 dark:text-gray-900 border-gray-600 dark:border-gray-300 placeholder:text-gray-400 dark:placeholder:text-gray-600"
                  />
                </div>
                <div>
                  <Label htmlFor="createAssignmentDescription" className="text-gray-100 dark:text-gray-900">
                    Description
                  </Label>
                  <Textarea
                    id="createAssignmentDescription"
                    placeholder="Enter assignment description (max 1000 characters)"
                    value={createAssignmentData.assignmentDescription}
                    onChange={(e) =>
                      setCreateAssignmentData({
                        ...createAssignmentData,
                        assignmentDescription: e.target.value,
                      })
                    }
                    maxLength={1000}
                    className="bg-gray-700 dark:bg-gray-100 text-gray-100 dark:text-gray-900 border-gray-600 dark:border-gray-300 placeholder:text-gray-400 dark:placeholder:text-gray-600"
                  />
                  <p className="text-sm text-gray-400 dark:text-gray-600 mt-1">
                    {createAssignmentData.assignmentDescription.length}/1000 characters
                  </p>
                </div>
                <Button
                  onClick={handleCreateAssignment}
                  disabled={isCreating}
                  className="w-full bg-blue-400 dark:bg-blue-600 text-gray-100 dark:text-gray-100 hover:bg-blue-500 dark:hover:bg-blue-700"
                >
                  {isCreating ? "Creating..." : "Create Assignment"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
    </Card>
  );
}