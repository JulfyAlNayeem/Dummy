import { useState } from "react";
import { AlertTriangle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useReportConversationMutation } from "@/redux/api/conversationApi";

const REPORT_REASONS = [
  { value: "spam", label: "Spam or scam" },
  { value: "harassment", label: "Harassment or bullying" },
  { value: "hate_speech", label: "Hate speech or symbols" },
  { value: "violence", label: "Violence or dangerous behavior" },
  { value: "nudity", label: "Nudity or sexual content" },
  { value: "false_info", label: "False information" },
  { value: "impersonation", label: "Pretending to be someone else" },
  { value: "other", label: "Something else" },
];

const ReportDialog = ({ isOpen, onClose, conversationId, participantName }) => {
  const [selectedReason, setSelectedReason] = useState("");
  const [additionalDetails, setAdditionalDetails] = useState("");
  const [step, setStep] = useState(1); // 1: select reason, 2: add details, 3: success

  const [reportConversation, { isLoading }] = useReportConversationMutation();

  const handleSubmit = async () => {
    if (!selectedReason) return;

    try {
      await reportConversation({
        conversationId,
        reason: selectedReason,
        details: additionalDetails,
      }).unwrap();
      setStep(3); // Success
    } catch (error) {
      console.error("Failed to submit report:", error);
    }
  };

  const handleClose = () => {
    setSelectedReason("");
    setAdditionalDetails("");
    setStep(1);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 z-[60] flex items-center justify-center p-4">
      <div className="bg-gray-800 rounded-2xl w-full max-w-md max-h-[80vh] overflow-hidden animate__animated animate__fadeIn animate__faster">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-400" />
            <h2 className="text-lg font-semibold text-gray-100">
              Report Conversation
            </h2>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="p-1 hover:bg-white/10"
            onClick={handleClose}
          >
            <X className="h-5 w-5 text-gray-400" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto max-h-[60vh]">
          {step === 1 && (
            <>
              <p className="text-gray-300 text-sm mb-4">
                Why are you reporting this conversation with{" "}
                <span className="font-medium text-gray-100">{participantName}</span>?
              </p>
              <div className="space-y-2">
                {REPORT_REASONS.map((reason) => (
                  <div
                    key={reason.value}
                    className={`flex items-center px-4 py-3 rounded-xl cursor-pointer transition-colors ${
                      selectedReason === reason.value
                        ? "bg-red-500/20 border border-red-500/50"
                        : "bg-gray-700/50 hover:bg-gray-700 border border-transparent"
                    }`}
                    onClick={() => setSelectedReason(reason.value)}
                  >
                    <span className="text-gray-100 text-sm">{reason.label}</span>
                  </div>
                ))}
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <p className="text-gray-300 text-sm mb-4">
                Add more details about your report (optional):
              </p>
              <Textarea
                placeholder="Describe what happened..."
                value={additionalDetails}
                onChange={(e) => setAdditionalDetails(e.target.value)}
                className="bg-gray-700 border-gray-600 text-gray-100 resize-none h-32"
              />
              <p className="text-gray-500 text-xs mt-2">
                Your report is confidential. We'll review it and take appropriate action.
              </p>
            </>
          )}

          {step === 3 && (
            <div className="text-center py-6">
              <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-8 h-8 text-green-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-100 mb-2">
                Report Submitted
              </h3>
              <p className="text-gray-400 text-sm">
                Thank you for helping keep our community safe. We'll review your report
                and take action if necessary.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-700 flex justify-end gap-2">
          {step === 1 && (
            <>
              <Button variant="ghost" onClick={handleClose} className="text-gray-400">
                Cancel
              </Button>
              <Button
                onClick={() => setStep(2)}
                disabled={!selectedReason}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                Next
              </Button>
            </>
          )}

          {step === 2 && (
            <>
              <Button
                variant="ghost"
                onClick={() => setStep(1)}
                className="text-gray-400"
              >
                Back
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={isLoading}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                {isLoading ? "Submitting..." : "Submit Report"}
              </Button>
            </>
          )}

          {step === 3 && (
            <Button onClick={handleClose} className="bg-gray-700 hover:bg-gray-600">
              Done
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReportDialog;
