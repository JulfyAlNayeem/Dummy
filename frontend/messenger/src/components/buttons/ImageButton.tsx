import React, { useState } from "react";
import { FaRegImage } from "react-icons/fa";
import { useUser } from "@/redux/slices/authSlice";
import { themeBorder } from "@/lib/themeUtils";

const ImageButton = (): JSX.Element => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const { themeIndex }: any = useUser();

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>): void => {
    setSelectedFile(event.target.files[0]);
  };

  const handleUpload = (): void => {
    if (selectedFile) {
      console.log("Uploading file:", selectedFile);
    } else {
      console.log("No file selected");
    }
  };

  return (
    <div className=" center">
      <input type="file" id="actual-btn" className=" " required onChange={handleFileChange} hidden />
      <label className={themeBorder(themeIndex, "chatIcon cursor-pointer")} htmlFor="actual-btn" onClick={handleUpload}><FaRegImage className="text-2xl" /></label>
    </div>
  );
};

export default ImageButton;
