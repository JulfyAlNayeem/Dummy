import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useSubmitAssignmentMutation } from "@/redux/api/classGroup/assignmentApi";
import { toast } from 'react-hot-toast';
import { useUser } from "@/redux/slices/authSlice";
import DashboardLayout from "@/components/admin/DashboardLayout";


export default function SubmitAssignmentCard({
  classId,
  submissionData,
  setSubmissionData,
  showSubmitDialog,
  setShowSubmitDialog,
}) {
  const [submitAssignment, { isLoading: isSubmitting }] = useSubmitAssignmentMutation();
  const { user } = useUser();
  const handleFileChange = (event, setSubmissionData, submissionData) => {
    const file = event.target.files[0];
    if (file) {
      // Optional: Add file size validation (e.g., max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        alert("File size exceeds 10MB limit.");
        return;
      }
      // Optional: Validate file type (based on accept attribute in Input)
      const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain', 'application/zip'];
      if (!allowedTypes.includes(file.type)) {
        alert("Invalid file type. Please upload a PDF, DOC, DOCX, TXT, or ZIP file.");
        return;
      }
      setSubmissionData({
        ...submissionData,
        file,
      });
    }
  }
  const handleSubmitAssignment = async () => {
    if (!submissionData.assignmentTitle || !submissionData.assignmentDescription) {
      toast.error(
        <div>
          <div className="font-bold">Error</div>
          <div>Please provide assignment title and description</div>
        </div>
      );
      return;
    }

    if (submissionData.assignmentDescription.length > 2000) {
      toast.error(
        <div>
          <div className="font-bold">Error</div>
          <div>Description must be 2000 characters or less</div>
        </div>
      );
      return;
    }

    try {
      await submitAssignment({
        classId,
        assignmentData: submissionData,
      }).unwrap();
      toast.success(
        <div>
          <div className="font-bold">Alhamdulillah</div>
          <div>Assignment submitted successfully</div>
        </div>
      );
      setSubmissionData({ assignmentTitle: "", assignmentDescription: "", file: null });
      setShowSubmitDialog(false);
    } catch (error) {
      toast.error(
        <div>
          <div className="font-bold">Error</div>
          <div>{error.data?.message || "Failed to submit assignment"}</div>
        </div>
      );
    }
  };

  return (
      <Card className="bg-gray-900 dark:bg-white border border-gray-700 dark:border-gray-300 rounded-xl shadow-md">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-xl font-semibold text-gray-100 dark:text-gray-900">
                Submit Assignment
              </CardTitle>
              <CardDescription className="text-gray-400 dark:text-gray-600">
                Upload your assignment files if you are allowed to send file or just send text here.
              </CardDescription>
            </div>
            <Dialog open={showSubmitDialog} onOpenChange={setShowSubmitDialog}>
              <DialogTrigger asChild>
                <Button className="bg-blue-400 hover:bg-blue-500 dark:bg-blue-600 dark:hover:bg-blue-700 text-gray-900 dark:text-white">
                  Submit New
                </Button>
              </DialogTrigger>
              <DialogContent className="w-full max-w-md bg-gray-900 dark:bg-white border-gray-600 dark:border-gray-300 rounded-lg">
                <DialogHeader>
                  <DialogTitle className="text-xl font-semibold text-gray-100 dark:text-gray-900">
                    Submit Assignment
                  </DialogTitle>
                  <DialogDescription className="text-gray-400 dark:text-gray-600">
                    Fill in the assignment details, description, and upload your file
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="assignmentTitle" className="text-sm font-medium text-gray-300 dark:text-gray-700">
                      Assignment Title
                    </Label>
                    <Input
                      id="assignmentTitle"
                      placeholder="Enter assignment title"
                      value={submissionData.assignmentTitle}
                      onChange={(e) =>
                        setSubmissionData({
                          ...submissionData,
                          assignmentTitle: e.target.value,
                        })
                      }
                      className="w-full border-gray-600 dark:border-gray-300 rounded-md focus:ring-2 focus:ring-blue-400 dark:focus:ring-blue-500 text-gray-100 dark:text-gray-900"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="assignmentDescription" className="text-sm font-medium text-gray-300 dark:text-gray-700">
                      Description
                    </Label>
                    <Textarea
                      id="assignmentDescription"
                      placeholder="Enter assignment description (max 1000 characters)"
                      value={submissionData.assignmentDescription}
                      onChange={(e) =>
                        setSubmissionData({
                          ...submissionData,
                          assignmentDescription: e.target.value,
                        })
                      }
                      maxLength={1000}
                      className="w-full border-gray-600 dark:border-gray-300 rounded-md focus:ring-2 focus:ring-blue-400 dark:focus:ring-blue-500 text-gray-100 dark:text-gray-900"
                    />
                    <p className="text-sm text-gray-400 dark:text-gray-600 mt-1">
                      {submissionData.assignmentDescription.length}/1000 characters
                    </p>
                  </div>

                  {user.fileSendingAllowed && (
                    <div className="space-y-2">
                      <Label htmlFor="file" className="text-sm font-medium text-gray-300 dark:text-gray-700">
                        Upload File
                      </Label>
                      <Input
                        id="file"
                        type="file"
                        onChange={(e) => handleFileChange(e, setSubmissionData, submissionData)}
                        accept=".pdf,.doc,.docx,.txt,.zip"
                        className="w-full border-gray-600 dark:border-gray-300 rounded-md focus:ring-2 focus:ring-blue-400 dark:focus:ring-blue-500 text-gray-100 dark:text-gray-900"
                      />
                      {submissionData.file && (
                        <p className="text-sm text-gray-400 dark:text-gray-600 mt-1">
                          Selected: {submissionData.file.name}
                        </p>
                      )}
                    </div>
                  )}

                  <Button
                    onClick={handleSubmitAssignment}
                    disabled={isSubmitting}
                    className="w-full bg-blue-400 hover:bg-blue-500 dark:bg-blue-600 dark:hover:bg-blue-700 text-gray-900 dark:text-white font-medium py-2 rounded-md transition-colors duration-200 disabled:bg-blue-300 dark:disabled:bg-blue-400 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? "Submitting..." : "Submit Assignment"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
      </Card>
  );
}