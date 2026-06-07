import { useState } from "react";
import {
  ArrowLeft,
  Check,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useSubmitFormMutation } from "@/redux/api/formApi";
import toast from "react-hot-toast";

/**
 * Form Filler — lets an assignee answer all questions and submit.
 * - yes_no: Toggle Yes/No; if No, explanation is mandatory.
 * - text: Free-text input.
 */
const FormFiller = ({ assignment, onClose }: any): JSX.Element => {
  const form = assignment.form;
  const fields: any[] = form?.fields || [];

  // Today's date as ISO string (YYYY-MM-DD)
  const today = new Date().toISOString().split('T')[0];
  const [dueDate, setDueDate] = useState<string>(today);

  // Initialize answers map: fieldId -> { value, explanation }
  const [answers, setAnswers] = useState<Record<string, any>>(() => {
    const map: Record<string, any> = {};
    fields.forEach((f: any) => {
      map[f._id] = { value: f.type === "yes_no" ? "yes" : "", explanation: "" };
    });
    return map;
  });

  const [submitForm, { isLoading }]: any = useSubmitFormMutation();

  const updateAnswer = (fieldId: string, key: string, value: any): void => {
    setAnswers((prev) => ({
      ...prev,
      [fieldId]: { ...prev[fieldId], [key]: value },
    }));
  };

  const handleSubmit = async () => {
    // Validation: all required answers
    for (const field of fields) {
      const ans = answers[field._id];
      if (!ans?.value) {
        return toast.error(`Please answer: "${field.label}"`);
      }
      if (field.type === "yes_no" && ans.value === "no" && !ans.explanation?.trim()) {
        return toast.error(`Explanation required for "No" answer: "${field.label}"`);
      }
    }

    const payload = fields.map((f) => ({
      fieldId: f._id,
      value: answers[f._id].value,
      explanation: answers[f._id].explanation || "",
    }));

    try {
      await submitForm({
        assignmentId: assignment._id,
        dueDate,
        answers: payload,
      }).unwrap();
      toast.success("Form submitted!");
      onClose();
    } catch (err) {
      console.error(err);
      toast.error(err?.data?.message || "Failed to submit form.");
    }
  };

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
          {form?.name || "Fill Form"}
        </h2>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Due Date */}
        <div className="space-y-2">
          <Label className="text-gray-300 text-sm">Date for this submission</Label>
          <Input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="bg-gray-800 border-gray-700 text-gray-100 w-48"
          />
        </div>

        {/* Questions */}
        {fields.map((field, index) => {
          const ans = answers[field._id] || {};
          return (
            <div
              key={field._id}
              className="bg-gray-800/60 rounded-lg p-4 border border-gray-700/50 space-y-3"
            >
              <div className="flex items-start gap-2">
                <span className="text-gray-500 text-sm font-mono w-6 flex-shrink-0">
                  {index + 1}.
                </span>
                <span className="text-gray-100 text-sm font-medium">
                  {field.label}
                </span>
              </div>

              {/* Yes / No field */}
              {field.type === "yes_no" && (
                <div className="pl-8 space-y-3">
                  <div className="flex gap-3">
                    <button
                      onClick={() => updateAnswer(field._id, "value", "yes")}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-colors ${
                        ans.value === "yes"
                          ? "bg-green-500/20 text-green-400 border border-green-500/50"
                          : "bg-gray-700 text-gray-400 border border-gray-600 hover:bg-gray-600"
                      }`}
                    >
                      <Check className="h-4 w-4" /> Yes
                    </button>
                    <button
                      onClick={() => updateAnswer(field._id, "value", "no")}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-colors ${
                        ans.value === "no"
                          ? "bg-red-500/20 text-red-400 border border-red-500/50"
                          : "bg-gray-700 text-gray-400 border border-gray-600 hover:bg-gray-600"
                      }`}
                    >
                      <AlertCircle className="h-4 w-4" /> No
                    </button>
                  </div>

                  {/* Explanation required if No */}
                  {ans.value === "no" && (
                    <div className="space-y-1">
                      <Label className="text-xs text-yellow-400">
                        Explanation required *
                      </Label>
                      <Textarea
                        placeholder="Please explain why..."
                        value={ans.explanation}
                        onChange={(e) =>
                          updateAnswer(field._id, "explanation", e.target.value)
                        }
                        className="bg-gray-700 border-gray-600 text-gray-100 text-sm min-h-[60px] resize-none"
                        maxLength={1000}
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Text field */}
              {field.type === "text" && (
                <div className="pl-8">
                  <Textarea
                    placeholder="Type your answer..."
                    value={ans.value}
                    onChange={(e) =>
                      updateAnswer(field._id, "value", e.target.value)
                    }
                    className="bg-gray-700 border-gray-600 text-gray-100 text-sm min-h-[80px] resize-none"
                    maxLength={2000}
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
          onClick={onClose}
        >
          Cancel
        </Button>
        <Button
          className="bg-blue-600 hover:bg-blue-700 text-white"
          onClick={handleSubmit}
          disabled={isLoading}
        >
          {isLoading ? "Submitting..." : "Submit Form"}
        </Button>
      </div>
    </div>
  );
};

export default FormFiller;
