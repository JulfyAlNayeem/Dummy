import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCreateClassMutation } from "@/redux/api/classGroup/classApi";
import toast from "react-hot-toast";
import { useUser } from "@/redux/slices/authSlice";
import { sheetColor } from "@/constant";

export default function CreateClassForm({ onClassCreated, conversationThemeIndex }) {
  const { themeIndex } = useUser();
  const currentTheneIndex = conversationThemeIndex ? conversationThemeIndex : themeIndex;

  const [formData, setFormData] = useState({
    className: "",
    classType: "regular",
    startTime: "09:00",
    cutoffTime: "09:15",
    selectedDays: [],
    visibility: "public", // ✅ new field
  });

  const [createClass, { isLoading }] = useCreateClassMutation();

  const validateTimes = (startTime, cutoffTime) => {
    const start = new Date(`1970-01-01T${startTime}:00`);
    const cutoff = new Date(`1970-01-01T${cutoffTime}:00`);
    return cutoff > start;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (formData.classType === "multi-weekly" && formData.selectedDays.length === 0) {
      toast.error("Please select at least one day for multi-weekly classes");
      return;
    }

    if (!validateTimes(formData.startTime, formData.cutoffTime)) {
      toast.error("Cutoff time must be after start time");
      return;
    }

    if (!["regular", "weekly", "multi-weekly", "monthly", "exam"].includes(formData.classType)) {
      toast.error("Invalid class type selected");
      return;
    }

    try {
      const result = await createClass(formData).unwrap();
      toast.success("Class created successfully!");
      setFormData({
        className: "",
        classType: "regular",
        startTime: "09:00",
        cutoffTime: "09:15",
        selectedDays: [],
        visibility: "public",
      });
      onClassCreated?.(result.class);
    } catch (error) {
      toast.error(error.data?.message || "Failed to create class");
    }
  };

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleDayChange = (day) => {
    setFormData((prev) => {
      if (prev.classType === "multi-weekly") {
        const updatedDays = prev.selectedDays.includes(day)
          ? prev.selectedDays.filter((d) => d !== day)
          : [...prev.selectedDays, day];
        return { ...prev, selectedDays: updatedDays };
      }
      if (prev.classType === "weekly" || prev.classType === "exam") {
        return { ...prev, selectedDays: [day] };
      }
      return prev;
    });
  };

  return (
    <Card className={`${sheetColor[currentTheneIndex]} border-transparent md:w-[446px] w-[390px]`}>
      <CardHeader>
        <CardTitle>Create New Class</CardTitle>
        <CardDescription>Create a new class group for your students</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-2">
          {/* Class Name */}
          <div className="space-y-2">
            <Label htmlFor="className">Class Name</Label>
            <Input
              id="className"
              placeholder="Enter class name"
              value={formData.className}
              onChange={(e) => handleInputChange("className", e.target.value)}
              required
            />
          </div>

          {/* Class Type */}
          <div className="space-y-2">
            <Label htmlFor="classType">Class Type</Label>
            <Select value={formData.classType} onValueChange={(value) => handleInputChange("classType", value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select class type" />
              </SelectTrigger>
              <SelectContent className="z-[111]">
                <SelectItem value="regular">Regular Class</SelectItem>
                <SelectItem value="weekly">Weekly Class</SelectItem>
                <SelectItem value="multi-weekly">Multi-Weekly Class</SelectItem>
                <SelectItem value="monthly">Monthly Class</SelectItem>
                <SelectItem value="exam">Exam Class</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* ✅ Visibility (same as group form) */}
          <div className="space-y-2">
            <Label htmlFor="visibility">Visibility</Label>
            <Select value={formData.visibility} onValueChange={(value) => handleInputChange("visibility", value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select visibility" />
              </SelectTrigger>
              <SelectContent className="z-[111]">
                <SelectItem value="public">Public</SelectItem>
                <SelectItem value="private">Private</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Start Time */}
          <div className="space-y-2">
            <Label htmlFor="startTime">Start Time</Label>
            <Input
              id="startTime"
              type="time"
              value={formData.startTime}
              onChange={(e) => handleInputChange("startTime", e.target.value)}
              required
            />
          </div>

          {/* Cutoff Time */}
          <div className="space-y-2">
            <Label htmlFor="cutoffTime">Cutoff Time</Label>
            <Input
              id="cutoffTime"
              type="time"
              value={formData.cutoffTime}
              onChange={(e) => handleInputChange("cutoffTime", e.target.value)}
              required
            />
          </div>

          {/* Day Picker */}
          <div className="space-y-2">
            {["multi-weekly", "weekly", "exam"].includes(formData.classType) && (
              <>
                <label>
                  {formData.classType === "multi-weekly" && "Select Days (for Multi-Weekly)"}
                  {formData.classType === "weekly" && "Select a Day (for Weekly)"}
                  {formData.classType === "exam" && "Select Exam Day"}
                </label>

                <div className="grid grid-cols-7 gap-2">
                  {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day, index) => {
                    const isSelected = formData.selectedDays.includes(index);
                    return (
                      <button
                        key={index}
                        type="button"
                        onClick={() => handleDayChange(index)}
                        className={`${!isSelected ? "text-white border" : "text-white bg-black"} rounded-md text-sm`}
                      >
                        {day}
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          {/* Submit */}
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? "Creating..." : "Create Class"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
