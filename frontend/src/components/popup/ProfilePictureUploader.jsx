import React from "react";
import { FaUpload, FaCamera } from "react-icons/fa";
import { femaleProfileImages, maleProfileImages } from "../../constant/files";
import { useUserAuth } from "../../context-reducer/UserAuthContext";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { X } from "lucide-react";
import "animate.css";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";

const ProfilePictureUploader = ({ selectedTab, setSelectedTab, isOpenPopup, setIsOpenPopup }) => {
    const { user, updateUserInfo } = useUserAuth();

    return (
        <Dialog open={isOpenPopup} onOpenChange={setIsOpenPopup}>
            <DialogContent className="max-w-2xl z-[100] overflow-y-auto max-h-[643px] bg-gradient-to-br from-gray-800 to-gray-900 text-white rounded-xl shadow-2xl p-6 animate__animated animate__fadeInUp border-0">
                <DialogDescription className="sr-only">Upload or change your profile image</DialogDescription>

                <DialogHeader>
                    <VisuallyHidden>
                        <DialogTitle>Change Profile Picture</DialogTitle>
                    </VisuallyHidden>

                </DialogHeader>
                <Tabs value={selectedTab} onValueChange={setSelectedTab} className="w-full">
                    <TabsList className="grid grid-cols-3 gap-2 bg-gray-700 rounded-lg p-1 mb-4">
                        {[
                            { id: "illustrations", label: "Illustrations" },
                            { id: "alfajr-photos", label: "Al Fajr Photos" },
                            { id: "from-computer", label: "From Computer" },
                        ].map((tab) => (
                            <TabsTrigger
                                key={tab.id}
                                value={tab.id}
                                className="px-4 py-2 rounded-md text-sm font-medium transition-all data-[state=active]:bg-blue-600 data-[state=active]:text-white hover:bg-gray-600"
                            >
                                {tab.label}
                            </TabsTrigger>
                        ))}
                    </TabsList>

                    <TabsContent value="illustrations" className="mt-4">
                        <div className="grid grid-cols-4 gap-4 justify-items-center max-h-[284px] overflow-y-auto">
                            {(user.gender === "female" ? femaleProfileImages : maleProfileImages).map((image, index) => (
                                <Card
                                    key={image}
                                    className="border-2 border-transparent hover:border-blue-500 transition-all duration-300 cursor-pointer animate__animated animate__bounceIn"
                                    style={{ animationDelay: `${index * 0.1}s` }}
                                    onClick={() => {
                                        updateUserInfo({ image });
                                        setIsOpenPopup(false);
                                    }}
                                >
                                    <CardContent className="p-2">
                                        <img src={image} alt="Profile avatar" className="size-16 rounded-lg object-cover" />
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </TabsContent>

                    <TabsContent value="alfajr-photos" className="mt-4">
                        <div className="grid grid-cols-4 gap-4 justify-items-center max-h-[284px] overflow-y-auto">
                            <Card className="bg-gray-800 border-none">
                                <CardContent className="p-4 text-center text-gray-400 animate__animated animate__fadeIn">
                                    <p>Explore Al Fajr curated photos (coming soon)</p>
                                </CardContent>
                            </Card>
                        </div>
                    </TabsContent>

                    <TabsContent value="from-computer" className="mt-4">
                        <div className="grid grid-cols-4 gap-4 justify-items-center max-h-[284px] overflow-y-auto">
                            <Card className="bg-gray-800 border-none animate__animated animate__fadeIn">
                                <CardContent className="p-6 flex flex-col items-center">
                                    <div className="w-24 h-24 bg-gray-700 rounded-full flex items-center justify-center mb-4">
                                        <span className="text-4xl text-gray-400">👤</span>
                                    </div>
                                    <p className="text-gray-300 mb-4">Drag and drop your photo here</p>
                                    <div className="flex space-x-4">
                                        <Button
                                            className="flex items-center bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-md transition-all"
                                            onClick={() => alert("Upload functionality not implemented")}
                                        >
                                            <FaUpload className="mr-2" /> Upload from Computer
                                        </Button>
                                        <Button
                                            className="flex items-center bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-md transition-all"
                                            onClick={() => alert("Camera functionality not implemented")}
                                        >
                                            <FaCamera className="mr-2" /> Take a Picture
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </TabsContent>
                </Tabs>
            </DialogContent>
        </Dialog>
    );
};

export default ProfilePictureUploader;