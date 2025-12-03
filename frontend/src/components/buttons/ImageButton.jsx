import React, { useState } from "react";
import { FaRegImage } from "react-icons/fa";
import { useUser } from "@/redux/slices/authSlice";
import { borderColor } from "../../constant";

const ImageButton = () => {
  const [selectedFile, setSelectedFile] = useState(null);
  const { themeIndex } = useUser();

  const handleFileChange = (event) => {
    setSelectedFile(event.target.files[0]);
  };

  const handleUpload = () => {
    if (selectedFile) {
      console.log("Uploading file:", selectedFile);
    } else {
      console.log("No file selected");
    }
  };

  return (
    <div className=" center">
      <input type="file" id="actual-btn" className=" " required onChange={handleFileChange} hidden />
      <label className={`
${borderColor[themeIndex]} chatIcon cursor-pointer`} htmlFor="actual-btn" onClick={handleUpload}><FaRegImage className="text-2xl" /></label>
    </div>
  );
};

export default ImageButton;
