import { useState } from "react";
import {
  ArrowLeft,
  Plus,
  Trash2,
  GripVertical,
  ToggleLeft,
  Type,
  Globe,
  Lock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useCreateFormMutation } from "@/redux/api/formApi";
import toast from "react-hot-toast";

const FIELD_TYPES = [
  { value: "yes_no", label: "Yes / No", icon: ToggleLeft },
  { value: "text", label: "Text Answer", icon: Type },
];

/**
 * Form Creation screen.
 * Dynamic fields: add/remove questions with type selection.
 */
const FormCreator = ({ onClose, onCreated }: any): JSX.Element => {
  const [name, setName] = useState<string>('');
  const [visibility, setVisibility] = useState<string>('private');
  const [fields, setFields] = useState<any[]>([
    { label: '', type: 'yes_no' },
  ]);

  const [createForm, { isLoading }]: any = useCreateFormMutation();

  const addField = (): void => {
    setFields([...fields, { label: "", type: "yes_no" }]);
  };

  const removeField = (index: number): void => {
    if (fields.length <= 1) return;
    setFields(fields.filter((_, i) => i !== index));
  };

  const updateField = (index, key, value) => {
    const updated = [...fields];
    updated[index] = { ...updated[index], [key]: value };
    setFields(updated);
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      return toast.error("Form name is required.");
    }
    const emptyField = fields.find((f) => !f.label.trim());
    if (emptyField) {
      return toast.error("All questions must have text.");
    }

    try {
      await createForm({
        name: name.trim(),
        visibility,
        fields: fields.map((f, i) => ({
          label: f.label.trim(),
          type: f.type,
          order: i,
        })),
      }).unwrap();
      toast.success("Form created!");
      onCreated?.();
    } catch (err) {
      console.error(err);
      toast.error(err?.data?.message || "Failed to create form.");
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
          Create New Form
        </h2>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Form Name */}
        <div className="space-y-2">
          <Label className="text-gray-300 text-sm">Form Name *</Label>
          <Input
            placeholder="e.g. Daily Check-in"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="bg-gray-800 border-gray-700 text-gray-100"
            maxLength={200}
          />
        </div>

        {/* Visibility */}
        <div className="space-y-2">
          <Label className="text-gray-300 text-sm">Visibility</Label>
          <div className="flex gap-3">
            <button
              onClick={() => setVisibility("private")}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-colors ${
                visibility === "private"
                  ? "bg-yellow-500/20 text-yellow-400 border border-yellow-500/50"
                  : "bg-gray-800 text-gray-400 border border-gray-700 hover:bg-gray-700"
              }`}
            >
              <Lock className="h-4 w-4" /> Private
            </button>
            <button
              onClick={() => setVisibility("public")}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-colors ${
                visibility === "public"
                  ? "bg-green-500/20 text-green-400 border border-green-500/50"
                  : "bg-gray-800 text-gray-400 border border-gray-700 hover:bg-gray-700"
              }`}
            >
              <Globe className="h-4 w-4" /> Public
            </button>
          </div>
          <p className="text-gray-500 text-xs">
            {visibility === "private"
              ? "Only you can see and assign this form."
              : "Anyone can search, view, and assign this form."}
          </p>
        </div>

        {/* Fields / Questions */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-gray-300 text-sm">
              Questions ({fields.length})
            </Label>
            <Button
              size="sm"
              variant="outline"
              className="border-gray-600 text-gray-300  hover:text-gray-400 bg-gray-700 hover:bg-gray-800 gap-1"
              onClick={addField}
            >
              <Plus className="h-3.5 w-3.5" /> Add Question
            </Button>
          </div>

          <div className="space-y-3">
            {fields.map((field, index) => (
              <div
                key={index}
                className="bg-gray-800/60 rounded-lg p-4 border border-gray-700/50 space-y-3"
              >
                <div className="flex items-start gap-3">
                  <GripVertical className="h-4 w-4 text-gray-500 mt-2.5 flex-shrink-0" />
                  <div className="flex-1 space-y-3">
                    {/* Question Text */}
                    <Input
                      placeholder={`Question ${index + 1}`}
                      value={field.label}
                      onChange={(e) =>
                        updateField(index, "label", e.target.value)
                      }
                      className="bg-gray-700 border-gray-600 text-gray-100"
                      maxLength={500}
                    />
                    {/* Field Type Selector */}
                    <Select
                      value={field.type}
                      onValueChange={(val) =>
                        updateField(index, "type", val)
                      }
                    >
                      <SelectTrigger className="bg-gray-700 border-gray-600 text-gray-100 w-48">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-800 border-gray-700">
                        {FIELD_TYPES.map((ft) => (
                          <SelectItem
                            key={ft.value}
                            value={ft.value}
                            className="text-gray-100 focus:bg-gray-700"
                          >
                            <span className="flex items-center gap-2">
                              <ft.icon className="h-3.5 w-3.5" />
                              {ft.label}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {field.type === "yes_no" && (
                      <p className="text-gray-500 text-xs">
                        If the answer is &quot;No&quot;, an explanation will be required.
                      </p>
                    )}
                  </div>
                  {/* Remove */}
                  {fields.length > 1 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="p-1.5 text-red-400 hover:bg-red-500/10"
                      onClick={() => removeField(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
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
          {isLoading ? "Creating..." : "Create Form"}
        </Button>
      </div>
    </div>
  );
};

export default FormCreator;
