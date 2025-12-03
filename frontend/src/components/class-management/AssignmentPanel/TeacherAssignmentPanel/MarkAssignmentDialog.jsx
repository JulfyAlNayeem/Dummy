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
import { useMarkAssignmentMutation } from "@/redux/api/classGroup/assignmentApi";
import { toast } from 'react-hot-toast';

export default function MarkAssignmentDialog({
  showMarkDialog,
  setShowMarkDialog,
  markingData,
  setMarkingData,
  selectedSubmission,
  classId,
}) {
  const [markAssignment, { isLoading: isMarking }] = useMarkAssignmentMutation();

  const handleMarkAssignment = async () => {
    if (!markingData.mark || markingData.mark < 0 || markingData.mark > 100) {
      toast.error(
        <div className="text-gray-100 dark:text-gray-900">
          <div className="font-bold">Error</div>
          <div>Please provide a valid mark (0–100)</div>
        </div>
      );
      return;
    }

    try {
      await markAssignment({
        classId,
        submissionId: selectedSubmission._id,
        markData: markingData,
      }).unwrap();
      toast.success(
        <div className="text-gray-100 dark:text-gray-900">
          <div className="font-bold">Alhamdulillah</div>
          <div>Assignment marked successfully</div>
        </div>
      );
      setMarkingData({ mark: "", feedback: "" });
      setShowMarkDialog(false);
    } catch (error) {
      toast.error(
        <div className="text-gray-100 dark:text-gray-900">
          <div className="font-bold">Error</div>
          <div>{error.data?.message || "Failed to mark assignment"}</div>
        </div>
      );
    }
  };

  return (
    <Dialog open={showMarkDialog} onOpenChange={setShowMarkDialog}>
      <DialogContent className="bg-gray-800 dark:bg-white border-gray-600 dark:border-gray-300">
        <DialogHeader>
          <DialogTitle className="text-gray-100 dark:text-gray-900">Mark Assignment</DialogTitle>
          <DialogDescription className="text-gray-400 dark:text-gray-600">Provide a grade and feedback for this submission</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="mark" className="text-gray-100 dark:text-gray-900">Mark (0-100)</Label>
            <Input
              id="mark"
              type="number"
              min="0"
              max="100"
              value={markingData.mark}
              onChange={(e) =>
                setMarkingData({
                  ...markingData,
                  mark: e.target.value,
                })
              }
              className="bg-gray-700 dark:bg-gray-100 text-gray-100 dark:text-gray-900 border-gray-600 dark:border-gray-300 placeholder:text-gray-400 dark:placeholder:text-gray-600"
            />
          </div>
          <div>
            <Label htmlFor="feedback" className="text-gray-100 dark:text-gray-900">Feedback (Optional)</Label>
            <Textarea
              id="feedback"
              placeholder="Provide feedback for the student"
              value={markingData.feedback}
              onChange={(e) =>
                setMarkingData({
                  ...markingData,
                  feedback: e.target.value,
                })
              }
              className="bg-gray-700 dark:bg-gray-100 text-gray-100 dark:text-gray-900 border-gray-600 dark:border-gray-300 placeholder:text-gray-400 dark:placeholder:text-gray-600"
            />
          </div>
          <Button
            onClick={handleMarkAssignment}
            disabled={isMarking}
            className="w-full bg-blue-400 dark:bg-blue-600 text-gray-100 dark:text-gray-100 hover:bg-blue-500 dark:hover:bg-blue-700"
          >
            {isMarking ? "Submitting Grade..." : "Submit Grade"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}