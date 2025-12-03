import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PlusCircle } from "lucide-react";
import { useCreateManualSessionMutation } from "@/redux/api/classGroup/attendanceApi";
import toast from "react-hot-toast";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";

export default function SessionManagement({ classId, isOpen, onClose }) {
    const [createManualSession, { isLoading: isCreatingSession }] = useCreateManualSessionMutation();
    const [formData, setFormData] = useState({
        date: "",
        startTime: "",
        cutoffTime: "",
    });
    const [selectedDate, setSelectedDate] = useState(null); // State for Calendar date

    const handleInputChange = (field, value) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
    };

    const handleDateSelect = (date) => {
        setSelectedDate(date);
        // Format date as YYYY-MM-DD for consistency with the Input type="date"
        const formattedDate = date ? format(date, "yyyy-MM-dd") : "";
        handleInputChange("date", formattedDate);
    };

    const handleCreateManualSession = async () => {
        if (!formData.date || !formData.startTime || !formData.cutoffTime) {
            toast.error("Please fill all fields");
            return;
        }

        try {
            const sessionData = {
                classId,
                date: formData.date,
                startTime: formData.startTime,
                cutoffTime: formData.cutoffTime,
            };
            await createManualSession(sessionData).unwrap();
            toast.success("Session created successfully!");
            setFormData({ date: "", startTime: "", cutoffTime: "" });
            setSelectedDate(null); // Reset calendar selection
            onClose(); // Close the modal on success
        } catch (error) {
            toast.error("Failed to create session");
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="w-full max-w-md bg-gray-900 dark:bg-white border-gray-700 dark:border-gray-300">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-xl font-semibold text-gray-100 dark:text-gray-900">
                        <PlusCircle className="h-6 w-6 text-blue-400 dark:text-blue-600" />
                        Create Manual Session
                    </DialogTitle>
                    <DialogDescription className="text-gray-400 dark:text-gray-600">
                        Create a new session for this class
                    </DialogDescription>
                </DialogHeader>
                <div className="pt-6 space-y-6">
                    <div className="space-y-2">
                        <Label htmlFor="date" className="text-sm font-medium text-gray-300 dark:text-gray-700">
                            Date
                        </Label>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                    variant="outline"
                                    className="w-full justify-start text-left font-normal border-gray-600 dark:border-gray-300 hover:bg-transparent hover:text-gray-400 bg-transparent rounded-md focus:ring-2 focus:ring-blue-400 dark:focus:ring-blue-500 text-gray-100 dark:text-gray-900"
                                >
                                    {selectedDate ? format(selectedDate, "PPP") : <span>Pick a date</span>}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0 bg-gray-900 dark:bg-white border-gray-600 dark:border-gray-300">
                                <Calendar
                                    mode="single"
                                    selected={selectedDate}
                                    onSelect={handleDateSelect}
                                    initialFocus
                                    className="bg-gray-900 dark:bg-white text-gray-100 dark:text-gray-900"
                                />
                            </PopoverContent>
                        </Popover>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="startTime" className="text-sm font-medium text-gray-300 dark:text-gray-700">
                            Start Time
                        </Label>
                        <Input
                            id="startTime"
                            type="time"
                            value={formData.startTime}
                            onChange={(e) => handleInputChange("startTime", e.target.value)}
                            className="w-full border-gray-600 dark:border-gray-300 rounded-md focus:ring-2 focus:ring-blue-400 dark:focus:ring-blue-500 text-gray-100 dark:text-gray-900"
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="cutoffTime" className="text-sm font-medium text-gray-300 dark:text-gray-700">
                            Cutoff Time
                        </Label>
                        <Input
                            id="cutoffTime"
                            type="time"
                            value={formData.cutoffTime}
                            onChange={(e) => handleInputChange("cutoffTime", e.target.value)}
                            className="w-full border-gray-600 dark:border-gray-300 rounded-md focus:ring-2 focus:ring-blue-400 dark:focus:ring-blue-500 text-gray-100 dark:text-gray-900"
                            required
                        />
                    </div>

                    <Button
                        onClick={handleCreateManualSession}
                        disabled={isCreatingSession}
                        className="w-full bg-blue-400 hover:bg-blue-500 dark:bg-blue-600 dark:hover:bg-blue-700 text-gray-900 dark:text-white font-medium py-2 rounded-md transition-colors duration-200 disabled:bg-blue-300 dark:disabled:bg-blue-400 disabled:cursor-not-allowed"
                    >
                        <PlusCircle className="h-5 w-5 mr-2" />
                        {isCreatingSession ? "Creating..." : "Create Session"}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}