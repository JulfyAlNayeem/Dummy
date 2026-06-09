import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import toast from "react-hot-toast";
import { useCreateGroupMutation } from "@/redux/api/conversationApi";
import { chatListFooterColor, sheetColor } from "@/constant";
import { useUser } from "@/redux/slices/authSlice";
import ProfilePictureUploader from "../settings/ProfilePictureUploader";
import { FaCamera } from "react-icons/fa";

export default function CreateGroupForm({ onGroupCreated, conversationThemeIndex }: { onGroupCreated?: (g: any) => void; conversationThemeIndex?: number }): JSX.Element {
    const { themeIndex }: any = useUser();
    const currentTheneIndex = conversationThemeIndex? conversationThemeIndex : themeIndex;
    const [formData, setFormData] = useState<{ name: string; intro: string; image: string; visibility: string }>({
        name: '',
        intro: '',
        image: '', // Optional field for image URL or file path
        visibility: 'public',
    });
    const [createGroup, { isLoading }]: any = useCreateGroupMutation();
    const [isImageUploaderOpen, setIsImageUploaderOpen] = useState<boolean>(false);
    const [selectedTab, setSelectedTab] = useState<string>('illustrations');

    const handleSubmit = async (e: React.FormEvent): Promise<void> => {
        e.preventDefault();

        // Validate required fields
        if (!formData.name.trim()) {
            toast.error("Group name is required");
            return;
        }

        // Prepare payload based on schema
        const groupData = {
            name: formData.name,
            intro: formData.intro || undefined, // Send undefined if empty to avoid empty string
            image: formData.image || undefined, // Send undefined if empty
            visibility: formData.visibility,
            is_group: true,
            type: "group",
        };

        try {
            const result = await createGroup(groupData).unwrap();
            toast.success("Group created successfully!");
            setFormData({
                name: "",
                intro: "",
                image: "",
                visibility: "public",
            });
            onGroupCreated?.(result.group);
        } catch (error) {
            toast.error(error.data?.message || "Failed to create group");
        }
    };

    const handleInputChange = (field, value) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
    };

    const handleImageSelect = (image) => {
        setFormData((prev) => ({ ...prev, image }));
        setIsImageUploaderOpen(false);
    };

    //  style={{ backgroundColor: chatListFooterColor[themeIndex] }}
    return (
        <>
        <Card className={`${sheetColor[currentTheneIndex]} border-transparent md:w-[446px] z-[10000] w-[390px]`}>
            <CardHeader>
                <CardTitle>Create New Group</CardTitle>
                <CardDescription>Create a new group for your community</CardDescription>
            </CardHeader>
            <CardContent >
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="name">Group Name</Label>
                        <Input
                            id="name"
                            placeholder="Enter group name"
                            value={formData.name}
                            onChange={(e) => handleInputChange("name", e.target.value)}
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="intro">Group Description</Label>
                        <Textarea
                            id="intro"
                            placeholder="Enter group description (optional)"
                            value={formData.intro}
                            onChange={(e) => handleInputChange("intro", e.target.value)}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="image">Group Image</Label>
                        <div className="flex items-center gap-3">
                            {formData.image && (
                                <img
                                    src={formData.image}
                                    alt="Group preview"
                                    className="size-16 rounded-lg object-cover border-2 border-gray-600"
                                />
                            )}
                            <Button
                                type="button"
                                variant="ghost"
                                className="flex items-center border text gap-2"
                                onClick={() => setIsImageUploaderOpen(true)}
                            >
                                <FaCamera className="h-4 w-4" />
                                {formData.image ? "Change Image" : "Select Image"}
                            </Button>
                            {formData.image && (
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleInputChange("image", "")}
                                >
                                    Remove
                                </Button>
                            )}
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="visibility">Visibility</Label>
                        <Select
                            value={formData.visibility}
                            onValueChange={(value) => handleInputChange("visibility", value)}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Select visibility" />
                            </SelectTrigger>
                            <SelectContent className="z-[111]">
                                <SelectItem value="public">Public</SelectItem>
                                <SelectItem value="private">Private</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>


                    <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-500" disabled={isLoading}>
                        {isLoading ? "Creating..." : "Create Group"}
                    </Button>
                </form>
            </CardContent>
        </Card>
        <ProfilePictureUploader
            selectedTab={selectedTab}
            setSelectedTab={setSelectedTab}
            isOpenPopup={isImageUploaderOpen}
            setIsOpenPopup={setIsImageUploaderOpen}
            onSelectImage={handleImageSelect}
        />
        </>
    );
}